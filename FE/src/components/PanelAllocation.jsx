import React, { useState, useEffect, useMemo } from 'react';
import './PanelAllocation.css';

const API_BASE = "http://localhost:8080/api/v1";

const PanelAllocation = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [rounds, setRounds] = useState([]);
    const [selectedRoundId, setSelectedRoundId] = useState('');
    const [selectedRound, setSelectedRound] = useState(null);
    const [allTeams, setAllTeams] = useState([]);
    const [experts, setExperts] = useState([]);
    const [selectedExpertId, setSelectedExpertId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [allocations, setAllocations] = useState({});
    const [savedAllocations, setSavedAllocations] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSendingMail, setIsSendingMail] = useState(false);
    const token = localStorage.getItem("shms_token");
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const activeExpert = useMemo(() => experts.find(e => String(e.userId) === String(selectedExpertId)), [experts, selectedExpertId]);
    const hasMentorRole = useMemo(() => activeExpert?.roles?.some(r => r.toLowerCase().includes('mentor')) ?? false, [activeExpert]);
    const hasJudgeRole = useMemo(() => activeExpert?.roles?.some(r => r.toLowerCase().includes('judge')) ?? false, [activeExpert]);
    const roundCategoryId = selectedRound?.categoryId ?? null;

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                let cData = [], eData = [];
                try {
                    const [contestsRes, expertsRes] = await Promise.all([
                        fetch(`${API_BASE}/admin/contests`, { headers }),
                        fetch(`${API_BASE}/admin/contests/experts`, { headers }),
                    ]);
                    if (!contestsRes.ok || !expertsRes.ok) throw new Error("API error");
                    cData = await contestsRes.json();
                    eData = await expertsRes.json();
                } catch (apiErr) {
                    console.warn("Using mock data for initial load in PanelAllocation:", apiErr);
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    cData = localJson.panelAllocation?.contests || [];
                    eData = localJson.panelAllocation?.experts || [];
                }

                setContests(cData);
                if (cData.length > 0) {
                    const activeContest = cData.find(c => c.status === 'ACTIVED');
                    setSelectedContestId(String(activeContest ? activeContest.id : cData[0].id));
                }
                setExperts(eData);
                if (eData.length > 0) setSelectedExpertId(String(eData[0].userId));
            } catch (err) {
                console.error(err);
            }
        };
        fetchInitial();
    }, [headers]);

    useEffect(() => {
        if (!selectedContestId) {
            setRounds([]);
            setSelectedRoundId('');
            setSelectedRound(null);
            return;
        }
        const getRounds = async () => {
            try {
                const res = await fetch(`${API_BASE}/admin/contests/${selectedContestId}/rounds`, { headers });
                if (!res.ok) throw new Error();
                const data = await res.json();
                setRounds(data);
                if (data.length > 0) {
                    setSelectedRoundId(String(data[0].roundId));
                    setSelectedRound(data[0]);
                } else {
                    setSelectedRoundId('');
                    setSelectedRound(null);
                }
            } catch {
                console.warn("Using mock data for rounds in PanelAllocation");
                const mockRounds = [
                    {
                        roundId: 1,
                        roundName: "Phase 01: Screening",
                        categoryId: 1,
                        categoryName: "Artificial Intelligence"
                    },
                    {
                        roundId: 2,
                        roundName: "Phase 02: Final",
                        categoryId: 2,
                        categoryName: "Cyber Security"
                    }
                ];
                setRounds(mockRounds);
                setSelectedRoundId(String(mockRounds[0].roundId));
                setSelectedRound(mockRounds[0]);
            }
        };
        getRounds();
    }, [selectedContestId, headers]);

    useEffect(() => {
        if (!selectedContestId || !selectedRoundId) {
            setAllTeams([]);
            setAllocations({});
            return;
        }
        const round = rounds.find(r => String(r.roundId) === String(selectedRoundId));
        setSelectedRound(round || null);
        const fetchRoundData = async () => {
            try {
                let teamsData = [], allocationsData = {};
                try {
                    const [teamsRes, allocationsRes] = await Promise.all([
                        fetch(`${API_BASE}/admin/contests/${selectedContestId}/rounds/${selectedRoundId}/teams`, { headers }),
                        fetch(`${API_BASE}/admin/contests/allocations?roundId=${selectedRoundId}`, { headers }),
                    ]);
                    if (!teamsRes.ok || !allocationsRes.ok) throw new Error("API error");
                    teamsData = await teamsRes.json();
                    allocationsData = await allocationsRes.json() || {};
                } catch (apiErr) {
                    console.warn("Using mock data for round data in PanelAllocation:", apiErr);
                    if (Number(roundCategoryId) === 2) {
                        teamsData = [
                            { id: 3, name: "HackStorm" },
                            { id: 4, name: "NextGen" }
                        ];
                    } else {
                        teamsData = [
                            { id: 1, name: "AI Warriors" },
                            { id: 2, name: "Code Titans" },
                            { id: 3, name: "Data Miners" },
                            { id: 4, name: "NextGen" }
                        ];
                    }
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    allocationsData = localJson.panelAllocation?.allocations || {};
                }
                setAllTeams(teamsData);
                setAllocations(allocationsData);
                setSavedAllocations(allocationsData);
            } catch (err) {
                console.error(err);
            }
        };
        fetchRoundData();
    }, [selectedContestId, selectedRoundId, rounds, headers, roundCategoryId]);
    const currentMentoredTeamIds = useMemo(() => {
        if (!allocations || !selectedExpertId) return [];
        const expertAlloc = allocations[String(selectedExpertId)] || allocations[Number(selectedExpertId)] || {};
        const ids = new Set();
        Object.values(expertAlloc).forEach(trackAlloc => {
            if (trackAlloc?.mentoredTeamIds) {
                trackAlloc.mentoredTeamIds.forEach(id => ids.add(String(id)));
            }
        });
        return Array.from(ids);
    }, [allocations, selectedExpertId]);
    const isActingAsJudgeAnywhere = useMemo(() => {
        if (!allocations || !selectedExpertId) return false;
        const expertAlloc = allocations[String(selectedExpertId)] || allocations[Number(selectedExpertId)] || {};
        return Object.values(expertAlloc).some(t => t?.isJudge === true);
    }, [allocations, selectedExpertId]);

    const allAssignedTeamIds = useMemo(() => {
        const assigned = new Set();
        if (!allocations) return assigned;
        Object.entries(allocations).forEach(([expId, expertAlloc]) => {
            if (String(expId) !== String(selectedExpertId)) {
                Object.values(expertAlloc).forEach(trackAlloc => {
                    trackAlloc?.mentoredTeamIds?.forEach(id => assigned.add(String(id)));
                });
            }
        });
        return assigned;
    }, [allocations, selectedExpertId]);

    const overviewJudges = useMemo(() => {
        if (!savedAllocations || !roundCategoryId) return [];
        return Object.entries(savedAllocations).filter(([_, expertAlloc]) => {
            return expertAlloc[roundCategoryId]?.isJudge === true;
        }).map(([expId]) => {
            return experts.find(e => String(e.userId) === String(expId));
        }).filter(Boolean);
    }, [savedAllocations, roundCategoryId, experts]);

    const overviewMentors = useMemo(() => {
        if (!savedAllocations || !roundCategoryId) return [];
        return Object.entries(savedAllocations).filter(([_, expertAlloc]) => {
            return expertAlloc[roundCategoryId]?.mentoredTeamIds?.length > 0;
        }).map(([expId, expertAlloc]) => {
            const expert = experts.find(e => String(e.userId) === String(expId));
            const teamIds = expertAlloc[roundCategoryId].mentoredTeamIds;
            const teams = teamIds.map(tId => allTeams.find(t => String(t.id) === String(tId))?.name || `Team ${tId}`);
            return { expert, teams };
        }).filter(item => item.expert);
    }, [savedAllocations, roundCategoryId, experts, allTeams]);

    const handleGlobalTeamToggle = (teamId) => {
        if (!selectedExpertId || !hasMentorRole || isActingAsJudgeAnywhere || !roundCategoryId) return;
        setAllocations(prev => {
            const expertKey = String(selectedExpertId);
            const expertAlloc = prev[expertKey] || {};
            const trackAlloc = expertAlloc[roundCategoryId] || { isJudge: false, mentoredTeamIds: [] };
            let newTeams = (trackAlloc.mentoredTeamIds || []).map(Number);
            const isAssigned = newTeams.map(String).includes(String(teamId));
            if (isAssigned) {
                newTeams = newTeams.filter(id => String(id) !== String(teamId));
            } else {
                newTeams.push(Number(teamId));
            }
            return {
                ...prev, [expertKey]: {
                    ...expertAlloc,
                    [roundCategoryId]: { ...trackAlloc, mentoredTeamIds: newTeams }
                }
            };
        });
    };

    const handleJudgeToggle = () => {
        if (!selectedExpertId || !hasJudgeRole || currentMentoredTeamIds.length > 0 || !roundCategoryId) return;
        setAllocations(prev => {
            const expertKey = String(selectedExpertId);
            const expertAlloc = prev[expertKey] || {};
            const trackAlloc = expertAlloc[roundCategoryId] || { isJudge: false, mentoredTeamIds: [] };
            return {
                ...prev, [expertKey]: {
                    ...expertAlloc,
                    [roundCategoryId]: { ...trackAlloc, isJudge: !trackAlloc.isJudge }
                }
            };
        });
    };

    const handleSave = async () => {
        if (!selectedRoundId) return alert("Please select Round.");
        setIsLoading(true);
        try {
            const expertAlloc = allocations[String(selectedExpertId)] || {};
            const assignmentList = Object.keys(expertAlloc).map(catId => ({
                trackId: Number(catId),
                mentoredTeamIds: expertAlloc[catId].mentoredTeamIds || [],
                isJudge: expertAlloc[catId].isJudge || false
            }));
            const response = await fetch(`${API_BASE}/admin/contests/allocations`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    userId: Number(selectedExpertId),
                    roundId: Number(selectedRoundId),
                    assignments: assignmentList
                })
            });
            if (response.ok) {
                alert("Save successfully!");
                setSavedAllocations(allocations);
            }
            else alert("Save Error");
        } catch {
            alert("Save Fail!");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNotifyExperts = async () => {
        if (!selectedRoundId) return alert("Please select Round.");
        if (!window.confirm("Bạn có chắc chắn muốn gửi email thông báo phân công cho tất cả chuyên gia trong vòng thi này không?")) return;

        setIsSendingMail(true);
        try {
            const response = await fetch(`${API_BASE}/admin/contests/allocations/notify?roundId=${selectedRoundId}`, {
                method: "POST",
                headers: headers
            });
            if (response.ok) {
                alert("Email notifications have been queued to send!");
            } else {
                alert("Send Error");
            }
        } catch {
            alert("Send Fail!");
        } finally {
            setIsSendingMail(false);
        }
    };

    const filteredExperts = useMemo(() =>
        experts.filter(e =>
            e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.username?.toLowerCase().includes(searchQuery.toLowerCase())
        ), [experts, searchQuery]
    );

    const isJudgeForRound = allocations[String(selectedExpertId)]?.[roundCategoryId]?.isJudge || false;
    const isJudgeDisabled = !hasJudgeRole || currentMentoredTeamIds.length > 0;

    return (
        <div className="admin-container">
            <div className="allocation-wrapper">
                <div className="header-flex">
                    <div>
                        <h1 className="config-title">Panel Allocation Desk</h1>
                        <p className="config-subtitle">Assign judges and allocate mentors to teams per competition round.</p>
                    </div>

                    <div className="header-selectors">
                        <div className="selector-group">
                            <label className="selector-label">Contest</label>
                            <select className="form-select-styled" value={selectedContestId}
                                onChange={e => setSelectedContestId(e.target.value)}
                            >
                                <option value="">-- Choose Contest --</option>
                                {contests.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                            </select>
                        </div>

                        <div className="selector-group">
                            <label className="selector-label">Round</label>
                            <select className="form-select-styled" value={selectedRoundId}
                                onChange={e => setSelectedRoundId(e.target.value)}
                                disabled={rounds.length === 0}
                            >
                                <option value="">-- Choose Round --</option>
                                {rounds.map(r => (<option key={r.roundId} value={r.roundId}>{r.roundName}</option>))}
                            </select>
                        </div>

                        {selectedRound && (
                            <div className="selector-group">
                                <label className="selector-label">Category Focus</label>
                                <div className="category-badge-readonly">
                                    {selectedRound.categoryName
                                        ? <><span className="cat-icon">🏷️</span> {selectedRound.categoryName}</>
                                        : <span>Category not assigned</span>
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="left-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Expert Registry</h2>
                        <span className="panel-badge">{filteredExperts.length} Total</span>
                    </div>
                    <div className="search-inner-wrapper">
                        <input type="text" className="search-input"
                            placeholder="Search experts..." value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="expert-list">
                        {filteredExperts.map(expert => (
                            <div key={expert.userId}
                                className={`expert-item ${String(selectedExpertId) === String(expert.userId) ? 'active' : ''}`}
                                onClick={() => setSelectedExpertId(expert.userId)}
                            >
                                <div className="expert-info">
                                    <div className="expert-avatar">{expert.fullName?.charAt(0).toUpperCase()}</div>
                                    <div className="expert-details">
                                        <span className="expert-name">{expert.fullName}</span>
                                        <span className="expert-title">{(expert.roles || []).join(', ')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="right-assignment-panel">
                    <div className="panel-header-custom">
                        <h2>Allocation Management Board</h2>
                        <p>Configure dynamic role and assignments for the selected specialist.</p>
                    </div>

                    {!selectedRoundId ? (
                        <div className="panel-empty-text">
                            <p>Please define active Contest and Round targets to initiate allocation.</p>
                        </div>
                    ) : (
                        <>
                            <div className="management-block">
                                <h3>Team Mentor Allocation</h3>
                                <p className="block-hint">Select teams to assign this expert as a dedicated mentor.</p>
                                {allTeams.length === 0 ? (
                                    <div className="team-empty-box">
                                        <p>No active teams captured within this scope.</p>
                                    </div>
                                ) : (
                                    <div className="global-teams-grid">
                                        {allTeams.map(team => {
                                            const isChecked = currentMentoredTeamIds.includes(String(team.id));
                                            const isTakenByAnother = allAssignedTeamIds.has(String(team.id));
                                            const isMentorDisabled = !hasMentorRole || isActingAsJudgeAnywhere || isTakenByAnother;
                                            return (
                                                <label key={team.id} className={`team-card-global ${isChecked ? 'active' : ''}`}>
                                                    <input type="checkbox" checked={isChecked}
                                                        onChange={() => handleGlobalTeamToggle(team.id)}
                                                        disabled={isMentorDisabled}
                                                    />
                                                    <div className="team-name-text">
                                                        {team.name}
                                                        {isTakenByAnother && <span className="team-assigned-tag"> (Assigned)</span>}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="management-block">
                                <h3>Committee Judge Panel</h3>
                                <p className="block-hint">Toggle evaluation status for cross-team grading compliance.</p>
                                {roundCategoryId ? (
                                    <table className="judge-pure-table judge-table-width">
                                        <thead>
                                            <tr>
                                                <th>Target Track Category</th>
                                                <th className="center judge-table-center-th">Grading Authority</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td><strong>{selectedRound?.categoryName}</strong></td>
                                                <td className="center">
                                                    <label className="ui-switch-blue">
                                                        <input type="checkbox" checked={isJudgeForRound}
                                                            onChange={handleJudgeToggle} disabled={isJudgeDisabled}
                                                        />
                                                        <span className="slider"></span>
                                                    </label>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ) : <p className="judge-missing-track">Missing target track focus.</p>}
                            </div>

                            <div className="panel-footer-actions">
                                <button className="btn-save-master" onClick={handleSave} disabled={isLoading}>
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {isLoading ? 'Processing...' : 'Save'}
                                </button>
                            </div>
                        </>
                    )}
                </div>

                <div className="overview-panel">
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="panel-title overview-title" style={{ margin: 0 }}>Live Status Overview</h3>
                        {selectedRoundId && (overviewJudges.length > 0 || overviewMentors.length > 0) && (
                            <button
                                className="btn-notify"
                                onClick={handleNotifyExperts}
                                disabled={isSendingMail}
                                style={{
                                    backgroundColor: '#0056b3',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: isSendingMail ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    transition: 'background-color 0.2s',
                                    opacity: isSendingMail ? 0.7 : 1
                                }}
                            >
                                {isSendingMail ? (
                                    <>
                                        <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                            <circle cx="12" cy="12" r="10" strokeWidth="4" strokeDasharray="32" strokeLinecap="round" />
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Notify Experts
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    {!selectedRoundId ? (
                        <div className="panel-empty-text">
                            <p>Awaiting parameters.</p>
                        </div>
                    ) : overviewJudges.length === 0 && overviewMentors.length === 0 ? (
                        <div className="panel-empty-text">
                            <p>No record found.</p>
                        </div>
                    ) : (
                        <table className="judge-pure-table overview-table">
                            <thead>
                                <tr>
                                    <th>Role</th>
                                    <th>Identity</th>
                                    <th>Scope</th>
                                </tr>
                            </thead>
                            <tbody>
                                {overviewJudges.map((judge, idx) => (
                                    <tr key={`judge-${judge.userId}-${idx}`}>
                                        <td><span className="badge-judge">JUDGE</span></td>
                                        <td><strong>{judge.fullName || judge.username}</strong></td>
                                        <td><span className="scope-judge">All teams</span></td>
                                    </tr>
                                ))}
                                {overviewMentors.map((mentorData, idx) => (
                                    <tr key={`mentor-${mentorData.expert.userId}-${idx}`}>
                                        <td><span className="badge-mentor">MENTOR</span></td>
                                        <td><strong>{mentorData.expert.fullName || mentorData.expert.username}</strong></td>
                                        <td>
                                            <div className="mentor-teams-badge-wrap">
                                                {mentorData.teams.map((teamName, tIdx) => (
                                                    <span key={tIdx} className="scope-mentor-tag">
                                                        {teamName}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PanelAllocation;
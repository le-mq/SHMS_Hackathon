import React, { useState, useEffect, useMemo } from 'react';
import './PanelAllocation.css';
import NavbarAdmin from './NavbarAdmin';

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
    const [isLoading, setIsLoading] = useState(false);

    const token = localStorage.getItem("shms_token");
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [contestsRes, expertsRes] = await Promise.all([
                    fetch(`${API_BASE}/admin/contests`, { headers }),
                    fetch(`${API_BASE}/admin/contests/experts`, { headers }),
                ]);
                if (contestsRes.ok) {
                    const cData = await contestsRes.json();
                    setContests(cData);
                    if (cData.length > 0) setSelectedContestId(String(cData[0].id));
                }
                if (expertsRes.ok) {
                    const eData = await expertsRes.json();
                    setExperts(eData);
                    if (eData.length > 0) setSelectedExpertId(String(eData[0].userId));
                }
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
        fetch(`${API_BASE}/admin/contests/${selectedContestId}/rounds`, { headers })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                setRounds(data);
                if (data.length > 0) {
                    setSelectedRoundId(String(data[0].roundId));
                    setSelectedRound(data[0]);
                } else {
                    setSelectedRoundId('');
                    setSelectedRound(null);
                }
            });
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
                const [teamsRes, allocationsRes] = await Promise.all([
                    fetch(`${API_BASE}/admin/contests/${selectedContestId}/rounds/${selectedRoundId}/teams`, { headers }),
                    fetch(`${API_BASE}/admin/contests/allocations?roundId=${selectedRoundId}`, { headers }),
                ]);
                if (teamsRes.ok) setAllTeams(await teamsRes.json());
                if (allocationsRes.ok) setAllocations(await allocationsRes.json() || {});
            } catch (err) {
                console.error(err);
            }
        };
        fetchRoundData();
    }, [selectedContestId, selectedRoundId, rounds, headers]);

    const activeExpert = useMemo(() => experts.find(e => String(e.userId) === String(selectedExpertId)), [experts, selectedExpertId]);
    const hasMentorRole = useMemo(() => activeExpert?.roles?.some(r => r.toLowerCase().includes('mentor')) ?? false, [activeExpert]);
    const hasJudgeRole = useMemo(() => activeExpert?.roles?.some(r => r.toLowerCase().includes('judge')) ?? false, [activeExpert]);

    const roundCategoryId = selectedRound?.categoryId ?? null;

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
                ...prev,
                [expertKey]: {
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
                ...prev,
                [expertKey]: {
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
            if (response.ok) alert("Save successfully!");
            else alert("Save Error");
        } catch {
            alert("Save Fail!");
        } finally {
            setIsLoading(false);
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
            <NavbarAdmin />
            <div className="config-wrapper">
                <div className="header-flex">
                    <div>
                        <h1 className="config-title">Panel Allocation</h1>
                        <p className="config-subtitle">Assign judges and allocate mentors to teams per round.</p>
                    </div>

                    <div className="header-selectors">
                        <div className="selector-group">
                            <label className="selector-label">Contest</label>
                            <select
                                className="form-select-styled"
                                value={selectedContestId}
                                onChange={e => setSelectedContestId(e.target.value)}
                            >
                                <option value="">-- Choose Contest --</option>
                                {contests.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="selector-group">
                            <label className="selector-label">Round</label>
                            <select
                                className="form-select-styled"
                                value={selectedRoundId}
                                onChange={e => setSelectedRoundId(e.target.value)}
                                disabled={rounds.length === 0}
                            >
                                <option value="">-- Choose Round --</option>
                                {rounds.map(r => (
                                    <option key={r.roundId} value={r.roundId}>{r.roundName}</option>
                                ))}
                            </select>
                        </div>

                        {selectedRound && (
                            <div className="selector-group">
                                <label className="selector-label">Category</label>
                                <div className="category-badge-readonly">
                                    {selectedRound.categoryName
                                        ? <><span className="cat-icon">🏷</span> {selectedRound.categoryName}</>
                                        : <span style={{ color: '#94a3b8' }}>Category not available yet</span>
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="allocation-grid">
                    <div className="left-panel">
                        <div className="panel-header">
                            <h2 className="panel-title">Expert Registry</h2>
                            <span className="panel-badge">{filteredExperts.length} Active</span>
                        </div>
                        <div className="search-inner-wrapper">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Find Mentor"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="expert-list">
                            {filteredExperts.map(expert => (
                                <div
                                    key={expert.userId}
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

                    <div className="right-panel" style={{ padding: '24px' }}>
                        {!selectedRoundId ? (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                <p>Please select Contest and Round to begin the allocation process..</p>
                            </div>
                        ) : (
                            <>
                                <div className="management-block">
                                    <h3>Mentor</h3>
                                    <div className="global-teams-grid">
                                        {allTeams.map(team => {
                                            const isChecked = currentMentoredTeamIds.includes(String(team.id));
                                            const isTakenByAnother = allAssignedTeamIds.has(String(team.id));
                                            const isMentorDisabled = !hasMentorRole || isActingAsJudgeAnywhere || isTakenByAnother;
                                            return (
                                                <label key={team.id} className={`team-card-global ${isChecked ? 'active' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => handleGlobalTeamToggle(team.id)}
                                                        disabled={isMentorDisabled}
                                                    />
                                                    <div className="team-name-text">
                                                        {team.name}
                                                        {isTakenByAnother && <span style={{ color: '#94a3b8', fontSize: '11px' }}> (already have a mentor.)</span>}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="management-block" style={{ marginTop: '24px' }}>
                                    <h3>Judge</h3>
                                    {roundCategoryId ? (
                                        <table className="judge-pure-table">
                                            <thead>
                                                <tr>
                                                    <th>Category</th>
                                                    <th className="center">grading status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td><strong>{selectedRound?.categoryName}</strong></td>
                                                    <td className="center">
                                                        <label className="ui-switch-blue">
                                                            <input
                                                                type="checkbox"
                                                                checked={isJudgeForRound}
                                                                onChange={handleJudgeToggle}
                                                                disabled={isJudgeDisabled}
                                                            />
                                                            <span className="slider"></span>
                                                        </label>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    ) : <p>This round has not been assigned a category yet.</p>}
                                </div>

                                <div className="panel-footer-actions">
                                    <button className="btn-save-master" onClick={handleSave} disabled={isLoading}>
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>{isLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PanelAllocation;

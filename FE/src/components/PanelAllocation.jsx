import React, { useState, useEffect, useMemo } from 'react';
import './PanelAllocation.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1");

const getStatusStyles = (status) => {
    const s = status?.toUpperCase() || 'ACTIVE';
    switch (s) {
        case 'CLOSED':
            return { bg: '#fee2e2', color: '#ef4444', border: '#fecaca' };
        case 'UPCOMING':
            return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
        case 'ACTIVE':
        case 'ACTIVED':
        default:
            return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
    }
};

const PanelAllocation = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState(() => sessionStorage.getItem('panelAllocSelectedContest') || '');
    const [contestSearchQuery, setContestSearchQuery] = useState('');
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
    const [initialLoading, setInitialLoading] = useState(true);

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
                setExperts(eData);
                if (eData.length > 0) setSelectedExpertId(String(eData[0].userId));
            } catch (err) {
                console.error(err);
            } finally {
                setInitialLoading(false);
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
                if (!res.ok) throw new Error("API Rounds error");
                const data = await res.json();

                setRounds(data);
                handleSelectRound(data);
            } catch (err) {
                console.warn("Using mock data from testFE.json for rounds in PanelAllocation:", err);
                try {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    const localRounds = localJson.panelAllocation?.rounds || [];

                    setRounds(localRounds);
                    handleSelectRound(localRounds);
                } catch (localErr) {
                    console.error("Failed to fetch from testFE.json as well:", localErr);
                }
            }
        };

        const handleSelectRound = (roundsData) => {
            if (roundsData.length > 0) {
                const savedRoundId = sessionStorage.getItem('panelAllocSelectedRoundId');
                const hasSavedRound = savedRoundId && roundsData.some(r => String(r.roundId) === String(savedRoundId));
                if (hasSavedRound) {
                    setSelectedRoundId(savedRoundId);
                    setSelectedRound(roundsData.find(r => String(r.roundId) === String(savedRoundId)));
                } else {
                    setSelectedRoundId(String(roundsData[0].roundId));
                    setSelectedRound(roundsData[0]);
                }
            } else {
                setSelectedRoundId('');
                setSelectedRound(null);
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
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    teamsData = localJson.panelAllocation?.teams || [];
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
        if (!window.confirm("Are you sure you want to send allocation notification emails to all experts in this round?")) return;

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

    if (initialLoading) {
        return (
            <div className="admin-container">
                <div className="global-loading">
                    <div className="global-spinner"></div>
                    <span>Loading panel allocations...</span>
                </div>
            </div>
        );
    }

    if (!selectedContestId) {
        return (
            <div className="admin-container">
                <div style={{ padding: '40px', maxWidth: 1200, margin: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h1 className="config-title" style={{ fontSize: '32px' }}>Panel Allocation</h1>
                            <p className="config-subtitle" style={{ fontSize: '15px', color: '#64748b' }}>Select a contest to manage expert panel allocations and track assignment progress.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', background: 'white', width: '320px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <svg width="18" height="18" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search contests..."
                                value={contestSearchQuery}
                                onChange={(e) => setContestSearchQuery(e.target.value)}
                                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', width: '100%', color: '#0f172a', fontWeight: '500' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {contests
                            .filter(c => !contestSearchQuery || c.name?.toLowerCase().includes(contestSearchQuery.toLowerCase()))
                            .sort((a, b) => {
                                if (a.status === 'CLOSED' && b.status !== 'CLOSED') return 1;
                                if (a.status !== 'CLOSED' && b.status === 'CLOSED') return -1;
                                return 0;
                            })
                            .map(c => {
                                const isClosed = c.status === 'CLOSED';
                                return (
                                    <div
                                        key={c.id}
                                        style={{
                                            background: 'white',
                                            padding: '28px',
                                            borderRadius: '16px',
                                            border: '1.5px solid #cbd5e1',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            minHeight: '160px'
                                        }}
                                        onClick={() => {
                                            setSelectedContestId(c.id.toString());
                                            sessionStorage.setItem('panelAllocSelectedContest', c.id.toString());
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = '#2563eb';
                                            e.currentTarget.style.transform = 'translateY(-3px)';
                                            e.currentTarget.style.boxShadow = '0 10px 20px -3px rgba(37, 99, 235, 0.12)';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                            e.currentTarget.style.transform = 'none';
                                            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                                <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 800, lineHeight: '1.4' }}>{c.name}</h3>
                                                {(() => {
                                                    const contestStatus = c.status || 'ACTIVE';
                                                    const contestStyles = getStatusStyles(contestStatus);
                                                    return (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            background: contestStyles.bg,
                                                            color: contestStyles.color,
                                                            border: `1px solid ${contestStyles.border}`,
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            fontWeight: 700,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.5px'
                                                        }}>
                                                            {contestStatus}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            {c.year && (
                                                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                                                    {c.season ? `${c.season} ` : ''}{c.year}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                            <span style={{ color: '#2563eb', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Manage Allocations
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        }
                        {contests.filter(c => !contestSearchQuery || c.name?.toLowerCase().includes(contestSearchQuery.toLowerCase())).length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '60px 40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b', fontWeight: '600', border: '1.5px dashed #cbd5e1' }}>
                                No contests found matching your search query.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <div className="allocation-wrapper">
                <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gridColumn: '1 / -1' }}>
                    <div>
                        <h1 className="config-title">Panel Allocation Desk</h1>
                        <p className="config-subtitle">Assign judges and allocate mentors to teams per competition round.</p>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedContestId('');
                            setSelectedRoundId('');
                            setSelectedRound(null);
                            sessionStorage.removeItem('panelAllocSelectedContest');
                            sessionStorage.removeItem('panelAllocSelectedRoundId');
                        }}
                        style={{
                            padding: '8px 16px',
                            background: 'white',
                            border: '1.5px solid #cbd5e1',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = '#94a3b8';
                            e.currentTarget.style.background = '#f8fafc';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = '#cbd5e1';
                            e.currentTarget.style.background = 'white';
                        }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Contests
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', width: '100%', background: 'white', padding: '24px', borderRadius: '16px', border: '1.5px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', gridColumn: '1 / -1' }}>
                    <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selected Contest</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '15px' }}>
                            {contests.find(c => String(c.id) === String(selectedContestId))?.name || 'Selected Contest'}
                        </div>
                        {(() => {
                            const contestsObj = contests.find(c => String(c.id) === String(selectedContestId));
                            if (!contestsObj) return null;
                            const statusText = contestsObj.status || 'ACTIVE';
                            const badgeStyles = getStatusStyles(statusText);
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', padding: '0 4px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Overall Status:</span>
                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: badgeStyles.bg, color: badgeStyles.color, border: `1px solid ${badgeStyles.border}` }}>{statusText}</span>
                                </div>
                            );
                        })()}
                    </div>

                    <div style={{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>

                    <div style={{ flex: '3 1 500px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Competition Round</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {rounds.map((r, idx) => {
                                const isActive = String(selectedRoundId) === String(r.roundId);

                                const statusText = r.status ? r.status.toUpperCase() : 'ACTIVE';
                                const statusStyle = getStatusStyles(statusText);

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            setSelectedRoundId(String(r.roundId));
                                            setSelectedRound(r);
                                            sessionStorage.setItem('panelAllocSelectedRoundId', String(r.roundId));
                                        }}
                                        style={{
                                            padding: '12px 16px',
                                            borderRadius: '10px',
                                            border: `2px solid ${isActive ? '#2563eb' : '#cbd5e1'}`,
                                            background: isActive ? '#eff6ff' : 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            minWidth: '200px',
                                            boxShadow: isActive ? '0 4px 6px -1px rgba(37, 99, 235, 0.1)' : 'none',
                                            transition: 'all 0.2s ease',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={e => {
                                            if (!isActive) e.currentTarget.style.borderColor = '#94a3b8';
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) e.currentTarget.style.borderColor = '#cbd5e1';
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: isActive ? '#1e3a8a' : '#1e293b', lineHeight: '1.2' }}>
                                                {r.roundName}
                                            </div>
                                            <span style={{
                                                fontSize: '9px',
                                                fontWeight: 800,
                                                padding: '2px 6px',
                                                borderRadius: '6px',
                                                background: statusStyle.bg,
                                                color: statusStyle.color,
                                                border: `1px solid ${statusStyle.border}`,
                                                textTransform: 'uppercase',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {statusText}
                                            </span>
                                        </div>

                                        <span style={{
                                            fontSize: '11px',
                                            background: isActive ? '#dbeafe' : '#f1f5f9',
                                            color: isActive ? '#1e40af' : '#475569',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontWeight: 600,
                                            alignSelf: 'flex-start',
                                            marginTop: 'auto'
                                        }}>
                                            {r.categoryName || 'No Category'}
                                        </span>
                                    </div>
                                );
                            })}
                            {rounds.length === 0 && (
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '12px 0' }}>
                                    No Rounds found under this contest.
                                </span>
                            )}
                        </div>
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
                            <p>Please define active Round target to initiate allocation.</p>
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
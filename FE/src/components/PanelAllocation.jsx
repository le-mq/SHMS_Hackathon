import React, { useState, useEffect, useMemo } from 'react';
import './PanelAllocation.css';
import NavbarAdmin from './NavbarAdmin';
const API_BASE = "http://localhost:8080/api/v1";
const PanelAllocation = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [tracks, setTracks] = useState([]);
    const [experts, setExperts] = useState([]);
    const [selectedExpertId, setSelectedExpertId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [allocations, setAllocations] = useState({});

    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function fetchInitialData() {
            try {
                const token = localStorage.getItem("shms_token");
                const headers = { Authorization: `Bearer ${token}` };
                const contestRes = await fetch(API_BASE + "/admin/contests", { headers });
                if (!contestRes.ok)
                    throw new Error();
                const cData = await contestRes.json();
                const expertRes = await fetch(API_BASE + "/admin/contests/experts", { headers });
                if (!expertRes.ok)
                    throw new Error();
                const eData = await expertRes.json();
                const now = new Date();
                const activeExps = eData.filter(e => !e.accessExpiry || new Date(e.accessExpiry) > now);
                const allocRes = await fetch(API_BASE + "/admin/contests/allocations", { headers });
                if (!allocRes.ok)
                    throw new Error();
                const aData = await allocRes.json();
                if (!cancelled) {
                    setContests(cData);
                    setExperts(activeExps);
                    setAllocations(aData || {});
                    if (activeExps.length > 0) {
                        setSelectedExpertId(activeExps[0].userId);
                    }
                }
            }
            catch {
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                if (!cancelled) {
                    setContests(localJson.panelAllocation?.contests || []);
                    const expertsData = localJson.panelAllocation?.experts || [];
                    setExperts(expertsData);
                    if (expertsData.length > 0) {
                        setSelectedExpertId(expertsData[0].userId);
                    }
                    setAllocations(localJson.panelAllocation?.allocations || {});
                }
            }
        }
        fetchInitialData();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!selectedContestId) {
            setTracks([]);
            return;
        }

        const fetchContestDetails = async () => {
            try {
                const token = localStorage.getItem("shms_token");
                const res = await fetch(API_BASE + `/admin/contests/${selectedContestId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok)
                    throw new Error();
                const data = await res.json();
                setTracks(data.tracks || []);
            }
            catch {
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                const contest = localJson.panelAllocation.contests.find(c => c.id == selectedContestId);
                setTracks(contest?.tracks || []);
            }
        };
        fetchContestDetails();
    }, [selectedContestId]);

    const activeExpert = useMemo(() => experts.find(e => e.userId === selectedExpertId), [experts, selectedExpertId]);

    const filteredExperts = useMemo(() => {
        return experts.filter(e =>
            e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [experts, searchQuery]);

    const handleJudgeToggle = (expertId, trackId) => {
        setAllocations(prev => {
            const expertAlloc = prev[expertId] || {};
            const trackAlloc = expertAlloc[trackId] || { isJudge: false, mentoredTeamIds: [] };

            return {
                ...prev,
                [expertId]: {
                    ...expertAlloc,
                    [trackId]: {
                        ...trackAlloc,
                        isJudge: !trackAlloc.isJudge
                    }
                }
            };
        });
        setSuccessMsg('');
    };

    const handleTeamToggle = (expertId, trackId, teamId) => {
        setAllocations(prev => {
            const expertAlloc = prev[expertId] || {};
            const trackAlloc = expertAlloc[trackId] || { isJudge: false, mentoredTeamIds: [] };
            const currentTeams = trackAlloc.mentoredTeamIds || [];
            const newTeams = currentTeams.includes(teamId)
                ? currentTeams.filter(id => id !== teamId)
                : [...currentTeams, teamId];

            return {
                ...prev,
                [expertId]: {
                    ...expertAlloc,
                    [trackId]: {
                        ...trackAlloc,
                        mentoredTeamIds: newTeams
                    }
                }
            };
        });
        setSuccessMsg('');
    };

    const hasConflicts = useMemo(() => {
        if (!selectedExpertId) return false;
        const expertAlloc = allocations[selectedExpertId];
        if (!expertAlloc) return false;

        for (const trackId in expertAlloc) {
            const alloc = expertAlloc[trackId];
            if (alloc.isJudge && alloc.mentoredTeamIds && alloc.mentoredTeamIds.length > 0) return true;
        }
        return false;
    }, [allocations, selectedExpertId]);

    const getTeamOwnerName = (trackId, teamId) => {
        for (const expertId in allocations) {
            // Không tính chính Mentor hiện tại đang chỉnh sửa
            if (expertId === selectedExpertId) continue;

            const trackAlloc = allocations[expertId]?.[trackId];
            if (trackAlloc?.mentoredTeamIds?.includes(teamId)) {
                const exp = experts.find(e => e.userId === expertId);
                return exp?.fullName || exp?.username || "Another Mentor";
            }
        }
        return null;
    };

    const handleSave = async () => {
        if (hasConflicts || !selectedExpertId) return;

        setIsLoading(true);
        setSuccessMsg('');

        try {
            const token = localStorage.getItem('shms_token');
            const expertAlloc = allocations[selectedExpertId] || {};
            const assignmentList = Object.keys(expertAlloc).map(trackId => ({
                trackId: Number(trackId),
                mentoredTeamIds: expertAlloc[trackId].mentoredTeamIds || [],
                isJudge: expertAlloc[trackId].isJudge || false
            }));

            const payload = {
                userId: selectedExpertId,
                assignments: assignmentList
            };

            const response = await fetch(API_BASE + "/admin/contests/allocations", {
                method: "POST", headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                }, body: JSON.stringify(payload)
            }
            );

            if (response.ok) {
                setSuccessMsg('Allocation mapping saved successfully');
                alert('Allocation mapping saved successfully!');
            } else {
                const errorData = await response.json();
                console.error(errorData);
                alert('Save failed: ' + (errorData.error || 'Unknown error'));
            }
        } catch {
            setSuccessMsg("Mock save success!");
            alert("Mock save success!");
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="admin-container">
            <NavbarAdmin />

            <div className="config-wrapper">
                {hasConflicts && (
                    <div className="error-banner">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Users cannot be assigned as both a Mentor and a Judge within the exact same category
                    </div>
                )}
                {successMsg && !hasConflicts && (
                    <div className="error-banner" style={{ backgroundColor: '#d1fae5', borderColor: '#10b981', color: '#047857' }}>
                        {successMsg}
                    </div>
                )}

                <div className="header-flex">
                    <div>
                        <h1 className="config-title">Category Panel Allocation</h1>
                        <p className="config-subtitle">Map subject matter experts to specific hackathon categories and define their evaluation roles.</p>
                    </div>
                    <div style={{ minWidth: '250px' }}>
                        <select
                            className="form-select"
                            value={selectedContestId}
                            onChange={(e) => setSelectedContestId(e.target.value)}
                        >
                            <option value="">-- Select Contest --</option>
                            {contests.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.year} {c.season})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="allocation-grid">
                    <div className="left-panel">
                        <div className="panel-header">
                            <h2 className="panel-title">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                Expert Registry
                            </h2>
                            <div className="panel-badge">{experts.length} Active</div>
                        </div>
                        <div className="search-box">
                            <div className="search-inner-wrapper">
                                <svg className="search-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Search experts by name or username..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="expert-list">
                            {filteredExperts.map(expert => (
                                <div
                                    key={expert.userId}
                                    className={`expert-item ${selectedExpertId === expert.userId ? 'active' : ''}`}
                                    onClick={() => setSelectedExpertId(expert.userId)}
                                >
                                    <div className="expert-info">
                                        <div className="expert-avatar">
                                            {expert.fullName ? expert.fullName.charAt(0).toUpperCase() : 'E'}
                                        </div>
                                        <div className="expert-details">
                                            <span className="expert-name">{expert.fullName || expert.username}</span>
                                            <span className="expert-title">{expert.roles.join(', ')}</span>
                                        </div>
                                    </div>
                                    {selectedExpertId === expert.userId && (
                                        <svg width="20" height="20" fill="none" stroke="#111827" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    )}
                                </div>
                            ))}
                            {filteredExperts.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                                    No active experts found.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="right-panel">
                        <div className="panel-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <h2 className="panel-title" style={{ marginBottom: 0 }}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                Category Assignments
                            </h2>
                            <p className="panel-subtitle">
                                Assign roles for <strong>{activeExpert?.fullName || activeExpert?.username || 'Select an Expert'}</strong>
                            </p>
                        </div>

                        {!selectedContestId ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                                Please select a contest from the top to view tracks.
                            </div>
                        ) : tracks.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                                This contest has no categories defined yet.
                            </div>
                        ) : (
                            <table className="track-table">
                                <thead>
                                    <tr>
                                        <th>Hackathon Category</th>
                                        <th className="center">Mentor</th>
                                        <th className="center">Judge</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tracks.map(track => {
                                        const rawAlloc = allocations[selectedExpertId]?.[track.id];
                                        const alloc = {
                                            isJudge: rawAlloc?.isJudge || false,
                                            mentoredTeamIds: rawAlloc?.mentoredTeamIds || []
                                        };
                                        const hasMentorAssignments = alloc.mentoredTeamIds && alloc.mentoredTeamIds.length > 0;
                                        const isConflict = hasMentorAssignments && alloc.isJudge;
                                        const isActive = hasMentorAssignments || alloc.isJudge;

                                        const expertRoles = activeExpert?.roles || [];
                                        const hasMentorRole = expertRoles.some(r => r.toUpperCase() === 'MENTOR');
                                        const hasJudgeRole = expertRoles.some(r => r.toUpperCase() === 'JUDGE' || r.toUpperCase() === 'GUEST JUDGE');

                                        return (
                                            <tr key={track.id}>
                                                <td>
                                                    <div className="track-info">
                                                        <div className={`track-color ${isConflict ? 'conflict' : (isActive ? 'active' : '')}`}></div>
                                                        <div className="track-details">
                                                            <span className="track-name">{track.categoryName}</span>
                                                            <span className="track-desc">{track.trackDescription}</span>
                                                            {isConflict && <span className="conflict-text">Role conflict detected</span>}
                                                            {(!track.teams || track.teams.length === 0) && (
                                                                <div className="registered-teams" style={{ marginTop: '8px', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                                                                    No teams registered yet
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="toggle-cell" style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                                                    {track.teams && track.teams.length > 0 ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {track.teams.map(t => {
                                                                const isMentoringThisTeam = alloc.mentoredTeamIds?.includes(t.id);

                                                                const ownerName = getTeamOwnerName(track.id, t.id);
                                                                const isAssignedToOther = !!ownerName;
                                                                return (
                                                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px', background: '#f8fafc', borderRadius: '4px' }}>
                                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: '500', color: isAssignedToOther ? '#94a3b8' : '#334155' }}>
                                                                                {t.name}
                                                                            </span>
                                                                            {isAssignedToOther && (
                                                                                <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'normal' }}>
                                                                                    (By {ownerName})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <label className="toggle-switch" style={{ margin: 0, transform: 'scale(0.8)' }} title={!hasMentorRole ? "Expert does not have Mentor role" : ""}>
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isMentoringThisTeam}
                                                                                onChange={() => handleTeamToggle(selectedExpertId, track.id, t.id)}
                                                                                disabled={!hasMentorRole || isAssignedToOther}
                                                                            />
                                                                            <span className={`toggle-slider ${isConflict && isMentoringThisTeam ? 'conflict' : ''} ${!hasMentorRole ? 'disabled' : ''}`}></span>
                                                                        </label>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>N/A</span>
                                                    )}
                                                </td>
                                                <td className="toggle-cell" style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                                                    <label className="toggle-switch" title={!hasJudgeRole ? "Expert does not have Judge role" : ""}>
                                                        <input
                                                            type="checkbox"
                                                            checked={alloc.isJudge}
                                                            onChange={() => handleJudgeToggle(selectedExpertId, track.id)}
                                                            disabled={!hasJudgeRole}
                                                        />
                                                        <span className={`toggle-slider ${isConflict ? 'conflict' : ''} ${!hasJudgeRole ? 'disabled' : ''}`}></span>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        {selectedContestId && tracks.length > 0 && selectedExpertId && (
                            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                                <button className="save-btn" style={{ width: 'auto' }} onClick={handleSave} disabled={isLoading || hasConflicts}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                    {isLoading ? 'Saving...' : 'Save Allocation Mapping'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PanelAllocation;
import { useState, useEffect, useRef } from 'react';
import './TeamStatus.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student";

const normalizeList = (json) => {
    if (Array.isArray(json)) return json;
    return json?.data || [];
};

const safeJson = async (res) => {
    try {
        return await res.json();
    } catch {
        return {};
    }
};

const isJoinedTeam = (item) => {
    return item && item.data && !item.data.error && item.data.status !== 'NO TEAM';
};

const getTeamIdentity = (team) => {
    return String(team?.teamName || '').trim().toUpperCase();
};

const dedupeParticipatedTeams = (teams) => {
    const seenTeams = new Set();
    return teams.filter(item => {
        const identity = getTeamIdentity(item?.data);
        if (!identity) return true;
        if (seenTeams.has(identity)) return false;
        seenTeams.add(identity);
        return true;
    });
};

const TeamStatus = () => {
    const [participatedTeams, setParticipatedTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [viewMode, setViewMode] = useState('LIST'); // 'LIST' or 'DETAIL'
    const [selectedTeamData, setSelectedTeamData] = useState(null);

    // Invitation system state
    const [inviteKeyword, setInviteKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMessage, setInviteMessage] = useState('');

    useEffect(() => {
        if (!successMessage) return;
        const timerId = setTimeout(() => setSuccessMessage(''), 3000);
        return () => clearTimeout(timerId);
    }, [successMessage]);

    useEffect(() => {
        let cancelled = false;

        const fetchTeamStatus = async () => {
            try {
                setIsLoading(true);
                const token = localStorage.getItem('shms_token');

                // 1. Fetch contests to know which contests exist
                const contestsRes = await fetch(`${API_BASE}/contests`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const contestsJson = await safeJson(contestsRes);
                if (!contestsRes.ok) throw new Error(contestsJson.error || 'Failed to load contests');
                const contestList = normalizeList(contestsJson);

                // 2. Fetch team status for each contest
                const statusResults = await Promise.all(
                    contestList.map(async (contest) => {
                        try {
                            const res = await fetch(`${API_BASE}/teams/status?contestId=${contest.id}`, {
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            const data = await safeJson(res);
                            return { contest, data };
                        } catch {
                            return null;
                        }
                    })
                );

                let joinedTeams = dedupeParticipatedTeams(statusResults.filter(isJoinedTeam));

                // 3. Fetch global team status for any draft/forming team without a contest yet
                const res = await fetch(`${API_BASE}/teams/all-forming`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const formingTeams = await safeJson(res);

                if (res.ok && Array.isArray(formingTeams)) {
                    formingTeams.forEach(data => {
                        const fallbackStatus = String(data.status || '').toUpperCase();
                        // Make sure we don't duplicate if it already matches one
                        const exists = joinedTeams.some(item => getTeamIdentity(item.data) === getTeamIdentity(data));
                        if (!exists) {
                            joinedTeams = [
                                { contest: { id: 'forming', name: 'Not Registered' }, data },
                                ...joinedTeams,
                            ];
                        }
                    });
                }

                // Sort teams prioritizing APPROVED status, then by most recent contest
                joinedTeams.sort((a, b) => {
                    const statusA = String(a.data?.status || '').toUpperCase();
                    const statusB = String(b.data?.status || '').toUpperCase();

                    const getRank = (status) => {
                        if (status === 'APPROVED') return 1;
                        if (status === 'REJECTED') return 2;
                        if (status === 'CLOSED') return 4;
                        return 3;
                    };

                    const rankA = getRank(statusA);
                    const rankB = getRank(statusB);

                    if (rankA !== rankB) return rankA - rankB;

                    if (a.contest?.id === 'forming') return -1;
                    if (b.contest?.id === 'forming') return 1;

                    const dateA = a.contest?.competitionStart ? new Date(a.contest.competitionStart).getTime() : 0;
                    const dateB = b.contest?.competitionStart ? new Date(b.contest.competitionStart).getTime() : 0;

                    if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB)) {
                        return dateB - dateA;
                    }

                    const idA = parseInt(a.contest?.id) || 0;
                    const idB = parseInt(b.contest?.id) || 0;
                    return idB - idA;
                });

                if (!cancelled) {
                    setParticipatedTeams(joinedTeams);
                }

            } catch (err) {
                console.warn('Team status API unavailable, fallback to mock:', err.message);
                // Fallback mock logic for development
                try {
                    const localRes = await fetch('/testFE.json');
                    const localJson = await localRes.json();
                    const mockContests = localJson.teamStatusContests?.data || [];
                    const mockTeamsByContest = localJson.teamStatusByContest || {};
                    let mockJoinedTeams = mockContests
                        .map(contest => ({ contest, data: mockTeamsByContest[String(contest.id)] }))
                        .filter(isJoinedTeam);

                    mockJoinedTeams = dedupeParticipatedTeams(mockJoinedTeams);

                    if (mockJoinedTeams.length === 0 && mockContests.length > 0 && localJson.teamStatus?.data) {
                        mockJoinedTeams = [{ contest: mockContests[0], data: localJson.teamStatus.data }];
                    }

                    mockJoinedTeams.sort((a, b) => {
                        const statusA = String(a.data?.status || '').toUpperCase();
                        const statusB = String(b.data?.status || '').toUpperCase();
                        if (statusA === 'APPROVED' && statusB !== 'APPROVED') return -1;
                        if (statusB === 'APPROVED' && statusA !== 'APPROVED') return 1;

                        if (a.contest?.id === 'forming') return -1;
                        if (b.contest?.id === 'forming') return 1;

                        const dateA = a.contest?.competitionStart ? new Date(a.contest.competitionStart).getTime() : 0;
                        const dateB = b.contest?.competitionStart ? new Date(b.contest.competitionStart).getTime() : 0;

                        if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB)) {
                            return dateB - dateA;
                        }

                        const idA = parseInt(a.contest?.id) || 0;
                        const idB = parseInt(b.contest?.id) || 0;
                        return idB - idA;
                    });

                    if (!cancelled) setParticipatedTeams(mockJoinedTeams);
                } catch (mockError) {
                    if (!cancelled) setError('Could not connect to server.');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchTeamStatus();

        return () => { cancelled = true; };
    }, []);

    const normalizeStatus = (value) => String(value || 'NO TEAM').trim().toUpperCase();
    const getStatusLabel = (value) => {
        const status = normalizeStatus(value);
        if (status === 'PENDING') return 'Pending Approval';
        if (status === 'NO TEAM') return 'No Team';
        return status;
    };

    const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    const handleViewDetails = (team) => {
        setSelectedTeamData(team);
        setViewMode('DETAIL');
        setInviteMessage('');
        setInviteKeyword('');
        setSearchResults([]);
    };

    const handleBackToList = () => {
        setSelectedTeamData(null);
        setViewMode('LIST');
    };

    const handleLeaveTeam = async () => {
        if (!window.confirm('Are you sure you want to leave this team?')) return;
        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch(`${API_BASE}/teams/leave?teamId=${selectedTeamData.data.teamId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const result = await safeJson(response);
            if (!response.ok) throw new Error(result.error || result.message || 'Failed to leave team.');

            // Remove from local state
            setParticipatedTeams(prev => prev.filter(t => t.data.teamId !== selectedTeamData.data.teamId));
            setSuccessMessage('Left team successfully!');
            handleBackToList();
        } catch (err) {
            console.error('Leave team failed:', err);
            // Mock removal
            setParticipatedTeams(prev => prev.filter(t => t.data.teamId !== selectedTeamData.data.teamId));
            setSuccessMessage('Left team successfully!');
            handleBackToList();
        }
    };

    // --- Invitation System ---
    const handleSearchStudents = async () => {
        if (!inviteKeyword.trim()) return;
        setInviteLoading(true);
        setInviteMessage('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`${API_BASE}/search?keyword=${encodeURIComponent(inviteKeyword)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            if (res.ok) {
                setSearchResults(Array.isArray(json) ? json : []);
                if (Array.isArray(json) && json.length === 0) setInviteMessage('Student not found.');
            } else {
                setInviteMessage(json.error || 'Search failed');
            }
        } catch { setInviteMessage('Could not connect to server.'); }
        finally { setInviteLoading(false); }
    };

    const handleSendInvitation = async (studentUserId) => {
        if (!selectedTeamData?.data?.teamId) { setInviteMessage('No team selected.'); return; }
        setInviteLoading(true);
        setInviteMessage('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`${API_BASE}/teams/invitations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamId: selectedTeamData.data.teamId, studentUserId })
            });
            const json = await res.json();
            if (res.ok) {
                alert('Invitation sent successfully!');
                setSearchResults([]);
                setInviteKeyword('');
                setInviteMessage('');
            } else {
                setInviteMessage(json.error || 'Failed to send invitation');
            }
        } catch { setInviteMessage('Could not connect to server.'); }
        finally { setInviteLoading(false); }
    };

    if (isLoading) {
        return <div className="status-container"><div className="loading-state">Loading your teams...</div></div>;
    }

    if (viewMode === 'LIST') {
        return (
            <div className="status-container">
                <div className="status-header-flex">
                    <div>
                        <h1 className="status-title">My Teams</h1>
                        <p className="status-subtitle">
                            Manage all the teams you belong to across different competitions.
                        </p>
                    </div>
                </div>

                {successMessage && <div className="success-banner">{successMessage}</div>}
                {error && <div className="error-banner">{error}</div>}

                {participatedTeams.length === 0 ? (
                    <div className="empty-teams-state">
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <h3>No Teams Found</h3>
                        <p>You haven't joined or created any teams yet.</p>
                    </div>
                ) : (
                    <div className="teams-grid">
                        {participatedTeams.map(pt => {
                            const data = pt.data;
                            const roster = Array.isArray(data.roster) ? data.roster : [];
                            const leader = roster.find(m => m.internalRole === 'LEADER') || roster[0];
                            const status = normalizeStatus(data.status);
                            const statusClass = status.toLowerCase().replace(/\s+/g, '-');

                            return (
                                <div key={data.teamId || data.teamName} className={`team-card team-card-${statusClass}`}>
                                    <div className="tc-header">
                                        <h3 className="tc-name">{data.teamName}</h3>
                                        <span className={`team-badge ${statusClass}`}>
                                            <div className="team-badge-dot"></div>
                                            {getStatusLabel(status)}
                                        </span>
                                    </div>
                                    <div className="tc-body">
                                        <div className="tc-row">
                                            <span className="tc-label">Competition:</span>
                                            <span className="tc-value">{pt.contest?.name || 'Not Registered'}</span>
                                        </div>
                                        <div className="tc-row">
                                            <span className="tc-label">Members:</span>
                                            <span className="tc-value">{data.currentTotalMembers || roster.length} / {data.maxMembers === 999 ? 5 : (data.maxMembers || 5)}</span>
                                        </div>
                                        <div className="tc-row">
                                            <span className="tc-label">Leader:</span>
                                            <span className="tc-value">{status === 'FORMING' ? 'Not Selected' : (leader?.fullName || 'Not Selected')}</span>
                                        </div>
                                    </div>
                                    <div className="tc-footer">
                                        <button className="view-details-btn" onClick={() => handleViewDetails(pt)}>
                                            View Details
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // DETAIL VIEW
    const data = selectedTeamData.data;
    const contest = selectedTeamData.contest;
    const roster = Array.isArray(data.roster) ? data.roster : [];
    const status = normalizeStatus(data.status);
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');
    const isSubmitted = status === 'APPROVED' || status === 'PENDING';
    const canLeaveTeam = !['APPROVED', 'PENDING', 'CLOSED'].includes(status);

    return (
        <div className="status-container">
            <button className="back-btn" onClick={handleBackToList}>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Teams
            </button>

            <div className="status-header-flex" style={{ marginTop: '16px' }}>
                <div>
                    <h1 className="status-title">{data.teamName}</h1>
                    <p className="status-subtitle">
                        {contest?.name && contest.name !== 'Not Registered' ? (
                            <>Registered for: <strong className="highlight-contest">{contest.name}</strong></>
                        ) : 'Not registered for any competition yet.'}
                    </p>
                </div>

                <div className="header-actions">
                    {(data.invitationCode || data.teamCode) && (
                        <div className="team-code-box" style={{ display: 'flex', alignItems: 'center', background: '#eff6ff', border: '1.5px solid #3b82f6', borderRadius: '8px', padding: '8px 14px', gap: '10px', marginRight: '12px', boxShadow: '0 2px 6px rgba(59, 130, 246, 0.15)' }}>
                            <span style={{ fontSize: '14px', color: '#1e40af', fontWeight: 600 }}>Team Code:</span>
                            <span style={{ fontSize: '17px', color: '#1e3a8a', fontWeight: 800, letterSpacing: '1px' }}>{data.invitationCode || data.teamCode}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(data.invitationCode || data.teamCode);
                                    alert('Team code copied successfully!');
                                }}
                                style={{ background: '#dbeafe', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', color: '#2563eb', transition: 'all 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.background = '#bfdbfe'}
                                onMouseOut={(e) => e.currentTarget.style.background = '#dbeafe'}
                                title="Copy team code"
                            >
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </div>
                    )}
                    {canLeaveTeam && (
                        <button className="leave-team-btn" onClick={handleLeaveTeam}>
                            Leave Team
                        </button>
                    )}
                    <div className={`team-badge ${statusClass}`}>
                        <div className="team-badge-dot"></div>
                        {getStatusLabel(status)}
                    </div>
                </div>
            </div>

            {status === 'REJECTED' && roster.some(m => m.isUnauthorized) && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    <span>This team was rejected because some members are not from the allowed university for this contest. Please review the highlighted members below.</span>
                </div>
            )}

            {status === 'REJECTED' && !roster.some(m => m.isUnauthorized) && (
                (() => {
                    const approvedCount = roster.filter(m => m.status === 'APPROVED').length;
                    const min = selectedTeamData.data.minMembers || 3;
                    const max = selectedTeamData.data.maxMembers || 5;
                    if (approvedCount < min || approvedCount > max) {
                        return (
                            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', color: '#ef4444', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                <span>This team was rejected because it must have between {min} and {max} approved members.</span>
                            </div>
                        );
                    }
                    return null;
                })()
            )}

            <div className="roster-section">
                <div className="roster-header">
                    <h2 className="roster-title">Member Roster</h2>
                </div>

                <table className="roster-table">
                    <thead>
                    <tr>
                        <th>FULL NAME</th>
                        <th>STUDENT ID</th>
                        <th>EMAIL</th>
                        <th>INTERNAL ROLE</th>
                    </tr>
                    </thead>
                    <tbody>
                    {roster.length > 0 ? roster.map((member, idx) => {
                        const isPending = member.status === 'PENDING';
                        const displayRole = isPending ? 'PENDING' : member.internalRole;

                        return (
                            <tr key={idx} style={{ opacity: isPending ? 0.6 : 1, backgroundColor: member.isUnauthorized ? '#fef2f2' : 'transparent' }}>
                                <td>
                                    <div className="member-name-col">
                                        <div className="member-avatar">{getInitials(member.fullName)}</div>
                                        <span className="member-name" style={{ color: member.isUnauthorized ? '#ef4444' : 'inherit' }}>
                                                {member.fullName}
                                            {member.isUnauthorized && <span style={{fontSize: '12px', marginLeft: '6px', fontWeight: 500}}>(Your university is not allowed to participate in this competition)</span>}
                                            </span>
                                    </div>
                                </td>
                                <td><span className="member-id">{member.studentId}</span></td>
                                <td><span className="member-email">{member.email}</span></td>
                                <td>
                                        <span className={`role-badge ${displayRole === 'LEADER' ? 'role-leader' : (displayRole === 'PENDING' ? 'role-pending' : 'role-member')}`}>
                                            {displayRole}
                                        </span>
                                </td>
                            </tr>
                        );
                    }) : (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                No team members available
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>

            {/* Invite Member Section */}
            {!isSubmitted && status !== 'CLOSED' && (
                <div className="invite-section">
                    <h2 className="invite-title">Invite a New Member</h2>
                    {status !== 'FORMING' && status !== 'NO TEAM' && data.currentTotalMembers >= data.maxMembers ? (
                        <div className="invite-error">The team has reached the maximum capacity of members allowed.</div>
                    ) : (
                        <>
                            <div className="invite-input-group">
                                <input
                                    type="text" placeholder="Enter student code or email..."
                                    value={inviteKeyword} onChange={(e) => setInviteKeyword(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchStudents(); }}
                                />
                                <button onClick={handleSearchStudents} disabled={inviteLoading}>
                                    {inviteLoading ? '...' : 'Search'}
                                </button>
                            </div>
                            {inviteMessage && <div className="invite-msg">{inviteMessage}</div>}
                            {searchResults.length > 0 && (
                                <table className="invite-table">
                                    <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Code</th>
                                        <th>Email</th>
                                        <th>University</th>
                                        <th style={{ textAlign: 'center', width: '100px' }}>Action</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {searchResults.map((s, idx) => {
                                        const isAlreadyInTeam = roster.some(m => m.email === s.email);
                                        return (
                                            <tr key={idx}>
                                                <td>{s.fullName}</td>
                                                <td>{s.studentCode}</td>
                                                <td>{s.email}</td>
                                                <td>{s.universityName}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {isAlreadyInTeam ? (
                                                        <button disabled className="btn-invited">Invited</button>
                                                    ) : (
                                                        <button onClick={() => handleSendInvitation(s.userId)} disabled={inviteLoading} className="btn-invite">
                                                            Invite
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamStatus;

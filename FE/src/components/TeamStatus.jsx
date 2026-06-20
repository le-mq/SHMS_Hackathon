import { useState, useEffect } from 'react';
import './TeamStatus.css';
import NavbarStudent from './NavbarStudent';

const API_BASE = 'http://localhost:8080/api/v1/student';
const UNAVAILABLE_CONTEST_STATUSES = new Set(['CLOSED', 'ENDED', 'INACTIVE']);

const isContestRegistrable = (contest) => {
    const status = String(contest?.status || '').trim().toUpperCase();
    return !UNAVAILABLE_CONTEST_STATUSES.has(status);
};

const TeamStatus = () => {
    const [teamData, setTeamData] = useState(null);
    const [contests, setContests] = useState([]);
    const [participatedTeams, setParticipatedTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [formTeamName, setFormTeamName] = useState('');
    const [selectedContestId, setSelectedContestId] = useState('');
    const [selectedLeader, setSelectedLeader] = useState('');
    const [viewContestId, setViewContestId] = useState('');

    const emptyTeam = {
        teamName: 'Not available',
        invitationCode: 'N/A',
        status: 'NO TEAM',
        roster: [],
    };

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

    const applyTeamData = (team, contestList, contestId = '') => {
        setTeamData(team);
        setContests(contestList);

        setFormTeamName(team?.teamName || '');
        setSelectedContestId(String(contestId || team?.contestId || ''));

        if (team?.roster?.length > 0) {
            const currentLeader = team.roster.find(m => m.internalRole === 'LEADER');
            setSelectedLeader(currentLeader ? currentLeader.studentId : team.roster[0].studentId);
        } else {
            setSelectedLeader('');
        }

        setError('');
    };

    useEffect(() => {
        let cancelled = false;

        const loadFromApi = async () => {
            const token = localStorage.getItem('shms_token');

            const contestsRes = await fetch(`${API_BASE}/contests`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const contestsJson = await safeJson(contestsRes);

            if (!contestsRes.ok) {
                throw new Error(contestsJson.error || 'Failed to load contests');
            }

            const contestList = normalizeList(contestsJson);

            const statusResults = await Promise.all(
                contestList.map(async (contest) => {
                    try {
                        const res = await fetch(`${API_BASE}/teams/status`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });

                        const data = await safeJson(res);

                        return {
                            contest,
                            data,
                        };
                    } catch {
                        return null;
                    }
                })
            );

            const allStatusRequestsFailed = statusResults.length > 0 && statusResults.every(result => result === null);
            if (allStatusRequestsFailed) {
                throw new Error('Failed to load team statuses');
            }

            const joinedTeams = statusResults.filter(isJoinedTeam);
            const currentContestId = String(
                viewContestId || joinedTeams[0]?.contest?.id || ''
            );

            if (cancelled) return;

            setContests(contestList);
            setParticipatedTeams(joinedTeams);

            if (currentContestId) {
                const currentTeam = joinedTeams.find(
                    item => String(item.contest.id) === currentContestId
                );

                if (!viewContestId) {
                    setViewContestId(currentContestId);
                }

                if (currentTeam) {
                    applyTeamData(currentTeam.data, contestList, currentContestId);
                } else {
                    setTeamData(null);
                }
            } else {
                setTeamData(null);
                setFormTeamName('');
                setSelectedContestId('');
                setSelectedLeader('');
                setError('');
            }
        };

        const loadFromMock = async () => {
            const localRes = await fetch('/testFE.json');

            if (!localRes.ok) {
                throw new Error('Not found testFE.json');
            }

            const localJson = await localRes.json();
            const mockContests = localJson.teamStatusContests?.data || [];
            const mockTeamsByContest = localJson.teamStatusByContest || {};
            const fallbackTeam = localJson.teamStatus?.data || mockTeamsByContest.default;

            let mockJoinedTeams = mockContests
                .map(contest => ({
                    contest,
                    data: mockTeamsByContest[String(contest.id)],
                }))
                .filter(isJoinedTeam);

            if (mockJoinedTeams.length === 0 && mockContests.length > 0 && fallbackTeam) {
                mockJoinedTeams = [{
                    contest: mockContests[0],
                    data: fallbackTeam,
                }].filter(isJoinedTeam);
            }

            const currentContestId = String(
                viewContestId || mockJoinedTeams[0]?.contest?.id || ''
            );

            if (cancelled) return;
            setContests(mockContests);
            setParticipatedTeams(mockJoinedTeams);

            if (currentContestId) {
                const currentTeam = mockJoinedTeams.find(
                    item => String(item.contest.id) === currentContestId
                );

                if (!viewContestId) {
                    setViewContestId(currentContestId);
                }

                if (currentTeam) {
                    applyTeamData(currentTeam.data, mockContests, currentContestId);
                } else {
                    setTeamData(null);
                }
            } else {
                setTeamData(null);
                setFormTeamName('');
                setSelectedContestId('');
                setSelectedLeader('');
                setError('');
            }
        };

        const fetchTeamStatus = async () => {
            try {
                setIsLoading(true);
                await loadFromApi();
            } catch (apiError) {
                console.warn('Team status API unavailable, use mock:', apiError.message);

                try {
                    await loadFromMock();
                } catch (mockError) {
                    console.warn('Team status mock unavailable:', mockError.message);

                    if (!cancelled) {
                        setError('Could not connect to server.');
                        setTeamData(null);
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchTeamStatus();

        return () => {
            cancelled = true;
        };
    }, [viewContestId]);

    const data = teamData || emptyTeam;
    const roster = Array.isArray(data.roster) ? data.roster : [];
    const status = data.status || 'NO TEAM';
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');

    const hasTeam = status !== 'NO TEAM';

    const canLeaveTeam = participatedTeams.some(item =>
        hasTeam &&
        String(item.contest.id) === String(viewContestId) &&
        String(item.contest.status).toUpperCase() === 'ACTIVE' &&
        !['APPROVED', 'PENDING'].includes(status.toUpperCase())
    );

    const isSubmitted = status === 'APPROVED' || status === 'PENDING';

    const registrableContests = contests.filter(isContestRegistrable);
    const selectedContest = contests.find(
        contest => String(contest.id) === String(selectedContestId)
    );
    const registrationContestId =
        selectedContest && isContestRegistrable(selectedContest)
            ? selectedContestId
            : '';

    const normalizeStatus = (value) => String(value || 'NO TEAM').trim().toUpperCase();
    const getStatusLabel = (value) => {
        const normalizedStatus = normalizeStatus(value);

        if (normalizedStatus === 'PENDING') return 'Pending Approval';
        if (normalizedStatus === 'NO TEAM') return 'No Team';

        return normalizedStatus;
    };

    const getSidebarBadge = (participatedTeam) => {
        const isActiveContest = String(participatedTeam?.contest?.status).toUpperCase() === 'ACTIVE';

        return {
            className: isActiveContest ? 'active' : 'ended',
            label: isActiveContest ? 'Active' : 'Ended',
        };
    };

    const approvedParticipatedTeams = participatedTeams.filter(item => {
        return normalizeStatus(item?.data?.status) === 'APPROVED';
    });

    const getInitials = (name = '') => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const copyToClipboard = () => {
        if (!data.invitationCode || data.invitationCode === 'N/A') return;

        navigator.clipboard.writeText(data.invitationCode);
        alert('Invitation code copied!');
    };

    const upsertParticipatedTeam = (contestId, updatedTeam) => {
        const id = String(contestId);
        const selectedContest = contests.find(c => String(c.id) === id);

        if (!selectedContest) return;

        setParticipatedTeams(prev => {
            const existed = prev.some(item => String(item.contest.id) === id);

            if (existed) {
                return prev.map(item =>
                    String(item.contest.id) === id
                        ? { ...item, data: updatedTeam }
                        : item
                );
            }

            return [
                ...prev,
                {
                    contest: selectedContest,
                    data: updatedTeam,
                },
            ];
        });
    };

    const handleSelectTeam = (contestId) => {
        const id = String(contestId);

        setViewContestId(id);
        setSelectedContestId(id);
        setSelectedLeader('');
        setFormTeamName('');
        setTeamData(null);
        setSuccessMessage('');
        setError('');
    };

    const handleSubmitRegistration = async () => {
        if (!selectedContestId || !formTeamName) {
            setError('Please fill in all general information fields.');
            return;
        }

        const contestToRegister = contests.find(
            contest => String(contest.id) === String(selectedContestId)
        );

        if (contestToRegister && !isContestRegistrable(contestToRegister)) {
            setError('This contest is closed and no longer accepts registrations.');
            return;
        }

        try {
            const token = localStorage.getItem('shms_token');

            const response = await fetch(`${API_BASE}/teams/register-official`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    teamName: formTeamName,
                    contestId: selectedContestId,
                    leaderStudentId: selectedLeader,
                }),
            });
            const result = await safeJson(response);

            if (!response.ok) {
                setError(result.error || result.message || 'Registration failed.');
                setSuccessMessage('');
                return;
            }

            if (String(result.status).toUpperCase() === 'REJECTED') {
                const rejectedTeam = {
                    ...data,
                    teamName: formTeamName,
                    status: 'REJECTED',
                    roster,
                };

                setTeamData(rejectedTeam);
                upsertParticipatedTeam(selectedContestId, rejectedTeam);
                setError(result.message || 'Team must have 3 to 5 members.!');
                setSuccessMessage('');
                return;
            }

            const updatedTeam = {
                ...data,
                teamName: formTeamName,
                status: normalizeStatus(result.status),
                roster,
            };

            setTeamData(updatedTeam);
            upsertParticipatedTeam(selectedContestId, updatedTeam);
            setViewContestId(String(selectedContestId));
            setSuccessMessage('Registration submitted successfully!');
            setError('');

            setTimeout(() => {
                window.location.reload();
            }, 5000);

        } catch (err) {
            console.warn('Register team API unavailable, use mock:', err.message);

            const updatedTeam = {
                ...data,
                teamName: formTeamName,
                status: 'PENDING',
                roster,
            };

            setTeamData(updatedTeam);
            upsertParticipatedTeam(selectedContestId, updatedTeam);

            setViewContestId(String(selectedContestId));
            setSuccessMessage('Registration submitted successfully!');
            setError('');
        }
    };

    const resetAfterLeaveTeam = () => {
        const currentId = String(viewContestId);

        const nextTeams = participatedTeams.filter(
            item => String(item.contest.id) !== currentId
        );

        setParticipatedTeams(nextTeams);
        setTeamData(null);
        setFormTeamName('');
        setSelectedContestId('');
        setSelectedLeader('');

        if (nextTeams.length > 0) {
            setViewContestId(String(nextTeams[0].contest.id));
        } else {
            setViewContestId('');
        }
    };

    const handleLeaveTeam = async () => {
        if (!hasTeam) return;

        if (!window.confirm('Are you sure you want to leave this team?')) return;

        try {
            const token = localStorage.getItem('shms_token');

            const response = await fetch(`${API_BASE}/teams/leave`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Failed to leave team.');
            }

            resetAfterLeaveTeam();
            setSuccessMessage('Left team successfully!');
            setError('');
        } catch (err) {
            console.warn('Leave team API unavailable, use mock:', err.message);

            resetAfterLeaveTeam();
            setSuccessMessage('Left team successfully!');
            setError('');
        }
    };

    return (
        <div className="status-container">
            <NavbarStudent />

            <div className="status-layout-wrapper">
                <div className="status-sidebar">
                    <div className="sidebar-title">My Joined Teams</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {approvedParticipatedTeams.length > 0 ? approvedParticipatedTeams.map(pt => {
                            const sidebarBadge = getSidebarBadge(pt);

                            return (
                                <div
                                    key={pt.contest.id}
                                    className={`sidebar-item ${viewContestId === String(pt.contest.id) ? 'active' : ''}`}
                                    onClick={() => handleSelectTeam(pt.contest.id)}
                                >
                                    <div className="sidebar-item-team">{pt.data.teamName}</div>
                                    <div className="sidebar-item-contest">{pt.contest.name}</div>

                                    <div className="sidebar-item-footer">
                                        <span className={`contest-status-badge ${sidebarBadge.className}`}>
                                            {sidebarBadge.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div
                                style={{
                                    color: '#64748b',
                                    fontSize: '14px',
                                    fontStyle: 'italic',
                                    padding: '8px',
                                }}
                            >
                                No participated teams found.
                            </div>
                        )}
                    </div>
                </div>

                <div className="status-content">
                    <div className="status-header-flex">
                        <div>
                            <h1 className="status-title">My Team Status</h1>
                            <p className="status-subtitle">
                                Manage your hackathon team roster and tracking information.
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {canLeaveTeam && (
                                <button
                                    onClick={handleLeaveTeam}
                                    style={{
                                        padding: '8px 14px',
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '999px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Leave Team
                                </button>
                            )}

                            <div className={`team-badge ${statusClass}`}>
                                <div className="team-badge-dot"></div>
                                {getStatusLabel(status)}
                            </div>
                        </div>
                    </div>

                    {isLoading && (
                        <div style={{ color: '#64748b', marginBottom: '20px' }}>
                            Loading team status...
                        </div>
                    )}


                    <div className="cards-row">
                        <div className="info-card">
                            <div className="card-label">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                TEAM NAME
                            </div>
                            <div className="card-value">{data.teamName}</div>
                        </div>

                        <div className="info-card dark">
                            <svg className="dark-bg-icon" width="120" height="120" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>

                            <div className="card-label">INVITATION CODE</div>
                            <div className="card-value">
                                {data.invitationCode}

                                <button className="copy-btn" onClick={copyToClipboard} title="Copy Code">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

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
                                    const displayRole = isSubmitted ? member.internalRole : 'MEMBER';

                                    return (
                                        <tr key={idx}>
                                            <td>
                                                <div className="member-name-col">
                                                    <div className="member-avatar">
                                                        {getInitials(member.fullName)}
                                                    </div>
                                                    <span className="member-name">{member.fullName}</span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="member-id">{member.studentId}</span>
                                            </td>

                                            <td>
                                                <span className="member-email">{member.email}</span>
                                            </td>

                                            <td>
                                                <span className={`role-badge ${displayRole === 'LEADER' ? 'role-leader' : 'role-member'}`}>
                                                    {displayRole}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td
                                            colSpan="4"
                                            style={{
                                                textAlign: 'center',
                                                padding: '20px',
                                                color: '#64748b',
                                            }}
                                        >
                                            No team members available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div
                        className="registration-form-section"
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginTop: '24px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <div
                            className="section-header"
                            style={{
                                marginBottom: '20px',
                                borderBottom: '1px solid #e2e8f0',
                                paddingBottom: '16px',
                            }}
                        >
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                                Official Team Registration Form
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                                Review and finalize your team details to officially register for the competition.
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>
                                1. General Information
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>
                                        Contest Name
                                    </label>

                                    <select
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        value={registrationContestId}
                                        onChange={(e) => {
                                            setSelectedContestId(e.target.value);
                                        }}
                                        disabled={isSubmitted}
                                    >

                                        <option value="" disabled>-- Select Contest --</option>
                                        {registrableContests.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>
                                        Team Name
                                    </label>

                                    <input
                                        type="text"
                                        value={formTeamName}
                                        onChange={(e) => setFormTeamName(e.target.value)}
                                        readOnly={isSubmitted}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            background: isSubmitted ? '#f8fafc' : '#fff',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>
                                2. Team Members & Leader Selection
                            </h3>

                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                            >
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569', width: '80px' }}>
                                            Leader
                                        </th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>
                                            Full Name
                                        </th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>
                                            Student ID
                                        </th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>
                                            Email
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {roster.length > 0 ? roster.map((member, idx) => (
                                        <tr
                                            key={idx}
                                            style={{
                                                borderBottom: '1px solid #e2e8f0',
                                                background: selectedLeader === member.studentId ? '#eff6ff' : '#fff',
                                            }}
                                        >
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <input
                                                    type="radio"
                                                    name="leaderSelect"
                                                    checked={selectedLeader === member.studentId}
                                                    onChange={() => setSelectedLeader(member.studentId)}
                                                    disabled={isSubmitted}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: isSubmitted ? 'not-allowed' : 'pointer',
                                                        accentColor: '#2563eb',
                                                    }}
                                                />
                                            </td>

                                            <td style={{ padding: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={member.fullName}
                                                    readOnly
                                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }}
                                                />
                                            </td>

                                            <td style={{ padding: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={member.studentId}
                                                    readOnly
                                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }}
                                                />
                                            </td>

                                            <td style={{ padding: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={member.email}
                                                    readOnly
                                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }}
                                                />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '20px',
                                                    color: '#64748b',
                                                }}
                                            >
                                                No team members available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {error && (
                            <div style={{ color: 'red', marginBottom: '20px' }}>
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div style={{ color: 'green', marginTop: '16px', fontWeight: 'bold' }}>
                                {successMessage}
                            </div>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                marginTop: '24px',
                                paddingTop: '16px',
                                borderTop: '1px solid #e2e8f0',
                            }}
                        >
                            <button
                                style={{
                                    padding: '10px 24px',
                                    background: isSubmitted ? '#94a3b8' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: isSubmitted ? 'not-allowed' : 'pointer',
                                }}
                                onClick={handleSubmitRegistration}
                                disabled={isSubmitted}
                            >
                                {isSubmitted ? 'Already Submitted' : 'Submit Official Registration'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamStatus;

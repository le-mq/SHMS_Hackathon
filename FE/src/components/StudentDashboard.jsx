import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';
import LatestAnnouncements from './LatestAnnouncements';

const API_PUBLIC = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/public";
const API_STUDENT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student";

function getContestList(json) {
    if (Array.isArray(json)) {
        return json;
    }
    if (Array.isArray(json?.contests)) {
        return json.contests;
    }
    if (Array.isArray(json?.contests?.data)) {
        return json.contests.data;
    }
    return [];
}

function mergeAllowedContestDetails(allowedContests, detailedContests) {
    const detailById = new Map(
        detailedContests.map(contest => [String(contest.id), contest])
    );

    return allowedContests.map(contest => ({
        ...(detailById.get(String(contest.id)) || {}),
        ...contest,
    }));
}

function pickActiveContest(contests) {
    return contests.find(c => c.status === 'ACTIVED')
        || contests.find(c => c.status === 'UPCOMING')
        || contests[0]
        || null;
}

function formatDateOnly(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return 'N/A';
    if (dateStr.length <= 10) return formatDateOnly(dateStr);
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getMilestoneStatus(dateStr) {
    if (!dateStr) {
        return <span className="mc-status ms-upcoming">Upcoming</span>;
    }

    return new Date() > new Date(dateStr)
        ? <span className="mc-status ms-completed">Completed</span>
        : <span className="mc-status ms-upcoming">Upcoming</span>;
}

async function copyToClipboard(text) {
    if (!text) return false;

    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Fall through to the textarea fallback for browsers that block Clipboard API.
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        return document.execCommand('copy');
    } finally {
        document.body.removeChild(textArea);
    }
}

async function hasExistingTeam(token) {
    try {
        const response = await axios.get(
            API_STUDENT + '/teams/status',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const status = String(response.data?.status || '').toUpperCase();
        return response.data && !response.data.error && ['FORMING', 'PENDING', 'APPROVED'].includes(status);
    } catch (error) {
        if (error.response?.status === 400) {
            return false;
        }

        throw error;
    }
}

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [activeContest, setActiveContest] = useState(null);
    const [activeContests, setActiveContests] = useState([]);
    const [loadingContest, setLoadingContest] = useState(true);
    const [joinCode, setJoinCode] = useState('');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [createError, setCreateError] = useState('');

    const [isCreating, setIsCreating] = useState(false);
    const [pendingInvitations, setPendingInvitations] = useState([]);

    const selectedContestId = activeContest?.id != null ? String(activeContest.id) : '';

    useEffect(() => {
        let cancelled = false;

        async function fetchHomeData() {
            try {
                const token = localStorage.getItem('shms_token');
                const allowedRes = await axios.get(
                    API_STUDENT + '/contests',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                const allowedContests = getContestList(allowedRes.data);

                let detailedContests = [];
                try {
                    const res = await axios.get(API_PUBLIC + '/home');
                    detailedContests = getContestList(res.data);
                } catch (homeError) {
                    console.warn('Home API unavailable, use student contests only:', homeError.message);
                }

                const contests = mergeAllowedContestDetails(
                    allowedContests,
                    detailedContests
                );
                const activeList = contests.filter(c => c.status === 'ACTIVED' || c.status === 'UPCOMING');
                const active = null;

                if (!cancelled) {
                    setActiveContest(active);
                    setActiveContests(activeList);
                }

            } catch (error) {
                console.warn('Home API unavailable, use mock:', error.message);

                try {
                    const localRes = await fetch('/testFE.json');

                    if (!localRes.ok) {
                        throw new Error('Not found testFE.json', { cause: error });
                    }

                    const localJson = await localRes.json();
                    const contests = getContestList(localJson);
                    const activeList = contests.filter(c => c.status === 'ACTIVED' || c.status === 'UPCOMING');
                    const active = null;

                    if (!cancelled) {
                        setActiveContest(active);
                        setActiveContests(activeList);
                    }
                } catch (localError) {
                    console.warn('Mock data unavailable:', localError.message);

                    if (!cancelled) {
                        setActiveContest(null);
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoadingContest(false);
                }
            }
        }

        fetchHomeData();

        const fetchPendingInvitations = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student/teams/invitations/pending", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const json = await res.json();
                    if (!cancelled) setPendingInvitations(Array.isArray(json) ? json : []);
                }
            } catch { }
        };

        fetchPendingInvitations();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleJoinTeam = async () => {
        const code = joinCode.trim();
        if (!code) return;
        await handleRespondInvitation(code, 'ACCEPT');
    };

    const handleRespondInvitation = async (invitationToken, action) => {
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student/teams/invitations/respond", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ invitationToken, action })
            });
            const json = await res.json();
            if (res.ok) {
                alert(json.message || `Invitation ${action.toLowerCase()}ed.`);
                window.location.reload();
            } else {
                alert(json.error || 'Failed to respond to invitation');
            }
        } catch { alert('Could not connect to server.'); }
    };

    const handleCreateTeam = async () => {
        const teamName = newTeamName.trim();

        if (!teamName) {
            setCreateError('Please enter a team name');
            return;
        }

        setIsCreating(true);
        setCreateError('');

        try {
            const token = localStorage.getItem('shms_token');

            if (await hasExistingTeam(token)) {
                setCreateError('You have already created a team!');
                return;
            }

            const res = await axios.post(
                API_STUDENT + '/teams/create',
                { teamName: teamName, categoryId: 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert('Team created successfully!');
            setShowCreateModal(false);
            navigate('/student/team/status');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="student-dash-container" style={{ paddingTop: '40px' }}>
            <div className="dash-grid">
                <div className="dash-left" style={{ gridColumn: '1 / 2' }}>
                    <div className="dashboard-announcements-row">
                        <LatestAnnouncements />
                    </div>
                </div>

                <div className="dash-left" style={{ gridColumn: '1 / 2' }}>
                    <div className="dash-cards-row">
                        {loadingContest ? (
                            <div className="info-card">
                                <div className="ic-header">ACTIVED CONTEST</div>
                                <div className="ic-title">Loading...</div>
                            </div>
                        ) : activeContests.length > 0 ? (
                            activeContests.map(contest => (
                                <div
                                    className={`info-card contest-card ${selectedContestId === String(contest.id) ? 'selected' : ''}`}
                                    key={contest.id}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={selectedContestId === String(contest.id)}
                                    onClick={() => setActiveContest(contest)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setActiveContest(contest);
                                        }
                                    }}
                                >
                                    <div className="ic-header">
                                        {contest.status} CONTEST
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                            />
                                        </svg>
                                    </div>

                                    <div className="ic-title">
                                        {contest.name}
                                    </div>

                                    <div className="ic-subtitle">
                                        <span style={{ width: 8, height: 8, background: contest.status === 'ACTIVED' ? '#16a34a' : '#94a3b8', borderRadius: '50%' }}></span>
                                        <span style={{ color: contest.status === 'ACTIVED' ? '#16a34a' : '#475569', fontWeight: '700' }}>
                                            {contest.status}
                                        </span>
                                    </div>

                                    <div className="progress-bar-bg">
                                        <div className="progress-bar-fill"></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="info-card">
                                <div className="ic-header">CONTESTS</div>
                                <div className="ic-title">No actived or upcoming contest</div>
                                <div className="ic-subtitle">
                                    No actived or upcoming contests found.
                                </div>
                            </div>
                        )}
                    </div>

                    {activeContest && (
                        <div className="milestones-card">
                            <div className="mc-header">
                                Milestones
                                {activeContest?.name ? <span>{activeContest.name}</span> : null}
                            </div>
                            <table className="mc-table">
                                <thead>
                                <tr>
                                    <th>Milestone</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td><strong>Registration Open</strong></td>
                                    <td>{formatDateOnly(activeContest?.registrationStart)}</td>
                                    <td>{getMilestoneStatus(activeContest?.registrationStart)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Registration Deadline</strong></td>
                                    <td>{formatDateOnly(activeContest?.registrationEnd)}</td>
                                    <td>{getMilestoneStatus(activeContest?.registrationEnd)}</td>
                                </tr>
                                <tr>
                                    <td><strong>Contest Start</strong></td>
                                    <td>{formatDateTime(activeContest?.contestStartAt || activeContest?.startDate)}</td>
                                    <td>{getMilestoneStatus(activeContest?.contestStartAt || activeContest?.startDate)}</td>
                                </tr>
                                {activeContest?.rounds?.map((round, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr>
                                            <td style={{ paddingLeft: '24px' }}><strong>{round.phaseName || round.name} - Open</strong></td>
                                            <td>{formatDateTime(round.submissionOpen || round.startDate)}</td>
                                            <td>{getMilestoneStatus(round.submissionOpen || round.startDate)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '24px' }}><strong>{round.phaseName || round.name} - Deadline</strong></td>
                                            <td>{formatDateTime(round.submissionDeadline || round.endDate)}</td>
                                            <td>{getMilestoneStatus(round.submissionDeadline || round.endDate)}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ paddingLeft: '24px' }}><strong>{round.phaseName || round.name} - Results</strong></td>
                                            <td>{formatDateTime(round.publishResultAt || round.resultPublishAt)}</td>
                                            <td>{getMilestoneStatus(round.publishResultAt || round.resultPublishAt)}</td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                                <tr>
                                    <td><strong>Contest End</strong></td>
                                    <td>{formatDateTime(activeContest?.contestEndAt || activeContest?.endDate)}</td>
                                    <td>{getMilestoneStatus(activeContest?.contestEndAt || activeContest?.endDate)}</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="dash-right" style={{ gridColumn: '2 / 3', gridRow: '2 / 3' }}>
                    <div className="join-card join-card-highlighted">
                        <div style={{ marginBottom: 24 }}>
                            <svg width="24" height="24" fill="none" stroke="#2563eb" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </div>
                        <h3 className="section-header">Join Team</h3>

                        <div className="join-input-wrap">
                            <input
                                type="text"
                                placeholder="Enter Invite Code ->"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinTeam()}
                            />
                            <button onClick={handleJoinTeam} className="join-btn">Join</button>
                        </div>
                    </div>

                    {/* Pending Invitations Inbox */}
                    {pendingInvitations.length > 0 && (
                        <div style={{ background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '12px', padding: '20px' }}>
                            <h2 className="section-header" style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '12px' }}>
                                Pending Team Invitations ({pendingInvitations.length})
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {pendingInvitations.map((inv, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '12px 16px' }}>
                                        <div>
                                            <div style={{ fontWeight: '700', color: '#111827' }}>
                                                {inv.inviterName || 'A team member'} has invited you to join the team {inv.teamName}.
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
                                                Check your email for the Invite code.
                                            </div>
                                        </div>
                                        <div>
                                            <button onClick={() => handleRespondInvitation(inv.invitationToken, 'REJECT')} style={{ padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s' }}>Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="create-team-card">
                        <svg className="action-icon-bg" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                        <div style={{ marginBottom: 24 }}>
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <h3 className="section-header" style={{ color: 'white' }}>Create a New Team</h3>

                        <a href="#" className="create-team-link" onClick={(e) => { e.preventDefault(); setShowCreateModal(true); setNewTeamName(''); setCreateError(''); }}>
                            Start Building
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </a>
                    </div>
                </div>
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '8px', color: '#0f172a' }}>Initialize New Team</h2>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>Set up your collective identity for the competition.</p>

                        {createError && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 'bold' }}>{createError}</div>}

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Team Name</label>
                            <input
                                type="text"
                                placeholder="Enter your creative team name"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTeam}
                                disabled={isCreating}
                                style={{ padding: '10px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                {isCreating ? 'Creating...' : 'Create Team'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;

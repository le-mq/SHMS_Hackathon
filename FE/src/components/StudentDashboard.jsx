import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';
import './CompetitionRegistration.css';
import LatestAnnouncements from './LatestAnnouncements';
import ContestDetailModal from './ContestDetailModal';

const API_PUBLIC = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/public";
const API_STUDENT = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/student";

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

function calculateProgress(contest) {
    if (contest.status === 'UPCOMING') return 0;

    let milestones = [];
    if (contest.registrationStart) milestones.push(new Date(contest.registrationStart).getTime());
    if (contest.registrationEnd) milestones.push(new Date(contest.registrationEnd).getTime());

    const startObj = contest.contestStartAt || contest.startDate;
    if (startObj) milestones.push(new Date(startObj).getTime());

    if (contest.rounds && contest.rounds.length > 0) {
        contest.rounds.forEach(r => {
            const rOpen = r.submissionOpen || r.startDate;
            if (rOpen) milestones.push(new Date(rOpen).getTime());

            const rDead = r.submissionDeadline || r.endDate;
            if (rDead) milestones.push(new Date(rDead).getTime());

            const rRes = r.publishResultAt || r.resultPublishAt;
            if (rRes) milestones.push(new Date(rRes).getTime());
        });
    }

    const endObj = contest.contestEndAt || contest.endDate;
    if (endObj) milestones.push(new Date(endObj).getTime());

    milestones = milestones.filter(m => !isNaN(m)).sort((a, b) => a - b);

    if (milestones.length < 2) {
        const cStart = contest.registrationStart || contest.contestStartAt || contest.startDate;
        const cEnd = contest.contestEndAt || contest.endDate;
        if (!cStart || !cEnd) return 0;
        const now = Date.now();
        const s = new Date(cStart).getTime();
        const e = new Date(cEnd).getTime();
        if (isNaN(s) || isNaN(e)) return 0;
        if (now <= s) return 0;
        if (now >= e) return 100;
        return Math.round(((now - s) / (e - s)) * 100);
    }

    const now = Date.now();
    if (now <= milestones[0]) return 0;
    if (now >= milestones[milestones.length - 1]) return 100;

    let currentIdx = 0;
    for (let i = 0; i < milestones.length - 1; i++) {
        if (now >= milestones[i] && now < milestones[i + 1]) {
            currentIdx = i;
            break;
        }
    }

    const segmentStart = milestones[currentIdx];
    const segmentEnd = milestones[currentIdx + 1];
    let segmentProgress = 0;

    if (segmentEnd > segmentStart) {
        segmentProgress = (now - segmentStart) / (segmentEnd - segmentStart);
    } else {
        segmentProgress = 1;
    }

    const totalProgress = ((currentIdx + segmentProgress) / (milestones.length - 1)) * 100;
    return Math.round(totalProgress);
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
            API_STUDENT + '/teams/all-forming',
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const teams = Array.isArray(response.data) ? response.data : [];
        return teams.some(t => String(t.status || '').toUpperCase() === 'FORMING');
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
    const [previewContest, setPreviewContest] = useState(null);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [createError, setCreateError] = useState('');

    const [isCreating, setIsCreating] = useState(false);
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);
    const [rejectToken, setRejectToken] = useState(null);

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
                const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/student/teams/invitations/pending", {
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
            const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/student/teams/invitations/respond", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ invitationToken, action })
            });
            const json = await res.json();
            if (res.ok) {
                alert(json.message || `Invitation ${action.toLowerCase()}ed.`);
                if (action === 'ACCEPT') {
                    navigate('/student/team/status');
                } else {
                    window.location.reload();
                }
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
                setCreateError('You already have a team in FORMING status.');
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
                    {/* Floating Explore Button */}
                    <div className="fab-animated" style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 999, borderRadius: '30px' }}>
                        <button
                            onClick={() => navigate('/')}
                            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', padding: '16px 28px', borderRadius: '30px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 8px 10px -6px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s', fontSize: '16px', letterSpacing: '0.5px' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(37, 99, 235, 0.4), 0 10px 10px -5px rgba(37, 99, 235, 0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 8px 10px -6px rgba(37, 99, 235, 0.2)'; }}
                        >
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            Explore Hackathons
                        </button>
                    </div>
                    <div className="dashboard-announcements-row">
                        <LatestAnnouncements />
                    </div>

                    <div className="dash-cards-row">
                        {loadingContest ? (
                            <div className="info-card">
                                <div className="ic-header">ACTIVED CONTEST</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0' }}>
                                    <div className="global-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', marginBottom: 0 }}></div>
                                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 'normal' }}>Loading...</span>
                                </div>
                            </div>
                        ) : activeContests.length > 0 ? (
                            activeContests.map(contest => (
                                <div
                                    className={`comp-card ${selectedContestId === String(contest.id) ? 'highlight' : ''}`}
                                    key={contest.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setActiveContest(contest)}
                                    style={{ cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <div className="comp-card-banner">
                                        <span className={`comp-badge badge-${(contest.status || '').toLowerCase()}`}>{contest.status}</span>
                                    </div>
                                    <div className="comp-card-content">
                                        <h3 className="comp-title">{contest.name}</h3>
                                        <p className="comp-desc">{contest.theme || contest.description || 'An exciting competition to showcase your coding skills.'}</p>
                                        <div className="comp-meta">
                                            <div className="meta-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                <span>Reg: {formatDateOnly(contest.registrationStart)} - {formatDateOnly(contest.registrationEnd)}</span>
                                            </div>
                                            <div className="meta-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span>Date: {formatDateOnly(contest.contestStartAt || contest.startDate)} - {formatDateOnly(contest.contestEndAt || contest.endDate)}</span>
                                            </div>
                                            <div className="meta-item">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                <span>Team Size: {contest.minTeamMembers || 3} - {contest.maxTeamMembers || 5}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="comp-card-actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                        <button
                                            className="btn-secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewContest(contest);
                                            }}
                                        >
                                            View Details
                                        </button>
                                        {(() => {
                                            const cat = String(contest.status || '').toUpperCase();
                                            let isRegistrationExpired = false;
                                            if (contest.registrationEnd) {
                                                const endDate = new Date(contest.registrationEnd);
                                                endDate.setHours(23, 59, 59, 999);
                                                isRegistrationExpired = endDate < new Date();
                                            }
                                            let isRegistrationNotStarted = false;
                                            if (contest.registrationStart) {
                                                const startDate = new Date(contest.registrationStart);
                                                isRegistrationNotStarted = startDate > new Date();
                                            }
                                            const canRegister = (cat === 'ACTIVED' || cat === 'UPCOMING') && !isRegistrationExpired && !isRegistrationNotStarted;

                                            return (
                                                <button
                                                    className="btn-primary"
                                                    disabled={!canRegister}
                                                    style={{ ...(!canRegister ? { backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: 'white', cursor: 'not-allowed' } : {}), display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (canRegister) navigate('/student/competitions?contestId=' + contest.id);
                                                    }}
                                                >
                                                    {isRegistrationExpired ? 'Registration Closed' : (isRegistrationNotStarted ? 'Not Started' : 'Register')}
                                                </button>
                                            );
                                        })()}
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

                <div className="dash-right">
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

                    {/* Pending Invitations Inbox */}
                    {pendingInvitations.length > 0 && (
                        <div style={{ background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '12px', padding: '20px', marginTop: '24px' }}>
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
                                            <div style={{ fontSize: '13px', color: '#d97706', marginTop: '4px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Check your email for the Invite code.
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '16px' }}>
                                            <button onClick={() => window.open('https://gmail.google.com', '_blank')} style={{ padding: '6px 12px', background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s', width: '100%', whiteSpace: 'nowrap' }}>Get Code</button>
                                            <button onClick={() => { setRejectToken(inv.invitationToken); setShowRejectConfirm(true); }} style={{ padding: '6px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', transition: 'all 0.2s', width: '100%' }}>Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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

            {/* Reject Confirmation Modal */}
            {showRejectConfirm && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '24px 32px 32px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>Reject Invitation</h3>
                            <button onClick={() => setShowRejectConfirm(false)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', lineHeight: '1' }}>&times;</button>
                        </div>
                        <p style={{ color: '#334155', fontSize: '1rem', marginBottom: '32px' }}>Are you sure you want to reject this invitation?</p>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                            <button
                                onClick={() => setShowRejectConfirm(false)}
                                style={{ flex: 1, padding: '12px 16px', background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectConfirm(false);
                                    if (rejectToken) {
                                        handleRespondInvitation(rejectToken, 'REJECT');
                                    }
                                }}
                                style={{ flex: 1, padding: '12px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {previewContest && (
                <ContestDetailModal contest={previewContest} onClose={() => setPreviewContest(null)} />
            )}
        </div>
    );
};

export default StudentDashboard;

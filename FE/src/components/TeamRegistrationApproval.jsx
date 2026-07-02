import { useState, useEffect } from 'react';
import axios from 'axios';
import './TeamRegistrationApproval.css';
import NavbarAdmin from './NavbarAdmin';
import LatestAnnouncements from './LatestAnnouncements';

const API_BASE = "http://localhost:8080/api/v1";

const TeamRegistrationApproval = () => {
    const [dashboardData, setDashboardData] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('REGISTRATION');
    
    const [rounds, setRounds] = useState([]);
    const [selectedRoundId, setSelectedRoundId] = useState('');
    const [roundProgress, setRoundProgress] = useState(null);
    const [submissionFilter, setSubmissionFilter] = useState('ALL');

    const [cancelModal, setCancelModal] = useState({
        isOpen: false,
        type: 'CANCEL',
        teamId: null,
        teamName: '',
        reason: ''
    });

    const [membersModal, setMembersModal] = useState({
        isOpen: false,
        teamName: '',
        members: []
    });

    useEffect(() => {
        let cancelled = false;
        async function fetchDashboardData() {
            try {
                const token = localStorage.getItem("shms_token");
                const response = await fetch(API_BASE + "/admin/contests/teams/dashboard-data",
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!response.ok)
                    throw new Error("HTTP " + response.status);
                const json = await response.json();
                const contestsData = Array.isArray(json) ? json : (json.contests || json.data || []);
                if (!cancelled) {
                    setDashboardData(contestsData);
                    if (contestsData.length > 0) {
                        setSelectedContestId(contestsData[0].id);
                    }
                }
            }
            catch (error) {
                console.warn("API unavailable, loading fallback mock...", error.message);
                try {
                    const localRes = await fetch("/testFE.json");
                    if (!localRes.ok)
                        throw new Error("Cannot load mock");
                    const localJson = await localRes.json();
                    const contestsData = localJson.teamRegistrationApproval?.contests || [];
                    if (!cancelled) {
                        setDashboardData(contestsData);
                        if (contestsData.length > 0) {
                            setSelectedContestId(contestsData[0].id);
                        }
                    }
                }
                catch (localError) {
                    setError("Cannot load mock data");
                    console.error(localError);
                }
            }
            finally {
                if (!cancelled)
                    setIsLoading(false);
            }
        }
        fetchDashboardData();
        return () => { cancelled = true; };
    }, []);

    const selectedContest = dashboardData.find(c => String(c.id) === String(selectedContestId));
    let filteredTeams = [];
    if (selectedContest && selectedContest.teams) {
        filteredTeams = selectedContest.teams.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    const [viewSubmissionModal, setViewSubmissionModal] = useState({ isOpen: false, team: null });

    const getAssetUrl = (url) => {
        const trimmedUrl = String(url || '').trim();
        if (!trimmedUrl) return '';

        if (/^https?:\/\//i.test(trimmedUrl)) {
            return trimmedUrl;
        }

        return `https://${trimmedUrl}`;
    };

    useEffect(() => {
        if (activeTab === 'SUBMISSIONS' && selectedContestId) {
            const fetchRounds = async () => {
                try {
                    const token = localStorage.getItem("shms_token");
                    const res = await fetch(`${API_BASE}/admin/contests/${selectedContestId}/rounds`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setRounds(data);
                        if (data.length > 0) setSelectedRoundId(data[0].roundId);
                    }
                } catch (e) {
                    console.error("Error fetching rounds:", e);
                }
            };
            fetchRounds();
        }
    }, [activeTab, selectedContestId]);

    useEffect(() => {
        if (activeTab === 'SUBMISSIONS' && selectedContestId && selectedRoundId) {
            const fetchProgress = async () => {
                try {
                    const token = localStorage.getItem("shms_token");
                    const res = await fetch(`${API_BASE}/admin/contests/${selectedContestId}/rounds/${selectedRoundId}/progress`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setRoundProgress(data);
                    } else {
                        setRoundProgress(null);
                    }
                } catch (e) {
                    console.error("Error fetching progress:", e);
                    setRoundProgress(null);
                }
            };
            fetchProgress();
        }
    }, [activeTab, selectedContestId, selectedRoundId]);

    let filteredSubmissions = [];
    if (roundProgress && roundProgress.teams) {
        filteredSubmissions = roundProgress.teams.filter(t => {
            const matchesSearch = t.teamName.toLowerCase().includes(searchQuery.toLowerCase());
            if (submissionFilter === 'SUBMITTED') {
                return matchesSearch && t.submissionState !== 'Not Submitted' && t.submissionState !== 'AUTO_ZERO';
            }
            if (submissionFilter === 'AWAITING') {
                return matchesSearch && t.submissionState === 'Not Submitted';
            }
            if (submissionFilter === 'NOT_SUBMITTED') {
                return matchesSearch && t.submissionState === 'AUTO_ZERO';
            }
            return matchesSearch;
        });
    }

    const handleOpenActionModal = (teamId, teamName, actionType) => {
        setCancelModal({
            isOpen: true,
            type: actionType,
            teamId,
            teamName,
            reason: ''
        });
    };

    const handleCloseCancelModal = () => {
        setCancelModal({ isOpen: false, type: 'CANCEL', teamId: null, teamName: '', reason: '' });
    };

    const handleConfirmCancelStatus = async () => {
        if (!cancelModal.reason.trim()) {
            alert(`Please enter the reason. ${cancelModal.type === 'CANCEL' ? 'Cancel' : 'Approve'} this team !`);
            return;
        }
        const isCancelAct = cancelModal.type === 'CANCEL';
        const confirmText = isCancelAct
            ? `Are you sure you want to CANCEL Team "${cancelModal.teamName}" ?`
            : `Are you sure you want to APPROVE Team "${cancelModal.teamName}" ?`;

        const confirmCheck = window.confirm(confirmText);
        if (!confirmCheck) return;

        try {
            const token = localStorage.getItem("shms_token");
            const targetStatus = isCancelAct ? "CANCELED" : "APPROVED";
            await axios.put(`${API_BASE}/admin/contests/teams/registration-status`, {
                teamId: Number(cancelModal.teamId),
                contestId: Number(selectedContestId),
                status: targetStatus,
                reason: cancelModal.reason.trim()
            }, { headers: { Authorization: `Bearer ${token}` } });

            const targetTeam = selectedContest?.teams?.find(t => t.id === cancelModal.teamId);
            const prevStatus = (targetTeam?.status || 'Active').toUpperCase();

            setDashboardData(prevData =>
                prevData.map(contest => {
                    if (Number(contest.id) === Number(selectedContestId)) {
                        let newPending = contest.pendingReview || 0;
                        let newApproved = contest.approved || 0;

                        if (isCancelAct) {
                            if (prevStatus === 'APPROVED') {
                                newApproved = Math.max(0, newApproved - 1);
                            } else if (prevStatus === 'PENDING' || prevStatus === 'PENDING_REVIEW') {
                                newPending = Math.max(0, newPending - 1);
                            }
                        } else {
                            newApproved = newApproved + 1;
                        }
                        return {
                            ...contest,
                            pendingReview: newPending,
                            approved: newApproved,
                            teams: contest.teams.map(team =>
                                Number(team.id) === Number(cancelModal.teamId)
                                    ? {
                                        ...team,
                                        status: isCancelAct ? 'Canceled' : 'Approved',
                                        track: isCancelAct ? 'Disqualified' : (team.track || 'Active')
                                    }
                                    : team
                            )
                        };
                    }
                    return contest;
                })
            );

            alert(`The ${cancelModal.teamName} team status update was successful.`);
            handleCloseCancelModal();

        } catch (err) {
            console.error("Error updating team status:", err);
            const serverMsg = err.response?.data?.message || err.message;
            alert(`Update failed! Error details: ${serverMsg}`);
        }
    };

    if (isLoading) return <div className="approval-container"><div style={{ padding: '40px' }}>Loading dashboard...</div></div>;
    if (error) return <div className="approval-container"><div style={{ padding: '40px', color: 'red' }}>{error}</div></div>;

    return (
        <div className="approval-container">
            <div className="approval-content">
                <LatestAnnouncements style={{ marginTop: '32px', width: '100%' }} />
                <div className="approval-header">
                    <div className="approval-title-area">
                        <h1 className="approval-title">Team Registration Approval Desk</h1>
                        <p className="approval-subtitle">Review and manage team applications for the Hackathon.</p>
                    </div>
                    <div className="approval-actions">
                        {dashboardData.length > 0 && (
                            <select
                                className="filter-btn"
                                value={selectedContestId || ''}
                                onChange={(e) => setSelectedContestId(e.target.value)}
                            >
                                {dashboardData.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                        <div className="search-box-approval">
                            <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
                    <div 
                        onClick={() => setActiveTab('REGISTRATION')}
                        style={{ padding: '12px 4px', cursor: 'pointer', fontWeight: 600, borderBottom: activeTab === 'REGISTRATION' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'REGISTRATION' ? '#1e40af' : '#64748b' }}
                    >
                        Registration Approval
                    </div>
                    <div 
                        onClick={() => setActiveTab('SUBMISSIONS')}
                        style={{ padding: '12px 4px', cursor: 'pointer', fontWeight: 600, borderBottom: activeTab === 'SUBMISSIONS' ? '2px solid #3b82f6' : '2px solid transparent', color: activeTab === 'SUBMISSIONS' ? '#1e40af' : '#64748b' }}
                    >
                        Submission Progress Tracker
                    </div>
                </div>

                {activeTab === 'REGISTRATION' && (
                    <>
                        <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">PENDING REVIEW</div>
                        <div className="stat-value">{selectedContest ? selectedContest.pendingReview : 0} Teams</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">APPROVED</div>
                        <div className="stat-value">{selectedContest ? selectedContest.approved : 0} Teams</div>
                    </div>
                    <div className="stat-card" >
                        <div className="stat-label" >REJECTED & CANCELED</div>
                        <div className="stat-value">
                            {filteredTeams.filter(t =>
                                t.status === 'Canceled' || t.status === 'Rejected' || (t.status || '').toLowerCase() === 'rejected'
                            ).length} Teams
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">TOTAL PARTICIPANTS</div>
                        <div className="stat-value">{selectedContest ? selectedContest.totalParticipants : 0} Students</div>
                    </div>
                </div>


                <div className="table-section">
                    <table className="teams-table">
                        <thead>
                            <tr>
                                <th>Team Name</th>
                                <th style={{ textAlign: 'right', paddingRight: '138px' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map(team => {
                                const statusText = (team.status || 'Active').toLowerCase();
                                const isCanceledOrRejected = statusText === 'cancelled' || statusText === 'rejected';

                                let badgeStyle = {padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '680', textTransform: 'uppercase', display: 'inline-block'};
                                if (statusText === 'approved') {
                                    badgeStyle.backgroundColor = '#dcfce7';
                                    badgeStyle.color = '#15803d';
                                } else if (isCanceledOrRejected) {
                                    badgeStyle.backgroundColor = '#fee2e2';
                                    badgeStyle.color = '#b91c1c';
                                } else {
                                    badgeStyle.backgroundColor = '#f1f5f9';
                                    badgeStyle.color = '#475569';
                                }

                                return (
                                    <tr key={team.id}>
                                        <td>
                                            <div className="team-name-col">
                                                <div className="team-avatar">{team.name.substring(0, 2).toUpperCase()}</div>
                                                <span className="team-name">{team.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>

                                                <span style={badgeStyle}>
                                                    {team.status || 'Active'}
                                                </span>

                                                {(statusText === 'approved' || isCanceledOrRejected) && (
                                                    <button onClick={() => setMembersModal({ isOpen: true, teamName: team.name, members: team.members || [] })}
                                                        style={{padding: '4px 10px', fontSize: '12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'}}
                                                        onMouseOver={(e) => e.target.style.backgroundColor = '#dbeafe'}
                                                        onMouseOut={(e) => e.target.style.backgroundColor = '#eff6ff'}
                                                    >
                                                        View Members
                                                    </button>
                                                )}

                                                {isCanceledOrRejected ? (

                                                    <button onClick={() => handleOpenActionModal(team.id, team.name, 'APPROVE')}
                                                        style={{padding: '4px 10px', fontSize: '12px', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'}}
                                                        onMouseOver={(e) => e.target.style.backgroundColor = '#bbf7d0'}
                                                        onMouseOut={(e) => e.target.style.backgroundColor = '#dcfce7'}
                                                    >
                                                        Approve
                                                    </button>
                                                ) : (

                                                    <button onClick={() => handleOpenActionModal(team.id, team.name, 'CANCEL')}
                                                        style={{padding: '4px 10px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'}}
                                                        onMouseOver={(e) => e.target.style.backgroundColor = '#fecaca'}
                                                        onMouseOut={(e) => e.target.style.backgroundColor = '#fee2e2'}
                                                    >
                                                        Cancel Team
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {filteredTeams.length === 0 && (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No teams found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>
                        Showing {filteredTeams.length} teams
                    </div>
                </div>
                </>
                )}

                {activeTab === 'SUBMISSIONS' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <select 
                                    value={selectedRoundId || ''}
                                    onChange={(e) => setSelectedRoundId(e.target.value)}
                                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                >
                                    {rounds.map(r => (
                                        <option key={r.roundId} value={r.roundId}>{r.roundName}</option>
                                    ))}
                                    {rounds.length === 0 && <option value="">No rounds found</option>}
                                </select>

                                {roundProgress && (
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <span style={{ padding: '6px 12px', background: roundProgress.roundStatus === 'OPEN' ? '#dcfce7' : '#f1f5f9', color: roundProgress.roundStatus === 'OPEN' ? '#16a34a' : '#475569', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                                            {roundProgress.roundStatus}
                                        </span>
                                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {roundProgress.roundStatus !== 'CLOSED' && (
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            )} {roundProgress.roundStatus !== 'CLOSED' ? roundProgress.timeRemaining : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={() => setSubmissionFilter('ALL')} style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #e2e8f0', background: submissionFilter === 'ALL' ? '#1e293b' : 'white', color: submissionFilter === 'ALL' ? 'white' : '#475569', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>All</button>
                                <button onClick={() => setSubmissionFilter('SUBMITTED')} style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #bbf7d0', background: submissionFilter === 'SUBMITTED' ? '#16a34a' : 'white', color: submissionFilter === 'SUBMITTED' ? 'white' : '#16a34a', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Submitted ({roundProgress?.submittedCount || 0})</button>
                                <button onClick={() => setSubmissionFilter('AWAITING')} style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #fef08a', background: submissionFilter === 'AWAITING' ? '#eab308' : 'white', color: submissionFilter === 'AWAITING' ? 'white' : '#eab308', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Awaiting Submission ({roundProgress?.awaitingCount || 0})</button>
                                <button onClick={() => setSubmissionFilter('NOT_SUBMITTED')} style={{ padding: '6px 16px', borderRadius: '20px', border: '1px solid #fecaca', background: submissionFilter === 'NOT_SUBMITTED' ? '#dc2626' : 'white', color: submissionFilter === 'NOT_SUBMITTED' ? 'white' : '#dc2626', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Not Submitted ({roundProgress?.notSubmittedCount || 0})</button>
                            </div>
                        </div>

                        <div className="table-section">
                            <table className="teams-table">
                                <thead>
                                    <tr>
                                        <th>Team Name</th>
                                        <th>Status</th>
                                        <th>Submitted At</th>
                                        <th style={{ textAlign: 'right', paddingRight: '24px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSubmissions.map(team => {
                                        const isAutoZero = team.submissionState === 'AUTO_ZERO';
                                        const isNotSubmitted = team.submissionState === 'Not Submitted';
                                        const isMissing = isAutoZero || isNotSubmitted;
                                        
                                        let displayText = team.submissionState;
                                        let bgColor = '#dcfce7';
                                        let textColor = '#15803d';

                                        if (isMissing) {
                                            if (roundProgress.roundStatus === 'CLOSED') {
                                                displayText = 'Not Submitted (0 pts)';
                                                bgColor = '#fee2e2';
                                                textColor = '#b91c1c';
                                            } else {
                                                displayText = 'Awaiting Submission';
                                                bgColor = '#fef3c7';
                                                textColor = '#b45309';
                                            }
                                        } else if (team.submissionState === 'OFFICIAL') {
                                            displayText = 'Submitted';
                                        } else if (team.submissionState === 'DRAFT') {
                                            displayText = 'Draft';
                                            bgColor = '#f1f5f9';
                                            textColor = '#475569';
                                        }

                                        return (
                                            <tr key={team.teamId}>
                                                <td>
                                                    <div className="team-name-col">
                                                        <div className="team-avatar">{team.teamName.substring(0, 2).toUpperCase()}</div>
                                                        <span className="team-name">{team.teamName}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: bgColor, color: textColor }}>
                                                        {displayText}
                                                    </span>
                                                </td>
                                                <td style={{ color: '#64748b', fontSize: '13px' }}>
                                                    {team.submittedAt || '--'}
                                                </td>
                                                <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                                                    <button 
                                                        style={{ padding: '6px 12px', fontSize: '13px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                                        onClick={() => setViewSubmissionModal({ isOpen: true, team })}
                                                    >
                                                        View Submission Form
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredSubmissions.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No submissions found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>
                                Showing {filteredSubmissions.length} submissions
                            </div>
                        </div>
                    </>
                )}

                {cancelModal.isOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.4)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{
                            background: 'white', padding: '24px', borderRadius: '12px',
                            width: '100%', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }}>
                            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px', color: '#0f172a' }}>
                                {cancelModal.type === 'CANCEL' ? 'Cancel Team Registration' : 'Re-approve Team Registration'}
                            </h3>
                            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                                {cancelModal.type === 'CANCEL'
                                    ? <>Please enter the reason for removing team <strong>{cancelModal.teamName}</strong> from this competition.</>
                                    : <>Please enter the reason for re-approving team <strong>{cancelModal.teamName}</strong> for this competition.</>
                                }
                            </p>

                            <textarea rows="4" value={cancelModal.reason}
                                onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                                placeholder={cancelModal.type === 'CANCEL' ? "Enter the reason for cancellation here..." : "Enter the reason for re-approval here..."}
                                style={{width: '100%', padding: '10px', borderRadius: '6px',
                                    border: '1px solid #cbd5e1', fontSize: '14px',
                                    boxSizing: 'border-box', resize: 'none', marginBottom: '20px'}}/>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={handleCloseCancelModal}
                                    style={{padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer'}}>
                                    Cancel
                                </button>
                                <button onClick={handleConfirmCancelStatus}
                                    style={{padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer'}}>
                                    Confirmation
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            {membersModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '600px', maxWidth: '90%' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#0f172a' }}>
                            Members of {membersModal.teamName}
                        </h3>
                        {membersModal.members && membersModal.members.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>NAME</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>STUDENT ID</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>UNIVERSITY</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ROLE</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {membersModal.members.map((m, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#0f172a', fontWeight: '500' }}>{m.name || 'N/A'}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>{m.studentId || 'N/A'}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>{m.university || 'N/A'}</td>
                                            <td style={{ padding: '12px', fontSize: '13px', color: '#475569' }}>{m.role || 'Member'}</td>
                                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                                {m.status === 'APPROVED' ? (
                                                    <span style={{ color: '#16a34a', fontWeight: '600' }}>APPROVED</span>
                                                ) : m.status === 'REJECTED' || m.status === 'CANCELED' ? (
                                                    <span style={{ color: '#dc2626', fontWeight: '600' }}>{m.status.toUpperCase()}</span>
                                                ) : (
                                                    <span style={{ color: '#ca8a04', fontWeight: '600' }}>{m.status ? m.status.toUpperCase() : 'PENDING'}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>No members found.</div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button
                                onClick={() => setMembersModal({ isOpen: false, teamName: '', members: [] })}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: 'white',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewSubmissionModal.isOpen && viewSubmissionModal.team && (() => {
                const team = viewSubmissionModal.team;
                const reqsStr = roundProgress?.submissionRequirements;
                const isRequired = (key) => !reqsStr || reqsStr === '[]' || reqsStr.includes(key);
                
                const getAssetLinkClass = (url) => url ? 'asset-valid' : 'asset-missing';
                
                const renderModalAssetLink = (url, label, iconPath) => {
                    const isValid = !!url;
                    return (
                        <a href={url ? getAssetUrl(url) : '#'} className={`asset-link ${getAssetLinkClass(url)}`}
                           target="_blank" rel="noreferrer"
                           onClick={e => !isValid && e.preventDefault()}
                           style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none', color: isValid ? '#1e293b' : '#94a3b8', marginBottom: '8px', alignItems: 'center' }}
                        >
                            <div className="asset-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                                <svg width="18" height="18" className="asset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                                </svg>{label}
                            </div>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    );
                };

                return (
                    <div className="modal-overlay">
                        <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                            <div className="modal-header">
                                <h3 className="modal-title">Project Deliverables: {team.teamName}</h3>
                            </div>
                            <div className="modal-body">
                                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                                    The following links are required for this round's submission. Missing links are marked in red.
                                </p>
                                
                                {isRequired('githubUrl') && renderModalAssetLink(team.repoUrl, 'GitHub Repository', 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4')}
                                {isRequired('demoUrl') && renderModalAssetLink(team.demoUrl, 'Live Demo', 'M13 10V3L4 14h7v7l9-11h-7z')}
                                {isRequired('documentUrl') && renderModalAssetLink(team.docUrl, 'Project Documentation', 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
                                {isRequired('slideUrl') && renderModalAssetLink(team.slideUrl, 'Presentation Slides', 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12')}
                            </div>
                            <div className="modal-footer">
                                <button 
                                    style={{ padding: '8px 16px', fontSize: '14px', background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                                    onClick={() => setViewSubmissionModal({ isOpen: false, team: null })}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default TeamRegistrationApproval;

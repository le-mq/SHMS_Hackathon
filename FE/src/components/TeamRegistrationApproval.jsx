import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './TeamRegistrationApproval.css';
import LatestAnnouncements from './LatestAnnouncements';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1");

const getDatabaseStatus = (c) => {
    if (!c) return 'ACTIVED';
    const s = c.status?.toUpperCase() || 'ACTIVED';
    if (s === 'CLOSED' || s === 'CANCELLED' || s === 'CANCELED') return 'CLOSED';
    if (s === 'UPCOMING') return 'UPCOMING';
    return 'ACTIVED';
};

const TeamRegistrationApproval = () => {
    const [dashboardData, setDashboardData] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState(() => sessionStorage.getItem('teamApprovalSelectedContest') || '');
    const [contestSearchQuery, setContestSearchQuery] = useState('');
    const [contestStatusFilter, setContestStatusFilter] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

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
        let canceled = false;
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
                if (!canceled) {
                    setDashboardData(contestsData);
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
                    if (!canceled) {
                        setDashboardData(contestsData);
                    }
                }
                catch (localError) {
                    setError("Cannot load mock data");
                    console.error(localError);
                }
            }
            finally {
                if (!canceled)
                    setIsLoading(false);
            }
        }
        fetchDashboardData();
        return () => { canceled = true; };
    }, []);

    const filteredContests = useMemo(() => {
        return dashboardData
            .filter(c => !contestSearchQuery || c.name?.toLowerCase().includes(contestSearchQuery.toLowerCase()))
            .filter(c => contestStatusFilter === 'ALL' || getDatabaseStatus(c) === contestStatusFilter)
            .sort((a, b) => {
                const aLiveStatus = getDatabaseStatus(a);
                const bLiveStatus = getDatabaseStatus(b);
                const aActive = (aLiveStatus === 'ACTIVED');
                const bActive = (bLiveStatus === 'ACTIVED');
                if (aActive && !bActive) return -1;
                if (!aActive && bActive) return 1;
                return Number(b.id) - Number(a.id);
            });
    }, [dashboardData, contestSearchQuery, contestStatusFilter]);

    const selectedContest = dashboardData.find(c => String(c.id) === String(selectedContestId));
    let filteredTeams = [];
    if (selectedContest && selectedContest.teams) {
        filteredTeams = selectedContest.teams.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    const allTeams = selectedContest?.teams || [];
    const approvedCount = allTeams.filter(t => (t.status || '').toUpperCase() === 'APPROVED').length;
    const canceledCount = allTeams.filter(t => (t.status || '').toUpperCase() === 'CANCELED').length;
    const closedCount = allTeams.filter(t => (t.status || '').toUpperCase() === 'CLOSED').length;
    const totalTeamsCount = allTeams.length;
    const pendingCount = Math.max(0, totalTeamsCount - approvedCount - canceledCount - closedCount);
    const totalParticipantsCount = allTeams
        .reduce(
            (sum, t) => sum + (Array.isArray(t.members) ? t.members.length : 0),
            0
        );

    const isContestClosed = getDatabaseStatus(selectedContest) === 'CLOSED';
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
            const prevStatus = (targetTeam?.status || 'ACTIVED').toUpperCase();

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
                                        status: isCancelAct ? 'CANCELED' : 'APPROVED',
                                        track: isCancelAct ? 'Disqualified' : (team.track || 'ACTIVED')
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

    if (isLoading) {
        return (
            <div className="approval-container">
                <div className="global-loading">
                    <div className="global-spinner"></div>
                    <span>Loading registration approvals...</span>
                </div>
            </div>
        );
    }
    if (error) return <div className="approval-container"><div style={{ padding: '40px', color: 'red' }}>{error}</div></div>;

    if (!selectedContestId) {
        return (
            <div className="approval-container">
                <div style={{ padding: '40px', maxWidth: 1800, margin: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h1 className="approval-title" style={{ fontSize: '32px' }}>Team Registration Approval</h1>
                            <p className="approval-subtitle" style={{ fontSize: '15px', color: '#64748b' }}>Select a contest to review and manage student team registration approvals.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {/* Search Box */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', background: 'white', width: '280px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
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

                            {/* Status Filter */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', background: 'white', width: '220px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Status:</span>
                                <select
                                    value={contestStatusFilter}
                                    onChange={(e) => setContestStatusFilter(e.target.value)}
                                    style={{
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        fontSize: '14px',
                                        color: '#0f172a',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="ACTIVED">Active</option>
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {filteredContests.map(c => {
                            const liveStatus = getDatabaseStatus(c);
                            const isClosed = liveStatus === 'CLOSED';
                            const isActive = liveStatus === 'ACTIVED';
                            const totalTeams = Array.isArray(c.teams)
                                ? c.teams.length
                                : ((c.pendingReview || 0) + (c.approved || 0) + (c.closed || 0) + (c.canceled || 0));
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        background: isActive ? 'linear-gradient(to bottom right, #ffffff, #f0fdf4)' : 'white',
                                        padding: '28px',
                                        borderRadius: '16px',
                                        border: isActive ? '2px solid #22c55e' : '1.5px solid #cbd5e1',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isActive ? '0 4px 12px -1px rgba(34, 197, 94, 0.1), 0 2px 4px -1px rgba(34, 197, 94, 0.05)' : '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: '180px'
                                    }}
                                    onClick={() => {
                                        setSelectedContestId(c.id.toString());
                                        sessionStorage.setItem('teamApprovalSelectedContest', c.id.toString());
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = isActive ? '#16a34a' : '#2563eb';
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = isActive ? '0 10px 20px -3px rgba(34, 197, 94, 0.2)' : '0 10px 20px -3px rgba(37, 99, 235, 0.12)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = isActive ? '#22c55e' : '#cbd5e1';
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = isActive ? '0 4px 12px -1px rgba(34, 197, 94, 0.1)' : '0 4px 6px -1px rgba(0,0,0,0.05)';
                                    }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 800, lineHeight: '1.4', flex: 1 }}>{c.name}</h3>
                                            <span style={{
                                                fontSize: '11px',
                                                background: isClosed ? '#fee2e2' : '#dcfce7',
                                                color: isClosed ? '#ef4444' : '#166534',
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                border: `1px solid ${isClosed ? '#fecaca' : '#bbf7d0'}`,
                                                marginLeft: '12px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {isActive && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>}
                                                {liveStatus}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Total Teams:</span>
                                                <span style={{ fontWeight: 700, color: '#eab308' }}>{totalTeams} Teams</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Total Participants:</span>
                                                <span style={{ fontWeight: 700, color: '#2563eb' }}>
                                                    {Array.isArray(c.teams)
                                                        ? c.teams.reduce((sum, t) => sum + (Array.isArray(t.members) ? t.members.length : 0), 0)
                                                        : 0
                                                    } Students
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f1f5f9', marginTop: '16px' }}>
                                        <span style={{ color: isActive ? '#16a34a' : '#2563eb', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Manage Approvals
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredContests.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '60px 40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b', fontWeight: '600', border: '1.5px dashed #cbd5e1' }}>
                                No contests found matching your filters.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="approval-container">
            <div className="approval-content">
                <div className="approval-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                    <div className="approval-title-area">
                        <h1 className="approval-title">Team Registration Approval Desk</h1>
                        <p className="approval-subtitle">Review and manage team applications for the contest: <strong>{selectedContest?.name}</strong></p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="search-box-approval" style={{ margin: 0 }}>
                            <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Search teams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <button
                            onClick={() => {
                                setSelectedContestId('');
                                sessionStorage.removeItem('teamApprovalSelectedContest');
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
                </div>

                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                    <div className="stat-card" style={{ borderLeft: '4px solid #22c55e' }}>
                        <div className="stat-label">APPROVED</div>
                        <div className="stat-value">{approvedCount} Teams</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                        <div className="stat-label">CANCELED</div>
                        <div className="stat-value">{canceledCount} Teams</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid #64748b' }}>
                        <div className="stat-label">CLOSED</div>
                        <div className="stat-value">{closedCount} Teams</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid #eab308' }}>
                        <div className="stat-label">TOTAL TEAM</div>
                        <div className="stat-value">{totalTeamsCount} Teams</div>
                    </div>

                    <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <div className="stat-label">TOTAL PARTICIPANTS</div>
                        <div className="stat-value">{totalParticipantsCount} Students</div>
                    </div>
                </div>                <div className="table-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #d1d5db', background: '#f8fafc' }}>
                        <button
                            onClick={() => {
                                const token = localStorage.getItem('shms_token');
                                window.open(`${API_BASE}/admin/results/export-csv?type=teams&contestId=${selectedContestId}&token=${token}`, '_blank');
                            }}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = '#059669';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.3)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = '#10b981';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                            }}
                        >
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download Team List (CSV)
                        </button>
                    </div>
                    <table className="teams-table">
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Team Name</th>
                            <th style={{ textAlign: 'center', width: '20%' }}>Status</th>
                            <th style={{ textAlign: 'center', width: '30%' }}>Action</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredTeams.map(team => {
                            const statusText = (team.status || 'ACTIVED').toLowerCase();
                            const isCanceled = statusText === 'canceled';

                            let badgeStyle = { padding: '4px 8px', width: '100px', borderRadius: '6px', fontSize: '12px', fontWeight: '680', textTransform: 'uppercase', display: 'inline-block' };
                            if (statusText === 'approved') {
                                badgeStyle.backgroundColor = '#a9f8c5';
                                badgeStyle.color = '#15803d';
                            } else if (isCanceled) {
                                badgeStyle.backgroundColor = '#f9bebe';
                                badgeStyle.color = '#b91c1c';
                            } else {
                                badgeStyle.backgroundColor = '#f1f5f9';
                                badgeStyle.color = '#475569';
                            }

                            return (
                                <tr key={team.id}>
                                    <td style={{ textAlign: 'left' }}>
                                        <div className="team-name-col">
                                            <div className="team-avatar">{team.name.substring(0, 2).toUpperCase()}</div>
                                            <span className="team-name">{team.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                            <span style={badgeStyle}>
                                                {team.status || 'ACTIVED'}
                                            </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                                            <button onClick={() => setMembersModal({ isOpen: true, teamName: team.name, members: team.members || [] })}
                                                    style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #67a0e4', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    onMouseOver={(e) => e.target.style.backgroundColor = '#dbeafe'}
                                                    onMouseOut={(e) => e.target.style.backgroundColor = '#eff6ff'}
                                            >
                                                View Members
                                            </button>

                                            {!isContestClosed && (
                                                isCanceled ? (
                                                    <button onClick={() => handleOpenActionModal(team.id, team.name, 'APPROVE')}
                                                            style={{ padding: '4px 10px', width: '100px', fontSize: '12px', backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #4bcc78', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            onMouseOver={(e) => e.target.style.backgroundColor = '#bbf7d0'}
                                                            onMouseOut={(e) => e.target.style.backgroundColor = '#dcfce7'}
                                                    >
                                                        Approve
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleOpenActionModal(team.id, team.name, 'CANCEL')}
                                                            style={{ padding: '4px 10px', width: '100px', fontSize: '12px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #f04b4b', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            onMouseOver={(e) => e.target.style.backgroundColor = '#fecaca'}
                                                            onMouseOut={(e) => e.target.style.backgroundColor = '#fee2e2'}
                                                    >
                                                        Cancel Team
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredTeams.length === 0 && (
                            <tr>
                                <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No teams found</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                    <div style={{ padding: '16px 24px', fontSize: '13px', color: '#64748b' }}>
                        Showing {filteredTeams.length} teams
                    </div>
                </div>

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
                                      style={{
                                          width: '100%', padding: '10px', borderRadius: '6px',
                                          border: '1px solid #cbd5e1', fontSize: '14px',
                                          boxSizing: 'border-box', resize: 'none', marginBottom: '20px'
                                      }} />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={handleCloseCancelModal}
                                        style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button onClick={handleConfirmCancelStatus}
                                        style={{ padding: '8px 16px', background: '#dc2626', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>
                                    Confirmation
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            {membersModal.isOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '650px', maxWidth: '95%', display: 'flex', flexDirection: 'column' }}>

                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>
                            Members of {membersModal.teamName}
                        </h3>

                        <div style={{ overflowY: 'auto', maxHeight: '60vh', paddingRight: '4px', borderBottom: '1px solid #e2e8f0' }}>
                            {membersModal.members && membersModal.members.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#f8fafc' }}>
                                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>NAME</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>STUDENT ID</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>UNIVERSITY</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>ROLE</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>STATUS</th>
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
                                                ) : m.status === 'CANCELED' ? (
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
                                <div style={{ color: '#64748b', fontSize: '14px', padding: '20px 0' }}>No members found.</div>
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button
                                onClick={() => setMembersModal({ isOpen: false, teamName: '', members: [] })}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '6px',
                                    border: '1px solid #cbd5e1',
                                    background: 'white',
                                    color: '#475569',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.backgroundColor = '#f8fafc'}
                                onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamRegistrationApproval;

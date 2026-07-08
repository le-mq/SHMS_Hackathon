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
                    if (contestsData.length > 0) {
                        const latestContest = [...contestsData].sort((a, b) => Number(b.id) - Number(a.id))[0];
                        setSelectedContestId(latestContest.id);
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
                    if (!canceled) {
                        setDashboardData(contestsData);
                        if (contestsData.length > 0) {
                            const latestContest = [...contestsData].sort((a, b) => Number(b.id) - Number(a.id))[0];
                            setSelectedContestId(latestContest.id);
                        }
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

    const selectedContest = dashboardData.find(c => String(c.id) === String(selectedContestId));
    let filteredTeams = [];
    if (selectedContest && selectedContest.teams) {
        filteredTeams = selectedContest.teams.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
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
                                        status: isCancelAct ? 'CANCELED' : 'APPROVED',
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
                                {[...dashboardData]
                                    .sort((a, b) => Number(b.id) - Number(a.id))
                                    .map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))
                                }
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
                                t.status === 'Canceled' || t.status === 'Rejected' || (t.status || '').toUpperCase() === 'CANCELED'
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
                                <th style={{ textAlign: 'left' }}>Team Name</th>
                                <th style={{ textAlign: 'center', width: '20%' }}>Status</th>
                                <th style={{ textAlign: 'center', width: '30%' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map(team => {
                                const statusText = (team.status || 'Active').toLowerCase();
                                const isCanceledOrRejected = statusText === 'canceled' || statusText === 'rejected';

                                let badgeStyle = { padding: '4px 8px', width: '100px', borderRadius: '6px', fontSize: '12px', fontWeight: '680', textTransform: 'uppercase', display: 'inline-block' };
                                if (statusText === 'approved') {
                                    badgeStyle.backgroundColor = '#a9f8c5';
                                    badgeStyle.color = '#15803d';
                                } else if (isCanceledOrRejected) {
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
                                                {team.status || 'Active'}
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

                                                {isCanceledOrRejected ? (
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

                        {/* Header của Modal */}
                        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>
                            Members of {membersModal.teamName}
                        </h3>

                        {/* Vùng chứa bảng thành viên: Thêm chiều cao tối đa và bật thanh cuộn dọc tự động khi đông thành viên */}
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
                                <div style={{ color: '#64748b', fontSize: '14px', padding: '20px 0' }}>No members found.</div>
                            )}
                        </div>

                        {/* Nút Đóng cố định ở góc dưới bên phải */}
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

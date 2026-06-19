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
        teamId: null,
        teamName: '',
        reason: ''
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
                const contestsData = json.contests || [];
                if (!cancelled) {
                    setDashboardData(contestsData);
                    if (contestsData.length > 0) {
                        setSelectedContestId(contestsData[0].id);
                    }
                }
            }
            catch (error) {
                console.warn("API unavailable", error.message);
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

    const selectedContest = dashboardData.find(c => c.id == selectedContestId);
    let filteredTeams = [];
    if (selectedContest && selectedContest.teams) {
        filteredTeams = selectedContest.teams.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    const handleOpenCancelModal = (teamId, teamName) => {
        setCancelModal({
            isOpen: true,
            teamId,
            teamName,
            reason: ''
        });
    };

    const handleConfirmCancelStatus = async () => {
        if (!cancelModal.reason.trim()) {
            alert("Vui lòng nhập lý do hủy tư cách thi!");
            return;
        }

        const confirmCheck = window.confirm(`Bạn có chắc chắn muốn hủy tư cách tham gia cuộc thi của đội "${cancelModal.teamName}" không?`);
        if (!confirmCheck) return;

        try {
            const token = localStorage.getItem("shms_token");

            // Ví dụ gọi API (bạn có thể đổi endpoint cho đúng thiết kế Backend của bạn)
            // await axios.post(`${API_BASE}/admin/contests/teams/cancel-status`, {
            //     teamId: cancelModal.teamId,
            //     contestId: selectedContestId,
            //     reason: cancelModal.reason
            // }, { headers: { Authorization: `Bearer ${token}` } });

            const targetTeam = selectedContest?.teams?.find(t => t.id === cancelModal.teamId);
            const prevStatus = (targetTeam?.status || 'Active').toLowerCase();

            // Cập nhật tạm thời trực tiếp trên State để thấy ngay thay đổi ở Front-end
            setDashboardData(prevData =>
                prevData.map(contest => {
                    if (contest.id === selectedContestId) {
                        let newPending = contest.pendingReview || 0;
                        let newApproved = contest.approved || 0;

                        if (prevStatus === 'approved') {
                            newApproved = Math.max(0, newApproved - 1);
                        } else if (prevStatus === 'pending' || prevStatus === 'pending review') {
                            newPending = Math.max(0, newPending - 1);
                        }
                        return {
                            ...contest,
                            teams: contest.teams.map(team =>
                                team.id === cancelModal.teamId
                                    ? { ...team, status: 'Canceled', track: 'Disqualified' } // Hoặc cập nhật status tương ứng
                                    : team
                            )
                        };
                    }
                    return contest;
                })
            );

            alert(`Đã hủy tư cách thi của đội ${cancelModal.teamName} thành công.`);
            handleCloseCancelModal();

        } catch (err) {
            console.error("Lỗi khi hủy trạng thái thi:", err);
            alert("Có lỗi xảy ra khi thực hiện thao tác này.");
        }
    };


    const handleCloseCancelModal = () => {
        setCancelModal({ isOpen: false, teamId: null, teamName: '', reason: '' });
    };

    if (isLoading) return <div className="approval-container"><NavbarAdmin /><div style={{ padding: '40px' }}>Loading dashboard...</div></div>;
    if (error) return <div className="approval-container"><NavbarAdmin /><div style={{ padding: '40px', color: 'red' }}>{error}</div></div>;

    return (
        <div className="approval-container">
            <NavbarAdmin />
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
                                style={{ background: 'white', border: '1px solid #e2e8f0', color: '#0f172a', appearance: 'auto', padding: '8px 12px' }}
                                value={selectedContestId || ''}
                                onChange={(e) => setSelectedContestId(e.target.value)}
                            >
                                {dashboardData.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                        <div className="search-box">
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
                            {filteredTeams.map(team => (
                                <tr key={team.id}>
                                    <td>
                                        <div className="team-name-col">
                                            <div className="team-avatar">{team.name.substring(0, 2).toUpperCase()}</div>
                                            <span className="team-name">{team.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                                            {(() => {
                                                const statusText = (team.status || 'Active').toLowerCase();

                                                let badgeStyle = {
                                                    padding: '4px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: '680',
                                                    textTransform: 'uppercase',
                                                    display: 'inline-block'
                                                };

                                                if (statusText === 'approved') {
                                                    badgeStyle.backgroundColor = '#dcfce7';
                                                    badgeStyle.color = '#15803d';
                                                } else if (statusText === 'rejected' || statusText === 'canceled') {
                                                    badgeStyle.backgroundColor = '#fee2e2';
                                                    badgeStyle.color = '#b91c1c';
                                                } else {
                                                    badgeStyle.backgroundColor = '#f1f5f9';
                                                    badgeStyle.color = '#475569';
                                                }

                                                return (
                                                    <span style={badgeStyle}>
                                                        {team.status || 'Active'}
                                                    </span>
                                                );
                                            })()}

                                            {team.status !== 'Canceled' && team.status !== 'Rejected' && (
                                                <button
                                                    onClick={() => handleOpenCancelModal(team.id, team.name)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '12px',
                                                        backgroundColor: '#fee2e2',
                                                        color: '#dc2626',
                                                        border: '1px solid #fca5a5',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseOver={(e) => e.target.style.backgroundColor = '#fecaca'}
                                                    onMouseOut={(e) => e.target.style.backgroundColor = '#fee2e2'}
                                                >Cancel</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                                Hủy tư cách cuộc thi
                            </h3>
                            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '16px' }}>
                                Vui lòng nhập lý do loại đội <strong>{cancelModal.teamName}</strong> ra khỏi cuộc thi này.
                            </p>

                            <textarea
                                rows="4"
                                value={cancelModal.reason}
                                onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                                placeholder="Nhập lý do tại đây..."
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '6px',
                                    border: '1px solid #cbd5e1', fontSize: '14px',
                                    boxSizing: 'border-box', resize: 'none', marginBottom: '20px'
                                }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    onClick={handleCloseCancelModal}
                                    style={{
                                        padding: '8px 16px', background: '#f1f5f9', border: 'none',
                                        borderRadius: '6px', color: '#475569', cursor: 'pointer'
                                    }}
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleConfirmCancelStatus}
                                    style={{
                                        padding: '8px 16px', background: '#dc2626', border: 'none',
                                        borderRadius: '6px', color: 'white', cursor: 'pointer'
                                    }}
                                >
                                    Xác nhận hủy
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bottom-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '600px' }}>
                    <div className="capacity-section">
                        <h2 className="capacity-title">Category Capacity</h2>
                        <p className="capacity-subtitle">Real-time category allocation tracking</p>

                        {selectedContest && selectedContest.capacities && selectedContest.capacities.map((cap, idx) => (
                            <div className="capacity-item" key={idx}>
                                <div className="cap-header">
                                    <span>{cap.categoryName}</span>
                                    <span>{cap.percentage}%</span>
                                </div>
                                <div className="cap-bar-bg">
                                    <div className="cap-bar-fill" style={{ width: `${cap.percentage}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {(!selectedContest || !selectedContest.capacities || selectedContest.capacities.length === 0) && (
                            <div style={{ color: '#64748b', fontSize: '14px', marginTop: '16px' }}>No categories configured.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamRegistrationApproval;

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

    if (isLoading) return <div className="approval-container"><NavbarAdmin /><div style={{ padding: '40px' }}>Loading dashboard...</div></div>;
    if (error) return <div className="approval-container"><NavbarAdmin /><div style={{ padding: '40px', color: 'red' }}>{error}</div></div>;

    return (
        <div className="approval-container">
            <NavbarAdmin />

            <div className="approval-content">
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
                                <th>Enrolled Category</th>
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
                                    <td>
                                        <span className={`track-badge ${team.trackClass}`}>{team.track}</span>
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

                <div style={{ marginTop: '32px' }}>
                    <LatestAnnouncements />
                </div>
            </div>
        </div>
    );
};

export default TeamRegistrationApproval;

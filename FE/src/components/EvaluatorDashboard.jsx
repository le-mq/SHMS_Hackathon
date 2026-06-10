import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EvaluatorDashboard.css';
import NavbarJudge from './NavbarJudge';
import LatestAnnouncements from './LatestAnnouncements';

const EvaluatorDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [selectedContest, setSelectedContest] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                let url = 'http://localhost:8080/api/v1/judge/assigned-submissions';
                if (selectedContest) {
                    url += `?contestId=${selectedContest}`;
                }
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchDashboard();
    }, [selectedContest]);

    const dashboardData = data || {
        assignedTrackCount: 0,
        totalAllocatedTeams: 0,
        evaluatedCount: 0,
        contests: [],
        queue: []
    };

    return (
        <div className="evaluator-container">
            <NavbarJudge />

            <div className="evaluator-content">
                <div className="evaluator-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="evaluator-title">Evaluator Panel Dashboard</h1>
                        <p className="evaluator-subtitle">Welcome back. Here is the real-time progress of your assigned teams.</p>
                    </div>
                    <div>
                        <select 
                            className="eval-contest-select"
                            value={selectedContest}
                            onChange={(e) => setSelectedContest(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}
                        >
                            <option value="">All Assigned Contests</option>
                            {dashboardData.contests?.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="stats-row">
                    <div className="stat-box">
                        <div className="stat-left">
                            <span className="stat-label">Assigned Category Count</span>
                            <span className="stat-val">{dashboardData.assignedTrackCount}</span>
                            <span className="stat-sub">FinTech, AI & ML</span>
                        </div>
                        <div className="stat-icon">
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                        </div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-left">
                            <span className="stat-label">Total Allocated Teams</span>
                            <span className="stat-val">{dashboardData.totalAllocatedTeams}</span>
                            <span className="stat-sub">Teams across all tracks</span>
                        </div>
                        <div className="stat-icon">
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        </div>
                    </div>
                    <div className="stat-box">
                        <div className="progress-box">
                            <div>
                                <span className="progress-large">{dashboardData.evaluatedCount}/{dashboardData.totalAllocatedTeams} </span>
                                <span className="progress-small">EVALUATED</span>
                            </div>
                            <span className="stat-sub">{dashboardData.totalAllocatedTeams - dashboardData.evaluatedCount} teams remaining to be graded<br/>for Round 1.</span>
                        </div>
                    </div>
                </div>

                <div className="queue-section">
                    <div className="queue-header">
                        <h2 className="queue-title">Assigned Teams Queue</h2>
                        <div className="queue-actions">
                            <div className="search-input">
                                <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input type="text" placeholder="Search teams..." />
                            </div>
                            <button className="filter-btn">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Filter
                            </button>
                        </div>
                    </div>
                    <table className="queue-table">
                        <thead>
                            <tr>
                                <th>Team Name</th>
                                <th>Assigned Category</th>
                                <th>Round</th>
                                <th>Submission State</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.queue.map((team, idx) => (
                                <tr key={team.teamId || idx}>
                                    <td>
                                        <div className="team-info">
                                            <div className={`team-avatar-light ${team.themeClass}`}>{team.abbreviation}</div>
                                            <span className="team-name-txt">{team.teamName}</span>
                                        </div>
                                    </td>
                                    <td><span className="track-txt">{team.trackName}</span></td>
                                    <td><span className="round-txt">{team.roundName}</span></td>
                                    <td>
                                        <span className={`status-pill ${team.submissionState?.toUpperCase() === 'SUBMITTED' ? 'pill-submitted' : team.submissionState?.toUpperCase() === 'EVALUATED' ? 'pill-submitted' : 'pill-pending'}`}>
                                            {team.submissionState === 'SUBMITTED' ? 'Submitted' : team.submissionState}
                                        </span>
                                    </td>
                                    <td>
                                        {team.submissionState?.toUpperCase() === 'EVALUATED' ? (
                                            <button className="evaluate-btn" style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', borderColor: '#cbd5e1' }} disabled>
                                                Already Evaluated
                                            </button>
                                        ) : (
                                            <button className="evaluate-btn" onClick={() => navigate(`/judge/evaluate/${team.teamId}`)}>Evaluate Team Product</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="queue-footer">
                        <div className="pagination">
                            <button className="page-btn">‹</button>
                            <button className="page-btn" style={{background: '#0f172a', color: 'white'}}>1</button>
                            <button className="page-btn">2</button>
                            <button className="page-btn">3</button>
                            <button className="page-btn">›</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{ padding: '0 32px 32px', maxWidth: 1200, margin: '0 auto' }}>
                <LatestAnnouncements />
            </div>
        </div>
    );
};

export default EvaluatorDashboard;

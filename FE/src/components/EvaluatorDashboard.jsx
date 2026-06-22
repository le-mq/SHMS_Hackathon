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
                if (selectedContest) { url += `?contestId=${selectedContest}`; }
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    throw new Error("Failed to fetch evaluator data");
                }
            } catch (error) {
                console.warn("Cannot load data:", error);
                try {
                    const testData = await fetch('/testFE.json');
                    const mockData = await testData.json();
                    let dashboardMock = mockData.evaluatorDashboard.data;
                    if (selectedContest) {
                        const filteredQueue = dashboardMock.queue.filter(team => team.contestId === parseInt(selectedContest));
                        dashboardMock = {
                            ...dashboardMock, queue: filteredQueue,
                            assignedCategoryCount: Array.from(new Set(filteredQueue.map(t => t.categoryName || t.trackName || t.category))).length,
                            totalAllocatedTeams: filteredQueue.length,
                            evaluatedCount: filteredQueue.filter(t => t.submissionState === 'EVALUATED').length
                        };
                    }
                    setData(dashboardMock);
                } catch (fallbackErr) {
                    console.error("Error fetching mock data:", fallbackErr);
                }
            }
        };
        fetchDashboard();
    }, [selectedContest]);

    const dashboardData = data || {
        assignedCategoryCount: 0, totalAllocatedTeams: 0,
        evaluatedCount: 0, contests: [], queue: []
    };

    return (
        <div className="evaluator-container">
            <NavbarJudge />
            <div style={{ padding: '20px', maxWidth: 1200, margin: 'auto' }}><LatestAnnouncements /></div>
            <div className="evaluator-content">
                <div className="evaluator-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div><h1 className="evaluator-title">Evaluator Panel Dashboard</h1>
                        <p className="evaluator-subtitle">Welcome back. Here is the real-time progress of your assigned teams.</p>
                    </div>
                    <div><select className="eval-contest-select" value={selectedContest}
                        onChange={(e) => setSelectedContest(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}>
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
                            <span className="stat-val">{dashboardData.assignedCategoryCount}</span>
                        </div>
                        <div className="stat-icon">
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-left">
                            <span className="stat-label">Total Allocated Teams</span>
                            <span className="stat-val">{dashboardData.totalAllocatedTeams}</span>
                            <span className="stat-sub">Teams across all tracks.</span>
                        </div>
                        <div className="stat-icon">
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="stat-box">
                        <div className="progress-box">
                            <div> <span
                                className="progress-large">{dashboardData.evaluatedCount}/{dashboardData.totalAllocatedTeams} </span>
                                <span className="progress-small">EVALUATED</span>
                            </div>
                            <span
                                className="stat-sub">{dashboardData.totalAllocatedTeams - dashboardData.evaluatedCount} teams remaining to be graded.</span>
                        </div>
                    </div>
                </div>

                <div className="queue-section">
                    <div className="queue-header">
                        <h2 className="queue-title">Assigned Teams Queue</h2>
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
                            {dashboardData.queue?.map((team, idx) => (
                                <tr key={team.teamId || team.id || idx}>
                                    <td><div className="team-info">
                                        <span className="team-name-txt">{team.teamName || team.name}</span>
                                    </div>
                                    </td>
                                    <td><span className="category-txt">{team.categoryName || team.trackName || team.category || team.track?.categoryName}</span></td>
                                    <td><span className="round-txt">{team.roundName || team.phaseName || team.round?.roundName}</span></td>
                                    <td>
                                        <span className={`status-pill ${team.submissionState?.toUpperCase() === 'EVALUATED' ? 'pill-evaluated' : team.submissionState?.toUpperCase() === 'SUBMITTED' ? 'pill-submitted' : 'pill-pending'}`}>
                                            {team.submissionState === 'SUBMITTED' ? 'Submitted' : team.submissionState}
                                        </span>
                                    </td>
                                    <td>
                                        {team.submissionState?.toUpperCase() === 'EVALUATED' ? (
                                            <button className="evaluate-btn" style={{
                                                background: '#e2e8f0',
                                                color: '#64748b', cursor: 'not-allowed', borderColor: '#cbd5e1'
                                            }} disabled>Already Evaluated</button>
                                        ) : (<button className="evaluate-btn" onClick={() => navigate(`/judge/evaluate/${team.teamId || team.id}`)}>
                                            Evaluate Team Product</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EvaluatorDashboard;
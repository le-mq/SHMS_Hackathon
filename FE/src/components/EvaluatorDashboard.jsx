import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import './EvaluatorDashboard.css';
import './LeaderWorkspace.css';
import NavbarJudge from './NavbarJudge';
import LatestAnnouncements from './LatestAnnouncements';

const formatScheduleDate = (dateValue, emptyText, invalidText) => {
    if (!dateValue) {
        return emptyText;
    }
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return invalidText;
    }
    return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).replace(',', ' \u2022');
};
const EvaluatorDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [selectedContest, setSelectedContest] = useState('');
    const [selectedRound, setSelectedRound] = useState('');
    const [timeLeft, setTimeLeft] = useState('');
    const [timeStatus, setTimeStatus] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                let url = 'http://localhost:8080/api/v1/judge/assigned-submissions';
                if (selectedContest) {
                    url += `?contestId=${selectedContest}`;
                }
                const response = await fetch(url, {headers: {'Authorization': `Bearer ${token}`}});
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
                        dashboardMock = { ...dashboardMock, queue: filteredQueue,
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
    const roundMap = {};
    (dashboardData.queue || []).forEach(t => {
        const rName = t.roundName || t.phaseName || t.round?.roundName;
        if (rName && !roundMap[rName]) {
            roundMap[rName] = {
                name: rName,
                gradingOpenAt: t.gradingOpenAt,
                gradingDeadlineAt: t.gradingDeadlineAt,
                roundFormat: t.roundFormat || t.round?.roundFormat || ''
            };
        }
    });
    const allRounds = Object.values(roundMap).sort((a, b) => {
        return new Date(a.gradingOpenAt || 0) - new Date(b.gradingOpenAt || 0);
    });
    useEffect(() => {
        if (allRounds.length > 0 && !roundMap[selectedRound]) {
            const saved = sessionStorage.getItem('judgeSelectedRound');
            if (saved && roundMap[saved]) {
                setSelectedRound(saved);
            } else {
                setSelectedRound(allRounds[0].name);
            }
        }
    }, [allRounds.length, selectedRound, JSON.stringify(roundMap)]);

    useEffect(() => {
        const currentRoundObj = roundMap[selectedRound];
        if (!currentRoundObj) {
            setTimeLeft('');
            setTimeStatus('');
            return;
        }
        const updateCountdown = () => {
            const now = new Date();
            const openTime = currentRoundObj.gradingOpenAt ? new Date(currentRoundObj.gradingOpenAt) : null;
            const closeTime = currentRoundObj.gradingDeadlineAt ? new Date(currentRoundObj.gradingDeadlineAt) : null;
            if (openTime && now < openTime) {
                setTimeStatus('UPCOMING');
                const diff = openTime - now;
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
            } else if (closeTime && now <= closeTime) {
                setTimeStatus('OPEN');
                const diff = closeTime - now;
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
            } else if (closeTime && now > closeTime) {
                setTimeStatus('CLOSED');
                setTimeLeft('Grading Ended');
            } else {
                setTimeStatus('OPEN');
                setTimeLeft('No Deadline');
            }
        };
        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [selectedRound, JSON.stringify(roundMap)]);
    const filteredQueue = dashboardData.queue?.filter(t => {
        const rName = t.roundName || t.phaseName || t.round?.roundName;
        return rName === selectedRound;
    }) || [];
    const notSubmittedCount = filteredQueue.filter(t => t.submissionState === 'Not Submitted' || t.submissionState === 'AUTO_ZERO').length || 0;
    const effectiveTotalTeams = Math.max(0, filteredQueue.length - notSubmittedCount);
    const evaluatedCount = filteredQueue.filter(t => t.submissionState?.toUpperCase() === 'EVALUATED').length || 0;
    const remainingToGrade = Math.max(0, effectiveTotalTeams - evaluatedCount);

    return (
        <div className="evaluator-container">
            <NavbarJudge/>
            <div style={{padding: '20px', maxWidth: 1200, margin: 'auto'}}><LatestAnnouncements/></div>
            <div className="evaluator-content">
                <div className="evaluator-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="evaluator-header-left" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <h1 className="evaluator-title">Evaluator Panel Dashboard</h1>
                            <p className="evaluator-subtitle">Welcome back. Here is the real-time progress of your assigned teams.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select className="eval-contest-select" value={selectedContest}
                                    onChange={(e) => setSelectedContest(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}>
                                <option value="">All Assigned Contests</option>
                                {dashboardData.contests?.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <select className="eval-contest-select" value={selectedRound}
                                    onChange={(e) => {
                                        setSelectedRound(e.target.value);
                                        sessionStorage.setItem('judgeSelectedRound', e.target.value);
                                    }}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}>
                                {allRounds.map((r, idx) => (
                                    <option key={idx} value={r.name}>{r.name}</option>
                                ))}
                                {allRounds.length === 0 && <option value="">No Rounds Found</option>}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="stats-row">
                    <div className="stat-box">
                        <div className="stat-left" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div>
                                    <span className="stat-label">GRADING TIME WINDOW</span>
                                    <span className="stat-val" style={{ fontSize: '18px', color: timeStatus === 'OPEN' ? '#16a34a' : (timeStatus === 'CLOSED' ? '#ef4444' : '#eab308'), display: 'block', marginTop: '4px' }}>
                                        {timeStatus === 'UPCOMING' && 'Opens in: '}
                                        {timeStatus === 'OPEN' && 'Closes in: '}
                                        {timeStatus === 'CLOSED' && 'Status: '}
                                        {timeLeft}
                                    </span>
                                </div>
                                <div className="stat-icon" style={{ margin: 0 }}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Opens:</span>
                                    <span style={{ fontWeight: 600, color: '#334155' }}>{formatScheduleDate(roundMap[selectedRound]?.gradingOpenAt, 'No Date Set', 'Invalid Date')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Closes:</span>
                                    <span style={{ fontWeight: 600, color: '#334155' }}>{formatScheduleDate(roundMap[selectedRound]?.gradingDeadlineAt, 'No Date Set', 'Invalid Date')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Format:</span>
                                    <span style={{ fontWeight: 600, color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                        {roundMap[selectedRound]?.roundFormat || 'Not Specified'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-left">
                            <span className="stat-label">Total Allocated Teams</span>
                            <span className="stat-val">{filteredQueue.length}</span>
                            <span className="stat-sub">Teams across all tracks.</span>
                        </div>
                        <div className="stat-icon">
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                        </div>
                    </div>
                    <div className="stat-box">
                        <div className="progress-box">
                            <div> <span
                                className="progress-large">{evaluatedCount}/{effectiveTotalTeams} </span>
                                <span className="progress-small">EVALUATED</span>
                            </div>
                            <span
                                className="stat-sub">{remainingToGrade} teams remaining to be graded.</span>
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
                        {filteredQueue.map((team, idx) => (
                            <tr key={team.teamId || team.id || idx}>
                                <td><div className="team-info">
                                        <span className="team-name-txt">{team.teamName || team.name}</span>
                                    </div>
                                </td>
                                <td><span
                                    className="category-txt">{team.categoryName || team.trackName || team.category || team.track?.categoryName}</span>
                                </td>
                                <td><span
                                    className="round-txt">{team.roundName || team.phaseName || team.round?.roundName}</span>
                                </td>
                                <td><span className={`status-pill ${team.submissionState?.toUpperCase() === 'EVALUATED' ? 'pill-evaluated' : team.submissionState?.toUpperCase() === 'SUBMITTED' ? 'pill-submitted' : 'pill-pending'}`}>
                                     {team.submissionState === 'SUBMITTED' ? 'Submitted' : (team.submissionState === 'AUTO_ZERO' ? 'Not Submitted' : team.submissionState)}
                                     </span>
                                </td>
                                <td>{team.submissionState?.toUpperCase() === 'EVALUATED' ? (
                                        <button className="evaluate-btn" style={{ background: '#e2e8f0',
                                            color: '#64748b', cursor: 'not-allowed', borderColor: '#cbd5e1'
                                        }} disabled>Already Evaluated</button>
                                    ) : (
                                        (() => {const now = new Date().getTime();
                                            const openTime = team.gradingOpenAt ? new Date(team.gradingOpenAt).getTime() : 0;
                                            const closeTime = team.gradingDeadlineAt ? new Date(team.gradingDeadlineAt).getTime() : Infinity;
                                            if (openTime !== 0 && (now < openTime || now > closeTime)) {
                                                return (
                                                    <button className="evaluate-btn" style={{ background: '#fee2e2',
                                                        color: '#ef4444', cursor: 'not-allowed', borderColor: '#fca5a5'
                                                    }} disabled>Not in Grading Time</button>
                                                );
                                            }

                                            if (team.submissionState === 'Not Submitted' || team.submissionState === 'AUTO_ZERO') {
                                                return (
                                                    <button className="evaluate-btn" style={{ background: '#fee2e2',
                                                        color: '#ef4444', borderColor: '#fca5a5'
                                                    }} onClick={() => navigate(`/judge/evaluate/${team.teamId || team.id}?roundId=${team.roundId}`)}>
                                                        Evaluate (0 pts)</button>
                                                );
                                            }
                                            return (
                                                <button className="evaluate-btn"
                                                        onClick={() => navigate(`/judge/evaluate/${team.teamId || team.id}?roundId=${team.roundId}`)}>
                                                    Evaluate Team Product</button>
                                            );
                                        })()
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
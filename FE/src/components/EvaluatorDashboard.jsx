import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import './EvaluatorDashboard.css';
import './LeaderWorkspace.css';
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
    if (dashboardData.rounds && dashboardData.rounds.length > 0) {
        dashboardData.rounds.forEach(r => {
            roundMap[r.name] = {
                id: r.id,
                name: r.name,
                gradingDeadlineAt: r.gradingDeadlineAt,
                roundFormat: r.format || 'Not Specified'
            };
        });
    } else {
        (dashboardData.queue || []).forEach(t => {
            const rName = t.roundName || t.phaseName || t.round?.roundName;
            if (rName && !roundMap[rName]) {
                roundMap[rName] = {
                    id: t.roundId,
                    name: rName,
                    gradingDeadlineAt: t.gradingDeadlineAt,
                    roundFormat: t.roundFormat || t.round?.roundFormat || 'Not Specified'
                };
            }
        });
    }
    const allRounds = Object.values(roundMap).sort((a, b) => {
        return new Date(a.gradingDeadlineAt || 0) - new Date(b.gradingDeadlineAt || 0);
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
            const closeTime = currentRoundObj.gradingDeadlineAt ? new Date(currentRoundObj.gradingDeadlineAt) : null;
            if (closeTime && now <= closeTime) {
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
    const notSubmittedCount = filteredQueue.filter(t => t.submissionState === 'Not Submitted' || t.submissionState === 'MISSED_DEADLINE').length || 0;
    const effectiveTotalTeams = Math.max(0, filteredQueue.length - notSubmittedCount);
    const evaluatedCount = filteredQueue.filter(t => t.submissionState?.toUpperCase() === 'EVALUATED').length || 0;
    const remainingToGrade = Math.max(0, effectiveTotalTeams - evaluatedCount);

    return (
        <div className="evaluator-container">
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
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span className="stat-label" style={{ marginBottom: 0 }}>GRADING TIME WINDOW</span>
                                <div className="stat-icon" style={{ margin: 0 }}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                                {timeStatus && (
                                    <span className="stat-val" style={{ fontSize: '18px', color: timeStatus === 'OPEN' ? '#16a34a' : (timeStatus === 'CLOSED' ? '#ef4444' : '#eab308'), display: 'block', marginBottom: '12px', textAlign: 'center' }}>
                                        {timeStatus === 'OPEN' && 'Closes in: '}
                                        {timeStatus === 'CLOSED' && 'Status: '}
                                        {timeLeft}
                                    </span>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Status:</span>
                                        <span style={{ fontWeight: 600, color: '#334155' }}>Available for Grading</span>
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
                                    {roundMap[selectedRound]?.id && (
                                        <button
                                            onClick={() => navigate(`/judge/evaluate/preview?roundId=${roundMap[selectedRound].id}&readonly=true`)}
                                            style={{ marginTop: '8px', width: '100%', padding: '8px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                                        >
                                            View Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="stat-box">
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span className="stat-label" style={{ marginBottom: 0 }}>TOTAL ALLOCATED TEAMS</span>
                                <div className="stat-icon" style={{ margin: 0 }}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                                    </svg>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px' }}>
                                <span className="stat-val" style={{ fontSize: '40px', lineHeight: 1, margin: 0 }}>{filteredQueue.length}</span>
                                <span className="stat-sub" style={{ margin: 0 }}>Teams across all rounds.</span>
                            </div>
                        </div>
                    </div>
                    <div className="stat-box">
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span className="stat-label" style={{ marginBottom: 0 }}>EVALUATION PROGRESS</span>
                                <div className="stat-icon" style={{ margin: 0 }}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', margin: 0 }}>
                                    <span className="stat-val" style={{ fontSize: '40px', lineHeight: 1, margin: 0 }}>{evaluatedCount}/{effectiveTotalTeams}</span>
                                    <span className="progress-small" style={{ margin: 0, marginLeft: '8px' }}>EVALUATED</span>
                                </div>
                                <span className="stat-sub" style={{ margin: 0 }}>{remainingToGrade} teams remaining to be graded.</span>
                            </div>
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
                            <th>Score</th>
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
                                     {team.submissionState === 'SUBMITTED' ? 'Submitted' : (team.submissionState === 'MISSED_DEADLINE' ? 'Not Submitted' : team.submissionState)}
                                     </span>
                                </td>
                                <td className="score-cell">
                                    {team.score !== undefined && team.score !== null ? team.score : (team.submissionState === 'Not Submitted' || team.submissionState === 'MISSED_DEADLINE' ? '0' : '-')}
                                </td>
                                <td>{team.submissionState?.toUpperCase() === 'EVALUATED' ? (
                                    <button className="evaluate-btn" style={{ background: '#e2e8f0',
                                        color: '#64748b', cursor: 'not-allowed', borderColor: '#cbd5e1'
                                    }} disabled>Already Evaluated</button>
                                ) : (
                                    (() => {
                                        if (team.submissionState?.toUpperCase() === 'PENDING') {
                                            return (
                                                <button className="evaluate-btn" style={{ background: '#e0f2fe',
                                                    color: '#0284c7', borderColor: '#7dd3fc'
                                                }} onClick={() => navigate(`/judge/evaluate/${team.teamId || team.id}?roundId=${team.roundId}&readonly=true`)}>
                                                    View Details</button>
                                            );
                                        }

                                        if (team.submissionState === 'Not Submitted' || team.submissionState === 'MISSED_DEADLINE') {
                                            return (
                                                <button className="evaluate-btn" style={{ background: '#fee2e2',
                                                    color: '#ef4444', borderColor: '#fca5a5'
                                                }} onClick={() => navigate(`/judge/evaluate/${team.teamId || team.id}?roundId=${team.roundId}`)}>
                                                    Evaluate</button>
                                            );
                                        }
                                        return (
                                            <button className="evaluate-btn"
                                                    onClick={() => navigate(`/judge/evaluate/${team.teamId || team.id}?roundId=${team.roundId}`)}>
                                                Evaluate</button>
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

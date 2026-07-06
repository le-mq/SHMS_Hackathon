import {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import './EvaluatorDashboard.css';
import './LeaderWorkspace.css';
import LatestAnnouncements from './LatestAnnouncements';
import RoundDetailsModal from './RoundDetailsModal';

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
    const [previewRoundId, setPreviewRoundId] = useState(null);

    useEffect(() => {
        if (!selectedContest && data?.contests?.length > 0) {
            let activeContestId = null;
            for (const c of data.contests) {
                const teams = data.queue?.filter(t => t.contestId == c.id) || [];
                const allEval = teams.length > 0 && teams.every(t => t.submissionState?.toUpperCase() === 'EVALUATED');
                if (!allEval && teams.length > 0) {
                    activeContestId = c.id.toString();
                    break;
                }
            }
            setSelectedContest(activeContestId || data.contests[0].id.toString());
        }
    }, [data?.contests, data?.queue, selectedContest]);

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
                let activeRoundName = null;
                const now = new Date();
                for (const r of allRounds) {
                    const teamsInRound = dashboardData.queue?.filter(t => (t.roundName || t.phaseName || t.round?.roundName) === r.name) || [];
                    const deadline = r.gradingDeadlineAt ? new Date(r.gradingDeadlineAt) : null;
                    const allEvaluated = teamsInRound.length > 0 && teamsInRound.every(t => t.submissionState?.toUpperCase() === 'EVALUATED');
                    const isClosed = deadline && now > deadline;
                    if (!isClosed && !allEvaluated) {
                        activeRoundName = r.name;
                        break;
                    }
                }
                setSelectedRound(activeRoundName || allRounds[0].name);
            }
        }
    }, [allRounds.length, selectedRound, JSON.stringify(roundMap), dashboardData.queue]);

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
                    <div className="evaluator-header-left" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                        <div>
                            <h1 className="evaluator-title">Evaluator Panel Dashboard</h1>
                            <p className="evaluator-subtitle">Welcome back. Here is the real-time progress of your assigned teams.</p>
                        </div>

                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%', background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Contest</span>
                                <select
                                    value={selectedContest}
                                    onChange={(e) => setSelectedContest(e.target.value)}
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#0f172a', fontWeight: 600, fontSize: '14px', cursor: 'pointer', width: '100%' }}
                                >
                                    {dashboardData?.contests?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                    {(!dashboardData?.contests || dashboardData.contests.length === 0) && <option value="">No Contests Assigned</option>}
                                </select>
                                {(() => {
                                    if (!selectedContest) return null;
                                    const teams = dashboardData.queue?.filter(t => t.contestId == selectedContest) || [];
                                    const allEval = teams.length > 0 && teams.every(t => t.submissionState?.toUpperCase() === 'EVALUATED');
                                    const statusText = allEval ? 'Completed' : 'Active';
                                    const badgeStyles = allEval ? { bg: '#dbeafe', color: '#1e3a8a', border: '#bfdbfe' } : { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' };
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>Overall Status:</span>
                                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: badgeStyles.bg, color: badgeStyles.color, border: `1px solid ${badgeStyles.border}` }}>{statusText}</span>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div style={{ width: '1px', background: '#e2e8f0', margin: '0 10px' }} className="divider-hide-mobile"></div>

                            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Round</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {allRounds.map((r, idx) => {
                                        const teamsInRound = dashboardData.queue?.filter(t => (t.roundName || t.phaseName || t.round?.roundName) === r.name) || [];
                                        const now = new Date();
                                        const deadline = r.gradingDeadlineAt ? new Date(r.gradingDeadlineAt) : null;
                                        const allEvaluated = teamsInRound.length > 0 && teamsInRound.every(t => t.submissionState?.toUpperCase() === 'EVALUATED');

                                        let statusText = 'Grading';
                                        let badgeStyles = { bg: '#d1fae5', color: '#065f46', border: '#a7f3d0' };

                                        if (deadline && now > deadline) {
                                            statusText = 'Closed';
                                            badgeStyles = { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
                                        } else if (allEvaluated) {
                                            statusText = 'Completed';
                                            badgeStyles = { bg: '#dbeafe', color: '#1e3a8a', border: '#bfdbfe' };
                                        }

                                        const isActive = selectedRound === r.name;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedRound(r.name);
                                                    sessionStorage.setItem('judgeSelectedRound', r.name);
                                                }}
                                                style={{
                                                    padding: '10px 14px',
                                                    borderRadius: '8px',
                                                    border: `1px solid ${isActive ? '#3b82f6' : '#cbd5e1'}`,
                                                    background: isActive ? '#eff6ff' : 'white',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '6px',
                                                    minWidth: '150px',
                                                    boxShadow: isActive ? '0 0 0 1px #3b82f6' : 'none'
                                                }}
                                            >
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#1e3a8a' : '#334155' }}>{r.name}</div>
                                                <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: badgeStyles.bg, color: badgeStyles.color, border: `1px solid ${badgeStyles.border}`, alignSelf: 'flex-start' }}>
                                                    {statusText}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {allRounds.length === 0 && <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>No Rounds Found for this Contest</span>}
                                </div>
                            </div>
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
                                            onClick={() => setPreviewRoundId(roundMap[selectedRound].id)}
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
                                <td><span className={`status-pill ${team.submissionState?.toUpperCase() === 'EVALUATED' ? 'pill-evaluated' : team.submissionState?.toUpperCase() === 'SUBMITTED' ? 'pill-submitted' : (team.submissionState === 'Not Submitted' || team.submissionState === 'MISSED_DEADLINE' ? 'pill-not-submitted' : 'pill-pending')}`}>
                                     {team.submissionState === 'SUBMITTED' ? 'Submitted' : (team.submissionState === 'MISSED_DEADLINE' ? 'Not Submitted' : team.submissionState)}
                                     </span>
                                </td>
                                <td className="score-cell">
                                    {team.score !== undefined && team.score !== null ? team.score : (team.submissionState === 'Not Submitted' || team.submissionState === 'MISSED_DEADLINE' ? '0' : '-')}
                                </td>
                                <td>{team.submissionState?.toUpperCase() === 'EVALUATED' ? (
                                    <button className="evaluate-btn" style={{ background: '#f1f5f9',
                                        color: '#334155', cursor: 'not-allowed', border: '1px solid #cbd5e1'
                                    }} disabled>Already Evaluated</button>
                                ) : (
                                    (() => {
                                        if (team.submissionState?.toUpperCase() === 'PENDING') {
                                            return (
                                                <button className="evaluate-btn" style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', border: '1px solid #cbd5e1' }} disabled>
                                                    Evaluate
                                                </button>
                                            );
                                        }

                                        if (timeStatus === 'CLOSED') {
                                            return (
                                                <button className="evaluate-btn" style={{ background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed', border: '1px solid #cbd5e1' }} disabled>
                                                    Grading Closed
                                                </button>
                                            );
                                        }

                                        if (team.submissionState === 'Not Submitted' || team.submissionState === 'MISSED_DEADLINE') {
                                            return (
                                                <button className="evaluate-btn" style={{ background: '#ef4444',
                                                    color: 'white', border: 'none'
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

            {previewRoundId && (
                <RoundDetailsModal roundId={previewRoundId} onClose={() => setPreviewRoundId(null)} />
            )}
        </div>
    );
};

export default EvaluatorDashboard;

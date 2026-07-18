import { useState, useEffect } from 'react';

import './JudgeResultReview.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1');

const JudgeResultReview = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [scoresNotPublished, setScoresNotPublished] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [scoreDetails, setScoreDetails] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const res = await fetch(`${API_BASE}/judge/result-review`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.status === 403) {
                    const err = await res.json().catch(() => ({}));
                    if (err.code === 'SCORES_NOT_PUBLISHED') {
                        setScoresNotPublished(true);
                        return;
                    }
                    throw new Error(err.error || 'Access denied');
                }
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to load result review data');
                }
                const data = await res.json();
                setDashboardData(data);
            } catch (e) {
                setError(e.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchTeamScoreDetail = async (team) => {
        setSelectedTeam(team);
        setScoreDetails(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`${API_BASE}/judge/team-score-details?teamId=${team.teamId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to load score details');
            }
            const data = await res.json();
            setScoreDetails(data);
        } catch (e) {
            setDetailError(e.message || 'Failed to load score details');
        } finally {
            setDetailLoading(false);
        }
    };

    const queue = dashboardData?.queue || [];
    const evaluatedTeams = queue.filter(t => t.submissionState === 'Evaluated' || t.score != null);

    return (
        <div className="jrr-page">
            <div className="jrr-container">
                <div className="jrr-header">
                    <div>
                        <h1 className="jrr-title">Result Review</h1>
                        <p className="jrr-subtitle">View the scores and feedback you submitted for each team after results are published.</p>
                    </div>
                    <div className="jrr-badge">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Read-Only View
                    </div>
                </div>

                {loading && (
                    <div className="jrr-loading">
                        <div className="jrr-spinner" />
                        <span>Loading result data...</span>
                    </div>
                )}

                {!loading && scoresNotPublished && (
                    <div className="jrr-locked-state">
                        <div className="jrr-lock-icon">
                            <svg width="52" height="52" fill="none" stroke="#94a3b8" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3>Scores Not Yet Published</h3>
                        <p>
                            The administrator has not published scores for this round yet.
                            Once published, you will be able to view the <strong>aggregated average scores</strong> across all judges for each team.
                        </p>
                        <div className="jrr-locked-note">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Scores are kept confidential until the admin officially publishes them to maintain fairness across all evaluators.
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div className="jrr-error">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                        {error}
                    </div>
                )}

                {!loading && !error && !scoresNotPublished && (
                    <>

                        {evaluatedTeams.length === 0 ? (
                            <div className="jrr-empty-full">
                                <svg width="52" height="52" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ marginBottom: 20 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                <h3>No Evaluated Teams Found</h3>
                                <p>No results are available yet, or you have not evaluated any teams in this contest.</p>
                            </div>
                        ) : (
                            <div className="jrr-layout">
                                <div className="jrr-team-list">
                                    {evaluatedTeams.map((team, idx) => (
                                        <div
                                            key={`${team.teamId}-${idx}`}
                                            className={`jrr-team-card ${selectedTeam?.teamId === team.teamId ? 'selected' : ''}`}
                                            onClick={() => fetchTeamScoreDetail(team)}
                                        >
                                            <div className="jrr-team-avatar">{(team.teamName || 'TM').substring(0, 2).toUpperCase()}</div>
                                            <div className="jrr-team-info">
                                                <div className="jrr-team-name">{team.teamName}</div>
                                                <div className="jrr-team-meta">
                                                </div>
                                            </div>
                                            <div className="jrr-team-score">
                                                {team.score != null ? (
                                                    <>
                                                        <span className="jrr-score-val">{Number(team.score).toFixed(2)}</span>
                                                        <span className="jrr-score-label">pts</span>
                                                    </>
                                                ) : (
                                                    <span className="jrr-score-pending">N/A</span>
                                                )}
                                            </div>
                                            <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    ))}
                                </div>

                                <div className="jrr-detail-panel">
                                    {!selectedTeam && (
                                        <div className="jrr-detail-placeholder">
                                            <svg width="48" height="48" fill="none" stroke="#e2e8f0" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <p>Select a team to view detailed scores</p>
                                        </div>
                                    )}

                                    {selectedTeam && (
                                        <>
                                            <div className="jrr-detail-header">
                                                <div>
                                                    <h2 className="jrr-detail-title">{selectedTeam.teamName}</h2>
                                                    <p className="jrr-detail-meta">{selectedTeam.trackName}</p>
                                                </div>
                                                {scoreDetails && (
                                                    <div className="jrr-total-score">
                                                        <span className="jrr-total-val">{scoreDetails.totalScore?.toFixed(2) ?? '—'}</span>
                                                        <span className="jrr-total-label">Overall Score</span>
                                                    </div>
                                                )}
                                            </div>

                                            {detailLoading && (
                                                <div className="jrr-loading">
                                                    <div className="jrr-spinner" />
                                                    <span>Loading score breakdown...</span>
                                                </div>
                                            )}

                                            {detailError && <div className="jrr-error">{detailError}</div>}

                                            {scoreDetails && !detailLoading && (
                                                <div className="jrr-rounds">
                                                    {(scoreDetails.rounds || []).map((round, ri) => (
                                                        <div key={ri} className="jrr-round-card">
                                                            <div className="jrr-round-header">
                                                                <div className="jrr-round-name">{round.roundName}</div>
                                                                <div className="jrr-round-meta">
                                                                    {round.totalScore != null && (
                                                                        <span className="jrr-round-score">{round.totalScore?.toFixed(2)} pts</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {(!round.detailedScores || round.detailedScores.length === 0) ? (
                                                                <p className="jrr-no-detail">No criteria scores available for this round.</p>
                                                            ) : (
                                                                <table className="jrr-table">
                                                                    <thead>
                                                                    <tr>
                                                                        <th>Criteria</th>
                                                                        <th>Weight</th>
                                                                        <th>Avg. Score</th>
                                                                        <th>Feedback</th>
                                                                    </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                    {round.detailedScores.map((d, di) => (
                                                                        <tr key={di}>
                                                                            <td className="jrr-td-criteria">{d.criteriaName}</td>
                                                                            <td className="jrr-td-center">{d.weight != null ? `${d.weight}%` : '—'}</td>
                                                                            <td className="jrr-td-center jrr-td-points">{d.pointsAwarded ?? '—'}</td>
                                                                            <td className="jrr-td-feedback">
                                                                                {d.feedback ? (
                                                                                    <span style={{ whiteSpace: 'pre-wrap' }}>{d.feedback}</span>
                                                                                ) : (
                                                                                    <em style={{ color: '#94a3b8' }}>No feedback</em>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    </tbody>
                                                                </table>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </>

                )}
            </div>
        </div>
    );
};

export default JudgeResultReview;

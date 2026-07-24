import { useState, useEffect } from 'react';
import './MentorResultReview.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1');

const MentorResultReview = () => {
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [scoreDetails, setScoreDetails] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    useEffect(() => {
        const fetchTeams = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const res = await fetch(`${API_BASE}/mentor/assigned-teams`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to load assigned teams');
                }
                const data = await res.json();
                // Data is array of MentorTrackResponse objects, each with allocatedTeams
                // Only include teams from ACTIVE contests
                const allTeams = (Array.isArray(data) ? data : [])
                    .filter(track => track.contestStatus === 'ACTIVED')
                    .flatMap(track =>
                        (track.allocatedTeams || []).map(t => ({
                            ...t,
                            contestName: track.contestName
                        }))
                    );
                setAssignedTeams(allTeams);
            } catch (e) {
                setError(e.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };
        fetchTeams();
    }, []);

    const fetchTeamScore = async (team) => {
        setSelectedTeam(team);
        setScoreDetails(null);
        setDetailError('');
        setDetailLoading(true);
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`${API_BASE}/mentor/team-score-details?teamId=${team.teamId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Scores are not yet available for this team.');
            }
            const data = await res.json();
            setScoreDetails(data);
        } catch (e) {
            setDetailError(e.message || 'Failed to load score details');
        } finally {
            setDetailLoading(false);
        }
    };

    const isScorePublished = (team) => {
        const t = team.reviewCalibrationAt;
        return t && new Date(t) <= new Date();
    };

    const isResultPublished = (team) => {
        const t = team.publishResultAt;
        return t && new Date(t) <= new Date();
    };

    // Show teams where scores are published (Stage 1) but results are NOT yet published (Stage 2)
    // Once admin clicks Publish Result, scores move to the Leaderboard — no need to show here
    const publishedTeams = assignedTeams.filter(t => {
        if (typeof t.scoreReviewActive === 'boolean') {
            return t.scoreReviewActive;
        }
        return isScorePublished(t) && !isResultPublished(t);
    });

    return (
        <div className="mrr-page">
            <div className="mrr-container">
                <div className="mrr-header">
                    <div>
                        <h1 className="mrr-title">Result Review</h1>
                        <p className="mrr-subtitle">View detailed evaluation scores for teams you have been assigned to mentor.</p>
                    </div>
                    <div className="mrr-badge">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Read-Only View
                    </div>
                </div>

                {loading && (
                    <div className="mrr-loading">
                        <div className="mrr-spinner" />
                        <span>Loading teams...</span>
                    </div>
                )}

                {error && !loading && (
                    <div className="mrr-error">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <>
                        <div className="mrr-info-banner">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Showing teams where scores have been published. Click a team to see the full score breakdown.
                        </div>

                        {publishedTeams.length === 0 ? (
                            <div className="mrr-empty-full">
                                <svg width="52" height="52" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24" style={{ marginBottom: 20 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <h3>Scores Not Yet Published</h3>
                                <p>The administrator has not published scores yet. Check back later.</p>
                            </div>
                        ) : (
                            <div className="mrr-layout">
                                <div className="mrr-team-list">
                                    {publishedTeams.map((team, idx) => (
                                        <div
                                            key={`${team.teamId}-${idx}`}
                                            className={`mrr-team-card ${selectedTeam?.teamId === team.teamId ? 'selected' : ''}`}
                                            onClick={() => fetchTeamScore(team)}
                                        >
                                            <div className="mrr-team-avatar">{(team.teamName || 'TM').substring(0, 2).toUpperCase()}</div>
                                            <div className="mrr-team-info">
                                                <div className="mrr-team-name">{team.teamName}</div>
                                                <div className="mrr-team-meta">
                                                    <span className="mrr-contest">{team.contestName}</span>
                                                    {isResultPublished(team) && (
                                                        <span className="mrr-result-badge">Results Published</span>
                                                    )}
                                                </div>
                                            </div>
                                            <svg width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </div>
                                    ))}
                                </div>

                                <div className="mrr-detail-panel">
                                    {!selectedTeam && (
                                        <div className="mrr-detail-placeholder">
                                            <svg width="48" height="48" fill="none" stroke="#e2e8f0" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                            <p>Select a team to view detailed scores</p>
                                        </div>
                                    )}

                                    {selectedTeam && (
                                        <>
                                            <div className="mrr-detail-header">
                                                <div>
                                                    <h2 className="mrr-detail-title">{selectedTeam.teamName}</h2>
                                                    <p className="mrr-detail-meta">{selectedTeam.contestName}</p>
                                                </div>
                                                {scoreDetails && (
                                                    <div className="mrr-total-score">
                                                        <span className="mrr-total-val">{scoreDetails.totalScore?.toFixed(2) ?? '—'}</span>
                                                        <span className="mrr-total-label">Overall Score</span>
                                                    </div>
                                                )}
                                            </div>

                                            {detailLoading && (
                                                <div className="mrr-loading">
                                                    <div className="mrr-spinner" />
                                                    <span>Loading scores...</span>
                                                </div>
                                            )}

                                            {detailError && (
                                                <div className="mrr-error" style={{ marginTop: 16 }}>
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                                                    {detailError}
                                                </div>
                                            )}

                                            {scoreDetails && !detailLoading && (
                                                <div className="mrr-rounds">
                                                    {(scoreDetails.rounds || []).map((round, ri) => (
                                                        <div key={ri} className="mrr-round-card">
                                                            <div className="mrr-round-header">
                                                                <div className="mrr-round-name">{round.roundName}</div>
                                                                <div className="mrr-round-meta">
                                                                    {round.totalScore != null && (
                                                                        <span className="mrr-round-score">{round.totalScore?.toFixed(2)} pts</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {(!round.detailedScores || round.detailedScores.length === 0) ? (
                                                                <p className="mrr-no-detail">No criteria scores available for this round.</p>
                                                            ) : (
                                                                <table className="mrr-table">
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
                                                                                <td className="mrr-td-criteria">{d.criteriaName}</td>
                                                                                <td className="mrr-td-center">{d.weight != null ? `${d.weight}%` : '—'}</td>
                                                                                <td className="mrr-td-center mrr-td-points">{d.pointsAwarded ?? '—'}</td>
                                                                                <td className="mrr-td-feedback">
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

export default MentorResultReview;

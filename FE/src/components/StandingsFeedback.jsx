import { useState, useEffect } from 'react';
import './StandingsFeedback.css';
import NavbarStudent from './NavbarStudent';

const API_STUDENT = 'http://localhost:8080/api/v1/student';
const MOCK_DATA_URL = '/testFE.json';

const toScoreNumber = (value) => {
    const score = Number(value);
    return Number.isFinite(score) ? score : 0;
};

const cleanCriteriaName = (name) => {
    return String(name || 'Criterion')
        .replace(/Feedback Summary from the Judges/gi, 'Feedback Summary')
        .replace(/Giám\s*Khảo\s*\d+/gi, '')
        .replace(/Giam\s*Khao\s*\d+/gi, '')
        .replace(/Judge\s*\d+/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
};

const getJudgeLabel = (score, index) => {
    if (score.judgeOrder) return `Judge ${score.judgeOrder}`;
    if (score.judgeNumber) return `Judge ${score.judgeNumber}`;

    const text = `${score.criteriaName || ''} ${score.criterionName || ''} ${score.judgeName || ''}`;

    const match =
        text.match(/giám\s*khảo\s*(\d+)/i) ||
        text.match(/giam\s*khao\s*(\d+)/i) ||
        text.match(/judge\s*(\d+)/i);

    return match ? `Judge ${match[1]}` : `Judge ${index + 1}`;
};

const getCriteriaWeight = (round, score) => {
    const criteriaList =
        round.criteria ||
        round.rubricCriteria ||
        round.roundCriteria ||
        round.rubric?.criteria ||
        round.rubricTemplate?.criteria ||
        [];

    const scoreCriteriaId =
        score.criteriaId ||
        score.criterionId ||
        score.rubricCriterionId ||
        score.id;

    const scoreCriteriaName = cleanCriteriaName(
        score.criteriaName ||
        score.criterionName ||
        score.name
    ).toLowerCase();

    const matched = criteriaList.find(criteria => {
        const criteriaId =
            criteria.id ||
            criteria.criteriaId ||
            criteria.criterionId ||
            criteria.rubricCriterionId;

        const criteriaName = cleanCriteriaName(
            criteria.criteriaName ||
            criteria.criterionName ||
            criteria.name ||
            criteria.title
        ).toLowerCase();

        return (
            String(criteriaId) === String(scoreCriteriaId) ||
            criteriaName === scoreCriteriaName
        );
    });

    const weight =
        matched?.weight ??
        matched?.weightPercent ??
        matched?.percentage ??
        score.weight ??
        score.weightPercent ??
        0;

    const numberWeight = Number(weight);

    if (!Number.isFinite(numberWeight)) {
        return 0;
    }

    return numberWeight > 0 && numberWeight < 1
        ? numberWeight * 100
        : numberWeight;
};

const normalizeScoreData = (payload) => {
    const rawData = payload?.data || payload;

    if (!rawData) {
        return null;
    }

    const rootCriteria =
        rawData.criteria ||
        rawData.rubricCriteria ||
        rawData.roundCriteria ||
        rawData.rubric?.criteria ||
        rawData.rubricTemplate?.criteria ||
        [];

    const fallbackRound = {
        roundName: rawData.roundName || 'Round',
        publishResultAt: rawData.publishResultAt || rawData.resultPublishAt || null,
        resultPublished: rawData.resultPublished,
        totalScore: toScoreNumber(rawData.totalScore),
        detailedScores: Array.isArray(rawData.detailedScores) ? rawData.detailedScores : [],
        criteria: rootCriteria,
    };

    const rounds = Array.isArray(rawData.rounds)
        ? rawData.rounds.map(round => ({
            ...round,
            roundName: round.roundName || round.name || 'Round',
            publishResultAt: round.publishResultAt || round.resultPublishAt || round.publishAt || null,
            resultPublished: typeof round.resultPublished === 'boolean' ? round.resultPublished : undefined,
            totalScore: round.totalScore == null && round.score == null ? null : toScoreNumber(round.totalScore ?? round.score),
            detailedScores: Array.isArray(round.detailedScores) ? round.detailedScores : [],
            criteria:
                round.criteria ||
                round.rubricCriteria ||
                round.roundCriteria ||
                round.rubric?.criteria ||
                round.rubricTemplate?.criteria ||
                rootCriteria,
        }))
        : [fallbackRound];

    return {
        ...rawData,
        teamName: rawData.teamName || 'Unknown Team',
        projectName: rawData.projectName || 'Untitled Project',
        totalScore: toScoreNumber(rawData.totalScore ?? rounds[0]?.totalScore),
        rounds,
    };
};

const StandingsFeedback = () => {
    const [scoreData, setScoreData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDetail, setSelectedDetail] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const applyScoreData = (data) => {
            const normalized = normalizeScoreData(data);

            if (!normalized) {
                throw new Error('Score data not found');
            }

            if (!cancelled) {
                setScoreData(normalized);
                setError('');
            }
        };

        const fetchMockScore = async () => {
            const response = await fetch(MOCK_DATA_URL);

            if (!response.ok) {
                throw new Error('Cannot load testFE.json');
            }

            const mock = await response.json();
            applyScoreData(mock.standingsFeedback);
        };

        const fetchScore = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch(`${API_STUDENT}/team-score-details`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load team score details');
                }

                applyScoreData(data);
            } catch (err) {
                console.warn('Team score API unavailable, use mock:', err.message);

                try {
                    await fetchMockScore();
                } catch (mockError) {
                    console.warn('Standings feedback mock unavailable:', mockError.message);

                    if (!cancelled) {
                        setError('Could not load result data.');
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchScore();

        return () => {
            cancelled = true;
        };
    }, []);

    const rounds = scoreData?.rounds || [];
    const unpublishedRound = rounds.find(round => {
        if (round.resultPublished === false) return true;

        const publishTime = round.publishResultAt ? new Date(round.publishResultAt).getTime() : 0;
        return publishTime !== 0 && Date.now() < publishTime;
    });

    const publishTimeText = unpublishedRound?.publishResultAt
        ? new Date(unpublishedRound.publishResultAt).toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        : '';

    const shouldShowPrivateResults =
        !isLoading &&
        !error &&
        scoreData &&
        (Boolean(unpublishedRound) || rounds.length === 0);

    return (
        <div className="standings-container">
            <NavbarStudent />

            <div className="standings-content">
                {shouldShowPrivateResults ? (
                    <div className="results-empty-state">
                        <div className="waiting-result-icon">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1>Scores are not public yet.</h1>
                        <p>
                            The judging scores have not been published.
                            {publishTimeText && (
                                <> Results will be available on <strong>{publishTimeText}</strong>.</>
                            )}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="standings-header">
                            <h1 className="standings-title">Competition Standings & Feedback</h1>
                        </div>

                        <div className="my-result-card" style={{ marginTop: '20px' }}>
                            <div className="result-top" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                                <div className="result-info">
                                    <h3>My Team Result Summary</h3>
                                    <p>
                                        {scoreData
                                            ? `${scoreData.teamName} | Project: "${scoreData.projectName}"`
                                            : 'Loading result summary...'}
                                    </p>
                                </div>
                                <div className="score-display" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
                                    <div className="private-badge" style={{ alignSelf: 'flex-end', marginBottom: '8px' }}>
                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Private
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                const now = new Date().getTime();
                                const unpublishedRound = rounds.find(round => {
                                    if (round.resultPublished === false) return true;

                                    const publishTime = round.publishResultAt ? new Date(round.publishResultAt).getTime() : 0;
                                    return publishTime !== 0 && now < publishTime;
                                });
                                const publishTimeText = unpublishedRound?.publishResultAt
                                    ? new Date(unpublishedRound.publishResultAt).toLocaleString('en-US', {
                                        month: 'short',
                                        day: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : '';
                                const shouldShowPrivateResults =
                                    unpublishedRound ||
                                    (!isLoading && !error && scoreData && rounds.length === 0);

                                if (shouldShowPrivateResults) {
                                    return (
                                        <div className="waiting-result-card">
                                            <div className="waiting-result-icon">
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3>Scores are not public yet.</h3>
                                                <p>
                                                    The judging scores {unpublishedRound?.roundName ? `for ${unpublishedRound.roundName}` : 'for your team'} have not been published.
                                                    {publishTimeText && (
                                                        <> Results will be available on <strong>{publishTimeText}</strong>.</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Round</th>
                                                <th style={{ textAlign: 'center', padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Total Score</th>
                                                <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {isLoading ? (
                                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                                        Loading result data...
                                                    </td>
                                                </tr>
                                            ) : error ? (
                                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
                                                        {error}
                                                    </td>
                                                </tr>
                                            ) : rounds.length > 0 ? rounds.map((r, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '16px', fontWeight: '500', color: '#1e293b' }}>{r.roundName}</td>
                                                    <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold', color: '#0f172a' }}>
                                                        {r.totalScore == null ? 'Not public' : `${r.totalScore.toFixed(2)} / 100`}
                                                    </td>
                                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                                        <button
                                                            className="view-rubric-btn"
                                                            style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-block', float: 'right' }}
                                                            onClick={() => setSelectedDetail(r)}
                                                        >
                                                            View Detail
                                                        </button>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                                        No result data available yet.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                );
                            })()}
                        </div>
                    </>
                )}
            </div>

            {selectedDetail && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', borderRadius: '12px', width: '700px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Score Details - {selectedDetail.roundName || 'Round'}</h2>
                            <button onClick={() => setSelectedDetail(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {selectedDetail.detailedScores && selectedDetail.detailedScores.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', color: '#475569', fontSize: '12px', textTransform: 'uppercase' }}>
                                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '28%' }}>Criteria</th>
                                        <th style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '16%' }}>Judge</th>
                                        <th style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '14%' }}>Weight</th>
                                        <th style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '14%' }}>Points</th>
                                        <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '28%' }}>Feedback</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedDetail.detailedScores.map((score, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px', fontWeight: '500', color: '#1e293b', wordBreak: 'break-word' }}>
                                                {cleanCriteriaName(score.criteriaName || score.criterionName)}
                                            </td>

                                            <td style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>
                                                {getJudgeLabel(score, i)}
                                            </td>

                                            <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                                {getCriteriaWeight(selectedDetail, score)}%
                                            </td>

                                            <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
                                                {score.pointsAwarded ?? score.points ?? score.score ?? 0}
                                            </td>

                                            <td style={{ padding: '12px', color: '#475569', fontSize: '13px', wordBreak: 'break-word' }}>
                                                {score.feedback || 'No feedback provided.'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                                No detailed scores available yet.
                            </div>
                        )}

                        <div style={{ marginTop: '24px', textAlign: 'right' }}>
                            <button onClick={() => setSelectedDetail(null)} className="ph-btn-primary" style={{ padding: '8px 24px', borderRadius: '6px' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StandingsFeedback;
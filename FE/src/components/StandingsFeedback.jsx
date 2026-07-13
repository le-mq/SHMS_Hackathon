import { useState, useEffect } from 'react';
import './StandingsFeedback.css';

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
        totalScore: rawData.totalScore == null && rawData.score == null && rawData.finalScore == null && rawData.averageScore == null ? null : toScoreNumber(rawData.totalScore ?? rawData.score ?? rawData.finalScore ?? rawData.averageScore),
        detailedScores: Array.isArray(rawData.detailedScores) ? rawData.detailedScores : [],
        criteria: rootCriteria,
    };

    const rounds = Array.isArray(rawData.rounds)
        ? rawData.rounds.map(round => ({
            ...round,
            roundName: round.roundName || round.name || 'Round',
            publishResultAt: round.publishResultAt || round.resultPublishAt || round.publishAt || null,
            resultPublished: typeof round.resultPublished === 'boolean' ? round.resultPublished : undefined,
            totalScore: round.totalScore == null && round.score == null && round.finalScore == null && round.averageScore == null ? null : toScoreNumber(round.totalScore ?? round.score ?? round.finalScore ?? round.averageScore),
            hasSubmission: round.hasSubmission,
            isGraded: round.isGraded,
            detailedScores: Array.isArray(round.detailedScores) ? round.detailedScores : [],
            criteria:
                round.criteria ||
                round.rubricCriteria ||
                round.roundCriteria ||
                round.rubric?.criteria ||
                round.rubricTemplate?.criteria ||
                rootCriteria,
        }))
            .sort((a, b) => {
                const timeA = a.publishResultAt ? new Date(a.publishResultAt).getTime() : 0;
                const timeB = b.publishResultAt ? new Date(b.publishResultAt).getTime() : 0;
                const now = Date.now();
                const isPubA = a.totalScore != null && (a.resultPublished === true || (a.resultPublished !== false && (timeA === 0 || now >= timeA)));
                const isPubB = b.totalScore != null && (b.resultPublished === true || (b.resultPublished !== false && (timeB === 0 || now >= timeB)));
                if (isPubA && !isPubB) return -1;
                if (!isPubA && isPubB) return 1;
                if (isPubA && isPubB) {
                    return timeB - timeA;
                }
                return timeA - timeB;
            })
        : [fallbackRound];

    return {
        ...rawData,
        teamName: rawData.teamName || 'Unknown Team',
        projectName: rawData.projectName || 'Untitled Project',
        totalScore: toScoreNumber(rawData.totalScore ?? rawData.score ?? rawData.finalScore ?? rawData.averageScore ?? rounds[0]?.totalScore),
        rounds,
    };
};

const StandingsFeedback = () => {
    // List view states
    const [joinedCompetitions, setJoinedCompetitions] = useState([]);
    const [selectedCompetition, setSelectedCompetition] = useState(null);
    const [isCompLoading, setIsCompLoading] = useState(true);

    // Detail view states
    const [scoreData, setScoreData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [selectedResultRound, setSelectedResultRound] = useState(null);
    const [publicLeaderboards, setPublicLeaderboards] = useState([]);

    // Fetch joined competitions and public leaderboards on mount
    useEffect(() => {
        let cancelled = false;

        const loadCompetitions = async () => {
            const sortLogic = (a, b) => {
                const statusA = String(a.data?.status || '').toUpperCase();
                const statusB = String(b.data?.status || '').toUpperCase();
                if (statusA === 'APPROVED' && statusB !== 'APPROVED') return -1;
                if (statusB === 'APPROVED' && statusA !== 'APPROVED') return 1;

                const dateA = a.contest?.competitionStart ? new Date(a.contest.competitionStart).getTime() : 0;
                const dateB = b.contest?.competitionStart ? new Date(b.contest.competitionStart).getTime() : 0;
                if (dateA !== dateB && !isNaN(dateA) && !isNaN(dateB)) return dateB - dateA;
                return (parseInt(b.contest?.id) || 0) - (parseInt(a.contest?.id) || 0);
            };

            try {
                setIsCompLoading(true);
                const token = localStorage.getItem('shms_token');
                // Fetch all contests
                const contestsRes = await fetch(`${API_STUDENT}/contests`, { headers: { Authorization: `Bearer ${token}` } });
                const contestsJson = await contestsRes.json().catch(() => ({}));
                const contestList = Array.isArray(contestsJson) ? contestsJson : contestsJson.data || [];
                // Check team status for each
                const statusResults = await Promise.all(
                    contestList.map(async (contest) => {
                        try {
                            const res = await fetch(`${API_STUDENT}/teams/status?contestId=${contest.id}`, { headers: { Authorization: `Bearer ${token}` } });
                            const data = await res.json();
                            return { contest, data };
                        } catch { return null; }
                    })
                );
                const validTeams = statusResults
                    .filter(res => res && res.data && !res.data.error && res.data.status !== 'NO TEAM')
                    .sort(sortLogic);
                if (!cancelled) {
                    setJoinedCompetitions(validTeams);
                }
            } catch (err) {
                console.warn('Failed to fetch competitions, using mock data');
                // Mock logic for competitions
                try {
                    const localRes = await fetch(MOCK_DATA_URL);
                    const localJson = await localRes.json();
                    const mockContests = localJson.teamStatusContests?.data || [];
                    const mockTeamsByContest = localJson.teamStatusByContest || {};
                    let mockJoinedTeams = mockContests
                        .map(contest => ({ contest, data: mockTeamsByContest[String(contest.id)] }))
                        .filter(item => item.data && item.data.status !== 'NO TEAM');

                    if (mockJoinedTeams.length === 0 && mockContests.length > 0 && localJson.teamStatus?.data) {
                        mockJoinedTeams = [{ contest: mockContests[0], data: localJson.teamStatus.data }];
                    }
                    if (!cancelled) setJoinedCompetitions(mockJoinedTeams.sort(sortLogic));
                } catch (mockError) {
                    if (!cancelled) setError('Could not load competitions.');
                }
            } finally {
                if (!cancelled) setIsCompLoading(false);
            }
        };

        const loadLeaderboards = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/v1/public/leaderboards');
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setPublicLeaderboards(data || []);
                }
            } catch (err) {
                try {
                    const localRes = await fetch(MOCK_DATA_URL);
                    const localJson = await localRes.json();
                    if (!cancelled) setPublicLeaderboards(localJson.leaderboard?.data || []);
                } catch (e) { }
            }
        };
        loadCompetitions();
        loadLeaderboards();
        return () => { cancelled = true; };
    }, []);

    // Fetch score data when a competition is selected
    useEffect(() => {
        setSelectedResultRound(null);
        setSelectedDetail(null);

        if (!selectedCompetition) {
            setScoreData(null);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        setError('');
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
        const fetchScore = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const url = selectedCompetition.contest?.id
                    ? `${API_STUDENT}/team-score-details?contestId=${selectedCompetition.contest.id}`
                    : `${API_STUDENT}/team-score-details`;
                const response = await fetch(url, {
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
                    const response = await fetch(MOCK_DATA_URL);
                    if (!response.ok) {
                        throw new Error('Cannot load testFE.json');
                    }
                    const mock = await response.json();
                    applyScoreData(mock.standingsFeedback);
                } catch (mockError) {
                    console.warn('Standings feedback mock unavailable:', mockError.message);
                    if (!cancelled) setError('Could not load result data.');
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchScore();
        return () => { cancelled = true; };
    }, [selectedCompetition]);
    const rounds = scoreData?.rounds || [];
    return (
        <div className="standings-container">
            <div className="standings-content">
                  {!selectedCompetition ? (
                      <>
                          {!isCompLoading && (
                              <div className="standings-header">
                                  <h1 className="standings-title">Competition Results</h1>
                              </div>
                          )}
                          {isCompLoading ? (
                            <div className="global-loading">
                                <div className="global-spinner"></div>
                                <span>Loading competitions...</span>
                            </div>
                        ) : joinedCompetitions.length > 0 ? (
                            <div className="results-grid">
                                {joinedCompetitions.map((item, idx) => {
                                    const c = item.contest;
                                    const statusClass = (c?.status || 'UNKNOWN').toLowerCase().replace(/\s+/g, '-');
                                    return (
                                        <div key={idx} className={`result-comp-card result-comp-card-${statusClass}`}>
                                            <div className="result-comp-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h3 className="result-comp-title" style={{ margin: 0, flex: 1, paddingRight: '12px' }}>{c?.name || 'Unknown Competition'}</h3>
                                                <span className={`team-badge ${statusClass}`}>
                                                    <div className="team-badge-dot"></div>
                                                    {c?.status || 'UNKNOWN'}
                                                </span>
                                            </div>
                                            <div style={{ marginTop: '14px', fontSize: '15px', color: '#334155' }}>
                                                Team: <strong style={{ color: '#0f172a', fontSize: '16px' }}>{item?.data?.teamName || 'Unknown'}</strong>
                                            </div>
                                            <div className="result-comp-actions">
                                                <button
                                                    className="ph-btn-primary"
                                                    style={{
                                                        padding: '8px 16px',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#2563eb',
                                                        color: 'white',
                                                        border: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontWeight: '600'
                                                    }}
                                                    onClick={() => setSelectedCompetition(item)}
                                                >View Details
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="results-empty-state" style={{ marginTop: '24px' }}>
                                <p>You have not joined any competitions yet.</p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <button className="back-btn" onClick={() => setSelectedCompetition(null)}>
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Competition Results
                        </button>
                        <div className="standings-header">
                            <h1 className="standings-title">{selectedCompetition?.contest?.name || 'Competition Standings & Feedback'}</h1>
                        </div>
                        <div className="my-result-card" style={{ marginTop: '20px' }}>
                            <div className="result-top" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                                <div className="result-info">
                                    <h3>My Team Result Summary</h3>
                                    <p style={{ fontSize: '16px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>
                                        Team: {selectedCompetition?.data?.teamName || scoreData?.teamName || 'Unknown Team'}
                                    </p>
                                </div>
                            </div>

                            {(() => {
                                const shouldShowEmpty = !isLoading && !error && scoreData && rounds.length === 0;
                                if (shouldShowEmpty) {
                                    return (
                                        <div className="waiting-result-card">
                                            <div className="waiting-result-icon">
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3>No Results Found</h3>
                                                <p>There are no result records available for your team in this competition.</p>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div style={{ marginTop: '16px' }}>
                                        {isLoading ? (
                                            <div className="global-loading">
                                                <div className="global-spinner"></div>
                                                <span>Loading result data...</span>
                                            </div>
                                        ) : error ? (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
                                                {error}
                                            </div>
                                        ) : rounds.length > 0 ? (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                                    {rounds.map((r, idx) => {
                                                        const nowTime = new Date().getTime();
                                                        const pTime = r.publishResultAt ? new Date(r.publishResultAt).getTime() : 0;
                                                        const myTeamName = selectedCompetition?.data?.teamName || scoreData?.teamName;
                                                        const lbEntry = publicLeaderboards.find(lb => String(lb.contestId) === String(selectedCompetition?.contest?.id) && lb.roundName === r.roundName && lb.teamName === myTeamName);
                                                        const isPublishedOnLeaderboard = !!lbEntry;
                                                        const isPublished = r.resultPublished === true || isPublishedOnLeaderboard || (r.resultPublished !== false && (pTime === 0 || nowTime >= pTime));
                                                        const baseEffectiveScore1 = r.totalScore != null ? r.totalScore : (lbEntry ? lbEntry.finalScore : null);
                                                        const effectiveScore = (baseEffectiveScore1 == null && r.qualificationStatus === 'ELIMINATED') ? 0 : baseEffectiveScore1;
                                                        const isAvailable = isPublished && effectiveScore != null;
                                                        const isEliminated = r.qualificationStatus === 'ELIMINATED' || (lbEntry && lbEntry.qualificationStatus === 'ELIMINATED');
                                                        const isSelected = selectedResultRound === r;
                                                        const bgColor = isEliminated ? (isSelected ? '#fecaca' : '#fee2e2') : (isAvailable ? (isSelected ? '#bbf7d0' : '#dcfce7') : '#f1f5f9');
                                                        const borderColor = isEliminated ? '#ef4444' : (isAvailable ? '#22c55e' : '#cbd5e1');
                                                        const textColor = isEliminated ? '#991b1b' : (isAvailable ? '#166534' : '#64748b');
                                                        return (
                                                            <div
                                                                key={idx}
                                                                onClick={() => setSelectedResultRound(r)}
                                                                style={{
                                                                    background: bgColor,
                                                                    border: `2px solid ${isSelected ? (isAvailable ? '#16a34a' : '#94a3b8') : borderColor}`,
                                                                    borderRadius: '8px',
                                                                    padding: '16px',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'center',
                                                                    fontWeight: '600',
                                                                    color: textColor,
                                                                    transition: 'all 0.2s',
                                                                    boxShadow: isSelected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none'
                                                                }}
                                                            >{r.roundName}</div>
                                                        );
                                                    })}
                                                </div>

                                                {selectedResultRound && (
                                                    <div style={{ padding: '32px', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden' }}>
                                                        <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                                                        <div style={{ position: 'relative', zIndex: 1 }}>
                                                            {(() => {
                                                                const nowTime = new Date().getTime();
                                                                const pTime = selectedResultRound.publishResultAt ? new Date(selectedResultRound.publishResultAt).getTime() : 0;
                                                                const myTeamName = selectedCompetition?.data?.teamName || scoreData?.teamName;
                                                                const lbEntry = publicLeaderboards.find(lb => String(lb.contestId) === String(selectedCompetition?.contest?.id) && lb.roundName === selectedResultRound.roundName && lb.teamName === myTeamName);
                                                                const isPublishedOnLeaderboard = !!lbEntry;
                                                                const isPublished = selectedResultRound.resultPublished === true || isPublishedOnLeaderboard || (selectedResultRound.resultPublished !== false && (pTime === 0 || nowTime >= pTime));
                                                                const baseEffectiveScore = selectedResultRound.totalScore != null ? selectedResultRound.totalScore : (lbEntry ? lbEntry.finalScore : null);
                                                                const effectiveScore = (baseEffectiveScore == null && selectedResultRound.qualificationStatus === 'ELIMINATED') ? 0 : baseEffectiveScore;

                                                                if (!isPublished) {
                                                                    return (
                                                                        <div style={{ textAlign: 'center', padding: '30px', background: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                                            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
                                                                                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                            </div>
                                                                            <div style={{ color: '#64748b', fontSize: '18px', fontWeight: '600' }}>Scores are not public yet</div>
                                                                            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '8px' }}>The results for this round will be revealed later.</p>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                    <>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <div>
                                                                                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                                                    {selectedResultRound.roundName} Score
                                                                                </p>
                                                                                {effectiveScore == null ? (
                                                                                    (selectedResultRound.qualificationStatus === 'ELIMINATED' || (scoreData?.rounds?.findIndex(r => r === selectedResultRound) > 0 && scoreData.rounds.slice(0, scoreData.rounds.findIndex(r => r === selectedResultRound)).some(r => r.totalScore === 0 || r.qualificationStatus === 'ELIMINATED'))) ? (
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                                                                                            <div style={{ padding: '10px', background: '#fef2f2', borderRadius: '50%', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                            </div>
                                                                                            <div>
                                                                                                <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold' }}>Eliminated</div>
                                                                                                <div style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#b91c1c' }}>Your team did not qualify for this round.</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : selectedResultRound.hasSubmission && selectedResultRound.isGraded === false ? (
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                                                                                            <div style={{ padding: '10px', background: '#fffbeb', borderRadius: '50%', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                            </div>
                                                                                            <div>
                                                                                                <div style={{ color: '#d97706', fontSize: '18px', fontWeight: 'bold' }}>Pending Evaluation</div>
                                                                                                <div style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#92400e' }}>Your submission is currently being graded by judges.</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                                                                                            <div style={{ padding: '10px', background: '#f1f5f9', borderRadius: '50%', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                                                            </div>
                                                                                            <div>
                                                                                                <div style={{ color: '#475569', fontSize: '18px', fontWeight: 'bold' }}>Not Public</div>
                                                                                                <div style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>The score for this round is not available yet.</div>
                                                                                            </div>
                                                                                        </div>
                                                                                    )
                                                                                ) : (
                                                                                    <div>
                                                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                                                            <span style={{ fontSize: '48px', fontWeight: '800', background: 'linear-gradient(90deg, #1e40af, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: '1' }}>
                                                                                                {effectiveScore.toFixed(2)}
                                                                                            </span>
                                                                                            <span style={{ fontSize: '20px', fontWeight: '600', color: '#94a3b8' }}>/ 100</span>
                                                                                        </div>
                                                                                        {selectedResultRound.qualificationStatus === 'QUALIFIED' ? (
                                                                                            <div style={{ display: 'inline-block', marginTop: '12px', padding: '6px 12px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                                                                                                Qualified
                                                                                            </div>
                                                                                        ) : (effectiveScore === 0 || selectedResultRound.qualificationStatus === 'ELIMINATED') ? (
                                                                                            <div style={{ display: 'inline-block', marginTop: '12px', padding: '6px 12px', background: '#fef2f2', color: '#ef4444', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>
                                                                                                {selectedResultRound.hasSubmission === false ? `Eliminated - No submission` : `Eliminated`}
                                                                                            </div>
                                                                                        ) : null}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <button
                                                                                className="view-rubric-btn"
                                                                                style={{
                                                                                    padding: '12px 24px',
                                                                                    fontSize: '15px',
                                                                                    fontWeight: '600',
                                                                                    borderRadius: '8px',
                                                                                    background: '#1e293b',
                                                                                    color: 'white',
                                                                                    border: 'none',
                                                                                    cursor: 'pointer',
                                                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                                                    transition: 'all 0.2s ease',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '8px'
                                                                                }}
                                                                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
                                                                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; }}
                                                                                onClick={() => setSelectedDetail(selectedResultRound)}
                                                                            >
                                                                                View Full Detail
                                                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                                            </button>
                                                                        </div>

                                                                        {effectiveScore != null && (
                                                                            <div style={{ marginTop: '24px', width: '100%', background: '#e2e8f0', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
                                                                                <div style={{
                                                                                    height: '100%',
                                                                                    width: `${effectiveScore}%`,
                                                                                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                                                                                    borderRadius: '999px',
                                                                                    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                                                                                }}></div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                                                No result data available yet.
                                            </div>
                                        )}
                                    </div>
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
                                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '35%' }}>Criteria</th>
                                    <th style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '15%' }}>Weight</th>
                                    <th style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '15%' }}>Points</th>
                                    <th style={{ textAlign: 'left', padding: '12px', borderBottom: '1px solid #e2e8f0', width: '35%' }}>Feedback</th>
                                </tr>
                                </thead>
                                <tbody>
                                {selectedDetail.detailedScores.map((score, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '12px', fontWeight: '500', color: '#1e293b', wordBreak: 'break-word' }}>
                                            {cleanCriteriaName(score.criteriaName || score.criterionName)}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>
                                            {getCriteriaWeight(selectedDetail, score)}%
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
                                            {score.pointsAwarded ?? score.points ?? score.score ?? 0}
                                        </td>
                                        <td style={{ padding: '12px', color: '#475569', fontSize: '13px', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                                            {score.feedback || 'No feedback provided.'}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : selectedDetail.hasSubmission === false ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#ef4444', fontWeight: '600', fontSize: '16px' }}>
                                Did not submit before deadline.
                            </div>
                        ) : selectedDetail.qualificationStatus === 'ELIMINATED' ? (
                            <div style={{ padding: '40px 0', textAlign: 'center', color: '#ef4444', fontWeight: '600', fontSize: '16px' }}>
                                Eliminated. Your team received 0 points for this round.
                            </div>
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
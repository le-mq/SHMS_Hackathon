import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './RankingsConsole.css';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/admin";

const formatDate = (dateStr) => {
    if (!dateStr) return "--";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return dateStr;
    }
};

const formatDateOnly = (dateStr) => {
    if (!dateStr) return "--";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    } catch {
        return dateStr;
    }
};

const parseRequirements = (reqString) => {
    if (!reqString || reqString === '[]') return [];
    try {
        const formatted = reqString.replace(/'/g, '"');
        const parsed = JSON.parse(formatted);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    try {
        const parsed = JSON.parse(reqString);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) { }
    if (typeof reqString === 'string') {
        return reqString.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

const getRoundIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('final') && !n.includes('semi')) return '👑';
    if (n.includes('semi')) return '⚡';
    if (n.includes('qualification') || n.includes('screening') || n.includes('idea')) return '🏆';
    return '📅';
};

const getRoundStatus = (round) => {
    const now = new Date();
    const closeDate = round.publishResultAt ? new Date(round.publishResultAt) : null;
    const isPublishInFuture = closeDate && closeDate > now;

    if ((round.state === 'CLOSED' || round.status === 'CLOSED') && !isPublishInFuture) {
        return 'CLOSED';
    }

    const openDate = round.submissionOpen ? new Date(round.submissionOpen) : null;

    if (closeDate && now > closeDate) return "CLOSED";
    if (openDate && now < openDate) return "UPCOMING";
    return "ACTIVED";
};

const enrichRound = (r) => {
    const totalTeams = Number(r.totalTeams) || 0;
    const submittedTeams = Number(r.submittedTeams) || 0;

    const enriched = {
        ...r,
        submissionOpen: r.submissionOpen || "",
        submissionDeadline: r.submissionDeadline || "",
        totalTeams,
        submittedTeams,
    };

    enriched.status = getRoundStatus(enriched);

    enriched.submissionProgress = totalTeams > 0
        ? Math.round((submittedTeams / totalTeams) * 100)
        : 0;

    return enriched;
};

const getLiveStatus = (c) => {
    if (!c) return 'ACTIVE';
    const s = c.status?.toUpperCase() || 'ACTIVE';
    if (s === 'CLOSED' || s === 'CANCELLED' || s === 'CANCELED') return 'CLOSED';
    if (s === 'UPCOMING') return 'UPCOMING';
    return 'ACTIVE';
};

const RankingsConsole = () => {
    const [activeTab, setActiveTab] = useState('COMPILATION');
    const [viewMode, setViewMode] = useState('ROUNDS_LIST');
    const [topN, setTopN] = useState(1);
    const [currentCompiledTopN, setCurrentCompiledTopN] = useState(1);
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState(() => sessionStorage.getItem('rankingsSelectedContestId') || '');
    const [contestSearchQuery, setContestSearchQuery] = useState('');
    const [contestStatusFilter, setContestStatusFilter] = useState('ALL');
    const [selectedRoundId, setSelectedRoundId] = useState('');
    const [contestDetails, setContestDetails] = useState(null);

    const [rounds, setRounds] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [readinessData, setReadinessData] = useState({
        summary: { totalTeams: 0, avgScore: 0.0, scoreRange: '0-0', bars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        evaluators: [],
        allReady: false
    });

    const [roundProgress, setRoundProgress] = useState(null);
    const [submissionFilter, setSubmissionFilter] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewSubmissionModal, setViewSubmissionModal] = useState({ isOpen: false, team: null });
    const [isRevalModalOpen, setIsRevalModalOpen] = useState(false);
    const [revalData, setRevalData] = useState({ teamId: '', teamName: '', reason: '' });
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);

    const enrichedRounds = useMemo(() => {
        return rounds
            .map(enrichRound)
            .sort((a, b) => {
                const aTime = a.submissionOpen ? new Date(a.submissionOpen).getTime() : Infinity;
                const bTime = b.submissionOpen ? new Date(b.submissionOpen).getTime() : Infinity;
                return aTime - bTime;
            });
    }, [rounds]);

    const selectedRound = useMemo(() => {
        return enrichedRounds.find(r => String(r.id) === String(selectedRoundId)) || null;
    }, [enrichedRounds, selectedRoundId]);

    const isFinalRound = useMemo(() => {
        if (!selectedRound || enrichedRounds.length === 0) return false;
        const lastRound = enrichedRounds[enrichedRounds.length - 1];
        return String(selectedRound.id) === String(lastRound?.id);
    }, [selectedRound, enrichedRounds]);

    const prizes = useMemo(() => {
        if (!isFinalRound) return [];
        const rawPrizes = contestDetails?.tieredPrizeStructures;
        if (!rawPrizes) return [];
        try {
            const parsed = JSON.parse(rawPrizes);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) {
            if (typeof rawPrizes === 'string') {
                return rawPrizes.split('\n').map(line => {
                    const parts = line.split(':');
                    if (parts.length >= 2) {
                        return {
                            rank: parts[0].trim(),
                            amount: parts.slice(1).join(':').trim()
                        };
                    }
                    return { rank: line.trim(), amount: '' };
                }).filter(p => p.rank);
            }
        }
        return [];
    }, [contestDetails, isFinalRound]);

    const getPrizeForRank = (rankNum) => {
        if (!prizes || prizes.length === 0) return null;
        const index = rankNum - 1;
        if (index >= 0 && index < prizes.length) {
            const p = prizes[index];
            return `${p.rank}${p.amount ? `: ${p.amount}` : ''}`;
        }
        return null;
    };

    const getAssetUrl = (url) => {
        const trimmedUrl = String(url || '').trim();
        if (!trimmedUrl) return '';

        if (/^https?:\/\//i.test(trimmedUrl)) {
            return trimmedUrl;
        }

        return `https://${trimmedUrl}`;
    };

    const filteredContests = useMemo(() => {
        return contests
            .filter(c => !contestSearchQuery || c.name?.toLowerCase().includes(contestSearchQuery.toLowerCase()))
            .filter(c => contestStatusFilter === 'ALL' || getLiveStatus(c) === contestStatusFilter)
            .sort((a, b) => {
                const aLiveStatus = getLiveStatus(a);
                const bLiveStatus = getLiveStatus(b);
                const isAClosed = aLiveStatus === 'CLOSED';
                const isBClosed = bLiveStatus === 'CLOSED';
                if (isAClosed && !isBClosed) return 1;
                if (!isAClosed && isBClosed) return -1;
                return Number(b.id) - Number(a.id);
            });
    }, [contests, contestSearchQuery, contestStatusFilter]);

    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function fetchInitialData() {
            try {
                const token = localStorage.getItem("shms_token");
                const res = await fetch(API_BASE + "/contests", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("HTTP " + res.status);

                const json = await res.json();
                const contestsData = Array.isArray(json) ? json : json.data || [];
                const sorted = [...contestsData].sort((a, b) => Number(b.id) - Number(a.id));
                if (!cancelled) {
                    setContests(sorted);
                }
            }
            catch (error) {
                console.warn("Fail to connect API contest, use mock:", error.message);
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                const contestsData = (localJson.rankingConsole?.contests?.data) || (localJson.contests?.data) || [];
                const sorted = [...contestsData].sort((a, b) => Number(b.id) - Number(a.id));
                if (!cancelled) {
                    setContests(sorted);
                }
            } finally {
                if (!cancelled) {
                    setInitialLoading(false);
                }
            }
        }
        fetchInitialData();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const fetchRounds = async () => {
            if (!selectedContestId) return;
            try {
                let data;
                try {
                    const token = localStorage.getItem("shms_token");
                    const res = await fetch(API_BASE + `/contests/${selectedContestId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error();
                    data = await res.json();
                } catch {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    const list = (localJson.rankingConsole?.contests?.data) || (localJson.contests?.data) || [];
                    data = list.find(c => String(c.id) === String(selectedContestId));
                }

                if (data) {
                    setContestDetails(data);
                }

                if (data && data.tracks) {
                    const allRounds = data.tracks.flatMap(track => track.rounds || []);

                    const uniqueRoundsMap = new Map();
                    allRounds.forEach(r => uniqueRoundsMap.set(r.id, r));
                    const sortedRounds = Array.from(uniqueRoundsMap.values()).sort((a, b) => Number(b.id) - Number(a.id));

                    setRounds(sortedRounds);
                    if (sortedRounds.length > 0) {
                        setSelectedRoundId(sortedRounds[0].id);
                    } else {
                        setSelectedRoundId('');
                    }
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchRounds();
    }, [selectedContestId]);

    useEffect(() => {
        const fetchReadinessAndRestoreCache = async () => {
            if (!selectedContestId || !selectedRoundId) return;
            try {
                let data;
                try {
                    const token = localStorage.getItem("shms_token");
                    const res = await fetch(API_BASE + `/rankings/readiness?contestId=${selectedContestId}&roundId=${selectedRoundId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error();
                    data = await res.json();
                } catch {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    data = localJson.rankingConsole?.readiness || {
                        summary: { totalTeams: 12, avgScore: 84.5, scoreRange: '70-98', bars: [0, 0, 1, 2, 3, 2, 2, 1, 1, 0] },
                        evaluators: [
                            { name: "Dr. John Doe", dept: "AI & Data Science", status: "Finalized", date: "Jul 05, 2026 14:30" },
                            { name: "Prof. Jane Smith", dept: "Software Engineering", status: "Finalized", date: "Jul 05, 2026 15:45" }
                        ],
                        allReady: true
                    };
                }
                setReadinessData(data);

                const cacheKey = `ranking_cache_${selectedContestId}_${selectedRoundId}`;
                const savedCache = localStorage.getItem(cacheKey);

                if (savedCache) {
                    const parsedCache = JSON.parse(savedCache);
                    setResult(parsedCache.resultData);
                    setCurrentCompiledTopN(parsedCache.compiledTopN || 1);
                    setTopN(parsedCache.inputTopN || 1);
                } else {
                    setResult(null);
                    setCurrentCompiledTopN(1);
                    setTopN(1);
                }

            } catch (err) {
                console.error(err);
            }
        };
        fetchReadinessAndRestoreCache();
    }, [selectedContestId, selectedRoundId]);

    useEffect(() => {
        if (activeTab === 'SUBMISSIONS' && selectedContestId && selectedRoundId) {
            const fetchProgress = async () => {
                try {
                    const token = localStorage.getItem("shms_token");
                    const res = await fetch(`${API_BASE}/contests/${selectedContestId}/rounds/${selectedRoundId}/progress`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setRoundProgress(data);
                    } else {
                        throw new Error("API responded with error");
                    }
                } catch (e) {
                    console.warn("Error fetching progress, falling back to mock:", e);
                    try {
                        const localRes = await fetch("/testFE.json");
                        const localJson = await localRes.json();
                        if (localJson.rankingConsole?.roundProgress) {
                            setRoundProgress(localJson.rankingConsole.roundProgress);
                        } else {
                            setRoundProgress({
                                roundStatus: "OPEN",
                                timeRemaining: "2 days remaining",
                                totalTeams: 4,
                                submittedCount: 2,
                                awaitingCount: 2,
                                notSubmittedCount: 0,
                                teams: [
                                    { teamId: 1, teamName: "AI Warriors", submissionState: "SUBMITTED", submittedAt: "Jul 08, 2026 10:30" },
                                    { teamId: 2, teamName: "Code Titans", submissionState: "SUBMITTED", submittedAt: "Jul 08, 2026 11:15" },
                                    { teamId: 3, teamName: "Data Miners", submissionState: "Not Submitted", submittedAt: null },
                                    { teamId: 4, teamName: "NextGen", submissionState: "Not Submitted", submittedAt: null }
                                ]
                            });
                        }
                    } catch (mockErr) {
                        console.error("Mock fetch progress error:", mockErr);
                    }
                }
            };
            fetchProgress();
        }
    }, [activeTab, selectedContestId, selectedRoundId]);

    const isRoundClosed = roundProgress && roundProgress.roundStatus === 'CLOSED';
    const activeProgressTeams = roundProgress && roundProgress.teams
        ? roundProgress.teams.filter(t => t.teamStatus !== 'FORMING')
        : [];
    const countSubmitted = activeProgressTeams.filter(t => t.submissionState !== 'Not Submitted' && t.submissionState !== 'MISSED_DEADLINE').length;
    const countAwaiting = isRoundClosed ? 0 : activeProgressTeams.filter(t => t.submissionState === 'Not Submitted').length;
    const countNotSubmitted = isRoundClosed
        ? activeProgressTeams.filter(t => t.submissionState === 'MISSED_DEADLINE' || t.submissionState === 'Not Submitted').length
        : activeProgressTeams.filter(t => t.submissionState === 'MISSED_DEADLINE').length;

    let filteredSubmissions = [];
    if (roundProgress && roundProgress.teams) {
        filteredSubmissions = roundProgress.teams.filter(t => {
            if (t.teamStatus === 'FORMING') return false;
            const matchesSearch = t.teamName.toLowerCase().includes(searchQuery.toLowerCase());
            if (submissionFilter === 'SUBMITTED') {
                return matchesSearch && t.submissionState !== 'Not Submitted' && t.submissionState !== 'MISSED_DEADLINE';
            }
            if (submissionFilter === 'AWAITING') {
                if (isRoundClosed) return false;
                return matchesSearch && t.submissionState === 'Not Submitted';
            }
            if (submissionFilter === 'NOT_SUBMITTED') {
                if (isRoundClosed) {
                    return matchesSearch && (t.submissionState === 'MISSED_DEADLINE' || t.submissionState === 'Not Submitted');
                }
                return matchesSearch && t.submissionState === 'MISSED_DEADLINE';
            }
            return matchesSearch;
        });
    }

    const handleGenerate = async () => {
        if (!readinessData.allReady || !isTopNValid) return;
        setIsProcessing(true);
        try {
            const token = localStorage.getItem("shms_token");
            let data;
            try {
                const res = await fetch(API_BASE + "/rankings/process", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contestId: Number(selectedContestId),
                        roundId: Number(selectedRoundId),
                        topN: Number(topN)
                    })
                });
                if (!res.ok) throw new Error();
                data = await res.json();
            } catch {
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                data = localJson.rankingConsole?.rankingResult || {
                    roundName: selectedRound?.phaseName || "Idea Submission",
                    totalProcessed: 4,
                    results: [
                        { rank: 1, teamName: "AI Warriors", averageScore: 92.5 },
                        { rank: 2, teamName: "Code Titans", averageScore: 88.0 },
                        { rank: 3, teamName: "Data Miners", averageScore: 85.5 },
                        { rank: 4, teamName: "NextGen", averageScore: 82.0 }
                    ]
                };
            }

            if (data && data.results) {
                const sortedResults = [...data.results].sort((a, b) => Number(b.averageScore) - Number(a.averageScore));
                data.results = sortedResults.map((item, index) => ({
                    ...item,
                    rank: index + 1
                }));
            }

            setCurrentCompiledTopN(Number(topN));
            setResult(data);

            const cacheKey = `ranking_cache_${selectedContestId}_${selectedRoundId}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                resultData: data,
                compiledTopN: Number(topN),
                inputTopN: Number(topN)
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePublish = async () => {
        if (!result) return;
        if (!window.confirm('Publish Ranking Results? This will make the leaderboard and rankings visible to everyone. This action CANNOT be undone.')) return;
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(API_BASE + '/rankings/publish', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contestId: Number(selectedContestId),
                    roundId: Number(selectedRoundId),
                    topN: Number(currentCompiledTopN)
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to publish results');
            }
            alert('Leaderboard published successfully! Rankings are now public.');

            const nowIso = new Date().toISOString();
            setRounds(prevRounds => prevRounds.map(r =>
                String(r.id) === String(selectedRoundId)
                    ? { ...r, publishResultAt: nowIso }
                    : r
            ));

            try {
                const roundsRes = await fetch(API_BASE + `/contests/${selectedContestId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (roundsRes.ok) {
                    const contestData = await roundsRes.json();
                    if (contestData && contestData.tracks) {
                        const allRounds = contestData.tracks.flatMap(track => track.rounds || []);
                        const uniqueRoundsMap = new Map();
                        allRounds.forEach(r => uniqueRoundsMap.set(r.id, r));
                        setRounds(Array.from(uniqueRoundsMap.values()));
                    }
                }
            } catch (fetchErr) {
                console.warn("Could not refetch rounds after publish:", fetchErr);
            }
        }
        catch (err) {
            console.error(err);
            alert(err.message || 'Failed to publish leaderboard.');
        }
    };

    const handleDownloadCSV = () => {
        if (!result || !result.results) return;

        const hasPrizes = prizes && prizes.length > 0;
        const headers = ['Rank', 'Team Name', 'Average Score', 'Status'];
        if (hasPrizes) {
            headers.push('Prize');
        }
        const csvRows = [headers.join(',')];

        for (const row of result.results) {
            const isQualified = row.rank <= currentCompiledTopN;
            const csvStatus = isQualified ? 'QUALIFIED' : 'ELIMINATED';
            const values = [row.rank, `"${row.teamName}"`, row.averageScore, csvStatus];
            if (hasPrizes) {
                const prizeStr = getPrizeForRank(row.rank) || '';
                values.push(`"${prizeStr}"`);
            }
            csvRows.push(values.join(','));
        }

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Leaderboard_${result.roundName || 'Result'}.csv`);
        link.click();
        document.body.removeChild(link);
    };

    const handleRequestReevaluation = async () => {
        if (!revalData.reason.trim()) {
            alert("Please provide the Reason for requesting re-evaluation!");
            return;
        }
        try {
            const token = localStorage.getItem('shms_token') || localStorage.getItem('token');
            const res = await fetch(API_BASE + "/request-reevaluation", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    teamId: Number(revalData.teamId),
                    roundId: Number(selectedRoundId),
                    reason: revalData.reason.trim()
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "An error occurred while requesting re-evaluation!");
            }
            alert("Re-evaluation requested successfully and recorded in the audit logs!");
            setIsRevalModalOpen(false);
            handleGenerate();
        } catch (error) {
            alert(error.message || "An error occurred while requesting re-evaluation!");
        }
    };

    const totalTeams = readinessData.summary.totalTeams;
    const isTopNValid = Number.isInteger(Number(topN)) && Number(topN) > 0 && Number(topN) <= totalTeams;
    const isActionDisabled = !readinessData.allReady || isProcessing || !isTopNValid;

    const scorePublishedAt = selectedRound?.reviewCalibrationAt || null;
    const isScorePublished = !!scorePublishedAt && new Date(scorePublishedAt) <= new Date();

    const resultPublishedAt = selectedRound?.publishResultAt || null;
    const isResultPublished = !!resultPublishedAt && new Date(resultPublishedAt) <= new Date();

    const canPublishScore = readinessData.allReady && !isResultPublished;
    const canPublishResult = isScorePublished && !!result && !isResultPublished;

    const handlePublishScore = async () => {
        if (!canPublishScore) return;
        if (!window.confirm('Publish Scores? Only scores and feedback will be visible. Final rankings and QUALIFIED/ELIMINATED results will not be released until Publish Results.')) return;
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(API_BASE + '/rankings/publish-scores', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ contestId: Number(selectedContestId), roundId: Number(selectedRoundId), topN: Number(topN) })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to publish scores');
            alert('Scores published successfully! Students, Judges, and Mentors can now view their scores.');

            const roundsRes = await fetch(API_BASE + `/contests/${selectedContestId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (roundsRes.ok) {
                const contestData = await roundsRes.json();
                if (contestData && contestData.tracks) {
                    const allRounds = contestData.tracks.flatMap(track => track.rounds || []);
                    const uniqueRoundsMap = new Map();
                    allRounds.forEach(r => uniqueRoundsMap.set(r.id, r));
                    setRounds(Array.from(uniqueRoundsMap.values()));
                }
            }
        } catch (err) {
            alert(err.message || 'Failed to publish scores');
        }
    };

    if (initialLoading) {
        return (
            <div className="rankings-container">
                <div className="global-loading">
                    <div className="global-spinner"></div>
                    <span>Loading rankings...</span>
                </div>
            </div>
        );
    }

    if (!selectedContestId) {
        return (
            <div className="rankings-container">
                <div className="rankings-content" style={{ padding: '40px', maxWidth: 1800, margin: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                            <h1 className="rankings-title" style={{ fontSize: '32px', margin: 0 }}>Rankings & Rounds Console</h1>
                            <p className="rankings-subtitle" style={{ fontSize: '15px', color: '#64748b', margin: '4px 0 0 0' }}>Select a contest to manage competition rounds, track submissions, and publish leaderboard rankings.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', background: 'white', width: '280px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <svg width="18" height="18" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search contests..."
                                    value={contestSearchQuery}
                                    onChange={(e) => setContestSearchQuery(e.target.value)}
                                    style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', width: '100%', color: '#0f172a', fontWeight: '500' }}
                                />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '10px 16px', background: 'white', width: '220px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>Status:</span>
                                <select
                                    value={contestStatusFilter}
                                    onChange={(e) => setContestStatusFilter(e.target.value)}
                                    style={{
                                        border: 'none',
                                        outline: 'none',
                                        background: 'transparent',
                                        fontSize: '14px',
                                        color: '#0f172a',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        width: '100%'
                                    }}
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="ACTIVE">Actived</option>
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="contests-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                        {filteredContests.map(c => {
                            const liveStatus = getLiveStatus(c);
                            const isClosed = liveStatus === 'CLOSED';
                            const isUpcoming = liveStatus === 'UPCOMING';
                            const isActive = liveStatus === 'ACTIVE';

                            let cardBg = 'white';
                            let cardBorderColor = '#cbd5e1';
                            let glowShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                            let statusText = 'ACTIVE';
                            let badgeBg = '#dcfce7';
                            let badgeColor = '#166534';

                            if (isClosed) {
                                cardBg = '#f8fafc';
                                cardBorderColor = '#e2e8f0';
                                statusText = 'CLOSED';
                                badgeBg = '#fee2e2';
                                badgeColor = '#ef4444';
                            } else if (isUpcoming) {
                                statusText = 'UPCOMING';
                                badgeBg = '#fef3c7';
                                badgeColor = '#d97706';
                            } else if (isActive) {
                                cardBg = 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)';
                                cardBorderColor = '#86efac';
                                glowShadow = '0 10px 20px -3px rgba(34, 197, 94, 0.08)';
                                statusText = 'ACTIVED';
                                badgeBg = '#dcfce7';
                                badgeColor = '#15803d';
                            }

                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        background: cardBg,
                                        padding: '28px',
                                        borderRadius: '16px',
                                        border: `1.5px solid ${cardBorderColor}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        boxShadow: glowShadow,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: '180px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onClick={() => {
                                        setSelectedContestId(c.id.toString());
                                        sessionStorage.setItem('rankingsSelectedContestId', c.id.toString());
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = isActive ? '#22c55e' : '#2563eb';
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = isActive
                                            ? '0 12px 24px -4px rgba(34, 197, 94, 0.16)'
                                            : '0 12px 24px -4px rgba(37, 99, 235, 0.16)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = cardBorderColor;
                                        e.currentTarget.style.transform = 'none';
                                        e.currentTarget.style.boxShadow = glowShadow;
                                    }}
                                >
                                    {isActive && (
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '4px',
                                            height: '100%',
                                            background: '#22c55e'
                                        }} />
                                    )}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <h3 style={{ margin: 0, fontSize: '20px', color: '#0f172a', fontWeight: 800, lineHeight: '1.4' }}>{c.name}</h3>
                                            <span style={{
                                                fontSize: '11px',
                                                background: badgeBg,
                                                color: badgeColor,
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                {isActive && <span className="glow-dot" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />}
                                                {statusText}
                                            </span>
                                        </div>
                                        {c.year && (
                                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                                                {c.season ? `${c.season} ` : ''}{c.year}
                                            </p>
                                        )}
                                        {c.description && (
                                            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                                                {c.description}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                                        <span style={{ color: isActive ? '#16a34a' : '#2563eb', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Manage Rankings
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredContests.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', padding: '60px 40px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', color: '#64748b', fontWeight: '600', border: '1.5px dashed #cbd5e1' }}>
                                No contests found matching your filters.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rankings-container">
            <div className="rankings-content">
                {viewMode === 'ROUNDS_LIST' ? (
                    <>
                        <div style={{ marginBottom: '16px' }}>
                            <button
                                className="back-to-rounds-btn"
                                style={{ marginBottom: 0 }}
                                onClick={() => {
                                    setSelectedContestId('');
                                    setSelectedRoundId('');
                                    setSelectedRound(null);
                                    sessionStorage.removeItem('rankingsSelectedContestId');
                                }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Contests
                            </button>
                        </div>
                        <div className="rankings-page-header">
                            <div>
                                <h1 className="rankings-title">Rounds Management Dashboard</h1>
                                <p className="rankings-subtitle">Monitor round status, submission rate, and compile rankings for each stage.</p>
                            </div>
                            <div style={{ padding: '8px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#1e40af', fontWeight: '600', fontSize: '14px' }}>
                                Contest: {contests.find(c => String(c.id) === String(selectedContestId))?.name || 'Selected Contest'}
                            </div>
                        </div>

                        <div className="rounds-grid">
                            {enrichedRounds.map((round) => {
                                const isUpcoming = round.status === 'UPCOMING';

                                const goToRanking = (e) => {
                                    e?.stopPropagation();
                                    setSelectedRoundId(round.id);
                                    setActiveTab('COMPILATION');
                                    setViewMode('COMPILATION_VIEW');
                                    const cacheKey = `ranking_cache_${selectedContestId}_${round.id}`;
                                    const savedCache = localStorage.getItem(cacheKey);
                                    if (savedCache) {
                                        const parsedCache = JSON.parse(savedCache);
                                        setTopN(parsedCache.inputTopN || 1);
                                        setCurrentCompiledTopN(parsedCache.compiledTopN || 1);
                                    } else {
                                        setTopN(1);
                                        setCurrentCompiledTopN(1);
                                    }
                                };

                                const goToSubmissions = (e) => {
                                    e?.stopPropagation();
                                    setSelectedRoundId(round.id);
                                    setActiveTab('SUBMISSIONS');
                                    setViewMode('SUBMISSIONS_VIEW');
                                };

                                return (
                                    <div
                                        key={round.id}
                                        className={`round-card ${round.status.toLowerCase()}`}
                                        onClick={() => {
                                            if (isUpcoming) {
                                                setSelectedRoundId(round.id);
                                                setViewMode('DETAILS_VIEW');
                                            } else {
                                                goToRanking();
                                            }
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div>
                                            <div className="round-card-header">
                                                <div className="round-card-title-wrap">
                                                    <span className="round-card-icon">{getRoundIcon(round.phaseName)}</span>
                                                    <h3 className="round-card-name">{round.phaseName}</h3>
                                                </div>
                                                <span className={`status-badge ${round.status.toLowerCase()}`}>
                                                    {round.status}
                                                </span>
                                            </div>

                                            <div className="round-timeline">
                                                {isUpcoming ? (
                                                    <>
                                                        <div className="timeline-row">
                                                            <span className="timeline-label">Starts:</span>
                                                            <span className="timeline-value">{formatDate(round.submissionOpen)}</span>
                                                        </div>
                                                        <div className="timeline-row">
                                                            <span className="timeline-label">Deadline:</span>
                                                            <span className="timeline-value">{formatDate(round.submissionDeadline)}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="timeline-row">
                                                            <span className="timeline-label">Opened:</span>
                                                            <span className="timeline-value">{formatDate(round.submissionOpen)}</span>
                                                        </div>
                                                        <div className="timeline-row">
                                                            <span className="timeline-label">Deadline:</span>
                                                            <span className="timeline-value">{formatDate(round.submissionDeadline)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {(round.status === 'ACTIVE' || round.status === 'ACTIVED') && (
                                                <div className="round-progress-wrapper">
                                                    <div className="round-progress-text">
                                                        <span>{round.submittedTeams} / {round.totalTeams} Submitted</span>
                                                        <span>{round.submissionProgress}%</span>
                                                    </div>
                                                    <div className="round-progress-bar-bg">
                                                        <div
                                                            className="round-progress-bar-fill"
                                                            style={{
                                                                width: `${round.submissionProgress}%`,
                                                                backgroundColor: '#3b82f6'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {isUpcoming ? (
                                            <button className="round-card-action-btn disabled" disabled>
                                                Coming Soon
                                            </button>
                                        ) : (
                                            <div className="round-card-actions">
                                                <button className="round-card-action-btn secondary" onClick={goToSubmissions}>
                                                    View Submissions
                                                </button>
                                                <button className="round-card-action-btn primary" onClick={goToRanking}>
                                                    View Ranking
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        <button className="back-to-rounds-btn" onClick={() => setViewMode('ROUNDS_LIST')}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back
                        </button>

                        <div className="rankings-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <h1 className="rankings-title" style={{ margin: 0 }}>{selectedRound?.phaseName}</h1>
                                    {viewMode === 'SUBMISSIONS_VIEW' && roundProgress && (
                                        <span style={{ padding: '6px 12px', background: roundProgress.roundStatus === 'OPEN' ? '#dcfce7' : '#f1f5f9', color: roundProgress.roundStatus === 'OPEN' ? '#16a34a' : '#475569', borderRadius: '20px', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>
                                            {roundProgress.roundStatus}
                                        </span>
                                    )}
                                </div>
                                <p className="rankings-subtitle" style={{ marginTop: '8px' }}>
                                    Contest: {contests.find(c => String(c.id) === String(selectedContestId))?.name || 'Selected Contest'}
                                </p>
                            </div>
                            {viewMode === 'SUBMISSIONS_VIEW' && roundProgress && roundProgress.roundStatus !== 'CLOSED' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', fontWeight: 600, background: '#f8fafc', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    {roundProgress.timeRemaining}
                                </div>
                            )}
                        </div>

                        {viewMode === 'COMPILATION_VIEW' && (
                            <>
                                <div className="publication-control-panel" style={{ padding: '24px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Publication & Promotion Control</h2>
                                    </div>

                                    {/* Top Bar Controls */}
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '20px', background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>

                                        {/* Compact Top N Input */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid #e2e8f0', paddingRight: '16px', height: '38px' }}>
                                            <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569', whiteSpace: 'nowrap' }}>Top N Cap:</label>
                                            <input
                                                type="number"
                                                className="top-n-input"
                                                value={topN}
                                                min={0}
                                                max={readinessData.summary.totalTeams}
                                                onKeyDown={(e) => {
                                                    if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                                                }}
                                                onWheel={(e) => e.target.blur()}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (!/^\d*$/.test(value)) return;
                                                    if (value === '') { setTopN(''); return; }
                                                    const num = Number(value);
                                                    if (num < 0) { setTopN(1); }
                                                    else if (num > readinessData.summary.totalTeams) { setTopN(readinessData.summary.totalTeams); }
                                                    else { setTopN(num); }
                                                }}
                                                style={{ width: '60px', height: '38px', boxSizing: 'border-box', padding: '0 8px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', fontWeight: '700', fontSize: '14px', outline: 'none', color: '#0f172a' }}
                                            />
                                        </div>

                                        {/* Generate Leaderboard Action */}
                                        <button
                                            id="btn-generate-ranking"
                                            disabled={isActionDisabled || isResultPublished}
                                            onClick={handleGenerate}
                                            title={isResultPublished ? 'Results published — ranking is locked' : ''}
                                            style={{ 
                                                height: '38px', 
                                                boxSizing: 'border-box', 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                justify: 'center', 
                                                padding: '0 16px', 
                                                fontSize: '13px', 
                                                fontWeight: '700', 
                                                borderRadius: '8px', 
                                                border: 'none', 
                                                background: isActionDisabled || isResultPublished ? '#cbd5e1' : '#2563eb', 
                                                color: isActionDisabled || isResultPublished ? '#64748b' : 'white', 
                                                cursor: isActionDisabled || isResultPublished ? 'not-allowed' : 'pointer', 
                                                transition: 'all 0.2s ease', 
                                                whiteSpace: 'nowrap' 
                                            }}
                                        >
                                            {isProcessing ? 'Processing...' : '⚡ Generate Leaderboard'}
                                        </button>

                                        <div style={{ flexGrow: 1 }} />

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                className="view-chart-btn"
                                                onClick={() => setIsChartModalOpen(true)}
                                                style={{
                                                    height: '38px',
                                                    boxSizing: 'border-box',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '0 16px',
                                                    background: '#6366f1',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)'
                                                }}
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                View Chart
                                            </button>

                                            {!isResultPublished ? (
                                                <>
                                                    <button
                                                        id="btn-publish-score"
                                                        onClick={handlePublishScore}
                                                        disabled={!canPublishScore}
                                                        style={{ height: '38px', boxSizing: 'border-box', padding: '0 16px', background: canPublishScore ? '#7c3aed' : '#c4b5fd', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: canPublishScore ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                                                    >
                                                        {isScorePublished ? 'Update Scores' : 'Publish Score Review'}
                                                    </button>

                                                    <button
                                                        id="btn-publish-result"
                                                        onClick={handlePublish}
                                                        disabled={!canPublishResult}
                                                        style={{ height: '38px', boxSizing: 'border-box', padding: '0 16px', background: canPublishResult ? '#3b82f6' : '#93c5fd', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: canPublishResult ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                                                    >
                                                        Publish Ranking Result
                                                    </button>
                                                </>
                                            ) : (
                                                <span style={{ height: '38px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', padding: '0 14px', background: '#dcfce7', color: '#15803d', borderRadius: '8px', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>Results Published & Locked</span>
                                            )}

                                            <button
                                                onClick={() => {
                                                    const token = localStorage.getItem('shms_token');
                                                    const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1");
                                                    window.open(`${apiBaseUrl}/admin/results/export-csv?type=scores&contestId=${selectedContestId}&token=${token}`, '_blank');
                                                }}
                                                style={{
                                                    height: '38px',
                                                    boxSizing: 'border-box',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '0 16px',
                                                    background: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                                                }}
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Export CSV
                                            </button>
                                        </div>
                                    </div>

                                    {/* Compact Readiness Banner */}
                                    <div
                                        className={`readiness-banner ${readinessData.allReady ? 'ready' : 'not-ready'}`}
                                        style={{
                                            marginBottom: 16,
                                            padding: '10px 16px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            background: readinessData.allReady ? '#f0fdf4' : '#fffbeb',
                                            border: `1px solid ${readinessData.allReady ? '#bbf7d0' : '#fef08a'}`
                                        }}
                                    >
                                        <div style={{ color: readinessData.allReady ? '#16a34a' : '#d97706', display: 'flex', alignItems: 'center' }}>
                                            {readinessData.allReady
                                                ? <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                : <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                                            }
                                        </div>
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <strong style={{ fontSize: '13.5px', color: readinessData.allReady ? '#166534' : '#92400e' }}>
                                                {readinessData.allReady ? 'Readiness Check Passed:' : 'Readiness Check Pending:'}
                                            </strong>
                                            <span style={{ fontSize: '13px', color: readinessData.allReady ? '#15803d' : '#b45309' }}>
                                                {readinessData.allReady
                                                    ? `All ${readinessData.evaluators.length} evaluators finalized scores.`
                                                    : `${readinessData.evaluators.filter(e => e.status !== 'Finalized').length} evaluator(s) pending.`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Evaluators Table */}
                                    <div className="eval-table-card" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        <table className="eval-table" style={{ margin: 0, width: '100%' }}>
                                            <thead>
                                                <tr>
                                                    <th>Evaluator Name</th>
                                                    <th>Department</th>
                                                    <th>Review Status</th>
                                                    <th>Finalized Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {readinessData.evaluators.map((ev, idx) => (
                                                    <tr key={idx}>
                                                        <td className="eval-name">{ev.name}</td>
                                                        <td>{ev.dept}</td>
                                                        <td>{ev.status === 'Finalized'
                                                            ? <span className="status-pill-finalized"><span className="dot-green" /> Finalized</span>
                                                            : <span className="status-pill-pending"><span className="dot-yellow" /> Pending</span>
                                                        }
                                                        </td>
                                                        <td style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '13px' }}>{ev.date}</td>
                                                    </tr>
                                                ))}
                                                {readinessData.evaluators.length === 0 && (
                                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No evaluators assigned to this contest/round yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Ranking Result Table - CHỈ HIỂN THỊ KHI Ở VIEW_RANKING / COMPILATION_VIEW */}
                                {result && (
                                    <div className="result-card visible" style={{ marginTop: 24 }}>
                                        <h2 className="result-card-title">✓ Ranking Generated Successfully</h2>
                                        <p className="result-card-sub">Round: {result.roundName} · Top N = {currentCompiledTopN}</p>
                                        <div className="result-stats">
                                            <div className="result-stat">
                                                <div className="result-stat-label">Qualified</div>
                                                <div className="result-stat-val qualified">{currentCompiledTopN}</div>
                                            </div>
                                            <div className="result-stat">
                                                <div className="result-stat-label">Eliminated</div>
                                                <div className="result-stat-val eliminated">{result.results.length - currentCompiledTopN}</div>
                                            </div>
                                            <div className="result-stat">
                                                <div className="result-stat-label">Total Processed</div>
                                                <div className="result-stat-val">{result.totalProcessed}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '16px' }}>
                                            <h3 style={{ margin: 0, color: 'white' }}>Top Teams</h3>
                                            <button onClick={handleDownloadCSV} style={{ padding: '6px 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '6px' }}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                Download Full Rankings CSV
                                            </button>
                                        </div>
                                        <table className="eval-table" style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ color: '#0f172a' }}>Rank</th>
                                                    <th style={{ color: '#0f172a' }}>Team Name</th>
                                                    <th style={{ color: '#0f172a' }}>Average Score</th>
                                                    <th style={{ color: '#0f172a' }}>Status</th>
                                                    {prizes.length > 0 && <th style={{ color: '#0f172a' }}>Prize</th>}
                                                    <th style={{ color: '#0f172a', textAlign: 'right', paddingRight: '16px' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.results.map(r => {
                                                    const isQualified = r.rank <= currentCompiledTopN;
                                                    const teamPrize = getPrizeForRank(r.rank);
                                                    return (
                                                        <tr key={r.rank}>
                                                            <td>#{r.rank}</td>
                                                            <td>{r.teamName}</td>
                                                            <td>{r.averageScore}</td>
                                                            <td>
                                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', background: isQualified ? '#dcfce7' : '#fee2e2', color: isQualified ? '#166534' : '#991b1b' }}>
                                                                    {isQualified ? 'QUALIFIED' : 'ELIMINATED'}
                                                                </span>
                                                            </td>
                                                            {prizes.length > 0 && (
                                                                <td>
                                                                    {teamPrize ? (
                                                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                                                                            🏆 {teamPrize}
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ color: '#94a3b8' }}>—</span>
                                                                    )}
                                                                </td>
                                                            )}
                                                            <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                                <button
                                                                    disabled={isResultPublished}
                                                                    onClick={() => {
                                                                        if (isResultPublished) return;
                                                                        setRevalData({ teamId: r.teamId, teamName: r.teamName, reason: '' });
                                                                        setIsRevalModalOpen(true);
                                                                    }}
                                                                    style={{
                                                                        background: isResultPublished ? '#f1f5f9' : '#fef2f2',
                                                                        border: `1px solid ${isResultPublished ? '#cbd5e1' : '#fecaca'}`,
                                                                        padding: '6px 10px',
                                                                        borderRadius: '6px',
                                                                        cursor: isResultPublished ? 'not-allowed' : 'pointer',
                                                                        fontSize: '13px',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        color: isResultPublished ? '#94a3b8' : '#dc2626',
                                                                        fontWeight: 600,
                                                                        boxShadow: isResultPublished ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                                                                        opacity: isResultPublished ? 0.6 : 1
                                                                    }}
                                                                    title={isResultPublished ? 'Results published — re-evaluation is locked' : 'Request Re-evaluation'}
                                                                >
                                                                    ⚠️ Request Re-eval
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}

                        {viewMode === 'SUBMISSIONS_VIEW' && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ background: '#ffffff', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', width: '250px' }}>
                                            <svg width="16" height="16" fill="none" stroke="#4b5563" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            <input
                                                type="text"
                                                placeholder="Search teams..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{ border: 'none', outline: 'none', fontSize: '13px', background: 'transparent', width: '100%', color: '#0f172a' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <button onClick={() => setSubmissionFilter('ALL')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #d1d5db', background: submissionFilter === 'ALL' ? '#1e293b' : 'white', color: submissionFilter === 'ALL' ? 'white' : '#4b5563', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>All</button>
                                        <button onClick={() => setSubmissionFilter('SUBMITTED')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #86efac', background: submissionFilter === 'SUBMITTED' ? '#16a34a' : 'white', color: submissionFilter === 'SUBMITTED' ? 'white' : '#15803d', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Submitted ({countSubmitted})</button>
                                        <button onClick={() => setSubmissionFilter('AWAITING')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #fde68a', background: submissionFilter === 'AWAITING' ? '#ca8a04' : 'white', color: submissionFilter === 'AWAITING' ? 'white' : '#a16207', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Awaiting Submission ({countAwaiting})</button>
                                        <button onClick={() => setSubmissionFilter('NOT_SUBMITTED')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #fca5a5', background: submissionFilter === 'NOT_SUBMITTED' ? '#dc2626' : 'white', color: submissionFilter === 'NOT_SUBMITTED' ? 'white' : '#b91c1c', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Not Submitted ({countNotSubmitted})</button>
                                    </div>
                                </div>

                                <div className="eval-table-card">
                                    <table className="eval-table">
                                        <thead>
                                            <tr>
                                                <th style={{ background: '#e2e8f0', color: '#1e293b', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Team Name</th>
                                                <th style={{ background: '#e2e8f0', color: '#1e293b', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Status</th>
                                                <th style={{ background: '#e2e8f0', color: '#1e293b', borderBottom: '2px solid #cbd5e1', fontWeight: 700 }}>Submitted At</th>
                                                <th style={{ background: '#e2e8f0', color: '#1e293b', borderBottom: '2px solid #cbd5e1', fontWeight: 700, textAlign: 'right', paddingRight: '24px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSubmissions.map(team => {
                                                const isAutoZero = team.submissionState === 'MISSED_DEADLINE';
                                                const isNotSubmitted = team.submissionState === 'Not Submitted';
                                                const isMissing = isAutoZero || isNotSubmitted;

                                                let displayText = team.submissionState;
                                                let bgColor = '#dcfce7';
                                                let textColor = '#15803d';

                                                if (isMissing) {
                                                    if (roundProgress && roundProgress.roundStatus === 'CLOSED') {
                                                        displayText = 'Not Submitted';
                                                        bgColor = '#fee2e2';
                                                        textColor = '#b91c1c';
                                                    } else {
                                                        displayText = 'Awaiting Submission';
                                                        bgColor = '#fef3c7';
                                                        textColor = '#b45309';
                                                    }
                                                } else if (team.submissionState === 'OFFICIAL') {
                                                    displayText = 'Submitted';
                                                } else if (team.submissionState === 'DRAFT') {
                                                    displayText = 'Draft';
                                                    bgColor = '#f1f5f9';
                                                    textColor = '#475569';
                                                }

                                                return (
                                                    <tr key={team.teamId}>
                                                        <td style={{ borderBottom: '1px solid #d1d5db' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{ width: '32px', height: '32px', background: '#0f172a', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>{team.teamName.substring(0, 2).toUpperCase()}</div>
                                                                <span style={{ fontWeight: 700, color: '#0f172a' }}>{team.teamName}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ borderBottom: '1px solid #d1d5db' }}>
                                                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, background: bgColor, color: textColor }}>
                                                                {displayText}
                                                            </span>
                                                        </td>
                                                        <td style={{ borderBottom: '1px solid #d1d5db', color: '#4b5563', fontSize: '13px', fontWeight: 500 }}>
                                                            {team.submittedAt || '--'}
                                                        </td>
                                                        <td style={{ borderBottom: '1px solid #d1d5db', textAlign: 'right', paddingRight: '24px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                                <button
                                                                    style={{ padding: '6px 12px', fontSize: '13px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                                                    onClick={() => setViewSubmissionModal({ isOpen: true, team })}
                                                                >
                                                                    View
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredSubmissions.length === 0 && (
                                                <tr>
                                                    <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#4b5563' }}>No submissions found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <div style={{ padding: '16px 24px', fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>
                                        Showing {filteredSubmissions.length} submissions
                                    </div>
                                </div>
                            </>
                        )}

                        {viewMode === 'DETAILS_VIEW' && (
                            <div className="upcoming-details-card">
                                <div className="upcoming-details-header">
                                    <span className="upcoming-icon">👑</span>
                                    <h2>{selectedRound?.phaseName}</h2>
                                    <span className="status-badge upcoming">Upcoming</span>
                                </div>
                                <p className="upcoming-details-desc">
                                    This round is not currently active. Submissions will open soon according to the timeline below.
                                </p>
                                <div className="upcoming-details-timeline">
                                    <div className="detail-timeline-item">
                                        <span className="detail-timeline-label">Submissions Open:</span>
                                        <span className="detail-timeline-val">{formatDate(selectedRound?.submissionOpen)}</span>
                                    </div>
                                    <div className="detail-timeline-item">
                                        <span className="detail-timeline-label">Submissions Deadline:</span>
                                        <span className="detail-timeline-val">{formatDate(selectedRound?.submissionDeadline)}</span>
                                    </div>
                                </div>
                                <div className="upcoming-placeholder-box">
                                    <svg width="48" height="48" fill="none" stroke="#64748b" viewBox="0 0 24 24" style={{ marginBottom: '16px' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <p>Evaluation controls and leaderboards will become available once submissions start.</p>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {viewSubmissionModal.isOpen && viewSubmissionModal.team && (() => {
                    const team = viewSubmissionModal.team;
                    const reqsStr = roundProgress?.submissionRequirements;
                    const parsedReqs = parseRequirements(reqsStr);
                    const activeRequirements = parsedReqs.length > 0
                        ? parsedReqs
                        : ['githubUrl', 'demoUrl', 'documentUrl', 'slideUrl'];

                    const getAssetLinkClass = (url) => url ? 'asset-valid' : 'asset-missing';
                    const renderModalAssetLink = (url, label, iconPath, key) => {
                        const isValid = !!url;
                        return (
                            <a key={key} href={url ? getAssetUrl(url) : '#'} className={`asset-link ${getAssetLinkClass(url)}`}
                                target="_blank" rel="noreferrer"
                                onClick={e => !isValid && e.preventDefault()}
                                style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', border: '1px solid #d1d5db', borderRadius: '8px', textDecoration: 'none', color: isValid ? '#1e293b' : '#64748b', marginBottom: '8px', alignItems: 'center' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                                    </svg>{label}
                                </div>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        );
                    };

                    let parsedData = {};
                    try {
                        if (team.submissionData) {
                            parsedData = JSON.parse(team.submissionData);
                        }
                    } catch (e) {
                        console.error("Error parsing submissionData:", e);
                    }

                    const getAssetDetails = (reqKey) => {
                        const key = String(reqKey).trim();
                        if (key === 'githubUrl' || key === 'repoUrl') {
                            return {
                                label: 'GitHub Repository',
                                iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
                                value: parsedData.githubUrl || parsedData.repoUrl || team.repoUrl || team.githubUrl || ''
                            };
                        }
                        if (key === 'demoUrl') {
                            return {
                                label: 'Live Demo',
                                iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
                                value: parsedData.demoUrl || team.demoUrl || ''
                            };
                        }
                        if (key === 'documentUrl' || key === 'docUrl') {
                            return {
                                label: 'Project Documentation',
                                iconPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                                value: parsedData.documentUrl || parsedData.docUrl || team.docUrl || team.documentUrl || ''
                            };
                        }
                        if (key === 'slideUrl') {
                            return {
                                label: 'Presentation Slides',
                                iconPath: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
                                value: parsedData.slideUrl || team.slideUrl || ''
                            };
                        }

                        const formatLabel = (str) => {
                            let result = str.replace(/([A-Z])/g, ' $1');
                            result = result.replace(/[_-]/g, ' ');
                            return result.trim().replace(/\b\w/g, c => c.toUpperCase());
                        };
                        return {
                            label: formatLabel(key),
                            iconPath: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
                            value: parsedData[key] || team[key] || ''
                        };
                    };

                    return (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                            <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '600px', maxWidth: '90%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #d1d5db', paddingBottom: '12px' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>Project Deliverables: {team.teamName}</h3>
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '24px', fontWeight: 500 }}>
                                        The following links are required for this round's submission. Missing links are marked in red.
                                    </p>

                                    {activeRequirements.map((reqKey, idx) => {
                                        const { label, iconPath, value } = getAssetDetails(reqKey);
                                        return renderModalAssetLink(value, label, iconPath, idx);
                                    })}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button
                                        style={{ padding: '8px 16px', fontSize: '14px', background: '#fff', color: '#334155', border: '1px solid #d1d5db', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                        onClick={() => setViewSubmissionModal({ isOpen: false, team: null })}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {isRevalModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                    <div className="modal-content" style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🔄 Request Re-evaluation
                            </h2>
                            <button onClick={() => setIsRevalModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Team / Round (Read-only)</label>
                            <input type="text" value={`${revalData.teamName} - ${selectedRound?.phaseName || 'Current Round'}`} readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#64748b', boxSizing: 'border-box', fontWeight: 500 }} />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>Reason for Re-evaluation (Mandatory)</label>
                            <textarea required placeholder="Enter the reason for requesting judges to re-evaluate this submission..." value={revalData.reason} onChange={(e) => setRevalData({ ...revalData, reason: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', fontSize: '14px' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setIsRevalModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            <button onClick={handleRequestReevaluation} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ⚠️ Request Re-eval
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isChartModalOpen && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                    <div className="modal-content" style={{ background: 'white', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '720px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📊 Score Distribution Chart
                                </h2>
                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                    Score distribution across teams for {selectedRound?.phaseName || 'Current Round'}
                                </p>
                            </div>
                            <button onClick={() => setIsChartModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', borderRadius: '6px' }}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div style={{ height: '340px', marginTop: '16px' }}>
                            <Bar
                                data={{
                                    labels: ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'],
                                    datasets: [{
                                        label: 'Teams',
                                        data: readinessData.summary.bars,
                                        backgroundColor: 'rgba(99, 102, 241, 0.85)',
                                        borderColor: '#6366f1',
                                        borderWidth: 1.5,
                                        borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
                                        borderSkipped: false,
                                        hoverBackgroundColor: '#4f46e5',
                                        hoverBorderColor: '#4f46e5',
                                        barThickness: 'flex',
                                        maxBarThickness: 36
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            backgroundColor: '#0f172a',
                                            titleColor: '#ffffff',
                                            bodyColor: '#cbd5e1',
                                            padding: 10,
                                            cornerRadius: 8,
                                            displayColors: false,
                                            titleFont: { size: 13, weight: '700', family: "'Inter', system-ui, sans-serif" },
                                            bodyFont: { size: 13, family: "'Inter', system-ui, sans-serif" },
                                            callbacks: {
                                                label: (context) => ` ${context.parsed.y} Team(s)`
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            grid: { display: false },
                                            ticks: {
                                                color: '#64748b',
                                                font: { size: 11, weight: '600', family: "'Inter', system-ui, sans-serif" }
                                            }
                                        },
                                        y: {
                                            beginAtZero: true,
                                            grid: {
                                                color: '#f1f5f9',
                                                drawBorder: false
                                            },
                                            ticks: {
                                                stepSize: 1,
                                                color: '#64748b',
                                                font: { size: 11, weight: '600', family: "'Inter', system-ui, sans-serif" }
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                            <button onClick={() => setIsChartModalOpen(false)} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#334155', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RankingsConsole;
import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './RankingsConsole.css';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = "http://localhost:8080/api/v1/admin";

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

const getRoundIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('final') && !n.includes('semi')) return '👑';
    if (n.includes('semi')) return '⚡';
    if (n.includes('qualification') || n.includes('screening') || n.includes('idea')) return '🏆';
    return '📅';
};

const getRoundStatus = (round) => {
    if (round.status) return round.status.toUpperCase();

    const now = new Date();
    const openDate = round.submissionOpen ? new Date(round.submissionOpen) : null;
    const deadlineDate = round.submissionDeadline ? new Date(round.submissionDeadline) : null;

    if (openDate && now < openDate) return "UPCOMING";
    if (deadlineDate && now > deadlineDate) return "CLOSED";
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

    const rawStatus = r.state || r.status || getRoundStatus(enriched);
    enriched.status = String(rawStatus).toUpperCase();

    if (enriched.status === "ACTIVED") {
        enriched.status = "ACTIVE";
    }

    enriched.submissionProgress = totalTeams > 0
        ? Math.round((submittedTeams / totalTeams) * 100)
        : 0;

    return enriched;
};

const RankingsConsole = () => {
    const [activeTab, setActiveTab] = useState('COMPILATION');
    const [viewMode, setViewMode] = useState('ROUNDS_LIST');
    const [topN, setTopN] = useState(1);
    const [currentCompiledTopN, setCurrentCompiledTopN] = useState(1);
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [selectedRoundId, setSelectedRoundId] = useState('');

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

    const getAssetUrl = (url) => {
        const trimmedUrl = String(url || '').trim();
        if (!trimmedUrl) return '';

        if (/^https?:\/\//i.test(trimmedUrl)) {
            return trimmedUrl;
        }

        return `https://${trimmedUrl}`;
    };

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
                    if (sorted.length > 0) {
                        setSelectedContestId(sorted[0].id);
                    }
                }
            }
            catch (error) {
                console.warn("Fail to connect API contest, use mock:", error.message);
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                const contestsData = localJson.rankingConsole?.contests?.data || [];
                const sorted = [...contestsData].sort((a, b) => Number(b.id) - Number(a.id));
                if (!cancelled) {
                    setContests(sorted);
                    if (sorted.length > 0) {
                        setSelectedContestId(sorted[0].id);
                    }
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
                    data = localJson.rankingConsole.contests.data.find(c => c.id == selectedContestId);
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
                    data = localJson.rankingConsole?.readiness;
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
                        }
                    } catch (mockErr) {
                        console.error("Mock fetch progress error:", mockErr);
                    }
                }
            };
            fetchProgress();
        }
    }, [activeTab, selectedContestId, selectedRoundId]);

    let filteredSubmissions = [];
    if (roundProgress && roundProgress.teams) {
        filteredSubmissions = roundProgress.teams.filter(t => {
            const matchesSearch = t.teamName.toLowerCase().includes(searchQuery.toLowerCase());
            if (submissionFilter === 'SUBMITTED') {
                return matchesSearch && t.submissionState !== 'Not Submitted' && t.submissionState !== 'MISSED_DEADLINE';
            }
            if (submissionFilter === 'AWAITING') {
                return matchesSearch && t.submissionState === 'Not Submitted';
            }
            if (submissionFilter === 'NOT_SUBMITTED') {
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
                data = localJson.rankingConsole?.rankingResult;
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
        try {
            const token = localStorage.getItem("shms_token");
            try {
                const res = await fetch(API_BASE + "/rankings/publish", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contestId: Number(selectedContestId),
                        roundId: Number(selectedRoundId),
                        topN: Number(currentCompiledTopN)
                    })
                });
                if (!res.ok) throw new Error();
                alert("Leaderboard published successfully!");
            }
            catch {
                alert("Mock publish success!");
            }
        }
        catch (err) {
            console.error(err);
            alert("Failed to publish leaderboard.");
        }
    };

    const handleDownloadCSV = () => {
        if (!result || !result.results) return;

        const headers = ['Rank', 'Team Name', 'Average Score', 'Status'];
        const csvRows = [headers.join(',')];

        for (const row of result.results) {
            const isQualified = row.rank <= currentCompiledTopN;
            const csvStatus = isQualified ? 'QUALIFIED' : 'ELIMINATED';
            const values = [row.rank, `"${row.teamName}"`, row.averageScore, csvStatus];
            csvRows.push(values.join(','));
        }

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Leaderboard_${result.roundName || 'Result'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalTeams = readinessData.summary.totalTeams;
    const isTopNValid = Number.isInteger(Number(topN)) && Number(topN) > 0 && Number(topN) <= totalTeams;

    return (
        <div className="rankings-container">
            <div className="rankings-content">
                {viewMode === 'ROUNDS_LIST' ? (
                    <>
                        <div className="rankings-page-header">
                            <div>
                                <h1 className="rankings-title">Rounds Management Dashboard</h1>
                                <p className="rankings-subtitle">Monitor round status, submission rate, and compile rankings for each stage.</p>
                            </div>
                            <div className="round-select-wrap">
                                <label className="round-select-label">Select Contest</label>
                                <select
                                    className="round-select"
                                    value={selectedContestId}
                                    onChange={e => {
                                        setSelectedContestId(e.target.value);
                                    }}
                                >
                                    {contests.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
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
                                                    <div className="timeline-row">
                                                        <span className="timeline-label">Starts:</span>
                                                        <span className="timeline-value">{formatDateOnly(round.submissionOpen)}</span>
                                                    </div>
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
                                                                backgroundColor: '#3b82f6' /* Màu xanh dương chủ đạo cho vòng đang active */
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
                            Back to Rounds Dashboard
                        </button>

                        <div className="rankings-page-header">
                            <div>
                                <h1 className="rankings-title">{selectedRound?.phaseName}</h1>
                                <p className="rankings-subtitle">
                                    Contest: {contests.find(c => String(c.id) === String(selectedContestId))?.name || 'Selected Contest'}
                                </p>
                            </div>
                        </div>

                        {viewMode === 'COMPILATION_VIEW' && (
                            <>
                                <div className={`readiness-banner ${readinessData.allReady ? 'ready' : 'not-ready'}`}>
                                    <div className="readiness-icon">
                                        {readinessData.allReady
                                            ? <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            : <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
                                        }
                                    </div>
                                    <div className="readiness-text">
                                        <h3>{readinessData.allReady ? 'Readiness Check Passed' : 'Readiness Check: Pending'}</h3>
                                        <p>
                                            {readinessData.allReady
                                                ? `All ${readinessData.evaluators.length}/${readinessData.evaluators.length} Evaluators have finalized their scores. Data is synchronized and ready for ranking compilation.`
                                                : `${readinessData.evaluators.filter(e => e.status !== 'Finalized').length} evaluator(s) have not yet finalized scores. Ranking generation is locked until all panels are complete.`
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="rankings-grid">
                                    <div className="config-card">
                                        <h2 className="config-card-title">Promotion Configuration</h2>
                                        <p className="config-card-desc">Define how many teams will advance to the next stage based on the compiled rankings.</p>
                                        <label className="config-label">Define Top N Promotion Cap</label>
                                        <input
                                            type="number"
                                            className="top-n-input"
                                            value={topN}
                                            min={0}
                                            max={readinessData.summary.totalTeams}
                                            onKeyDown={(e) => {
                                                if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                                            }}
                                            onWheel={(e) => e.target.blur()}// Chặn hành vi cuộn chuột làm nhảy số
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (!/^\d*$/.test(value)) return;
                                                if (value === '') { setTopN(''); return; }
                                                const num = Number(value);
                                                if (num < 0) { setTopN(1); }
                                                else if (num > readinessData.summary.totalTeams) { setTopN(readinessData.summary.totalTeams); }
                                                else { setTopN(num); }
                                            }}
                                        />
                                        <button
                                            id="btn-generate-ranking"
                                            className={`execute-btn ${isProcessing ? 'processing' : ''}`}
                                            disabled={!readinessData.allReady || isProcessing || !isTopNValid}
                                            onClick={handleGenerate}
                                        >
                                            {isProcessing ? 'Processing...' : 'Generate Leaderboard & Execute Promotion'}
                                        </button>
                                        <div className="config-warning">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            This action will lock current scores.
                                        </div>
                                    </div>

                                    <div className="summary-card">
                                        <div className="summary-card-header">
                                            <h2 className="summary-card-title">Pre-Compilation Summary</h2>
                                            <span className="live-badge">Live DB Sync</span>
                                        </div>
                                        <div className="stats-row">
                                            <div className="stat-cell">
                                                <div className="stat-cell-label">Total Teams</div>
                                                <div className="stat-cell-val">{readinessData.summary.totalTeams}</div>
                                            </div>
                                            <div className="stat-cell">
                                                <div className="stat-cell-label">Avg. Score</div>
                                                <div className="stat-cell-val">{readinessData.summary.avgScore}</div>
                                            </div>
                                            <div className="stat-cell">
                                                <div className="stat-cell-label">Score Range</div>
                                                <div className="stat-cell-val" style={{ fontSize: '26px' }}>{readinessData.summary.scoreRange}</div>
                                            </div>
                                        </div>
                                        <div style={{ height: '150px', marginTop: '16px' }}>
                                            <Bar
                                                data={{
                                                    labels: ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80-90', '90-100'],
                                                    datasets: [{
                                                        label: 'Teams', data: readinessData.summary.bars,
                                                        backgroundColor: 'rgba(54, 162, 235, 0.6)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1,
                                                    }]
                                                }}
                                                options={{
                                                    responsive: true, maintainAspectRatio: false,
                                                    plugins: { legend: { display: false } },
                                                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="eval-table-card">
                                    <table className="eval-table">
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

                                {result && (
                                    <div className="result-card visible" style={{ marginTop: 24 }}>
                                        <h2 className="result-card-title">✓ Ranking Generated Successfully</h2>
                                        <p className="result-card-sub">Round: {result.roundName} · Top N = {currentCompiledTopN} · Scores are now locked.</p>
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
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <button className="btn-secondary" onClick={handleDownloadCSV} style={{ padding: '6px 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#374151', color: 'white', border: '1px solid #4b5563', borderRadius: '6px' }}>
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                    Download Full Rankings CSV
                                                </button>
                                                <button className="btn-primary" onClick={handlePublish} style={{ padding: '6px 12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px' }}>
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                    Publish Results
                                                </button>
                                            </div>
                                        </div>
                                        <table className="eval-table" style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ color: '#0f172a' }}>Rank</th>
                                                    <th style={{ color: '#0f172a' }}>Team Name</th>
                                                    <th style={{ color: '#0f172a' }}>Average Score</th>
                                                    <th style={{ color: '#0f172a' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.results.map(r => {
                                                    const isQualified = r.rank <= currentCompiledTopN;
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

                                        {roundProgress && (
                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                <span style={{ padding: '6px 12px', background: roundProgress.roundStatus === 'OPEN' ? '#dcfce7' : '#f1f5f9', color: roundProgress.roundStatus === 'OPEN' ? '#16a34a' : '#475569', borderRadius: '20px', fontSize: '13px', fontWeight: 600 }}>
                                                    {roundProgress.roundStatus}
                                                </span>
                                                <span style={{ fontSize: '14px', color: '#4b5563', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {roundProgress.roundStatus !== 'CLOSED' && (
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                        </svg>
                                                    )} {roundProgress.roundStatus !== 'CLOSED' ? roundProgress.timeRemaining : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <button onClick={() => setSubmissionFilter('ALL')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #d1d5db', background: submissionFilter === 'ALL' ? '#1e293b' : 'white', color: submissionFilter === 'ALL' ? 'white' : '#4b5563', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>All</button>
                                        <button onClick={() => setSubmissionFilter('SUBMITTED')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #86efac', background: submissionFilter === 'SUBMITTED' ? '#16a34a' : 'white', color: submissionFilter === 'SUBMITTED' ? 'white' : '#15803d', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Submitted ({roundProgress?.submittedCount || 0})</button>
                                        <button onClick={() => setSubmissionFilter('AWAITING')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #fde68a', background: submissionFilter === 'AWAITING' ? '#ca8a04' : 'white', color: submissionFilter === 'AWAITING' ? 'white' : '#a16207', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Awaiting Submission ({roundProgress?.awaitingCount || 0})</button>
                                        <button onClick={() => setSubmissionFilter('NOT_SUBMITTED')} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #fca5a5', background: submissionFilter === 'NOT_SUBMITTED' ? '#dc2626' : 'white', color: submissionFilter === 'NOT_SUBMITTED' ? 'white' : '#b91c1c', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>Not Submitted ({roundProgress?.notSubmittedCount || 0})</button>
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
                                                        displayText = 'Not Submitted (0 pts)';
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
                                                            <button
                                                                style={{ padding: '6px 12px', fontSize: '13px', background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
                                                                onClick={() => setViewSubmissionModal({ isOpen: true, team })}
                                                            >
                                                                View Submission Form
                                                            </button>
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
                    const isRequired = (key) => !reqsStr || reqsStr === '[]' || reqsStr.includes(key);
                    const getAssetLinkClass = (url) => url ? 'asset-valid' : 'asset-missing';
                    const renderModalAssetLink = (url, label, iconPath) => {
                        const isValid = !!url;
                        return (
                            <a href={url ? getAssetUrl(url) : '#'} className={`asset-link ${getAssetLinkClass(url)}`}
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

                                    {isRequired('githubUrl') && renderModalAssetLink(team.repoUrl, 'GitHub Repository', 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4')}
                                    {isRequired('demoUrl') && renderModalAssetLink(team.demoUrl, 'Live Demo', 'M13 10V3L4 14h7v7l9-11h-7z')}
                                    {isRequired('documentUrl') && renderModalAssetLink(team.docUrl, 'Project Documentation', 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
                                    {isRequired('slideUrl') && renderModalAssetLink(team.slideUrl, 'Presentation Slides', 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12')}
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
        </div>
    );
};

export default RankingsConsole;
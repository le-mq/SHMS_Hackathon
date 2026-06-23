import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './RankingsConsole.css';
import NavbarAdmin from './NavbarAdmin';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE = "http://localhost:8080/api/v1/admin";
const RankingsConsole = () => {
    const [topN, setTopN] = useState(10);
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [rounds, setRounds] = useState(['Phase 01: Screening', 'Phase 02: Semi-Final', 'Phase 03: Final']);
    const [round, setRound] = useState('Phase 01: Screening');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [readinessData, setReadinessData] = useState({
        summary: { totalTeams: 0, avgScore: 0.0, scoreRange: '0-0', bars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        evaluators: [],
        allReady: false
    });

    useEffect(() => {
        let cancelled = false;
        async function fetchInitialData() {
            try {
                const token = localStorage.getItem("shms_token");
                const res = await fetch(API_BASE + "/contests", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                if (!res.ok)
                    throw new Error("HTTP " + res.status);
                const json = await res.json();
                const contestsData =
                    Array.isArray(json)
                        ? json
                        : json.data || [];
                if (!cancelled) {
                    setContests(contestsData);
                    if (contestsData.length > 0) {
                        setSelectedContestId(contestsData[0].id);
                    }
                }
            }
            catch (error) {
                console.warn(error.message);
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                const contestsData = localJson.rankingConsole?.contests?.data || [];
                if (!cancelled) {
                    setContests(contestsData);
                    if (contestsData.length > 0) {
                        setSelectedContestId(contestsData[0].id);
                    }
                }
            }
        }
        fetchInitialData();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const fetchRounds = async () => {
            if (!selectedContestId)
                return;
            try {
                let data;
                try {
                    const token = localStorage.getItem("shms_token");
                    const res = await fetch(API_BASE + `/contests/${selectedContestId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (!res.ok)
                        throw new Error();
                    data = await res.json();
                }
                catch {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    data = localJson.rankingConsole.contests.data.find(c => c.id == selectedContestId);
                }
                if (data.tracks) {
                    const rounds = data.tracks.flatMap(track => track.rounds || [])
                        .map(round => round.phaseName);
                    setRounds(rounds);
                }
            }
            catch (err) {
                console.error(err);
            }
        };
        fetchRounds();
    }, [selectedContestId]);

    useEffect(() => {
        const fetchReadiness = async () => {
            if (!selectedContestId || !round)
                return;
            try {
                let data;
                try {
                    const token = localStorage.getItem("shms_token");
                    const res = await fetch(API_BASE + `/rankings/readiness?contestId=${selectedContestId}&round=${round}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    if (!res.ok)
                        throw new Error();
                    data = await res.json();
                }
                catch {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    data = localJson.rankingConsole?.readiness;
                }
                setReadinessData(data);
                setResult(null);
                setReadinessData(data);
                setResult(null);
            }
            catch (err) {
                console.error(err);
                setReadinessData({
                    summary: {
                        totalTeams: 0,
                        avgScore: 0,
                        scoreRange: '0-0',
                        bars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                    },
                    evaluators: [],
                    allReady: false
                });
            }
        };
        fetchReadiness();
    }, [selectedContestId, round]);

    const handleGenerate = async () => {
        if (!readinessData.allReady) return;
        setIsProcessing(true);
        setResult(null);
        try {
            let data;
            try {
                const res = await fetch(API_BASE + "/rankings/process", { method: "POST" });
                if (!res.ok)
                    throw new Error();
                data = await res.json();
            }
            catch {
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                data = localJson.rankingConsole?.rankingResult;
            }
            setResult(data);
        } catch (err) {
            console.error(err);
        }
        finally {
            setIsProcessing(false);
        }
    };

    const handlePublish = async () => {
        if (!result)
            return;
        try {
            try {
                const res = await fetch(API_BASE + "/rankings/publish", { method: "POST" });
                if (!res.ok)
                    throw new Error();
                alert("Leaderboard published successfully!");
            }
            catch {
                alert("Mock publish success!");
            }
            alert("Leaderboard published successfully!");
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
            const values = [
                row.rank,
                `"${row.teamName}"`,
                row.averageScore,
                row.status
            ];
            csvRows.push(values.join(','));
        }

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Leaderboard_${result.roundName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const maxBar = Math.max(...readinessData.summary.bars, 1);
    const totalTeams = readinessData.summary.totalTeams;

    const isTopNValid =
        Number.isInteger(Number(topN)) &&
        Number(topN) > 0 &&
        Number(topN) <= totalTeams;
    return (
        <div className="rankings-container">
            <NavbarAdmin />

            <div className="rankings-content">
                <div className="rankings-page-header">
                    <div>
                        <h1 className="rankings-title">Rankings Compilation Console</h1>
                        <p className="rankings-subtitle">Aggregate evaluator scores and finalize the leaderboard for promotion.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="round-select-wrap">
                            <label className="round-select-label">Select Contest</label>
                            <select className="round-select" value={selectedContestId} onChange={e => setSelectedContestId(e.target.value)}>
                                {contests.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="round-select-wrap">
                            <label className="round-select-label">Competition Round</label>
                            <select className="round-select" value={round} onChange={e => setRound(e.target.value)}>
                                {rounds.map((r, i) => <option key={i} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

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
                        <p className="config-card-desc">
                            Define how many teams will advance to the next stage based on the compiled rankings.
                        </p>
                        <label className="config-label">Define Top N Promotion Cap</label>
                        <input
                            type="number"
                            className="top-n-input"
                            value={topN}
                            min={1}
                            max={readinessData.summary.totalTeams}
                            onKeyDown={(e) => {
                                // Chặn e, E, +, -, .
                                if (
                                    ['e', 'E', '+', '-', '.'].includes(e.key)
                                ) {
                                    e.preventDefault();
                                }
                            }}
                            onChange={(e) => {
                                const value = e.target.value;
                                if (!/^\d*$/.test(value)) return;
                                if (value === '') {
                                    setTopN('');
                                    return;
                                }
                                const num = Number(value);
                                if (num < 1) {
                                    setTopN(1);
                                } else if (num > readinessData.summary.totalTeams) {
                                    setTopN(readinessData.summary.totalTeams);
                                } else {
                                    setTopN(num);
                                }
                            }}
                        />
                        <button
                            id="btn-generate-ranking"
                            className={`generate-btn ${isProcessing ? 'processing' : ''}`}
                            disabled={
                                !readinessData.allReady ||
                                isProcessing ||
                                !isTopNValid
                            }
                            onClick={handleGenerate}
                        >
                            {isProcessing ? 'Processing...' : 'Generate Leaderboard & Execute Promotion'}
                        </button>
                        <div className="config-warning">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
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
                                        label: 'Teams',
                                        data: readinessData.summary.bars,
                                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                        borderColor: 'rgba(54, 162, 235, 1)',
                                        borderWidth: 1,
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
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
                                    <td>
                                        {ev.status === 'Finalized'
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
                    <div className={`result-card visible`} style={{ marginTop: 24 }}>
                        <h2 className="result-card-title">✓ Ranking Generated Successfully</h2>
                        <p className="result-card-sub">
                            Round: {result.roundName} · Top N = {topN} · Scores are now locked.
                        </p>
                        <div className="result-stats">
                            <div className="result-stat">
                                <div className="result-stat-label">Qualified</div>
                                <div className="result-stat-val qualified"> {topN} </div>
                            </div>
                            <div className="result-stat">
                                <div className="result-stat-label">Eliminated</div>
                                <div className="result-stat-val eliminated">{result.results.length - topN}</div>
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
                                    const isQualified = r.rank <= topN;
                                    return (
                                        <tr key={r.rank}>
                                            <td>#{r.rank}</td>
                                            <td>{r.teamName}</td>
                                            <td>{r.averageScore}</td>
                                            <td>
                                                <span
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                        background: isQualified ? '#dcfce7' : '#fee2e2',
                                                        color: isQualified ? '#166534' : '#991b1b'
                                                    }}
                                                >
                                                    {isQualified
                                                        ? 'QUALIFIED'
                                                        : 'ELIMINATED'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
export default RankingsConsole;

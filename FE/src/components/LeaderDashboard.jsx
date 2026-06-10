import './LeaderDashboard.css';
import './Navbars.css';
import NavbarStudent from './NavbarStudent';
import NavbarMentor from './NavbarMentor';
import NavbarJudge from './NavbarJudge';
import NavbarAdmin from './NavbarAdmin';

import { useState, useEffect } from 'react';

export const LeaderboardPresentation = ({ leaderboards }) => {
    const [selectedContestId, setSelectedContestId] = useState(null);
    const [selectedRound, setSelectedRound] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("All Categories");

    const debugInfo = <div style={{background: '#f0f0f0', padding: 10, fontSize: 10, wordBreak: 'break-all'}}>DEBUG: {JSON.stringify(leaderboards)}</div>;

    if (!leaderboards || leaderboards.length === 0) {
        return (
            <div className="leader-content" style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
                {debugInfo}
                <h2>No Leaderboards Published Yet</h2>
                <p>Check back later after the evaluators have finalized the scores.</p>
            </div>
        );
    }

    // Determine effective selection
    const effectiveContestId = selectedContestId || leaderboards[0].contestId;
    const effectiveRound = selectedRound || leaderboards.find(lb => lb.contestId === effectiveContestId)?.roundName || leaderboards[0].roundName;

    const contests = [];
    leaderboards.forEach(lb => {
        if (!contests.find(c => c.id === lb.contestId)) {
            contests.push({ id: lb.contestId, name: lb.data?.contestName || `Contest #${lb.contestId}` });
        }
    });

    const rounds = leaderboards.filter(lb => lb.contestId === effectiveContestId).map(lb => lb.roundName);
    const currentBoard = leaderboards.find(lb => lb.contestId === effectiveContestId && lb.roundName === effectiveRound);
    
    const categories = [];
    if (currentBoard && currentBoard.data && currentBoard.data.results) {
        currentBoard.data.results.forEach(r => {
            if (r.categoryName && !categories.includes(r.categoryName)) {
                categories.push(r.categoryName);
            }
        });
    }

    let results = currentBoard ? currentBoard.data.results || [] : [];
    if (selectedCategory !== "All Categories") {
        results = results.filter(r => r.categoryName === selectedCategory);
    }

    const top3 = results.slice(0, 3);
    const others = results.slice(3);

    return (
        <div className="leader-content">
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#1e293b' }}>Official Results: {effectiveRound}</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select 
                        className="cat-select" 
                        value={effectiveContestId} 
                        onChange={e => {
                            const newContestId = parseInt(e.target.value);
                            setSelectedContestId(newContestId);
                            const firstRound = leaderboards.find(lb => lb.contestId === newContestId)?.roundName;
                            setSelectedRound(firstRound);
                            setSelectedCategory("All Categories");
                        }}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                        {contests.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <select 
                        className="cat-select" 
                        value={effectiveRound} 
                        onChange={e => {
                            setSelectedRound(e.target.value);
                            setSelectedCategory("All Categories");
                        }}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                        {rounds.map((r, idx) => (
                            <option key={idx} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="top-pods-row">
                {/* Rank 2 */}
                {top3[1] && (
                    <div className="pod-card">
                        <div className="pod-rank-bg">2</div>
                        <div className="pod-avatar">
                            <svg width="40" height="40" fill="none" stroke="#60a5fa" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <div className="pod-name">{top3[1].teamName}</div>
                        <div className="pod-score">{top3[1].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                    </div>
                )}

                {/* Rank 1 */}
                {top3[0] && (
                    <div className="pod-card pod-1">
                        <div className="pod-rank-bg">1</div>
                        <div className="pod-avatar">
                            <svg width="48" height="48" fill="none" stroke="#38bdf8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        </div>
                        <div style={{ background: '#e2e8f0', color: '#0f172a', fontSize: '10px', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 2 }}>
                            LEADER
                        </div>
                        <div className="pod-name">{top3[0].teamName}</div>
                        <div className="pod-score">{top3[0].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                    </div>
                )}

                {/* Rank 3 */}
                {top3[2] && (
                    <div className="pod-card">
                        <div className="pod-rank-bg">3</div>
                        <div className="pod-avatar" style={{ background: 'white', borderColor: '#fed7aa' }}>
                            <svg width="40" height="40" fill="none" stroke="#f97316" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div className="pod-name">{top3[2].teamName}</div>
                        <div className="pod-score">{top3[2].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                    </div>
                )}
            </div>

            <div className="leader-table-card">
                <div className="lt-header">
                    <h2 className="lt-title">Global Ranking</h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select 
                            className="cat-select" 
                            value={selectedCategory} 
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            <option value="All Categories">All Categories</option>
                            {categories.map((cat, idx) => (
                                <option key={idx} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button className="page-btn"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg></button>
                    </div>
                </div>
                <table className="lt-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Team Name</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {others.map((team, idx) => (
                            <tr key={idx}>
                                <td><div className="rank-box">{team.rank}</div></td>
                                <td>
                                    <div className="team-main">
                                        <div className="team-abbr">{team.teamName.substring(0,2).toUpperCase()}</div>
                                        <div className="team-name-str">
                                            <strong>{team.teamName}</strong>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ fontSize: '13px', color: '#475569' }}>{team.categoryName}</td>
                                <td>
                                    <span className={`tbl-status ${team.status === 'QUALIFIED' ? 'st-stable' : 'st-steady'}`}>
                                        {team.status}
                                    </span>
                                </td>
                                <td>{team.averageScore}</td>
                            </tr>
                        ))}
                        {others.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No other teams</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const LeaderboardContent = ({ leaderboards }) => {
    const [fetchedLeaderboards, setFetchedLeaderboards] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        if (!leaderboards) {
            fetch('http://localhost:8080/api/v1/public/leaderboards', { cache: 'no-store' })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(data => {
                    if (!Array.isArray(data)) {
                        throw new Error(`Data is not an array: ${JSON.stringify(data)}`);
                    }
                    const boardsMap = {};
                    data.forEach(item => {
                        const key = `${item.contestId}-${item.roundName}`;
                        if (!boardsMap[key]) {
                            boardsMap[key] = {
                                contestId: item.contestId,
                                roundName: item.roundName,
                                publishedAt: item.publishedAt,
                                data: {
                                    contestName: item.contestName || `Contest #${item.contestId}`,
                                    results: []
                                }
                            };
                        }
                        boardsMap[key].data.results.push({
                            teamName: item.teamName,
                            rank: item.rank,
                            categoryName: item.categoryName || 'General',
                            status: item.status,
                            averageScore: item.finalScore
                        });
                    });
                    
                    const groupedBoards = Object.values(boardsMap);
                    groupedBoards.forEach(board => {
                        board.data.results.sort((a, b) => a.rank - b.rank);
                    });
                    
                    const sorted = groupedBoards.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
                    setFetchedLeaderboards(sorted);
                })
                .catch(err => {
                    console.error(err);
                    setErrorMsg(err.toString());
                });
        }
    }, [leaderboards]);

    if (errorMsg) {
        return (
            <div style={{color: 'red', padding: '20px', textAlign: 'center'}}>
                <h3>Fetch Error</h3>
                <p>{errorMsg}</p>
            </div>
        );
    }

    const dataToRender = leaderboards || fetchedLeaderboards;
    return <LeaderboardPresentation leaderboards={dataToRender} />;
};

const LeaderDashboard = () => {
    const role = localStorage.getItem('shms_role');

    const renderNavbar = () => {
        if (role === 'COORDINATOR') return <NavbarAdmin />;
        if (role === 'JUDGE') return <NavbarJudge />;
        if (role === 'MENTOR') return <NavbarMentor />;
        if (role === 'STUDENT') return <NavbarStudent />;
        return (
            <nav className="public-nav">
                <div className="public-nav-brand">S-HMS | <span>SEAL Hackathon</span></div>
                <div className="public-nav-links">
                    <a href="/">Home</a>
                    <a href="/leaderboard" className="active">Leaderboard</a>
                </div>
                <div className="ph-nav-actions" style={{ justifySelf: 'end', display: 'flex', gap: '10px' }}>
                    <a href="/login" className="ph-btn-ghost" style={{ textDecoration: 'none' }}>Login</a>
                    <a href="/register" className="ph-btn-primary" style={{ textDecoration: 'none' }}>Register</a>
                </div>
            </nav>
        );
    };

    return (
        <div className="leader-dash-container">
            {renderNavbar()}
            <LeaderboardContent />
        </div>
    );
};

export default LeaderDashboard;

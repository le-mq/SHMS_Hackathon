import React, { useState, useEffect } from 'react';
import './LeaderboardDashboard.css';
import NavbarHome from './NavbarHome.jsx';
import NavbarStudent from './NavbarStudent';
import NavbarMentor from './NavbarMentor';
import NavbarJudge from './NavbarJudge';
import NavbarAdmin from './NavbarAdmin';

export const LeaderboardPresentation = ({ leaderboards }) => {
    const [selectedContestId, setSelectedContestId] = useState(null);
    const [selectedRound, setSelectedRound] = useState(null);
    useEffect(() => {
        if (leaderboards && leaderboards.length > 0) {
            const firstBoard = leaderboards[0];
            setSelectedContestId(firstBoard.contestId);
            setSelectedRound(firstBoard.roundName);
        }
    }, [leaderboards]);
    if (!leaderboards || leaderboards.length === 0) {
        return (
            <div className="leader-content" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <h2>No Leaderboards Published Yet</h2>
                <p>Check back later after the evaluators have finalized the scores.</p>
            </div>
        );
    }
    const contests = [];
    leaderboards.forEach(lb => {
        if (!contests.find(c => Number(c.id) === Number(lb.contestId))) {
            contests.push({ id: Number(lb.contestId), name: lb.data?.contestName || `Contest #${lb.contestId}` });
        }
    });
    const rounds = Array.from(new Set(leaderboards
        .filter(lb => Number(lb.contestId) === Number(selectedContestId))
        .map(lb => lb.roundName)));
    const currentBoard = leaderboards.find(lb => Number(lb.contestId) === Number(selectedContestId) && lb.roundName === selectedRound);
    const rawResults = currentBoard?.data?.results || [];
    const top3 = rawResults.slice(0, 3);
    const others = rawResults.slice(3);
    return (
        <div className="leader-content">
            <div style={{ marginBottom: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ color: '#1e293b' }}>Official Results: {selectedRound}</h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select className="cat-select" value={selectedContestId || ""}
                            onChange={e => {
                                const newContestId = Number(e.target.value);
                                setSelectedContestId(newContestId);
                                const targetBoard = leaderboards.find(lb => Number(lb.contestId) === newContestId);
                                setSelectedRound(targetBoard?.roundName || "");
                            }}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >{contests.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>

                    <select className="cat-select" value={selectedRound || ""}
                            onChange={e => {
                                const newRound = e.target.value; setSelectedRound(newRound);
                            }}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >{rounds.map((r, idx) => (<option key={idx} value={r}>{r}</option>))}</select>
                </div>
            </div>
            <div className="top-pods-row">
                {top3[1] && (
                    <div className="pod-card" style={{ height: '90%' }}>
                        <div className="pod-rank-bg">2</div>
                        <div className="pod-name">{top3[1].teamName}</div>
                        <div className="pod-score">{top3[1].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                    </div>
                )}
                {top3[0] && (
                    <div className="pod-card pod-1">
                        <div className="pod-rank-bg">1</div>
                        <div className="pod-name">{top3[0].teamName}</div>
                        <div className="pod-score">{top3[0].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                    </div>
                )}
                {top3[2] && (
                    <div className="pod-card" style={{ height: '75%' }}>
                        <div className="pod-rank-bg">3</div>
                        <div className="pod-name">{top3[2].teamName}</div>
                        <div className="pod-score">{top3[2].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                    </div>
                )}
            </div>
            <div className="leader-table-card">
                <div className="lt-header">
                    <h2 className="lt-title">Ranking</h2>
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
                            <td><div className="team-main"><div className="team-name-str"><strong>{team.teamName}</strong></div></div></td>
                            <td style={{ fontSize: '13px', color: '#475569' }}>{team.categoryName}</td>
                            <td><span className={`tbl-status ${team.status === 'QUALIFIED' ? 'st-stable' : 'st-steady'}`}>{team.status}</span>
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
function processLeaderboardData(rawData) {
    const boardsMap = {};
    rawData.forEach(item => {
        if (item.status !== 'QUALIFIED') return;
        const key = `${item.contestId}-${item.roundName}`;
        if (!boardsMap[key]) {
            boardsMap[key] = {
                contestId: item.contestId, roundName: item.roundName, publishedAt: item.publishedAt,
                data: { contestName: item.contestName || `Contest #${item.contestId}`, results: [] }
            };
        }
        boardsMap[key].data.results.push({
            teamName: item.teamName, rank: item.rank, categoryName: item.categoryName || "", status: item.status, averageScore: item.finalScore
        });
    });

    return Object.values(boardsMap)
        .map(board => {
            board.data.results.sort((a, b) => a.rank - b.rank);
            return board;
        })
        .sort((a, b) => {
            if (Number(b.contestId) !== Number(a.contestId)) return Number(b.contestId) - Number(a.contestId);
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });
}

export const LeaderboardContent = ({ leaderboards }) => {
    const [fetchedLeaderboards, setFetchedLeaderboards] = useState([]);
    useEffect(() => {
        if (leaderboards) return;
        async function getLeaderboard() {
            try {
                const res = await fetch('http://localhost:8080/api/v1/public/leaderboards');
                if (!res.ok) throw new Error("API Failed");
                const data = await res.json();
                setFetchedLeaderboards(processLeaderboardData(data));
            } catch (err) {
                try {
                    const fallbackRes = await fetch('/testFE.json');
                    const mock = await fallbackRes.json();
                    setFetchedLeaderboards(processLeaderboardData(mock.leaderboard.data));
                } catch (fallbackErr) {
                    console.error("All data sources unavailable.");
                }
            }
        }
        getLeaderboard();
    }, [leaderboards]);

    return <LeaderboardPresentation leaderboards={leaderboards || fetchedLeaderboards} />;
};

const LeaderboardDashboard = () => {
    const role = localStorage.getItem('shms_role');
    const renderNavbar = () => {
        const navbars = { ADMIN: <NavbarAdmin />,
            JUDGE: <NavbarJudge />, MENTOR: <NavbarMentor />, STUDENT: <NavbarStudent />, LEADER: <NavbarStudent /> };
        return navbars[role] || <NavbarHome />;
    };

    return (
        <div className="leader-dash-container">
            {renderNavbar()}
            <LeaderboardContent />
        </div>
    );
};

export default LeaderboardDashboard;
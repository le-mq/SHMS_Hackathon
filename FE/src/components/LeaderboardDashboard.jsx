import React, { useState, useEffect } from 'react';
import './LeaderboardDashboard.css';
import NavbarHome from './NavbarHome.jsx';
import NavbarStudent from './NavbarStudent';
import NavbarMentor from './NavbarMentor';
import NavbarJudge from './NavbarJudge';

export const LeaderboardPresentation = ({ leaderboards, contestsInfo = [] }) => {
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

    // Check if the selected round is the final round
    let isFinalRound = false;
    const currentContest = contestsInfo.find(c => Number(c.id) === Number(selectedContestId));
    if (currentContest && currentContest.rounds && currentContest.rounds.length > 0) {
        const sortedRounds = [...currentContest.rounds].sort((a, b) => new Date(a.submissionDeadline || 0) - new Date(b.submissionDeadline || 0));
        const lastRound = sortedRounds[sortedRounds.length - 1];
        if (lastRound.phaseName === selectedRound || lastRound.roundName === selectedRound) {
            isFinalRound = true;
        }
    } else {
        isFinalRound = (selectedRound || "").toLowerCase().includes("final");
    }

    const getPrizeName = (rank) => {
        if (!isFinalRound) return null;
        let amount = "";
        const prizeStructs = currentBoard?.data?.prizeStructures;
        let hasConfiguredPrize = false;
        if (prizeStructs && Array.isArray(prizeStructs)) {
            // Usually the array is sorted (0: First Prize, 1: Second Prize)
            const found = prizeStructs[rank - 1];
            if (found) {
                hasConfiguredPrize = true;
                if (found.amount) {
                    amount = ` - ${found.amount}`;
                }
            }
        }

        if (rank === 1) return `First Prize${amount}`;
        if (rank === 2) return `Second Prize${amount}`;
        if (rank === 3) return `Third Prize${amount}`;

        if (rank === 4 || hasConfiguredPrize) {
            return `Consolation Prize${amount}`;
        }
        return null;
    };
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
                        {isFinalRound && <div style={{marginTop: '8px', fontWeight: 'bold', color: '#0ea5e9'}}>{getPrizeName(top3[1].rank)}</div>}
                    </div>
                )}
                {top3[0] && (
                    <div className="pod-card pod-1">
                        <div className="pod-rank-bg">1</div>
                        <div className="pod-name">{top3[0].teamName}</div>
                        <div className="pod-score">{top3[0].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                        {isFinalRound && <div style={{marginTop: '8px', fontWeight: 'bold', color: '#eab308'}}>{getPrizeName(top3[0].rank)}</div>}
                    </div>
                )}
                {top3[2] && (
                    <div className="pod-card" style={{ height: '75%' }}>
                        <div className="pod-rank-bg">3</div>
                        <div className="pod-name">{top3[2].teamName}</div>
                        <div className="pod-score">{top3[2].averageScore}</div>
                        <div className="pod-pts-label">POINTS</div>
                        {isFinalRound && <div style={{marginTop: '8px', fontWeight: 'bold', color: '#f97316'}}>{getPrizeName(top3[2].rank)}</div>}
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
                        {isFinalRound && <th>Prize</th>}
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
                            {isFinalRound && <td style={{fontWeight: 'bold', color: '#64748b'}}>{getPrizeName(team.rank)}</td>}
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
            let parsedPrize = null;
            if (item.prizeStructures) {
                try {
                    parsedPrize = JSON.parse(item.prizeStructures);
                } catch(e) {}
            }
            boardsMap[key] = {
                contestId: item.contestId, roundName: item.roundName, publishedAt: item.publishedAt,
                data: { contestName: item.contestName || `Contest #${item.contestId}`, results: [], prizeStructures: parsedPrize }
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
            const timeDiff = new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
            if (timeDiff !== 0) return timeDiff;
            return Number(b.contestId) - Number(a.contestId);
        });
}

export const LeaderboardContent = ({ leaderboards }) => {
    const [fetchedLeaderboards, setFetchedLeaderboards] = useState([]);
    const [contestsInfo, setContestsInfo] = useState([]);
    useEffect(() => {
        async function getLeaderboard() {
            try {
                const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/public/leaderboards");
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

        async function getContests() {
            try {
                const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/public/home");
                if (res.ok) {
                    const data = await res.json();
                    setContestsInfo(data.contests || []);
                }
            } catch (err) {
                try {
                    const fallbackRes = await fetch('/testFE.json');
                    const mock = await fallbackRes.json();
                    setContestsInfo(mock.contests?.data || []);
                } catch(e) {}
            }
        }

        if (!leaderboards) {
            getLeaderboard();
        }
        getContests();
    }, [leaderboards]);

    return <LeaderboardPresentation leaderboards={leaderboards || fetchedLeaderboards} contestsInfo={contestsInfo} />;
};

const LeaderboardDashboard = () => {
    const role = localStorage.getItem('shms_role');
    const renderNavbar = () => {
        if (role === 'ADMIN') return <NavbarHome />;
        const navbars = {
            JUDGE: <NavbarJudge />, MENTOR: <NavbarMentor />, STUDENT: <NavbarStudent />, LEADER: <NavbarStudent />
        };
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
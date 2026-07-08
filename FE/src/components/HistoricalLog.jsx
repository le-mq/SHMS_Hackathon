import { useState, useEffect } from 'react';
import './HistoricalLog.css';

const HistoricalLog = () => {
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [selectedContest, setSelectedContest] = useState('');
    const [selectedRound, setSelectedRound] = useState('');
    useEffect(() => {
        setSelectedRound('');
    }, [selectedContest]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch('http://localhost:8080/api/v1/judge/history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setRecords(data.records || []);
                } else {
                    throw new Error("API failed");
                }
            } catch {
                console.warn("API failed, falling back to mock data...");
                try {
                    const fallback = await fetch('/testFE.json');
                    const mock = await fallback.json();
                    setRecords(mock.judgeHistory?.data?.records || []);
                } catch (mockErr) {
                    console.error("Failed to fetch mock data");
                }
            }
        };
        fetchHistory();
    }, []);
    const contests = Array.from(new Set(records.map(r => r.contestName).filter(Boolean)));
    const rounds = Array.from(new Set(records
        .filter(r => !selectedContest || r.contestName === selectedContest)
        .map(r => r.roundStatus)
        .filter(Boolean)
    ));
    let displayRecords = records.length > 0 ? records : [];
    if (selectedContest) {
        displayRecords = displayRecords.filter(r => r.contestName === selectedContest);
    }
    if (selectedRound) {
        displayRecords = displayRecords.filter(r => r.roundStatus === selectedRound);
    }
    return (
        <>
            <div className="historical-container">
                <div className="historical-content">
                    <div className="historical-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div><h1 className="historical-title">Historical Evaluation Log</h1>
                            <p className="historical-subtitle">Review and manage your previous team assessments and scoring records.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <select value={selectedContest} onChange={e => setSelectedContest(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}>
                                <option value="">All Contests</option>
                                {contests.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select value={selectedRound} onChange={e => setSelectedRound(e.target.value)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}>
                                <option value="">All Rounds</option>
                                {rounds.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="historical-card">
                        <table className="historical-table">
                            <thead>
                            <tr>
                                <th>TEAM NAME</th>
                                <th>EVALUATION TIMESTAMP</th>
                                <th>CONTEST</th>
                                <th>ROUND</th>
                                <th>TOTAL SCORE</th>
                                <th>ACTIONS</th>
                            </tr>
                            </thead>
                            <tbody>
                            {displayRecords.map((rec, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <div className="hist-team-cell">
                                            <div><div className="hist-team-name">{rec.teamName}</div>
                                                <div className="hist-team-id">Team ID: {rec.teamId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="hist-timestamp">
                                            {rec.timestamp.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px' }}>
                                            {rec.contestName || 'Unknown Contest'}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="round-status-pill" style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                                                {rec.roundStatus || 'UNKNOWN ROUND'}
                                            </span>
                                    </td>
                                    <td>
                                        <div className="hist-score">
                                            <span className="hist-score-val">{rec.totalScore.toFixed(2)}</span>
                                            <div className="hist-score-bar" style={{ width: `${(rec.totalScore / 100) * 60}px` }}></div>
                                        </div>
                                    </td>
                                    <td>
                                        <button className="hist-action-btn hist-view" onClick={() => setSelectedRecord(rec)}>
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>View Summary</button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedRecord && (
                <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
                    <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Evaluation Summary: {selectedRecord.teamName}</h2>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: '20px' }}>
                                <strong style={{ color: '#334155' }}>Total Score: </strong>
                                <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{selectedRecord.totalScore.toFixed(2)} / 100</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {selectedRecord.details && selectedRecord.details.map((detail, idx) => (
                                    <div key={idx} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '600', color: '#0f172a' }}>
                                            <span>{detail.criteriaName} {detail.weight ? <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal', marginLeft: '8px' }}>(Weight: {detail.weight}%)</span> : null}</span>
                                            <span style={{ color: '#2563eb' }}>{detail.pointsAwarded} pts</span>
                                        </div>
                                        {detail.feedback && (
                                            <div style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic', background: 'white', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                                                "{detail.feedback}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!selectedRecord.details || selectedRecord.details.length === 0) && (
                                    <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0', margin: 0 }}>No detailed criteria data available.</p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setSelectedRecord(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HistoricalLog;
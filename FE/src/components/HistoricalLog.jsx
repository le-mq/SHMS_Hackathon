import { useState, useEffect } from 'react';
import './HistoricalLog.css';
import NavbarJudge from './NavbarJudge';

const TEAM_ICONS = {
    code: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
    ),
    lightning: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
    ),
    cloud: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
    ),
    shield: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
    ),
    terminal: (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    ),
};

const ICON_MAP = ['code', 'lightning', 'cloud', 'shield', 'terminal'];

const HistoricalLog = () => {
    const [records, setRecords] = useState([]);
    const [selectedRecord, setSelectedRecord] = useState(null);

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
                }
            } catch {
                // Fall through to use mock data
            }
        };
        fetchHistory();
    }, []);

    const displayRecords = records.length > 0 ? records : [
        { teamName: 'Neural Nexus', teamId: 'SEAL-2024-042', timestamp: 'Oct 24, 2024\n14:32 PM', roundStatus: 'ACTIVE_ROUND', totalScore: 88.5 },
        { teamName: 'Quantum Leap', teamId: 'SEAL-2024-015', timestamp: 'Oct 24, 2024\n11:15 AM', roundStatus: 'ACTIVE_ROUND', totalScore: 92.0 },
        { teamName: 'Cloud Catchers', teamId: 'SEAL-2024-009', timestamp: 'Oct 23, 2024\n16:45 PM', roundStatus: 'LOCKED', totalScore: 74.5 },
        { teamName: 'Cyber Sentry', teamId: 'SEAL-2024-088', timestamp: 'Oct 24, 2024\n09:30 AM', roundStatus: 'ACTIVE_ROUND', totalScore: 81.0 },
        { teamName: 'Syntax Error', teamId: 'SEAL-2024-051', timestamp: 'Oct 22, 2024\n15:10 PM', roundStatus: 'LOCKED', totalScore: 68.0 },
    ];

    return (
        <>
            <div className="historical-container">
            <NavbarJudge />

            <div className="historical-content">
                <div className="historical-header">
                    <h1 className="historical-title">Historical Evaluation Log</h1>
                    <p className="historical-subtitle">Review and manage your previous team assessments and scoring records.</p>
                </div>

                <div className="historical-card">
                    <table className="historical-table">
                        <thead>
                            <tr>
                                <th>TEAM NAME</th>
                                <th>EVALUATION TIMESTAMP</th>
                                <th>ROUND STATUS</th>
                                <th>TOTAL SCORE</th>
                                <th>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayRecords.map((rec, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <div className="hist-team-cell">
                                            <div className="hist-team-icon">
                                                {TEAM_ICONS[ICON_MAP[idx % ICON_MAP.length]]}
                                            </div>
                                            <div>
                                                <div className="hist-team-name">{rec.teamName}</div>
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
                                        <span className={`round-status-pill ${rec.roundStatus === 'ACTIVE_ROUND' ? 'rs-active' : 'rs-locked'}`}>
                                            {rec.roundStatus === 'ACTIVE_ROUND' ? 'ACTIVE ROUND' : 'LOCKED'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="hist-score">
                                            <span className="hist-score-val">{rec.totalScore.toFixed(1)}</span>
                                            <div className="hist-score-bar" style={{width: `${(rec.totalScore / 100) * 60}px`}}></div>
                                        </div>
                                    </td>
                                    <td>
                                        {rec.roundStatus === 'ACTIVE_ROUND' ? (
                                            <button className="hist-action-btn hist-reopen">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Reopen Sheet
                                            </button>
                                        ) : (
                                            <button className="hist-action-btn hist-view" onClick={() => setSelectedRecord(rec)}>
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                View Summary
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="historical-table-footer">
                        <span>Showing 1 to 5 of 42 evaluation entries</span>
                        <div className="pagination">
                            <button className="page-btn">‹</button>
                            <button className="page-btn active">1</button>
                            <button className="page-btn">2</button>
                            <button className="page-btn">3</button>
                            <button className="page-btn">›</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

            {selectedRecord && (
                <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
                    <div className="modal-content" style={{maxWidth: '600px', width: '90%'}} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Evaluation Summary: {selectedRecord.teamName}</h2>
                            <button className="close-btn" onClick={() => setSelectedRecord(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{marginBottom: '20px'}}>
                                <strong>Total Score: </strong> <span style={{fontSize: '18px', fontWeight: 'bold', color: '#10b981'}}>{selectedRecord.totalScore} / 100</span>
                            </div>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                {selectedRecord.details && selectedRecord.details.map((detail, idx) => (
                                    <div key={idx} style={{border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', background: '#f8fafc'}}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontWeight: '600'}}>
                                            <span>{detail.criteriaName}</span>
                                            <span>{detail.pointsAwarded} pts</span>
                                        </div>
                                        {detail.feedback && (
                                            <div style={{fontSize: '14px', color: '#475569', fontStyle: 'italic', background: 'white', padding: '12px', borderRadius: '4px', border: '1px solid #cbd5e1'}}>
                                                "{detail.feedback}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!selectedRecord.details || selectedRecord.details.length === 0) && (
                                    <p style={{color: '#64748b'}}>No detailed criteria data available.</p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer" style={{marginTop: '24px', display: 'flex', justifyContent: 'flex-end'}}>
                            <button className="btn-secondary" onClick={() => setSelectedRecord(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HistoricalLog;

import React, { useState, useEffect } from 'react';

const RoundDetailsModal = ({ roundId, contestId, mode = 'both', onClose }) => {
    const [evalData, setEvalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const formatRequirements = (reqs) => {
        if (!reqs) return 'No specific requirements documented.';
        try {
            const parsed = JSON.parse(reqs);
            if (Array.isArray(parsed)) {
                return parsed.map(r => String(r).trim()).filter(Boolean).join(' • ');
            }
        } catch (e) {
            // Ignore JSON parse error, treat as comma-separated
        }
        return reqs.split(',').map(r => r.trim()).filter(Boolean).join(' • ');
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (mode === 'contest' && contestId) {
                    const res = await fetch(import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"+"/public/home");
                    if (!res.ok) throw new Error('Failed to fetch public data');
                    const data = await res.json();
                    const c = (data.data?.contests || data.contests || []).find(x => x.id === parseInt(contestId));
                    if (c) {
                        setEvalData({
                            contestName: c.name,
                            contestTheme: c.description,
                            contestLocation: c.location,
                            contestStart: c.contestStartAt,
                            contestEnd: c.contestEndAt,
                            contestRules: c.complianceRules,
                            tieredPrizeStructures: c.tieredPrizeStructures,
                            rounds: c.rounds?.map(r => ({ name: r.phaseName, format: r.roundFormat }))
                        });
                        setLoading(false);
                        return;
                    }
                }
                if (!roundId) throw new Error('No evaluation data available');

                const token = localStorage.getItem('shms_token');
                const fetchUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"+`/judge/evaluation-data/0?roundId=${roundId}`;
                const response = await fetch(fetchUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch details');
                const result = await response.json();
                setEvalData(result);
            } catch (err) {
                console.error(err);
                setError('Failed to load round details.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [roundId]);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: '#fff', borderRadius: '12px', width: '700px', maxWidth: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700 }}>
                        {mode === 'contest' ? 'Contest Information' : mode === 'round' ? 'Round Requirements & Rubric' : 'Round Details & Rubric'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>&times;</button>
                </div>

                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Loading details...</div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', color: '#ef4444', padding: '40px 0' }}>{error}</div>
                    ) : evalData ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {(mode === 'both' || mode === 'contest') && evalData.contestName && (
                                <div>
                                    <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contest Information</h3>
                                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#0f172a' }}>{evalData.contestName}</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: '#475569' }}>
                                            {evalData.contestTheme && <div><strong>Theme:</strong> {evalData.contestTheme}</div>}
                                            {evalData.contestLocation && <div><strong>Location:</strong> {evalData.contestLocation}</div>}
                                            {(evalData.contestStart || evalData.contestEnd) && (
                                                <div style={{ display: 'flex', gap: '24px' }}>
                                                    {evalData.contestStart && <div><strong>Start Date:</strong> {new Date(evalData.contestStart).toLocaleDateString()}</div>}
                                                    {evalData.contestEnd && <div><strong>End Date:</strong> {new Date(evalData.contestEnd).toLocaleDateString()}</div>}
                                                </div>
                                            )}
                                            {evalData.rounds && evalData.rounds.length > 0 && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <strong style={{ display: 'block', marginBottom: '8px' }}>Rounds:</strong>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {evalData.rounds.map((r, i) => (
                                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}>
                                                                <span style={{ fontWeight: 600, color: '#334155' }}>{r.name}</span>
                                                                <span style={{ color: '#64748b' }}>{r.format || 'Standard'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {evalData.tieredPrizeStructures && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <strong style={{ display: 'block', marginBottom: '4px' }}>Prize Structure:</strong>
                                                    <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                                                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                            {(() => {
                                                                try {
                                                                    const prizes = JSON.parse(evalData.tieredPrizeStructures);
                                                                    if (Array.isArray(prizes)) {
                                                                        return prizes.map((p, i) => (
                                                                            <li key={i} style={{ marginBottom: '4px' }}>
                                                                                <strong style={{ color: '#0f172a' }}>{p.rank || p.name || p.prize}:</strong> <span style={{ color: '#166534', fontWeight: 600 }}>{p.amount || p.value}</span>
                                                                            </li>
                                                                        ));
                                                                    }
                                                                    return <li>{evalData.tieredPrizeStructures}</li>;
                                                                } catch(e) {
                                                                    return <li style={{ whiteSpace: 'pre-wrap' }}>{evalData.tieredPrizeStructures}</li>;
                                                                }
                                                            })()}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                            {evalData.contestRules && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <strong>Rules:</strong>
                                                    <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                                                        {(() => {
                                                            try {
                                                                const rules = JSON.parse(evalData.contestRules);
                                                                if (Array.isArray(rules)) {
                                                                    return rules.map((r, i) => (
                                                                        <li key={i} style={{ marginBottom: '4px' }}>
                                                                            <strong>{r.rule}</strong> {r.penalty && <span style={{ color: '#ef4444' }}>(Penalty: {r.penalty})</span>}
                                                                        </li>
                                                                    ));
                                                                }
                                                                return <li>{evalData.contestRules}</li>;
                                                            } catch(e) {
                                                                return <li>{evalData.contestRules}</li>;
                                                            }
                                                        })()}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            {(mode === 'both' || mode === 'round') && (
                                <>
                                    {evalData.contestRules && (
                                        <div>
                                            <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contest Rules</h3>
                                            <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                                                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                                    {(() => {
                                                        try {
                                                            const rules = JSON.parse(evalData.contestRules);
                                                            if (Array.isArray(rules)) {
                                                                return rules.map((r, i) => (
                                                                    <li key={i} style={{ marginBottom: '8px' }}>
                                                                        <strong>{r.rule || r.replace?.(/"/g, '') || r}</strong> {r.penalty && <span style={{ color: '#ef4444' }}>(Penalty: {r.penalty})</span>}
                                                                    </li>
                                                                ));
                                                            }
                                                            return <li>{evalData.contestRules}</li>;
                                                        } catch(e) {
                                                            return <li>{evalData.contestRules}</li>;
                                                        }
                                                    })()}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submission Requirements</h3>
                                        <div style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', color: '#0f172a', fontSize: '14px', whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                                            {formatRequirements(evalData.submissionRequirements)}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evaluation Rubric</h3>
                                        {evalData.criteria && evalData.criteria.length > 0 ? (
                                            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <tr>
                                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Criteria</th>
                                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Description</th>
                                                        <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, width: '100px', textAlign: 'center' }}>Weight</th>
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {evalData.criteria.map((c, idx) => (
                                                        <tr key={idx} style={{ borderBottom: idx < evalData.criteria.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                            <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 500, verticalAlign: 'top' }}>{c.name}</td>
                                                            <td style={{ padding: '12px 16px', color: '#475569', verticalAlign: 'top' }}>{c.description}</td>
                                                            <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600, textAlign: 'center', verticalAlign: 'top' }}>{c.weight}%</td>
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', textAlign: 'center' }}>
                                                No rubric criteria defined for this round.
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', background: '#f8fafc' }}>
                    <button onClick={onClose} style={{ padding: '8px 24px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default RoundDetailsModal;

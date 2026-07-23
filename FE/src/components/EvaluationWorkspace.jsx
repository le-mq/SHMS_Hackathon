import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './EvaluationWorkspace.css';

const EvaluationWorkspace = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const [evalData, setEvalData] = useState(null);
    const [scores, setScores] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const location = useLocation();
    const isReadonly = new URLSearchParams(location.search).get('readonly') === 'true';

    useEffect(() => {
        window.scrollTo(0, 0);
        const fetchEvalData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const urlParams = new URLSearchParams(window.location.search);
                const roundId = urlParams.get('roundId');
                let fetchUrl = '';
                if (teamId === 'preview' && roundId) {
                    fetchUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+`/judge/evaluation-data/0?roundId=${roundId}`;
                } else {
                    fetchUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+`/judge/evaluation-data/${teamId}`;
                    if (roundId) {
                        fetchUrl += `?roundId=${roundId}`;
                    }
                }
                const response = await fetch(fetchUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('API request failed');
                const result = await response.json();
                let parsedSubData = {};
                if (result && result.submissionData) {
                    try {
                        parsedSubData = JSON.parse(result.submissionData);
                    } catch(e) {}
                }

                const mappedResult = {
                    ...result,
                    ...parsedSubData,
                    parsedSubData
                };

                setEvalData(mappedResult);
                if (result && result.criteria) {
                    setScores(result.criteria.map(c => {
                        const rawId = c.id?.criteriaId || c.id?.rubricId || c.criterionId || c.id;
                        return {
                            criteriaId: rawId ? Number(rawId) : 0,
                            weight: c.weight || c.percentageWeight || 0,
                            pointsAwarded: c.pointsAwarded !== undefined && c.pointsAwarded !== null ? c.pointsAwarded : '',
                            feedback: c.feedback || ''
                        };
                    }));
                }
            } catch (err) {
                // console.warn('API call failed, falling back to mock data...');
                // try {
                //     const mockRes = await fetch('/testFE.json');
                //     const mockData = await mockRes.json();
                //     const result = mockData.evaluationWorkspace?.data;
                //     if (result && result.criteria) {
                //         setEvalData(result);
                //         setScores(result.criteria.map(c => {
                //             const rawId = c.id?.criteriaId || c.id?.rubricId || c.criterionId || c.id;
                //             return {
                //                 criteriaId: rawId ? Number(rawId) : 0,
                //                 weight: c.weight || c.percentageWeight || 0,
                //                 pointsAwarded: '',
                //                 feedback: ''
                //             };
                //         }));
                //     } else {
                //         alert('Failed to load evaluation data (no mock data found)');
                //     }
                // } catch (mockErr) {
                //     alert('Failed to load evaluation data');
                // }
                console.error('API call failed:', err);
                alert('Failed to load evaluation data. Ensure rubric is configured.');
            }
        };
        if (teamId) fetchEvalData();
    }, [teamId]);
    const handleScoreChange = (id, field, value) => {
        const targetId = Number(id);
        setScores(prev => prev.map(s => Number(s.criteriaId) === targetId ? { ...s, [field]: value } : s));
    };
    const calculateWeightedTotal = () => {
        const total = scores.reduce((sum, criteria) => {
            const pts = parseFloat(criteria.pointsAwarded);
            return !isNaN(pts) ? sum + (pts * (criteria.weight / 100)) : sum;
        }, 0);
        return total.toFixed(2);
    };
    const isComplete = scores.length > 0 && scores.every(s =>
        s.pointsAwarded !== '' && !isNaN(s.pointsAwarded) && s.pointsAwarded >= 0 && s.pointsAwarded <= 100
    );
    const handleSubmit = async () => {
        if (!isComplete) return;
        setIsSubmitting(true);
        const payload = {
            submissionId: Number(evalData?.submissionId || evalData?.id || teamId),
            scores: scores.map(s => ({
                criteriaId: Number(s.criteriaId),
                pointsAwarded: parseFloat(s.pointsAwarded),
                feedback: s.feedback || ""
            }))
        };
        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/judge/submit-score", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                alert('Scores submitted and locked successfully.');
                navigate('/judge/workspace');
            } else {
                const err = await response.json().catch(() => ({}));
                alert(`Error: ${err.error || err.message || 'Submission failed'}`);
            }
        } catch (err) {
            alert('Could not submit score.');
        } finally {
            setIsSubmitting(false);
        }
    };
    const renderAssetLink = (url, label, iconPath) => {
        const isValid = !!url;
        return (
            <a href={url || '#'} className={`asset-link ${isValid ? 'asset-valid' : 'asset-missing'}`}
               target="_blank" rel="noreferrer"
               onClick={e => !isValid && e.preventDefault()}
            ><div className="asset-left">
                <svg width="18" height="18" className="asset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                </svg>{label}
            </div>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
            </a>
        );
    };

    const isAutoZero = String(evalData?.status || evalData?.submissionStatus
        || evalData?.scoreStatus).toUpperCase() === 'MISSED_DEADLINE';

    return (
        <div className="eval-workspace-container">
            <div className="eval-content">
                <div className="eval-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate(-1)} className="rt-btn-ghost" style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                    <div>
                        <h1 className="eval-title" style={{ margin: '0 0 4px 0' }}>Independent Evaluation Workspace</h1>
                        <p className="eval-subtitle" style={{ margin: 0 }}>Secure judge environment. All evaluations are confidential and blind to peer data.</p>
                    </div>
                </div>

                <div className="eval-grid">
                    <div className="left-panels" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="deliverables-panel">
                            <h2 className="panel-title">Project Deliverables</h2>
                            {evalData?.roundFormat && (
                                <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                                    📋 Round Format: {evalData.roundFormat}
                                </div>
                            )}
                            {evalData?.parsedSubData && Object.keys(evalData.parsedSubData).length > 0 ? (
                                Object.entries(evalData.parsedSubData).filter(([k, v]) => typeof v === 'string' && v.trim() !== '').map(([key, val]) => {
                                    const defaultIcon = 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1';
                                    const iconMap = {
                                        'Source Code URL': 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
                                        'Live Demo URL': 'M13 10V3L4 14h7v7l9-11h-7z',
                                        'Documentation URL': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
                                        'Presentation Slide URL': 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12'
                                    };
                                    return <div key={key}>{renderAssetLink(val, key, iconMap[key] || defaultIcon)}</div>;
                                })
                            ) : (
                                <>
                                    {evalData?.githubRepoUrl && renderAssetLink(evalData?.githubRepoUrl, 'GitHub Repository', 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4')}
                                    {evalData?.liveDemoUrl && renderAssetLink(evalData?.liveDemoUrl, 'Live Demo', 'M13 10V3L4 14h7v7l9-11h-7z')}
                                    {evalData?.docsUrl && renderAssetLink(evalData?.docsUrl, 'Project Documentation', 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
                                    {evalData?.slideUrl && renderAssetLink(evalData?.slideUrl, 'Presentation Slides', 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12')}
                                </>
                            )}
                            <div className="project-id-box">
                                <div className="pid-label">PROJECT ID</div>
                                <div className="pid-val">{evalData?.projectId || 'N/A'} - {evalData?.teamName}</div>
                            </div>
                        </div>

                        {(evalData?.submissionRequirements || evalData?.contestRules) && (
                            <div className="deliverables-panel">
                                <h2 className="panel-title">Rules & Requirements</h2>
                                {evalData?.submissionRequirements && (
                                    <div style={{ marginBottom: evalData?.contestRules ? '24px' : '0' }}>
                                        <div className="pid-label" style={{ marginBottom: '8px' }}>Submission Requirements</div>
                                        <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                            {evalData.submissionRequirements}
                                        </div>
                                    </div>
                                )}
                                {evalData?.contestRules && (
                                    <div>
                                        <div className="pid-label" style={{ marginBottom: '8px' }}>Compliance Rules</div>
                                        {(() => {
                                            try {
                                                const rules = JSON.parse(evalData.contestRules);
                                                if (Array.isArray(rules) && rules.length > 0) {
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            {rules.map((r, i) => (
                                                                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                                                                    <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 500, marginBottom: r.penalty ? '8px' : '0', lineHeight: '1.5' }}>
                                                                        {r.rule}
                                                                    </div>
                                                                    {r.penalty && (
                                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                            Penalty: {r.penalty}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                            } catch(e) {}
                                            return (
                                                <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                                    {evalData.contestRules}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="rubric-panel">
                        <div className="rubric-header">
                            <h2 className="rubric-title">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                Evaluation Rubric
                            </h2>
                        </div>
                        {isAutoZero && (
                            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '16px', margin: '16px', borderRadius: '8px', border: '1px solid #f87171', fontWeight: 600 }}>
                                ⚠️ System Note: This team failed to submit the official project before the deadline. The system has automatically assigned a score of 0. However, you can still evaluate and override this score if needed (this action will be logged).
                            </div>
                        )}
                        <div className="criteria-list">
                            {(!evalData?.criteria || evalData.criteria.length === 0) ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 12px auto', color: '#94a3b8' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    <p style={{ margin: 0, fontWeight: 500 }}>No Evaluation Rubric Configured</p>
                                </div>
                            ) : (
                                evalData.criteria.map((crit, idx) => {
                                    const rawId = crit.id?.criteriaId || crit.id?.rubricId || crit.criterionId || crit.id;
                                    const currentId = rawId ? Number(rawId) : 0;
                                    return (
                                        <div className="criteria-item" key={currentId || idx}>
                                            <div className="criteria-header">
                                                <div className="crit-left">
                                                    <span className="crit-name">{crit.criteriaName || crit.name}</span>
                                                    <span className="crit-desc">{crit.description}</span>
                                                </div>
                                                <div className="crit-right">
                                                    <span className="crit-weight">Weight: {crit.weight || crit.percentageWeight}%</span>
                                                    <input type="number" className="score-input"
                                                           placeholder="0-100" value={scores[idx]?.pointsAwarded || ''}
                                                           onChange={(e) => handleScoreChange(currentId, 'pointsAwarded', e.target.value)}
                                                           onWheel={(e) => e.target.blur()}
                                                           disabled={isReadonly}
                                                    />
                                                </div>
                                            </div>
                                            <textarea className="crit-feedback" placeholder="Feedback Critique..."
                                                      value={scores[idx]?.feedback || ''}
                                                      onChange={(e) => handleScoreChange(currentId, 'feedback', e.target.value)}
                                                      disabled={isReadonly}
                                            ></textarea>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="rubric-footer">
                            <div className="total-score-box">
                                <div className="total-label">WEIGHTED SCORE TOTAL</div>
                                <div className="total-val">
                                    {calculateWeightedTotal()} <span>/ 100</span>
                                </div>
                            </div>
                            {isReadonly ? (
                                <button className="save-btn" disabled style={{ background: '#e2e8f0', color: '#64748b' }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Read Only View
                                </button>
                            ) : (
                                <button className="save-btn" disabled={!isComplete || isSubmitting} onClick={handleSubmit}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    {isSubmitting ? 'Saving...' : 'Save and Lock Scores'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationWorkspace;

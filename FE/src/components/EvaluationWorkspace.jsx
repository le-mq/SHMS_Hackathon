import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EvaluationWorkspace.css';
import NavbarJudge from './NavbarJudge';

const EvaluationWorkspace = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const [evalData, setEvalData] = useState(null);
    const [scores, setScores] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchEvalData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const urlParams = new URLSearchParams(window.location.search);
                const roundId = urlParams.get('roundId');
                let fetchUrl = `http://localhost:8080/api/v1/judge/evaluation-data/${teamId}`;
                if (roundId) {
                    fetchUrl += `?roundId=${roundId}`;
                }
                const response = await fetch(fetchUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('API request failed');
                const result = await response.json();
                setEvalData(result);
                if (result && result.criteria) {
                    setScores(result.criteria.map(c => {
                        const rawId = c.id?.criteriaId || c.id?.rubricId || c.criterionId || c.id;
                        return {
                            criteriaId: rawId ? Number(rawId) : 0,
                            weight: c.weight || c.percentageWeight || 0,
                            pointsAwarded: '',
                            feedback: ''
                        };
                    }));
                }
            } catch (err) {
                console.warn('API call failed, falling back to mock data...');
                try {
                    const mockRes = await fetch('/testFE.json');
                    const mockData = await mockRes.json();
                    const result = mockData.evaluationWorkspace?.data;
                    if (result && result.criteria) {
                        setEvalData(result);
                        setScores(result.criteria.map(c => {
                            const rawId = c.id?.criteriaId || c.id?.rubricId || c.criterionId || c.id;
                            return {
                                criteriaId: rawId ? Number(rawId) : 0,
                                weight: c.weight || c.percentageWeight || 0,
                                pointsAwarded: '',
                                feedback: ''
                            };
                        }));
                    } else {
                        alert('Failed to load evaluation data (no mock data found)');
                    }
                } catch (mockErr) {
                    alert('Failed to load evaluation data');
                }
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
            const response = await fetch('http://localhost:8080/api/v1/judge/submit-score', {
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
        || evalData?.scoreStatus).toUpperCase() === 'AUTO_ZERO';
    const reqsStr = evalData?.submissionRequirements;
    const isRequired = (key) => !reqsStr || reqsStr === '[]' || reqsStr.includes(key);

    return (
        <div className="eval-workspace-container">
            <NavbarJudge />
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
                    <div className="deliverables-panel">
                        <h2 className="panel-title">Project Deliverables</h2>
                        {evalData?.roundFormat && (
                            <div style={{ marginBottom: '16px', padding: '8px 12px', background: '#eff6ff', color: '#1e40af', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
                                📋 Round Format: {evalData.roundFormat}
                            </div>
                        )}
                        {isRequired('githubUrl') && renderAssetLink(evalData?.githubRepoUrl, 'GitHub Repository', 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4')}
                        {isRequired('demoUrl') && renderAssetLink(evalData?.liveDemoUrl, 'Live Demo', 'M13 10V3L4 14h7v7l9-11h-7z')}
                        {isRequired('documentUrl') && renderAssetLink(evalData?.docsUrl, 'Project Documentation', 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z')}
                        {isRequired('slideUrl') && renderAssetLink(evalData?.slideUrl || evalData?.presentationSlideUrl, 'Presentation Slides', 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12')}
                        <div className="project-id-box">
                            <div className="pid-label">PROJECT ID</div>
                            <div className="pid-val">{evalData?.projectId || 'N/A'} - {evalData?.teamName}</div>
                        </div>
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
                            {(evalData?.criteria || []).map((crit, idx) => {
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
                                                />
                                            </div>
                                        </div>
                                        <textarea className="crit-feedback" placeholder="Feedback Critique..."
                                                  value={scores[idx]?.feedback || ''}
                                                  onChange={(e) => handleScoreChange(currentId, 'feedback', e.target.value)}
                                        ></textarea>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="rubric-footer">
                            <div className="total-score-box">
                                <div className="total-label">WEIGHTED SCORE TOTAL</div>
                                <div className="total-val">
                                    {calculateWeightedTotal()} <span>/ 100</span>
                                </div>
                            </div>
                            <button className="save-btn" disabled={!isComplete || isSubmitting} onClick={handleSubmit}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                {isSubmitting ? 'Saving...' : 'Save and Lock Scores'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationWorkspace;
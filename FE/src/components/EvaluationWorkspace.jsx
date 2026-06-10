import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './EvaluationWorkspace.css';
import NavbarJudge from './NavbarJudge';

const EvaluationWorkspace = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const [evalData, setEvalData] = useState(null);
    const initialCriteria = [
        { id: 1, name: 'Technical Complexity', desc: 'Architecture, code quality, and technical difficulty.', weight: 30 },
        { id: 2, name: 'Innovation', desc: 'Originality of the idea and creative problem-solving.', weight: 20 },
        { id: 3, name: 'UI/UX Design', desc: 'Visual aesthetic, accessibility, and user journey flow.', weight: 25 },
        { id: 4, name: 'Pitch Quality', desc: 'Clarity of presentation and ability to communicate value.', weight: 25 }
    ];

    const [scores, setScores] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchEvalData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch(`http://localhost:8080/api/v1/judge/evaluation-data/${teamId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const result = await response.json();
                    setEvalData(result);
                    setScores(result.criteria.map(c => ({ criteriaId: c.id, weight: c.weight, pointsAwarded: '', feedback: '' })));
                } else {
                    alert('Failed to load evaluation data');
                }
            } catch (err) {
                console.error(err);
            }
        };
        if (teamId) fetchEvalData();
    }, [teamId]);

    const handleScoreChange = (id, field, value) => {
        setScores(prev => prev.map(s => {
            if (s.criteriaId === id) {
                return { ...s, [field]: value };
            }
            return s;
        }));
    };

    const calculateWeightedTotal = () => {
        let total = 0;
        scores.forEach(s => {
            const pts = parseFloat(s.pointsAwarded);
            if (!isNaN(pts)) {
                total += pts * (s.weight / 100);
            }
        });
        return total.toFixed(2);
    };

    const isComplete = scores.every(s => s.pointsAwarded !== '' && s.pointsAwarded >= 0 && s.pointsAwarded <= 100);

    const handleSubmit = async () => {
        if (!isComplete) return;
        setIsSubmitting(true);
        
        const payload = {
            submissionId: evalData?.submissionId,
            scores: scores.map(s => ({
                criteriaId: s.criteriaId,
                pointsAwarded: parseFloat(s.pointsAwarded),
                feedback: s.feedback
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
            } else {
                const err = await response.json();
                alert(`Error: ${err.error}`);
            }
        } catch (err) {
            console.error(err);
            alert('Could not submit score.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="eval-workspace-container">
            <NavbarJudge />

            <div className="eval-content">
                <div className="eval-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        onClick={() => navigate(-1)} 
                        className="rt-btn-ghost" 
                        style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '6px' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>
                    <div>
                        <h1 className="eval-title" style={{ marginBottom: '4px' }}>Independent Evaluation Workspace</h1>
                        <p className="eval-subtitle" style={{ margin: 0 }}>Secure judge environment. All evaluations are confidential and blind to peer data.</p>
                    </div>
                </div>

                <div className="eval-grid">
                    {/* Left Panel */}
                    <div className="deliverables-panel">
                        <h2 className="panel-title">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                            Project Deliverables
                        </h2>

                        <a href={evalData?.githubRepoUrl || '#'} className={`asset-link ${evalData?.githubRepoUrl ? 'asset-valid' : 'asset-missing'}`} target="_blank" rel="noreferrer" onClick={e => !evalData?.githubRepoUrl && e.preventDefault()}>
                            <div className="asset-left">
                                <svg width="18" height="18" className="asset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                GitHub Repository
                            </div>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href={evalData?.liveDemoUrl || '#'} className={`asset-link ${evalData?.liveDemoUrl ? 'asset-valid' : 'asset-missing'}`} target="_blank" rel="noreferrer" onClick={e => !evalData?.liveDemoUrl && e.preventDefault()}>
                            <div className="asset-left">
                                <svg width="18" height="18" className="asset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Live Demo
                            </div>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href={evalData?.docsUrl || '#'} className={`asset-link ${evalData?.docsUrl ? 'asset-valid' : 'asset-missing'}`} target="_blank" rel="noreferrer" onClick={e => !evalData?.docsUrl && e.preventDefault()}>
                            <div className="asset-left">
                                <svg width="18" height="18" className="asset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Project Documentation
                            </div>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href={evalData?.slideUrl || '#'} className={`asset-link ${evalData?.slideUrl ? 'asset-valid' : 'asset-missing'}`} target="_blank" rel="noreferrer" onClick={e => !evalData?.slideUrl && e.preventDefault()}>
                            <div className="asset-left">
                                <svg width="18" height="18" className="asset-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                Presentation Slides
                            </div>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>

                        <div className="project-id-box">
                            <div className="pid-label">PROJECT ID</div>
                            <div className="pid-val">{evalData?.projectId || 'N/A'} - {evalData?.teamName}</div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="rubric-panel">
                        <div className="rubric-header">
                            <h2 className="rubric-title">
                                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                Evaluation Rubric
                            </h2>
                            <div className="confidential-badge">
                                <div className="red-dot"></div>
                                Confidential Mode Active
                            </div>
                        </div>

                        <div className="criteria-list">
                            {evalData?.criteria?.map((crit, idx) => (
                                <div className="criteria-item" key={crit.id}>
                                    <div className="criteria-header">
                                        <div className="crit-left">
                                            <span className="crit-name">{crit.name}</span>
                                            <span className="crit-desc">{crit.description}</span>
                                        </div>
                                        <div className="crit-right">
                                            <span className="crit-weight">Weight: {crit.weight}%</span>
                                            <input 
                                                type="number" 
                                                className="score-input" 
                                                placeholder="0-100" 
                                                value={scores[idx]?.pointsAwarded || ''}
                                                onChange={(e) => handleScoreChange(crit.id, 'pointsAwarded', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <textarea 
                                        className="crit-feedback" 
                                        placeholder="Feedback Critique..."
                                        value={scores[idx]?.feedback || ''}
                                        onChange={(e) => handleScoreChange(crit.id, 'feedback', e.target.value)}
                                    ></textarea>
                                </div>
                            ))}
                        </div>

                        <div className="rubric-footer">
                            <div className="total-score-box">
                                <div className="total-label">WEIGHTED SCORE TOTAL</div>
                                <div className="total-val">
                                    {calculateWeightedTotal()} <span>/ 100</span>
                                </div>
                            </div>
                            <button 
                                className="save-btn" 
                                disabled={!isComplete || isSubmitting}
                                onClick={handleSubmit}
                            >
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

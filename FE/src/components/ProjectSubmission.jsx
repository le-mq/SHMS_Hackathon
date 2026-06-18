import { useState, useEffect } from 'react';
import './ProjectSubmission.css';
import NavbarStudent from './NavbarStudent';

const API_STUDENT = 'http://localhost:8080/api/v1/student';

const ProjectSubmission = () => {
    const [formData, setFormData] = useState({
        githubRepoUrl: '',
        liveDemoUrl: '',
        docsUrl: '',
        slideUrl: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pageData, setPageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState([]);
 
    useEffect(() => {
        let cancelled = false;

        async function applySubmissionData(data) {
            if (cancelled) return;

            setPageData(data);
            setHistory(data.history || []);

            if (data.rounds && data.rounds.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    roundId: data.rounds[0].id,
                }));
            }

            setError('');
        }

        async function fetchPageData() {
            try {
                const token = localStorage.getItem('shms_token');

                const response = await fetch(API_STUDENT + '/submissions', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load page data');
                }

                await applySubmissionData(data);
            } catch (err) {
                console.warn('Submission API unavailable response:', err.message);

                try {
                    const localRes = await fetch('/testFE.json');

                    if (!localRes.ok) {
                        throw new Error('Not found testFE.json');
                    }

                    const localJson = await localRes.json();
                    const mockData = localJson.studentSubmission?.data;

                    if (!mockData) {
                        throw new Error('studentSubmission mock data not found');
                    }

                    await applySubmissionData(mockData);
                } catch (mockError) {
                    console.warn('Submission mock unavailable:', mockError.message);

                    if (!cancelled) {
                        setError('Could not connect to server.');
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        fetchPageData();

        return () => {
            cancelled = true;
        };
    }, []);   
    
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('shms_token');

            const response = await fetch(API_STUDENT + '/submissions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.error || 'Submission failed');
            }

            alert('Project submitted successfully!');
            window.location.reload();
        } catch (err) {
            console.warn('Submit API unavailable response:', err.message);

            const newVersion = history.length + 1;

            const mockSubmission = {
                id: 'MOCK-' + Date.now(),
                roundId: formData.roundId,
                version: newVersion,
                timestamp: new Date().toISOString(),
                githubRepoUrl: formData.githubRepoUrl,
                liveDemoUrl: formData.liveDemoUrl,
                docsUrl: formData.docsUrl,
                slideUrl: formData.slideUrl,
                status: 'SUBMITTED',
            };

            setHistory(prev => [
                ...prev.map(item => ({
                    ...item,
                    status: item.roundId === formData.roundId ? 'ARCHIVED' : item.status,
                })),
                mockSubmission,
            ]);

            alert('Mock: Project submitted successfully!');
        } finally {
            setIsSubmitting(false);
        }
    };  
        

    return (
        <div className="submission-container">
            {/* Top Navbar */}
            <NavbarStudent />

            <div className="submission-content">
                {isLoading && (
                    <p style={{ marginBottom: '16px', color: '#64748b' }}>
                        Loading submission data...
                    </p>
                )}
                
                {error && (
                    <p style={{ marginBottom: '16px', color: '#ef4444' }}>
                        {error}
                    </p>
                )}
                <div className="submission-header">
                    <h1 className="submission-title">Project Submission Portal</h1>
                    <div className="round-info">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {pageData ? pageData.contestName : 'Loading...'}
                        <span className="active-badge">{pageData ? pageData.contestStatus : '...'}</span>
                    </div>
                </div>

                <div className="form-card">
                    <h2 className="form-title">Submit Project Assets</h2>
                    <p className="form-subtitle">Ensure all links are public or accessible to judges. At least one link is recommended.</p>

                    <div className="form-grid">
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Select Round</label>
                            <select 
                                name="roundId" 
                                value={formData.roundId || ''} 
                                onChange={handleChange}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="" disabled>-- Select Round --</option>
                                {pageData?.rounds?.map(r => (
                                    <option key={r.id} value={r.id}>{r.name} ({r.status})</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>GitHub Repository URL</label>
                            <div className="input-with-icon">
                                <div className="input-icon">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                </div>
                                <input 
                                    type="text" 
                                    name="githubRepoUrl"
                                    value={formData.githubRepoUrl} 
                                    onChange={handleChange} 
                                    placeholder="https://github.com/team/repo" 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Live Demo URL</label>
                            <div className="input-with-icon">
                                <div className="input-icon">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <input 
                                    type="text" 
                                    name="liveDemoUrl"
                                    value={formData.liveDemoUrl} 
                                    onChange={handleChange} 
                                    placeholder="https://demo.example.com" 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Project Documentation URL</label>
                            <div className="input-with-icon">
                                <div className="input-icon">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <input 
                                    type="text" 
                                    name="docsUrl"
                                    value={formData.docsUrl} 
                                    onChange={handleChange} 
                                    placeholder="https://docs.example.com" 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Presentation Slide URL</label>
                            <div className="input-with-icon">
                                <div className="input-icon">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </div>
                                <input 
                                    type="text" 
                                    name="slideUrl"
                                    value={formData.slideUrl} 
                                    onChange={handleChange} 
                                    placeholder="https://slides.example.com" 
                                />
                            </div>
                        </div>
                    </div>

                    {pageData?.internalRole !== 'LEADER' && (
                        <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '12px', textAlign: 'right' }}>
                            Only Team Leaders are permitted to submit the project.
                        </p>
                    )}
                    <button 
                        className="submit-btn" 
                        onClick={handleSubmit}
                        disabled={isSubmitting || pageData?.internalRole !== 'LEADER' || !formData.roundId}
                        style={{ cursor: pageData?.internalRole !== 'LEADER' ? 'not-allowed' : 'pointer', background: pageData?.internalRole !== 'LEADER' ? '#94a3b8' : '#2563eb' }}
                    >
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        {isSubmitting ? 'Submitting...' : 'Submit Product Links'}
                    </button>
                </div>

                <div className="history-card">
                    <div className="history-header">
                        Submission History 
                        {formData.roundId && pageData?.rounds && (
                            <span style={{ fontSize: '16px', fontWeight: 'normal', marginLeft: '8px', color: '#64748b' }}>
                                ({pageData.rounds.find(r => r.id == formData.roundId)?.name})
                            </span>
                        )}
                    </div>
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>VERSION</th>
                                <th>TIMESTAMP</th>
                                <th>ASSET LINKS</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.filter(item => !item.roundId || item.roundId == formData.roundId).length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                        No submissions found for this round.
                                    </td>
                                </tr>
                            ) : (
                                history.filter(item => !item.roundId || item.roundId == formData.roundId).map((item, idx) => {
                                    const formattedTime = new Date(item.timestamp).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <tr key={idx}>
                                            <td className="version-col">v{item.version}.0</td>
                                            <td>{formattedTime}</td>
                                            <td>
                                                <div className="asset-icons">
                                                    {item.githubRepoUrl && <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="GitHub"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>}
                                                    {item.liveDemoUrl && <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Live Demo"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                                    {item.docsUrl && <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Docs"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                                    {item.slideUrl && <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Slides"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${item.status === 'ARCHIVED' ? 'status-archived' : 'status-official'}`}>
                                                    {item.status !== 'ARCHIVED' && (
                                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                    )}
                                                    {item.status === 'SUBMITTED' ? 'Official Version' : item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProjectSubmission;

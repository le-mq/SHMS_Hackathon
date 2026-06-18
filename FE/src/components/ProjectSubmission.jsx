import { useState, useEffect } from 'react';
import './ProjectSubmission.css';
import NavbarStudent from './NavbarStudent';
import './ProjectSubmission.css';
import './LeaderWorkspace.css';

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
    const [timeLeft, setTimeLeft] = useState('--:--:--');
    const [formattedDeadline, setFormattedDeadline] = useState('');
    const [workspaceData, setWorkspaceData] = useState(null);

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

    useEffect(() => {
        let cancelled = false;

        async function fetchWorkspaceData() {
            try {
                const token = localStorage.getItem('shms_token');

                const response = await fetch(API_STUDENT + '/workspace', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load workspace data');
                }

                if (!cancelled) {
                    setWorkspaceData(data.data || data);
                }
            } catch (err) {
                console.warn('Workspace API unavailable:', err.message);

                try {
                    const localRes = await fetch('/testFE.json');

                    if (!localRes.ok) {
                        throw new Error('Not found testFE.json');
                    }

                    const localJson = await localRes.json();
                    const mockData = localJson.leaderWorkspace?.data;

                    if (!cancelled) {
                        setWorkspaceData(mockData || null);
                    }
                } catch {
                    if (!cancelled) {
                        setWorkspaceData(null);
                    }
                }
            }
        }

        fetchWorkspaceData();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const selectedRound = pageData?.rounds?.find(
        round => String(round.id) === String(formData.roundId)
    );

    const teamStatus = (
        workspaceData?.teamStatus ||
        pageData?.teamStatus ||
        'FORMING'
    ).toUpperCase();

    const isTeamApproved = teamStatus === 'APPROVED';
    const isRoundActive = selectedRound?.status === 'ACTIVE';

    const registrationDeadline =
        workspaceData?.registrationDeadline ||
        workspaceData?.teamRegistrationDeadline ||
        pageData?.registrationDeadline ||
        '2026-06-20T23:59:00+07:00';

    const roundDeadline =
        selectedRound?.deadline ||
        selectedRound?.submissionDeadline ||
        selectedRound?.endDate ||
        workspaceData?.submissionDeadline ||
        '2026-06-24T15:32:00+07:00';

    const currentDeadline = isTeamApproved ? roundDeadline : registrationDeadline;

    const deadlineLabel = isTeamApproved
        ? 'SUBMISSION DEADLINE'
        : 'TEAM REGISTRATION DEADLINE';

    const deadlineName = isTeamApproved
        ? `${selectedRound?.name || 'Round'} - Deadline`
        : 'Team Registration Deadline';

    const deadlineCloseText = isTeamApproved
        ? 'Gateway Closes:'
        : 'Registration Closes:';

    const canSubmitProject =
        isTeamApproved &&
        isRoundActive &&
        pageData?.internalRole === 'LEADER' &&
        !isSubmitting &&
        formData.roundId;

    useEffect(() => {
        if (!currentDeadline) {
            setFormattedDeadline('No Deadline Set');
            setTimeLeft('--:--:--');
            return;
        }
        const deadline = new Date(currentDeadline);
        if (Number.isNaN(deadline.getTime())) {
            setFormattedDeadline('Invalid Deadline');
            setTimeLeft('--:--:--');
            return;
        }
        setFormattedDeadline(
            deadline.toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).replace(',', ' •')
        );
        const timer = setInterval(() => {
            const now = new Date();
            const diff = deadline - now;
            if (diff <= 0) {
                setTimeLeft('00:00:00');
                clearInterval(timer);
                return;
            }
            const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const minutes = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
            const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            setTimeLeft(`${hours}:${minutes}:${seconds}`);
        }, 1000);
        return () => clearInterval(timer);
    }, [currentDeadline]);

    const getBackendMessage = (data, fallback) => {
        return (
            data?.message ||
            data?.error ||
            data?.detail ||
            data?.data?.message ||
            fallback
        );
    };
    const handleSubmit = async () => {
        if (!isTeamApproved) {
            const message = 'Your team has not been approved yet. You cannot submit.';
            setError(message);
            alert(message);
            return;
        }

        if (!isRoundActive) {
            const message = 'This round is not active yet. You cannot submit.';
            setError(message);
            alert(message);
            return;
        }

        if (pageData?.internalRole !== 'LEADER') {
            const message = 'Only Team Leaders are permitted to submit the project.';
            setError(message);
            alert(message);
            return;
        }

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

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = getBackendMessage(result, 'Submission failed.');
                setError(message);
                alert(message);
                return;
            }

            const message = getBackendMessage(result, 'Project submitted successfully!');
            alert(message);

            if (result.history) {
                setHistory(result.history);
            } else {
                window.location.reload();
            }
        } catch (err) {
            console.warn('Submit API error:', err.message);

            const message = 'Cannot connect to server. Please try again later.';
            setError(message);
            alert(message);
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
                    <div className="submission-header-left">
                        <h1 className="submission-title">Project Submission Portal</h1>
                        <div className="submission-contest">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>

                            <span>FPT Hackathon 2026</span>
                            <span className="active-badge">ACTIVE</span>
                        </div>
                        <div className="submission-status-card">
                            <div className="submission-status-icon">
                                <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>

                            <div>
                                <div className="submission-status-label">
                                    SUBMISSION ELIGIBILITY
                                </div>

                                <div className="submission-status-value">
                                    Team Status: {teamStatus}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="submission-deadline-small">
                        <div className="deadline-small-label">
                            {deadlineLabel}
                        </div>

                        <div className="deadline-small-name">
                            {deadlineName}
                        </div>

                        <div className="deadline-small-body">
                            <div className="deadline-small-time">
                                {timeLeft}
                            </div>
                            <div className="deadline-small-date">
                                {deadlineCloseText}
                                <span>{formattedDeadline}</span>
                            </div>
                        </div>
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
                            {!isTeamApproved && (
                                <p className="round-warning">
                                    Your team has not been approved yet. Submission is disabled.
                                </p>
                            )}

                            {isTeamApproved && selectedRound && !isRoundActive && (
                                <p className="round-warning">
                                    This round is not active yet. Submission is disabled.
                                </p>
                            )}
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
                                    disabled={!canSubmitProject}
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
                                    disabled={!canSubmitProject}
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
                                    disabled={!canSubmitProject}
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
                                    disabled={!canSubmitProject}
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
                        disabled={!canSubmitProject}
                        style={{
                            cursor: canSubmitProject ? 'pointer' : 'not-allowed',
                            background: canSubmitProject ? '#2563eb' : '#94a3b8'
                        }}
                    >
                        <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                        {isSubmitting
                            ? 'Submitting...'
                            : !isTeamApproved
                                ? 'Team Not Approved'
                                : !isRoundActive
                                    ? 'Round Not Active'
                                    : pageData?.internalRole !== 'LEADER'
                                        ? 'Leader Only'
                                        : 'Submit Product Links'
                        }
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

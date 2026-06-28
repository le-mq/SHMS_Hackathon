import { useState, useEffect, useRef } from 'react';
import './ProjectSubmission.css';
import NavbarStudent from './NavbarStudent';
import './LeaderWorkspace.css';

const API_STUDENT = 'http://localhost:8080/api/v1/student';
const SUCCESS_MESSAGE_DURATION_MS = 5000;
const SUCCESS_RELOAD_DELAY_MS = 5000;
const ERROR_MESSAGE_DURATION_MS = 5000;
const SELECTED_ROUND_STORAGE_KEY = 'projectSubmissionSelectedRoundId';

const formatScheduleDate = (dateValue, emptyText, invalidText) => {
    if (!dateValue) {
        return emptyText;
    }

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) {
        return invalidText;
    }

    return date.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).replace(',', ' \u2022');
};

const ProjectSubmission = () => {
    const [formData, setFormData] = useState({
        githubRepoUrl: '',
        liveDemoUrl: '',
        docsUrl: '',
        slideUrl: '',
        submissionType: 'SUBMITTED'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [pageData, setPageData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState([]);
    const [timeLeft, setTimeLeft] = useState('');
    const [formattedDeadline, setFormattedDeadline] = useState('');
    const [workspaceData, setWorkspaceData] = useState(null);
    const [selectedFeedbackRecord, setSelectedFeedbackRecord] = useState(null);
    const errorTimerRef = useRef(null);
    const successTimerRef = useRef(null);
    const reloadTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
            }

            if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
            }

            if (reloadTimerRef.current) {
                clearTimeout(reloadTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function applySubmissionData(data) {
            if (cancelled) return;

            setPageData(data);
            setHistory(data.history || []);

            if (data.rounds && data.rounds.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    roundId: (() => {
                        const savedRoundId = sessionStorage.getItem(SELECTED_ROUND_STORAGE_KEY);
                        const currentRoundId = data.rounds.some(round => String(round.id) === String(prev.roundId))
                            ? prev.roundId
                            : '';

                        if (savedRoundId && data.rounds.some(round => String(round.id) === String(savedRoundId))) {
                            return savedRoundId;
                        }

                        return currentRoundId || data.rounds[0].id;
                    })(),
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

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    if (response.status === 400) {
                        await applySubmissionData({
                            internalRole: null,
                            teamStatus: 'NO TEAM',
                            contestName: null,
                            contestStatus: null,
                            rounds: [],
                            history: [],
                        });
                        return;
                    }

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
        if (e.target.name === 'roundId') {
            sessionStorage.setItem(SELECTED_ROUND_STORAGE_KEY, e.target.value);
        }

        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const getNormalizedRoundStatus = (round) => {
        return String(round?.status || round?.state || '')
            .trim()
            .toUpperCase();
    };

    const selectedRound = pageData?.rounds?.find(
        round => String(round.id) === String(formData.roundId)
    );

    const teamStatus = (
        pageData?.teamStatus ||
        workspaceData?.teamStatus ||
        'FORMING'
    ).toUpperCase();
    const hasRegisteredContest = ['PENDING', 'APPROVED'].includes(teamStatus);
    const isNotRegistered = ['FORMING', 'NO TEAM', 'REJECTED'].includes(teamStatus);
    const contestName = hasRegisteredContest
        ? pageData?.contestName
        : isNotRegistered
            ? 'Not Registered'
            : null;
    const contestStatus = hasRegisteredContest
        ? pageData?.contestStatus
        : isNotRegistered
            ? 'N/A'
            : null;

    const isTeamApproved = teamStatus === 'APPROVED';
    const roundStatus = getNormalizedRoundStatus(selectedRound);
    const isRoundActive = ['ACTIVED', 'OPEN'].includes(roundStatus);
    const hasLoadedSubmissionRole = Boolean(pageData?.internalRole);
    const isTeamLeader = pageData?.internalRole === 'LEADER';
    const selectedRoundIndex = pageData?.rounds?.findIndex(
        round => String(round.id) === String(formData.roundId)
    ) ?? -1;
    const isSelectedRoundEligible =
        selectedRoundIndex <= 0
            ? true
            : typeof selectedRound?.eligible === 'boolean'
                ? selectedRound.eligible
                : false;
    const selectedRoundLockedReason =
        selectedRound?.lockedReason || 'Your team has not qualified for this round yet.';
    const selectedRoundEvaluatedHistory = history.find(item =>
        String(item.roundId) === String(formData.roundId) &&
        (item.evaluated || String(item.status).toUpperCase() === 'EVALUATED')
    );
    const isSelectedRoundEvaluated =
        Boolean(selectedRound?.evaluated) ||
        Boolean(selectedRoundEvaluatedHistory);

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

    const registrationOpen =
        workspaceData?.registrationStart ||
        workspaceData?.teamRegistrationStart ||
        pageData?.registrationStart ||
        pageData?.teamRegistrationStart;

    const roundOpen =
        selectedRound?.submissionOpen ||
        selectedRound?.openDate ||
        selectedRound?.startDate ||
        workspaceData?.submissionOpen;

    const currentOpen = isTeamApproved ? roundOpen : registrationOpen;
    const currentDeadline = isTeamApproved ? roundDeadline : registrationDeadline;

    const formattedOpenDate = formatScheduleDate(
        currentOpen,
        'No Open Date Set',
        'Invalid Open Date'
    );

    const deadlineLabel = isTeamApproved
        ? 'SUBMISSION DEADLINE'
        : 'TEAM REGISTRATION DEADLINE';

    const deadlineName = isTeamApproved
        ? `${selectedRound?.name || 'Round'} - Deadline`
        : 'Team Registration Deadline';

    const deadlineCloseText = isTeamApproved
        ? 'Gateway Closes:'
        : 'Registration Closes:';

    const deadlineOpenText = isTeamApproved
        ? 'Gateway Opens:'
        : 'Registration Opens:';

    const canSubmitProject =
        isTeamApproved &&
        isRoundActive &&
        isSelectedRoundEligible &&
        !isSelectedRoundEvaluated &&
        isTeamLeader &&
        !isSubmitting &&
        formData.roundId;


    const selectedRoundSubmitDeadline =
        selectedRound?.submissionDeadline ||
        selectedRound?.deadline ||
        selectedRound?.endDate;
    const selectedRoundSubmitDeadlineTime = selectedRoundSubmitDeadline
        ? new Date(selectedRoundSubmitDeadline).getTime()
        : Infinity;
    const selectedRoundSubmitOpen =
        selectedRound?.submissionOpen ||
        selectedRound?.openDate ||
        selectedRound?.startDate;
    const selectedRoundSubmitOpenTime = selectedRoundSubmitOpen
        ? new Date(selectedRoundSubmitOpen).getTime()
        : 0;

    const isSelectedRoundNotOpened =
        Number.isFinite(selectedRoundSubmitOpenTime) && selectedRoundSubmitOpenTime > 0 &&
        Date.now() < selectedRoundSubmitOpenTime;

    const isSelectedRoundClosed =
        Number.isFinite(selectedRoundSubmitDeadlineTime) &&
        Date.now() > selectedRoundSubmitDeadlineTime;

    const isInputsDisabled = !isTeamLeader || !formData.roundId || isSelectedRoundClosed || isSubmitting || !isSelectedRoundEligible;
    const hasOfficialSubmission = history.some(item => {
        if (item.roundId && formData.roundId && String(item.roundId) !== String(formData.roundId)) return false;
        const status = String(item.status || '').toUpperCase();
        return ['SUBMITTED', 'OFFICIAL', 'EVALUATED', 'AUTO_ZERO'].includes(status) || item.evaluated;
    });

    const notEligibleMessage = !isSelectedRoundEligible ? selectedRoundLockedReason : '';
    const closedRoundMessage = isSelectedRoundClosed
        ? (hasOfficialSubmission
            ? `Submission closed at ${new Date(selectedRoundSubmitDeadline).toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            })}.`
            : `Submission deadline has passed. Your team did not submit the project and is eliminated (0 points) for this round.`)
        : '';
    const notOpenedRoundMessage = isSelectedRoundNotOpened
        ? `Official submission will open at ${new Date(selectedRoundSubmitOpen).toLocaleString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })}.`
        : '';
    const submitFeedbackMessage = error || successMessage || notEligibleMessage || closedRoundMessage || notOpenedRoundMessage;
    const submitFeedbackType = error || notEligibleMessage || closedRoundMessage ? 'error' : notOpenedRoundMessage ? 'warning' : 'success';
    const submitFeedbackVariant = notEligibleMessage || closedRoundMessage || notOpenedRoundMessage ? ' closed' : '';

    useEffect(() => {
        if (!currentDeadline) {
            setFormattedDeadline('No Deadline Set');
            setTimeLeft('');
            return;
        }

        const deadline = new Date(currentDeadline);
        if (Number.isNaN(deadline.getTime())) {
            setFormattedDeadline('Invalid Deadline');
            setTimeLeft('');
            return;
        }

        setFormattedDeadline(formatScheduleDate(currentDeadline, 'No Deadline Set', 'Invalid Deadline'));

        const open = currentOpen ? new Date(currentOpen) : null;
        const hasValidOpen = open && !Number.isNaN(open.getTime());

        const updateCountdown = () => {
            const now = new Date();

            if (!isTeamApproved || !hasValidOpen || now < open || now > deadline) {
                setTimeLeft('');
                return;
            }

            const diff = deadline - now;
            if (diff <= 0) {
                setTimeLeft('');
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
            const minutes = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
            const seconds = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
            setTimeLeft(`${hours}:${minutes}:${seconds}`);
        };

        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [currentDeadline, currentOpen, isTeamApproved]);

    const getBackendMessage = (data, fallback) => {
        const message =
            data?.message ||
            data?.error ||
            data?.detail ||
            data?.data?.message ||
            fallback;

        const fullMessage = JSON.stringify(data || {}).toLowerCase();

        if (
            String(message).toLowerCase().includes('validation failed') ||
            fullMessage.includes('submitprojectrequest') ||
            fullMessage.includes('valid url') ||
            fullMessage.includes('github url')
        ) {
            return 'Invalid URL format. Please check again.';
        }

        return message;
    };

    const getAssetUrl = (url) => {
        const trimmedUrl = String(url || '').trim();
        if (!trimmedUrl) return '';

        if (/^https?:\/\//i.test(trimmedUrl)) {
            return trimmedUrl;
        }

        return `https://${trimmedUrl}`;
    };

    const renderAssetLink = (url, label, icon) => {
        const assetUrl = getAssetUrl(url);
        if (!assetUrl) return null;

        return (
            <a
                className="asset-link-icon"
                href={assetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open ${label}`}
                aria-label={`Open ${label}`}
            >
                {icon}
            </a>
        );
    };

    const getSubmissionStatusClass = (item) => {
        const status = String(item?.status || '').toUpperCase();

        if (item?.evaluated || status === 'EVALUATED') return 'status-evaluated';
        if (status === 'ARCHIVED') return 'status-archived';
        if (status === 'DRAFT') return 'status-draft';
        if (status === 'AUTO_ZERO') return 'status-auto-zero';
        return 'status-official';
    };

    const getSubmissionStatusLabel = (item) => {
        const status = String(item?.status || '').toUpperCase();

        if (item?.evaluated || status === 'EVALUATED') {
            return 'Evaluated';
        }

        if (status === 'SUBMITTED') return 'Submitted';
        if (status === 'AUTO_ZERO') return 'Missed Deadline';
        return item?.status || 'Submitted';
    };

    const getRoundStatusLabel = (round) => {
        const status = getNormalizedRoundStatus(round);

        if (['ACTIVED', 'OPEN'].includes(status)) return 'ACTIVED';
        if (['CLOSED', 'ENDED', 'FINISHED'].includes(status)) return 'CLOSED';
        if (['UPCOMING', 'PENDING', 'SCHEDULED', 'NOT_STARTED'].includes(status)) return 'UPCOMING';

        return status || 'UPCOMING';
    };

    const showErrorMessage = (message) => {
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
        }

        setError(message);
        setSuccessMessage('');

        errorTimerRef.current = setTimeout(() => {
            setError('');
            errorTimerRef.current = null;
        }, ERROR_MESSAGE_DURATION_MS);
    };

    const showSuccessMessage = (message) => {
        if (successTimerRef.current) {
            clearTimeout(successTimerRef.current);
        }

        setSuccessMessage(message);

        successTimerRef.current = setTimeout(() => {
            setSuccessMessage('');
            successTimerRef.current = null;
        }, SUCCESS_MESSAGE_DURATION_MS);
    };

    const scheduleSubmissionReload = (roundId) => {
        if (reloadTimerRef.current) {
            clearTimeout(reloadTimerRef.current);
        }

        if (roundId) {
            sessionStorage.setItem(SELECTED_ROUND_STORAGE_KEY, String(roundId));
        }

        reloadTimerRef.current = setTimeout(() => {
            window.location.reload();
        }, SUCCESS_RELOAD_DELAY_MS);
    };

    const clearErrorMessage = () => {
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }

        setError('');
    };

    const handleSubmit = async (type = 'SUBMITTED') => {
        if (!isTeamApproved) {
            const message = 'Your team has not been approved yet. You cannot submit.';
            showErrorMessage(message);
            return;
        }

        if (hasLoadedSubmissionRole && !isTeamLeader) {
            const message = 'Only Team Leaders are permitted to submit the project.';
            showErrorMessage(message);
            return;
        }

        if (!isRoundActive) {
            const message = 'This round is not active yet. You cannot submit.';
            showErrorMessage(message);
            return;
        }

        if (!isSelectedRoundEligible) {
            showErrorMessage(selectedRoundLockedReason);
            return;
        }

        if (isSelectedRoundEvaluated) {
            showErrorMessage('This submission has already been evaluated.');
            return;
        }

        if (selectedRound && selectedRound.submissionRequirements && selectedRound.submissionRequirements !== '[]') {
            const reqs = selectedRound.submissionRequirements;
            if (reqs.includes('githubUrl') && (!formData.githubRepoUrl || !formData.githubRepoUrl.trim())) {
                showErrorMessage('GitHub Repository URL is required for this round.');
                return;
            }
            if (reqs.includes('demoUrl') && (!formData.liveDemoUrl || !formData.liveDemoUrl.trim())) {
                showErrorMessage('Live Demo/Video URL is required for this round.');
                return;
            }
            if (reqs.includes('documentUrl') && (!formData.docsUrl || !formData.docsUrl.trim())) {
                showErrorMessage('Documentation URL is required for this round.');
                return;
            }
            if (reqs.includes('slideUrl') && (!formData.slideUrl || !formData.slideUrl.trim())) {
                showErrorMessage('Presentation Slide URL is required for this round.');
                return;
            }
        }

        setIsSubmitting(true);
        clearErrorMessage();
        showSuccessMessage(`Project ${type === 'DRAFT' ? 'draft saved' : 'submitted'} successfully!`);

        try {
            const token = localStorage.getItem('shms_token');
            const submittedRoundId = formData.roundId;

            const payload = { ...formData, submissionType: type };

            const response = await fetch(API_STUDENT + '/submissions/project', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = getBackendMessage(result, 'Submission failed.');
                showErrorMessage(message);
                return;
            }

            const message = getBackendMessage(result, 'Project submitted successfully!');
            clearErrorMessage();
            showSuccessMessage(message);

            const updatedPageData = result.submissionPage || result.data || null;
            if (updatedPageData) {
                setPageData(updatedPageData);
            } else if (result.rounds) {
                setPageData(prev => ({
                    ...(prev || {}),
                    rounds: result.rounds,
                }));
            }

            if (result.history || updatedPageData?.history) {
                setHistory(result.history || updatedPageData.history);
            }

            setFormData(prev => ({
                ...prev,
                roundId: submittedRoundId || prev.roundId,
            }));

            scheduleSubmissionReload(submittedRoundId);
        } catch (err) {
            console.warn('Submit API error:', err.message);
            const message = 'Cannot connect to server. Please try again later.';
            showErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="submission-container">
            <NavbarStudent />

            <div className="submission-content">
                {isLoading && (
                    <p style={{ marginBottom: '16px', color: '#64748b' }}>
                        Loading submission data...
                    </p>
                )}

                <div className="submission-header">
                    <div className="submission-header-left">
                        <h1 className="submission-title">Project Submission Portal</h1>
                        {contestName && (
                            <div className="submission-contest">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>

                                <span>{contestName}</span>
                                {contestStatus && (
                                    <span className="active-badge">{contestStatus}</span>
                                )}
                            </div>
                        )}
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

                        <div className={`deadline-small-body${timeLeft ? '' : ' no-countdown'}`}>
                            {timeLeft && (
                                <div className="deadline-small-time">
                                    {timeLeft}
                                </div>
                            )}
                            <div className="deadline-small-dates">
                                <div className="deadline-small-date">
                                    {deadlineOpenText}
                                    <span>{formattedOpenDate}</span>
                                </div>
                                <div className="deadline-small-date">
                                    {deadlineCloseText}
                                    <span>{formattedDeadline}</span>
                                </div>
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
                                {pageData?.rounds?.map((r) => {
                                    const labelSuffix = getRoundStatusLabel(r);

                                    return (
                                        <option key={r.id} value={r.id}>
                                            {r.name} ({labelSuffix})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                        {isSelectedRoundEligible && (
                            <>
                                {(!selectedRound || !selectedRound.submissionRequirements || selectedRound.submissionRequirements === '[]' || selectedRound.submissionRequirements.includes('githubUrl')) && (
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
                                        disabled={isInputsDisabled}
                                    />
                                </div>
                            </div>
                        )}

                        {(!selectedRound || !selectedRound.submissionRequirements || selectedRound.submissionRequirements === '[]' || selectedRound.submissionRequirements.includes('demoUrl')) && (
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
                                        disabled={isInputsDisabled}
                                    />
                                </div>
                            </div>
                        )}

                        {(!selectedRound || !selectedRound.submissionRequirements || selectedRound.submissionRequirements === '[]' || selectedRound.submissionRequirements.includes('documentUrl')) && (
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
                                        disabled={isInputsDisabled}
                                    />
                                </div>
                            </div>
                        )}

                        {(!selectedRound || !selectedRound.submissionRequirements || selectedRound.submissionRequirements === '[]' || selectedRound.submissionRequirements.includes('slideUrl')) && (
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
                                        disabled={isInputsDisabled}
                                    />
                                </div>
                            </div>
                        )}
                            </>
                        )}
                    </div>

                    <div className="submit-action-row" style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'stretch' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                            {submitFeedbackMessage && (
                                <p className={`submission-message ${submitFeedbackType} submit-feedback${submitFeedbackVariant}`} style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center' }}>
                                    {submitFeedbackMessage}
                                </p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                            <button type="button" className="submit-btn submit-btn-official" onClick={() => handleSubmit('SUBMITTED')} disabled={isSubmitting || isSelectedRoundNotOpened || isSelectedRoundClosed || !isTeamLeader || !isSelectedRoundEligible}
                                style={{ padding: '0 24px', borderRadius: '8px', height: '100%', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isSubmitting ? 'Submitting...' : 'Submit Project'}
                            </button>
                        </div>
                    </div>
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
                    <table className="sub-history-table">
                        <thead>
                            <tr>
                                <th>VERSION</th>
                                <th>TIMESTAMP</th>
                                <th>ASSET LINKS</th>
                                <th>MENTOR FEEDBACK</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.filter(item => !item.roundId || item.roundId == formData.roundId).length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
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
                                                    {renderAssetLink(
                                                        item.githubRepoUrl,
                                                        'GitHub repository',
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                                    )}
                                                    {renderAssetLink(
                                                        item.liveDemoUrl,
                                                        'live demo',
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                    )}
                                                    {renderAssetLink(
                                                        item.docsUrl,
                                                        'project documentation',
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    )}
                                                    {renderAssetLink(
                                                        item.slideUrl,
                                                        'presentation slides',
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {item.mentorFeedback ? (
                                                    <button type="button" onClick={() => setSelectedFeedbackRecord(item)} style={{ padding: '6px 12px', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #c4b5fd', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View Feedback
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-badge ${getSubmissionStatusClass(item)}`}>
                                                    {String(item.status).toUpperCase() !== 'ARCHIVED' && (
                                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                    )}
                                                    {getSubmissionStatusLabel(item)}
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

            {selectedFeedbackRecord && (
                <div className="modal-overlay" onClick={() => setSelectedFeedbackRecord(null)}>
                    <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Feedback Details (v{selectedFeedbackRecord.version}.0)</h2>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {selectedFeedbackRecord.mentorFeedback && (
                                <div style={{ border: '1px solid #c4b5fd', borderRadius: '8px', padding: '16px', background: '#f5f3ff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <h4 style={{ margin: 0, color: '#6d28d9', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Mentor Feedback
                                        </h4>
                                        {selectedFeedbackRecord.mentorName && (
                                            <span style={{ fontSize: '12px', color: '#7c3aed', background: '#ede9fe', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                                                by {selectedFeedbackRecord.mentorName}
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, color: '#4c1d95', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                        {selectedFeedbackRecord.mentorFeedback}
                                    </p>
                                </div>
                            )}
                            
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '15px' }}>Submitted Links</h4>
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                    {renderAssetLink(selectedFeedbackRecord.githubRepoUrl, 'GitHub', <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>)}
                                    {renderAssetLink(selectedFeedbackRecord.liveDemoUrl, 'Demo', <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>)}
                                    {renderAssetLink(selectedFeedbackRecord.docsUrl, 'Docs', <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>)}
                                    {renderAssetLink(selectedFeedbackRecord.slideUrl, 'Slides', <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>)}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary" onClick={() => setSelectedFeedbackRecord(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSubmission;

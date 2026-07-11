import { useState, useEffect, useRef } from 'react';
import './ProjectSubmission.css';
import './LeaderWorkspace.css';

const API_STUDENT = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"+"/student";
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
const parseRequirements = (reqString) => {
    if (!reqString || reqString === '[]') return [];
    try {
        const parsed = JSON.parse(reqString);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
    if (typeof reqString === 'string') {
        return reqString.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
};

const GenericLinkIcon = ({ width = 18, height = 18 }) => (
    <svg width={width} height={height} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const FeedbackDetailModal = ({ selectedFeedbackRecord, selectedRound, renderAssetLink, onClose }) => {
    if (!selectedFeedbackRecord) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Feedback Details (v{selectedFeedbackRecord.version}.0)</h2>
                </div>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {selectedFeedbackRecord.mentorFeedback && (
                        <div style={{ border: '1px solid #c4b5fd', borderRadius: '8px', padding: '16px', background: '#f5f3ff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <h4 style={{ margin: 0, color: '#0f172a', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Mentor Feedback
                                </h4>
                                {selectedFeedbackRecord.mentorName && (
                                    <span style={{ fontSize: '12px', color: '#0f172a', background: '#ede9fe', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                                        by {selectedFeedbackRecord.mentorName}
                                    </span>
                                )}
                            </div>
                            <p style={{ margin: 0, color: '#0f172a', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                {selectedFeedbackRecord.mentorFeedback}
                            </p>
                        </div>
                    )}

                    <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: '15px' }}>Submitted Links</h4>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            {selectedRound && parseRequirements(selectedRound.submissionRequirements).map((req, i) => {
                                if (!selectedFeedbackRecord[req]) return null;
                                return renderAssetLink(selectedFeedbackRecord[req], req, <GenericLinkIcon width={14} height={14} />);
                            })}
                        </div>
                    </div>
                </div>
                <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

const ConfirmSubmitModal = ({ isConfirmed, setIsConfirmed, onCancel, onConfirm }) => {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" style={{ maxWidth: '450px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Final Submission Warning
                    </h2>
                </div>
                <div className="modal-body">
                    <p style={{ margin: '0 0 16px 0', color: '#334155', fontSize: '15px', lineHeight: '1.5' }}>
                        Are you sure you want to officially submit your project? This action will <strong>finalize</strong> your submission.
                    </p>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                        <p style={{ margin: 0, color: '#991b1b', fontSize: '14px', lineHeight: '1.5' }}>
                            <strong>WARNING:</strong> Once submitted, you cannot edit or recall this submission for the current round. Only submit when your team is completely finished.
                        </p>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '8px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <input type="checkbox" checked={isConfirmed} onChange={(e) => setIsConfirmed(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#2563eb' }} />
                        <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, userSelect: 'none' }}>
                            I understand that this is the final submission and cannot be undone.
                        </span>
                    </label>
                </div>
                <div className="modal-footer" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button className="btn-secondary" onClick={onCancel} style={{ padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button className="btn-primary" onClick={onConfirm} disabled={!isConfirmed} style={{ padding: '8px 16px', background: isConfirmed ? '#2563eb' : '#94a3b8', color: 'white', border: 'none', borderRadius: '6px', cursor: isConfirmed ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
                        Confirm Submit
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProjectSubmission = () => {
    const [formData, setFormData] = useState({
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
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
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
            const processedHistory = (data.history || []).map(item => {
                let parsedData = {};
                try {
                    if (item.submissionData) {
                        parsedData = JSON.parse(item.submissionData);
                    }
                } catch (e) {}
                return { ...item, ...parsedData };
            });
            setHistory(processedHistory);

            if (data.rounds && data.rounds.length > 0) {
                setFormData(prev => ({
                    ...prev,
                    roundId: (() => {
                        const currentRoundId = data.rounds.some(round => String(round.id) === String(prev.roundId))
                            ? prev.roundId
                            : '';

                        return currentRoundId || '';
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
    const qualificationStatus = (selectedRound ? (selectedRound.qualificationStatus || '') : (pageData?.qualificationStatus || '')).toUpperCase();
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

    const activeRoundForDeadline = pageData?.rounds?.find(r => ['ACTIVED', 'OPEN'].includes(getNormalizedRoundStatus(r)));
    const displayRoundForDeadline = selectedRound || activeRoundForDeadline;

    const registrationDeadline =
        workspaceData?.registrationDeadline ||
        workspaceData?.teamRegistrationDeadline ||
        pageData?.registrationDeadline ||
        '2026-06-20T23:59:00+07:00';

    const roundDeadline =
        displayRoundForDeadline?.deadline ||
        displayRoundForDeadline?.submissionDeadline ||
        displayRoundForDeadline?.endDate ||
        workspaceData?.submissionDeadline ||
        '2026-06-24T15:32:00+07:00';

    const registrationOpen =
        workspaceData?.registrationStart ||
        workspaceData?.teamRegistrationStart ||
        pageData?.registrationStart ||
        pageData?.teamRegistrationStart;

    const roundOpen =
        displayRoundForDeadline?.submissionOpen ||
        displayRoundForDeadline?.openDate ||
        displayRoundForDeadline?.startDate ||
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
        ? `${displayRoundForDeadline?.name || 'Round'} - Deadline`
        : 'Team Registration Deadline';

    const deadlineCloseText = isTeamApproved
        ? 'Gateway Closes:'
        : 'Registration Closes:';

    const deadlineOpenText = isTeamApproved
        ? 'Gateway Opens:'
        : 'Registration Opens:';

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

    const hasOfficialSubmission = history.some(item => {
        if (item.roundId && formData.roundId && String(item.roundId) !== String(formData.roundId)) return false;

        const isDraft = String(item.status || '').toUpperCase() === 'DRAFT' || String(item.submissionType || '').toUpperCase() === 'DRAFT';
        if (isDraft) return false;

        const status = String(item.status || '').toUpperCase();
        return ['SUBMITTED', 'OFFICIAL', 'EVALUATED', 'MISSED_DEADLINE'].includes(status) || item.evaluated;
    });

    const isInputsDisabled = !isTeamLeader || !formData.roundId || isSelectedRoundNotOpened || isSelectedRoundClosed || isSubmitting || !isSelectedRoundEligible || hasOfficialSubmission;
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
    const notLeaderMessage = hasLoadedSubmissionRole && !isTeamLeader ? 'Only the leader is allowed to submit the project.' : '';
    const submitFeedbackMessage = error || successMessage || notLeaderMessage || notEligibleMessage || closedRoundMessage || notOpenedRoundMessage;
    const submitFeedbackType = error || notLeaderMessage || notEligibleMessage || closedRoundMessage ? 'error' : notOpenedRoundMessage ? 'warning' : 'success';
    const submitFeedbackVariant = notLeaderMessage || notEligibleMessage || closedRoundMessage || notOpenedRoundMessage ? ' closed' : '';

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
        const message = data?.message || data?.error ||
            data?.detail || data?.data?.message || fallback;
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

    const renderAssetLink = (url, label, icon, showLabel = false) => {
        const assetUrl = getAssetUrl(url);
        if (!assetUrl) return null;

        return (
            <a className={`asset-link-icon ${showLabel ? 'with-label' : ''}`}
               href={assetUrl} target="_blank"
               rel="noopener noreferrer" title={`Open ${label}`}
               aria-label={`Open ${label}`}
               style={showLabel ? { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', color: '#334155', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 500, border: '1px solid #e2e8f0' } : {}}
            >
                {icon}
                {showLabel && <span>{label}</span>}
            </a>
        );
    };

    const getSubmissionStatusClass = (item) => {
        const status = String(item?.status || '').toUpperCase();
        if (item?.evaluated || status === 'EVALUATED') return 'status-evaluated';
        if (status === 'ARCHIVED') return 'status-archived';
        if (status === 'DRAFT') return 'status-draft';
        if (status === 'MISSED_DEADLINE') return 'status-missed-deadline';
        return 'status-official';
    };
    const getSubmissionStatusLabel = (item) => {
        const status = String(item?.status || '').toUpperCase();
        if (item?.evaluated || status === 'EVALUATED') {
            return 'Evaluated';
        }
        if (status === 'SUBMITTED') return 'Submitted';
        if (status === 'MISSED_DEADLINE') return 'Missed Deadline';
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



    const clearErrorMessage = () => {
        if (errorTimerRef.current) {
            clearTimeout(errorTimerRef.current);
            errorTimerRef.current = null;
        }

        setError('');
    };

    const handleSubmitClick = (type = 'SUBMITTED') => {
        if (!isTeamApproved) {
            showErrorMessage('Your team has not been approved yet. You cannot submit.');
            return;
        }

        if (hasLoadedSubmissionRole && !isTeamLeader) {
            showErrorMessage('Only Team Leaders are permitted to submit the project.');
            return;
        }

        if (!isRoundActive) {
            showErrorMessage('This round is not active yet. You cannot submit.');
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
            const reqs = parseRequirements(selectedRound.submissionRequirements);
            for (const req of reqs) {
                if (!formData[req] || !formData[req].trim()) {
                    showErrorMessage(`${req} is required for this round.`);
                    return;
                }
            }
        }

        if (type === 'SUBMITTED') {
            setShowConfirmModal(true);
            setIsConfirmed(false);
            return;
        }

        executeSubmit('DRAFT');
    };

    const executeSubmit = async (type = 'SUBMITTED') => {
        setShowConfirmModal(false);
        setIsSubmitting(true);
        clearErrorMessage();
        showSuccessMessage(`Project ${type === 'DRAFT' ? 'draft saved' : 'submitted'} successfully!`);

        try {
            const token = localStorage.getItem('shms_token');
            const { roundId, submissionType, ...restData } = formData;
            const submittedRoundId = roundId;
            const payload = {
                roundId: submittedRoundId,
                submissionType: type,
                submissionData: JSON.stringify(restData)
            };

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
                const rawHistory = result.history || updatedPageData.history;
                const processedHistory = rawHistory.map(item => {
                    let parsedData = {};
                    try {
                        if (item.submissionData) {
                            parsedData = JSON.parse(item.submissionData);
                        }
                    } catch (e) {}
                    return { ...item, ...parsedData };
                });
                setHistory(processedHistory);
            }

            setFormData(prev => ({
                ...prev,
                roundId: submittedRoundId || prev.roundId,
            }));

            if (submittedRoundId) {
                sessionStorage.setItem(SELECTED_ROUND_STORAGE_KEY, String(submittedRoundId));
            }
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
            <div className="submission-content">
                {isLoading && (
                    <p style={{ marginBottom: '16px', color: '#64748b' }}>
                        Loading submission data...
                    </p>
                )}

                {!hasRegisteredContest ? (
                    teamStatus === 'CLOSED' ? (
                        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', textAlign: 'center', fontWeight: '500' }}>
                            This competition has been closed. You can no longer submit projects.
                        </div>
                    ) : (
                        <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', textAlign: 'center', fontWeight: '500' }}>
                            You have not registered for any competition yet.
                        </div>
                    )
                ) : !isTeamApproved ? (
                    <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', color: '#d97706', textAlign: 'center', fontWeight: '500' }}>
                        Your team registration is currently {teamStatus.toLowerCase()}. You can submit projects once your team is approved.
                    </div>
                ) : String(contestStatus).toUpperCase() === 'CLOSED' ? (
                    <div style={{ marginTop: '24px', padding: '16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', textAlign: 'center', fontWeight: '500' }}>
                        This competition has been closed. You can no longer submit projects.
                    </div>
                ) : (
                    <>
                        <div className="submission-header">
                    <div className="submission-header-left">
                        <h1 className="submission-title">Project Submission Portal</h1>
                        {contestName && (
                            <div className="submission-contest" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#475569' }}>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>

                                <span style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a' }}>{contestName}</span>
                                {contestStatus && (
                                    <span className="active-badge" style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        ...(String(contestStatus).toUpperCase() === 'ACTIVED' ? { backgroundColor: '#dcfce3', color: '#166534' } : { backgroundColor: '#f1f5f9', color: '#475569' }),
                                        fontSize: '13px',
                                        padding: '4px 12px',
                                        borderRadius: '16px',
                                        fontWeight: '700',
                                        marginLeft: '8px'
                                    }}>
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: String(contestStatus).toUpperCase() === 'ACTIVED' ? '#16a34a' : '#94a3b8'
                                        }}></span>
                                        {contestStatus}
                                    </span>
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

                                <div className="submission-status-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Qualification Status: 
                                    {qualificationStatus && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            backgroundColor: ['QUALIFIED', 'PROMOTED'].includes(qualificationStatus) ? '#dcfce3' : '#fef2f2',
                                            color: ['QUALIFIED', 'PROMOTED'].includes(qualificationStatus) ? '#166534' : '#dc2626',
                                            fontSize: '15px',
                                            fontWeight: '700'
                                        }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: ['QUALIFIED', 'PROMOTED'].includes(qualificationStatus) ? '#16a34a' : '#ef4444'
                                            }}></span>
                                            {qualificationStatus}
                                        </span>
                                    )}
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
                            <div className="rounds-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                                {(() => {
                                    const visibleRounds = [];
                                    if (pageData?.rounds) {
                                        for (const r of pageData.rounds) {
                                            visibleRounds.push(r);
                                            if (String(r.qualificationStatus || '').toUpperCase() === 'ELIMINATED') {
                                                break;
                                            }
                                        }
                                    }
                                    return visibleRounds.map((r, index) => {
                                        const statusLabel = getRoundStatusLabel(r);
                                    const isActive = statusLabel === 'ACTIVED';
                                    const isSelected = String(formData.roundId) === String(r.id);

                                    return (
                                        <div
                                            key={`${r.id}-${index}`}
                                            onClick={() => handleChange({ target: { name: 'roundId', value: r.id } })}
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '12px 16px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                backgroundColor: isActive ? '#dcfce3' : '#f1f5f9',
                                                border: isSelected ? '2px solid #2563eb' : '1px solid transparent',
                                                transition: 'all 0.2s ease-in-out'
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                                {r.name}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontWeight: '700',
                                                color: isActive ? '#166534' : '#64748b',
                                                fontSize: '14px'
                                            }}>
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    backgroundColor: isActive ? '#16a34a' : '#94a3b8'
                                                }}></span>
                                                {statusLabel}
                                            </div>
                                        </div>
                                    );
                                    });
                                })()}
                            </div>
                        </div>
                        {selectedRound && getRoundStatusLabel(selectedRound) === 'UPCOMING' && (
                            <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#ef4444', fontStyle: 'italic', background: '#fef2f2', borderRadius: '8px', border: '1px dashed #fca5a5' }}>
                                It is not yet time to submit your assignment
                            </div>
                        )}
                        {isSelectedRoundEligible && selectedRound && getRoundStatusLabel(selectedRound) !== 'UPCOMING' && parseRequirements(selectedRound.submissionRequirements).map((req, idx) => {
                            return (
                                <div className="form-group" key={idx}>
                                    <label className="form-group-label">
                                        <GenericLinkIcon />
                                        {req}
                                    </label>
                                    <div className="input-wrapper">
                                        <input
                                            type="text"
                                            name={req}
                                            value={formData[req] || ''}
                                            onChange={handleChange}
                                            placeholder={`Enter your ${req}...`}
                                            disabled={isInputsDisabled}
                                            className="custom-input"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {selectedRound && getRoundStatusLabel(selectedRound) !== 'UPCOMING' && (
                        <div className="submit-action-row" style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'stretch' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                                {submitFeedbackMessage && (
                                    <p className={`submission-message ${submitFeedbackType} submit-feedback${submitFeedbackVariant}`} style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center' }}>
                                        {submitFeedbackMessage}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                                <button type="button" className="submit-btn submit-btn-draft" onClick={() => handleSubmitClick('DRAFT')} disabled={isInputsDisabled}
                                        style={{ padding: '0 24px', borderRadius: '8px', height: '100%', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b', background: '#f8fafc', border: '2px solid #e2e8f0', fontWeight: '600' }}>
                                    {isSubmitting ? 'Saving...' : 'Save Draft'}
                                </button>
                                <button type="button" className="submit-btn submit-btn-official" onClick={() => handleSubmitClick('SUBMITTED')} disabled={isInputsDisabled}
                                        style={{ padding: '0 24px', borderRadius: '8px', height: '100%', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {hasOfficialSubmission ? 'Already Submitted' : isSubmitting ? 'Submitting...' : 'Submit Project'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedRound && getRoundStatusLabel(selectedRound) !== 'UPCOMING' && (
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
                                            <td className="version-col">
                                                v{item.version}.0
                                                <div style={{ marginTop: '4px' }}>
                                                    {String(item.status || '').toUpperCase() === 'DRAFT' ? (
                                                        <span style={{ fontSize: '11px', color: '#854d0e', background: '#fef08a', padding: '2px 6px', borderRadius: '12px', fontWeight: '600' }}>Draft</span>
                                                    ) : (
                                                        <span style={{ fontSize: '11px', color: '#166534', background: '#dcfce3', padding: '2px 6px', borderRadius: '12px', fontWeight: '600' }}>Final</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{formattedTime}</td>
                                            <td>
                                                <div className="asset-icons">
                                                    {selectedRound && parseRequirements(selectedRound.submissionRequirements).map((req, i) => {
                                                        if (!item[req]) return null;
                                                        return renderAssetLink(item[req], req, <GenericLinkIcon width={16} height={16} />);
                                                    })}
                                                </div>
                                            </td>
                                            <td>
                                                {item.mentorFeedback ? (
                                                    <button type="button" onClick={() => setSelectedFeedbackRecord(item)} style={{ padding: '6px 12px', background: '#f5f3ff', color: '#0f172a', border: '1px solid #c4b5fd', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        View Feedback</button>
                                                ) : ( <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span> )}
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
                )}
                    </>
                )}
            </div>

            <FeedbackDetailModal
                selectedFeedbackRecord={selectedFeedbackRecord}
                selectedRound={selectedRound}
                renderAssetLink={renderAssetLink}
                onClose={() => setSelectedFeedbackRecord(null)}
            />

            {showConfirmModal && (
                <ConfirmSubmitModal
                    isConfirmed={isConfirmed}
                    setIsConfirmed={setIsConfirmed}
                    onCancel={() => setShowConfirmModal(false)}
                    onConfirm={() => executeSubmit('SUBMITTED')}
                />
            )}
        </div>
    );
};

export default ProjectSubmission;

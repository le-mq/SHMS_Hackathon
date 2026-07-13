import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MentorCategory.css';
import LatestAnnouncements from './LatestAnnouncements';
import RoundDetailsModal from './RoundDetailsModal';

const getRoundBadgeStyle = (state) => {
    if (state === 'CLOSED') return { bg: '#fee2e2', color: '#ef4444', border: '#fecaca' };
    if (state === 'UPCOMING') return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
    return { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
};

const getProgressBadge = (status) => {
    if (!status || status.toUpperCase() === 'IDEATION') return { bg: '#fee2e2', color: '#991b1b', label: 'Not Submitted' };
    const upper = status.toUpperCase();
    const label = status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    if (upper === 'DRAFT') return { bg: '#fef3c7', color: '#92400e', label };
    if (upper === 'SUBMITTED') return { bg: '#dcfce7', color: '#166534', label };
    if (upper === 'EVALUATED') return { bg: '#dbeafe', color: '#1e40af', label };
    return { bg: '#fee2e2', color: '#991b1b', label };
};

const TeamAssetLinks = ({ team }) => {
    let subData = {};
    try {
        if (team.submissionData) {
            subData = typeof team.submissionData === 'string' ? JSON.parse(team.submissionData) : team.submissionData;
        } else {
            subData = team;
        }
    } catch (e) {
        subData = team;
    }

    const getAssetUrl = (url) => {
        const trimmedUrl = String(url || '').trim();
        if (!trimmedUrl) return '';
        if (/^https?:\/\//i.test(trimmedUrl)) return trimmedUrl;
        return `https://${trimmedUrl}`;
    };

    const renderAssetLink = (url, label, icon) => {
        const assetUrl = getAssetUrl(url);
        if (!assetUrl) return null;
        return (
            <a key={label} className="asset-link-icon" href={assetUrl} target="_blank"
               rel="noopener noreferrer" title={`Open ${label}`} aria-label={`Open ${label}`}
               style={{ width: '24px', height: '24px', borderRadius: '6px', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </a>
        );
    };

    const defaultIcon = <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>;
    const githubIcon = <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
    const demoIcon = <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    const docsIcon = <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    const slideIcon = <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
    const iconMap = {
        'Source Code URL': githubIcon, 'GitHub Repository': githubIcon,
        'Live Demo URL': demoIcon, 'Live Demo': demoIcon, 'Video URL': demoIcon,
        'Documentation URL': docsIcon, 'Project Documentation': docsIcon,
        'Presentation Slide URL': slideIcon, 'Presentation Slides': slideIcon
    };
    const allLinks = [];
    Object.entries(subData).forEach(([key, val]) => {
        if (typeof val === 'string' && val.trim() !== '' && !['id', 'teamId', 'roundId'].includes(key)) {
            const label = key;
            const icon = iconMap[key] || defaultIcon;
            allLinks.push(renderAssetLink(val, label, icon));
        }
    });
    const validLinks = allLinks.filter(Boolean);
    if (validLinks.length === 0) return <span style={{ fontSize: '13px', color: '#94a3b8' }}>No links</span>;
    return <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>{validLinks}</div>;
};

const ContestCard = ({ c, onClick, onViewInfo }) => (
    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1.5px solid #94a3b8', cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }} onClick={onClick} onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.borderColor = '#94a3b8'}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: 700, lineHeight: '1.4' }}>{c.contestName}</h3>
            <span style={{ fontSize: '11px', background: c.contestStatus === 'CLOSED' ? '#fee2e2' : '#dcfce7', color: c.contestStatus === 'CLOSED' ? '#ef4444' : '#166534', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{c.contestStatus || 'ACTIVE'}</span>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', color: '#64748b', fontSize: '14px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Categories</span>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {c.trackOverviews && c.trackOverviews.length > 0 ? c.trackOverviews.map(t => t.trackName).join(', ') : 'N/A'}
                </span>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onViewInfo(); }}
                style={{ padding: '6px 12px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: '4px' }}
            >View Contest Info</button>
        </div>
    </div>
);

const MentorCategory = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [teamFilter, setTeamFilter] = useState('ALL');
    const [filterRound, setFilterRound] = useState(() => sessionStorage.getItem('mentorSelectedRound') || '');
    const [feedbackTeamId, setFeedbackTeamId] = useState(null);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [feedbackSubmissionId, setFeedbackSubmissionId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [selectedContestId, setSelectedContestId] = useState(() => sessionStorage.getItem('mentorSelectedContestId') || null);
    const [previewRoundId, setPreviewRoundId] = useState(null);
    const [previewContestId, setPreviewContestId] = useState(null);
    const [contestSearchQuery, setContestSearchQuery] = useState('');
    const fetchMentorData = async () => {
        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/mentor/assigned-teams", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('API failed');
            const jsonData = await response.json();
            setData(jsonData);
            if (Array.isArray(jsonData) && jsonData.length === 1) {
                setSelectedContestId(jsonData[0].contestId);
            }
        } catch (err) {
            console.warn("API failed, falling back to mock data...");
            try {
                const fallback = await fetch('/testFE.json');
                const mock = await fallback.json();
                const mockData = mock.mentorCategory.data;
                setData(mockData);
                if (Array.isArray(mockData) && mockData.length === 1) {
                    setSelectedContestId(mockData[0].contestId);
                } else if (mockData && !Array.isArray(mockData)) {
                    setData([mockData]);
                    setSelectedContestId(mockData.contestId);
                }
            } catch (mockErr) {
                setError('Could not connect to server and no mock data found.');
            }
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        fetchMentorData();
    }, []);
    const handleSendFeedback = async () => {
        if (!feedbackContent.trim()) {
            setFeedbackMessage('Please enter your feedback before sending.');
            return;
        }
        if (!feedbackSubmissionId) return;
        setFeedbackLoading(true);
        setFeedbackMessage('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/mentor/feedbacks", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ submissionId: feedbackSubmissionId, feedbackContent })
            });
            const json = await res.json();
            if (res.ok) {
                setFeedbackMessage(json.message || 'Feedback sent successfully!');
                setTimeout(() => {
                    fetchMentorData();
                    setFeedbackTeamId(null);
                    setFeedbackMessage('');
                    setFeedbackContent('');
                }, 1000);
            } else {
                setFeedbackMessage(json.error || 'Failed to send feedback');
            }
        } catch { setFeedbackMessage('Could not connect to server.'); }
        finally { setFeedbackLoading(false); }
    };
    let activeContestData = null;
    if (Array.isArray(data)) {
        activeContestData = data.find(c => String(c.contestId) === String(selectedContestId)) || data[0];
    } else {
        activeContestData = data;
    }
    const { contestName = "N/A", contestStatus, trackOverviews = [], allocatedTeams = [] } = activeContestData || {};
    const uniqueRounds = Array.from(new Set(allocatedTeams.map(t => t.roundName).filter(Boolean)));
    const roundStateMap = {};
    allocatedTeams.forEach(t => {
        if (t.roundName) {
            roundStateMap[t.roundName] = t.roundState || 'ACTIVED';
        }
    });

    useEffect(() => {
        if (uniqueRounds.length > 0 && (!filterRound || filterRound === 'All' || !uniqueRounds.includes(filterRound))) {
            const saved = sessionStorage.getItem('mentorSelectedRound');
            if (saved && saved !== 'All' && uniqueRounds.includes(saved)) {
                setFilterRound(saved);
            } else {
                setFilterRound(uniqueRounds[0]);
                sessionStorage.setItem('mentorSelectedRound', uniqueRounds[0]);
            }
        }
    }, [uniqueRounds.length, filterRound, JSON.stringify(uniqueRounds)]);

    if (isLoading) return <div className="mentor-container">Loading...</div>;
    if (error && (!data || data.length === 0)) return <div className="mentor-container">Error: {error}</div>;
    const filteredTeams = allocatedTeams.filter(team => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query || team.teamName?.toLowerCase().includes(query) ||
            team.leaderName?.toLowerCase().includes(query);

        const matchesRound = filterRound === 'All' ||
            (team.roundName && team.roundName.trim().toLowerCase() === filterRound.trim().toLowerCase());

        const progress = (team.progressStatus || '').toUpperCase();
        let matchesStatus = true;
        if (teamFilter === 'NOT_SUBMITTED') matchesStatus = progress !== 'DRAFT' && progress !== 'SUBMITTED' && progress !== 'EVALUATED';
        else if (teamFilter === 'WAITING') matchesStatus = progress === 'DRAFT' && team.hasGivenFeedback === false;
        else if (teamFilter === 'GRADED') matchesStatus = progress === 'SUBMITTED' || progress === 'EVALUATED' || team.hasGivenFeedback === true;
        return matchesSearch && matchesRound && matchesStatus;
    });

    return (
        <div className="mentor-container">
            <div className="mentor-content">
                <div style={{ marginTop: '32px' }}><LatestAnnouncements /></div>
                {!selectedContestId ? (
                    <div className="contest-list-view">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div>
                                <h1 className="mentor-title">Your Assigned Contests</h1>
                                <p className="mentor-subtitle">Select an active or past contest to manage student teams and feedback.</p>
                            </div>
                            <div className="search-box" style={{ width: '300px' }}>
                                <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input type="text" placeholder="Search contests..." value={contestSearchQuery} onChange={(e) => setContestSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                            {Array.isArray(data) && data.filter(c => !contestSearchQuery || c.contestName?.toLowerCase().includes(contestSearchQuery.toLowerCase()))
                                .sort((a, b) => {
                                    if (a.contestStatus === 'CLOSED' && b.contestStatus !== 'CLOSED') return 1;
                                    if (a.contestStatus !== 'CLOSED' && b.contestStatus === 'CLOSED') return -1;
                                    return 0;
                                })
                                .map(c => (
                                    <ContestCard key={c.contestId} c={c} onClick={() => { setSelectedContestId(c.contestId); sessionStorage.setItem('mentorSelectedContestId', c.contestId); }} onViewInfo={() => {
                                        setPreviewContestId(c.contestId);
                                    }} />
                                ))}
                            {Array.isArray(data) && data.filter(c => !contestSearchQuery || c.contestName?.toLowerCase().includes(contestSearchQuery.toLowerCase())).length === 0 && (
                                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>No contests found matching your search.</div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mentor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1 className="mentor-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Contest: {contestName}
                                    {contestStatus === 'CLOSED' && (
                                        <span style={{ fontSize: '12px', background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Closed</span>
                                    )}
                                </h1>
                                <p className="mentor-subtitle">Manage your assigned technical categories and track the real-time progress of student teams.</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button onClick={() => { setSelectedContestId(null); sessionStorage.removeItem('mentorSelectedContestId'); }} style={{ padding: '8px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                    Back to Contests
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', width: '100%', background: 'white', padding: '20px', borderRadius: '12px', border: '1.5px solid #94a3b8', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginTop: '20px', marginBottom: '20px' }}>
                            <div style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Contest</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a', fontWeight: 600, fontSize: '14px', width: '100%' }}>
                                    {contestName}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Overall Status:</span>
                                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: contestStatus === 'CLOSED' ? '#fee2e2' : '#d1fae5', color: contestStatus === 'CLOSED' ? '#ef4444' : '#065f46', border: `1px solid ${contestStatus === 'CLOSED' ? '#fecaca' : '#a7f3d0'}` }}>{contestStatus || 'UNKNOWN'}</span>
                                </div>
                            </div>
                            <div style={{ width: '1px', background: '#e2e8f0', margin: '0 10px' }} className="divider-hide-mobile"></div>
                            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Round</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                    {uniqueRounds.map((r, idx) => {
                                        const isActive = filterRound === r;
                                        const badgeStyle = getRoundBadgeStyle(roundStateMap[r]);
                                        const roundId = allocatedTeams.find(t => t.roundName === r)?.roundId;
                                        return (
                                            <div key={idx} onClick={() => { setFilterRound(r); sessionStorage.setItem('mentorSelectedRound', r); }} style={{ padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${isActive ? '#3b82f6' : '#cbd5e1'}`, background: isActive ? '#eff6ff' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '100px', boxShadow: isActive ? '0 0 0 1px #3b82f6' : 'none' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? '#1e3a8a' : '#334155' }}>{r}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                                                    <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', background: badgeStyle.bg, color: badgeStyle.color, border: `1px solid ${badgeStyle.border}`, alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        {roundStateMap[r]}
                                                    </span>
                                                    {roundId && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPreviewRoundId(roundId); }}
                                                            style={{ padding: '6px 12px', background: isActive ? '#3b82f6' : '#fff', color: isActive ? '#fff' : '#0f172a', border: `1px solid ${isActive ? '#2563eb' : '#cbd5e1'}`, borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = isActive ? '#2563eb' : '#f8fafc';
                                                                e.currentTarget.style.borderColor = isActive ? '#1d4ed8' : '#94a3b8';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = isActive ? '#3b82f6' : '#fff';
                                                                e.currentTarget.style.borderColor = isActive ? '#2563eb' : '#cbd5e1';
                                                            }}
                                                        >
                                                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            Req & Rubric
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {uniqueRounds.length === 0 && <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>No Rounds Available</span>}
                                </div>
                            </div>
                        </div>
                        <div className="teams-section">
                            <div className="teams-header">
                                <h2 className="teams-title">Allocated Student Teams</h2>
                                <div className="teams-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setTeamFilter('ALL')} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: teamFilter === 'ALL' ? '#3b82f6' : 'white', color: teamFilter === 'ALL' ? 'white' : '#475569', fontSize: '13px', cursor: 'pointer' }}>All</button>
                                        <button onClick={() => setTeamFilter('NOT_SUBMITTED')} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: teamFilter === 'NOT_SUBMITTED' ? '#3b82f6' : 'white', color: teamFilter === 'NOT_SUBMITTED' ? 'white' : '#475569', fontSize: '13px', cursor: 'pointer' }}>Not Submitted</button>
                                        <button onClick={() => setTeamFilter('WAITING')} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: teamFilter === 'WAITING' ? '#3b82f6' : 'white', color: teamFilter === 'WAITING' ? 'white' : '#475569', fontSize: '13px', cursor: 'pointer' }}>Waiting for Feedback</button>
                                        <button onClick={() => setTeamFilter('GRADED')} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', background: teamFilter === 'GRADED' ? '#3b82f6' : 'white', color: teamFilter === 'GRADED' ? 'white' : '#475569', fontSize: '13px', cursor: 'pointer' }}>Reviewed</button>
                                    </div>
                                    <div className="search-box">
                                        <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        <input type="text" placeholder="Search teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <div className="teams-table-container">
                                <table className="teams-table">
                                    <thead>
                                    <tr>
                                        <th>TEAM & LEADER</th>
                                        <th>CATEGORY / ROUND</th>
                                        <th>PROGRESS</th>
                                        <th>PRODUCT</th>
                                        <th>FEEDBACK</th>
                                        <th>ACTION</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filteredTeams.map((team) => {
                                        const badge = getProgressBadge(team.progressStatus);
                                        const trackOverview = trackOverviews.find(t => t.trackName === team.trackName);
                                        const deadlinePassed = trackOverview?.feedbackDeadline ? new Date() > new Date(trackOverview.feedbackDeadline) : false;
                                        const canGiveFeedback = team.progressStatus && team.progressStatus.toUpperCase() === 'DRAFT' && team.canGiveFeedback !== false && !deadlinePassed;
                                        return (
                                            <tr key={team.teamId}>
                                                <td>
                                                    <div className="team-name-col" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                                        <span className="team-name">{team.teamName}</span>
                                                        <span style={{ fontSize: '12px', color: '#64748b' }}>Leader: {team.leaderName}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <span className="team-track" style={{ fontWeight: 500 }}>{team.trackName || team.categoryName}</span>
                                                        <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, color: '#334155', width: 'fit-content' }}>
                                                            {team.roundName || 'No Active Round'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                <span style={{ background: badge.bg, color: badge.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {badge.label}
                                                </span>
                                                </td>
                                                <td>{badge.label === 'Not Submitted' ? <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span> : <TeamAssetLinks team={team} />}</td>
                                                <td>{canGiveFeedback ? (
                                                    <span className={`feedback-badge ${team.hasGivenFeedback ? 'reviewed' : 'pending'}`}>
                                                    {team.hasGivenFeedback ? 'Reviewed' : 'Pending'}
                                                </span>
                                                ) : ( <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span> )}
                                                </td>
                                                <td>{canGiveFeedback ? (
                                                    <button onClick={() => {
                                                        setFeedbackTeamId(team.teamId);
                                                        setFeedbackSubmissionId(team.submissionId || team.teamId);
                                                        setFeedbackContent(team.mentorFeedback || '');
                                                        setFeedbackMessage('');
                                                    }} className={`feedback-btn ${team.hasGivenFeedback ? 'reviewed' : 'pending'}`}>
                                                        {team.hasGivenFeedback ? 'Edit Feedback' : 'Review'}
                                                    </button>
                                                ) : ( <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span> )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredTeams.length === 0 && (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No student teams found matching filters.</td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {feedbackTeamId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Mentor Feedback</h2>
                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>Provide feedback for the draft submission of the team.</p>
                        {(() => {
                            const selectedTeam = filteredTeams.find(t => t.teamId === feedbackTeamId);
                            if (!selectedTeam) return null;
                            const hasAnyLink = (() => {
                                let subData = {};
                                try {
                                    if (selectedTeam.submissionData) {
                                        subData = typeof selectedTeam.submissionData === 'string' ? JSON.parse(selectedTeam.submissionData) : selectedTeam.submissionData;
                                    } else {
                                        subData = selectedTeam;
                                    }
                                } catch(e) {
                                    subData = selectedTeam;
                                }
                                return Object.keys(subData).some(k => typeof subData[k] === 'string' && subData[k].trim() !== '' && !['id', 'teamId', 'roundId'].includes(k));
                            })();
                            if (!hasAnyLink) return null;
                            return (
                                <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Submitted Assets</div>
                                    <TeamAssetLinks team={selectedTeam} />
                                </div>
                            );
                        })()}
                        {feedbackMessage && (
                            <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', background: feedbackMessage.includes('sent') || feedbackMessage.includes('success') ? '#dcfce7' : '#fee2e2', color: feedbackMessage.includes('sent') || feedbackMessage.includes('success') ? '#166534' : '#991b1b' }}>
                                {feedbackMessage}
                            </div>
                        )}
                        <textarea value={feedbackContent} onChange={(e) => setFeedbackContent(e.target.value)} rows={6} placeholder="Enter your detailed feedback here..." style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical', marginBottom: '16px', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => { setFeedbackTeamId(null); setFeedbackMessage(''); setFeedbackContent(''); }} disabled={feedbackLoading} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                            <button onClick={handleSendFeedback} disabled={feedbackLoading || !feedbackContent.trim()} style={{ padding: '8px 16px', background: !feedbackContent.trim() ? '#94a3b8' : '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: !feedbackContent.trim() ? 'not-allowed' : 'pointer', fontWeight: 500 }}>{feedbackLoading ? 'Sending...' : 'Send Feedback'}</button>
                        </div>
                    </div>
                </div>
            )}
            {previewRoundId && (
                <RoundDetailsModal roundId={previewRoundId} mode="round" onClose={() => setPreviewRoundId(null)} />
            )}
            {previewContestId && (
                <RoundDetailsModal contestId={previewContestId} mode="contest" onClose={() => setPreviewContestId(null)} />
            )}
        </div>
    );
};

export default MentorCategory;
import { useState, useEffect } from 'react';
import './MentorCategory.css';
import NavbarMentor from './NavbarMentor';
import LatestAnnouncements from './LatestAnnouncements';

const FeedbackCountdown = ({ deadline, roundState }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [status, setStatus] = useState('');
    useEffect(() => {
        if (roundState === 'CLOSED') {
            setStatus('ROUND CLOSED');
            setTimeLeft('Grading Finished');
            return;
        }
        if (!deadline) {
            setStatus('NO DEADLINE');
            setTimeLeft('');
            return;
        }
        const target = new Date(deadline).getTime();
        const update = () => {
            const now = new Date().getTime();
            const diff = target - now;
            if (diff > 0) {
                setStatus('FEEDBACK OPEN');
                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const m = Math.floor((diff / 1000 / 60) % 60);
                const s = Math.floor((diff / 1000) % 60);
                setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
            } else {
                setStatus('FEEDBACK CLOSED');
                setTimeLeft('Grading in progress');
            }
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [deadline]);
    if (!deadline) return null;
    const isClosed = status === 'FEEDBACK CLOSED' || status === 'ROUND CLOSED';
    return (
        <div style={{ marginTop: '16px', background: isClosed ? '#fee2e2' : '#f0fdf4', border: `1px solid ${isClosed ? '#fca5a5' : '#bbf7d0'}`, borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: isClosed ? '#991b1b' : '#166534', letterSpacing: '0.05em' }}>{status}</div>
                {!isClosed && <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>Until Grading Starts</div>}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: isClosed ? '#7f1d1d' : '#15803d', fontVariantNumeric: 'tabular-nums' }}>
                {timeLeft}
            </div>
        </div>
    );
};

const MentorCategory = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [feedbackTeamId, setFeedbackTeamId] = useState(null);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [feedbackSubmissionId, setFeedbackSubmissionId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [selectedContestId, setSelectedContestId] = useState(null);
    useEffect(() => {
        const fetchMentorData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch('http://localhost:8080/api/v1/mentor/assigned-teams', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('API failed');
                const jsonData = await response.json();
                setData(jsonData);
                if (Array.isArray(jsonData) && jsonData.length > 0) {
                    setSelectedContestId(jsonData[0].contestId);
                }
            } catch (err) {
                console.warn("API failed, falling back to mock data...");
                try {
                    const fallback = await fetch('/testFE.json');
                    const mock = await fallback.json();
                    const mockData = mock.mentorCategory.data;
                    setData(mockData);
                    if (Array.isArray(mockData) && mockData.length > 0) {
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
        fetchMentorData();
    }, []);
    const handleSendFeedback = async () => {
        if (!feedbackContent.trim() || !feedbackSubmissionId) return;
        setFeedbackLoading(true);
        setFeedbackMessage('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch('http://localhost:8080/api/v1/mentor/feedbacks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ submissionId: feedbackSubmissionId, feedbackContent })
            });
            const json = await res.json();
            if (res.ok) {
                setFeedbackMessage(json.message || 'Feedback sent successfully!');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                setFeedbackMessage(json.error || 'Failed to send feedback');
            }
        } catch { setFeedbackMessage('Could not connect to server.'); }
        finally { setFeedbackLoading(false); }
    };
    if (isLoading) return <div className="mentor-container">Loading...</div>;
    if (error && (!data || data.length === 0)) return <div className="mentor-container">Error: {error}</div>;
    let activeContestData = null;
    if (Array.isArray(data)) {
        activeContestData = data.find(c => String(c.contestId) === String(selectedContestId)) || data[0];
    } else {
        activeContestData = data;
    }
    const { contestName = "N/A", trackOverviews = [], allocatedTeams = [] } = activeContestData || {};
    const filteredTeams = allocatedTeams.filter(team => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query || team.teamName?.toLowerCase().includes(query) ||
            team.leaderName?.toLowerCase().includes(query);
        const teamTrack = team.trackName || team.categoryName || '';
        const matchesFilter = filterCategory === 'All' ||
            teamTrack.trim().toLowerCase() === filterCategory.trim().toLowerCase();
        return matchesSearch && matchesFilter;
    });
    const renderLinks = (team) => {
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
                <a className="asset-link-icon" href={assetUrl} target="_blank"
                    rel="noopener noreferrer" title={`Open ${label}`} aria-label={`Open ${label}`}
                    style={{ width: '24px', height: '24px', borderRadius: '6px', color: '#64748b',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >{icon}</a>
            );
        };
        const hasAnyLink = team.githubRepoUrl || team.liveDemoUrl || team.docsUrl || team.slideUrl;
        if (!hasAnyLink) return <span style={{ fontSize: '13px', color: '#94a3b8' }}>No links</span>;
        return (
            <div style={{ display: 'flex', gap: '12px' }}>
                {renderAssetLink(team.githubRepoUrl, 'GitHub', <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>)}
                {renderAssetLink(team.liveDemoUrl, 'Demo', <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>)}
                {renderAssetLink(team.docsUrl, 'Docs', <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>)}
                {renderAssetLink(team.slideUrl, 'Slides', <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>)}
            </div>
        );
    };
    const getProgressBadge = (status) => {
        if (status === 'Draft') return { bg: '#fef3c7', color: '#92400e', label: 'Draft' };
        if (status === 'Official') return { bg: '#dcfce7', color: '#166534', label: 'Official' };
        if (status === 'Submitted') return { bg: '#dbeafe', color: '#1e40af', label: 'Submitted' };
        return { bg: '#f1f5f9', color: '#475569', label: status || 'Ideation' };
    };

    return (
        <div className="mentor-container">
            <NavbarMentor />
            <div className="mentor-content">
                <div style={{ marginTop: '32px' }}><LatestAnnouncements /></div>
                <div className="mentor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="mentor-title">Contest: {contestName}</h1>
                        <p className="mentor-subtitle">Manage your assigned technical categories and track the real-time progress of student teams.</p>
                    </div>
                    {Array.isArray(data) && data.length > 1 && (
                        <select value={selectedContestId || ''}
                            onChange={(e) => setSelectedContestId(e.target.value)}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', background: 'white', color: '#334155', fontWeight: 600 }}
                        >{data.map(c => ( <option key={c.contestId} value={c.contestId}>{c.contestName}</option> ))}
                        </select>
                    )}
                </div>
                <div className="track-cards">
                    {trackOverviews.map((track, idx) => (
                        <div className="track-card" key={idx}>
                            <div className="track-card-header">
                                <div className="track-name">{track.trackName}</div>
                            </div>
                            <div className="track-stat-row">
                                <span className="track-stat-label">Assigned Teams</span>
                                <span className="track-stat-value">{track.assignedTeams} Teams</span>
                            </div>
                            <div className="track-stat-row">
                                <span className="track-stat-label">Submission Rate</span>
                                <span className="track-stat-value">{track.completionPercentage}%</span>
                            </div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill" style={{ width: `${track.completionPercentage}%` }}></div>
                            </div>
                            <div className="progress-label">{track.completionPercentage}% teams submitted</div>
                            <FeedbackCountdown deadline={track.feedbackDeadline} roundState={track.targetRoundState} />
                        </div>
                    ))}
                </div>
                <div className="teams-section">
                    <div className="teams-header">
                        <h2 className="teams-title">Allocated Student Teams</h2>
                        <div className="teams-actions">
                            <div className="search-box">
                                <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input type="text" placeholder="Search teams..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <select className="filter-btn" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                                    style={{ border: '1px solid #e2e8f0', background: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', color: '#475569', outline: 'none', cursor: 'pointer' }}>
                                <option value="All">All Categories</option>
                                {trackOverviews.map((track, idx) => {
                                    const tName = track.trackName || track.categoryName;
                                    return <option key={idx} value={tName}>{tName}</option>;
                                })}
                            </select>
                        </div>
                    </div>

                    <table className="teams-table">
                        <thead>
                        <tr>
                            <th>TEAM NAME</th>
                            <th>SELECTED CATEGORY</th>
                            <th>ACTIVE ROUND</th>
                            <th>LEADER NAME</th>
                            <th>PROGRESS</th>
                            <th>PRODUCT</th>
                            <th>FEEDBACK</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredTeams.map((team) => {
                            const badge = getProgressBadge(team.progressStatus);
                            const canGiveFeedback = team.progressStatus === 'Submitted' && team.canGiveFeedback !== false;
                            return (
                                <tr key={team.teamId}>
                                    <td>
                                        <div className="team-name-col">
                                            <span className="team-name">{team.teamName}</span>
                                        </div>
                                    </td>
                                    <td><span className="team-track">{team.trackName || team.categoryName}</span></td>
                                    <td>
                                            <span style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                                {team.roundName || 'No Active Round'}
                                            </span>
                                    </td>
                                    <td><span className="team-leader">{team.leaderName}</span></td>
                                    <td>
                                            <span style={{ background: badge.bg, color: badge.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                                                {badge.label}
                                            </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{renderLinks(team)}</div>
                                    </td>
                                    <td>
                                        {canGiveFeedback ? (
                                            <button onClick={() => {
                                                setFeedbackTeamId(team.teamId);
                                                setFeedbackSubmissionId(team.submissionId || team.teamId);
                                                setFeedbackContent(team.mentorFeedback || '');
                                                setFeedbackMessage('');
                                            }} style={{ padding: '4px 12px', background: team.hasGivenFeedback ? '#f5f3ff' : '#7c3aed', color: team.hasGivenFeedback ? '#6d28d9' : '#fff', border: team.hasGivenFeedback ? '1px solid #c4b5fd' : 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                                                {team.hasGivenFeedback ? 'Update Feedback' : 'Give Feedback'}
                                            </button>
                                        ) : ( <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span> )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredTeams.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No student teams found matching filters.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>

            {feedbackTeamId && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Mentor Feedback</h2>
                        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>Provide feedback for the draft submission of the team.</p>
                        {feedbackMessage && (
                            <div style={{ marginBottom: '16px', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', background: feedbackMessage.includes('sent') || feedbackMessage.includes('success') ? '#dcfce7' : '#fee2e2', color: feedbackMessage.includes('sent') || feedbackMessage.includes('success') ? '#166534' : '#991b1b' }}>
                                {feedbackMessage}
                            </div>
                        )}
                        <textarea value={feedbackContent} onChange={(e) => setFeedbackContent(e.target.value)} rows={6} placeholder="Enter your detailed feedback here..." style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', resize: 'vertical', marginBottom: '16px', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => { setFeedbackTeamId(null); setFeedbackMessage(''); setFeedbackContent(''); }} disabled={feedbackLoading} style={{ padding: '8px 16px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                            <button onClick={handleSendFeedback} disabled={feedbackLoading} style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>{feedbackLoading ? 'Sending...' : 'Send Feedback'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorCategory;
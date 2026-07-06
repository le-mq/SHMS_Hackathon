import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MentorCategory.css';
import LatestAnnouncements from './LatestAnnouncements';
import RoundDetailsModal from './RoundDetailsModal';

const MentorCategory = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRound, setFilterRound] = useState('All');
    const [feedbackTeamId, setFeedbackTeamId] = useState(null);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [feedbackSubmissionId, setFeedbackSubmissionId] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [selectedContestId, setSelectedContestId] = useState(null);
    const [previewRoundId, setPreviewRoundId] = useState(null);
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
    const { contestName = "N/A", contestStatus, trackOverviews = [], allocatedTeams = [] } = activeContestData || {};
    const filteredTeams = allocatedTeams.filter(team => {
        const query = searchQuery.toLowerCase();
        const matchesSearch = !query || team.teamName?.toLowerCase().includes(query) ||
            team.leaderName?.toLowerCase().includes(query);

        const matchesRound = filterRound === 'All' ||
            (team.roundName && team.roundName.trim().toLowerCase() === filterRound.trim().toLowerCase());

        return matchesSearch && matchesRound;
    });

    const uniqueRounds = Array.from(new Set(allocatedTeams.map(t => t.roundName).filter(Boolean)));

    const renderLinks = (team) => {
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
                   style={{ width: '24px', height: '24px', borderRadius: '6px', color: '#64748b',
                       display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                   }}
                >{icon}
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

        return (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {validLinks}
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
            <div className="mentor-content">
                <div style={{ marginTop: '32px' }}><LatestAnnouncements /></div>
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
                    {Array.isArray(data) && data.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Selected Contest:</span>
                            <select value={selectedContestId || ''}
                                    onChange={(e) => setSelectedContestId(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer', background: 'white', color: '#0f172a', fontWeight: 600, fontSize: '14px' }}
                            >{data.map(c => (
                                <option key={c.contestId} value={c.contestId}>
                                    {c.contestName} {c.contestStatus === 'CLOSED' ? '(Closed)' : ''}
                                </option>
                            ))}
                            </select>
                        </div>
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
                            {track.targetRoundId && (
                                <button
                                    className="mentor-view-round-btn"
                                    onClick={() => setPreviewRoundId(track.targetRoundId)}
                                    style={{ marginTop: '12px', width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                                >View Round Details</button>
                            )}
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
                            <select className="filter-btn" value={filterRound} onChange={(e) => setFilterRound(e.target.value)}
                                    style={{ border: '1px solid #e2e8f0', background: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', color: '#475569', outline: 'none', cursor: 'pointer' }}>
                                <option value="All">All Rounds</option>
                                {uniqueRounds.map((r, idx) => (
                                    <option key={idx} value={r}>{r}</option>
                                ))}
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
                            <th>FEEDBACK STATUS</th>
                            <th>ACTION</th>
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
                                            <span className={`feedback-badge ${team.hasGivenFeedback ? 'reviewed' : 'pending'}`}>
                                                {team.hasGivenFeedback ? 'Reviewed' : 'Pending'}
                                            </span>
                                        ) : ( <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span> )}
                                    </td>
                                    <td>
                                        {canGiveFeedback ? (
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
                                <td colSpan="8" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No student teams found matching filters.</td>
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
                                    {renderLinks(selectedTeam)}
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
                            <button onClick={handleSendFeedback} disabled={feedbackLoading} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', fontWeight: 500 }}>{feedbackLoading ? 'Sending...' : 'Send Feedback'}</button>
                        </div>
                    </div>
                </div>
            )}

            {previewRoundId && (
                <RoundDetailsModal roundId={previewRoundId} onClose={() => setPreviewRoundId(null)} />
            )}
        </div>
    );
};

export default MentorCategory;
import { useState, useEffect } from 'react';
import './MentorCategory.css';
import NavbarMentor from './NavbarMentor';
import LatestAnnouncements from './LatestAnnouncements';

const MentorCategory = () => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    useEffect(() => {
        const fetchMentorData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch('http://localhost:8080/api/v1/mentor/assigned-teams', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('API failed');
                setData(await response.json());
            } catch (err) {
                console.warn("API failed, falling back to mock data...");
                try {
                    const fallback = await fetch('/testFE.json');
                    const mock = await fallback.json();
                    setData(mock.mentorCategory.data);
                } catch (mockErr) {
                    setError('Could not connect to server and no mock data found.');
                }
            } finally { setIsLoading(false); }
        };
        fetchMentorData();
    }, []);
    if (isLoading) return <div className="mentor-container">Loading...</div>;
    if (error && !data) return <div className="mentor-container">Error: {error}</div>;
    const { contestName = "N/A", trackOverviews = [], allocatedTeams = [] } = data || {};
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
        const links = [
            { url: team.githubRepoUrl, label: 'GitHub Repo', color: '#3b82f6' },
            { url: team.liveDemoUrl, label: 'Live Demo', color: '#10b981' },
            { url: team.docsUrl, label: 'Documentation', color: '#f59e0b' },
            { url: team.slideUrl, label: 'Slides', color: '#ef4444' }
        ].filter(l => l.url);
        if (!links.length) return <span style={{ fontSize: '12px', color: '#94a3b8' }}>No links</span>;
        return links.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" title={l.label}
               style={{ color: l.color, textDecoration: 'underline', fontSize: '13px' }}>
                {l.label}
            </a>
        ));
    };

    return (
        <div className="mentor-container">
            <NavbarMentor />
            <div className="mentor-content">
                <div style={{ marginTop: '32px' }}><LatestAnnouncements /></div>
                <div className="mentor-header">
                    <h1 className="mentor-title">Contest: {contestName}</h1>
                    <p className="mentor-subtitle">Manage your assigned technical categories and track the real-time progress of student teams.</p>
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
                            <th>LEADER NAME</th>
                            <th>PRODUCT</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredTeams.map((team) => (
                            <tr key={team.teamId}>
                                <td>
                                    <div className="team-name-col">
                                        <span className="team-name">{team.teamName}</span>
                                    </div>
                                </td>
                                <td><span className="team-track">{team.trackName || team.categoryName}</span></td>
                                <td><span className="team-leader">{team.leaderName}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{renderLinks(team)}</div>
                                </td>
                            </tr>
                        ))}
                        {filteredTeams.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>No student teams found matching filters.</td>
                            </tr>
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MentorCategory;
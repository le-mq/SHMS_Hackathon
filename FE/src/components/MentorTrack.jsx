import { useState, useEffect } from 'react';
import './MentorTrack.css';
import NavbarMentor from './NavbarMentor';
import LatestAnnouncements from './LatestAnnouncements';

const MentorTrack = () => {
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
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    setData(result);
                } else {
                    setError(result.error || 'Failed to load mentor data');
                }
            } catch (err) {
                // Ignore error and use mock if API not up
                console.error(err);
                setError('Could not connect to server.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMentorData();
    }, []);

    const mentorData = data || {
        trackOverviews: [
            { trackId: 1, trackName: 'AI & Machine Learning', assignedTeams: 12, activeSessions: 4, completionPercentage: 65 },
            { trackId: 2, trackName: 'Web3 & Blockchain', assignedTeams: 8, activeSessions: 2, completionPercentage: 42 },
            { trackId: 3, trackName: 'Cloud Native Architecture', assignedTeams: 15, activeSessions: 7, completionPercentage: 88 }
        ],
        allocatedTeams: [
            { teamId: 101, teamName: 'Neural Titans', trackName: 'AI & ML', leaderName: 'John Doe', totalMembers: 5, progressStatus: 'Development' },
            { teamId: 102, teamName: 'BlockChamps', trackName: 'Blockchain', leaderName: 'Alice Wong', totalMembers: 3, progressStatus: 'Ideation' },
            { teamId: 103, teamName: 'Cloud Force', trackName: 'Cloud Native', leaderName: 'Mark Smith', totalMembers: 4, progressStatus: 'Testing' },
            { teamId: 104, teamName: 'Sky Vault', trackName: 'Cloud Native', leaderName: 'Sarah Connor', totalMembers: 3, progressStatus: 'Development' }
        ]
    };



    const filteredTeams = mentorData.allocatedTeams.filter(team => {
        const matchesSearch = team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              team.leaderName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterCategory === 'All' || team.trackName === filterCategory;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="mentor-container">
            {/* Top Navbar */}
            <NavbarMentor />

            <div className="mentor-content">
                <div className="mentor-header">
                    <h1 className="mentor-title">Contest: {mentorData.contestName || "N/A"}</h1>
                    <p className="mentor-subtitle">Manage your assigned technical categories and track the real-time progress of student teams.</p>
                </div>

                <div className="track-cards">
                    {mentorData.trackOverviews.map((track, idx) => (
                        <div className="track-card" key={idx}>
                            <svg className="track-icon-bg" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <div className="track-card-header">
                                <div className="track-icon-sm">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
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
                                <div className="progress-bar-fill" style={{width: `${track.completionPercentage}%`}}></div>
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
                                <svg width="16" height="16" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input 
                                    type="text" 
                                    placeholder="Search teams..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select 
                                className="filter-btn" 
                                value={filterCategory} 
                                onChange={(e) => setFilterCategory(e.target.value)}
                                style={{ border: '1px solid #e2e8f0', background: 'white', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', color: '#475569', outline: 'none', cursor: 'pointer' }}
                            >
                                <option value="All">All Categories</option>
                                {mentorData.trackOverviews.map((track, idx) => (
                                    <option key={idx} value={track.trackName}>{track.trackName}</option>
                                ))}
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
                                            <div className="team-avatar">{team.teamName.substring(0,2).toUpperCase()}</div>
                                            <span className="team-name">{team.teamName}</span>
                                        </div>
                                    </td>
                                    <td><span className="team-track">{team.trackName}</span></td>
                                    <td><span className="team-leader">{team.leaderName}</span></td>
                                    <td>
                                        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                            {team.githubRepoUrl && <a href={team.githubRepoUrl} target="_blank" rel="noreferrer" title="GitHub Repo" style={{color: '#3b82f6', textDecoration: 'underline', fontSize: '13px'}}>GitHub Repo</a>}
                                            {team.liveDemoUrl && <a href={team.liveDemoUrl} target="_blank" rel="noreferrer" title="Live Demo" style={{color: '#10b981', textDecoration: 'underline', fontSize: '13px'}}>Live Demo</a>}
                                            {team.docsUrl && <a href={team.docsUrl} target="_blank" rel="noreferrer" title="Documentation" style={{color: '#f59e0b', textDecoration: 'underline', fontSize: '13px'}}>Documentation</a>}
                                            {team.slideUrl && <a href={team.slideUrl} target="_blank" rel="noreferrer" title="Slides" style={{color: '#ef4444', textDecoration: 'underline', fontSize: '13px'}}>Slides</a>}
                                            {(!team.githubRepoUrl && !team.liveDemoUrl && !team.docsUrl && !team.slideUrl) && <span style={{fontSize: '12px', color: '#94a3b8'}}>No links</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="teams-footer">
                        <span>Showing {filteredTeams.length} teams</span>
                        <div className="pagination">
                            <button className="page-btn">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button className="page-btn">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '32px' }}>
                    <LatestAnnouncements />
                </div>
            </div>
        </div>
    );
};

export default MentorTrack;

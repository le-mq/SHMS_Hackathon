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
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const result = await response.json();
                    setData(result);
                } else {
                    throw new Error('API failed');
                }
            } catch (err) {
                console.error("API failed, falling back to mock data:", err);
                try {
                    const fallbackResponse = await fetch('/testFE.json');
                    const mockData = await fallbackResponse.json();
                    setData(mockData.mentorCategory.data);
                } catch (mockErr) {
                    setError('Could not connect to server and no mock data found.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchMentorData();
    }, []);

    if (isLoading) return <div className="mentor-container">Loading...</div>;
    if (error && !data) return <div className="mentor-container">Error: {error}</div>;

    const mentorData = data || { trackOverviews: [], allocatedTeams: [] };

    const filteredTeams = mentorData.allocatedTeams ? mentorData.allocatedTeams.filter(team => {
        const matchesSearch = team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            team.leaderName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterCategory === 'All' || team.trackName === filterCategory;
        return matchesSearch && matchesFilter;
    }) : [];

    return (
        <div className="mentor-container">
            <NavbarMentor />
            <div className="mentor-content">
                <div className="mentor-header">
                    <h1 className="mentor-title">Contest: {mentorData.contestName || "N/A"}</h1>
                    <p className="mentor-subtitle">Manage your assigned technical categories and track the real-time progress of student teams.</p>
                </div>
                <div style={{ marginTop: '32px' }}><LatestAnnouncements /></div>
                <div className="track-cards">
                    {mentorData.trackOverviews.map((track, idx) => (
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
                                <div className="progress-bar-fill" style={{width: `${track.completionPercentage}%`}}></div>
                            </div>
                            <div className="progress-label">{track.completionPercentage}% teams submitted</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MentorCategory;

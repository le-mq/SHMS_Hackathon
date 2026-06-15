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

                <div style={{ marginTop: '32px' }}>
                    <LatestAnnouncements />
                </div>
            </div>
        </div>
    );
};

export default MentorCategory;

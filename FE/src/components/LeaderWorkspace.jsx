import { useState, useEffect } from 'react';
import './LeaderWorkspace.css';
import NavbarStudent from './NavbarStudent';

const LeaderWorkspace = () => {
    const [workspaceData, setWorkspaceData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState('--:--:--');
    const [formattedDeadline, setFormattedDeadline] = useState('');

    useEffect(() => {
        const fetchWorkspaceData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch('http://localhost:8080/api/v1/student/workspace', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    setWorkspaceData(data);
                } else {
                    setError(data.error || 'Failed to load workspace data');
                }
            } catch (err) {
                // Ignore error and use mock data for demo if backend is not up
                console.error(err);
                setError('Could not connect to server.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchWorkspaceData();
    }, []);

    // Mock data for preview if backend fails
    const data = workspaceData || {
        teamStatus: 'FORMING',
        currentMembers: 1,
        maxMembers: 5,
        isSubmitted: false,
        currentRank: null,
        announcements: [],
        submissionDeadline: null
    };

    useEffect(() => {
        if (data.submissionDeadline) {
            const deadline = new Date(data.submissionDeadline);
            // Example format: Nov 15, 2024 • 11:59 PM GMT+7
            const options = { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' };
            setFormattedDeadline(deadline.toLocaleDateString('en-US', options).replace(',', ' •'));

            const interval = setInterval(() => {
                const now = new Date();
                const diff = deadline - now;
                if (diff <= 0) {
                    setTimeLeft('00:00:00');
                    clearInterval(interval);
                    return;
                }
                const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
                const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
                setTimeLeft(`${h}:${m}:${s}`);
            }, 1000);
            return () => clearInterval(interval);
        } else {
            setFormattedDeadline('No Deadline Set');
            setTimeLeft('--:--:--');
        }
    }, [data.submissionDeadline]);

    const getCategoryClass = (cat) => {
        if (cat === 'Schedule') return 'cat-schedule';
        if (cat === 'Workshop') return 'cat-workshop';
        if (cat === 'Submission') return 'cat-submission';
        return 'cat-schedule';
    };

    return (
        <div className="workspace-container">
            {/* Top Navbar */}
            <NavbarStudent />

            <div className="workspace-content">
                <div className="workspace-header">
                    <h1 className="workspace-title">Team Workspace</h1>
                    <p className="workspace-subtitle">Manage your team's progress, monitor deadlines, and stay updated with the latest event announcements.</p>
                </div>

                <div className="status-grid">
                    <div className="status-card">
                        <div className="status-icon success">
                            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="status-info">
                            <div className="status-label">SUBMISSION ELIGIBILITY</div>
                            <div className="status-value">Team Status: {data.teamStatus}</div>
                            <div className="status-desc">Your team has passed the verification check. The submission portal is active.</div>
                        </div>
                    </div>

                    <div className="status-card dark">
                        <div className="status-info">
                            <div className="status-label">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                SUBMISSION DEADLINE
                            </div>
                            <div className="status-value">{timeLeft}</div>
                        </div>
                        <div className="deadline-box">
                            Gateway Closes:
                            <span>{formattedDeadline}</span>
                        </div>
                    </div>
                </div>



            </div>
        </div>
    );
};

export default LeaderWorkspace;

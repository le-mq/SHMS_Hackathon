import {useState, useEffect} from 'react';
import './LeaderWorkspace.css';
import NavbarStudent from './NavbarStudent';

const API_STUDENT = 'http://localhost:8080/api/v1/student';

const LeaderWorkspace = () => {
    const [workspaceData, setWorkspaceData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeLeft, setTimeLeft] = useState('--:--:--');
    const [formattedDeadline, setFormattedDeadline] = useState('');
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
                    setWorkspaceData(data);
                    setError('');
                }
            } catch (err) {
                console.warn('Workspace API unavailable response:', err.message);
                try {
                    const localRes = await fetch('/testFE.json');
                    if (!localRes.ok) {
                        throw new Error('Not found testFE.json');
                    }
                    const localJson = await localRes.json();
                    const mockData = localJson.leaderWorkspace?.data;
                    if (!mockData) {
                        throw new Error('leaderWorkspace mock data not found');
                    }
                    if (!cancelled) {
                        setWorkspaceData(mockData);
                        setError('');
                    }
                } catch (mockError) {
                    console.warn('Mock workspace unavailable:', mockError.message);
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

        fetchWorkspaceData();
        return () => {
            cancelled = true;
        };
    }, []);
    const data = workspaceData || {
        teamStatus: 'FORMING',
        currentMembers: 1,
        maxMembers: 5,
        isSubmitted: false,
        currentRank: null,
        announcements: [],
        submissionDeadline: null,
    };
    useEffect(() => {
        if (data.submissionDeadline) {
            const deadline = new Date(data.submissionDeadline);
            // Example format: Nov 15, 2024 • 11:59 PM GMT+7
            const options = { month: 'short', day: '2-digit',
                year: 'numeric', hour: '2-digit',
                minute: '2-digit', timeZoneName: 'short'
            };
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
            <NavbarStudent/>
            <div className="workspace-content">
                <div className="workspace-header">
                    <h1 className="workspace-title">Team Workspace</h1>
                </div>
                <div className="status-grid">
                    <div className="status-card">
                        <div className="status-icon success">
                            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                            </svg>
                        </div>
                        <div className="status-info">
                            <div className="status-label">SUBMISSION ELIGIBILITY</div>
                            <div className="status-value">Team Status: {data.teamStatus}</div>
                        </div>
                    </div>
                    <div className="status-card dark">
                        <div className="status-info">
                            <div className="status-label">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
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

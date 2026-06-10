import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './JoinTeam.css';
import NavbarStudent from './NavbarStudent';

const JoinTeam = () => {
    const [invitationCode, setInvitationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleJoin = async () => {
        if (!invitationCode) {
            setError('Please enter an invitation code.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch('http://localhost:8080/api/v1/student/teams/join', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ invitationCode: invitationCode.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to join team.');
            } else {
                setSuccess('Successfully joined the team!');
                setInvitationCode('');
                // setTimeout(() => navigate('/student/team/dashboard'), 1500); // Redirect mockup
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="join-container">
            {/* Top Navbar from Student Dashboard */}
            <NavbarStudent />

            <div className="join-content">
                <div className="join-header">
                    <h1 className="join-title">Join Team via Code</h1>
                    <p className="join-subtitle">Ready to collaborate? Enter your team's invitation code to get started.</p>
                </div>

                <div className="join-card">
                    {error && <div className="alert-msg alert-error">{error}</div>}
                    {success && <div className="alert-msg alert-success">{success}</div>}

                    <label className="join-label">Enter Unique 6-Character Team Code</label>
                    <input 
                        type="text" 
                        className="join-input" 
                        placeholder="E.g. XJ92LK" 
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                        maxLength={8}
                    />
                    
                    <div className="join-info">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Check your email or ask your team leader for the code.
                    </div>

                    <button className="join-btn" onClick={handleJoin} disabled={isLoading || !invitationCode}>
                        {isLoading ? 'Validating...' : 'Validate & Join Team'}
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>

                    <div className="join-divider"></div>

                    <div className="join-create-link">
                        Don't have a team yet? <a onClick={() => navigate('/student/team/init')}>Create a New Team</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinTeam;

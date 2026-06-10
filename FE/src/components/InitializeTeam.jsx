import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './InitializeTeam.css';
import NavbarStudent from './NavbarStudent';

const InitializeTeam = () => {
    const [teamDetails, setTeamDetails] = useState({
        teamName: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [invitationCode, setInvitationCode] = useState('');
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    // Removed extra states

    const handleSubmit = async () => {
        if (!teamDetails.teamName) {
            setError('Please enter a team name');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('shms_token');
            const payload = {
                teamName: teamDetails.teamName,
                categoryId: 1 // Default category to satisfy backend requirement for now
            };

            const response = await fetch('http://localhost:8080/api/v1/student/teams/create', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to initialize team');
            } else {
                setInvitationCode(data.invitationCode);
                setShowModal(true);
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="student-container">
            {/* Top Navbar */}
            <NavbarStudent />

            <div className="form-wrapper">
                <div className="page-header">
                    <h1 className="page-title">Initialize New Team</h1>
                    <p className="page-subtitle">Set up your collective identity and define your team roster for the competition.</p>
                </div>

                <div className="info-banner">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    A unique invitation code will be generated for your new team.
                </div>

                {error && <div style={{color: '#ef4444', marginBottom: '20px', fontWeight: 'bold'}}>{error}</div>}

                {/* Section 1: Team Details */}
                <div className="form-section">
                    <div className="section-header">
                        <h2 className="section-title">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            Team Details
                        </h2>
                    </div>
                    <div className="input-row">
                        <div className="form-group" style={{width: '100%'}}>
                            <label className="form-label">Team Name</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                placeholder="Enter your creative team name" 
                                value={teamDetails.teamName}
                                onChange={(e) => setTeamDetails({...teamDetails, teamName: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="registration-footer">
                    <div className="footer-info">
                        <div>Ready to invite members?</div>
                        <div style={{marginTop: '4px'}}>After creating, you will get a code to share with your team.</div>
                    </div>
                    <button className="submit-btn" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? 'Creating...' : 'Create Team'}
                    </button>
                </div>

                <div className="illustration-area">
                    {/* Placeholder for the complex illustration requested in UI */}
                    <div style={{fontSize: '48px', opacity: 0.1}}>🖥️ 🧑‍💻 🌐</div>
                </div>
            </div>

            {/* Success Modal showing Unique Invitation Code */}
            {showModal && (
                <div className="success-overlay">
                    <div className="success-modal">
                        <div className="modal-icon">
                            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="modal-title">Team Initialized!</h3>
                        <p className="modal-desc">Your team has been successfully created. Share this invitation code with your members so they can join.</p>
                        <div className="invite-code-box">
                            {invitationCode}
                        </div>
                        <button className="modal-btn" onClick={() => navigate('/student/team/status')}>
                            Copy Code & Go to My Team
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InitializeTeam;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentDashboard.css';
import NavbarStudent from './NavbarStudent';
import LatestAnnouncements from './LatestAnnouncements';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const [activeContest, setActiveContest] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [createError, setCreateError] = useState('');
    const [invitationCode, setInvitationCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                const res = await axios.get('http://localhost:8080/api/v1/public/home');
                const contests = res.data.contests || [];
                const active = contests.find(c => c.status === 'ACTIVE') || contests.find(c => c.status === 'UPCOMING') || contests[0];
                setActiveContest(active);
            } catch (error) {
                console.error("Failed to fetch home data", error);
            }
        };
        fetchHomeData();
    }, []);

    const handleJoinTeam = async () => {
        if (!joinCode) return;
        try {
            const token = localStorage.getItem('shms_token');
            await axios.post('http://localhost:8080/api/v1/student/teams/join', { invitationCode: joinCode }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Successfully joined the team!');
            navigate('/student/team/status');
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to join team');
        }
    };

    const handleCreateTeam = async () => {
        if (!newTeamName) {
            setCreateError('Please enter a team name');
            return;
        }
        setIsCreating(true);
        setCreateError('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await axios.post('http://localhost:8080/api/v1/student/teams/create', 
                { teamName: newTeamName, categoryId: 1 },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setInvitationCode(res.data.invitationCode);
        } catch (error) {
            setCreateError(error.response?.data?.error || 'Failed to create team');
        } finally {
            setIsCreating(false);
        }
    };    return (
        <div className="student-dash-container">
            <NavbarStudent />

            <div className="dash-hero">
                <div className="verified-badge">
                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    VERIFIED PARTICIPANT
                </div>
                <h1>Student Dashboard</h1>
                <p>Welcome back, Alex Rivera. You have 2 pending tasks and 1 upcoming deadline for the SEAL Hackathon 2026.</p>
            </div>

            <div className="dash-grid">
                <div className="dash-left">
                    <div className="dash-cards-row">
                        <div className="info-card">
                            <div className="ic-header">
                                ACTIVE CONTEST
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div className="ic-title">{activeContest ? activeContest.name : 'Loading...'}</div>
                            <div className="ic-subtitle">
                                <span style={{width: 6, height: 6, background: '#dc2626', borderRadius: '50%'}}></span>
                                {activeContest ? activeContest.status : 'Loading...'}
                            </div>
                            <div className="progress-bar-bg">
                                <div className="progress-bar-fill"></div>
                            </div>
                        </div>
                    </div>

                    <div className="milestones-card">
                        <div className="mc-header">Milestones</div>
                        <table className="mc-table">
                            <thead>
                                <tr>
                                    <th>Milestone</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Registration Open</strong></td>
                                    <td>{activeContest?.registrationStart || 'N/A'}</td>
                                    <td>
                                        {activeContest?.registrationStart && new Date() > new Date(activeContest.registrationStart) 
                                            ? <span className="mc-status ms-completed">Completed</span> 
                                            : <span className="mc-status ms-upcoming">Upcoming</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Registration Deadline</strong></td>
                                    <td>{activeContest?.registrationEnd || 'N/A'}</td>
                                    <td>
                                        {activeContest?.registrationEnd && new Date() > new Date(activeContest.registrationEnd) 
                                            ? <span className="mc-status ms-completed">Completed</span> 
                                            : <span className="mc-status ms-upcoming">Upcoming</span>}
                                    </td>
                                </tr>
                                {activeContest?.rounds?.map((round, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr>
                                            <td><strong>{round.phaseName} - Open</strong></td>
                                            <td>{round.submissionOpen ? round.submissionOpen.replace('T', ' ').substring(0, 10) : 'N/A'}</td>
                                            <td>
                                                {round.submissionOpen && new Date() > new Date(round.submissionOpen) 
                                                    ? <span className="mc-status ms-completed">Completed</span> 
                                                    : <span className="mc-status ms-upcoming">Upcoming</span>}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>{round.phaseName} - Deadline</strong></td>
                                            <td>{round.submissionDeadline ? round.submissionDeadline.replace('T', ' ').substring(0, 10) : 'N/A'}</td>
                                            <td>
                                                {round.submissionDeadline && new Date() > new Date(round.submissionDeadline) 
                                                    ? <span className="mc-status ms-completed">Completed</span> 
                                                    : <span className="mc-status ms-upcoming">Upcoming</span>}
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="dash-right">
                    <div className="action-card">
                        <svg className="action-icon-bg" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                        <div style={{marginBottom: 24}}>
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                        </div>
                        <h3>Create a New Team</h3>
                        <p>Be a leader. Initialize your squad, set goals, and invite your peers to innovate together.</p>
                        <a href="#" className="action-link" onClick={(e) => { e.preventDefault(); setShowCreateModal(true); setInvitationCode(''); setNewTeamName(''); setCreateError(''); }}>
                            Start Building
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </a>
                    </div>

                    <div className="join-card">
                        <div style={{marginBottom: 24}}>
                            <svg width="24" height="24" fill="none" stroke="#0f172a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </div>
                        <h3>Join via Code</h3>
                        <p>Received an invite? Enter your team's unique identification code to join an existing project.</p>
                        <div className="join-input-wrap">
                            <input 
                                type="text" 
                                placeholder="Enter Invite Code ->" 
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleJoinTeam()}
                            />
                            <button onClick={handleJoinTeam} style={{marginLeft: '10px', padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>Join</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div style={{ padding: '40px 20px', maxWidth: 1200, margin: '0 auto' }}>
                <LatestAnnouncements />
            </div>

            {/* Create Team Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                        {!invitationCode ? (
                            <>
                                <h2 style={{ marginTop: 0, marginBottom: '8px', color: '#0f172a' }}>Initialize New Team</h2>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>Set up your collective identity for the competition.</p>
                                
                                {createError && <div style={{ color: '#ef4444', marginBottom: '16px', fontSize: '0.875rem', fontWeight: 'bold' }}>{createError}</div>}
                                
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>Team Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter your creative team name" 
                                        value={newTeamName}
                                        onChange={(e) => setNewTeamName(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                    <button 
                                        onClick={() => setShowCreateModal(false)}
                                        style={{ padding: '10px 16px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleCreateTeam}
                                        disabled={isCreating}
                                        style={{ padding: '10px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        {isCreating ? 'Creating...' : 'Create Team'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ width: '48px', height: '48px', background: '#10b981', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h2 style={{ marginTop: 0, marginBottom: '8px', color: '#0f172a' }}>Team Initialized!</h2>
                                <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '24px' }}>Share this invitation code with your members so they can join.</p>
                                
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '4px', color: '#0f172a', marginBottom: '24px' }}>
                                    {invitationCode}
                                </div>

                                <button 
                                    onClick={() => navigate('/student/team/status')}
                                    style={{ width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Copy Code & Go to My Team
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;

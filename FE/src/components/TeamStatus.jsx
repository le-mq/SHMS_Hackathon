import { useState, useEffect } from 'react';
import './TeamStatus.css';
import NavbarStudent from './NavbarStudent';

const TeamStatus = () => {
    const [teamData, setTeamData] = useState(null);
    const [contests, setContests] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLeaving, setIsLeaving] = useState(false);
    // Form state
    const [formTeamName, setFormTeamName] = useState('');
    const [selectedContestId, setSelectedContestId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedLeader, setSelectedLeader] = useState('');

    useEffect(() => {
        const fetchTeamData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const [teamRes, contestsRes, categoriesRes] = await Promise.all([
                    fetch('http://localhost:8080/api/v1/student/teams/status', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:8080/api/v1/student/contests', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }),
                    fetch('http://localhost:8080/api/v1/student/categories', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                ]);

                if (teamRes.ok) {
                    const data = await teamRes.json();
                    setTeamData(data);
                    setFormTeamName(data.teamName || '');
                    if (data.roster && data.roster.length > 0) {
                        const currentLeader = data.roster.find(m => m.internalRole === 'LEADER');
                        setSelectedLeader(currentLeader ? currentLeader.studentId : data.roster[0].studentId);
                    }
                } else {
                    const data = await teamRes.json();
                    setError(data.error || 'Failed to load team data');
                }

                if (contestsRes.ok) setContests(await contestsRes.json());
                if (categoriesRes.ok) setCategories(await categoriesRes.json());
            } catch (err) {
                console.error(err);
                setError('Could not connect to server.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTeamData();
    }, []);

    const data = teamData || {
        teamName: 'Not available',
        categoryName: 'Not available',
        invitationCode: 'N/A',
        status: 'NO TEAM',
        roster: []
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(data.invitationCode);
        alert('Invitation code copied!');
    };

    const isSubmitted = data.status === 'APPROVED' || data.status === 'PENDING';
    const displayCategory = isSubmitted ? data.categoryName : 'Not choose';

    const handleSubmitRegistration = async () => {
        if (!selectedContestId || !selectedCategoryId || !formTeamName) {
            setError('Please fill in all general information fields.');
            return;
        }

        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch('http://localhost:8080/api/v1/student/teams/register-official', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    teamName: formTeamName,
                    contestId: selectedContestId,
                    categoryId: selectedCategoryId,
                    leaderStudentId: selectedLeader
                })
            });

            const result = await response.json();
            if (response.ok) {
                setSuccessMessage('Registration submitted successfully!');
                setError('');
                // Refresh data
                window.location.reload();
            } else {
                setError(result.error || result.message || 'Registration failed.');
                setSuccessMessage('');
            }
        } catch (err) {
            setError('Failed to submit registration.');
        }
    };

    const handleRemoveMember = async (studentId) => {
        if (!window.confirm(`Are you sure you want to remove student ${studentId} from the team?`)) return;

        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch(`http://localhost:8080/api/v1/student/teams/members/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            if (response.ok) {
                alert('Member removed successfully!');
                window.location.reload();
            } else {
                setError(result.error || result.message || 'Failed to remove member.');
            }
        } catch (err) {
            setError('Could not connect to server to remove member.');
        }
    };

    const handleLeaveTeam = async () => {
    if (data.status === 'NO TEAM') return;

    if (isSubmitted) {
        setError('Cannot leave team while registration is pending or approved.');
        return;
    }

    const confirmed = window.confirm('Are you sure you want to leave this team?');
    if (!confirmed) return;

    try {
        setIsLeaving(true);
        setError('');
        setSuccessMessage('');

        const token = localStorage.getItem('shms_token');

        const response = await fetch('http://localhost:8080/api/v1/student/teams/leave', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            setTeamData({
                teamName: 'Not available',
                categoryName: 'Not available',
                invitationCode: 'N/A',
                status: 'NO TEAM',
                roster: []
            });

            setFormTeamName('');
            setSelectedContestId('');
            setSelectedCategoryId('');
            setSelectedLeader('');

            setSuccessMessage(result.message || 'You have left the team successfully.');
        } else {
            setError(result.error || result.message || 'Failed to leave team.');
        }
    } catch (err) {
        setError('Could not connect to server to leave team.');
    } finally {
        setIsLeaving(false);
    }
};
    return (
        <div className="status-container">
            {/* Top Navbar */}
            <NavbarStudent />

            <div className="status-content">
                <div className="status-header-flex">
                    <div>
                        <h1 className="status-title">My Team Status</h1>
                        
                    </div>
                    <div className="header-actions">
                        {data.status !== 'NO TEAM' && !isSubmitted && (
                            <button
                                className="leave-team-btn"
                                 onClick={handleLeaveTeam}
                                disabled={isLeaving}
                    >
                        {isLeaving ? 'Leaving...' : 'Leave Team'}
                    </button>
            )}

            <div className={`team-badge ${data.status.toLowerCase().replace(' ', '-')}`}>
                <div className="team-badge-dot"></div>
                {data.status === 'PENDING' ? 'Pending Approval' : data.status === 'NO TEAM' ? 'No Team' : data.status}
                </div>
        </div>
                </div>

                {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}

                <div className="cards-row">
                    <div className="info-card">
                        <div className="card-label">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            TEAM NAME
                        </div>
                        <div className="card-value">{data.teamName}</div>
                    </div>
                    <div className="info-card">
                        <div className="card-label">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            SELECTED TRACK
                        </div>
                        <div className="card-value">{displayCategory}</div>
                    </div>
                    <div className="info-card dark">
                        <svg className="dark-bg-icon" width="120" height="120" fill="currentColor" viewBox="0 0 24 24"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        <div className="card-label">INVITATION CODE</div>
                        <div className="card-value">
                            {data.invitationCode}
                            <button className="copy-btn" onClick={copyToClipboard} title="Copy Code">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="roster-section">
                    <div className="roster-header">
                        <h2 className="roster-title">Member Roster</h2>
                    </div>
                    <table className="roster-table">
                        <thead>
                            <tr>
                                <th>FULL NAME</th>
                                <th>STUDENT ID</th>
                                <th>EMAIL</th>
                                <th>INTERNAL ROLE</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.roster.length > 0 ? data.roster.map((member, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <div className="member-name-col">
                                            <div className="member-avatar">{getInitials(member.fullName)}</div>
                                            <span className="member-name">{member.fullName}</span>
                                        </div>
                                    </td>
                                    <td><span className="member-id">{member.studentId}</span></td>
                                    <td><span className="member-email">{member.email}</span></td>
                                    <td>
                                        <span className={`role-badge ${member.internalRole === 'LEADER' ? 'role-leader' : 'role-member'}`}>
                                            {member.internalRole}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-dots">
                                            {!isSubmitted && member.internalRole !== 'LEADER' && (
                                                <button 
                                                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                                    onClick={() => handleRemoveMember(member.studentId)}
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No team members available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="registration-form-section" style={{ background: '#fff', borderRadius: '12px', padding: '24px', marginTop: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div className="section-header" style={{ marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>Official Team Registration Form</h2>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>Review and finalize your team details to officially register for the competition.</p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>1. General Information</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>Contest Name</label>
                                <select 
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                    value={selectedContestId}
                                    onChange={(e) => setSelectedContestId(e.target.value)}
                                    disabled={isSubmitted}
                                >
                                    <option value="" disabled>-- Select Contest --</option>
                                    {contests.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>Category Track</label>
                                <select 
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
                                    value={selectedCategoryId}
                                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                                    disabled={isSubmitted}
                                >
                                    <option value="" disabled>-- Select Track --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>Team Name</label>
                                <input 
                                    type="text" 
                                    value={formTeamName} 
                                    onChange={(e) => setFormTeamName(e.target.value)}
                                    readOnly={isSubmitted} 
                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: isSubmitted ? '#f8fafc' : '#fff' }} 
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>2. Team Members & Leader Selection</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                            <thead style={{ background: '#f8fafc' }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569', width: '80px' }}>Leader</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>Full Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>Student ID</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.roster.length > 0 ? data.roster.map((m, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: selectedLeader === m.studentId ? '#eff6ff' : '#fff' }}>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <input
                                                type="radio"
                                                name="leaderSelect"
                                                checked={selectedLeader === m.studentId}
                                                onChange={() => setSelectedLeader(m.studentId)}
                                                disabled={isSubmitted}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                                            />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <input type="text" value={m.fullName} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }} />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <input type="text" value={m.studentId} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }} />
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <input type="text" value={m.email} readOnly style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }} />
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" style={{textAlign: 'center', padding: '20px', color: '#64748b'}}>No team members available</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {error && <div style={{ color: 'red', marginTop: '16px', fontWeight: 'bold' }}>{error}</div>}
                    {successMessage && <div style={{ color: 'green', marginTop: '16px', fontWeight: 'bold' }}>{successMessage}</div>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                        <button
                            style={{ padding: '10px 24px', background: isSubmitted ? '#94a3b8' : '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: isSubmitted ? 'not-allowed' : 'pointer' }}
                            onClick={handleSubmitRegistration}
                            disabled={isSubmitted}
                        >
                            {isSubmitted ? 'Already Submitted' : 'Submit Official Registration'}
                        </button>
                    </div>
                </div>

                <div className="footer-warning" style={{ marginTop: '24px' }}>
                    <svg className="warning-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Category tracks cannot be modified after the team registration sheet has been officially approved. Please ensure all team details are correct before submission.
                </div>
            </div>
        </div>
    );
};

export default TeamStatus;

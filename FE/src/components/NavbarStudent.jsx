import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUnreadAnnouncements } from './useUnreadAnnouncements';
import './Navbars.css';
import LatestAnnouncements from './LatestAnnouncements';

const STUDENT_LINKS = [
    { label: 'Dashboard', path: '/student/dashboard' },
    { label: 'Competitions', path: '/student/competitions' },
    { label: 'My Team', path: '/student/team/status' },
    { label: 'Submission', path: '/student/submission' },
    { label: 'Results', path: '/student/results' },
    { label: 'Leaderboard', path: '/leaderboard' },
];

const NavbarStudent = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const username = localStorage.getItem('shms_fullname') || localStorage.getItem('shms_user') || 'Student';

    const handleLogout = () => {
        localStorage.removeItem('shms_token');
        localStorage.removeItem('shms_role');
        localStorage.removeItem('shms_user');
        localStorage.removeItem('shms_allRoles');
        navigate('/');
    };

    const [showDropdown, setShowDropdown] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const notifs = useUnreadAnnouncements();

    const handleNav = (path) => {
        navigate(path);
    };
    return (
        <>
            <nav className="student-nav">
                <div className="student-nav-brand" onClick={() => handleNav('/student/dashboard')} style={{ cursor: 'pointer' }}>
                    <img src="/shms_logo.svg" alt="S-HMS Logo" style={{ height: '50px', width: 'auto', display: 'block' }} /> <span>SEAL Hackathon</span>
                </div>
                <div className="student-nav-links">
                    {STUDENT_LINKS.map(link => (
                        <div
                            key={link.path}
                            className={`student-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                            onClick={() => handleNav(link.path)}
                            style={{ cursor: 'pointer' }}
                        >
                            {link.label}
                        </div>
                    ))}
                </div>
                <div className="student-nav-user">
                    <div className="nav-notification" onClick={() => setShowAnnouncements(true)}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        {notifs > 0 && <span className="nav-notif-badge">{notifs}</span>}
                    </div>

                    <div className="nav-user-profile" onClick={() => setShowDropdown(!showDropdown)}>
                        <div className="nav-avatar">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <span>{username}</span>

                        {showDropdown && (
                            <div className="nav-dropdown">
                                <div className="nav-dropdown-item" onClick={() => navigate('/student/profile')}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    Edit Profile
                                </div>
                                <div className="nav-dropdown-item logout" onClick={handleLogout}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    Logout
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {showAnnouncements && <LatestAnnouncements isModal={true} onClose={() => setShowAnnouncements(false)} />}
            </nav>

        </>
    );
};

export default NavbarStudent;
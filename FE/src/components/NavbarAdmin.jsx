import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUnreadAnnouncements } from './useUnreadAnnouncements';
import './Navbars.css';
import LatestAnnouncements from './LatestAnnouncements';

const ADMIN_LINKS = [
    { label: 'Contest Config', path: '/admin/config' },
    { label: 'Partner Config', path: '/admin/partners' },
    { label: 'Expert Provision', path: '/admin/experts/provision' },
    { label: 'Panel Allocation', path: '/admin/experts/allocation' },
    { label: 'Rubrics', path: '/admin/rubrics' },
    { label: 'Team Approval', path: '/admin/team-approval' },
    { label: 'Rankings', path: '/admin/rankings' },
    { label: 'Broadcast & Export', path: '/admin/publication' },
    { label: 'Audit Logs', path: '/admin/audit-logs' },
];

const NavbarAdmin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userEmail = localStorage.getItem('shms_user') || 'admin@s-hms.vn';
    const username = localStorage.getItem('shms_fullname_' + userEmail) || localStorage.getItem('shms_fullname') || 'Coordinator';
    const role = localStorage.getItem('shms_role') || 'ADMIN';

    const [showDropdown, setShowDropdown] = useState(false);
    const [showAnnouncements, setShowAnnouncements] = useState(false);
    const notifs = useUnreadAnnouncements();

    const handleLogout = () => {
        localStorage.removeItem('shms_token');
        localStorage.removeItem('shms_role');
        localStorage.removeItem('shms_user');
        localStorage.removeItem('shms_allRoles');
        navigate('/');
    };

    return (
        <nav className="admin-nav">
            <div className="admin-nav-brand" onClick={() => navigate('/admin/config')} style={{ cursor: 'pointer' }}>
                S-HMS | <span>SEAL Hackathon</span>
            </div>
            <div className="admin-nav-links">
                {ADMIN_LINKS.map(link => (
                    <div
                        key={link.path}
                        className={`admin-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                        onClick={() => navigate(link.path)}
                        style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        {link.label}
                    </div>
                ))}
            </div>
            <div className="admin-nav-user">
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
                            <div className="nav-dropdown-item" onClick={() => navigate('/admin/profile')}>
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
    );
};

export default NavbarAdmin;

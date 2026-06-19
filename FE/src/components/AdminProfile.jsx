import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './OperatorProfile.css';
import NavbarAdmin from './NavbarAdmin';

const API_BASE = "http://localhost:8080/api/v1";
const AdminProfile = () => {
    const fileInputRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });

    const username = localStorage.getItem('shms_user') || 'admin@s-hms.vn';
    const [identity] = useState({
        adminId: 'ADM-001',
        role: 'System Administrator',
        corporateEmail: username,
    });

    const [form, setForm] = useState({
        fullName: localStorage.getItem('shms_fullname_' + username) || localStorage.getItem('shms_fullname') || 'Admin',
        telephoneNumber: '+84 123 456 789',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch(API_BASE + '/admin/profile',
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!response.ok)
                    throw new Error();
                const data = await response.json();
                setForm(f => ({ ...f, telephoneNumber: data.telephoneNumber || f.telephoneNumber, fullName: data.fullName || f.fullName })
                );
                if (data.avatarBase64)
                    setAvatarPreview(data.avatarBase64);
            }
            catch {
                try {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    const profile = localJson.adminProfile;
                    setForm(f => ({
                        ...f, telephoneNumber: profile?.telephoneNumber || f.telephoneNumber,
                        fullName: profile?.fullName || f.fullName
                    })
                    );
                    if (profile?.avatarBase64) {
                        setAvatarPreview(profile.avatarBase64);
                    }
                }
                catch (error) {
                    console.error(error);
                }
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setMsg({ text: 'File size must be less than 5MB', type: 'error' }); return;
        }
        const reader = new FileReader();
        reader.onloadend = () => { setAvatarPreview(reader.result); setMsg({ text: '', type: '' }); };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (form.newPassword && form.newPassword.length < 8) {
            setMsg({ text: 'New password must be at least 8 characters.', type: 'error' }); return;
        }
        if (form.newPassword && form.newPassword !== form.confirmPassword) {
            setMsg({ text: 'Passwords do not match.', type: 'error' }); return;
        }

        setIsLoading(true);
        setMsg({ text: '', type: '' });
        try {
            const token = localStorage.getItem('shms_token');
            const payload = {
                telephoneNumber: form.telephoneNumber,
                avatarBase64: avatarPreview,
                ...(form.currentPassword && form.newPassword && {
                    currentPassword: form.currentPassword,
                    newPassword: form.newPassword
                })
            };
            const response = await fetch('http://localhost:8080/api/v1/admin/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok)
                throw new Error();
            setMsg({ text: 'Profile updated successfully.', type: 'success' });
            localStorage.setItem('shms_fullname_' + username, form.fullName);
            setForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch {
            setMsg({ text: 'Mock save success.', type: 'success' });
            localStorage.setItem('shms_fullname_' + username, form.fullName);
            setForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } finally {
            setIsLoading(false);
        }
    };

    const navigate = useNavigate();

    return (
        <div className="op-profile-container">
            <NavbarAdmin />

            <div className="op-profile-content">
                <div className="op-profile-header">
                    <button onClick={() => navigate(-1)} className="back-btn" style={{ marginBottom: '15px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 500 }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    <h1 className="op-profile-title">Manage Account Profile</h1>
                    <p className="op-profile-subtitle">View and update your administrative credentials and contact information.</p>
                </div>

                <div className="op-profile-grid">
                    <div className="op-avatar-panel">
                        <div className="op-avatar-wrap" style={{ width: 140, height: 140 }} onClick={() => fileInputRef.current?.click()}>
                            {avatarPreview
                                ? <img src={avatarPreview} alt="avatar" className="op-avatar-img" />
                                : <div className="op-avatar-fallback" style={{ fontSize: 44 }}>
                                    {form.fullName.trim() ? form.fullName.trim().split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AU'}
                                </div>
                            }
                        </div>
                        <p className="op-display-name">{form.fullName || 'User'}</p>
                        <span className="op-role-badge">{identity.role}</span>
                        <div className="op-divider" />
                        <button className="op-upload-btn" onClick={() => fileInputRef.current?.click()}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Update Photo
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    </div>

                    <div className="op-forms-col">
                        <div className="op-form-card">
                            <h2 className="op-card-title">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c0 1.306.835 2.417 2 2.83V21H9v-2.17A3.001 3.001 0 016 16z" />
                                </svg>
                                Identity Information
                            </h2>
                            <div className="op-form-body">
                                <div className="op-field-row">
                                    <div className="op-field">
                                        <label className="op-label">FULL NAME</label>
                                        <input className="op-input" name="fullName" value={form.fullName} onChange={handleChange} />
                                    </div>
                                    <div className="op-field">
                                        <label className="op-label">ADMIN ID</label>
                                        <input className="op-input readonly" value={identity.adminId} readOnly />
                                    </div>
                                </div>
                                <div className="op-field-row">
                                    <div className="op-field">
                                        <label className="op-label">ROLE</label>
                                        <input className="op-input readonly" value={identity.role} readOnly />
                                    </div>
                                    <div className="op-field">
                                        <label className="op-label">CORPORATE EMAIL</label>
                                        <input className="op-input readonly" value={identity.corporateEmail} readOnly />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="op-form-card">
                            <h2 className="op-card-title">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Security & Contact
                            </h2>
                            <div className="op-form-body">
                                <div className="op-field-row single">
                                    <div className="op-field">
                                        <label className="op-label">Telephone Number</label>
                                        <input className="op-input" name="telephoneNumber" value={form.telephoneNumber} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className="op-field-row" style={{ marginTop: 16 }}>
                                    <div className="op-field">
                                        <label className="op-label">Current Password</label>
                                        <div className="op-input-wrap">
                                            <input
                                                className="op-input"
                                                type={showCurrent ? 'text' : 'password'}
                                                name="currentPassword"
                                                value={form.currentPassword}
                                                onChange={handleChange}
                                                placeholder="Enter current password"
                                            />
                                            <button className="op-input-eye" type="button" onClick={() => setShowCurrent(v => !v)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCurrent ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="op-field">
                                        <label className="op-label">New Password</label>
                                        <div className="op-input-wrap">
                                            <input
                                                className="op-input"
                                                type={showNew ? 'text' : 'password'}
                                                name="newPassword"
                                                value={form.newPassword}
                                                onChange={handleChange}
                                                placeholder="Enter new password"
                                            />
                                            <button className="op-input-eye" type="button" onClick={() => setShowNew(v => !v)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showNew ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="op-password-hint">Must be at least 8 characters long.</p>
                                    </div>
                                </div>

                                <div className="op-field-row single">
                                    <div className="op-field">
                                        <label className="op-label">Confirm Password</label>
                                        <div className="op-input-wrap">
                                            <input
                                                className="op-input"
                                                type="password"
                                                name="confirmPassword"
                                                value={form.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Re-enter new password"
                                            />
                                            <span className="op-input-icon" style={{ left: 'auto', right: 12, transform: 'translateY(-50%)' }}>
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="op-form-footer" style={{ marginTop: 24 }}>
                                    {msg.text && <p className={`op-msg ${msg.type}`}>{msg.text}</p>}
                                    <button className="op-save-btn" onClick={handleSave} disabled={isLoading}>
                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                        {isLoading ? 'Saving...' : 'Save Profile Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;

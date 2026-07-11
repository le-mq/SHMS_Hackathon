import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './OperatorProfile.css';

const ExpertProfile = () => {
    const fileInputRef = useRef(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [msg, setMsg] = useState({ text: '', type: '' });
    const currentRole = localStorage.getItem('shms_role');
    const username = localStorage.getItem('shms_user') || 'alex.nguyen@university.edu';
    const [identity] = useState({
        corporateEmail: username,
        roleLabel: localStorage.getItem('shms_role') === 'JUDGE' ? 'Judge' : 'Mentor'
    });

    const apiEndpoint = currentRole === 'JUDGE'
        ? (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/judge/profile"
        : (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/mentor/profile";

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        telephoneNumber: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                if (!token) throw new Error("No token found");

                // ĐỔI ĐƯỜNG DẪN TỪ expert THÀNH judge TẠI ĐÂY
                const response = await fetch(apiEndpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                // Áp dụng đúng các trường dữ liệu trả về từ database
                setForm(f => ({
                    ...f,
                    fullName: data.full_name || data.fullName || '', // Đề phòng backend trả về snake_case theo DB
                    email: data.corporateEmail || '',
                    telephoneNumber: data.phone || data.telephoneNumber || '' // DB lưu là 'phone'
                }));

            } catch (error) {
                console.error("Lỗi kết nối API thật, dùng dữ liệu Mock:", error);
                // Giữ nguyên phần đọc file local testFE.json của bạn ở đây...
                const localRes = await fetch('/testFE.json');
                if (localRes.ok) {
                    const localJson = await localRes.json();
                    const data = localJson.expertProfile;
                    if (data) {
                        setForm(f => ({
                            ...f,
                            fullName: data.fullName,
                            email: data.email,
                            telephoneNumber: data.telephoneNumber
                        }));
                    }
                }
            }
        };
        fetchProfile();
    }, [apiEndpoint]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setMsg({ text: 'File size must be less than 5MB', type: 'error' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => { setAvatarPreview(reader.result); setMsg({ text: '', type: '' }); };
        reader.readAsDataURL(file);
    };

    const isFormInvalid = () => {
        const { fullName, telephoneNumber, currentPassword, newPassword, confirmPassword } = form;
        const trimmedName = fullName.trim().replace(/\s+/g, ' ');
        if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100 || !/^[\p{L} '-]+$/u.test(trimmedName)) {
            return true;
        }
        const trimmedPhone = telephoneNumber.trim();
        if (trimmedPhone) {
            if (!/^(03|05|07|08|09)\d{8}$/.test(trimmedPhone)) {
                return true;
            }
        }
        if (currentPassword || newPassword || confirmPassword) {
            if (!currentPassword) return true;
            if (!newPassword) return true;
            if (newPassword.length < 8 || newPassword.length > 32 || /\s/.test(newPassword)) return true;
            if (!/[a-z]/.test(newPassword)) return true;
            if (!/[A-Z]/.test(newPassword)) return true;
            if (!/\d/.test(newPassword)) return true;
            if (!/[^a-zA-Z\d\s]/.test(newPassword)) return true;
            if (newPassword !== confirmPassword) return true;
        }
        return false;
    };

    const handleSave = async () => {
        setMsg({ text: '', type: '' });

        const cleanedName = form.fullName.trim().replace(/\s+/g, ' ');
        if (!cleanedName) {
            setMsg({ text: 'Full Name is required', type: 'error' });
            return;
        }
        if (cleanedName.length < 2 || cleanedName.length > 100) {
            setMsg({ text: 'Full Name must be between 2 and 100 characters', type: 'error' });
            return;
        }
        if (!/^[\p{L} '-]+$/u.test(cleanedName)) {
            setMsg({ text: "Full Name can only contain letters, spaces, apostrophes, and hyphens", type: 'error' });
            return;
        }

        const cleanedPhone = form.telephoneNumber.trim();
        if (cleanedPhone) {
            if (!/^(03|05|07|08|09)\d{8}$/.test(cleanedPhone)) {
                setMsg({ text: 'Phone number must be exactly 10 digits and start with 03, 05, 07, 08, or 09', type: 'error' });
                return;
            }
        }

        const payload = {
            fullName: cleanedName,
            telephoneNumber: cleanedPhone,
            avatarBase64: avatarPreview,
        };

        if (form.newPassword || form.currentPassword) {
            if (!form.currentPassword) {
                setMsg({ text: 'Current password is required to change password', type: 'error' });
                return;
            }
            if (!form.newPassword) {
                setMsg({ text: 'New password is required to change password', type: 'error' });
                return;
            }

            const newPwd = form.newPassword;
            if (newPwd.length < 8 || newPwd.length > 32) {
                setMsg({ text: 'New password must be between 8 and 32 characters', type: 'error' });
                return;
            }
            if (/\s/.test(newPwd)) {
                setMsg({ text: 'New password must not contain spaces', type: 'error' });
                return;
            }
            if (!/[a-z]/.test(newPwd)) {
                setMsg({ text: 'New password must contain at least one lowercase letter', type: 'error' });
                return;
            }
            if (!/[A-Z]/.test(newPwd)) {
                setMsg({ text: 'New password must contain at least one uppercase letter', type: 'error' });
                return;
            }
            if (!/\d/.test(newPwd)) {
                setMsg({ text: 'New password must contain at least one number', type: 'error' });
                return;
            }
            if (!/[^a-zA-Z\d\s]/.test(newPwd)) {
                setMsg({ text: 'New password must contain at least one special character', type: 'error' });
                return;
            }
            if (form.newPassword !== form.confirmPassword) {
                setMsg({ text: 'New password and confirm password do not match', type: 'error' });
                return;
            }

            payload.currentPassword = form.currentPassword;
            payload.newPassword = newPwd;
        }

        setIsLoading(true);
        setForm(prev => ({
            ...prev,
            fullName: cleanedName,
            telephoneNumber: cleanedPhone
        }));

        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch(apiEndpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (response.ok) {
                setMsg({ text: 'Profile updated successfully.', type: 'success' });
                localStorage.setItem('shms_fullname_' + username, cleanedName);
                setForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
            } else {
                setMsg({ text: data.error || 'Failed to update profile.', type: 'error' });
            }
        } catch {
            setMsg({ text: 'Failed to connect to the server.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const navigate = useNavigate();

    return (
        <div className="op-profile-container">
            <div className="op-profile-content">
                <div className="op-profile-header">
                    <button onClick={() => navigate(-1)} className="back-btn" style={{ marginBottom: '15px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 500 }}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    <h1 className="op-profile-title">Manage Account Profile</h1>
                    <p className="op-profile-subtitle">Update your personal information and security settings.</p>
                </div>

                <div className="op-profile-grid">
                    {/* Left: Avatar Panel */}
                    <div className="op-avatar-panel">
                        <div className="op-avatar-wrap" onClick={() => fileInputRef.current?.click()}>
                            {avatarPreview
                                ? <img src={avatarPreview} alt="avatar" className="op-avatar-img" />
                                : <div className="op-avatar-fallback">{form.fullName.trim() ? form.fullName.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'EU'}</div>
                            }
                        </div>
                        <p className="op-display-name">{form.fullName || 'User'}</p>
                        <span className="op-role-badge">{identity.roleLabel}</span>
                        <div className="op-divider" />
                        <button className="op-upload-btn" onClick={() => fileInputRef.current?.click()}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload New Avatar
                        </button>
                        <p className="op-file-hint">JPG or PNG. Max size of 5MB.</p>
                        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                    </div>

                    {/* Right: Forms */}
                    <div className="op-forms-col">
                        {/* Institutional Credentials */}
                        <div className="op-form-card">
                            <h2 className="op-card-title">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Institutional Credentials
                            </h2>
                            <div className="op-form-body">
                                <div className="op-field-row">
                                    <div className="op-field">
                                        <label className="op-label">Full Name</label>
                                        <input className="op-input" name="fullName" value={form.fullName} onChange={handleChange} />
                                        {form.fullName && (form.fullName.trim().length < 2 || form.fullName.trim().length > 100 || !/^[\p{L} '-]+$/u.test(form.fullName.trim())) && (
                                            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                                Full Name must be 2-100 characters, containing only letters, spaces, apostrophes, and hyphens.
                                            </div>
                                        )}
                                    </div>
                                    <div className="op-field">
                                        <label className="op-label">Email</label>
                                        <input
                                            className="op-input readonly"
                                            value={form.email}
                                            readOnly
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact & Security */}
                        <div className="op-form-card">
                            <h2 className="op-card-title">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Contact & Security
                            </h2>
                            <div className="op-form-body">
                                <div className="op-field-row single">
                                    <div className="op-field">
                                        <label className="op-label">Telephone Number</label>
                                        <div className="op-input-wrap">
                                            <span className="op-input-icon">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            </span>
                                            <input className="op-input with-icon" name="telephoneNumber" value={form.telephoneNumber} onChange={handleChange} />
                                        </div>
                                        {form.telephoneNumber && !/^(03|05|07|08|09)\d{8}$/.test(form.telephoneNumber.trim()) && (
                                            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                                Phone number must be exactly 10 digits and start with 03, 05, 07, 08, or 09.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="op-field-divider" />

                                <div className="op-field-row">
                                    <div className="op-field">
                                        <label className="op-label">Current Password</label>
                                        <div className="op-input-wrap">
                                            <span className="op-input-icon">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            </span>
                                            <input className="op-input with-icon" type={showCurrent ? 'text' : 'password'} name="currentPassword" value={form.currentPassword} onChange={handleChange} placeholder="••••••••" />
                                        </div>
                                    </div>
                                    <div className="op-field">
                                        <label className="op-label">New Password</label>
                                        <div className="op-input-wrap">
                                            <span className="op-input-icon">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                            </span>
                                            <input className="op-input with-icon" type={showNew ? 'text' : 'password'} name="newPassword" value={form.newPassword} onChange={handleChange} placeholder="Enter new password" />
                                            <button className="op-input-eye" type="button" onClick={() => setShowNew(v => !v)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showNew ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} /></svg>
                                            </button>
                                        </div>
                                        {form.newPassword && (form.newPassword.length < 8 || form.newPassword.length > 32 || /\s/.test(form.newPassword) || !/[a-z]/.test(form.newPassword) || !/[A-Z]/.test(form.newPassword) || !/\d/.test(form.newPassword) || !/[^a-zA-Z\d\s]/.test(form.newPassword)) && (
                                            <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
                                                Password must be 8-32 characters, contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (no spaces).
                                            </div>
                                        )}
                                        <p className="op-password-hint">Must be 8-32 characters long, contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (no spaces).</p>
                                    </div>
                                </div>

                                <div className="op-field-row single" style={{ marginBottom: 0 }}>
                                    <div className="op-field">
                                        <label className="op-label">Confirm Password</label>
                                        <div className="op-input-wrap">
                                            <span className="op-input-icon">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </span>
                                            <input className="op-input with-icon" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Re-enter new password" />
                                        </div>
                                        {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                                            <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                                Confirm password does not match new password.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="op-form-footer" style={{ marginTop: 24 }}>
                                    {msg.text && <p className={`op-msg ${msg.type}`}>{msg.text}</p>}
                                    <button className="op-save-btn" onClick={handleSave} disabled={isLoading || isFormInvalid()}>
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

export default ExpertProfile;
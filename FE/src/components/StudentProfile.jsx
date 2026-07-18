import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentProfile.css';

const StudentProfile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({
        telephoneNumber: '',
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [currentPasswordError, setCurrentPasswordError] = useState('');
    const [newPasswordError, setNewPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const token = localStorage.getItem('shms_token');
        if (!token) {
            navigate('/login');
            return;
        }
        try {
            const response = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student/profile", {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 401) {
                localStorage.removeItem('shms_token');
                navigate('/login');
                return;
            }
            const data = await response.json();
            setProfile(data);
            setFormData(prev => ({
                ...prev,
                telephoneNumber: data.telephoneNumber || ''
            }));
            if (data.avatarBase64) {
                setAvatarPreview(data.avatarBase64);
            }
        } catch (err) {
            try {
                const localRes = await fetch('/testFE.json');
                if (localRes.ok) {
                    const localJson = await localRes.json();
                    const data = localJson.studentProfile;
                    if (data) {
                        setProfile(data);
                        setFormData(prev => ({
                            ...prev,
                            telephoneNumber: data.telephoneNumber || ''
                        }));
                        if (data.avatarBase64) {
                            setAvatarPreview(data.avatarBase64);
                        }
                    }
                }
            } catch (localErr) {
                console.error("Profile synchronization error:", localErr);
                setError('Failed to fetch profile data');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
        if (name === 'telephoneNumber') setPhoneError('');
        if (name === 'currentPassword') setCurrentPasswordError('');
        if (name === 'newPassword') setNewPasswordError('');
        if (name === 'confirmNewPassword') setConfirmPasswordError('');
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                setError('File size must be less than 2MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
                setError('');
                setSuccess('');
            };
            reader.readAsDataURL(file);
        }
    };

    const isFormInvalid = () => {
        return false;
    };

    const handleSave = async () => {
        setError('');
        setPhoneError('');
        setCurrentPasswordError('');
        setNewPasswordError('');
        setConfirmPasswordError('');
        setSuccess('');

        const cleanedPhone = formData.telephoneNumber.trim();
        let hasError = false;

        if (cleanedPhone) {
            if (!/^(03|05|07|08|09)\d{8}$/.test(cleanedPhone)) {
                setPhoneError('Phone number must be exactly 10 digits and start with 03, 05, 07, 08, or 09.');
                hasError = true;
            }
        }

        const updateData = {
            telephoneNumber: cleanedPhone,
            avatarBase64: avatarPreview
        };

        if (formData.newPassword || formData.currentPassword || formData.confirmNewPassword) {
            if (!formData.currentPassword) {
                setCurrentPasswordError('Current password is required to change password');
                hasError = true;
            }
            if (!formData.newPassword) {
                setNewPasswordError('New password is required to change password');
                hasError = true;
            }

            const newPwd = formData.newPassword;
            if (newPwd) {
                if (newPwd.length < 8 || newPwd.length > 32 || /\s/.test(newPwd) || !/[a-z]/.test(newPwd) || !/[A-Z]/.test(newPwd) || !/\d/.test(newPwd) || !/[^a-zA-Z\d\s]/.test(newPwd)) {
                    setNewPasswordError('Password must be 8-32 characters, contain at least 1 uppercase, 1 lowercase, 1 number, and 1 special character (no spaces).');
                    hasError = true;
                }
            }
            
            if (formData.newPassword !== formData.confirmNewPassword) {
                setConfirmPasswordError('Confirm password does not match new password');
                hasError = true;
            }

            updateData.currentPassword = formData.currentPassword;
            updateData.newPassword = newPwd;
        }

        if (hasError) return;

        setIsLoading(true);

        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student/profile", {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to update profile');
            } else {
                setSuccess('Profile updated successfully!');
                setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmNewPassword: ''
                }));
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDeleteAccount = async () => {
        setShowDeleteConfirm(false);

        try {
            const response = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student/profile", {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('shms_token')}`
                }
            });

            if (response.ok) {
                alert("Account deleted successfully.");
                localStorage.removeItem('shms_token');
                localStorage.removeItem('shms_role');
                localStorage.removeItem('shms_user');
                navigate('/');
            } else {
                alert("Failed to delete account.");
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while deleting the account.");
        }
    };

    if (isLoading && !profile) return (
        <div className="profile-container">
            <div className="global-loading">
                <div className="global-spinner"></div>
                <span>Loading profile...</span>
            </div>
        </div>
    );

    return (
        <div className="profile-container">
            <div className="profile-header">
                <button onClick={() => navigate(-1)} className="back-btn" style={{ marginBottom: '15px', padding: '8px 16px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: 500 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>
                <h1 className="profile-title">Manage Account Profile</h1>
                <p className="profile-subtitle">Update your personal information and security settings.</p>
            </div>

            <div className="profile-grid">
                <div className="profile-card avatar-section">
                    <div className="avatar-wrapper">
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="avatar-image" />
                        ) : (
                            <svg className="avatar-image" fill="none" stroke="#9ca3af" viewBox="0 0 24 24" style={{ padding: '20px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )}
                    </div>
                    <div className="avatar-name">{profile?.fullName}</div>
                    <div className="avatar-role">{profile?.role || 'Student Account'}</div>

                    <input
                        type="file"
                        accept="image/jpeg, image/png"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button className="upload-btn" onClick={() => fileInputRef.current.click()}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload New Avatar
                    </button>
                    <div className="upload-hint">JPEG or PNG, max 2MB.</div>
                </div>

                <div className="profile-card">
                    <h2 className="section-title">Institutional Information</h2>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input type="text" className="form-input" value={profile?.fullName || ''} disabled />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Student ID</label>
                            <input type="text" className="form-input" value={profile?.studentCode || ''} disabled />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Major</label>
                            <input type="text" className="form-input" value={profile?.major || ''} disabled />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Corporate Email</label>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input type="text" className="form-input" value={profile?.corporateEmail || ''} disabled style={{ flex: 1, margin: 0 }} />
                                {profile && profile.isEmailVerified === true && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                                        padding: '9px 16px', fontSize: '14px', color: '#10b981', fontWeight: '600', background: '#ecfdf5',
                                        borderRadius: '6px', border: '1px solid #10b981', whiteSpace: 'nowrap'
                                    }}>

                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Verified
                                    </div>
                                )}
                                {profile && profile.isEmailVerified !== true && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#b45309', fontWeight: '600', padding: '9px 16px', fontSize: '14px',
                                        background: '#fffbeb', borderRadius: '6px', border: '1px solid #f59e0b',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Pending
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="info-text">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Institutional data is synchronized automatically and cannot be directly edited here.
                    </div>

                    <div className="divider"></div>

                    <h2 className="section-title">Contact & Security Settings</h2>

                    <div className="form-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '50%' }}>
                        <div className="form-group">
                            <label className="form-label">Telephone Number</label>
                            <input
                                type="text"
                                name="telephoneNumber"
                                className="form-input"
                                placeholder="0987654321"
                                value={formData.telephoneNumber}
                                onChange={handleChange}
                                style={phoneError ? { borderColor: '#ef4444' } : {}}
                            />
                            {phoneError && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                    {phoneError}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    name="currentPassword"
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={formData.currentPassword}
                                    onChange={handleChange}
                                    style={{ paddingRight: '40px', ...(currentPasswordError ? { borderColor: '#ef4444' } : {}) }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '45%', transform: 'translateY(-50%)', margin: '0', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0' }}
                                >
                                    {showCurrentPassword ? (
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    ) : (
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    )}
                                </button>
                            </div>
                            {currentPasswordError && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                    {currentPasswordError}
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    name="newPassword"
                                    className="form-input"
                                    placeholder="Leave blank to keep current"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    style={{ paddingRight: '40px', ...(newPasswordError ? { borderColor: '#ef4444' } : {}) }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '45%', transform: 'translateY(-50%)', margin: '0', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0' }}
                                >
                                    {showNewPassword ? (
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    ) : (
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    )}
                                </button>
                            </div>
                            {newPasswordError && (
                                <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>
                                    {newPasswordError}
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmNewPassword"
                                    className="form-input"
                                    placeholder="Re-enter new password"
                                    value={formData.confirmNewPassword}
                                    onChange={handleChange}
                                    style={{ paddingRight: '40px', ...(confirmPasswordError ? { borderColor: '#ef4444' } : {}) }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '45%', transform: 'translateY(-50%)', margin: '0', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0' }}
                                >
                                    {showConfirmPassword ? (
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    ) : (
                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                    )}
                                </button>
                            </div>
                            {confirmPasswordError && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                                    {confirmPasswordError}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="profile-actions-container">
                        <button className="save-delete-btn" onClick={handleDeleteAccount} >
                            Delete Account
                        </button>
                        <button className="save-profile-btn" onClick={handleSave} disabled={isLoading || isFormInvalid()}>
                            {isLoading ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                    </div>

                    <div className="profile-message-area">
                        {error && (
                            <div className="profile-alert profile-alert-error" role="alert">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="profile-alert profile-alert-success" role="status">
                                {success}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <div className="profile-modal-overlay">
                    <div className="profile-modal">
                        <div className="profile-modal-header">
                            <h3 className="profile-modal-title">Delete Account</h3>
                            <button className="profile-modal-close" onClick={() => setShowDeleteConfirm(false)}>
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="profile-modal-body">
                            Are you sure you want to delete this account? This action cannot be undone.
                        </div>
                        <div className="profile-modal-footer">
                            <button className="profile-modal-cancel-btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                            <button className="profile-modal-confirm-btn" onClick={confirmDeleteAccount}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProfile;

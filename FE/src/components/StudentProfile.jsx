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
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(true);
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
            const response = await fetch('http://localhost:8080/api/v1/student/profile', {
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
            setError('Failed to fetch profile data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
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

    const handleSave = async () => {
        if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
            setError('New password and confirm password do not match');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        const updateData = {
            telephoneNumber: formData.telephoneNumber,
            avatarBase64: avatarPreview
        };

        if (formData.currentPassword && formData.newPassword) {
            updateData.currentPassword = formData.currentPassword;
            updateData.newPassword = formData.newPassword;
        }

        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch('http://localhost:8080/api/v1/student/profile', {
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

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

        try {
            const response = await fetch('http://localhost:8080/api/v1/student/profile', {
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

    if (isLoading && !profile) return <div className="profile-container">Loading...</div>;

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
                {/* Left Column - Avatar */}
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

                {/* Right Column - Info & Settings */}
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
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="text" className="form-input" value={profile?.corporateEmail || ''} disabled style={{ flex: 1 }} />
                                {profile && profile.isEmailVerified === true && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', height: '32px',
                                        padding: '0 12px', fontSize: '14px', color: '#10b981', fontWeight: '600', background: '#ecfdf5',
                                        borderRadius: '4px', border: '1px solid #10b981',whiteSpace: 'nowrap'
                                    }}>

                                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Verified
                                    </div>
                                )}
                                {profile && profile.isEmailVerified !== true && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center',
                                        color: '#b45309', fontWeight: '600', padding: '0 10px',
                                        background: '#fffbeb', borderRadius: '4px', border: '1px solid #f59e0b',
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
                                placeholder="+84 90 123 4567"
                                value={formData.telephoneNumber}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input
                                type="password"
                                name="currentPassword"
                                className="form-input"
                                placeholder="••••••••"
                                value={formData.currentPassword}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                name="newPassword"
                                className="form-input"
                                placeholder="Leave blank to keep current"
                                value={formData.newPassword}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input
                                type="password"
                                name="confirmNewPassword"
                                className="form-input"
                                placeholder="Re-enter new password"
                                value={formData.confirmNewPassword}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div style={{ overflow: 'hidden', display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                        <button className="save-btn" onClick={handleDeleteAccount} style={{ background: '#ef4444', border: 'none', color: 'white', padding: '12px 24px', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}>
                            Delete Account
                        </button>
                        <button className="save-btn" onClick={handleSave} disabled={isLoading}>
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
        </div>
    );
};

export default StudentProfile;

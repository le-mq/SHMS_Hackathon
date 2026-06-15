import React, { useState, useEffect } from 'react';
import './ExpertProvision.css';
import NavbarAdmin from './NavbarAdmin';

const ExpertProvisioning = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        professionalEmail: '',
        username: '',
        password: '',
        roleSelection: [],
        accessExpiry: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
    };

    const handleGenerate = async () => {
        if (!formData.fullName || !formData.professionalEmail || !formData.username || !formData.password || !formData.accessExpiry || formData.roleSelection.length === 0) {
            setError('Please fill out all required fields and select at least one role.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('shms_token');
            // Adding time to the date so it matches LocalDateTime
            const accessExpiryDate = new Date(formData.accessExpiry);
            accessExpiryDate.setHours(23, 59, 59);

            const payload = {
                fullName: formData.fullName,
                professionalEmail: formData.professionalEmail,
                username: formData.username,
                password: formData.password,
                roleSelection: formData.roleSelection,
                accessExpiry: `${formData.accessExpiry}T23:59:59`
            };

            const response = await fetch('http://localhost:8080/api/v1/admin/contests/experts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            let data;
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { error: text || 'Unknown server error.' };
            }

            if (!response.ok) {
                let errorMsg = 'Failed to provision expert credentials.';
                if (data.error && data.message) {
                    errorMsg = `${data.error}: ${data.message}`;
                } else if (data.message) {
                    errorMsg = data.message;
                } else if (data.error) {
                    errorMsg = data.error;
                }
                setError(errorMsg);
            } else {
                setSuccess('Account generated! An invitation has been sent.');
                setFormData({
                    fullName: '',
                    professionalEmail: '',
                    username: '',
                    password: '',
                    roleSelection: [],
                    accessExpiry: ''
                });
                fetchExperts();
            }
        } catch (err) {
            setError('Failed to connect to the server: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const [experts, setExperts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [extendUserId, setExtendUserId] = useState('');
    const [newExpiry, setNewExpiry] = useState('');
    const [extendLoading, setExtendLoading] = useState(false);
    const [extendMsg, setExtendMsg] = useState('');

    const fetchExperts = async () => {
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch('http://localhost:8080/api/v1/admin/contests/experts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setExperts(data);
            }
        } catch (e) {
            console.error(e);
        }
    };
    const [manageRoleSelection, setManageRoleSelection] = useState([]);
    const [updateRolesLoading, setUpdateRolesLoading] = useState(false);

    useEffect(() => {
        fetchExperts();
    }, []);

    const handleExpertChange = (e) => {
        const userId = e.target.value;
        setExtendUserId(userId);
        if (userId) {
            const exp = experts.find(x => String(x.userId) === String(userId));
            if (exp) {
                setManageRoleSelection(exp.roles);
            } else {
                setManageRoleSelection([]);
            }
        } else {
            setManageRoleSelection([]);
        }
    };

    const handleRoleUpdate = async () => {
        if (!extendUserId || manageRoleSelection.length === 0) return;
        setUpdateRolesLoading(true);
        setExtendMsg('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`http://localhost:8080/api/v1/admin/contests/experts/${extendUserId}/roles`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ roles: manageRoleSelection })
            });
            if (res.ok) {
                setExtendMsg('Roles updated successfully!');
                fetchExperts(); // refresh
            } else {
                setExtendMsg('Failed to update roles.');
            }
        } catch (e) {
            setExtendMsg('Error connecting to server.');
        } finally {
            setUpdateRolesLoading(false);
        }
    };

    const handleExtend = async () => {
        if (!extendUserId || !newExpiry) return;
        setExtendLoading(true);
        setExtendMsg('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`http://localhost:8080/api/v1/admin/contests/experts/${extendUserId}/expiry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newExpiry: `${newExpiry}T23:59:59` })
            });
            if (res.ok) {
                setExtendMsg('Expiry extended successfully!');
                fetchExperts(); // refresh
            } else {
                setExtendMsg('Failed to extend expiry.');
            }
        } catch (e) {
            setExtendMsg('Error connecting to server.');
        } finally {
            setExtendLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!extendUserId) return;
        if (!window.confirm("Are you sure you want to delete this expert?")) return;
        setExtendLoading(true);
        setExtendMsg('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`http://localhost:8080/api/v1/admin/contests/experts/${extendUserId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                setExtendMsg('Expert deleted successfully!');
                setExtendUserId('');
                fetchExperts(); // refresh
            } else {
                setExtendMsg('Failed to delete expert.');
            }
        } catch (e) {
            setExtendMsg('Error connecting to server.');
        } finally {
            setExtendLoading(false);
        }
    };

    return (
        <div className="admin-container">
            <NavbarAdmin />

            <div className="config-wrapper">
                <div className="config-header">
                    <h1 className="config-title">Expert Credentials Provisioning</h1>
                    <p className="config-subtitle">Generate secure administrative access for evaluation committee members, technical mentors, and temporary guest judges.</p>
                </div>

                {error && <div className="alert-msg alert-error">{error}</div>}
                {success && <div className="alert-msg alert-success">{success}</div>}

                <div>
                    <div>
                        <div className="form-card">
                            <div className="form-header">
                                <div className="form-title">System Provisioning Form</div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" name="fullName" className="form-input" placeholder="e.g. Dr. Alistair Sterling" value={formData.fullName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Professional Email</label>
                                    <input type="email" name="professionalEmail" className="form-input" placeholder="a.sterling@university.edu" value={formData.professionalEmail}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <div className="input-with-prefix">
                                        <span>@</span>
                                        <input type="text" name="username" className="form-input" placeholder="asterling_expert" value={formData.username}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <input type="password" name="password" className="form-input" placeholder="Enter secure password" value={formData.password}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Role Selection</label>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" name="roleSelection" value="Judge" checked={formData.roleSelection.includes('Judge')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        roleSelection: e.target.checked
                                                            ? [...prev.roleSelection, value]
                                                            : prev.roleSelection.filter(r => r !== value)
                                                    }));
                                                    setError('');
                                                    setSuccess('');
                                                }}
                                            /> Judge
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" name="roleSelection" value="Guest Judge" checked={formData.roleSelection.includes('Guest Judge')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        roleSelection: e.target.checked
                                                            ? [...prev.roleSelection, value]
                                                            : prev.roleSelection.filter(r => r !== value)
                                                    }));
                                                    setError('');
                                                    setSuccess('');
                                                }}
                                            /> Guest Judge
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" name="roleSelection" value="Mentor" checked={formData.roleSelection.includes('Mentor')}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        roleSelection: e.target.checked
                                                            ? [...prev.roleSelection, value]
                                                            : prev.roleSelection.filter(r => r !== value)
                                                    }));
                                                    setError('');
                                                    setSuccess('');
                                                }}
                                            /> Mentor
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Access Token Expiry Lifespan ⓘ</label>
                                <input type="date" name="accessExpiry" className="form-input" value={formData.accessExpiry}
                                    onChange={handleChange}
                                    style={{ maxWidth: '300px' }}
                                />
                            </div>

                            <button className="generate-btn" onClick={handleGenerate} disabled={isLoading}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                {isLoading ? 'Generating...' : 'Generate Account Credentials'}
                            </button>
                        </div>

                        {/* Search & Extend Expiry Card */}
                        <div className="form-card" style={{ marginTop: '24px' }}>
                            <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="form-title">Manage Expert</div>
                                <button className="ph-btn-ghost" style={{ padding: '6px 12px', fontSize: '14px' }} onClick={fetchExperts}>
                                    Load Experts
                                </button>
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Select Expert</label>
                                    <input type="text" className="form-input" placeholder="Search by name or username..." value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ marginBottom: '8px' }}
                                    />
                                    <select className="form-select" value={extendUserId}
                                        onChange={handleExpertChange}
                                    >
                                        <option value="">-- Choose Expert --</option>
                                        {experts
                                            .filter(exp =>
                                                exp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                exp.username.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map(exp => (
                                                <option key={exp.userId} value={exp.userId}>
                                                    {exp.fullName} (@{exp.username}) - {exp.roles.join(', ')} - Expires: {new Date(exp.accessExpiry).toLocaleDateString()}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">New Expiry</label>
                                    <input type="date" className="form-input" value={newExpiry}
                                        onChange={e => setNewExpiry(e.target.value)}
                                    />
                                </div>
                            </div>

                            {extendUserId && (
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label className="form-label">Manage Roles</label>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" value="Judge" checked={manageRoleSelection.includes('Judge') || manageRoleSelection.includes('JUDGE')}
                                                onChange={(e) => {
                                                    const val = 'Judge';
                                                    setManageRoleSelection(prev =>
                                                        e.target.checked ? [...prev, val] : prev.filter(r => r.toUpperCase() !== val.toUpperCase())
                                                    );
                                                }}
                                            /> Judge
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" value="Guest Judge" checked={manageRoleSelection.includes('Guest Judge')}
                                                onChange={(e) => {
                                                    const val = 'Guest Judge';
                                                    setManageRoleSelection(prev =>
                                                        e.target.checked ? [...prev, val] : prev.filter(r => r.toUpperCase() !== val.toUpperCase())
                                                    );
                                                }}
                                            /> Guest Judge
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input type="checkbox" value="Mentor" checked={manageRoleSelection.includes('Mentor') || manageRoleSelection.includes('MENTOR')}
                                                onChange={(e) => {
                                                    const val = 'Mentor';
                                                    setManageRoleSelection(prev =>
                                                        e.target.checked ? [...prev, val] : prev.filter(r => r.toUpperCase() !== val.toUpperCase())
                                                    );
                                                }}
                                            /> Mentor
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'center' }}>
                                <button className="generate-btn"
                                    style={{ background: '#10b981', width: 'auto', margin: '0', height: '46px', padding: '0 24px' }}
                                    onClick={handleRoleUpdate}
                                    disabled={updateRolesLoading || !extendUserId}
                                >
                                    {updateRolesLoading ? 'Updating...' : 'Update Roles'}
                                </button>

                                <button className="generate-btn"
                                    style={{ background: '#3b82f6', width: 'auto', margin: '0', height: '46px', padding: '0 24px' }}
                                    onClick={handleExtend}
                                    disabled={extendLoading || !extendUserId || !newExpiry}
                                >
                                    {extendLoading ? 'Extending...' : 'Extend Expiry'}
                                </button>

                                <button className="ph-btn-ghost"
                                    style={{
                                        border: '1px solid #ef4444',
                                        color: '#ef4444',
                                        width: 'auto',
                                        padding: '0 24px',
                                        margin: '0',
                                        borderRadius: '8px',
                                        height: '46px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        background: 'transparent'
                                    }}
                                    onClick={handleDelete}
                                    disabled={extendLoading || !extendUserId}
                                >
                                    {extendLoading ? 'Deleting...' : 'Delete Expert'}
                                </button>
                            </div>

                            {extendMsg && <div style={{ marginTop: '12px', fontSize: '14px', color: extendMsg.includes('success') ? 'green' : 'red' }}>{extendMsg}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpertProvisioning;

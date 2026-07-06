import React, { useState, useEffect, useMemo } from 'react';
import './ExpertProvision.css';

const API_BASE = "http://localhost:8080/api/v1";
const todayStr = new Date().toISOString().split('T')[0];

const ExpertProvisioning = () => {
    const token = localStorage.getItem('shms_token');
    const headers = useMemo(() => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }), [token]);

    const initialFormState = {
        fullName: '',
        professionalEmail: '',
        username: '',
        password: '',
        roleSelection: [],
        accessExpiry: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [experts, setExperts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [newExpiries, setNewExpiries] = useState({});
    const [managedRoles, setManagedRoles] = useState({});
    const [extendLoading, setExtendLoading] = useState({});
    const [cardMessages, setCardMessages] = useState({});

    const formatExpiryDate = (date) => date ? `${date}T23:59:59` : null;

    const clearAlerts = () => {
        setError('');
        setSuccess('');
    };

    const setTempError = (msg) => {
        setError(msg);
        setTimeout(() => setError(''), 5000);
    };

    const setTempSuccess = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(''), 5000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        clearAlerts();
    };

    const handleRoleChange = (e) => {
        const { value, checked } = e.target;
        clearAlerts();

        setFormData(prev => {
            let nextRoles = [...prev.roleSelection];
            if (checked) {
                if (value === 'Guest Judge') {
                    nextRoles = ['Guest Judge'];
                } else {
                    nextRoles = nextRoles.filter(r => r !== 'Guest Judge');
                    if (!nextRoles.includes(value)) nextRoles.push(value);
                }
            } else {
                nextRoles = nextRoles.filter(r => r !== value);
            }
            return { ...prev, roleSelection: nextRoles };
        });
    };

    const fetchExperts = async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/contests/experts`, { headers });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setExperts(data);
        } catch {
            const localRes = await fetch("/testFE.json");
            const localJson = await localRes.json();
            setExperts(localJson.expertProvisioning?.experts || []);
        }
    };

    useEffect(() => {
        fetchExperts();
    }, []);

    const handleGenerate = async () => {
        const { fullName, professionalEmail, username, password, roleSelection, accessExpiry } = formData;

        if (!fullName || !professionalEmail || !username || !password || roleSelection.length === 0) {
            setTempError('Please fill out all required fields and select at least one role.');
            return;
        }
        if (roleSelection.includes('Guest Judge') && !accessExpiry) {
            setTempError('Please provide an expiry date for the Guest Judge.');
            return;
        }

        setIsLoading(true);
        clearAlerts();

        const expiryDateIso = roleSelection.includes('Guest Judge') ? formatExpiryDate(accessExpiry) : null;
        const payload = { fullName, professionalEmail, username, password, roleSelection, accessExpiry: expiryDateIso };

        try {
            const response = await fetch(`${API_BASE}/admin/contests/experts/create`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { error: text || 'Unknown server error.' };
            }

            if (!response.ok) {
                setTempError(data.message || data.error || 'Failed to provision expert credentials.');
            } else {
                setTempSuccess('Account generated! An invitation has been sent.');
                setFormData(initialFormState);
                fetchExperts();
            }
        } catch {
            const newExpert = {
                userId: Date.now(),
                fullName,
                username,
                professionalEmail,
                roles: roleSelection,
                accessExpiry: expiryDateIso
            };
            setExperts(prev => [...prev, newExpert]);
            setTempSuccess("Mock account generated successfully!");
            setFormData(initialFormState);
        } finally {
            setIsLoading(false);
        }
    };

    const setCardMsg = (userId, msg) => {
        setCardMessages(prev => ({ ...prev, [userId]: msg }));
        setTimeout(() => setCardMessages(prev => ({ ...prev, [userId]: '' })), 4000);
    };

    const handleUpdateRolesSubmit = async (userId) => {
        const targetExpert = experts.find(e => e.userId === userId);
        const rolesToUpdate = managedRoles[userId] || targetExpert?.roles || [];
        if (rolesToUpdate.length === 0) return;

        setExtendLoading(prev => ({ ...prev, [userId]: true }));
        setCardMessages(prev => ({ ...prev, [userId]: '' }));

        const isGuestJudge = rolesToUpdate.some(r => r.toUpperCase() === 'GUEST JUDGE');
        let calculatedExpiry = null;

        if (isGuestJudge) {
            const selectedDate = newExpiries[userId] || (targetExpert?.accessExpiry ? targetExpert.accessExpiry.split('T')[0] : todayStr);
            calculatedExpiry = formatExpiryDate(selectedDate);
        }

        try {
            const resRoles = await fetch(`${API_BASE}/admin/contests/experts/${userId}/roles`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ roles: rolesToUpdate })
            });
            if (!resRoles.ok) throw new Error();

            const resExpiry = await fetch(`${API_BASE}/admin/contests/experts/${userId}/expiry`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ newExpiry: calculatedExpiry })
            });

            setCardMsg(userId, resExpiry.ok ? 'Roles and Expiry updated successfully!' : 'Roles updated, but Server rejected Expiry format.');
            if (resExpiry.ok) fetchExperts();
        } catch {
            setExperts(prev => prev.map(exp => exp.userId == userId ? { ...exp, roles: rolesToUpdate, accessExpiry: calculatedExpiry } : exp));
            setCardMsg(userId, "Mock update roles & expiry success!");
        } finally {
            setExtendLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleExtendSubmit = async (userId) => {
        const selectedExpiry = newExpiries[userId];
        if (!userId || !selectedExpiry) return;

        setExtendLoading(prev => ({ ...prev, [userId]: true }));
        setCardMessages(prev => ({ ...prev, [userId]: '' }));
        const formattedExpiry = formatExpiryDate(selectedExpiry);

        try {
            const res = await fetch(`${API_BASE}/admin/contests/experts/${userId}/expiry?newExpiry=${formattedExpiry}`, {
                method: 'PUT',
                headers
            });
            if (res.ok) {
                setCardMsg(userId, 'Expiry extended successfully!');
                fetchExperts();
            } else {
                setCardMsg(userId, 'Failed to extend expiry. Please check parameter configuration.');
            }
        } catch (err) {
            setExperts(prev => prev.map(exp => exp.userId == userId ? { ...exp, accessExpiry: formattedExpiry } : exp));
            setCardMsg(userId, "Mock extend expiry success!");
        } finally {
            setExtendLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleDeleteSubmit = async (userId) => {
        if (!userId || !window.confirm("Are you sure you want to delete this expert?")) return;

        setExtendLoading(prev => ({ ...prev, [userId]: true }));
        setCardMessages(prev => ({ ...prev, [userId]: '' }));

        try {
            const res = await fetch(`${API_BASE}/admin/contests/experts/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setCardMsg(userId, 'Expert deleted successfully!');
                fetchExperts();
            } else {
                setCardMsg(userId, 'Failed to delete expert.');
            }
        } catch {
            setExperts(prev => prev.filter(exp => exp.userId != userId));
            setCardMsg(userId, "Mock delete success!");
        } finally {
            setExtendLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    const filteredExperts = useMemo(() => {
        return experts.filter(exp => !searchQuery || (
            (exp.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (exp.username || '').toLowerCase().includes(searchQuery.toLowerCase())
        ));
    }, [experts, searchQuery]);
    
    return (
        <div className="admin-container">
            <div className="config-wrapper">
                <div className="config-header-v">
                    <h1 className="config-title">Expert Credentials Provisioning</h1>
                    <p className="config-subtitle">
                        Generate secure administrative access for evaluation committee members, technical mentors, and temporary guest judges.
                    </p>
                </div>

                <div>
                    <div>
                        {/* ===== PROVISIONING FORM ===== */}
                        <div className="form-card-v">
                            <div className="form-header">
                                <div className="form-title">System Provisioning Form</div>
                                <span className="step-badge">New Expert</span>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" name="fullName" className="form-input" placeholder="e.g. Dr. Alistair Sterling" value={formData.fullName} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Professional Email</label>
                                    <input type="email" name="professionalEmail" className="form-input" placeholder="a.sterling@university.edu" value={formData.professionalEmail} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <input type="text" name="username" className="form-input" placeholder="e.g. asterling_expert" value={formData.username} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password</label>
                                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            className="form-input"
                                            placeholder="Enter secure password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            style={{ paddingRight: '40px', width: '100%' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}
                                        >
                                            {showPassword ? (
                                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <div className="form-group">
                                    <label className="form-label">Role Selection</label>
                                    <div className="role-selection-row">
                                        {['Judge', 'Guest Judge', 'Mentor'].map(role => (
                                            <label key={role} className="role-checkbox-label">
                                                <input type="checkbox" name="roleSelection" value={role} checked={formData.roleSelection.includes(role)} onChange={handleRoleChange} /> {role}
                                            </label>
                                        ))}
                                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            {(error || success) && (
                                                <span className={`expert-inline-msg ${success ? 'success' : 'error'}`}>
                                                    {error || success}
                                                </span>
                                            )}
                                            <button className="generate-btn" onClick={handleGenerate} disabled={isLoading}>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                                {isLoading ? 'Generating...' : 'Generate Account Credentials'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {formData.roleSelection.includes('Guest Judge') && (
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label className="form-label">Access Token Expiry Lifespan ⓘ</label>
                                    <input type="date" name="accessExpiry" className="form-input" min={todayStr} value={formData.accessExpiry} onChange={handleChange} style={{ maxWidth: '300px' }} />
                                </div>
                            )}
                        </div>

                        {/* ===== MANAGE EXPERTS ===== */}
                        <div className="form-card-v" style={{ marginTop: '24px' }}>
                            <div className="form-header">
                                <div className="form-title">Manage Experts</div>
                                <span className="step-badge">{filteredExperts.length} Expert{filteredExperts.length !== 1 ? 's' : ''}</span>
                            </div>

                            <div className="expert-search-wrap">
                                <svg className="expert-search-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input type="text" className="form-input" placeholder="Search by name or username..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            </div>



                            <div>
                                {filteredExperts.map(exp => {
                                    const hasLifespan = exp.accessExpiry && !exp.accessExpiry.startsWith('2099');
                                    let currentSelected = managedRoles[exp.userId] || exp.roles || [];

                                    if (!managedRoles[exp.userId]) {
                                        currentSelected = currentSelected.map(r => r.replace('ROLE_', ''));
                                        if (hasLifespan && currentSelected.some(r => r.toUpperCase() === 'JUDGE')) {
                                            currentSelected = currentSelected.filter(r => r.toUpperCase() !== 'JUDGE').concat('Guest Judge');
                                        } else if (!hasLifespan && currentSelected.some(r => r.toUpperCase() === 'GUEST JUDGE')) {
                                            currentSelected = currentSelected.filter(r => r.toUpperCase() !== 'GUEST JUDGE').concat('Judge');
                                        }
                                    }

                                    const isGuestJudge = currentSelected.some(r => r.toUpperCase() === 'GUEST JUDGE');
                                    const initials = (exp.fullName || exp.username || '??').substring(0, 2).toUpperCase();

                                    return (
                                        <div key={exp.userId} className="expert-manage-card">
                                            {/* Card Header */}
                                            <div className="expert-card-header">
                                                <div className="expert-avatar">{initials}</div>
                                                <div className="expert-card-info">
                                                    <div className="expert-card-name">{exp.fullName}</div>
                                                    <div className="expert-card-meta">
                                                        <strong>{exp.username}</strong>
                                                        {exp.professionalEmail && <> · {exp.professionalEmail}</>}
                                                    </div>
                                                </div>
                                                {hasLifespan && (
                                                    <div className="expert-card-expiry-badge">
                                                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Expires: {new Date(exp.accessExpiry).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Roles Block */}
                                            <div className="expert-roles-block">
                                                <span className="expert-roles-label">Manage Roles</span>
                                                <div className="expert-roles-checkboxes">
                                                    {['Judge', 'Guest Judge', 'Mentor'].map(r => {
                                                        const isChecked = currentSelected.map(cr => cr.toUpperCase()).includes(r.toUpperCase());
                                                        return (
                                                            <label key={r} className="expert-role-option">
                                                                <input type="checkbox" checked={isChecked}
                                                                       onChange={(e) => {
                                                                           const checked = e.target.checked;
                                                                           setManagedRoles(prev => {
                                                                               let updated = [...(prev[exp.userId] || exp.roles || [])];
                                                                               if (checked) {
                                                                                   updated = (r === 'Guest Judge') ? ['Guest Judge'] : updated.filter(x => x.toUpperCase() !== 'GUEST JUDGE');
                                                                                   if (!updated.map(x => x.toUpperCase()).includes(r.toUpperCase())) updated.push(r);
                                                                               } else {
                                                                                   updated = updated.filter(x => x.toUpperCase() !== r.toUpperCase());
                                                                               }
                                                                               return { ...prev, [exp.userId]: updated };
                                                                           });
                                                                       }}
                                                                /> {r}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Actions Row */}
                                            <div className="expert-actions-row">
                                                {isGuestJudge ? (
                                                    <div className="expert-expiry-controls">
                                                        <label>{hasLifespan ? 'Extend Expiry:' : 'Set Expiry:'}</label>
                                                        <input type="date" className="form-input" min={todayStr}
                                                               onChange={(e) => setNewExpiries(prev => ({ ...prev, [exp.userId]: e.target.value }))}
                                                               value={newExpiries[exp.userId] || ''}
                                                        />
                                                        <button className="expert-extend-btn" onClick={() => handleExtendSubmit(exp.userId)} disabled={!newExpiries[exp.userId] || extendLoading[exp.userId]}>
                                                            {extendLoading[exp.userId] ? 'Wait...' : (hasLifespan ? 'Extend' : 'Update Expiry')}
                                                        </button>
                                                    </div>
                                                ) : <div />}
                                                <div className="expert-btn-group">
                                                    {cardMessages[exp.userId] && (
                                                        <span className={`expert-inline-msg ${cardMessages[exp.userId].toLowerCase().includes('success') ? 'success' : 'error'}`}>
                                                            {cardMessages[exp.userId]}
                                                        </span>
                                                    )}
                                                    <button className="generate-btn-save" onClick={() => handleUpdateRolesSubmit(exp.userId)} disabled={extendLoading[exp.userId]}>
                                                        {extendLoading[exp.userId] ? 'Wait...' : 'Save Roles'}
                                                    </button>
                                                    <button className="ph-btn-delete" onClick={() => handleDeleteSubmit(exp.userId)} disabled={extendLoading[exp.userId]}>
                                                        {extendLoading[exp.userId] ? 'Wait...' : 'Delete'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredExperts.length === 0 && (
                                    <div className="expert-empty-state">No experts found matching your search.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpertProvisioning;
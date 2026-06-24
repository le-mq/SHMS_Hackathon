import React, { useState, useEffect } from 'react';
import './ExpertProvision.css';
import NavbarAdmin from './NavbarAdmin';

const API_BASE = "http://localhost:8080/api/v1";

const todayStr = new Date().toISOString().split('T')[0];

const ExpertProvisioning = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        professionalEmail: '',
        username: '',
        password: '',
        roleSelection: [],
        accessExpiry: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [newExpiries, setNewExpiries] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
    };

    const handleRoleChange = (e) => {
        const value = e.target.value;
        const isChecked = e.target.checked;

        setFormData(prev => {
            let newRoles = [...prev.roleSelection];
            if (isChecked) {
                if (value === 'Guest Judge') {
                    newRoles = ['Guest Judge'];
                } else {
                    newRoles = newRoles.filter(r => r !== 'Guest Judge');
                    if (!newRoles.includes(value)) newRoles.push(value);
                }
            } else {
                newRoles = newRoles.filter(r => r !== value);
            }
            return { ...prev, roleSelection: newRoles };
        });
        setError('');
        setSuccess('');
    };

    const handleGenerate = async () => {
        if (!formData.fullName || !formData.professionalEmail || !formData.username || !formData.password || formData.roleSelection.length === 0) {
            setError('Please fill out all required fields and select at least one role.');
            return;
        }
        if (formData.roleSelection.includes('Guest Judge') && !formData.accessExpiry) {
            setError('Please provide an expiry date for the Guest Judge.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('shms_token');
            let accessExpiryDateIso = null;

            // --- SỬA TẠI ĐÂY: Tạo chuỗi LocalDateTime thuần túy không có ký tự 'Z' hoặc '.000Z' ---
            if (formData.roleSelection.includes('Guest Judge')) {
                // formData.accessExpiry có dạng "yyyy-MM-dd" lấy từ ô input date
                accessExpiryDateIso = `${formData.accessExpiry}T23:59:59`;
            } else {
                // Mặc định cho các quyền vĩnh viễn không hết hạn
                accessExpiryDateIso = null;
            }

            const payload = {
                fullName: formData.fullName,
                professionalEmail: formData.professionalEmail,
                username: formData.username,
                password: formData.password,
                roleSelection: formData.roleSelection,
                accessExpiry: accessExpiryDateIso // Chuỗi gửi đi bây giờ sẽ sạch: "2026-06-19T23:59:59"
            };

            const response = await fetch(`${API_BASE}/admin/contests/experts/create`, {
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
                setError(data.message || data.error || 'Failed to provision expert credentials.');
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
        } catch {
            // Khối catch cho Mock data (cũng đồng bộ sửa chuỗi ngày tại đây)
            let expiryDateStr = formData.roleSelection.includes('Guest Judge')
                ? `${formData.accessExpiry}T23:59:59`
                : null;

            const newExpert = {
                userId: Date.now(),
                fullName: formData.fullName,
                username: formData.username,
                professionalEmail: formData.professionalEmail,
                roles: formData.roleSelection,
                accessExpiry: expiryDateStr
            };
            setExperts(prev => [...prev, newExpert]);
            setSuccess("Mock account generated successfully!");
            setFormData({
                fullName: '',
                professionalEmail: '',
                username: '',
                password: '',
                roleSelection: [],
                accessExpiry: ''
            });
        } finally {
            setIsLoading(false);
        }
    };

    const [experts, setExperts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [extendLoading, setExtendLoading] = useState(false);
    const [extendMsg, setExtendMsg] = useState('');
    const [managedRoles, setManagedRoles] = useState({});

    const handleUpdateRolesSubmit = async (userId) => {
        const rolesToUpdate = managedRoles[userId] || experts.find(e => e.userId === userId)?.roles || [];
        if (rolesToUpdate.length === 0) return;
        setExtendLoading(true);
        setExtendMsg('');
        const isGuestJudge = rolesToUpdate.some(r => r.toUpperCase() === 'GUEST JUDGE');
        let calculatedExpiry = null;

        if (!isGuestJudge) {
            calculatedExpiry = null;
        } else {
            const existingExpert = experts.find(e => e.userId === userId);
            const selectedDate = newExpiries[userId] || (existingExpert?.accessExpiry ? existingExpert.accessExpiry.split('T')[0] : todayStr);
            calculatedExpiry = `${selectedDate}T23:59:59`;
        }
        try {
            const token = localStorage.getItem('shms_token');
            const resRoles = await fetch(`${API_BASE}/admin/contests/experts/${userId}/roles`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ roles: rolesToUpdate })
            });
            if (!resRoles.ok) throw new Error('Failed to update roles');
            // 2. Đồng thời gọi API đồng bộ lại Expiry của Expert đó
            const resExpiry = await fetch(`${API_BASE}/admin/contests/experts/${userId}/expiry`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newExpiry: calculatedExpiry })
            });

            if (resExpiry.ok) {
                setExtendMsg('Roles and Expiry updated successfully!');
                fetchExperts();
            } else {
                setExtendMsg('Roles updated, but Server rejected Expiry format.');
            }
        } catch {
            setExperts(prev => prev.map(exp => exp.userId == userId ? { ...exp, roles: rolesToUpdate, accessExpiry: calculatedExpiry } : exp));
            setExtendMsg("Mock update roles & expiry success!");
        } finally {
            setExtendLoading(false);
        }
    };
    const fetchExperts = async () => {
        try {
            const token = localStorage.getItem("shms_token");
            const res = await fetch(API_BASE + "/admin/contests/experts",
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!res.ok)
                throw new Error();
            const data = await res.json();
            setExperts(data);
        }
        catch {
            const localRes = await fetch("/testFE.json");
            const localJson = await localRes.json();
            setExperts(localJson.expertProvisioning?.experts || []);
        }
    };
    useEffect(() => {
        fetchExperts();
    }, []);

    const handleExtendSubmit = async (userId) => {
        const selectedExpiry = newExpiries[userId];
        if (!userId || !selectedExpiry) return;
        setExtendLoading(true);
        setExtendMsg('');
        const formattedExpiry = `${selectedExpiry}T23:59:59`;
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`${API_BASE}/admin/contests/experts/${userId}/expiry?newExpiry=${formattedExpiry}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newExpiry: formattedExpiry })
            });
            if (res.ok) {
                setExtendMsg('Expiry extended successfully!');
                fetchExperts();
            } else {
                setExtendMsg('Failed to extend expiry. Please check parameter configuration.');
            }
        } catch (err) {
            console.error("Network error:", err);
            setExperts(prev => prev.map(exp => exp.userId == userId ? { ...exp, accessExpiry: formattedExpiry } : exp));
            setExtendMsg("Mock extend expiry success!");
        } finally {
            setExtendLoading(false);
        }
    };

    const handleDeleteSubmit = async (userId) => {
        if (!userId) return;
        if (!window.confirm("Are you sure you want to delete this expert?")) return;
        setExtendLoading(true);
        setExtendMsg('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`${API_BASE}/admin/contests/experts/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                setExtendMsg('Expert deleted successfully!');
                fetchExperts();
            } else {
                setExtendMsg('Failed to delete expert.');
            }
        } catch {
            setExperts(prev => prev.filter(exp => exp.userId != userId));
            setExtendMsg("Mock delete success!");
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
                    <p style={{
                        display: 'block',
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: '0',
                        maxWidth: '800px'
                    }}>
                        Generate secure administrative access for evaluation committee members, technical mentors, and temporary guest judges.
                    </p>
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
                                            style={{
                                                position: 'absolute',
                                                right: '9px',
                                                top: '8px',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#64748b',
                                                display: 'flex',
                                                alignItems: 'center',

                                            }}
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

                            {/* Hàng 3: Role Selection chiếm toàn bộ chiều ngang hàng đơn lẻ */}
                            <div style={{ marginBottom: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Role Selection</label>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                        {['Judge', 'Guest Judge', 'Mentor'].map(role => (
                                            <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input type="checkbox" name="roleSelection" value={role} checked={formData.roleSelection.includes(role)} onChange={handleRoleChange} /> {role}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {formData.roleSelection.includes('Guest Judge') && (
                                <div className="form-group" style={{ marginBottom: '16px' }}>
                                    <label className="form-label">Access Token Expiry Lifespan ⓘ</label>
                                    <input type="date" name="accessExpiry" className="form-input" min={todayStr} value={formData.accessExpiry} onChange={handleChange} style={{ maxWidth: '300px' }} />
                                </div>
                            )}

                            <button className="generate-btn" onClick={handleGenerate} disabled={isLoading}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                {isLoading ? 'Generating...' : 'Generate Account Credentials'}
                            </button>
                        </div>

                        {/* Search & Extend Expiry Card */}
                        <div className="form-card" style={{ marginTop: '24px' }}>
                            <div className="form-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div className="form-title">Manage Expert</div>
                            </div>

                            <div className="form-row">
                                <div className="form-group" style={{ flex: 2 }}>
                                    <label className="form-label">Search Expert</label>
                                    <input type="text" className="form-input" placeholder="Search by name or username..." value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ marginBottom: '16px' }}
                                    />
                                </div>
                            </div>

                            {extendMsg && <div style={{ marginBottom: '16px', fontSize: '14px', color: extendMsg.includes('success') ? 'green' : 'red' }}>{extendMsg}</div>}

                            <div>
                                {experts
                                    .filter(exp => !searchQuery || (
                                        exp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        exp.username.toLowerCase().includes(searchQuery.toLowerCase())
                                    ))
                                    .map(exp => {
                                        const currentSelected = managedRoles[exp.userId] || exp.roles || [];
                                        const hasLifespan = exp.accessExpiry && !exp.accessExpiry.startsWith('2099');
                                        const isGuestJudge = currentSelected.some(r => r.toUpperCase() === 'GUEST JUDGE');
                                        const needsLifespan = isGuestJudge;
                                        return (
                                            <div key={exp.userId} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', marginBottom: '12px' }}>
                                                <div style={{ fontSize: '15px', color: '#1e293b', marginBottom: '8px' }}>
                                                    <strong>Username:</strong> {exp.username} &nbsp;|&nbsp; <strong>Full Name:</strong> {exp.fullName}
                                                </div>
                                                {hasLifespan && (
                                                    <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>
                                                        Current Expiry: {new Date(exp.accessExpiry).toLocaleDateString()}
                                                    </div>
                                                )}

                                                <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                                                    <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#334155' }}>Manage Roles</label>
                                                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                                        {['Judge', 'Guest Judge', 'Mentor'].map(r => {
                                                            const isChecked = currentSelected.map(cr => cr.toUpperCase()).includes(r.toUpperCase());
                                                            return (
                                                                <label key={r} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                                                                    <input type="checkbox" checked={isChecked}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;
                                                                            setManagedRoles(prev => {
                                                                                let updated = [...(prev[exp.userId] || exp.roles || [])];
                                                                                if (checked) {
                                                                                    if (r === 'Guest Judge') updated = ['Guest Judge'];
                                                                                    else {
                                                                                        updated = updated.filter(x => x.toUpperCase() !== 'GUEST JUDGE');
                                                                                        if (!updated.map(x => x.toUpperCase()).includes(r.toUpperCase())) updated.push(r);
                                                                                    }
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

                                                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                                    {needsLifespan ? (
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <label style={{ fontSize: '14px', color: '#475569' }}>{hasLifespan ? 'Extend Expiry:' : 'Set Expiry:'}</label>
                                                            <input type="date" className="form-input" min={todayStr}
                                                                onChange={(e) => setNewExpiries(prev => ({ ...prev, [exp.userId]: e.target.value }))}
                                                                value={newExpiries[exp.userId] || ''}
                                                                style={{ width: 'auto', padding: '6px 10px', height: '36px', marginTop: '9px' }}
                                                            />
                                                            <button className="generate-btn"
                                                                style={{ background: '#3b82f6', height: '36px', padding: '0 16px', marginTop: '11px', width: 'auto', fontSize: '14px' }}
                                                                onClick={() => handleExtendSubmit(exp.userId)}
                                                                disabled={!newExpiries[exp.userId] || extendLoading}
                                                            >
                                                                {extendLoading ? 'Wait...' : (hasLifespan ? 'Extend' : 'Update Expiry')}
                                                            </button>
                                                        </div>
                                                    ) : <div />}
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <button className="generate-btn"
                                                            style={{ background: '#10b981', height: '36px', padding: '0 16px', margin: 0, width: 'auto', fontSize: '14px' }}
                                                            onClick={() => handleUpdateRolesSubmit(exp.userId)}
                                                            disabled={extendLoading}
                                                        >
                                                            {extendLoading ? 'Wait...' : 'Save Roles'}
                                                        </button>
                                                        <button className="ph-btn-ghost"
                                                            style={{ border: '1px solid #ef4444', color: '#ef4444', height: '36px', padding: '0 16px', margin: 0, borderRadius: '6px', fontSize: '14px', cursor: 'pointer', background: 'transparent' }}
                                                            onClick={() => handleDeleteSubmit(exp.userId)}
                                                            disabled={extendLoading}
                                                        >
                                                            {extendLoading ? 'Wait...' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                {experts.filter(exp => !searchQuery || exp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || exp.username.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                    <div style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>No experts found.</div>
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
import { useState, useEffect, useMemo } from 'react';
import './ExpertProvision.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1");
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
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
    const [sortOption, setSortOption] = useState('recentlyAdded');
    const [newExpiries, setNewExpiries] = useState({});
    const [managedRoles, setManagedRoles] = useState({});
    const [extendLoading, setExtendLoading] = useState({});
    const [cardMessages, setCardMessages] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Toast States
    const [toasts, setToasts] = useState([]);

    // For Delete Confirmation UX
    const [deletingExpert, setDeletingExpert] = useState(null);

    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    const formatExpiryDate = (date) => date ? `${date}T23:59:59` : null;

    const clearAlerts = () => {
        setError('');
        setSuccess('');
    };

    const setTempError = (msg) => {
        setError(msg);
        showToast(msg, 'error');
        setTimeout(() => setError(''), 5000);
    };

    const setTempSuccess = (msg) => {
        setSuccess(msg);
        showToast(msg, 'success');
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

    const [initialLoading, setInitialLoading] = useState(true);

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
        } finally {
            // Keep loading a little bit to register the transition smoothly
            setTimeout(() => {
                setInitialLoading(false);
            }, 600);
        }
    };

    useEffect(() => {
        fetchExperts();

        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isFormInvalid = () => {
        const { fullName, professionalEmail, username, password, roleSelection, accessExpiry } = formData;

        if (!fullName || !professionalEmail || !username || !password || roleSelection.length === 0) {
            return true;
        }

        const cleanedName = fullName.trim().replace(/\s+/g, ' ');
        if (cleanedName.length < 2 || cleanedName.length > 100 || !/^[\p{L} '-]+$/u.test(cleanedName)) {
            return true;
        }

        const cleanedEmail = professionalEmail.trim();
        if (/\s/.test(cleanedEmail) || !/^[^\s@]+@[^\s@]+$/.test(cleanedEmail)) {
            return true;
        }

        const cleanedUsername = username.trim();
        if (cleanedUsername.length < 4 || cleanedUsername.length > 30 || /\s/.test(cleanedUsername) || !/^[a-zA-Z0-9._]+$/.test(cleanedUsername)) {
            return true;
        }

        if (password.length < 8 || password.length > 32 || /\s/.test(password)) {
            return true;
        }
        if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^a-zA-Z\d\s]/.test(password)) {
            return true;
        }

        if (roleSelection.includes('Guest Judge') && !accessExpiry) {
            return true;
        }

        return false;
    };

    const handleGenerate = async () => {
        clearAlerts();
        const { fullName, professionalEmail, username, password, roleSelection, accessExpiry } = formData;

        if (!fullName || !professionalEmail || !username || !password || roleSelection.length === 0) {
            setTempError('Please fill out all required fields and select at least one role.');
            return;
        }

        const cleanedName = fullName.trim().replace(/\s+/g, ' ');
        if (cleanedName.length < 2 || cleanedName.length > 100) {
            setTempError('Full Name must be between 2 and 100 characters');
            return;
        }
        if (!/^[\p{L} '-]+$/u.test(cleanedName)) {
            setTempError("Full Name can only contain letters, spaces, apostrophes, and hyphens");
            return;
        }

        const cleanedEmail = professionalEmail.trim();
        if (/\s/.test(cleanedEmail)) {
            setTempError('Professional email cannot contain spaces');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+$/.test(cleanedEmail)) {
            setTempError('Professional email must have exactly one @, with a name before and a domain after');
            return;
        }

        const cleanedUsername = username.trim();
        if (cleanedUsername.length < 4 || cleanedUsername.length > 30) {
            setTempError('Username must be between 4 and 30 characters');
            return;
        }
        if (/\s/.test(cleanedUsername)) {
            setTempError('Username cannot contain spaces');
            return;
        }
        if (!/^[a-zA-Z0-9._]+$/.test(cleanedUsername)) {
            setTempError('Username can only contain alphanumeric characters, underscores, and dots');
            return;
        }

        if (password.length < 8 || password.length > 32) {
            setTempError('Password must be between 8 and 32 characters');
            return;
        }
        if (/\s/.test(password)) {
            setTempError('Password must not contain spaces');
            return;
        }
        if (!/[a-z]/.test(password)) {
            setTempError('Password must contain at least one lowercase letter');
            return;
        }
        if (!/[A-Z]/.test(password)) {
            setTempError('Password must contain at least one uppercase letter');
            return;
        }
        if (!/\d/.test(password)) {
            setTempError('Password must contain at least one number');
            return;
        }
        if (!/[^a-zA-Z\d\s]/.test(password)) {
            setTempError('Password must contain at least one special character');
            return;
        }

        if (roleSelection.includes('Guest Judge') && !accessExpiry) {
            setTempError('Please provide an expiry date for the Guest Judge.');
            return;
        }

        setIsLoading(true);

        const expiryDateIso = roleSelection.includes('Guest Judge') ? formatExpiryDate(accessExpiry) : null;
        const payload = { fullName: cleanedName, professionalEmail: cleanedEmail, username: cleanedUsername, password, roleSelection, accessExpiry: expiryDateIso };

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
                setShowForm(false);
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
            setShowForm(false);
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

            if (resExpiry.ok) {
                showToast('Roles and Expiry updated successfully!', 'success');
                fetchExperts();
            } else {
                setCardMsg(userId, 'Roles updated, but Server rejected Expiry format.');
                showToast('Roles updated, but Server rejected Expiry format.', 'error');
            }
        } catch {
            setExperts(prev => prev.map(exp => exp.userId == userId ? { ...exp, roles: rolesToUpdate, accessExpiry: calculatedExpiry } : exp));
            setCardMsg(userId, "Mock update roles & expiry success!");
            showToast("Roles updated successfully!", 'success');
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
                showToast('Expiry extended successfully!', 'success');
                fetchExperts();
            } else {
                setCardMsg(userId, 'Failed to extend expiry. Please check parameter configuration.');
                showToast('Failed to extend expiry.', 'error');
            }
        } catch (err) {
            setExperts(prev => prev.map(exp => exp.userId == userId ? { ...exp, accessExpiry: formattedExpiry } : exp));
            setCardMsg(userId, "Mock extend expiry success!");
            showToast("Expiry extended successfully!", 'success');
        } finally {
            setExtendLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    // Triggered when clicking Delete in card
    const handleDeleteClick = (expert) => {
        setDeletingExpert(expert);
    };

    // Confirms and runs deletion via API
    const handleConfirmDelete = async () => {
        if (!deletingExpert) return;
        const userId = deletingExpert.userId;
        setDeletingExpert(null);

        setExtendLoading(prev => ({ ...prev, [userId]: true }));
        setCardMessages(prev => ({ ...prev, [userId]: '' }));

        try {
            const res = await fetch(`${API_BASE}/admin/contests/experts/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Expert deleted successfully!', 'success');
                fetchExperts();
            } else {
                showToast('Failed to delete expert.', 'error');
            }
        } catch {
            setExperts(prev => prev.filter(exp => exp.userId != userId));
            showToast('Expert deleted successfully!', 'success');
        } finally {
            setExtendLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    // 1. Calculated statistics cards
    const statistics = useMemo(() => {
        let judgeCount = 0;
        let mentorCount = 0;
        let guestCount = 0;

        experts.forEach(exp => {
            const hasLifespan = exp.accessExpiry !== null && exp.accessExpiry !== undefined;
            let currentSelected = exp.roles || [];
            currentSelected = currentSelected.map(r => r.replace('ROLE_', ''));

            if (hasLifespan && currentSelected.some(r => r.toUpperCase() === 'JUDGE')) {
                currentSelected = currentSelected.filter(r => r.toUpperCase() !== 'JUDGE').concat('Guest Judge');
            } else if (!hasLifespan && currentSelected.some(r => r.toUpperCase() === 'GUEST JUDGE')) {
                currentSelected = currentSelected.filter(r => r.toUpperCase() !== 'GUEST JUDGE').concat('Judge');
            }

            currentSelected.forEach(r => {
                const ru = r.toUpperCase();
                if (ru === 'JUDGE') judgeCount++;
                else if (ru === 'MENTOR') mentorCount++;
                else if (ru === 'GUEST JUDGE') guestCount++;
            });
        });

        return {
            total: experts.length,
            judges: judgeCount,
            mentors: mentorCount,
            guestJudges: guestCount
        };
    }, [experts]);

    // 2. Client-side Search and Filter matching logic
    const filteredExperts = useMemo(() => {
        return experts.filter(exp => {
            const matchesSearch = !searchQuery || (
                (exp.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (exp.username || '').toLowerCase().includes(searchQuery.toLowerCase())
            );

            const matchesRole = !selectedRoleFilter || (exp.roles || []).some(role => {
                let userRole = role.toUpperCase().replace('ROLE_', '');
                let filterRole = selectedRoleFilter.toUpperCase();

                const hasLifespan = exp.accessExpiry !== null && exp.accessExpiry !== undefined;
                if (hasLifespan && userRole === 'JUDGE') {
                    userRole = 'GUEST JUDGE';
                }

                return userRole === filterRole;
            });

            return matchesSearch && matchesRole;
        });
    }, [experts, searchQuery, selectedRoleFilter]);

    // 3. Client-side Sorting
    const sortedExperts = useMemo(() => {
        const result = [...filteredExperts];
        if (sortOption === 'nameAsc') {
            result.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        } else if (sortOption === 'nameDesc') {
            result.sort((a, b) => (b.fullName || '').localeCompare(a.fullName || ''));
        } else if (sortOption === 'recentlyAdded') {
            result.sort((a, b) => {
                const idA = typeof a.userId === 'number' ? a.userId : parseFloat(a.userId) || 0;
                const idB = typeof b.userId === 'number' ? b.userId : parseFloat(b.userId) || 0;
                return idB - idA;
            });
        }
        return result;
    }, [filteredExperts, sortOption]);

    // Comparison utility to check for unsaved modifications
    const areRolesIdentical = (arr1, arr2) => {
        if (arr1.length !== arr2.length) return false;
        const s1 = new Set(arr1.map(r => r.toUpperCase()));
        const s2 = new Set(arr2.map(r => r.toUpperCase()));
        return s1.size === s2.size && [...s1].every(r => s2.has(r));
    };

    return (
        <div className="admin-container">
            {/* Top right Toast Notification System */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`custom-toast toast-${toast.type}`}>
                        <div className="toast-message-content">
                            <span className="toast-icon">
                                {toast.type === 'success' ? '✔' : '✖'}
                            </span>
                            <span>{toast.message}</span>
                        </div>
                        <button className="toast-close-btn" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>×</button>
                    </div>
                ))}
            </div>

            {/* Custom Confirm Delete Modal */}
            {deletingExpert && (
                <div className="expert-modal-overlay">
                    <div className="confirm-modal-card">
                        <div className="confirm-icon-danger">⚠</div>
                        <h3 className="confirm-title-h3">Delete Expert?</h3>
                        <p className="confirm-desc-p">
                            Are you sure you want to delete <strong>{deletingExpert.fullName}</strong>? This action cannot be undone.
                        </p>
                        <div className="confirm-actions-row">
                            <button className="btn-secondary" onClick={() => setDeletingExpert(null)}>
                                Cancel
                            </button>
                            <button className="btn-primary-action" style={{ backgroundColor: '#ef4444' }} onClick={handleConfirmDelete}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="config-wrapper">
                {/* 1. Page Header */}
                <div className="config-header-row">
                    <div className="config-header-v">
                        <h1 className="config-title">Expert Credentials Provisioning</h1>
                        <p className="config-subtitle">
                            Generate secure accounts for Judges, Mentors, Guest Judges and evaluation committee members.
                        </p>
                    </div>
                    <button
                        className="add-expert-header-btn"
                        onClick={() => setShowForm(true)}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Expert
                    </button>
                </div>

                {/* 2. Summary Statistics Section */}
                <div className="summary-cards-grid">
                    <div className="summary-card">
                        <div className="summary-card-content">
                            <span className="summary-card-title">👥 Total Experts</span>
                            <span className="summary-card-value">{statistics.total}</span>
                        </div>
                        <div className="summary-card-icon slate">👥</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-content">
                            <span className="summary-card-title">⚖ Judges</span>
                            <span className="summary-card-value">{statistics.judges}</span>
                        </div>
                        <div className="summary-card-icon blue">⚖</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-content">
                            <span className="summary-card-title">🎓 Mentors</span>
                            <span className="summary-card-value">{statistics.mentors}</span>
                        </div>
                        <div className="summary-card-icon green">🎓</div>
                    </div>
                    <div className="summary-card">
                        <div className="summary-card-content">
                            <span className="summary-card-title">🧑💼 Guest Judges</span>
                            <span className="summary-card-value">{statistics.guestJudges}</span>
                        </div>
                        <div className="summary-card-icon orange">🧑💼</div>
                    </div>
                </div>

                {/* 3. Search + Filter + Sort Toolbar */}
                <div className={`sticky-toolbar-wrapper ${isScrolled ? 'scrolled' : ''}`}>
                    <div className="unified-toolbar">
                        <div className="search-input-wrapper">
                            <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="🔍 Search expert by name or username..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="filter-wrapper">
                            <select
                                className="select-dropdown"
                                value={selectedRoleFilter}
                                onChange={e => setSelectedRoleFilter(e.target.value)}
                            >
                                <option value="">All Roles</option>
                                <option value="Judge">Judge</option>
                                <option value="Mentor">Mentor</option>
                                <option value="Guest Judge">Guest Judge</option>
                            </select>
                        </div>

                        <div className="sort-wrapper">
                            <select
                                className="select-dropdown"
                                value={sortOption}
                                onChange={e => setSortOption(e.target.value)}
                            >
                                <option value="recentlyAdded">Recently Added</option>
                                <option value="nameAsc">Name A-Z</option>
                                <option value="nameDesc">Name Z-A</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ===== PROVISIONING FORM MODAL ===== */}
                {showForm && (
                    <div className="expert-modal-overlay" onClick={() => setShowForm(false)}>
                        <div className="expert-modal-card" onClick={e => e.stopPropagation()}>
                            <div className="form-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div className="form-title">System Provisioning Form</div>
                                    <span className="step-badge">New Expert</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="close-form-icon-btn"
                                    title="Close Modal"
                                >
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Form Input fields */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input type="text" name="fullName" className="form-input" placeholder="e.g. Dr. Alistair Sterling" value={formData.fullName} onChange={handleChange} autoComplete="one-time-code" />
                                    {formData.fullName && (formData.fullName.trim().length < 2 || formData.fullName.trim().length > 100 || !/^[\p{L} '-]+$/u.test(formData.fullName.trim())) && (
                                        <div className="form-input-error">
                                            Full Name must be 2-100 characters (letters, spaces, apostrophes, and hyphens).
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Professional Email</label>
                                    <input type="email" name="professionalEmail" className="form-input" placeholder="a.sterling@university.edu" value={formData.professionalEmail} onChange={handleChange} autoComplete="one-time-code" />
                                    {formData.professionalEmail && (/\s/.test(formData.professionalEmail) || !/^[^\s@]+@[^\s@]+$/.test(formData.professionalEmail.trim())) && (
                                        <div className="form-input-error">
                                            Email must not contain spaces and must be valid (e.g. name@domain.com).
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Username</label>
                                    <input type="text" name="username" className="form-input" placeholder="e.g. asterling_expert" value={formData.username} onChange={handleChange} autoComplete="one-time-code" />
                                    {formData.username && (formData.username.trim().length < 4 || formData.username.trim().length > 30 || /\s/.test(formData.username) || !/^[a-zA-Z0-9._]+$/.test(formData.username.trim())) && (
                                        <div className="form-input-error">
                                            Username must be 4-30 chars, no spaces, only alphanumeric, underscores, dots.
                                        </div>
                                    )}
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
                                            autoComplete="one-time-code"
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
                                    {formData.password && (formData.password.length < 8 || formData.password.length > 32 || /\s/.test(formData.password) || !/[a-z]/.test(formData.password) || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password) || !/[^a-zA-Z\d\s]/.test(formData.password)) && (
                                        <div className="form-input-error">
                                            Password must be 8-32 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (no spaces).
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Role Selection</label>
                                <div className="role-selection-group">
                                    <div className="role-checkboxes-row">
                                        {['Judge', 'Guest Judge', 'Mentor'].map(role => (
                                            <label key={role} className="checkbox-option-label">
                                                <input type="checkbox" name="roleSelection" value={role} checked={formData.roleSelection.includes(role)} onChange={handleRoleChange} />
                                                {role}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {formData.roleSelection.includes('Guest Judge') && (
                                <div className="form-group animate-modal-scale">
                                    <label className="form-label">Access Token Expiry Lifespan ⓘ</label>
                                    <input type="date" name="accessExpiry" className="form-input" min={todayStr} value={formData.accessExpiry} onChange={handleChange} style={{ maxWidth: '300px' }} />
                                </div>
                            )}

                            {/* Modal action buttons */}
                            <div className="modal-action-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary-action"
                                    onClick={handleGenerate}
                                    disabled={isLoading || isFormInvalid()}
                                >
                                    {isLoading ? 'Generating...' : 'Generate Account Credentials'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Expert List Area */}
                {initialLoading ? (
                    /* SKELETON LOADING CARDS UI */
                    <div className="skeleton-cards-grid">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="skeleton-card">
                                <div className="skeleton-avatar skeleton-pulse" />
                                <div className="skeleton-line title skeleton-pulse" />
                                <div className="skeleton-line sub skeleton-pulse" />
                                <div className="skeleton-block skeleton-pulse" />
                                <div className="skeleton-footer">
                                    <div className="skeleton-button skeleton-pulse" />
                                    <div className="skeleton-button skeleton-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="experts-grid">
                            {sortedExperts.map(exp => {
                                const hasLifespan = exp.accessExpiry !== null && exp.accessExpiry !== undefined;
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

                                const originalRoles = (exp.roles || []).map(r => r.replace('ROLE_', ''));

                                // Roles identical check to control save disabled status & warning badge
                                const identical = areRolesIdentical(currentSelected, originalRoles);
                                const isSaveDisabled = extendLoading[exp.userId] || identical;

                                // Determine primary accent classification based on current selected roles
                                let cardAccentClass = 'default';
                                if (currentSelected.some(r => r.toUpperCase() === 'GUEST JUDGE')) {
                                    cardAccentClass = 'guest';
                                } else if (currentSelected.some(r => r.toUpperCase() === 'JUDGE')) {
                                    cardAccentClass = 'judge';
                                } else if (currentSelected.some(r => r.toUpperCase() === 'MENTOR')) {
                                    cardAccentClass = 'mentor';
                                }

                                return (
                                    <div key={exp.userId} className={`expert-card role-${cardAccentClass}`}>
                                        <div className="expert-card-top">
                                            {/* Beautiful avatar with initials & role gradient */}
                                            <div className={`expert-avatar-premium ${cardAccentClass}`}>
                                                {initials}
                                            </div>
                                            <div className="expert-header-meta">
                                                <h3 className="expert-name-headline">{exp.fullName}</h3>
                                                <div className="expert-email-sub">{exp.professionalEmail}</div>
                                                <span className="expert-username-tag">Username: {exp.username}</span>
                                            </div>
                                        </div>

                                        {/* Expiry display for Guest Judge */}
                                        {hasLifespan && (
                                            <div className="card-expiry-section">
                                                <div className="card-expires-badge">
                                                    ⏳ Expires: {new Date(exp.accessExpiry).toLocaleDateString()}
                                                </div>
                                            </div>
                                        )}

                                        {/* Current Roles badges */}
                                        <div className="current-roles-badge-container">
                                            <div className="section-tag-title">
                                                <span>Current Roles</span>
                                                {!identical && (
                                                    <span className="warning-unsaved-badge">● Unsaved CHANGES</span>
                                                )}
                                            </div>
                                            <div className="role-badges-flex">
                                                {originalRoles.map(role => {
                                                    let cls = 'judge';
                                                    if (role.toUpperCase() === 'MENTOR') cls = 'mentor';
                                                    if (role.toUpperCase() === 'GUEST JUDGE' || (hasLifespan && role.toUpperCase() === 'JUDGE')) cls = 'guest';

                                                    let displayRoleName = role;
                                                    if (hasLifespan && role.toUpperCase() === 'JUDGE') displayRoleName = 'Guest Judge';

                                                    return (
                                                        <span key={role} className={`role-badge ${cls}`}>
                                                            {displayRoleName}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Edit Roles checkboxes */}
                                        <div className="edit-roles-box">
                                            <span className="edit-role-label">Edit Roles</span>
                                            <div className="edit-roles-list">
                                                {['Judge', 'Guest Judge', 'Mentor'].map(r => {
                                                    const isChecked = currentSelected.map(cr => cr.toUpperCase()).includes(r.toUpperCase());
                                                    return (
                                                        <label key={r} className="checkbox-option-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
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
                                                            />
                                                            {r}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Expiry Lifespan configuration panel inside card */}
                                        {isGuestJudge && (
                                            <div className="expert-expiry-controls">
                                                <label>{hasLifespan ? 'Extend Expiry' : 'Set Expiry'}</label>
                                                <div className="expiry-input-group">
                                                    <input
                                                        type="date"
                                                        className="expiry-date-picker"
                                                        min={todayStr}
                                                        onChange={(e) => setNewExpiries(prev => ({ ...prev, [exp.userId]: e.target.value }))}
                                                        value={newExpiries[exp.userId] || ''}
                                                    />
                                                    <button
                                                        className="expert-extend-btn"
                                                        onClick={() => handleExtendSubmit(exp.userId)}
                                                        disabled={!newExpiries[exp.userId] || extendLoading[exp.userId]}
                                                    >
                                                        {extendLoading[exp.userId] ? '...' : (hasLifespan ? 'Extend' : 'Set')}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action buttons footer */}
                                        <div className="card-actions-wrapper">
                                            {cardMessages[exp.userId] && (
                                                <div style={{ marginRight: 'auto', fontSize: '12px', fontWeight: 'bolder', color: cardMessages[exp.userId].includes('success') ? '#10b981' : '#ef4444' }}>
                                                    {cardMessages[exp.userId]}
                                                </div>
                                            )}
                                            <button
                                                className="ph-btn-delete"
                                                onClick={() => handleDeleteClick(exp)}
                                                disabled={extendLoading[exp.userId]}
                                            >
                                                🗑 Delete
                                            </button>
                                            <button
                                                className="generate-btn-save"
                                                onClick={() => handleUpdateRolesSubmit(exp.userId)}
                                                disabled={isSaveDisabled}
                                            >
                                                {extendLoading[exp.userId] ? 'Wait...' : '💾 Save Changes'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* EMPTY STATE */}
                        {sortedExperts.length === 0 && (
                            <div className="empty-state-container">
                                <div className="empty-state-icon">👤</div>
                                <h3 className="empty-state-title">No experts found</h3>
                                <p className="empty-state-desc">
                                    There are no experts matching "{searchQuery}" or selected role. Click "Add Expert" to provisions one.
                                </p>
                                <button className="btn-primary-action" onClick={() => setShowForm(true)}>
                                    + Add Expert
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ExpertProvisioning;
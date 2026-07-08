import { useState, useEffect, useRef } from 'react';
import './PartnerVerification.css';

const API_BASE = "http://localhost:8080/api/v1";

const PartnerVerification = () => {
    const [partners, setPartners] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudentPartner, setSelectedStudentPartner] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const [partnerErrors, setPartnerErrors] = useState({});
    const [protocolSuccess, setProtocolSuccess] = useState('');
    const [partnerAddSuccess, setPartnerAddSuccess] = useState('');

    const [studentError, setStudentError] = useState('');
    const [studentSuccess, setStudentSuccess] = useState('');
    const [studentAddSuccess, setStudentAddSuccess] = useState('');

    const [isSavingStudents, setIsSavingStudents] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    const [newStudent, setNewStudent] = useState({ studentCode: '', fullName: '', corporateEmail: '', major: '', isCurrentStudent: true });
    const [newStudentErrors, setNewStudentErrors] = useState({});

    const studentFooterRef = useRef(null);
    const newStudentIdRef = useRef(null);
    const addStudentFormRef = useRef(null);

    useEffect(() => {
        fetchPartners();
    }, []);

    useEffect(() => {
        if (selectedStudentPartner) {
            fetchStudents(selectedStudentPartner);
        } else {
            setStudents([]);
        }
        setPartnerErrors({});
        setProtocolSuccess('');
        setPartnerAddSuccess('');
        setStudentError('');
        setStudentSuccess('');
        setStudentAddSuccess('');
        setNewStudentErrors({});
        setShowAddForm(false);
    }, [selectedStudentPartner]);

    const fetchPartners = async () => {
        try {
            const token = localStorage.getItem("shms_token");
            const response = await fetch(`${API_BASE}/admin/universities`,
                { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok)
                throw new Error();
            const data = await response.json();
            setPartners(data.map((p, i) => ({ ...p, ui_id: p.id || `temp-${i}` })));
        }
        catch {
            const localRes = await fetch("/testFE.json");
            const localJson = await localRes.json();
            setPartners(localJson.universities.map((p, i) => ({ ...p, ui_id: p.id || `temp-${i}` })));
        }
    };

    const fetchStudents = async (partnerId) => {
        try {
            const token = localStorage.getItem("shms_token");
            const partnerName = partners.find(p => String(p.ui_id) === String(partnerId))?.name;
            const response = await fetch(`${API_BASE}/admin/universities/students?university=${encodeURIComponent(partnerName)}`,
                { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok)
                throw new Error();
            const data = await response.json();
            setStudents(data.map((s, i) => ({ ...s, ui_id: s.id || `fetch-${i}` })));
        }
        catch {
            const localRes = await fetch("/testFE.json");
            const localJson = await localRes.json();
            const mockStudents = localJson.students.filter(s => s.university === partners.find(p => String(p.ui_id) === String(partnerId))?.name);
            setStudents(mockStudents.map((s, i) => ({ ...s, ui_id: `mock-${i}` })));
        }
    };

    const handlePartnerChange = (id, field, value) => {
        setPartners(partners.map(p => p.ui_id === id ? { ...p, [field]: value } : p));
        if (partnerErrors[id]?.[field]) {
            setPartnerErrors(prev => ({
                ...prev,
                [id]: { ...prev[id], [field]: '' }
            }));
        }
        setProtocolSuccess('');
    };

    const handleAddPartner = () => {
        const newId = `temp-${Date.now()}`;
        const defaultName = 'New Partner University';

        const newPartner = {
            ui_id: newId,
            name: defaultName,
            universityCode: '',
            emailRegex: '^[a-zA-Z0-9._%+-]+@example\\.edu\\.vn$',
            studentCodeRegex: '^\\d+$',
            isJustAdded: true
        };

        setPartners([newPartner, ...partners]);
        setProtocolSuccess('');
        setTimeout(() => setPartnerAddSuccess(''), 3000);
    };

    const handleDeletePartner = (id) => {
        setPartners(prev => prev.filter(p => p.ui_id !== id));
        if (partnerErrors[id]) {
            setPartnerErrors(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
        }
    };

    const handleApply = async () => {
        setIsLoading(true);
        setProtocolSuccess('');

        const errors = {};
        let hasError = false;

        for (let p of partners) {
            const currentErrors = {};
            if (!p.name || !p.name.trim()) {
                currentErrors.name = 'Institution name is required.';
                hasError = true;
            }
            if (!p.universityCode || !p.universityCode.trim()) {
                currentErrors.universityCode = 'University code is required.';
                hasError = true;
            }

            if (Object.keys(currentErrors).length > 0) {
                errors[p.ui_id] = currentErrors;
            }
        }

        if (hasError) {
            setPartnerErrors(errors);
            setIsLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('shms_token');
            const payload = partners.map(p => {
                const { ui_id, ...rest } = p;
                return typeof ui_id === 'string' && ui_id.startsWith('temp') ? rest : { ...rest, id: ui_id };
            });

            const response = await fetch(`${API_BASE}/admin/universities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Failed to apply settings.');
            } else {
                setProtocolSuccess('Verification settings saved successfully.');
                setPartners(prev => prev.map(item => ({ ...item, isJustAdded: false })));
                setPartnerErrors({});
                fetchPartners();
                setTimeout(() => setProtocolSuccess(''), 3000);
            }
        } catch {
            localStorage.setItem("universities", JSON.stringify(partners));
            setProtocolSuccess("Saved locally (Mock API)");
            setPartnerErrors({});
            setTimeout(() => setProtocolSuccess(''), 3000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStudent = () => {
        if (!selectedStudentPartner) {
            setTimeout(() => setStudentError('Please select a partner institution first.'), 3000);
            return;
        }
        setStudentError('');
        setShowAddForm(true);

        setTimeout(() => {
            addStudentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newStudentIdRef.current?.focus();
        }, 80);
    };

    const handleNewStudentChange = (field, value) => {
        setNewStudent(prev => ({ ...prev, [field]: value }));
        setNewStudentErrors(prev => ({ ...prev, [field]: '' }));
    };

    const submitNewStudent = () => {
        if (!selectedStudentPartner) {
            setStudentError('Please select a partner institution first.');
            return;
        }

        const errors = {};
        const partner = partners.find(p => String(p.ui_id) === String(selectedStudentPartner));

        if (!newStudent.studentCode || !newStudent.studentCode.trim()) {
            errors.studentCode = 'Student ID is required.';
        } else if (partner?.studentCodeRegex) {
            try {
                const regex = new RegExp(partner.studentCodeRegex);
                if (!regex.test(newStudent.studentCode.trim())) {
                    errors.studentCode = `Format error (Expected: ${partner.studentCodeRegex})`;
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (!newStudent.fullName || !newStudent.fullName.trim()) {
            errors.fullName = 'Full Name is required.';
        }

        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!newStudent.corporateEmail || !newStudent.corporateEmail.trim()) {
            errors.corporateEmail = 'Email is required.';
        } else if (!emailPattern.test(newStudent.corporateEmail.trim())) {
            errors.corporateEmail = 'Invalid email format.';
        } else if (partner?.emailRegex) {
            try {
                const regex = new RegExp(partner.emailRegex);
                if (!regex.test(newStudent.corporateEmail.trim())) {
                    errors.corporateEmail = `Must match university domain logic.`;
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (!newStudent.major || !newStudent.major.trim()) {
            errors.major = 'Major is required.';
        }

        if (Object.keys(errors).length > 0) {
            setNewStudentErrors(errors);
            return;
        }

        const newRecord = {
            ui_id: `temp-${Date.now()}`,
            studentCode: newStudent.studentCode.trim(),
            fullName: newStudent.fullName.trim(),
            corporateEmail: newStudent.corporateEmail.trim(),
            major: newStudent.major.trim(),
            isCurrentStudent: true,
            isJustAdded: true
        };

        setStudents([newRecord, ...students]);

        setStudentAddSuccess(`Added student ${newRecord.fullName} successfully!`);
        setStudentSuccess('');
        setStudentError('');
        setTimeout(() => setStudentAddSuccess(''), 3000);

        setNewStudent({ studentCode: '', fullName: '', corporateEmail: '', major: '', isCurrentStudent: true });
        setNewStudentErrors({});
        setShowAddForm(false);
    };

    const handleStudentChange = (id, field, value) => {
        setStudents(students.map(s => s.ui_id === id ? { ...s, [field]: value } : s));
        setStudentError('');
        setStudentSuccess('');
    };

    const handleDeleteStudent = (id) => {
        setStudents(prev => prev.filter(s => s.ui_id !== id));
    };

    const handleSaveStudents = async () => {
        setStudentError('');
        setStudentSuccess('');
        setIsSavingStudents(true);

        if (!selectedStudentPartner) {
            setTimeout(() => setStudentError('Please select a partner institution first.'), 3000);
            setIsSavingStudents(false);
            return;
        }

        const token = localStorage.getItem('shms_token');
        const partnerName = partners.find(p => String(p.ui_id) === String(selectedStudentPartner))?.name || '';

        for (let s of students) {
            if (!s.studentCode || !s.studentCode.trim()) {
                setStudentError('Student ID is required for all records.');
                setIsSavingStudents(false);
                return;
            }
        }

        const payload = students.map(s => ({
            studentCode: s.studentCode,
            fullName: s.fullName,
            corporateEmail: s.corporateEmail,
            major: s.major,
            isCurrentStudent: s.isCurrentStudent !== false,
            university: partnerName
        }));

        try {
            const response = await fetch(`${API_BASE}/admin/universities/students?university=${encodeURIComponent(partnerName)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setStudentSuccess('Student directory saved successfully.');
                setStudents(prev => prev.map(item => ({ ...item, isJustAdded: false })));
                setTimeout(() => setStudentSuccess(''), 3000);
            } else {
                const data = await response.json();
                setStudentError(data.error || 'Failed to save directory.');
            }
        } catch (err) {
            setStudentError('Server connection failed.');
        } finally {
            setIsSavingStudents(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="config-wrapperr">
                <div className="config-headerr">
                    <h1 className="config-title">Partner Verification Settings</h1>
                    <p className="config-subtitle">Configure university code, domains, and student verification protocols globally.</p>
                </div>

                <div className="main-card" style={{ overflow: 'visible' }}>
                    <div className="card-header-flex">
                        <div>
                            <h2 className="card-title-main">Verification Protocols</h2>
                            <p className="card-subtitle-main">Global settings for academic partner validation.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {partnerAddSuccess && (
                                <span style={{ color: '#16a34a', background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '650', border: '1px solid #bbf7d0' }}>
                                    {partnerAddSuccess}
                                </span>
                            )}
                            <button className="add-partner-btn" onClick={handleAddPartner}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Partner
                            </button>
                        </div>
                    </div>

                    <table className="partners-table">
                        <thead>
                            <tr>
                                <th>Institution</th>
                                <th>Code (ID)</th>
                                <th>Email Regex</th>
                                <th>ID Regex</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partners.map(p => (
                                <tr key={p.ui_id}>
                                    <td>
                                        <div className="institution-cell">
                                            <div className="institution-avatar">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ width: '100%' }}>
                                                <input
                                                    type="text"
                                                    className="table-input institution-input"
                                                    style={{
                                                        fontWeight: p.isJustAdded ? '700' : '600',
                                                        borderBottom: partnerErrors[p.ui_id]?.name ? '1.5px solid #ef4444' : ''
                                                    }}
                                                    value={p.name}
                                                    onChange={(e) => handlePartnerChange(p.ui_id, 'name', e.target.value)}
                                                />
                                                {partnerErrors[p.ui_id]?.name && <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginTop: '4px', display: 'block' }}>{partnerErrors[p.ui_id].name}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            style={{
                                                fontWeight: p.isJustAdded ? '700' : '400',
                                                border: partnerErrors[p.ui_id]?.universityCode ? '1.5px solid #ef4444' : ''
                                            }}
                                            placeholder="e.g. FPT-HCMC"
                                            value={p.universityCode || ''}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'universityCode', e.target.value)}
                                        />
                                        {partnerErrors[p.ui_id]?.universityCode && <span style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginTop: '4px', display: 'block' }}>{partnerErrors[p.ui_id].universityCode}</span>}
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            style={{ fontWeight: p.isJustAdded ? '700' : '400' }}
                                            value={p.emailRegex || ''}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'emailRegex', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            style={{ fontWeight: p.isJustAdded ? '700' : '400' }}
                                            value={p.studentCodeRegex || ''}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'studentCodeRegex', e.target.value)}
                                        />
                                    </td>
                                    <td className="actions-td">
                                        <div className="actions-cell">
                                            <button type="button" className="action-btn delete" onClick={() => handleDeletePartner(p.ui_id)} title="Delete Partner">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="table-footer sticky-footer">
                        <div className="footer-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                            {protocolSuccess && (
                                <span style={{ color: '#16a34a', background: '#f0fdf4', padding: '8px 14px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '650', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #bbf7d0' }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {protocolSuccess}
                                </span>
                            )}
                            {!protocolSuccess && (
                                <>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Save carefully! Removing an existing university will also disable it for users.
                                </>
                            )}
                        </div>
                        <div className="footer-actions">
                            <button className="apply-btn" onClick={handleApply} disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="main-card" style={{ marginTop: '24px', overflow: 'visible' }}>
                    <div className="card-header-flex">
                        <div>
                            <h2 className="card-title-main">Student Directory</h2>
                            <p className="card-subtitle-main">Enter or update student records for registration validation.</p>
                        </div>
                        <button className="add-partner-btn" onClick={handleAddStudent}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Student
                        </button>
                    </div>

                    <div style={{ padding: '0 24px 16px' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Select Partner Institution</label>
                        <select
                            className="form-select"
                            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px' }}
                            value={selectedStudentPartner}
                            onChange={(e) => setSelectedStudentPartner(e.target.value)}
                        >
                            <option value="">-- Choose Partner --</option>
                            {partners.map(p => (
                                <option key={p.ui_id} value={p.ui_id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedStudentPartner && showAddForm && (
                        <div ref={addStudentFormRef} className="add-student-form" style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#1f2937' }}>Add New Student</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 2fr 1fr auto auto', gap: '12px', alignItems: 'start' }}>
                                <div>
                                    <input
                                        ref={newStudentIdRef}
                                        type="text"
                                        className="table-input"
                                        style={{
                                            border: newStudentErrors.studentCode ? '1.5px solid #ef4444' : '',
                                            fontWeight: newStudent.studentCode ? '600' : '400'
                                        }}
                                        placeholder="Student ID"
                                        value={newStudent.studentCode}
                                        onChange={(e) => handleNewStudentChange('studentCode', e.target.value)}
                                    />
                                    {newStudentErrors.studentCode && <span className="error-text" style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginTop: '6px', display: 'block' }}>{newStudentErrors.studentCode}</span>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        className="table-input"
                                        style={{
                                            border: newStudentErrors.fullName ? '1.5px solid #ef4444' : '',
                                            fontWeight: newStudent.fullName ? '600' : '400'
                                        }}
                                        placeholder="Full Name"
                                        value={newStudent.fullName}
                                        onChange={(e) => handleNewStudentChange('fullName', e.target.value)}
                                    />
                                    {newStudentErrors.fullName && <span className="error-text" style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginTop: '6px', display: 'block' }}>{newStudentErrors.fullName}</span>}
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        name="email"
                                        autoComplete="email"
                                        className="table-input"
                                        style={{
                                            border: newStudentErrors.corporateEmail ? '1.5px solid #ef4444' : '',
                                            fontWeight: newStudent.corporateEmail ? '600' : '400'
                                        }}
                                        placeholder="Email (e.g. nva@fpt.edu.vn)"
                                        value={newStudent.corporateEmail}
                                        onChange={(e) => handleNewStudentChange('corporateEmail', e.target.value)}
                                    />
                                    {newStudentErrors.corporateEmail && <span className="error-text" style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginTop: '6px', display: 'block' }}>{newStudentErrors.corporateEmail}</span>}
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        className="table-input"
                                        style={{
                                            border: newStudentErrors.major ? '1.5px solid #ef4444' : '',
                                            fontWeight: newStudent.major ? '600' : '400'
                                        }}
                                        placeholder="Major (e.g. SE)"
                                        value={newStudent.major}
                                        onChange={(e) => handleNewStudentChange('major', e.target.value)}
                                    />
                                    {newStudentErrors.major && <span className="error-text" style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '600', marginTop: '6px', display: 'block' }}>{newStudentErrors.major}</span>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '38px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={newStudent.isCurrentStudent}
                                            onChange={(e) => handleNewStudentChange('isCurrentStudent', e.target.checked)}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        Current
                                    </label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button
                                        type="button"
                                        className="add-partner-btn"
                                        onClick={submitNewStudent}
                                        style={{ height: '38px', whiteSpace: 'nowrap' }}
                                    >
                                        Add Student
                                    </button>
                                    {studentAddSuccess && (
                                        <span style={{ color: '#16a34a', background: '#f0fdf4', padding: '6px 12px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '650', whiteSpace: 'nowrap', border: '1px solid #bbf7d0' }}>
                                            {studentAddSuccess}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={(e) => e.preventDefault()}>
                        <table className="partners-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Student ID</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Major</th>
                                    <th>Current</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s, index) => (
                                    <tr key={s.ui_id}>
                                        <td>{index + 1}</td>
                                        <td>
                                            <input
                                                type="text"
                                                className="table-input"
                                                style={{ fontWeight: s.isJustAdded ? '700' : '400' }}
                                                placeholder="SE150000"
                                                value={s.studentCode}
                                                onChange={(e) => handleStudentChange(s.ui_id, 'studentCode', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="table-input"
                                                style={{ fontWeight: s.isJustAdded ? '700' : '400' }}
                                                placeholder="Nguyen Van A"
                                                value={s.fullName}
                                                onChange={(e) => handleStudentChange(s.ui_id, 'fullName', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="email"
                                                name="email"
                                                autoComplete="email"
                                                id={`email-${s.ui_id}`}
                                                className="table-input"
                                                style={{ fontWeight: s.isJustAdded ? '700' : '400' }}
                                                placeholder="nva@fpt.edu.vn"
                                                value={s.corporateEmail || ''}
                                                onChange={(e) => handleStudentChange(s.ui_id, 'corporateEmail', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                className="table-input"
                                                style={{ fontWeight: s.isJustAdded ? '700' : '400', width: '80px' }}
                                                placeholder="SE"
                                                value={s.major || ''}
                                                onChange={(e) => handleStudentChange(s.ui_id, 'major', e.target.value)}
                                            />
                                        </td>
                                        <td className="checkbox-cell">
                                            <input
                                                type="checkbox"
                                                checked={s.isCurrentStudent !== false}
                                                onChange={(e) => handleStudentChange(s.ui_id, 'isCurrentStudent', e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                            />
                                        </td>
                                        <td className="actions-td">
                                            <div className="actions-cell">
                                                <button type="button" className="action-btn delete" onClick={() => handleDeleteStudent(s.ui_id)} title="Delete Record">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                            No student records. Add a student to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </form>

                    <div className="table-footer sticky-footer" ref={studentFooterRef}>
                        <div className="footer-info" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexGrow: 1 }}>
                            {studentError && (
                                <span style={{ color: '#d92727', background: '#fef2f2', padding: '8px 14px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '650', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #fca5a5' }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {studentError}
                                </span>
                            )}
                            {studentSuccess && (
                                <span style={{ color: '#16a34a', background: '#f0fdf4', padding: '8px 14px', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '650', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #bbf7d0' }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {studentSuccess}
                                </span>
                            )}
                            {!studentError && !studentSuccess && (
                                <>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Click Save Directory to commit changes to the database.
                                </>
                            )}
                        </div>
                        <div className="footer-actions">
                            <button
                                className="apply-btn"
                                onClick={handleSaveStudents}
                                disabled={isSavingStudents}
                            >
                                {isSavingStudents ? 'Saving...' : 'Save Directory'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartnerVerification;
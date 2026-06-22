import { useState, useEffect, useRef } from 'react';
import './PartnerVerification.css';
import NavbarAdmin from './NavbarAdmin';

const API_BASE = "http://localhost:8080/api/v1";
const PartnerVerification = () => {
    const [partners, setPartners] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudentPartner, setSelectedStudentPartner] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [studentError, setStudentError] = useState('');
    const [studentSuccess, setStudentSuccess] = useState('');
    const [isSavingStudents, setIsSavingStudents] = useState(false);

    const studentFooterRef = useRef(null);
    useEffect(() => {
        fetchPartners();
    }, []);

    useEffect(() => {
        if (selectedStudentPartner) {
            fetchStudents(selectedStudentPartner);
        } else {
            setStudents([]);
        }
        setError('');
        setSuccess('');
        setStudentError('');
        setStudentSuccess('');
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
        setError('');
        setSuccess('');
    };

    const handleAddPartner = () => {
        const newId = `temp-${Date.now()}`;
        setPartners([
            ...partners,
            { ui_id: newId, name: 'New Partner University', universityCode: '', emailRegex: '^[a-zA-Z0-9._%+-]+@example\\.edu\\.vn$', studentCodeRegex: '^\\d+$' }
        ]);
    };

    const handleDeletePartner = (id) => {
        setPartners(prev => prev.filter(p => p.ui_id !== id));
    };

    const handleApply = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');

        // Validation
        for (let p of partners) {
            if (!p.name || !p.name.trim()) {
                setError('Partner institution name is required.');
                setIsLoading(false);
                return;
            }
            if (!p.universityCode || !p.universityCode.trim()) {
                setError(`University code is required for ${p.name}.`);
                setIsLoading(false);
                return;
            }
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
                setError(data.error || 'Failed to apply settings.');
            } else {
                setSuccess('Verification settings saved successfully.');
                fetchPartners();
            }
        } catch {
            localStorage.setItem("universities", JSON.stringify(partners));
            setSuccess("Saved locally (Mock API)");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStudent = () => {
        setStudents([...students, { ui_id: `temp-${Date.now()}`, studentCode: '', fullName: '', corporateEmail: '', major: '', isCurrentStudent: true }]);
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
        if (!selectedStudentPartner) {
            setStudentError('Please select a partner institution first.');
            setTimeout(() => studentFooterRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
            return;
        }

        const token = localStorage.getItem('shms_token');
        const partnerName = partners.find(p => String(p.ui_id) === String(selectedStudentPartner))?.name || '';

        // Validation
        for (let s of students) {
            if (!s.studentCode || !s.studentCode.trim()) {
                setStudentError('Student ID is required for all records.');
                setTimeout(() => studentFooterRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
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
                setTimeout(() => setStudentSuccess(''), 4000);
            } else {
                const data = await response.json();
                setStudentError(data.error || 'Failed to save directory.');
            }
        } catch (err) {
            setStudentError('Server connection failed.');
        } finally {
            setIsSavingStudents(false);
            setTimeout(() => studentFooterRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    };

    return (
        <div className="admin-container">
            <NavbarAdmin />

            <div className="config-wrapper">
                <div className="config-header">
                    <h1 className="config-title">Partner Verification Settings</h1>
                    <p className="config-subtitle">Configure university code, domains, and student verification protocols globally.</p>
                </div>

                {error && <div className="alert-box alert-error">{error}</div>}
                {success && <div className="alert-box alert-success">{success}</div>}

                <div className="main-card">
                    <div className="card-header-flex">
                        <div>
                            <h2 className="card-title-main">Verification Protocols</h2>
                            <p className="card-subtitle-main">Global settings for academic partner validation.</p>
                        </div>
                        <button className="add-partner-btn" onClick={handleAddPartner}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Partner
                        </button>
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
                                            <input
                                                type="text"
                                                className="table-input institution-input"
                                                value={p.name}
                                                onChange={(e) => handlePartnerChange(p.ui_id, 'name', e.target.value)}
                                            />
                                        </div>
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            placeholder="e.g. FPT-HCMC"
                                            value={p.universityCode || ''}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'universityCode', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            value={p.emailRegex || ''}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'emailRegex', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            value={p.studentCodeRegex || ''}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'studentCodeRegex', e.target.value)}
                                        />
                                    </td>
                                    <td>
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

                    <div className="table-footer">
                        <div className="footer-info">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Save carefully! Removing an existing university will also disable it for users.
                        </div>
                        <div className="footer-actions">

                            <button className="apply-btn" onClick={handleApply} disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="main-card" style={{ marginTop: '24px' }}>
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
                    <table className="partners-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Major</th>
                                <th>Current</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s) => (
                                <tr key={s.ui_id}>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            placeholder="SE150000"
                                            value={s.studentCode}
                                            onChange={(e) => handleStudentChange(s.ui_id, 'studentCode', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            placeholder="Nguyen Van A"
                                            value={s.fullName}
                                            onChange={(e) => handleStudentChange(s.ui_id, 'fullName', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            placeholder="nva@fpt.edu.vn"
                                            value={s.corporateEmail}
                                            onChange={(e) => handleStudentChange(s.ui_id, 'corporateEmail', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            className="table-input"
                                            placeholder="SE"
                                            value={s.major || ''}
                                            onChange={(e) => handleStudentChange(s.ui_id, 'major', e.target.value)}
                                            style={{ width: '80px' }}
                                        />
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={s.isCurrentStudent !== false}
                                            onChange={(e) => handleStudentChange(s.ui_id, 'isCurrentStudent', e.target.checked)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                    </td>
                                    <td>
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
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                        No student records. Add a student to start.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <div className="table-footer" ref={studentFooterRef}>
                        <div className="footer-info" style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                            {studentError && (
                                <span style={{ color: '#ef4444', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {studentError}
                                </span>
                            )}
                            {studentSuccess && (
                                <span style={{ color: '#10b981', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {studentSuccess}
                                </span>
                            )}
                            {!studentError && !studentSuccess && "Click Save Directory to commit changes to the database."}
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

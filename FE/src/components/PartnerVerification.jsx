import { useState, useEffect } from 'react';
import './PartnerVerification.css';
import NavbarAdmin from './NavbarAdmin';

const PartnerVerification = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [partners, setPartners] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudentPartner, setSelectedStudentPartner] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchContests();
    }, []);

    useEffect(() => {
        if (selectedContestId) {
            fetchPartners(selectedContestId);
        } else {
            setPartners([]);
        }
    }, [selectedContestId]);

    useEffect(() => {
        if (selectedContestId && selectedStudentPartner) {
            fetchStudents(selectedContestId, selectedStudentPartner);
        } else {
            setStudents([]);
        }
    }, [selectedContestId, selectedStudentPartner]);

    const fetchContests = async () => {
        try {
            const token = localStorage.getItem('shms_token');
            if (!token) return;

            const response = await fetch('http://localhost:8080/api/v1/admin/contests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setContests(data);
                if (data.length > 0) {
                    setSelectedContestId(data[0].id.toString());
                }
            }
        } catch (err) {
            console.error('Failed to fetch contests');
        }
    };

    const fetchPartners = async (contestId) => {
        try {
            const token = localStorage.getItem('shms_token');
            if (!token) return;

            const response = await fetch(`http://localhost:8080/api/v1/admin/contests/${contestId}/partners`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const mappedData = data.map((p, i) => ({ ...p, ui_id: p.id || `temp-${i}` }));
                setPartners(mappedData);
            }
        } catch (err) {
            console.error('Failed to fetch partners');
        }
    };

    const fetchStudents = async (contestId, partnerId) => {
        try {
            const token = localStorage.getItem('shms_token');
            const partnerName = partners.find(p => String(p.ui_id) === String(partnerId))?.name;
            if (!partnerName) return;

            const response = await fetch(`http://localhost:8080/api/v1/admin/contests/${contestId}/partners/students?university=${encodeURIComponent(partnerName)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                const mapped = data.map((s, i) => ({ ...s, ui_id: `fetch-${i}` }));
                setStudents(mapped);
            }
        } catch (err) {
            console.error('Failed to fetch students');
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
            { ui_id: newId, name: 'New Partner University', emailDomain: '@example.edu.vn', studentIdRegex: '^\\\\d+$' }
        ]);
    };

    const handleDeletePartner = (id) => {
        setPartners(prev => prev.filter(p => p.ui_id !== id));
    };

    const handleApply = async () => {
        if (!selectedContestId) return;
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('shms_token');
            const payload = partners.map(p => {
                const { ui_id, ...rest } = p;
                return typeof ui_id === 'string' && ui_id.startsWith('temp') ? rest : { ...rest, id: ui_id };
            });

            const response = await fetch(`http://localhost:8080/api/v1/admin/contests/${selectedContestId}/partners`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to update partner verification settings');
            } else {
                setSuccess('Partner verification settings applied and synced successfully.');
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddStudent = () => {
        setStudents([...students, { ui_id: `temp-${Date.now()}`, mssv: '', fullName: '', corporateEmail: '', major: '', isCurrentStudent: true }]);
    };

    const handleStudentChange = (id, field, value) => {
        setStudents(students.map(s => s.ui_id === id ? { ...s, [field]: value } : s));
    };

    const handleDeleteStudent = (id) => {
        setStudents(prev => prev.filter(s => s.ui_id !== id));
    };

    const handleSaveStudents = async () => {
        if (!selectedContestId || !selectedStudentPartner) {
            setError('Please select both a contest and a partner institution to save students.');
            return;
        }

        const token = localStorage.getItem('shms_token');
        const partnerName = partners.find(p => String(p.ui_id) === String(selectedStudentPartner))?.name || '';

        const payload = students.map(s => ({
            mssv: s.mssv,
            fullName: s.fullName,
            corporateEmail: s.corporateEmail,
            major: s.major,
            isCurrentStudent: s.isCurrentStudent !== false,
            university: partnerName
        }));

        try {
            const response = await fetch(`http://localhost:8080/api/v1/admin/contests/${selectedContestId}/partners/students`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setSuccess('Student verification data saved successfully.');
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to save student data');
            }
        } catch (err) {
            setError('Failed to save student data. Please try again.');
        }
    };

    return (
        <div className="admin-container">
            <NavbarAdmin />

            <div className="config-wrapper">
                <div className="config-header">
                    <h1 className="config-title">Partner Verification Settings</h1>
                    <p className="config-subtitle">Define and manage the verification protocols for participating universities and institutional partners. Configure domain whitelisting and regex-based ID validation to ensure secure participant onboarding.</p>
                </div>

                {error && <div className="alert-box alert-error">{error}</div>}
                {success && <div className="alert-box alert-success">{success}</div>}

                <div className="main-card" style={{marginBottom: '24px', padding: '24px'}}>
                    <div className="form-group" style={{marginBottom: '0'}}>
                        <label className="form-label" style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Select Contest to Configure</label>
                        <select 
                            className="form-select" 
                            style={{width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '6px'}}
                            value={selectedContestId} 
                            onChange={(e) => setSelectedContestId(e.target.value)}
                        >
                            <option value="">-- Select a Contest --</option>
                            {contests.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name || `Season ${c.season} ${c.year}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedContestId && (
                <div className="main-card">
                    <div className="card-header-flex">
                        <div>
                            <h2 className="card-title-main">Verification Protocols</h2>
                            <p className="card-subtitle-main">Active whitelist for academic domain validation</p>
                        </div>
                        <button className="add-partner-btn" onClick={handleAddPartner}>
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Add Partner
                        </button>
                    </div>

                    <table className="partners-table">
                        <thead>
                            <tr>
                                <th>Partner Institution</th>
                                <th>Email Domain</th>
                                <th>Student ID Regex</th>
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
                                            value={p.emailDomain}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'emailDomain', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            className="table-input" 
                                            value={p.studentIdRegex}
                                            onChange={(e) => handlePartnerChange(p.ui_id, 'studentIdRegex', e.target.value)}
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
                            Verification changes require high-level audit logging and will be reflected immediately for new registrations.
                        </div>
                        <div className="footer-actions">
                            <button className="discard-btn" onClick={() => fetchPartners(selectedContestId)}>Discard Changes</button>
                            <button className="apply-btn" onClick={handleApply} disabled={isLoading}>
                                {isLoading ? 'Applying...' : 'Apply Partner Verification'}
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {selectedContestId && (
                    <div className="main-card" style={{ marginTop: '24px' }}>
                        <div className="card-header-flex">
                            <div>
                                <h2 className="card-title-main">Student Directory Validation Data</h2>
                                <p className="card-subtitle-main">Enter or update student records for registration validation.</p>
                            </div>
                            <button className="add-partner-btn" onClick={handleAddStudent}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Student Record
                            </button>
                        </div>
                        <div style={{ padding: '0 24px 16px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Select Partner Institution</label>
                            <select 
                                className="form-select" 
                                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '6px' }}
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
                                    <th>Email Address</th>
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
                                                placeholder="e.g. SE150000" 
                                                value={s.mssv}
                                                onChange={(e) => handleStudentChange(s.ui_id, 'mssv', e.target.value)}
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
                                                placeholder="e.g. SE" 
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
                                            No student records added yet. Click "Add Student Record" to begin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <div className="table-footer">
                            <div className="footer-info">
                                Student records added here will be verified during account sign-up.
                            </div>
                            <div className="footer-actions">
                                <button className="apply-btn" onClick={handleSaveStudents}>Save Directory Data</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerVerification;

import { useState, useEffect } from 'react';
import './PartnerVerification.css';
import { AddPartnerModal, AddStudentModal, ConfirmDialog } from './PartnerVerificationModals';

const API_BASE = "http://localhost:8080/api/v1";

const PartnerVerification = () => {
    const [partners, setPartners] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudentPartner, setSelectedStudentPartner] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isSavingStudents, setIsSavingStudents] = useState(false);

    const [studentError, setStudentError] = useState('');

    // Modal visibilities
    const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);

    // Track active item being edited
    const [editPartner, setEditPartner] = useState(null);
    const [editStudent, setEditStudent] = useState(null);

    const [newlyAddedPartners, setNewlyAddedPartners] = useState([]);
    const [newlyAddedStudents, setNewlyAddedStudents] = useState([]);

    // Confirm Dialog state
    const [confirmDialog, setConfirmDialog] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {},
        confirmText: 'OK',
        cancelText: 'Cancel',
        variant: 'primary'
    });

    // Toast state
    const [toast, setToast] = useState({ show: false, message: '', type: 'success', fadeOut: false });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type, fadeOut: false });
        setTimeout(() => {
            setToast(prev => ({ ...prev, fadeOut: true }));
            setTimeout(() => {
                setToast({ show: false, message: '', type: 'success', fadeOut: false });
            }, 300);
        }, 3000);
    };

    useEffect(() => {
        fetchPartners();
    }, []);

    useEffect(() => {
        if (selectedStudentPartner) {
            fetchStudents(selectedStudentPartner);
        } else {
            setStudents([]);
        }
        setStudentError('');
    }, [selectedStudentPartner]);

    const fetchPartners = async (currentNewPartners = newlyAddedPartners) => {
        try {
            const token = localStorage.getItem("shms_token");
            const response = await fetch(`${API_BASE}/admin/universities`,
                { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok)
                throw new Error();
            const data = await response.json();
            
            const sorted = [...data].sort((a, b) => {
                const aNew = currentNewPartners.includes(a.name);
                const bNew = currentNewPartners.includes(b.name);
                if (aNew && !bNew) return -1;
                if (!aNew && bNew) return 1;
                return 0;
            });

            setPartners(sorted.map((p, i) => ({ ...p, ui_id: p.id || `temp-${i}` })));
        }
        catch {
            const localRes = await fetch("/testFE.json");
            const localJson = await localRes.json();
            
            const sorted = [...localJson.universities].sort((a, b) => {
                const aNew = currentNewPartners.includes(a.name);
                const bNew = currentNewPartners.includes(b.name);
                if (aNew && !bNew) return -1;
                if (!aNew && bNew) return 1;
                return 0;
            });

            setPartners(sorted.map((p, i) => ({ ...p, ui_id: p.id || `temp-${i}` })));
        }
    };

    const fetchStudents = async (partnerId, currentNewStudents = newlyAddedStudents) => {
        try {
            const token = localStorage.getItem("shms_token");
            const partnerName = partners.find(p => String(p.ui_id) === String(partnerId))?.name;
            const response = await fetch(`${API_BASE}/admin/universities/students?university=${encodeURIComponent(partnerName)}`,
                { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok)
                throw new Error();
            const data = await response.json();

            const sorted = [...data].sort((a, b) => {
                const aNew = currentNewStudents.includes(a.studentCode);
                const bNew = currentNewStudents.includes(b.studentCode);
                if (aNew && !bNew) return -1;
                if (!aNew && bNew) return 1;
                return 0;
            });

            setStudents(sorted.map((s, i) => ({ ...s, ui_id: s.id || `fetch-${i}` })));
        }
        catch {
            const localRes = await fetch("/testFE.json");
            const localJson = await localRes.json();
            const mockStudents = localJson.students.filter(s => s.university === partners.find(p => String(p.ui_id) === String(partnerId))?.name);
            
            const sorted = [...mockStudents].sort((a, b) => {
                const aNew = currentNewStudents.includes(a.studentCode);
                const bNew = currentNewStudents.includes(b.studentCode);
                if (aNew && !bNew) return -1;
                if (!aNew && bNew) return 1;
                return 0;
            });

            setStudents(sorted.map((s, i) => ({ ...s, ui_id: `mock-${i}` })));
        }
    };

    const savePartnersList = async (list) => {
        const token = localStorage.getItem('shms_token');
        const payload = list.map(p => {
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

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save partners.');
        }
        return await response.json();
    };

    const saveStudentsList = async (partnerName, list) => {
        const token = localStorage.getItem('shms_token');
        const payload = list.map(s => ({
            studentCode: s.studentCode,
            fullName: s.fullName,
            corporateEmail: s.corporateEmail,
            major: s.major,
            isCurrentStudent: s.isCurrentStudent !== false,
            university: partnerName
        }));

        const response = await fetch(`${API_BASE}/admin/universities/students?university=${encodeURIComponent(partnerName)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to save directory.');
        }
        return await response.json();
    };

    const handleAddPartner = () => {
        setEditPartner(null);
        setShowAddPartnerModal(true);
    };

    const handleCreateOrUpdatePartner = (partnerData) => {
        const isEditing = !!editPartner;
        const confirmTitle = isEditing ? 'Save Changes' : 'Confirm Partner Creation';
        const confirmMsg = isEditing ? 'Save changes to this partner?' : 'Are you sure you want to create this partner?';

        setConfirmDialog({
            show: true,
            title: confirmTitle,
            message: confirmMsg,
            confirmText: 'OK',
            cancelText: 'Cancel',
            variant: 'primary',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, show: false }));
                setIsLoading(true);

                let updatedPartners;
                let nextNewPartners = newlyAddedPartners;
                if (isEditing) {
                    updatedPartners = partners.map(p => p.ui_id === editPartner.ui_id ? { ...p, ...partnerData } : p);
                } else {
                    nextNewPartners = [partnerData.name, ...newlyAddedPartners];
                    setNewlyAddedPartners(nextNewPartners);
                    updatedPartners = [
                        {
                            ui_id: `temp-${Date.now()}`,
                            ...partnerData
                        },
                        ...partners
                    ];
                }

                try {
                    await savePartnersList(updatedPartners);
                    setShowAddPartnerModal(false);
                    showToast(isEditing ? "Partner updated successfully." : "Partner created successfully.");
                    fetchPartners(nextNewPartners);
                } catch (err) {
                    localStorage.setItem("universities", JSON.stringify(updatedPartners));
                    setShowAddPartnerModal(false);
                    showToast("Saved locally (Mock API)");
                    
                    const sorted = [...updatedPartners].sort((a, b) => {
                        const aNew = nextNewPartners.includes(a.name);
                        const bNew = nextNewPartners.includes(b.name);
                        if (aNew && !bNew) return -1;
                        if (!aNew && bNew) return 1;
                        return 0;
                    });
                    setPartners(sorted);
                } finally {
                    setIsLoading(false);
                }
            },
            onCancel: () => setConfirmDialog(prev => ({ ...prev, show: false }))
        });
    };

    const handleUpdatePartnerClick = (partner) => {
        setEditPartner(partner);
        setShowAddPartnerModal(true);
    };

    const handleDeletePartnerClick = (id) => {
        setConfirmDialog({
            show: true,
            title: 'Delete Partner',
            message: 'Are you sure you want to delete this partner?',
            confirmText: 'OK',
            cancelText: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, show: false }));
                setIsLoading(true);
                const updatedPartners = partners.filter(p => p.ui_id !== id);

                try {
                    await savePartnersList(updatedPartners);
                    showToast("Partner deleted successfully.");
                    fetchPartners();
                } catch (err) {
                    localStorage.setItem("universities", JSON.stringify(updatedPartners));
                    showToast("Saved locally (Mock API)");
                    setPartners(updatedPartners);
                } finally {
                    setIsLoading(false);
                }
            },
            onCancel: () => setConfirmDialog(prev => ({ ...prev, show: false }))
        });
    };

    const handleAddStudent = () => {
        if (!selectedStudentPartner) {
            setStudentError('Please select a partner institution first.');
            showToast('Please select a partner institution first.', 'error');
            return;
        }
        setStudentError('');
        setEditStudent(null);
        setShowAddStudentModal(true);
    };

    const handleCreateOrUpdateStudent = (studentData) => {
        const isEditing = !!editStudent;
        const confirmTitle = isEditing ? 'Save Changes' : 'Confirm Student Addition';
        const confirmMsg = isEditing ? 'Save changes to this student?' : 'Are you sure you want to add this student?';

        setConfirmDialog({
            show: true,
            title: confirmTitle,
            message: confirmMsg,
            confirmText: 'OK',
            cancelText: 'Cancel',
            variant: 'primary',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, show: false }));
                setIsSavingStudents(true);
                const partnerName = studentData.university;

                let updatedStudents;
                let nextNewStudents = newlyAddedStudents;
                if (isEditing) {
                    updatedStudents = students.map(s => s.ui_id === editStudent.ui_id ? { ...s, ...studentData } : s);
                } else {
                    nextNewStudents = [studentData.studentCode, ...newlyAddedStudents];
                    setNewlyAddedStudents(nextNewStudents);
                    updatedStudents = [
                        {
                            ui_id: `temp-${Date.now()}`,
                            ...studentData
                        },
                        ...students
                    ];
                }

                try {
                    await saveStudentsList(partnerName, updatedStudents);
                    setShowAddStudentModal(false);
                    showToast(isEditing ? "Student updated successfully." : "Student added successfully.");
                    fetchStudents(selectedStudentPartner, nextNewStudents);
                } catch (err) {
                    localStorage.setItem(`students_${partnerName}`, JSON.stringify(updatedStudents));
                    setShowAddStudentModal(false);
                    showToast("Saved student directory locally (Mock API)");
                    
                    const sorted = [...updatedStudents].sort((a, b) => {
                        const aNew = nextNewStudents.includes(a.studentCode);
                        const bNew = nextNewStudents.includes(b.studentCode);
                        if (aNew && !bNew) return -1;
                        if (!aNew && bNew) return 1;
                        return 0;
                    });
                    setStudents(sorted);
                } finally {
                    setIsSavingStudents(false);
                }
            },
            onCancel: () => setConfirmDialog(prev => ({ ...prev, show: false }))
        });
    };

    const handleUpdateStudentClick = (student) => {
        setEditStudent(student);
        setShowAddStudentModal(true);
    };

    const handleDeleteStudentClick = (id) => {
        setConfirmDialog({
            show: true,
            title: 'Delete Student',
            message: 'Are you sure you want to delete this student?',
            confirmText: 'OK',
            cancelText: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmDialog(prev => ({ ...prev, show: false }));
                setIsSavingStudents(true);
                const partner = partners.find(p => String(p.ui_id) === String(selectedStudentPartner));
                const partnerName = partner?.name || '';
                const updatedStudents = students.filter(s => s.ui_id !== id);

                try {
                    await saveStudentsList(partnerName, updatedStudents);
                    showToast("Student deleted successfully.");
                    fetchStudents(selectedStudentPartner);
                } catch (err) {
                    localStorage.setItem(`students_${partnerName}`, JSON.stringify(updatedStudents));
                    showToast("Saved student directory locally (Mock API)");
                    setStudents(updatedStudents);
                } finally {
                    setIsSavingStudents(false);
                }
            },
            onCancel: () => setConfirmDialog(prev => ({ ...prev, show: false }))
        });
    };

    return (
        <div className="admin-container">
            {toast.show && (
                <div className={`toast-notification ${toast.fadeOut ? 'fade-out' : ''}`} style={{
                    background: toast.type === 'error' ? '#fef2f2' : '#E8F8EF',
                    borderColor: toast.type === 'error' ? '#ef4444' : '#2ECC71',
                    color: toast.type === 'error' ? '#b91c1c' : '#1E8449'
                }}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        {toast.type === 'error' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                    </svg>
                    {toast.message}
                </div>
            )}

            <div className="config-wrapperr">
                <div className="config-headerr">
                    <h1 className="config-title">Partner Verification Settings</h1>
                    <p className="config-subtitle">Configure university code, domains, and student verification protocols globally.</p>
                </div>

                {/* Card 1: Verification Protocols */}
                <div className="main-card" style={{ overflow: 'visible' }}>
                    <div className="card-header-flex">
                        <div>
                            <h2 className="card-title-main">Verification Protocols</h2>
                            <p className="card-subtitle-main">Global settings for academic partner validation.</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {partners.map(p => (
                                <tr key={p.ui_id}>
                                    <td>
                                        <div className="institution-cell">
                                            <div className="institution-avatar">
                                                {p.name ? p.name.charAt(0).toUpperCase() : 'U'}
                                            </div>
                                            <span style={{ fontWeight: '600', color: '#1f2937' }}>{p.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: '500', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                            {p.universityCode}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'inline-block', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', color: '#334155', fontFamily: 'monospace' }}>
                                            {p.emailRegex}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'inline-block', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px', color: '#334155', fontFamily: 'monospace' }}>
                                            {p.studentCodeRegex}
                                        </div>
                                    </td>
                                    <td className="actions-td">
                                        <div className="actions-cell">
                                            <button type="button" className="action-btn-text update-btn-text" onClick={() => handleUpdatePartnerClick(p)} title="Update Partner">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                Update
                                            </button>
                                            <button type="button" className="action-btn-text delete-btn-text" onClick={() => handleDeletePartnerClick(p.ui_id)} title="Delete Partner">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Card 2: Student Directory */}
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

                    <div style={{ padding: '24px 24px 16px' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Select Partner Institution</label>
                        <select
                            className="form-select"
                            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '10px' }}
                            value={selectedStudentPartner}
                            onChange={(e) => setSelectedStudentPartner(e.target.value)}
                        >
                            <option value="">-- Choose Partner --</option>
                            {partners.map(p => (
                                <option key={p.ui_id} value={p.ui_id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedStudentPartner ? (
                        <form onSubmit={(e) => e.preventDefault()}>
                            <table className="partners-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Student ID</th>
                                        <th>Full Name</th>
                                        <th>Email</th>
                                        <th>Major</th>
                                        <th style={{ textAlign: 'center' }}>Current</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s, index) => (
                                        <tr key={s.ui_id}>
                                            <td>{index + 1}</td>
                                            <td style={{ fontWeight: '600', color: '#1f2937' }}>{s.studentCode}</td>
                                            <td style={{ fontWeight: '500', color: '#374151' }}>{s.fullName}</td>
                                            <td style={{ color: '#4b5563' }}>{s.corporateEmail}</td>
                                            <td>
                                                <span style={{ fontWeight: '500', color: '#1e40af', backgroundColor: '#eff6ff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                                    {s.major}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={s.isCurrentStudent !== false}
                                                    disabled
                                                    style={{ width: '18px', height: '18px', cursor: 'default' }}
                                                />
                                            </td>
                                            <td className="actions-td">
                                                <div className="actions-cell">
                                                    <button type="button" className="action-btn-text update-btn-text" onClick={() => handleUpdateStudentClick(s)} title="Update Student">
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        Update
                                                    </button>
                                                    <button type="button" className="action-btn-text delete-btn-text" onClick={() => handleDeleteStudentClick(s.ui_id)} title="Delete Record">
                                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                                                No student records. Add a student to start.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </form>
                    ) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            Please select a partner institution above to view student records.
                        </div>
                    )}

                    {selectedStudentPartner && studentError && (
                        <div style={{ padding: '16px 24px', backgroundColor: '#fef2f2', borderTop: '1px solid #fee2e2', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {studentError}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal: Add/Edit Partner */}
            <AddPartnerModal 
                show={showAddPartnerModal} 
                onHide={() => {
                    setShowAddPartnerModal(false);
                    setEditPartner(null);
                }} 
                onCreate={handleCreateOrUpdatePartner}
                partners={partners}
                editPartner={editPartner}
            />

            {/* Modal: Add/Edit Student */}
            <AddStudentModal 
                show={showAddStudentModal} 
                onHide={() => {
                    setShowAddStudentModal(false);
                    setEditStudent(null);
                }} 
                onCreate={handleCreateOrUpdateStudent}
                partners={partners}
                selectedPartnerId={selectedStudentPartner}
                editStudent={editStudent}
            />

            {/* Confirm Dialog */}
            <ConfirmDialog 
                show={confirmDialog.show}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                cancelText={confirmDialog.cancelText}
                variant={confirmDialog.variant}
                onConfirm={confirmDialog.onConfirm}
                onCancel={confirmDialog.onCancel}
            />
        </div>
    );
};

export default PartnerVerification;
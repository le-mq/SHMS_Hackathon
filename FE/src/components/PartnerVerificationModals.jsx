import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

// 1. ConfirmDialog Component
export const ConfirmDialog = ({ show, title, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel", variant = "primary" }) => {
    return (
        <Modal show={show} onHide={onCancel} centered>
            <Modal.Header closeButton style={{ borderBottom: '1px solid #cbd5e1' }}>
                <Modal.Title style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '20px', fontSize: '14px', color: '#374151', fontWeight: 500 }}>
                {message}
            </Modal.Body>
            <Modal.Footer style={{ borderTop: 'none', padding: '0 20px 20px 20px', display: 'flex', gap: '10px' }}>
                <Button
                    variant="outline-secondary"
                    onClick={onCancel}
                    style={{ flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, borderRadius: '6px' }}
                >
                    {cancelText}
                </Button>
                <Button
                    variant={variant}
                    onClick={onConfirm}
                    style={{ 
                        flex: 1, 
                        padding: '8px', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        borderRadius: '6px',
                        backgroundColor: variant === 'danger' ? '#ef4444' : '#0d1b2a',
                        borderColor: variant === 'danger' ? '#ef4444' : '#0d1b2a',
                        color: 'white'
                    }}
                >
                    {confirmText}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

// 2. AddPartnerModal Component (Handles both Create and Edit)
export const AddPartnerModal = ({ show, onHide, onCreate, partners = [], editPartner }) => {
    const [name, setName] = useState('');
    const [universityCode, setUniversityCode] = useState('');
    const [emailRegex, setEmailRegex] = useState('^[a-zA-Z0-9._%+-]+@example\\.edu\\.vn$');
    const [studentCodeRegex, setStudentCodeRegex] = useState('^\\d+$');

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (show) {
            if (editPartner) {
                setName(editPartner.name || '');
                setUniversityCode(editPartner.universityCode || '');
                setEmailRegex(editPartner.emailRegex || '');
                setStudentCodeRegex(editPartner.studentCodeRegex || '');
            } else {
                setName('');
                setUniversityCode('');
                setEmailRegex('^[a-zA-Z0-9._%+-]+@example\\.edu\\.vn$');
                setStudentCodeRegex('^\\d+$');
            }
            setErrors({});
        }
    }, [show, editPartner]);

    const handleCreate = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedCode = universityCode.trim();
        const trimmedEmailRegex = emailRegex.trim();
        const trimmedStudentCodeRegex = studentCodeRegex.trim();

        const newErrors = {};

        if (!trimmedName) {
            newErrors.name = 'Institution name is required.';
        } else if (partners.some(p => p.ui_id !== (editPartner?.ui_id) && p.name && p.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
            newErrors.name = 'Institution name already exists.';
        }

        if (!trimmedCode) {
            newErrors.universityCode = 'Code (ID) is required.';
        } else if (partners.some(p => p.universityCode && p.ui_id !== (editPartner?.ui_id) && p.universityCode.trim().toLowerCase() === trimmedCode.toLowerCase())) {
            newErrors.universityCode = 'Code (ID) already exists.';
        }

        if (!trimmedEmailRegex) {
            newErrors.emailRegex = 'Email Regex is required.';
        } else {
            try {
                new RegExp(trimmedEmailRegex);
            } catch (err) {
                newErrors.emailRegex = 'Invalid regular expression format.';
            }
        }

        if (!trimmedStudentCodeRegex) {
            newErrors.studentCodeRegex = 'ID Regex is required.';
        } else {
            try {
                new RegExp(trimmedStudentCodeRegex);
            } catch (err) {
                newErrors.studentCodeRegex = 'Invalid regular expression format.';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onCreate({
            name: trimmedName,
            universityCode: trimmedCode,
            emailRegex: trimmedEmailRegex,
            studentCodeRegex: trimmedStudentCodeRegex
        });
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton style={{ borderBottom: '1px solid #cbd5e1' }}>
                <Modal.Title style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                    {editPartner ? 'Edit Partner' : 'Add Partner'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '24px' }}>
                <Form onSubmit={handleCreate} id="add-partner-form">
                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Institution Name *</Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                            }}
                            isInvalid={!!errors.name}
                            placeholder="e.g. FPT University"
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.name}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Code (ID) *</Form.Label>
                        <Form.Control
                            type="text"
                            value={universityCode}
                            onChange={(e) => {
                                setUniversityCode(e.target.value);
                                if (errors.universityCode) setErrors(prev => ({ ...prev, universityCode: '' }));
                            }}
                            isInvalid={!!errors.universityCode}
                            placeholder="e.g. FPT-HCMC"
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.universityCode}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Email Regex *</Form.Label>
                        <Form.Control
                            type="text"
                            value={emailRegex}
                            onChange={(e) => {
                                setEmailRegex(e.target.value);
                                if (errors.emailRegex) setErrors(prev => ({ ...prev, emailRegex: '' }));
                            }}
                            isInvalid={!!errors.emailRegex}
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.emailRegex}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>ID Regex *</Form.Label>
                        <Form.Control
                            type="text"
                            value={studentCodeRegex}
                            onChange={(e) => {
                                setStudentCodeRegex(e.target.value);
                                if (errors.studentCodeRegex) setErrors(prev => ({ ...prev, studentCodeRegex: '' }));
                            }}
                            isInvalid={!!errors.studentCodeRegex}
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.studentCodeRegex}</Form.Control.Feedback>
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer style={{ borderTop: 'none', padding: '0 24px 24px 24px', display: 'flex', gap: '12px' }}>
                <Button 
                    variant="outline-secondary" 
                    onClick={onHide}
                    style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, borderRadius: '6px' }}
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    form="add-partner-form"
                    style={{ 
                        flex: 1, 
                        padding: '10px', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        backgroundColor: '#0d1b2a', 
                        borderColor: '#0d1b2a', 
                        borderRadius: '6px',
                        color: 'white'
                    }}
                >
                    {editPartner ? 'Update' : 'Create'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

// 3. AddStudentModal Component (Handles both Create and Edit)
export const AddStudentModal = ({ show, onHide, onCreate, partners = [], selectedPartnerId, editStudent }) => {
    const [studentCode, setStudentCode] = useState('');
    const [fullName, setFullName] = useState('');
    const [university, setUniversity] = useState('');
    const [major, setMajor] = useState('');
    const [corporateEmail, setCorporateEmail] = useState('');
    const [isCurrentStudent, setIsCurrentStudent] = useState(true);

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (show) {
            if (editStudent) {
                setStudentCode(editStudent.studentCode || '');
                setFullName(editStudent.fullName || '');
                setUniversity(editStudent.university || '');
                setMajor(editStudent.major || '');
                setCorporateEmail(editStudent.corporateEmail || '');
                setIsCurrentStudent(editStudent.isCurrentStudent !== false);
            } else {
                setStudentCode('');
                setFullName('');
                setMajor('');
                setCorporateEmail('');
                setIsCurrentStudent(true);

                // Pre-populate with the selected university's name
                const partner = partners.find(p => String(p.ui_id) === String(selectedPartnerId));
                if (partner) {
                    setUniversity(partner.name);
                } else {
                    setUniversity('');
                }
            }
            setErrors({});
        }
    }, [show, selectedPartnerId, partners, editStudent]);

    const handleCreate = (e) => {
        e.preventDefault();
        const trimmedCode = studentCode.trim();
        const trimmedFullName = fullName.trim();
        const trimmedUniversity = university.trim();
        const trimmedMajor = major.trim();
        const trimmedEmail = corporateEmail.trim();

        const newErrors = {};

        // Find the selected partner to run regex validations
        const partner = partners.find(p => p.name && p.name.trim().toLowerCase() === trimmedUniversity.toLowerCase());

        if (!trimmedCode) {
            newErrors.studentCode = 'Student ID is required.';
        } else if (partner && partner.studentCodeRegex) {
            try {
                const regex = new RegExp(partner.studentCodeRegex);
                if (!regex.test(trimmedCode)) {
                    newErrors.studentCode = `Format error (Expected: ${partner.studentCodeRegex})`;
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (!trimmedFullName) {
            newErrors.fullName = 'Full Name is required.';
        }

        if (!trimmedUniversity) {
            newErrors.university = 'University is required.';
        }

        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!trimmedEmail) {
            newErrors.corporateEmail = 'Email is required.';
        } else if (!emailPattern.test(trimmedEmail)) {
            newErrors.corporateEmail = 'Invalid email format.';
        } else if (partner && partner.emailRegex) {
            try {
                const regex = new RegExp(partner.emailRegex);
                if (!regex.test(trimmedEmail)) {
                    newErrors.corporateEmail = 'Must match university domain logic.';
                }
            } catch (e) {
                console.error(e);
            }
        }

        if (!trimmedMajor) {
            newErrors.major = 'Major is required.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onCreate({
            studentCode: trimmedCode,
            fullName: trimmedFullName,
            university: trimmedUniversity,
            major: trimmedMajor,
            corporateEmail: trimmedEmail,
            isCurrentStudent
        });
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton style={{ borderBottom: '1px solid #cbd5e1' }}>
                <Modal.Title style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                    {editStudent ? 'Edit Student' : 'Add Student'}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ padding: '24px' }}>
                <Form onSubmit={handleCreate} id="add-student-form">
                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Full Name *</Form.Label>
                        <Form.Control
                            type="text"
                            value={fullName}
                            onChange={(e) => {
                                setFullName(e.target.value);
                                if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                            }}
                            isInvalid={!!errors.fullName}
                            placeholder="e.g. Nguyen Van A"
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.fullName}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Student ID *</Form.Label>
                        <Form.Control
                            type="text"
                            value={studentCode}
                            onChange={(e) => {
                                setStudentCode(e.target.value);
                                if (errors.studentCode) setErrors(prev => ({ ...prev, studentCode: '' }));
                            }}
                            isInvalid={!!errors.studentCode}
                            placeholder="e.g. SE150000"
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.studentCode}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>University *</Form.Label>
                        <Form.Select
                            value={university}
                            onChange={(e) => {
                                setUniversity(e.target.value);
                                if (errors.university) setErrors(prev => ({ ...prev, university: '' }));
                            }}
                            isInvalid={!!errors.university}
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        >
                            <option value="">-- Choose Partner --</option>
                            {partners.map(p => (
                                <option key={p.ui_id} value={p.name}>{p.name}</option>
                            ))}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.university}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Major *</Form.Label>
                        <Form.Control
                            type="text"
                            value={major}
                            onChange={(e) => {
                                setMajor(e.target.value);
                                if (errors.major) setErrors(prev => ({ ...prev, major: '' }));
                            }}
                            isInvalid={!!errors.major}
                            placeholder="e.g. Software Engineering"
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.major}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Corporate Email *</Form.Label>
                        <Form.Control
                            type="email"
                            value={corporateEmail}
                            onChange={(e) => {
                                setCorporateEmail(e.target.value);
                                if (errors.corporateEmail) setErrors(prev => ({ ...prev, corporateEmail: '' }));
                            }}
                            isInvalid={!!errors.corporateEmail}
                            placeholder="e.g. nva@fpt.edu.vn"
                            style={{ padding: '10px 12px', fontSize: '13px' }}
                        />
                        <Form.Control.Feedback type="invalid" style={{ fontWeight: 600 }}>{errors.corporateEmail}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Check
                            type="checkbox"
                            label="Current Student"
                            checked={isCurrentStudent}
                            onChange={(e) => setIsCurrentStudent(e.target.checked)}
                            style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer style={{ borderTop: 'none', padding: '0 24px 24px 24px', display: 'flex', gap: '12px' }}>
                <Button 
                    variant="outline-secondary" 
                    onClick={onHide}
                    style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, borderRadius: '6px' }}
                >
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    form="add-student-form"
                    style={{ 
                        flex: 1, 
                        padding: '10px', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        backgroundColor: '#0d1b2a', 
                        borderColor: '#0d1b2a', 
                        borderRadius: '6px',
                        color: 'white'
                    }}
                >
                    {editStudent ? 'Update' : 'Create'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

import { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

export const formatEmailRegexToSamples = (regex) => {
    if (!regex) return [];
    if (regex.startsWith('^[a-zA-Z0-9._%+-]+@(') && regex.endsWith(')$')) {
        let domainsStr = regex.substring(20, regex.length - 2);
        return domainsStr.split('|').map(d => 'student@' + d.replace(/\\\./g, '.'));
    }
    return [regex];
};

export const formatIdRegexToSamples = (regex) => {
    if (!regex) return [];
    if (regex.startsWith('^(') && regex.endsWith(')$')) {
        let core = regex.substring(2, regex.length - 2);
        let result = [];
        let regexPart = /((?:\([^)]+\)|[A-Za-z0-9\[\]-]*))\\d\{(\d+)\}/g;
        let match;
        let found = false;
        while ((match = regexPart.exec(core)) !== null) {
            found = true;
            let prefixesStr = match[1];
            let length = parseInt(match[2], 10);
            let dummyNumber = '123456789'.substring(0, Math.min(length, 9));
            if (length > 9) dummyNumber += Array(length - 9).fill('0').join('');

            if (prefixesStr.startsWith('(')) {
                let prefixes = prefixesStr.substring(1, prefixesStr.length - 1).split('|');
                prefixes.forEach(p => result.push(p.replace(/\[0-9\]/g, '0') + dummyNumber));
            } else {
                result.push(prefixesStr.replace(/\[0-9\]/g, '0') + dummyNumber);
            }
        }
        if (found) return result;
    }
    return [regex];
};

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

// 1.5 TagInput Component
export const TagInput = ({ tags, setTags, placeholder }) => {
    const [inputValue, setInputValue] = useState('');
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = inputValue.trim();
            if (val && !tags.includes(val)) {
                setTags([...tags, val]);
            }
            setInputValue('');
        }
    };
    const removeTag = (index) => {
        setTags(tags.filter((_, i) => i !== index));
    };
    return (
        <div style={{ border: '1px solid #dee2e6', borderRadius: '6px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px', backgroundColor: '#fff' }}>
            {tags.map((tag, i) => (
                <span key={i} style={{ background: '#f3f4f6', color: '#1f2937', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #e5e7eb' }}>
                    {tag}
                    <span style={{ cursor: 'pointer', fontWeight: 'bold', color: '#9ca3af' }} onClick={() => removeTag(i)}>&times;</span>
                </span>
            ))}
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                style={{ border: 'none', outline: 'none', flex: 1, minWidth: '150px', fontSize: '13px', padding: '4px', backgroundColor: 'transparent' }}
            />
        </div>
    );
};

// 2. AddPartnerModal Component (Handles both Create and Edit)
export const AddPartnerModal = ({ show, onHide, onCreate, partners = [], editPartner }) => {
    const [name, setName] = useState('');
    const [universityCode, setUniversityCode] = useState('');
    const [sampleEmails, setSampleEmails] = useState([]);
    const [sampleStudentIds, setSampleStudentIds] = useState([]);

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (show) {
            if (editPartner) {
                setName(editPartner.name || '');
                setUniversityCode(editPartner.universityCode || '');
                setSampleEmails(editPartner.sampleEmails?.length > 0 ? editPartner.sampleEmails : formatEmailRegexToSamples(editPartner.emailRegex));
                setSampleStudentIds(editPartner.sampleStudentIds?.length > 0 ? editPartner.sampleStudentIds : formatIdRegexToSamples(editPartner.studentCodeRegex));
            } else {
                setName('');
                setUniversityCode('');
                setSampleEmails([]);
                setSampleStudentIds([]);
            }
            setErrors({});
        }
    }, [show, editPartner]);

    const handleCreate = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const trimmedCode = universityCode.trim();

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

        if (sampleEmails.length === 0) {
            newErrors.sampleEmails = 'Please provide at least one sample email.';
        }

        if (sampleStudentIds.length === 0) {
            newErrors.sampleStudentIds = 'Please provide at least one sample student ID.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setErrors({});
        onCreate({
            name: trimmedName,
            universityCode: trimmedCode,
            sampleEmails,
            sampleStudentIds
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
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Sample Emails (Press Enter to add) *</Form.Label>
                        <TagInput tags={sampleEmails} setTags={(tags) => { setSampleEmails(tags); if(errors.sampleEmails) setErrors(prev => ({...prev, sampleEmails: ''})) }} placeholder="e.g. student@fpt.edu.vn" />
                        {errors.sampleEmails && <div style={{ color: '#dc3545', fontSize: '12.5px', marginTop: '4px', fontWeight: 600 }}>{errors.sampleEmails}</div>}
                        <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                            We will automatically generate the Email Regex based on these samples.
                        </Form.Text>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Sample Student IDs (Press Enter to add) *</Form.Label>
                        <TagInput tags={sampleStudentIds} setTags={(tags) => { setSampleStudentIds(tags); if(errors.sampleStudentIds) setErrors(prev => ({...prev, sampleStudentIds: ''})) }} placeholder="e.g. SE190001, 123456" />
                        {errors.sampleStudentIds && <div style={{ color: '#dc3545', fontSize: '12.5px', marginTop: '4px', fontWeight: 600 }}>{errors.sampleStudentIds}</div>}
                        <Form.Text className="text-muted" style={{ fontSize: '12px' }}>
                            We will automatically generate the ID Regex based on these samples.
                        </Form.Text>
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

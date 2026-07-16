import { useState, useEffect, useRef } from 'react';
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';
import NavbarHome from './NavbarHome';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1");

const convertTemplateToRegexStr = (template) => {
    if (!template) return "";
    const trimmed = template.trim();
    if (trimmed.startsWith("^") && trimmed.endsWith("$")) {
        return trimmed;
    }

    const parts = trimmed.split(',').map(part => {
        let p = part.trim();
        let escaped = "";
        for (let i = 0; i < p.length; i++) {
            const char = p[i];
            if (char === '#') {
                escaped += '[0-9]';
            } else if (char === '*') {
                escaped += '[a-zA-Z0-9._%+-]+';
            } else if (['\\', '.', '(', ')', '[', ']', '{', '}', '+', '$', '^', '|', '?'].includes(char)) {
                escaped += '\\' + char;
            } else {
                escaped += char;
            }
        }
        return escaped;
    });

    if (parts.length === 1) {
        return '^' + parts[0] + '$';
    } else {
        return '^(' + parts.join('|') + ')$';
    }
};

const UNIVERSITY_EXAMPLES = {
    "FPT": {
        codeExample: "SE123456",
        emailExample: "student@gmail.com"
    },
    "HCMUAF": {
        codeExample: "12345678",
        emailExample: "12345678@st.hcmuaf.edu.vn"
    },
    "HCMUT": {
        codeExample: "1234567",
        emailExample: "student@hcmut.edu.vn"
    },
    "HCMUS": {
        codeExample: "12345678",
        emailExample: "12345678@student.hcmus.edu.vn"
    },
    "HUFLIT": {
        codeExample: "20DH123456",
        emailExample: "20DH123456@st.huflit.edu.vn"
    }
};

const getUniversityExamples = (uni, currentStudentCode) => {
    if (!uni) return null;
    const code = uni.universityCode || "";
    if (code === "FPT" || uni.name?.includes("FPT")) {
        let isPreK18 = false;
        if (currentStudentCode && currentStudentCode.length >= 4) {
            const batchStr = currentStudentCode.substring(2, 4);
            const batchNum = parseInt(batchStr, 10);
            if (!isNaN(batchNum) && batchNum < 18) {
                isPreK18 = true;
            }
        }
        return {
            codeExample: "SE184567",
            emailExample: isPreK18 ? "student@fpt.edu.vn" : "student@gmail.com"
        };
    }
    if (UNIVERSITY_EXAMPLES[code]) {
        return UNIVERSITY_EXAMPLES[code];
    }
    const name = uni.name || "";
    if (name.includes("Nông Lâm")) return UNIVERSITY_EXAMPLES["HCMUAF"];
    if (name.includes("Bách Khoa")) return UNIVERSITY_EXAMPLES["HCMUT"];
    if (name.includes("Tự nhiên")) return UNIVERSITY_EXAMPLES["HCMUS"];
    if (name.includes("HUFLIT")) return UNIVERSITY_EXAMPLES["HUFLIT"];
    return null;
};

const generateExampleFromTemplate = (selectedUni, type, currentStudentCode) => {
    if (!selectedUni) return "";
    const examples = getUniversityExamples(selectedUni, currentStudentCode);
    if (examples) {
        return type === 'email' ? examples.emailExample : examples.codeExample;
    }
    
    const template = type === 'email' ? selectedUni.emailRegex : selectedUni.studentCodeRegex;
    if (!template) return "";
    const parts = template.split(',').map(part => {
        let p = part.trim();
        if (p.startsWith("^") && p.endsWith("$")) {
            if (type === 'email') return "student@university.edu.vn";
            return "SE123456";
        }
        
        let hasHash = p.includes('#');
        if (hasHash) {
            let hashCount = 0;
            p = p.replace(/#/g, () => {
                hashCount++;
                return hashCount.toString();
            });
        }
        
        p = p.replace(/\*/g, 'username');
        return p;
    });
    
    return parts.join(' or ');
};

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '', username: '',
        password: '', targetUniversity: '',
        studentCode: '', corporateEmail: '',
        major: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [universities, setUniversities] = useState([]);
    const [isExistingStudentAccount, setIsExistingStudentAccount] = useState(false);
    
    // Ref quản lý timer ẩn thông báo lỗi sau 4s
    const errorTimerRef = useRef(null);

    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                const res = await fetch(API_BASE + '/public/universities');
                if (res.ok) {
                    const data = await res.json();
                    setUniversities(data);
                }
            } catch (error) {
                console.error("Failed to fetch universities", error);
            }
        };
        fetchUniversities();

        return () => {
            if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        };
    }, []);

    // Hàm tự động xóa thông báo lỗi sau 4 giây
    const triggerAutoClearError = () => {
        if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
        errorTimerRef.current = setTimeout(() => {
            setServerError('');
            setIsExistingStudentAccount(false);
        }, 4000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = { ...formData, [name]: value };
        setFormData(updatedFormData);

        let newErrors = { ...errors };
        if (name === 'fullName') {
            const fullName = value;
            if (!fullName) {
                newErrors.fullName = 'Full name is required';
            } else if (fullName.length < 2 || fullName.length > 100) {
                newErrors.fullName = 'Full name must be between 2 and 100 characters';
            } else if (!/^[\p{L} '-]+$/u.test(fullName)) {
                newErrors.fullName = "Full name can only contain letters, spaces, and hyphens";
            } else {
                delete newErrors.fullName;
            }
        }
        if (name === 'username') {
            const username = value;
            if (!username) {
                newErrors.username = 'Username is required';
            } else if (username.length < 4 || username.length > 30) {
                newErrors.username = 'Username must be between 4 and 30 characters';
            } else if (!/^[a-zA-Z0-9._]+$/.test(username)) {
                newErrors.username = 'Username can only contain letters, numbers, underscores, and dots';
            } else {
                delete newErrors.username;
            }
        }
        if (name === 'password') {
            const password = value;
            if (!password) {
                newErrors.password = 'Password is required';
            } else if (password.length < 8 || password.length > 32) {
                newErrors.password = 'Password must be between 8 and 32 characters';
            } else if (/\s/.test(password)) {
                newErrors.password = 'Password cannot contain spaces';
            } else if (!/[a-z]/.test(password)) {
                newErrors.password = 'Password must contain at least one lowercase letter';
            } else if (!/[A-Z]/.test(password)) {
                newErrors.password = 'Password must contain at least one uppercase letter';
            } else if (!/\d/.test(password)) {
                newErrors.password = 'Password must contain at least one digit';
            } else if (!/[^a-zA-Z\d\s]/.test(password)) {
                newErrors.password = 'Password must contain at least one special character';
            } else {
                delete newErrors.password;
            }
        }
        if (name === 'targetUniversity') {
            if (!value) {
                newErrors.targetUniversity = 'Please select a university';
            } else {
                delete newErrors.targetUniversity;
            }
        }
        if (name === 'studentCode' || name === 'corporateEmail' || name === 'targetUniversity') {
            const codeVal = name === 'studentCode' ? value : formData.studentCode;
            const emailVal = name === 'corporateEmail' ? value : formData.corporateEmail;
            const uniVal = name === 'targetUniversity' ? value : formData.targetUniversity;
            const selectedUni = universities.find(u => u.name === uniVal);

            // Validate Student Code
            const shouldValidateCode = name === 'studentCode' || (name === 'targetUniversity' && formData.studentCode);
            if (shouldValidateCode) {
                if (!codeVal) {
                    newErrors.studentCode = 'Student Identification Number is required';
                } else if (selectedUni && selectedUni.studentCodeRegex) {
                    try {
                        const studentCodePattern = new RegExp(convertTemplateToRegexStr(selectedUni.studentCodeRegex));
                        if (!studentCodePattern.test(codeVal)) {
                            newErrors.studentCode = `Student ID does not match the required format for ${selectedUni.name}. Example: ${generateExampleFromTemplate(selectedUni, 'code', codeVal)}`;
                        } else {
                            delete newErrors.studentCode;
                        }
                    } catch (e) {}
                } else {
                    delete newErrors.studentCode;
                }
            }

            // Validate Email
            const shouldValidateEmail = name === 'corporateEmail' || (name === 'targetUniversity' && formData.corporateEmail) || (name === 'studentCode' && formData.corporateEmail);
            if (shouldValidateEmail) {
                if (!emailVal) {
                    newErrors.corporateEmail = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+$/.test(emailVal)) {
                    newErrors.corporateEmail = 'Email must have exactly one @, with a name before and a domain after';
                } else if (selectedUni && selectedUni.emailRegex) {
                    try {
                        let isFptBeforeK18 = false;
                        if ((selectedUni.universityCode === "FPT" || selectedUni.name?.includes("FPT")) && codeVal && codeVal.length >= 4) {
                            const batchStr = codeVal.substring(2, 4);
                            const batchNum = parseInt(batchStr, 10);
                            if (!isNaN(batchNum) && batchNum < 18) {
                                isFptBeforeK18 = true;
                            }
                        }

                        if (isFptBeforeK18) {
                            const fptPattern = /^[a-zA-Z0-9._%+-]+@fpt\.edu\.vn$/;
                            if (!fptPattern.test(emailVal)) {
                                newErrors.corporateEmail = `Email must end with @fpt.edu.vn for students before K18. Example: student@fpt.edu.vn`;
                            } else {
                                delete newErrors.corporateEmail;
                            }
                        } else {
                            const emailPattern = new RegExp(convertTemplateToRegexStr(selectedUni.emailRegex));
                            if (!emailPattern.test(emailVal)) {
                                newErrors.corporateEmail = `Email does not match the required format for ${selectedUni.name}. Example: ${generateExampleFromTemplate(selectedUni, 'email', codeVal)}`;
                            } else {
                                delete newErrors.corporateEmail;
                            }
                        }
                    } catch (e) {}
                } else {
                    delete newErrors.corporateEmail;
                }
            }
        }
        if (name === 'major') {
            if (!value) {
                newErrors.major = 'Major is required';
            } else {
                delete newErrors.major;
            }
        }
        setErrors(newErrors);
    };

    const isFormInvalid = !formData.fullName || !formData.username || !formData.password ||
        !formData.targetUniversity || !formData.studentCode || !formData.corporateEmail ||
        !formData.major || Object.keys(errors).length > 0;

    const validateForm = (data) => {
        let newErrors = {};

        // Full Name
        const fullName = data.fullName;
        if (!fullName) {
            newErrors.fullName = 'Full name is required';
        } else if (fullName.length < 2 || fullName.length > 100) {
            newErrors.fullName = 'Full name must be between 2 and 100 characters';
        } else if (!/^[\p{L} '-]+$/u.test(fullName)) {
            newErrors.fullName = "Full name can only contain letters, spaces, and hyphens";
        }

        // Username
        const username = data.username;
        if (!username) {
            newErrors.username = 'Username is required';
        } else if (username.length < 4 || username.length > 30) {
            newErrors.username = 'Username must be between 4 and 30 characters';
        } else if (!/^[a-zA-Z0-9._]+$/.test(username)) {
            newErrors.username = 'Username can only contain letters, numbers, underscores, and dots';
        }

        // Password
        const password = data.password;
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8 || password.length > 32) {
            newErrors.password = 'Password must be between 8 and 32 characters';
        } else if (/\s/.test(password)) {
            newErrors.password = 'Password cannot contain spaces';
        } else if (!/[a-z]/.test(password)) {
            newErrors.password = 'Password must contain at least one lowercase letter';
        } else if (!/[A-Z]/.test(password)) {
            newErrors.password = 'Password must contain at least one uppercase letter';
        } else if (!/\d/.test(password)) {
            newErrors.password = 'Password must contain at least one digit';
        } else if (!/[^a-zA-Z\d\s]/.test(password)) {
            newErrors.password = 'Password must contain at least one special character';
        }

        // University
        if (!data.targetUniversity) {
            newErrors.targetUniversity = 'Please select a university';
        }

        // Student Code & Email
        const selectedUni = universities.find(u => u.name === data.targetUniversity);
        const studentCode = data.studentCode;
        const email = data.corporateEmail;

        if (!studentCode) {
            newErrors.studentCode = 'Student Identification Number is required';
        } else if (selectedUni && selectedUni.studentCodeRegex) {
            try {
                const studentCodePattern = new RegExp(convertTemplateToRegexStr(selectedUni.studentCodeRegex));
                if (!studentCodePattern.test(studentCode)) {
                    newErrors.studentCode = `Student ID does not match the required format for ${selectedUni.name}. Example: ${generateExampleFromTemplate(selectedUni, 'code', studentCode)}`;
                }
            } catch (e) {
                console.error('Invalid student code regex pattern', e);
            }
        }

        if (!email) {
            newErrors.corporateEmail = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+$/.test(email)) {
            newErrors.corporateEmail = 'Email must have exactly one @, with a name before and a domain after';
        } else if (selectedUni && selectedUni.emailRegex) {
            try {
                let isFptBeforeK18 = false;
                if ((selectedUni.universityCode === "FPT" || selectedUni.name?.includes("FPT")) && studentCode && studentCode.length >= 4) {
                    const batchStr = studentCode.substring(2, 4);
                    const batchNum = parseInt(batchStr, 10);
                    if (!isNaN(batchNum) && batchNum < 18) {
                        isFptBeforeK18 = true;
                    }
                }

                if (isFptBeforeK18) {
                    const fptPattern = /^[a-zA-Z0-9._%+-]+@fpt\.edu\.vn$/;
                    if (!fptPattern.test(email)) {
                        newErrors.corporateEmail = `Email must end with @fpt.edu.vn for students before K18. Example: student@fpt.edu.vn`;
                    }
                } else {
                    const emailPattern = new RegExp(convertTemplateToRegexStr(selectedUni.emailRegex));
                    if (!emailPattern.test(email)) {
                        newErrors.corporateEmail = `Email does not match the required format for ${selectedUni.name}. Example: ${generateExampleFromTemplate(selectedUni, 'email', studentCode)}`;
                    }
                }
            } catch (e) {
                console.error('Invalid email regex pattern', e);
            }
        }

        // Major
        if (!data.major) {
            newErrors.major = 'Major is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        setSuccessMsg('');
        setIsExistingStudentAccount(false);

        const cleanedData = {
            fullName: formData.fullName.trim().replace(/\s+/g, ' '),
            username: formData.username.trim(),
            password: formData.password,
            targetUniversity: formData.targetUniversity.trim(),
            studentCode: formData.studentCode.trim(),
            corporateEmail: formData.corporateEmail.trim(),
            major: formData.major.trim()
        };

        setFormData(cleanedData);

        if (!validateForm(cleanedData)) return;
        setIsLoading(true);
        try {
            const response = await fetch(API_BASE + '/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleanedData)
            });
            const data = await response.json();
            if (!response.ok) {
                const rawError = data.error || data.message || "Registration failed";
                const errorStr = rawError.toLowerCase();

                if (errorStr.includes("this student already has an account")) {
                    setIsExistingStudentAccount(true);
                    setServerError('');
                    setSuccessMsg('');
                    triggerAutoClearError(); // Tự động xóa lỗi sau 4s
                    return;
                }

                let fieldErrors = {};
                let friendlyMsg = "";

                if (errorStr.includes("username is already taken")) {
                    fieldErrors.username = (
                        <span>
                            Username already exists. Please click <Link to="/login" style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 'bold' }}>Login</Link> if this is your account.
                        </span>
                    );
                    friendlyMsg = "Error: Username is already registered.";
                } else if (errorStr.includes("username")) {
                    fieldErrors.username = "Invalid or already taken username.";
                    friendlyMsg = "Error: Username is invalid or already taken.";
                }

                if (errorStr.includes("student code is already registered") || errorStr.includes("student_code is already registered")) {
                    fieldErrors.studentCode = (
                        <span>
                            This Student ID has already been registered. Please click <Link to="/login" style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 'bold' }}>Login</Link> to sign in.
                        </span>
                    );
                    friendlyMsg = "Error: Student Identification Number is already registered.";
                } else if (errorStr.includes("student code format") || errorStr.includes("student_code format") || errorStr.includes("student code")) {
                    if (errorStr.includes("already registered")) {
                        fieldErrors.studentCode = (
                            <span>
                                This Student ID has already been registered. Please click <Link to="/login" style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 'bold' }}>Login</Link> to sign in.
                            </span>
                        );
                        friendlyMsg = "Error: Student ID is already registered.";
                    } else {
                        fieldErrors.studentCode = "Student ID does not match the university's required format.";
                        friendlyMsg = "Error: Invalid Student ID format.";
                    }
                }

                if (errorStr.includes("email is already registered")) {
                    fieldErrors.corporateEmail = (
                        <span>
                            This email has already been registered. Please click <Link to="/login" style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 'bold' }}>Login</Link> to sign in.
                        </span>
                    );
                    friendlyMsg = "Error: Corporate email is already registered.";
                } else if (errorStr.includes("email format") || errorStr.includes("email")) {
                    if (errorStr.includes("already registered")) {
                        fieldErrors.corporateEmail = (
                            <span>
                                This email has already been registered. Please click <Link to="/login" style={{ color: '#ef4444', textDecoration: 'underline', fontWeight: 'bold' }}>Login</Link> to sign in.
                            </span>
                        );
                        friendlyMsg = "Error: Email is already registered.";
                    } else if (errorStr.includes("format")) {
                        fieldErrors.corporateEmail = "Corporate email format is invalid for this university.";
                        friendlyMsg = "Error: Invalid corporate email format.";
                    }
                }

                if (errorStr.includes("full name does not match") || errorStr.includes("full name mismatch")) {
                    fieldErrors.fullName = "Full name does not match the university's verification records.";
                    friendlyMsg = "Error: Full name does not match university records (please verify spelling and accents).";
                }

                if (errorStr.includes("major does not match") || errorStr.includes("major mismatch")) {
                    fieldErrors.major = "Major does not match the university's verification records.";
                    friendlyMsg = "Error: Major does not match university records (e.g., Software Engineering).";
                }

                if (errorStr.includes("university not found")) {
                    fieldErrors.targetUniversity = "This university could not be found.";
                    friendlyMsg = "Error: University not found.";
                }

                if (errorStr.includes("student not found in university verification data") || errorStr.includes("verification record not found")) {
                    fieldErrors.studentCode = "Student ID not found in the university's verification database.";
                    fieldErrors.corporateEmail = "Corporate email not found in the university's verification database.";
                    friendlyMsg = "Error: Could not find your verification records in the university's database. Please check your Student ID and Corporate Email.";
                } else if (errorStr.includes("not verified as a current student") || errorStr.includes("not current student")) {
                    friendlyMsg = "Registration Error: You are not verified as a current student of this university.";
                }

                if (!friendlyMsg) {
                    friendlyMsg = rawError;
                }

                if (Object.keys(fieldErrors).length > 0) {
                    setErrors(prev => ({ ...prev, ...fieldErrors }));
                }

                setServerError(friendlyMsg);
                triggerAutoClearError(); // Tự động xóa lỗi sau 4s
                return;
            }

            setSuccessMsg(data.message || 'Registration successful! Redirecting to email verification page...');
            setTimeout(() => {
                navigate('/verify-email', { state: { username: cleanedData.username } });
            }, 1500);

        } catch (err) {
            setServerError('Unable to connect to the server. Please try again later.');
            triggerAutoClearError(); // Tự động xóa lỗi sau 4s
        } finally {
            setIsLoading(false);
        }
    };

    const selectedUni = universities.find(u => u.name === formData.targetUniversity);
    const studentCodePlaceholder = selectedUni && selectedUni.studentCodeRegex
        ? `e.g. ${generateExampleFromTemplate(selectedUni, 'code', formData.studentCode)}`
        : "e.g. SE123456";
    const emailPlaceholder = selectedUni && selectedUni.emailRegex
        ? `e.g. ${generateExampleFromTemplate(selectedUni, 'email', formData.studentCode)}`
        : "example@university.edu.vn";

    return (
        <>
            <NavbarHome />
            <div style={{ background: '#f4f7fa', minHeight: '100vh', paddingBottom: '40px' }}>
                <div className="register-container">
                    <div className="register-card">
                        <h1 className="register-title">Create System Account</h1>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input type="text" name="fullName" className={`form-input ${errors.fullName ? 'is-invalid' : ''}`} placeholder="Enter your full name" value={formData.fullName} onChange={handleChange} />
                                {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input type="text" name="username" className={`form-input ${errors.username ? 'is-invalid' : ''}`} placeholder="Choose a username" value={formData.username} onChange={handleChange} />
                                {errors.username && <div className="invalid-feedback">{errors.username}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input type={showPassword ? "text" : "password"} name="password"
                                           className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                                           placeholder="••••••••" value={formData.password}
                                           onChange={handleChange} style={{ paddingRight: '40px', width: '100%' }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            style={{ position: 'absolute', right: '7px', background: 'none', border: 'none', cursor: 'pointer',
                                                color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: '10px' }}
                                    >{showPassword ? (
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
                                {errors.password && <div className="invalid-feedback" style={{ display: 'block' }}>{errors.password}</div>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">University</label>
                                <select name="targetUniversity" className={`form-select ${errors.targetUniversity ? 'is-invalid' : ''}`} value={formData.targetUniversity} onChange={handleChange} >
                                    <option value="">Select University</option>
                                    {universities.map((uni, idx) => (
                                        <option key={idx} value={uni.name}>{uni.name}</option>
                                    ))}
                                </select>
                                {errors.targetUniversity && <div className="invalid-feedback">{errors.targetUniversity}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Student Identification Number</label>
                                <input type="text" name="studentCode" className={`form-input ${errors.studentCode ? 'is-invalid' : ''}`} placeholder={studentCodePlaceholder} value={formData.studentCode} onChange={handleChange} />
                                {errors.studentCode && <div className="invalid-feedback">{errors.studentCode}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" name="corporateEmail" className={`form-input ${errors.corporateEmail ? 'is-invalid' : ''}`} placeholder={emailPlaceholder} value={formData.corporateEmail} onChange={handleChange} />
                                {errors.corporateEmail && <div className="invalid-feedback">{errors.corporateEmail}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Major</label>
                                <input type="text" name="major" className={`form-input ${errors.major ? 'is-invalid' : ''}`} placeholder="e.g. Software Engineering" value={formData.major} onChange={handleChange} />
                                {errors.major && <div className="invalid-feedback">{errors.major}</div>}
                            </div>
                            <button type="submit" className="register-btn" disabled={isLoading || isFormInvalid}>
                                {isLoading ? 'Registering...' : 'Register Account'}
                            </button>
                            {isExistingStudentAccount ? (
                                <div className="alert-error" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '15px', marginTop: '15px' }}>
                                    <div style={{ fontWeight: 'bold' }}>This student already has an account.</div>
                                    <div>
                                        Please click <Link to="/login" style={{ color: '#f20202', textDecoration: 'underline', fontWeight: 'bold' }}>Login</Link> to sign in.
                                    </div>
                                    <Link to="/login" className="register-btn" style={{ textDecoration: 'none', background: '#3b82f6', color: '#ffffff', padding: '8px 16px', borderRadius: '6px', fontSize: '0.9em', marginTop: '5px', textAlign: 'center', width: 'auto' }}>
                                        Go to Login
                                    </Link>
                                </div>
                            ) : serverError ? (
                                <div className="alert-error">{serverError}</div>
                            ) : successMsg ? (
                                <div className="alert-success">{successMsg}</div>
                            ) : null}
                        </form>
                        <div className="login-link-container">
                            Already have an account? <Link to="/login" className="login-link">Login</Link>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;
import { useState, useEffect } from 'react';
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';
import NavbarHome from './NavbarHome';

const API_BASE = "import.meta.env.VITE_API_BASE_URL || "import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1""";

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
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = { ...formData, [name]: value };
        setFormData(updatedFormData);

        let newErrors = { ...errors };
        if (name === 'fullName') {
            const fullName = value;
            if (!fullName) {
                newErrors.fullName = 'Full Name is required';
            } else if (fullName.length < 2 || fullName.length > 100) {
                newErrors.fullName = 'Full Name must be between 2 and 100 characters';
            } else if (!/^[\p{L} '-]+$/u.test(fullName)) {
                newErrors.fullName = "Full Name can only contain letters, spaces, apostrophes, and hyphens";
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
                newErrors.username = 'Username can only contain alphanumeric characters, underscores, and dots';
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
                newErrors.password = 'Password must not contain spaces';
            } else if (!/[a-z]/.test(password)) {
                newErrors.password = 'Password must contain at least one lowercase letter';
            } else if (!/[A-Z]/.test(password)) {
                newErrors.password = 'Password must contain at least one uppercase letter';
            } else if (!/\d/.test(password)) {
                newErrors.password = 'Password must contain at least one number';
            } else if (!/[^a-zA-Z\d\s]/.test(password)) {
                newErrors.password = 'Password must contain at least one special character';
            } else {
                delete newErrors.password;
            }
        }
        if (name === 'targetUniversity') {
            if (!value) {
                newErrors.targetUniversity = 'Please select a University';
            } else {
                delete newErrors.targetUniversity;
            }
        }
        if (name === 'studentCode' || name === 'targetUniversity') {
            const codeVal = name === 'studentCode' ? value : formData.studentCode;
            const uniVal = name === 'targetUniversity' ? value : formData.targetUniversity;
            const selectedUni = universities.find(u => u.name === uniVal);
            if (!codeVal) {
                newErrors.studentCode = 'Student Identification Number is required';
            } else if (selectedUni && selectedUni.studentCodeRegex) {
                try {
                    const studentCodePattern = new RegExp(selectedUni.studentCodeRegex);
                    if (!studentCodePattern.test(codeVal)) {
                        newErrors.studentCode = 'Invalid student code format';
                    } else {
                        delete newErrors.studentCode;
                    }
                } catch (e) {}
            } else {
                delete newErrors.studentCode;
            }
        }
        if (name === 'corporateEmail' || name === 'targetUniversity') {
            const emailVal = name === 'corporateEmail' ? value : formData.corporateEmail;
            const uniVal = name === 'targetUniversity' ? value : formData.targetUniversity;
            const selectedUni = universities.find(u => u.name === uniVal);
            if (!emailVal) {
                newErrors.corporateEmail = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+$/.test(emailVal)) {
                newErrors.corporateEmail = 'Email must have exactly one @, with a name before and a domain after';
            } else if (selectedUni && selectedUni.emailRegex) {
                try {
                    const emailPattern = new RegExp(selectedUni.emailRegex);
                    if (!emailPattern.test(emailVal)) {
                        newErrors.corporateEmail = 'Invalid university email format';
                    } else {
                        delete newErrors.corporateEmail;
                    }
                } catch (e) {}
            } else {
                delete newErrors.corporateEmail;
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
            newErrors.fullName = 'Full Name is required';
        } else if (fullName.length < 2 || fullName.length > 100) {
            newErrors.fullName = 'Full Name must be between 2 and 100 characters';
        } else if (!/^[\p{L} '-]+$/u.test(fullName)) {
            newErrors.fullName = "Full Name can only contain letters, spaces, apostrophes, and hyphens";
        }

        // Username
        const username = data.username;
        if (!username) {
            newErrors.username = 'Username is required';
        } else if (username.length < 4 || username.length > 30) {
            newErrors.username = 'Username must be between 4 and 30 characters';
        } else if (!/^[a-zA-Z0-9._]+$/.test(username)) {
            newErrors.username = 'Username can only contain alphanumeric characters, underscores, and dots';
        }

        // Password
        const password = data.password;
        if (!password) {
            newErrors.password = 'Password is required';
        } else if (password.length < 8 || password.length > 32) {
            newErrors.password = 'Password must be between 8 and 32 characters';
        } else if (/\s/.test(password)) {
            newErrors.password = 'Password must not contain spaces';
        } else if (!/[a-z]/.test(password)) {
            newErrors.password = 'Password must contain at least one lowercase letter';
        } else if (!/[A-Z]/.test(password)) {
            newErrors.password = 'Password must contain at least one uppercase letter';
        } else if (!/\d/.test(password)) {
            newErrors.password = 'Password must contain at least one number';
        } else if (!/[^a-zA-Z\d\s]/.test(password)) {
            newErrors.password = 'Password must contain at least one special character';
        }

        // University
        if (!data.targetUniversity) {
            newErrors.targetUniversity = 'Please select a University';
        }

        // Student Code & Email
        const selectedUni = universities.find(u => u.name === data.targetUniversity);
        const studentCode = data.studentCode;
        const email = data.corporateEmail;

        if (!studentCode) {
            newErrors.studentCode = 'Student Identification Number is required';
        } else if (selectedUni && selectedUni.studentCodeRegex) {
            try {
                const studentCodePattern = new RegExp(selectedUni.studentCodeRegex);
                if (!studentCodePattern.test(studentCode)) {
                    newErrors.studentCode = 'Invalid student code format';
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
                const emailPattern = new RegExp(selectedUni.emailRegex);
                if (!emailPattern.test(email)) {
                    newErrors.corporateEmail = 'Invalid university email format';
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
                const errorStr = (data.error || data.message || "").toLowerCase();
                let fieldErrors = {};
                let hasMappedField = false;

                if (errorStr.includes("username")) {
                    fieldErrors.username = data.error || data.message;
                    hasMappedField = true;
                }
                if (errorStr.includes("email")) {
                    fieldErrors.corporateEmail = data.error || data.message;
                    hasMappedField = true;
                }
                if (errorStr.includes("studentcode")) {
                    fieldErrors.studentCode = data.error || data.message;
                    hasMappedField = true;
                }

                if (hasMappedField) {
                    setErrors(prev => ({ ...prev, ...fieldErrors }));
                    setServerError("Registration failed. Please check the fields above.");
                } else {
                    setServerError(data.message || data.error || "Registration failed");
                }
                return;
            }

            setSuccessMsg(data.message || 'Registration successful! Redirecting to email verification...');
            setTimeout(() => {
                navigate('/verify-email', { state: { username: cleanedData.username } });
            }, 1500);

        } catch (err) {
            setServerError('Failed to connect to the server. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

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
                                <input type="text" name="studentCode" className={`form-input ${errors.studentCode ? 'is-invalid' : ''}`} placeholder="e.g. SE123456" value={formData.studentCode} onChange={handleChange} />
                                {errors.studentCode && <div className="invalid-feedback">{errors.studentCode}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" name="corporateEmail" className={`form-input ${errors.corporateEmail ? 'is-invalid' : ''}`} placeholder="example@university.edu.vn" value={formData.corporateEmail} onChange={handleChange} />
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
                            {serverError ? (<div className="alert-error">{serverError}</div>
                            ) : successMsg ? (<div className="alert-success">{successMsg}</div>
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
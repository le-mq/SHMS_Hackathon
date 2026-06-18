import { useState, useEffect } from 'react';
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';
import NavbarHome from './NavbarHome';

const API_BASE = "http://localhost:8080/api/v1";
const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        password: '',
        targetUniversity: '',
        mssv: '',
        corporateEmail: '',
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

    const validateRegex = {
        username: /^[a-zA-Z0-9_]{4,20}$/,
        password: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const newErr = { ...prev };
                delete newErr[name];
                return newErr;
            });
        }
    };

    const validateForm = () => {
        let newErrors = {};

        if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
        if (!validateRegex.username.test(formData.username)) {
            newErrors.username = 'Username must be 4-20 chars (alphanumeric or underscore)';
        }
        if (!validateRegex.password.test(formData.password)) {
            newErrors.password = 'Password minimum 8 characters, at least one letter and one number';
        }
        if (!formData.targetUniversity) {
            newErrors.targetUniversity = 'Please select a University';
        }

        const selectedUni = universities.find(u => u.name === formData.targetUniversity);

        if (selectedUni) {
            if (selectedUni.studentCodeRegex) {
                try {
                    const studentCodePattern = new RegExp(selectedUni.studentCodeRegex);
                    if (!formData.mssv.trim()) {
                        newErrors.mssv = 'Student Identification Number is required';
                    }
                    else {
                        const studentCodePattern = new RegExp(selectedUni.studentCodeRegex);
                        if (!studentCodePattern.test(formData.mssv)) {
                            newErrors.mssv = 'Invalid student code format';
                        }
                    }
                } catch (e) {
                    console.error('Invalid student code regex pattern', e);
                }
            } else {
                if (!formData.mssv.trim()) newErrors.mssv = 'Student Identification Number is required';
            }

            if (selectedUni.emailRegex) {
                try {
                    const emailPattern = new RegExp(selectedUni.emailRegex);
                    if (!formData.corporateEmail.trim()) {
                        newErrors.corporateEmail = 'Email is required';
                    }
                    else {
                        const emailPattern = new RegExp(selectedUni.emailRegex);
                        if (!emailPattern.test(formData.corporateEmail)) {
                            newErrors.corporateEmail = 'Invalid university email format';
                        }
                    }
                } catch (e) {
                    console.error('Invalid email regex pattern', e);
                }
            } else {
                if (!formData.corporateEmail.trim()) {
                    newErrors.corporateEmail = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.corporateEmail)) {
                    newErrors.corporateEmail = 'Invalid Email format';
                }
            }
        } else {
            if (!formData.mssv.trim()) newErrors.mssv = 'Student Identification Number is required';
            if (!formData.corporateEmail.trim()) {
                newErrors.corporateEmail = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.corporateEmail)) {
                newErrors.corporateEmail = 'Invalid Email format';
            }
        }

        if (!formData.major.trim()) newErrors.major = 'Major is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setServerError('');
        setSuccessMsg('');

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await fetch(API_BASE + '/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.error?.toLowerCase().includes("username")) {
                    setErrors(prev => ({ ...prev, username: data.error }));
                }
                else if (data.error?.toLowerCase().includes("email")) {
                    setErrors(prev => ({ ...prev, corporateEmail: data.error }));
                }
                else if (data.error?.toLowerCase().includes("student")) {
                    setErrors(prev => ({ ...prev, mssv: data.error }));
                }
                else {
                    setServerError(data.error || "Registration failed");
                }
                return;
            } else {
                setSuccessMsg(data.message || 'Registration successful! Redirecting to email verification...');
                setTimeout(() => {
                    navigate('/verify-email', { state: { username: formData.username } });
                }, 1500);
            }
        } catch (err) {
            setServerError('Failed to connect to the server. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <NavbarHome></NavbarHome>
            <div style={{ background: '#f4f7fa', minHeight: '100vh', paddingBottom: '40px' }}>
                <div className="register-container">
                    <div className="register-card">
                        <h1 className="register-title">Create System Account</h1>
                        {serverError && <div className="alert alert-error">{serverError}</div>}
                        {successMsg && <div className="alert alert-success">{successMsg}</div>}
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
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        className={`form-input ${errors.password ? 'is-invalid' : ''}`}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        style={{ paddingRight: '40px', width: '100%' }} // Chừa khoảng trống bên phải cho con mắt
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute',
                                            right: '7px',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#64748b',
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: '10px'
                                        }}
                                    >
                                        {showPassword ? (
                                            // Icon Mắt Mở
                                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        ) : (
                                            // Icon Mắt Đóng (Gạch chéo)
                                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {/* Dòng báo lỗi đẩy xuống dưới cùng gọn gàng */}
                                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
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
                                <input type="text" name="mssv" className={`form-input ${errors.mssv ? 'is-invalid' : ''}`} placeholder="e.g. SE123456" value={formData.mssv} onChange={handleChange} />
                                {errors.mssv && <div className="invalid-feedback">{errors.mssv}</div>}
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

                            <button type="submit" className="register-btn" disabled={isLoading}>
                                {isLoading ? 'Registering...' : 'Register Account'}
                            </button>
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

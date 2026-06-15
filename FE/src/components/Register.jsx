import { useState, useEffect } from 'react';
import './Register.css';
import { Link, useNavigate } from 'react-router-dom';
import NavbarHome from './NavbarHome';
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

    const [errors, setErrors] = useState({});
    const [serverError, setServerError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [universities, setUniversities] = useState([]);

    useEffect(() => {
        const fetchUniversities = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/v1/public/universities');
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
            setErrors(prev => ({ ...prev, [name]: null }));
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
                    if (!studentCodePattern.test(formData.mssv)) {
                        newErrors.mssv = 'Invalid student code format';
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
                    if (!emailPattern.test(formData.corporateEmail)) {
                        newErrors.corporateEmail = 'Invalid university email format';
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
            const response = await fetch('http://localhost:8080/api/v1/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                setServerError(data.error || 'Registration failed');
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
                                <input type="password" name="password" className={`form-input ${errors.password ? 'is-invalid' : ''}`} placeholder="••••••••" value={formData.password} onChange={handleChange} />
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

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import NavbarHome from './NavbarHome.jsx';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const loginSuccess = (data) => {
        localStorage.setItem('shms_token', data.token);
        if (data.role)
            localStorage.setItem('shms_role', data.role);
        if (data.allRoles)
            localStorage.setItem('shms_allRoles', JSON.stringify(data.allRoles));
        if (data.username)
            localStorage.setItem('shms_user', data.username);
        if (data.fullName) {
            localStorage.setItem('shms_fullname', data.fullName);
            localStorage.setItem('shms_fullname_' + data.username, data.fullName);
        }
        const role = data.role || '';
        const roleRoutes = {
            ADMIN: '/admin/config',
            JUDGE: '/judge/workspace',
            MENTOR: '/mentor/workspace',
            STUDENT: '/student/dashboard',
        };
        navigate(roleRoutes[role] || '/');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.password) {
            setError('Please enter both username and password');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch("http://localhost:8080/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: formData.username, password: formData.password })
            }
            );
            if (!response.ok)
                throw new Error();
            const data = await response.json();
            loginSuccess(data);
        } catch {

            try {
                const localRes = await fetch("/testFE.json");
                const localJson = await localRes.json();
                const user = localJson.loginMock?.find(u => u.username === formData.username && u.password === formData.password);
                if (!user) {
                    setError("Invalid username or password");
                    return;
                }
                loginSuccess(user);
            }
            catch {
                setError("Failed to connect to server.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <NavbarHome />
            <div className="login-container">
                <div className="login-header">
                    <h1 className="login-title">Account Authentication</h1>
                    <p className="login-subtitle">Access your S-HMS administrative or participant portal</p>
                </div>
                <div className="login-card">
                    <h3>Sign In</h3>
                    <p>Enter your credentials to continue</p>
                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <div className="form-group-header">
                                <label className="form-label">Username</label>
                            </div>
                            <div className="input-icon-wrapper">
                                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <input
                                    type="text"
                                    name="username"
                                    className="form-input-with-icon"
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="form-group-header">
                                <label className="form-label">Password</label>
                            </div>
                            <div className="input-icon-wrapper">
                                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    className="form-input-with-icon"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                    {showPassword ? (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                    <div className="register-link-container">
                        New to the hackathon? <Link to="/register" className="register-link">Register New Account</Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;

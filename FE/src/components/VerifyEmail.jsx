import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './VerifyEmail.css';

const VerifyEmail = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const username = location.state?.username || ''; // Passed from Register page
    const canResendImmediately = location.state?.canResendImmediately === true;

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timeLeft, setTimeLeft] = useState(canResendImmediately ? 0 : 180); // 3 minutes = 180 seconds
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!username) {
            navigate('/register', { replace: true });
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [username, navigate]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleChange = (index, e) => {
        const value = e.target.value;
        if (isNaN(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        if (pastedData.some(char => isNaN(char))) return;

        const newOtp = [...otp];
        pastedData.forEach((char, index) => {
            if (index < 6) newOtp[index] = char;
        });
        setOtp(newOtp);
        
        // Focus last filled input
        const focusIndex = Math.min(pastedData.length, 5);
        inputRefs.current[focusIndex].focus();
    };

    const handleResend = async () => {
        if (!username || timeLeft > 0 || isResending) return;

        setError('');
        setSuccess('');
        setIsResending(true);

        try {
            const response = await fetch('http://localhost:8080/api/v1/auth/resend-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to resend OTP');
            } else {
                setOtp(['', '', '', '', '', '']);
                setTimeLeft(180);
                setSuccess(data.message || 'A new OTP has been sent to your email.');
                inputRefs.current[0]?.focus();
            }
        } catch (err) {
            setError('Failed to connect to the server.');
        } finally {
            setIsResending(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length < 6) {
            setError('Please enter the full 6-digit OTP');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:8080/api/v1/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, otp: otpValue })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Verification failed');
            } else {
                setSuccess(data.message || 'Account activated successfully!');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err) {
            setError('Failed to connect to the server.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="verify-container">
            <h1 className="verify-title">Verify Your Email</h1>
            
            <div className="verify-card">
                <div className="icon-wrapper">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>
                
                <p className="verify-text">
                    An activation OTP code has been sent via email. Enter the<br/>
                    token {timeLeft > 0 ? <>within <strong>{formatTime(timeLeft)}</strong> minutes</> : 'or request a new code'} to activate your profile
                </p>

                {error && <div className="alert alert-error" style={{marginBottom: '20px'}}>{error}</div>}
                {success && <div className="alert alert-success" style={{marginBottom: '20px'}}>{success}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="otp-inputs" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                type="text"
                                maxLength="1"
                                className="otp-input"
                                value={digit}
                                onChange={(e) => handleChange(index, e)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                ref={(el) => (inputRefs.current[index] = el)}
                            />
                        ))}
                    </div>

                    <button 
                        type="submit" 
                        className="verify-btn" 
                        disabled={isLoading || otp.join('').length < 6}
                    >
                        {isLoading ? 'VERIFYING...' : 'CONFIRM OTP TOKEN'}
                    </button>
                </form>

                <div className="resend-container">
                    Didn't receive the code? 
                    <button
                        type="button"
                        className="resend-link"
                        disabled={timeLeft > 0 || isResending}
                        onClick={handleResend}
                    >
                        {isResending ? 'Resending...' : 'Resend Code Now'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;

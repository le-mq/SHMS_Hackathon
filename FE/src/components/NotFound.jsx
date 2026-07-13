import React from 'react';
import {useNavigate} from "react-router-dom";

const NotFound = () => {
    const navigate = useNavigate();
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '80vh', textAlign: 'center',
            fontFamily: '"Inter", "Roboto", sans-serif', color: '#333'
        }}><h1 style={{ fontSize: '8rem', margin: '0',
            background: 'linear-gradient(135deg, #667eea 0%, #0D1B2A 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '800'
        }}>404</h1>
            <h2 style={{ fontSize: '2rem', margin: '10px 0', color: '#555' }}>
                Oops! Page Not Found
            </h2>
            <p style={{ fontSize: '1.2rem', color: '#777', maxWidth: '500px', marginBottom: '30px' }}>
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <button onClick={() => navigate(-1)} style={{
                padding: '12px 24px', fontSize: '1.1rem', color: '#fff',
                background: 'linear-gradient(135deg, #667eea 0%, #0D1B2A 100%)',
                border: 'none', borderRadius: '50px', cursor: 'pointer',
                transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(118, 75, 162, 0.4)',
                display: 'inline-block'
            }} onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 6px 20px rgba(118, 75, 162, 0.6)';
            }} onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(118, 75, 162, 0.4)';
            }}>Go Back</button>
        </div>
    );
};

export default NotFound;

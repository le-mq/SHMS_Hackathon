import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './NavbarHome.css';

export default function NavbarHome({ isTransparent = false }) {
    const navigate = useNavigate();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className="ph-nav" data-transparent={isTransparent} data-scrolled={isScrolled}>
            <div className="ph-nav-inner">
                <div className="ph-nav-brand" onClick={() => navigate('/')}
                     style={{ cursor: 'pointer' }}><img src="/shms_logo.svg" alt="S-HMS Logo" style={{ height: '36px', width: 'auto', display: 'block' }} /> <span>SEAL Hackathon</span></div>
                <ul className="ph-nav-links">
                    <li><a href="/#contests">Contests</a></li>
                    <li><NavLink to="/leaderboard">Leaderboard</NavLink></li>
                </ul>
                {!localStorage.getItem('shms_token') && (
                    <div className="ph-nav-actions">
                        <Link to="/login" style={{textDecoration: 'none'}}><button className="shms-btn shms-btn-ghost" style={{color: 'white', borderColor: 'rgba(255,255,255,0.3)'}}>Sign In</button></Link>
                        <Link to="/register" style={{textDecoration: 'none'}}><button className="shms-btn shms-btn-primary">Join Now</button></Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
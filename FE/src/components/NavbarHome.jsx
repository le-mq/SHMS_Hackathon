import { Link, NavLink, useNavigate } from 'react-router-dom';
import './NavbarHome.css';

export default function NavbarHome() {
    const navigate = useNavigate();

    return (
        <nav className="ph-nav">
            <div className="ph-nav-inner">
                <div className="ph-nav-brand" onClick={() => navigate('/')}
                     style={{ cursor: 'pointer' }}><img src="/shms_logo.svg" alt="S-HMS Logo" style={{ height: '50px', width: 'auto', display: 'block' }} /> <span>SEAL Hackathon</span></div>
                <ul className="ph-nav-links">
                    <li><NavLink to="/">Home</NavLink></li>
                    <li><NavLink to="/leaderboard">Leaderboard</NavLink></li>
                </ul>
                {!localStorage.getItem('shms_token') && (
                    <div className="ph-nav-actions">
                        <Link to="/login"><button className="ph-btn-ghost">Sign In</button></Link>
                        <Link to="/register"><button className="ph-btn-primary">Sign Up</button></Link>
                    </div>
                )}
            </div>
        </nav>
    );
}
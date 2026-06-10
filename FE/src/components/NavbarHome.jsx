import React from 'react';
import {Link} from 'react-router-dom';

export default function NavbarHome() {
    return (
        <nav className="ph-nav">
            <div className="ph-nav-inner">
                <div className="ph-nav-brand">S-HMS | <span>SEAL Hackathon</span></div>
                <ul className="ph-nav-links">
                    <li><Link to="/" className="active">Home</Link></li>
                    <li><Link to="/leaderboard">Leaderboard</Link></li>
                </ul>
                <div className="ph-nav-actions">
                    <Link to="/login"><button className="ph-btn-ghost">Login</button></Link>
                    <Link to="/register"><button className="ph-btn-primary">Register</button></Link>
                </div>
            </div>
        </nav>
    );
}
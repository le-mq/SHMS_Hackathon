import './Footer.css';

export default function Footer() {
    return (
        <footer className="ph-footer fade-in">
            <div className="ph-footer-inner">
                <div className="ph-footer-brand">
                    S-HMS <span className="ph-footer-divider">|</span> <span>SEAL Hackathon</span>
                </div>
                <p className="ph-footer-desc">
                    The premier software engineering competition platform. Built with excellence for FPT University.
                </p>
                <ul className="ph-footer-links">
                    <li><a href="/">Explore Contests</a></li>
                    <li><a href="/leaderboard">Leaderboard</a></li>
                    <li><a href="/login">Sign In</a></li>
                </ul>
                <div className="ph-footer-copy">
                    © {new Date().getFullYear()} Software Engineering Hackathon Management System. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
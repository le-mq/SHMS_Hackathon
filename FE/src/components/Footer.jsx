import './Footer.css';

export default function Footer() {
    return (
        <footer className="ph-footer fade-in">
            <div className="ph-footer-inner">
                <div className="ph-footer-grid">
                    <div className="ph-footer-col ph-footer-brand-col">
                        <div className="ph-footer-brand">
                            <img src="/shms_logo.svg" alt="S-HMS Logo" style={{ height: '32px', width: 'auto', display: 'block', opacity: 0.9 }} />
                            <span>S-HMS</span>
                        </div>
                        <p className="ph-footer-desc">
                            The premier software engineering competition platform. Built with excellence for FPT University.
                        </p>
                    </div>
                    <div className="ph-footer-col">
                        <h4>Hackathons</h4>
                        <ul>
                            <li><a href="/#contests">Explore Active</a></li>
                            <li><a href="/#contests">Upcoming Seasons</a></li>
                            <li><a href="/#hall-of-fame">Hall of Fame</a></li>
                        </ul>
                    </div>
                    <div className="ph-footer-col">
                        <h4>Platform</h4>
                        <ul>
                            <li><a href="/leaderboard">Leaderboard</a></li>
                            <li><a href="/login">Sign In</a></li>
                            <li><a href="/register">Create Account</a></li>
                        </ul>
                    </div>
                    <div className="ph-footer-col">
                        <h4>S-HMS</h4>
                        <ul>
                            <li><a href="#workflow">How it works</a></li>
                            <li><a href="#">About S-HMS</a></li>
                            <li><a href="#">Help & Support</a></li>
                        </ul>
                    </div>
                </div>
                <div className="ph-footer-bottom">
                    <div className="ph-footer-copy">
                        © {new Date().getFullYear()} S-HMS. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
}
import { useEffect, useState } from 'react';
import './PublicHome.css';
import NavbarHome from './NavbarHome.jsx'

// ─── Config ────────────────────────────────────────────────────────────────
// const API_BASE = 'http://localhost:8080/api/v1/public';

// Fallback mock data when the backend is not running
const MOCK_DATA = {
    contests: [
        {
            id: 1, name: 'Innovation Sprint', season: 'SPRING', year: 2026,
            registrationStart: '2026-02-01', registrationEnd: '2026-03-15',
            competitionStart:  '2026-03-20', competitionEnd:  '2026-04-10',
            status: 'CLOSED', description: 'Build innovative solutions to real-world problems.',
        },
        {
            id: 2, name: 'The Grand Challenge', season: 'SUMMER', year: 2026,
            registrationStart: '2026-03-01', registrationEnd: '2026-03-15',
            competitionStart:  '2026-04-20', competitionEnd:  '2026-08-10',
            status: 'ACTIVE', description: 'The flagship summer hackathon – push boundaries.',
        },
        {
            id: 3, name: 'Enterprise Architect', season: 'FALL', year: 2026,
            registrationStart: '2026-10-01', registrationEnd: '2026-11-15',
            competitionStart:  '2026-11-20', competitionEnd:  '2026-12-10',
            status: 'UPCOMING', description: 'Design scalable enterprise-grade systems.',
        },
    ],
    tracks: [
        { id: 1, name: 'AI & Machine Learning',      category: 'Technology',        status: 'OPEN'   },
        { id: 2, name: 'FinTech Solutions',           category: 'Banking & Finance', status: 'OPEN'   },
        { id: 3, name: 'Blockchain for Governance',   category: 'Cryptography',      status: 'SOON'   },
        { id: 4, name: 'Sustainable Green-Tech',      category: 'Environment',       status: 'OPEN'   },
        { id: 5, name: 'Mobile App Innovation',       category: 'General Software',  status: 'OPEN'   },
    ],
    announcements: [
        {
            id: 1, title: 'Registration Open – Innovation Sprint 2026',
            content: 'Registration for Innovation Sprint 2026 is now open. Submit your team before Mar 15.',
            type: 'INFO', publishedAt: '2026-02-01T09:00:00',
        },
        {
            id: 2, title: 'Deadline Reminder – Dev Phase Starts Soon',
            content: 'Development phase for Innovation Sprint begins March 20. Ensure your repository is ready.',
            type: 'DEADLINE', publishedAt: '2026-03-10T08:00:00',
        },
        {
            id: 3, title: 'The Grand Challenge 2026 – Opens June 1',
            content: "Mark your calendars! Summer's biggest hackathon opens registration on June 1, 2026.",
            type: 'INFO', publishedAt: '2026-05-15T10:00:00',
        },
    ],
    stats: { ACTIVE: 1, UPCOMING: 2, CLOSED: 0 },
};

function fmtDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtShortDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });
}

// Rough 0-100 progress of current date between start and end
function progress(start, end) {
    if (!start || !end) return 0;
    const now = Date.now();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (now <= s) return 0;
    if (now >= e) return 100;
    return Math.round(((now - s) / (e - s)) * 100);
}

function ContestCard({ contest, onSelectContest }) {
    const { name, season, year, registrationStart, registrationEnd,
        competitionStart, competitionEnd, status } = contest;

    const isClosed = status === 'CLOSED';
    const isUpcoming = status === 'UPCOMING';
    const pct = progress(registrationStart, competitionEnd);

    return (
        <div className="ph-contest-card">
            <div className="ph-contest-card-header">
        <span className={`ph-season-badge ph-season-${season}`}>
          {season} {year}
        </span>
            </div>
            <h3>{name}</h3>
            <div className="ph-contest-dates">
                <div className="ph-date-row">
                    <span className="ph-date-label">Registration</span>
                    <span>{fmtShortDate(registrationStart)} – {fmtShortDate(registrationEnd)}</span>
                </div>
                <div className="ph-date-row">
                    <span className="ph-date-label">Competition</span>
                    <span>{fmtShortDate(competitionStart)} – {fmtShortDate(competitionEnd)}</span>
                </div>
            </div>

            {!isUpcoming && (
                <div className="ph-progress-bar-wrap" title={ {pct} + "% through contest"}>
                    <div className="ph-progress-bar" style={{ width: `${pct}%` }} />
                </div>
            )}

            <div className="ph-contest-action">
                {isClosed ? (
                    <button className="ph-btn-card ph-btn-card-closed" disabled>
                        Contest Closed
                    </button>
                ) : ( <button className="ph-btn-card" onClick={() => onSelectContest(contest)}>Details</button> )}
            </div>
        </div>
    );
}

function TrackRow({ track }) {
}

export default function PublicHome() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedContest, setSelectedContest] = useState(null);



    return (
        <div className="ph-page">
            <NavbarHome />

            <section className="ph-hero">
                <div className="ph-hero-inner">
                    <div className="">
                        <div className="ph-hero-label">FPT University</div>
                        <h1>Welcome to <span>SEAL</span> Hackathon</h1>
                        <p>The leading software engineering competition organized by the
                            Department of Software Engineering, FPT University.</p>
                    </div>
                    <div className="ph-hero-image">
                        <img src="https://t3.ftcdn.net/jpg/03/27/84/86/360_F_327848677_rKdWq48QDo8apoN6kZlWa241HRlw5aWn.jpg"
                             alt="Hackathon contest image" />
                    </div>
                </div>
            </section>

        </div>
    );
}

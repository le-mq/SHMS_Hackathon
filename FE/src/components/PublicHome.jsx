import {useEffect, useState} from 'react';
import './PublicHome.css';
import NavbarHome from './NavbarHome.jsx'

// ─── Config ────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8080/api/v1/public';

function fmtDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'});
}

function fmtShortDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-GB', {month: 'short', day: '2-digit'});
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

function ContestCard({contest, onSelectContest}) {
    const { name, season, year, registrationStart, registrationEnd, status, rounds } = contest;
    const isClosed = status === 'CLOSED';
    const isUpcoming = status === 'UPCOMING';
    let compStart = null;
    let compEnd = null;
    if (rounds && rounds.length > 0) {
        const opens = rounds.map(r => new Date(r.submissionOpen).getTime()).filter(t => !isNaN(t));
        const closes = rounds.map(r => new Date(r.submissionDeadline).getTime()).filter(t => !isNaN(t));
        if (opens.length > 0) compStart = new Date(Math.min(...opens)).toISOString();
        if (closes.length > 0) compEnd = new Date(Math.max(...closes)).toISOString();
    }

    const pct = progress(registrationStart, compEnd);

    return (
        <div className="ph-contest-card">
            <div className="ph-contest-card-header">
                <span className={"ph-season-badge ph-season-" + season}>{season} {year}</span>
                <small>{status}</small>
            </div>
            <h3>{name}</h3>
            <div className="ph-contest-dates">
                <div className="ph-date-row">
                    <span className="ph-date-label">Registration</span>
                    <span>{fmtShortDate(registrationStart)} – {fmtShortDate(registrationEnd)}</span>
                </div>
                <div className="ph-date-row">
                    <span className="ph-date-label">Competition</span>
                    <span>{fmtShortDate(compStart)} – {fmtShortDate(compEnd)}</span>
                </div>
            </div>

            {!isUpcoming && (
                <div className="ph-progress-bar-wrap" title={pct + "% through contest"}>
                    <div className="ph-progress-bar" style={{width: pct + "%"}}/>
                </div>
            )}

            <div className="ph-contest-action">
                {isClosed ? (
                    <button className="ph-btn-card ph-btn-card-closed" disabled>
                        Contest Closed
                    </button>
                ) : (<button className="ph-btn-card" onClick={() => onSelectContest(contest)}>Details</button>)}
            </div>
        </div>
    );
}

export default function PublicHome() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedContest, setSelectedContest] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchHome() {
            try {
                const res = await fetch(API_BASE + "/home");
                if (!res.ok) throw new Error("HTTP" + res.status);
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch (error) {
                console.warn("API unavailable response", error.message);
                try {
                    const localRes = await fetch("/testFE.json");
                    if (!localRes.ok) throw new Error("Not found file");
                    const localJson = await localRes.json();
                    if (!cancelled) setData({contests: localJson.contests?.data||[]});
                } catch (localError) {
                    console.warn(error.message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchHome();
        return () => cancelled = true;
    }, []);

    const {contests = [], universities = [], geographicScopes = []} = data || {};

    useEffect(() => {
        if (contests.length > 0 && !selectedContest) {
            setSelectedContest(contests[0]);
        }
    }, [contests, selectedContest]);

    if (loading) {
        return (
            <div className="ph-page">
                <div className="ph-loading">
                    <div className="ph-spinner"/>
                    <span>Loading Hackathon data...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="ph-page">
            <NavbarHome/>

            <section className="ph-hero">
                <div className="ph-hero-inner">
                    <div className="">
                        <div className="ph-hero-label">FPT University</div>
                        <h1>Welcome to <span>SEAL</span> Hackathon</h1>
                        <p>The leading software engineering competition organized by the
                            Department of Software Engineering, FPT University.</p>
                    </div>
                    <div className="ph-hero-image">
                        <img
                            src="https://t3.ftcdn.net/jpg/03/27/84/86/360_F_327848677_rKdWq48QDo8apoN6kZlWa241HRlw5aWn.jpg"
                            alt="Hackathon contest image"/>
                    </div>
                </div>
            </section>

            <section className="ph-section ph-section-alt">
                <div className="ph-container">
                    <div className="ph-section-header">
                        <h2>Active Seanonal Hackathon</h2>
                        <p>Ongoing and upcoming major seasonal cycles.</p>
                    </div>
                    {contests.length === 0 ? (<div className="ph-no-data">No active contests at this time.</div>)
                        : (<div className="ph-contests-grid">{contests.map(c =>
                            (<ContestCard key={c.id} contest={c} onSelectContest={
                                    () => {
                                        setSelectedContest(c);
                                        document.getElementById("categories-section")?.scrollIntoView({behavior: 'smooth'});
                                    }}/>
                            ))}</div>)}
                </div>
            </section>
            {/* Open Competitive Tracks */}
            <section className="ph-section" id="categories-section">
                <div className="ph-container">
                    <div className="ph-section-header">
                        <h2>Open Competitive Tracks</h2>
                        <p>Details of categories and timeline
                            for {selectedContest ? selectedContest.name : 'the selected contest'}</p>
                    </div>
                    <div className="ph-tracks-table">
                        <table>
                            <thead>
                            <tr>
                                <th>Category Name</th>
                                <th>Round</th>
                                <th>Submission Open</th>
                                <th>Submission Deadline</th>
                            </tr>
                            </thead>
                            <tbody>
                            {!selectedContest || !selectedContest.categories || selectedContest.categories.length === 0 ? (
                                <tr><td colSpan={4} style={{textAlign: 'center', color: '#9ca3af', padding: 32}}>
                                    No categories available for this contest.</td>
                                </tr>) : ((() => {
                                    const allCatNames = Array.isArray(selectedContest.categories)
                                        ? selectedContest.categories.map(c => c.name || c).join(', ') : '';
                                    const rounds = selectedContest.rounds || [];
                                    if (rounds.length === 0) {
                                        return (
                                            <tr>
                                                <td className="ph-category-name">{allCatNames}</td>
                                                <td colSpan={3}>No rounds defined</td>
                                            </tr>
                                        );
                                    }
                                    return rounds.map((r, rId) => (
                                        <tr key={"round-"+rId}>
                                            {rId === 0 && <td className="ph-category-name" rowSpan={rounds.length}
                                                              style={{verticalAlign: 'middle', fontWeight: 600}}>{allCatNames}</td>}
                                            <td>{r.phaseName}</td>
                                            <td>{fmtDate(r.submissionOpen)}</td>
                                            <td>{fmtDate(r.submissionDeadline)}</td>
                                        </tr>
                                    ));
                                })()
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
            {/* ── Partner Universities ── */}
            <section className="ph-section">
                <div className="ph-container">
                    <div className="ph-section-header" style={{textAlign: 'center'}}>
                        <h2>Partner Universities</h2>
                    </div>
                    <div className="ph-partners-grid">
                        {universities.map(name => (
                            <div className="ph-partner-card" key={name} style={{justifyContent: 'center'}}>
                                <div className="ph-partner-name" style={{margin: 0}}>{name}</div>
                            </div>
                        ))}
                        {universities.length === 0 &&
                            <p style={{textAlign: 'center', color: '#888'}}>No universities found.</p>}
                    </div>
                </div>
            </section>
            {/* ── Geographic Scopes ── */}
            <section className="ph-section ph-section-alt">
                <div className="ph-container">
                    <div className="ph-section-header" style={{textAlign: 'center'}}>
                        <h2>Geographic Scopes</h2>
                    </div>
                    <div className="ph-scopes-row"
                         style={{display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center'}}>
                        {geographicScopes.map(scope => (
                            <div key={scope} className="ph-scope-btn active" style={{cursor: 'default'}}>
                                <span className="ph-scope-label">{scope}</span>
                            </div>
                        ))}
                        {geographicScopes.length === 0 &&
                            <p style={{textAlign: 'center', color: '#888'}}>No scopes found.</p>}
                    </div>
                </div>
            </section>
        </div>
    );
}

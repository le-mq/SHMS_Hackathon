import { useEffect, useState } from 'react';
import './PublicHome.css';
import NavbarHome from './NavbarHome.jsx';

const formatJsDate = (str, options) =>
    str ? new Date(str).toLocaleDateString('en-GB', options) : '—';

const fmtDate = (str) => formatJsDate(str, { day: '2-digit', month: 'short', year: 'numeric' });
const fmtShortDate = (str) => formatJsDate(str, { month: 'short', day: '2-digit' });

function progress(start, end) {
    if (!start || !end) return 0;
    const now = Date.now(), s = new Date(start), e = new Date(end);
    if (now <= s) return 0;
    if (now >= e) return 100;
    return Math.round(((now - s) / (e - s)) * 100);
}

function ContestCard({ contest, onSelectContest }) {
    const { name, season, year, registrationStart, registrationEnd, status, rounds = [] } = contest;
    const validRounds = rounds.filter(r => r.submissionOpen && r.submissionDeadline);
    const compStart = validRounds.length ? new Date(Math.min(...validRounds.map(r => new Date(r.submissionOpen)))).toISOString() : null;
    const compEnd = validRounds.length ? new Date(Math.max(...validRounds.map(r => new Date(r.submissionDeadline)))).toISOString() : null;
    const pct = progress(registrationStart, compEnd);

    return (
        <div className="ph-contest-card">
            <div className="ph-contest-card-header">
                <span className={`ph-season-badge ph-season-${season}`}>{season} {year}</span>
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

            {status !== 'UPCOMING' && (
                <div className="ph-progress-bar-wrap" title={`${pct}% through contest`}>
                    <div className="ph-progress-bar" style={{ width: `${pct}%` }} />
                </div>
            )}

            <div className="ph-contest-action">
                {status === 'CLOSED' ? (
                    <button className="ph-btn-card ph-btn-card-closed" disabled>Contest Closed</button>
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
                const res = await fetch("http://localhost:8080/api/v1/public/home");
                if (!res.ok) throw new Error("API failed");
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch (error) {
                try {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    if (!cancelled) setData({ contests: localJson.contests?.data || [] });
                } catch (e) {
                    console.warn("Both remote and local data source failed");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchHome();
        return () => { cancelled = true; };
    }, []);

    const { contests = [], universities = [], geographicScopes = [] } = data || {};
    useEffect(() => {
        if (contests.length > 0 && !selectedContest) {
            setSelectedContest(contests[0]);
        }
    }, [contests, selectedContest]);

    if (loading) {
        return (
            <div className="ph-page">
                <div className="ph-loading">
                    <div className="ph-spinner" />
                    <span>Loading Hackathon data...</span>
                </div>
            </div>
        );
    }

    const allCatNames = selectedContest && Array.isArray(selectedContest.categories)
        ? selectedContest.categories.map(c => c.name || c).join(', ') : '';
    const currentRounds = selectedContest?.rounds || [];

    return (
        <div className="ph-page">
            <NavbarHome />
            <section className="ph-hero">
                <div className="ph-hero-inner">
                    <div>
                        <div className="ph-hero-label">FPT University</div>
                        <h1>Welcome to <span>SEAL</span> Hackathon</h1>
                        <p>The leading software engineering competition organized by the Department of Software Engineering, FPT University.</p>
                    </div>
                    <div className="ph-hero-image">
                        <img src="https://t3.ftcdn.net/jpg/03/27/84/86/360_F_327848677_rKdWq48QDo8apoN6kZlWa241HRlw5aWn.jpg" alt="Hackathon contest" />
                    </div>
                </div>
            </section>

            <section className="ph-section ph-section-alt">
                <div className="ph-container">
                    <div className="ph-section-header">
                        <h2>Active Seanonal Hackathon</h2>
                        <p>Ongoing and upcoming major seasonal cycles.</p>
                    </div>
                    {contests.length === 0 ? (
                        <div className="ph-no-data">No active contests at this time.</div>
                    ) : (<div className="ph-contests-grid">
                            {contests.map(c => (
                                <ContestCard key={c.id} contest={c}
                                             onSelectContest={() => { setSelectedContest(c);
                                                 document.getElementById("categories-section")?.scrollIntoView({ behavior: 'smooth' });
                                             }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="ph-section" id="categories-section">
                <div className="ph-container">
                    {selectedContest && (
                        <>
                            <div className="ph-section-header">
                                <h2>Contest Information</h2>
                                <p>Comprehensive details about {selectedContest.name}</p>
                            </div>
                            <div className="ph-contest-details-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', marginBottom: '40px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Theme</h4>
                                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>{selectedContest.theme || selectedContest.description || '—'}</div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Region Scope</h4>
                                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>{selectedContest.regionScope || '—'}</div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Max Teams</h4>
                                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>{selectedContest.maximumAllowedTeams || '—'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>Compliance Rules</h4>
                                        <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-line', background: '#f9fafb', padding: '16px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                                            {selectedContest.complianceRules || 'No rules specified.'}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>Prize Structures</h4>
                                        <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-line', background: '#f9fafb', padding: '16px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                                            {selectedContest.tieredPrizeStructures || 'No prize structures specified.'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="ph-section-header">
                        <h2>Open Competitive Tracks</h2>
                        <p>Categories and timeline details for {selectedContest ? selectedContest.name : 'the selected contest'}</p>
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
                                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9ca3af', padding: 32 }}>No categories available for this contest.</td>
                                </tr>) : currentRounds.length === 0 ? (
                                <tr>
                                    <td className="ph-category-name">{allCatNames}</td>
                                    <td colSpan={3}>No rounds defined</td>
                                </tr>
                            ) : (currentRounds.map((r, rId) => {
                                const catObj = selectedContest.categories[rId] || selectedContest.categories[0];
                                const catName = typeof catObj === 'string' ? catObj : (catObj?.name || catObj?.categoryName || `Category ${rId + 1}`);
                                return (
                                    <tr key={`round-${rId}`}>
                                        <td className="ph-category-name" style={{ verticalAlign: 'middle', fontWeight: 600 }}>{catName}</td>
                                        <td>{r.phaseName}</td>
                                        <td>{fmtDate(r.submissionOpen)}</td>
                                        <td>{fmtDate(r.submissionDeadline)}</td>
                                    </tr>
                                );
                            }))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="ph-section">
                <div className="ph-container">
                    <div className="ph-section-header" style={{ textAlign: 'center' }}>
                        <h2>Partner Universities</h2>
                    </div>
                    <div className="ph-partners-grid">
                        {universities.map(name => (
                            <div className="ph-partner-card" key={name} style={{ justifyContent: 'center' }}>
                                <div className="ph-partner-name" style={{ margin: 0 }}>{name}</div>
                            </div>
                        ))}
                        {universities.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No universities found.</p>}
                    </div>
                </div>
            </section>

            <section className="ph-section ph-section-alt">
                <div className="ph-container">
                    <div className="ph-section-header" style={{ textAlign: 'center' }}>
                        <h2>Geographic Scopes</h2>
                    </div>
                    <div className="ph-scopes-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                        {geographicScopes.map(scope => (
                            <div key={scope} className="ph-scope-btn active" style={{ cursor: 'default' }}>
                                <span className="ph-scope-label">{scope}</span>
                            </div>
                        ))}
                        {geographicScopes.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No scopes found.</p>}
                    </div>
                </div>
            </section>
        </div>
    );
}
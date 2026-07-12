import { useEffect, useState, useMemo } from 'react';
import './PublicHome.css';
import NavbarHome from './NavbarHome.jsx';


const formatJsDate = (str, options) =>
    str ? new Date(str).toLocaleDateString('en-GB', options) : '—';
const fmtDate = (str) => formatJsDate(str, { day: '2-digit', month: 'short', year: 'numeric' });
const fmtShortDate = (str) => formatJsDate(str, { month: 'short', day: '2-digit' });
const fmtDateTime = (str) => {
    if (!str) return '—';
    if (str.length <= 10) return fmtDate(str);
    return formatJsDate(str, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

function progress(start, end) {
    if (!start || !end) return 0;
    const now = Date.now();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e)) return 0;
    if (now <= s) return 0;
    if (now >= e) return 100;
    return Math.round(((now - s) / (e - s)) * 100);
}

function ContestCard({ contest, onSelectContest }) {
    const { name, season, year, registrationStart, registrationEnd, status, rounds = [] } = contest;
    const validRounds = rounds.filter(r => r.submissionOpen && r.submissionDeadline);
    const compStart = validRounds.length ? new Date(Math.min(...validRounds.map(r => new Date(r.submissionOpen)))).toISOString() : null;
    const compEnd = validRounds.length ? new Date(Math.max(...validRounds.map(r => new Date(r.submissionDeadline)))).toISOString() : null;
    const cStart = registrationStart || contest.contestStartAt || contest.startDate;
    const cEnd = contest.contestEndAt || contest.endDate || compEnd;
    const pct = progress(cStart, cEnd);

    return (
        <div className="ph-contest-card">
            <div className="ph-contest-card-header">
                <span className={`ph-season-badge ph-season-${season}`}>{season} {year}</span>
                <span className={`ph-status-badge ph-status-${status}`}>{status}</span>
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
                <button className={`ph-btn-card ${status === 'CLOSED' ? 'ph-btn-card-closed' : ''}`}
                        onClick={() => onSelectContest(contest)}
                >View Details</button>
            </div>
        </div>
    );
}

function renderComplianceRules(rulesStr) {
    if (!rulesStr) return 'No rules specified.';
    try {
        const rules = JSON.parse(rulesStr);
        if (!Array.isArray(rules) || rules.length === 0) return 'No rules specified.';
        return (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {rules.map((r, idx) => {
                    if (typeof r === 'string') {
                        return <li key={idx} style={{ marginBottom: '8px' }}>{r}</li>;
                    } else if (typeof r === 'object' && r !== null) {
                        const penaltyText = r.penalty ? ` (Penalty: ${r.penalty})` : "";
                        return (
                            <li key={idx} style={{ marginBottom: '8px' }}>
                                <strong>{r.rule}</strong>
                                <span>{penaltyText}</span>
                            </li>
                        );
                    }
                    return null;
                })}
            </ul>
        );
    } catch (e) {
        return rulesStr;
    }
}

function renderPrizeStructures(prizeStr) {
    if (!prizeStr) return 'No prize structures specified.';
    try {
        const prizes = JSON.parse(prizeStr);
        if (!Array.isArray(prizes) || prizes.length === 0) return 'No prize structures specified.';
        return (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {prizes.map((prize, idx) => (
                    <li key={idx} style={{ marginBottom: '8px' }}>
                        <strong>{prize.rank}:</strong> {prize.amount}
                    </li>
                ))}
            </ul>
        );
    } catch (e) {
        return prizeStr;
    }
}

function renderRequirements(reqsStr) {
    if (!reqsStr) return 'None';
    try {
        const parsed = JSON.parse(reqsStr);
        if (Array.isArray(parsed)) {
            return parsed.map(r => String(r).trim()).filter(Boolean).join(', ');
        }
    } catch (e) {
        // Ignore JSON parse error, treat as comma-separated
    }
    return reqsStr.split(',').map(r => r.trim()).filter(Boolean).join(', ');
}

export default function PublicHome() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedContest, setSelectedContest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    const { contests = [], universities = [] } = data || {};
    const filteredContests = useMemo(() => {
        if (!searchTerm.trim()) {
            return contests.filter(c => c.status === 'ACTIVED' || c.status === 'UPCOMING');
        }
        const term = searchTerm.toLowerCase();
        return contests.filter(c =>
            (c.name && c.name.toLowerCase().includes(term)) ||
            (c.theme && c.theme.toLowerCase().includes(term))
        );
    }, [contests, searchTerm]);

    useEffect(() => {
        if (filteredContests.length > 0 && !selectedContest) {
            setSelectedContest(filteredContests[0]);
        }
    }, [filteredContests, selectedContest]);

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
                    <div className="ph-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h2>{searchTerm.trim() ? 'Search Results' : 'Active Seasonal Hackathon'}</h2>
                            <p>{searchTerm.trim() ? 'All matching contests including closed ones.' : 'Ongoing and upcoming major seasonal cycles.'}</p>
                        </div>
                        <div>
                            <input
                                type="text"
                                placeholder="Search contests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', width: '300px', maxWidth: '100%', fontSize: '14px' }}
                            />
                        </div>
                    </div>
                    {filteredContests.length === 0 ? (
                        <div className="ph-no-data">No contests found matching your search.</div>
                    ) : (<div className="ph-contests-grid">
                            {filteredContests.map(c => (<ContestCard key={c.id} contest={c}
                                                                     onSelectContest={() => {setSelectedContest(c);
                                                                         document.getElementById("categories-section")?.scrollIntoView({ behavior: 'smooth' });
                                                                     }} />))}
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
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Term</h4>
                                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>{selectedContest.term || selectedContest.season || '—'} {selectedContest.year || ''}</div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Location</h4>
                                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>{selectedContest.location || '—'}</div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Team Size</h4>
                                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>{selectedContest.minTeamMembers && selectedContest.maxTeamMembers ? `${selectedContest.minTeamMembers} - ${selectedContest.maxTeamMembers} members` : '—'}</div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '4px' }}>Max Teams</h4>
                                        <div style={{ fontSize: '16px', fontWeight: 500, color: '#111827' }}>{selectedContest.maximumAllowedTeams || '—'}</div>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                                    <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '12px' }}>Contest Milestones</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                                        <div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>Registration Open</div>
                                            <div style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>{fmtDate(selectedContest.registrationStart)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>Registration Deadline</div>
                                            <div style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>{fmtDate(selectedContest.registrationEnd)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>Contest Start</div>
                                            <div style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>{fmtDateTime(selectedContest.contestStartAt || selectedContest.startDate)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>Contest End</div>
                                            <div style={{ fontSize: '15px', fontWeight: 500, color: '#111827' }}>{fmtDateTime(selectedContest.contestEndAt || selectedContest.endDate)}</div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>Compliance Rules</h4>
                                        <div style={{ fontSize: '14px', color: '#374151', background: '#f9fafb', padding: '16px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                                            {renderComplianceRules(selectedContest.complianceRules)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280', marginBottom: '8px' }}>Prize Structures</h4>
                                        <div style={{ fontSize: '14px', color: '#374151', background: '#f9fafb', padding: '16px', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                                            {renderPrizeStructures(selectedContest.tieredPrizeStructures)}
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
                    <div className="ph-tracks-table" style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
                        {!selectedContest || !selectedContest.categories || selectedContest.categories.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 32, background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                No categories available for this contest.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {selectedContest.categories.map((cat, idx) => {
                                    const catName = typeof cat === 'string' ? cat : (cat.name || cat.categoryName || `Category ${idx + 1}`);
                                    const rounds = cat.rounds || selectedContest.rounds || [];
                                    const description = typeof cat === 'object' ? cat.description : null;
                                    const guidelineUrl = typeof cat === 'object' ? cat.guidelineUrl : null;

                                    return (
                                        <div key={`cat-${idx}`} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                                <div>
                                                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>{catName}</h3>
                                                    {description && <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 8px 0' }}>{description}</p>}
                                                </div>
                                                {guidelineUrl && (
                                                    <a href={guidelineUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: '#f3f4f6', color: '#374151', borderRadius: '6px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', border: '1px solid #e5e7eb', whiteSpace: 'nowrap', marginLeft: '16px' }}>View Guidelines</a>
                                                )}
                                            </div>
                                            {rounds.length > 0 ? (
                                                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                                                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                                        <tr>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Round</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Format</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Requirements</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Submission Open</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Submission Deadline</th>
                                                            <th style={{ padding: '12px 16px', fontWeight: 600, color: '#374151' }}>Result Announcement</th>
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        {rounds.map((r, rId) => (
                                                            <tr key={`r-${rId}`} style={{ borderBottom: rId < rounds.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                                                                <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 500 }}>{r.phaseName}</td>
                                                                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{r.roundFormat || '—'}</td>
                                                                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{renderRequirements(r.submissionRequirements)}</td>
                                                                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{fmtDateTime(r.submissionOpen)}</td>
                                                                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{fmtDateTime(r.submissionDeadline)}</td>
                                                                <td style={{ padding: '12px 16px', color: '#4b5563' }}>{fmtDateTime(r.publishResultAt)}</td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '14px', color: '#6b7280' }}>No rounds defined for this category.</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
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
        </div>
    );
}
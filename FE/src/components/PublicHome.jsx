import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PublicHome.css';
import NavbarHome from './NavbarHome.jsx';
import NavbarStudent from './NavbarStudent.jsx';
import NavbarJudge from './NavbarJudge.jsx';
import NavbarMentor from './NavbarMentor.jsx';
import NavbarAdmin from './NavbarAdmin.jsx';
import ContestDetailModal from './ContestDetailModal';

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
    const navigate = useNavigate();
    const { name, season, year, registrationStart, registrationEnd, status, rounds = [] } = contest;
    const validRounds = rounds.filter(r => r.submissionOpen && r.submissionDeadline);
    const compStart = validRounds.length ? new Date(Math.min(...validRounds.map(r => new Date(r.submissionOpen)))).toISOString() : null;
    const compEnd = validRounds.length ? new Date(Math.max(...validRounds.map(r => new Date(r.submissionDeadline)))).toISOString() : null;
    const cStart = registrationStart || contest.contestStartAt || contest.startDate;
    const cEnd = contest.contestEndAt || contest.endDate || compEnd;
    const pct = progress(cStart, cEnd);

    const role = localStorage.getItem('shms_role');
    const upperStatus = status ? status.toUpperCase() : '';

    let ctaText = 'View Details';
    let ctaAction = null;
    let isDisabled = false;
    let customStyle = {};

    const isRegClosed = (() => {
        if (!registrationEnd) return false;
        const end = new Date(registrationEnd);
        end.setHours(23, 59, 59, 999);
        return new Date() > end;
    })();

    if (upperStatus === 'CLOSED' || upperStatus === 'ARCHIVED') {
        ctaText = 'View Final Leaderboard';
        ctaAction = `/leaderboard?contestId=${contest.id}`;
    } else if (role === 'STUDENT' && upperStatus === 'ACTIVED') {
        ctaText = 'Go to Workspace';
        ctaAction = '/student/dashboard';
    } else if (role === 'JUDGE' || role === 'MENTOR') {
        ctaText = 'Go to Workspace';
        ctaAction = role === 'JUDGE' ? '/judge/workspace' : '/mentor/workspace';
    } else if (!role || (role === 'STUDENT' && upperStatus === 'UPCOMING')) {
        if (isRegClosed) {
            ctaText = 'View Leaderboard';
            ctaAction = `/leaderboard?contestId=${contest.id}`;
            customStyle = { borderColor: 'var(--red)', color: 'var(--red)' };
        } else {
            ctaText = 'Register';
            ctaAction = !role ? '/login' : '/student/competitions';
            customStyle = { background: 'var(--navy)', color: 'var(--white)', border: 'none' };
        }
    }

    const handlePrimaryClick = () => {
        if (ctaAction) navigate(ctaAction);
    };

    const handleViewDetails = () => {
        onSelectContest(contest);
    };

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

            {upperStatus !== 'UPCOMING' && (
                <div className="ph-progress-bar-wrap" title={`${pct}% through contest`}>
                    <div className="ph-progress-bar" style={{ width: `${pct}%` }} />
                </div>
            )}

            <div className="ph-contest-action" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                    className="ph-btn-card"
                    onClick={handleViewDetails}
                    style={{ background: 'transparent', color: '#0284c7', border: '1px solid #0284c7' }}
                >
                    View Details
                </button>
                <button
                    className={`ph-btn-card ${upperStatus === 'CLOSED' || upperStatus === 'ARCHIVED' ? 'ph-btn-card-closed' : ''}`}
                    onClick={handlePrimaryClick}
                    disabled={isDisabled}
                    style={Object.keys(customStyle).length > 0 ? customStyle : {}}
                >
                    {ctaText}
                </button>
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

function ContextBar() {
    const navigate = useNavigate();
    const token = localStorage.getItem('shms_token');
    const role = localStorage.getItem('shms_role') || '';

    if (!token) return null;

    const handleReturn = () => {
        if (role === 'STUDENT') navigate('/student/dashboard');
        else if (role === 'JUDGE') navigate('/judge/workspace');
        else if (role === 'MENTOR') navigate('/mentor/workspace');
        else if (role === 'ADMIN') navigate('/admin/config');
        else navigate('/');
    };

    return (
        <div style={{ position: 'fixed', bottom: '40px', right: '40px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <div className="fab-animated" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', padding: '12px 20px', borderRadius: '40px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)', display: 'flex', alignItems: 'center', gap: '20px', transition: 'transform 0.2s', cursor: 'pointer' }}
                 onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5)'; }}
                 onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4)'; }}
                 onClick={handleReturn}
            >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'inline-block', boxShadow: '0 0 8px #34d399' }}></span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>Explore Mode</span>
                    </div>
                    <span style={{ color: 'white', fontSize: '15px', fontWeight: 600 }}>Return to Workspace</span>
                </div>
                <div style={{ background: '#3b82f6', padding: '10px', borderRadius: '50%', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.5)' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                </div>
            </div>
        </div>
    );
}

export default function PublicHome() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedContest, setSelectedContest] = useState(null);
    const [displayContest, setDisplayContest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function fetchHome() {
            try {
                const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/public/home");
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
            (c.theme && c.theme.toLowerCase().includes(term)) ||
            (c.season && c.season.toLowerCase().includes(term)) ||
            (c.year && String(c.year).includes(term)) ||
            (c.status && c.status.toLowerCase().includes(term))
        );
    }, [contests, searchTerm]);

    useEffect(() => {
        if (contests.length === 0) return;
        const urlId = searchParams.get('contestId');

        if (filteredContests.length > 0) {
            const inFiltered = urlId ? filteredContests.find(c => String(c.id) === String(urlId)) : null;
            if (inFiltered) {
                if (!selectedContest || selectedContest.id !== inFiltered.id) {
                    setSelectedContest(inFiltered);
                }
            } else {
                const first = filteredContests[0];
                if (!selectedContest || selectedContest.id !== first.id) {
                    setSelectedContest(first);
                }
            }
        } else {
            if (selectedContest) setSelectedContest(null);
        }
    }, [filteredContests, searchParams, contests]);

    useEffect(() => {
        if (contests.length > 0 && searchParams.get('contestId') && !displayContest) {
            const urlId = searchParams.get('contestId');
            const target = contests.find(c => String(c.id) === String(urlId));
            if (target && !window.hasAutoOpenedModal) {
                setDisplayContest(target);
                window.hasAutoOpenedModal = true;
            }
        }
    }, [contests, searchParams]);

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

    const renderNavbar = () => {
        const token = localStorage.getItem('shms_token');
        const role = localStorage.getItem('shms_role') || '';
        if (!token) return <NavbarHome />;
        switch (role) {
            case 'STUDENT': return <NavbarStudent />;
            case 'JUDGE': return <NavbarJudge />;
            case 'MENTOR': return <NavbarMentor />;
            case 'ADMIN': return <NavbarAdmin />;
            default: return <NavbarHome />;
        }
    };

    return (
        <div className="ph-page">
            {renderNavbar()}
            <ContextBar />
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
                        <div style={{ position: 'relative' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input
                                type="text"
                                placeholder="Search contests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ padding: '10px 16px 10px 36px', borderRadius: '8px', border: '1px solid #d1d5db', width: '300px', maxWidth: '100%', fontSize: '14px' }}
                            />
                        </div>
                    </div>
                    {filteredContests.length === 0 ? (
                        <div className="ph-no-data">No contests found matching your search.</div>
                    ) : (<div className="ph-contests-grid">
                            {filteredContests.map(c => (<ContestCard key={c.id} contest={c}
                                                                     onSelectContest={() => {
                                                                         setSelectedContest(c);
                                                                         setDisplayContest(c);
                                                                         setSearchParams({ contestId: c.id });
                                                                     }} />))}
                        </div>
                    )}
                </div>
            </section>
            {displayContest && (
                <ContestDetailModal contest={displayContest} onClose={() => { setDisplayContest(null); setSelectedContest(null); }} />
            )}

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
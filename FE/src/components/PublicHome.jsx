import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './PublicHome.css';
import NavbarHome from './NavbarHome.jsx';
import NavbarStudent from './NavbarStudent.jsx';
import NavbarJudge from './NavbarJudge.jsx';
import NavbarMentor from './NavbarMentor.jsx';
import ContestDetail from './ContestDetail';

function humanizeStatus(status) {
    if (!status) return '';
    const map = {
        'ACTIVED': 'Active',
        'UPCOMING': 'Upcoming',
        'CLOSED': 'Closed',
        'ARCHIVED': 'Archived',
        'OPEN': 'Open',
        'SOON': 'Soon'
    };
    return map[status.toUpperCase()] || status;
}

const formatJsDate = (str, options) =>
    str ? new Date(str).toLocaleDateString('en-GB', options) : '—';
const fmtShortDate = (str) => formatJsDate(str, { month: 'short', day: '2-digit' });

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
            customStyle = { background: '#F36628', color: 'var(--white)', border: 'none' };
        }
    }

    const handlePrimaryClick = (e) => {
        e.stopPropagation();
        if (ctaAction) navigate(ctaAction);
    };

    const handleViewDetails = () => {
        onSelectContest(contest);
    };

    return (
        <div className="ph-contest-card" onClick={handleViewDetails} style={{ cursor: 'pointer' }}>
            <div className="ph-contest-card-header">
                <span className={`ph-season-badge ph-season-${season}`}>{season} {year}</span>
                <span className={`ph-status-badge ph-status-${status}`}>{humanizeStatus(status)}</span>
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

            <div className="ph-contest-action" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '16px' }}>
                {ctaAction ? (
                    <button
                        className={`ph-btn-card ${upperStatus === 'CLOSED' || upperStatus === 'ARCHIVED' ? 'ph-btn-card-closed' : ''}`}
                        onClick={handlePrimaryClick}
                        disabled={isDisabled}
                        style={Object.keys(customStyle).length > 0 ? customStyle : {}}
                    >
                        {ctaText}
                    </button>
                ) : (
                    <button
                        className="ph-btn-card"
                        style={{ background: 'transparent', color: '#0284c7', border: '1px solid #0284c7' }}
                    >
                        View Details
                    </button>
                )}
            </div>
        </div>
    );
}

function ContextBar() {
    const navigate = useNavigate();
    const token = localStorage.getItem('shms_token');
    const role = localStorage.getItem('shms_role') || '';

    if (!token || role === 'ADMIN') return null;

    const handleReturn = () => {
        if (role === 'STUDENT') navigate('/student/dashboard');
        else if(role === 'LEADER') navigate('/student/dashboard');
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
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('shms_token');
        const role = localStorage.getItem('shms_role');
        if (token && role === 'ADMIN') {
            navigate('/admin/config', { replace: true });
        }
    }, [navigate]);

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
        if (!contests || contests.length === 0 || displayContest) return;
        const urlId = searchParams.get('contestId');
        if (urlId) {
            const target = contests.find(c => String(c.id) === String(urlId));
            if (target) {
                setSelectedContest(target);
                setDisplayContest(target);
            }
        }
    }, [searchParams, contests, displayContest]);

    const heroContest = useMemo(() => {
        if (!contests || contests.length === 0) return null;
        const active = contests.find(c => c.status === 'ACTIVED' || c.status === 'OPEN' || c.status === 'UPCOMING');
        return active || contests[0];
    }, [contests]);

    if (loading) {
        return (
            <div className="ph-page">
                <NavbarHome isTransparent={true} />
                <div className="ph-hero" style={{ height: '600px' }}>
                    <div className="ph-hero-inner">
                        <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="ph-skeleton" style={{ height: '24px', width: '120px', borderRadius: '20px' }}></div>
                            <div className="ph-skeleton" style={{ height: '48px', width: '80%', borderRadius: '8px' }}></div>
                            <div className="ph-skeleton" style={{ height: '48px', width: '60%', borderRadius: '8px' }}></div>
                            <div className="ph-skeleton" style={{ height: '64px', width: '100%', borderRadius: '8px', marginTop: '16px' }}></div>
                        </div>
                    </div>
                </div>
                <div className="ph-container" style={{ marginTop: '40px' }}>
                    <div className="ph-contests-grid">
                        <div className="ph-skeleton" style={{ height: '280px', borderRadius: '16px' }}></div>
                        <div className="ph-skeleton" style={{ height: '280px', borderRadius: '16px' }}></div>
                        <div className="ph-skeleton" style={{ height: '280px', borderRadius: '16px' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    const renderNavbar = () => {
        const token = localStorage.getItem('shms_token');
        const role = localStorage.getItem('shms_role') || '';
        if (!token) return <NavbarHome isTransparent={true} />;
        switch (role) {
            case 'STUDENT': return <NavbarStudent />;
            case 'LEADER': return <NavbarStudent />;
            case 'JUDGE': return <NavbarJudge />;
            case 'MENTOR': return <NavbarMentor />;
            default: return <NavbarHome isTransparent={true} />;
        }
    };

    return (
        <div className="ph-page">
            {renderNavbar()}
            <ContextBar />
            <section className="ph-hero fade-in">
                <div className="ph-hero-inner">
                    <div style={{ maxWidth: '600px' }}>
                        <div className="ph-hero-label">S-HMS Platform</div>
                        <h1>Where Vietnam's Best Engineers <span>Compete</span></h1>
                        <p>SEAL Hackathon connects top software engineering talent across FPT University with real-world problem tracks, industry mentors, and competitive prizes.</p>
                        <div className="ph-hero-actions" style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                            <a href="#contests"><button className="ph-cta-primary">Explore Contests</button></a>
                            {!localStorage.getItem('shms_token') && (
                                <button className="ph-cta-secondary" onClick={() => navigate('/login')}>Sign In</button>
                            )}
                        </div>
                    </div>
                    <div className="ph-hero-decoration">
                        <div className="ph-decor-window">
                            <div className="ph-decor-header">
                                <span className="ph-decor-dot" style={{background:'#ef4444'}}></span>
                                <span className="ph-decor-dot" style={{background:'#f59e0b'}}></span>
                                <span className="ph-decor-dot" style={{background:'#22c55e'}}></span>
                            </div>
                            <div className="ph-decor-body">
                                {heroContest ? (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--shms-text-muted)' }}>CURRENT CONTEST</div>
                                            <span className={`ph-status-badge ph-status-${heroContest.status}`}>{humanizeStatus(heroContest.status)}</span>
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)', marginBottom: '8px', lineHeight: 1.2 }}>{heroContest.name}</div>
                                        {heroContest.theme && <div style={{ fontSize: '13px', color: 'var(--shms-text-secondary)', marginBottom: '16px' }}>{heroContest.theme}</div>}
                                        <div className="ph-decor-stats">
                                            <div className="ph-decor-stat">
                                                <span className="label">Timeline</span>
                                                <span className="value">{fmtShortDate(heroContest.startDate || heroContest.registrationStart)} - {fmtShortDate(heroContest.endDate || heroContest.contestEndAt)}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ height: '20px', width: '40%', background: 'var(--shms-border)', borderRadius: '4px' }}></div>
                                        <div style={{ height: '40px', width: '100%', background: 'var(--shms-border)', borderRadius: '4px' }}></div>
                                        <div style={{ height: '80px', width: '100%', background: 'var(--shms-surface-2)', borderRadius: '4px' }}></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="ph-stats-bar fade-in">
                {universities && universities.length > 0 && (
                    <div className="ph-stat-item">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '8px', color: 'var(--shms-accent-2)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                        <div className="ph-stat-value">{universities.length}</div>
                        <div className="ph-stat-label">Universities</div>
                    </div>
                )}
                {contests && contests.length > 0 && (
                    <div className="ph-stat-item">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '8px', color: 'var(--shms-accent-2)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        <div className="ph-stat-value">{contests.length}</div>
                        <div className="ph-stat-label">Contests</div>
                    </div>
                )}
            </div>

            <section id="contests" className="ph-section ph-section-alt fade-in">
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
                        <div className="ph-no-data" style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <svg width="48" height="48" fill="none" stroke="#cbd5e1" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 16px auto', display: 'block' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: '0 0 8px 0' }}>No contests found</h3>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 16px 0' }}>We couldn't find any hackathons matching your search.</p>
                            <button onClick={() => setSearchTerm('')} style={{ background: 'var(--shms-surface-2)', border: 'none', color: 'var(--shms-text-primary)', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Clear search</button>
                        </div>
                    ) : (<div className="ph-contests-grid">
                            {filteredContests.map(c => (<ContestCard key={c.id} contest={c}
                                                                     onSelectContest={(contest) => {
                                                                         setSelectedContest(contest);
                                                                         setDisplayContest(contest);
                                                                         setSearchParams({ contestId: contest.id });
                                                                         setTimeout(() => {
                                                                             document.getElementById('contest-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                         }, 100);
                                                                     }} />))}
                        </div>
                    )}

                    {displayContest && (
                        <div style={{ marginTop: '40px' }}>
                            <ContestDetail contest={displayContest} onClose={() => {
                                setDisplayContest(null);
                                setSelectedContest(null);
                                setSearchParams({});
                            }} />
                        </div>
                    )}
                </div>
            </section>

            <section className="ph-section fade-in">
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
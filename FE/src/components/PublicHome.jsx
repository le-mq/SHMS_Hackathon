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
        } else {
            ctaText = 'Register';
            ctaAction = !role ? '/login' : '/student/competitions';
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
        <div className="shms-card" onClick={handleViewDetails} style={{ cursor: 'pointer', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className={`shms-badge shms-badge-neutral`}>{season} {year}</span>
                <span className={`shms-badge shms-badge-${upperStatus === 'ACTIVED' ? 'green' : upperStatus === 'UPCOMING' ? 'yellow' : upperStatus === 'CLOSED' ? 'red' : 'neutral'}`}>{humanizeStatus(status)}</span>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--shms-navy)', margin: '0 0 20px 0', lineHeight: 1.3 }}>{name}</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '24px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--shms-text-muted)', fontWeight: 600 }}>Registration</span>
                    <span style={{ color: 'var(--shms-text-primary)' }}>{fmtShortDate(registrationStart)} – {fmtShortDate(registrationEnd)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--shms-text-muted)', fontWeight: 600 }}>Competition</span>
                    <span style={{ color: 'var(--shms-text-primary)' }}>{fmtShortDate(compStart)} – {fmtShortDate(compEnd)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--shms-text-muted)', fontWeight: 600 }}>Category</span>
                    <span style={{ fontWeight: 600, color: 'var(--shms-navy)' }}>{contest.theme || 'Open Innovation'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--shms-text-muted)', fontWeight: 600 }}>Team Size</span>
                    <span style={{ color: 'var(--shms-text-primary)' }}>{contest.teamSize || '3 - 5 Members'}</span>
                </div>
            </div>

            {upperStatus !== 'UPCOMING' && (
                <div style={{ height: '6px', background: 'var(--shms-surface-2)', borderRadius: '3px', overflow: 'hidden', marginBottom: '20px' }} title={`${pct}% through contest`}>
                    <div style={{ height: '100%', background: 'var(--shms-accent)', width: `${pct}%`, borderRadius: '3px' }} />
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: 'auto' }}>
                <button
                    className="shms-btn shms-btn-primary"
                    onClick={ctaAction ? handlePrimaryClick : handleViewDetails}
                    disabled={isDisabled}
                    style={{ width: '100%' }}
                >
                    {ctaAction ? ctaText : 'View Details'}
                </button>
            </div>
        </div>
    );
}

function ShowcaseCard({ project, onClick }) {
    let rankBadge = { bg: 'var(--gray-200)', color: 'var(--gray-800)', text: 'Finalist' };
    if (project.rank === 1) rankBadge = { bg: '#FEF08A', color: '#854D0E', text: '1st Place' };
    else if (project.rank === 2) rankBadge = { bg: '#E2E8F0', color: '#475569', text: '2nd Place' };
    else if (project.rank === 3) rankBadge = { bg: '#FED7AA', color: '#9A3412', text: '3rd Place' };

    return (
        <div className="shms-card" onClick={() => onClick(project)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', padding: '24px', transition: 'transform 0.2s', height: '100%' }}
             onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <span className="shms-badge" style={{ background: rankBadge.bg, color: rankBadge.color, border: 'none', fontWeight: 800 }}>
                    {rankBadge.text}
                </span>
                <span className="shms-badge shms-badge-neutral" style={{ background: 'var(--shms-surface-2)', color: 'var(--shms-text-secondary)' }}>
                    Score: {project.finalScore ? project.finalScore.toFixed(1) : 'N/A'}
                </span>
            </div>
            <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', color: 'var(--shms-navy)', fontWeight: 800, lineHeight: 1.3 }}>{project.teamName}</h3>
            <p style={{ fontSize: '13px', color: 'var(--shms-text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                {project.contestName} <br/>
                <strong style={{ color: 'var(--shms-accent)' }}>{project.categoryName}</strong>
            </p>
            {project.shortDesc && (
                <p style={{ fontSize: '14px', color: 'var(--shms-text-primary)', margin: '0 0 16px 0', lineHeight: 1.5, flex: 1 }}>
                    {project.shortDesc}
                </p>
            )}
            {project.tags && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px', marginTop: 'auto' }}>
                    {project.tags.map(t => (
                        <span key={t} style={{ fontSize: '11px', background: 'var(--shms-surface-2)', color: 'var(--shms-text-muted)', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>{t}</span>
                    ))}
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <button className="shms-btn shms-btn-ghost" style={{ border: '1px solid var(--shms-border)', width: '100%' }}>
                    View Project &rarr;
                </button>
            </div>
        </div>
    );
}

function ShowcaseDetail({ project, onClose }) {
    let prizeStr = 'No prize data';
    try {
        const prizes = JSON.parse(project.prizeStructures);
        if (Array.isArray(prizes)) {
            const myPrize = prizes.find(p => p.rank.includes(project.rank === 1 ? 'First' : project.rank === 2 ? 'Second' : project.rank === 3 ? 'Third' : 'Grand') || p.rank.includes(String(project.rank)));
            if (myPrize) prizeStr = `${myPrize.rank} - ${myPrize.amount}`;
            else if (prizes[project.rank - 1]) prizeStr = `${prizes[project.rank - 1].rank} - ${prizes[project.rank - 1].amount}`;
        }
    } catch(e) {}

    if (project.teamId && String(project.teamId).startsWith('mock')) {
        prizeStr = project.rank === 1 ? '1st Prize - $5000' : project.rank === 2 ? '2nd Prize - $2500' : '3rd Prize - $1000';
    }

    return (
        <div className="ph-detail-wrapper fade-in" style={{ background: 'var(--shms-surface)', borderRadius: '16px', border: '1px solid var(--shms-border)', padding: '32px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--shms-navy)', margin: '0 0 8px 0' }}>{project.teamName}</h2>
                    <p style={{ margin: 0, color: 'var(--shms-text-secondary)', fontSize: '15px' }}>
                        {project.contestName} &bull; <strong style={{color: 'var(--shms-accent)'}}>{project.categoryName}</strong>
                    </p>
                </div>
                <button className="ph-btn-card" style={{ width: 'auto', padding: '8px 16px', background: 'var(--shms-surface-2)', color: 'var(--shms-text-primary)' }} onClick={onClose}>
                    Close Details
                </button>
            </div>

            {project.shortDesc && (
                <p style={{ fontSize: '16px', color: 'var(--shms-text-primary)', marginBottom: '24px', lineHeight: 1.6 }}>{project.shortDesc}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
                <div style={{ background: 'var(--shms-surface-2)', borderRadius: '12px', padding: '24px' }}>
                    <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: 'var(--shms-text-secondary)' }}>Score Breakdown</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '24px' }}>
                        <span style={{ fontSize: '48px', fontWeight: 900, color: 'var(--shms-navy)', lineHeight: 1 }}>{project.finalScore ? project.finalScore.toFixed(1) : 'N/A'}</span>
                        <span style={{ fontSize: '16px', color: 'var(--shms-text-secondary)', paddingBottom: '6px' }}>/ 100</span>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--shms-text-muted)', marginBottom: '4px' }}>
                            <span>Innovation</span> <span>{project.finalScore ? (project.finalScore/10 + 0.3).toFixed(1) : 'N/A'}/10</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--shms-border)', borderRadius: '3px', marginBottom: '12px' }}><div style={{ height: '100%', background: 'var(--shms-accent)', width: '95%', borderRadius: '3px' }}/></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--shms-text-muted)', marginBottom: '4px' }}>
                            <span>Technical Implementation</span> <span>{project.finalScore ? (project.finalScore/10).toFixed(1) : 'N/A'}/10</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--shms-border)', borderRadius: '3px', marginBottom: '12px' }}><div style={{ height: '100%', background: 'var(--shms-accent)', width: '90%', borderRadius: '3px' }}/></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--shms-text-muted)', marginBottom: '4px' }}>
                            <span>Presentation</span> <span>{project.finalScore ? (project.finalScore/10 - 0.2).toFixed(1) : 'N/A'}/10</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--shms-border)', borderRadius: '3px', marginBottom: '12px' }}><div style={{ height: '100%', background: 'var(--shms-accent)', width: '85%', borderRadius: '3px' }}/></div>
                    </div>

                    <div style={{ fontSize: '14px', color: 'var(--shms-text-primary)', fontWeight: 600, background: '#ecfdf5', color: '#065f46', padding: '8px 12px', borderRadius: '8px', display: 'inline-block' }}>
                        Award: {prizeStr}
                    </div>
                </div>

                <div>
                    <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: 'var(--shms-text-secondary)' }}>Team Roster</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                        {project.roster && project.roster.map((member, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--white)', padding: '12px', borderRadius: '8px', border: '1px solid var(--shms-border)' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--shms-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                    {member.fullName.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, color: 'var(--shms-navy)', fontSize: '14px' }}>{member.fullName}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--shms-text-secondary)' }}>{member.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h3 style={{ fontSize: '16px', margin: '0 0 16px 0', color: 'var(--shms-text-secondary)' }}>Project Links</h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {project.repoUrl && (
                            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="shms-btn shms-btn-secondary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                Repository
                            </a>
                        )}
                        {project.demoUrl && (
                            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="shms-btn shms-btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                Live Demo
                            </a>
                        )}
                        {!project.repoUrl && !project.demoUrl && (
                            <span style={{ fontSize: '14px', color: 'var(--shms-text-muted)' }}>No public links provided.</span>
                        )}
                    </div>
                </div>
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

function getLiveContestPhase(contest) {
    const now = Date.now();
    const regStart = contest.registrationStart ? new Date(contest.registrationStart).getTime() : 0;
    const regEnd = contest.registrationEnd ? new Date(contest.registrationEnd).getTime() : 0;

    let subStart = Infinity, subEnd = 0, evalStart = Infinity, evalEnd = 0;
    if (contest.rounds && contest.rounds.length > 0) {
        contest.rounds.forEach(r => {
            if (r.submissionOpen) subStart = Math.min(subStart, new Date(r.submissionOpen).getTime());
            if (r.submissionDeadline) subEnd = Math.max(subEnd, new Date(r.submissionDeadline).getTime());
            if (r.evaluateStart) evalStart = Math.min(evalStart, new Date(r.evaluateStart).getTime());
            if (r.evaluateEnd) evalEnd = Math.max(evalEnd, new Date(r.evaluateEnd).getTime());
        });
    }

    if (now < regStart) return { phase: 'Upcoming', step: 0 };
    if (regStart > 0 && now <= regEnd) return { phase: 'Registration Open', step: 1 };
    if (subStart !== Infinity && now >= subStart && now <= subEnd) return { phase: 'Submission Phase', step: 2 };
    if (evalStart !== Infinity && now >= evalStart && now <= evalEnd) return { phase: 'Evaluation Phase', step: 3 };
    if (evalEnd !== 0 && now > evalEnd && contest.status !== 'CLOSED' && contest.status !== 'ARCHIVED') return { phase: 'Calibration Phase', step: 4 };
    if (contest.status === 'CLOSED' || contest.status === 'ARCHIVED') return { phase: 'Results Published', step: 5 };

    if (regEnd > 0 && now > regEnd && now < subStart) return { phase: 'Team Formation', step: 2 };
    return { phase: contest.status || 'Active', step: 1 };
}

function LiveContestState({ contest }) {
    if (!contest) return null;

    const { phase, step } = getLiveContestPhase(contest);

    const steps = [
        { label: 'Registration', idx: 1 },
        { label: 'Submission', idx: 2 },
        { label: 'Evaluation', idx: 3 },
        { label: 'Calibration', idx: 4 },
        { label: 'Results', idx: 5 }
    ];

    const now = Date.now();
    let nextDeadlineName = '';
    let nextDeadlineDate = null;

    const regStart = contest.registrationStart ? new Date(contest.registrationStart).getTime() : 0;
    const regEnd = contest.registrationEnd ? new Date(contest.registrationEnd).getTime() : 0;
    let subStart = Infinity, subEnd = 0, evalStart = Infinity, evalEnd = 0;
    if (contest.rounds && contest.rounds.length > 0) {
        contest.rounds.forEach(r => {
            if (r.submissionOpen) subStart = Math.min(subStart, new Date(r.submissionOpen).getTime());
            if (r.submissionDeadline) subEnd = Math.max(subEnd, new Date(r.submissionDeadline).getTime());
            if (r.evaluateStart) evalStart = Math.min(evalStart, new Date(r.evaluateStart).getTime());
            if (r.evaluateEnd) evalEnd = Math.max(evalEnd, new Date(r.evaluateEnd).getTime());
        });
    }

    if (regStart > 0 && now < regStart) { nextDeadlineName = 'Registration Opens'; nextDeadlineDate = regStart; }
    else if (regEnd > 0 && now < regEnd) { nextDeadlineName = 'Registration Closes'; nextDeadlineDate = regEnd; }
    else if (subStart !== Infinity && now < subStart) { nextDeadlineName = 'Submissions Open'; nextDeadlineDate = subStart; }
    else if (subEnd !== 0 && now < subEnd) { nextDeadlineName = 'Submissions Close'; nextDeadlineDate = subEnd; }
    else if (evalStart !== Infinity && now < evalStart) { nextDeadlineName = 'Evaluation Begins'; nextDeadlineDate = evalStart; }
    else if (evalEnd !== 0 && now < evalEnd) { nextDeadlineName = 'Evaluation Ends'; nextDeadlineDate = evalEnd; }

    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!nextDeadlineDate) return;
        const timer = setInterval(() => {
            const distance = nextDeadlineDate - Date.now();
            if (distance < 0) {
                setTimeLeft('Deadline passed');
                clearInterval(timer);
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((distance % (1000 * 60)) / 1000);
            setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, [nextDeadlineDate]);

    return (
        <section className="ph-section fade-in" style={{ padding: '60px 0', background: 'var(--shms-surface)' }}>
            <div className="ph-container">
                <div style={{ background: 'linear-gradient(180deg, var(--shms-surface-2), var(--white))', border: '1px solid var(--shms-border)', borderRadius: '16px', padding: '40px', boxShadow: 'var(--shms-shadow-md)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', gap: '24px' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--shms-green)', display: 'inline-block', boxShadow: '0 0 10px var(--shms-green)' }}></span>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--shms-green)', textTransform: 'uppercase', letterSpacing: '1px' }}>{phase}</span>
                            </div>
                            <h2 style={{ fontSize: '32px', fontWeight: 900, color: 'var(--shms-navy)', margin: 0 }}>{contest.name}</h2>
                        </div>

                        {nextDeadlineDate && (
                            <div style={{ background: 'var(--shms-navy)', color: 'var(--white)', padding: '16px 24px', borderRadius: '12px', textAlign: 'center', minWidth: '220px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--shms-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Next: {nextDeadlineName}</div>
                                <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace' }}>{timeLeft || '...'}</div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '24px', left: '10%', right: '10%', height: '2px', background: 'var(--shms-border)', zIndex: 1 }}></div>
                        <div style={{ position: 'absolute', top: '24px', left: '10%', width: `${Math.max(0, (step - 1) * 20)}%`, height: '2px', background: 'var(--shms-accent)', zIndex: 1, transition: 'width 1s ease' }}></div>

                        {steps.map(s => {
                            const isCompleted = step > s.idx;
                            const isCurrent = step === s.idx;

                            return (
                                <div key={s.idx} style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        background: isCompleted ? 'var(--shms-accent)' : isCurrent ? 'var(--white)' : 'var(--shms-surface-2)',
                                        border: `2px solid ${isCompleted || isCurrent ? 'var(--shms-accent)' : 'var(--shms-border)'}`,
                                        color: isCompleted ? 'var(--white)' : isCurrent ? 'var(--shms-accent)' : 'var(--shms-text-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
                                        boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.1)' : 'none',
                                        transition: 'all 0.3s ease'
                                    }}>
                                        {isCompleted ? (
                                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        ) : isCurrent ? (
                                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--shms-accent)' }}></div>
                                        ) : (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--shms-text-muted)' }}></div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: isCurrent ? 700 : 500, color: isCurrent || isCompleted ? 'var(--shms-navy)' : 'var(--shms-text-secondary)' }}>
                                        {s.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

const MOCK_SHOWCASE_PROJECTS = [
    {
        teamId: 'mock-1',
        rank: 1,
        teamName: 'Neural Vision',
        contestName: 'Global AI Hackathon 2026',
        categoryName: 'AI & Web Innovation',
        finalScore: 94.2,
        shortDesc: 'A real-time neural interface for web applications focusing on accessibility and seamless control.',
        tags: ['React', 'Spring Boot', 'TensorFlow'],
        repoUrl: 'https://github.com/seal-hackathon/neural-vision',
        demoUrl: 'https://demo.shms.com/nv',
        roster: [{fullName: 'Alice Chen', role: 'Leader'}, {fullName: 'Bob Smith', role: 'Member'}]
    },
    {
        teamId: 'mock-2',
        rank: 2,
        teamName: 'Data Miners',
        contestName: 'Global AI Hackathon 2026',
        categoryName: 'Predictive Analytics',
        finalScore: 89.5,
        shortDesc: 'An automated pipeline to clean, analyze, and visualize high-frequency trading data dynamically.',
        tags: ['Python', 'FastAPI', 'Pandas'],
        repoUrl: 'https://github.com/seal-hackathon/data-miners',
        demoUrl: null,
        roster: [{fullName: 'Charlie Davis', role: 'Leader'}, {fullName: 'Diana Prince', role: 'Member'}]
    },
    {
        teamId: 'mock-3',
        rank: 3,
        teamName: 'Web Wizards',
        contestName: 'Global AI Hackathon 2026',
        categoryName: 'Web3 Applications',
        finalScore: 86.8,
        shortDesc: 'A decentralized lending protocol featuring automated liquidations built on Ethereum.',
        tags: ['Solidity', 'Next.js', 'Web3.js'],
        repoUrl: null,
        demoUrl: 'https://demo.shms.com/ww',
        roster: [{fullName: 'Eve Adams', role: 'Leader'}, {fullName: 'Frank White', role: 'Member'}]
    }
];

export default function PublicHome() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedContest, setSelectedContest] = useState(null);
    const [displayContest, setDisplayContest] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [leaderboards, setLeaderboards] = useState([]);
    const [selectedShowcase, setSelectedShowcase] = useState(null);
    const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
    const [heroRemaining, setHeroRemaining] = useState('08:42:17');
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => {
            setHeroRemaining(prev => {
                let [h, m, s] = prev.split(':').map(Number);
                s--;
                if (s < 0) { s = 59; m--; }
                if (m < 0) { m = 59; h--; }
                if (h < 0) return '00:00:00';
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveWorkflowStep(prev => (prev + 1) % 6);
        }, 4000);
        return () => clearInterval(timer);
    }, []);

    const activeLiveContest = useMemo(() => {
        if (!data?.contests) return null;
        return data.contests.find(c => c.status === 'ACTIVED' || c.status === 'UPCOMING');
    }, [data?.contests]);

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
                const [homeRes, lbRes] = await Promise.all([
                    fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/public/home"),
                    fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/public/leaderboards").catch(() => null)
                ]);
                if (!homeRes.ok) throw new Error("API failed");
                const json = await homeRes.json();
                if (!cancelled) setData(json);

                const processLeaderboard = (lbArray) => {
                    const finalTeams = [];
                    const grouped = {};
                    lbArray.forEach(t => {
                        if (!grouped[t.contestId]) grouped[t.contestId] = {};
                        if (!grouped[t.contestId][t.roundName]) grouped[t.contestId][t.roundName] = [];
                        grouped[t.contestId][t.roundName].push(t);
                    });

                    Object.keys(grouped).forEach(cId => {
                        const rounds = Object.keys(grouped[cId]);
                        rounds.sort((r1, r2) => {
                            const d1 = new Date(grouped[cId][r1][0].publishedAt || 0).getTime();
                            const d2 = new Date(grouped[cId][r2][0].publishedAt || 0).getTime();
                            return d2 - d1;
                        });
                        if (rounds.length > 0) {
                            finalTeams.push(...grouped[cId][rounds[0]]);
                        }
                    });

                    return finalTeams.filter(t => t.rank && t.rank <= 3).sort((a, b) => {
                        if (a.contestId !== b.contestId) return (b.contestId || 0) - (a.contestId || 0);
                        return a.rank - b.rank;
                    }).slice(0, 6);
                };

                if (lbRes && lbRes.ok) {
                    const lbJson = await lbRes.json();
                    if (!cancelled && Array.isArray(lbJson)) {
                        setLeaderboards(processLeaderboard(lbJson));
                    }
                }
            } catch (error) {
                try {
                    const localRes = await fetch("/testFE.json");
                    const localJson = await localRes.json();
                    if (!cancelled) {
                        setData({ contests: localJson.contests?.data || [], universities: localJson.universities || [], totalParticipants: localJson.totalParticipants || 0 });
                        if (localJson.leaderboard?.data) {
                            const processLeaderboard = (lbArray) => {
                                const finalTeams = [];
                                const grouped = {};
                                lbArray.forEach(t => {
                                    if (!grouped[t.contestId]) grouped[t.contestId] = {};
                                    if (!grouped[t.contestId][t.roundName]) grouped[t.contestId][t.roundName] = [];
                                    grouped[t.contestId][t.roundName].push(t);
                                });
                                Object.keys(grouped).forEach(cId => {
                                    const rounds = Object.keys(grouped[cId]);
                                    rounds.sort((r1, r2) => {
                                        const d1 = new Date(grouped[cId][r1][0].publishedAt || 0).getTime();
                                        const d2 = new Date(grouped[cId][r2][0].publishedAt || 0).getTime();
                                        return d2 - d1;
                                    });
                                    if (rounds.length > 0) finalTeams.push(...grouped[cId][rounds[0]]);
                                });
                                return finalTeams.filter(t => t.rank && t.rank <= 3).sort((a, b) => {
                                    if (a.contestId !== b.contestId) return (b.contestId || 0) - (a.contestId || 0);
                                    return a.rank - b.rank;
                                }).slice(0, 6);
                            };
                            setLeaderboards(processLeaderboard(localJson.leaderboard.data));
                        }
                    }
                } catch (e) {
                    console.warn("Both remote and local data source failed");
                    if (!cancelled) setError("Failed to load platform data. Please try again later.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchHome();
        return () => { cancelled = true; };
    }, []);

    const { contests = [], universities = [], totalParticipants = 0 } = data || {};
    const filteredContests = useMemo(() => {
        let result = [];
        if (!searchTerm.trim()) {
            result = contests.filter(c => c.status === 'ACTIVED' || c.status === 'UPCOMING');
        } else {
            const term = searchTerm.toLowerCase();
            result = contests.filter(c =>
                (c.name && c.name.toLowerCase().includes(term)) ||
                (c.theme && c.theme.toLowerCase().includes(term)) ||
                (c.season && c.season.toLowerCase().includes(term)) ||
                (c.year && String(c.year).includes(term)) ||
                (c.status && c.status.toLowerCase().includes(term))
            );
        }

        const statusOrder = { 'ACTIVED': 1, 'ACTIVE': 1, 'UPCOMING': 2, 'CLOSED': 3, 'ARCHIVED': 4 };

        return result.sort((a, b) => {
            const statA = statusOrder[a.status?.toUpperCase()] || 99;
            const statB = statusOrder[b.status?.toUpperCase()] || 99;
            if (statA !== statB) return statA - statB;

            const dateA = new Date(a.startDate || a.contestStartAt || 0).getTime();
            const dateB = new Date(b.startDate || b.contestStartAt || 0).getTime();
            return dateB - dateA;
        });
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
        if (!contests || contests.length === 0) return;
        const urlId = searchParams.get('contestId');
        if (urlId) {
            const target = contests.find(c => String(c.id) === String(urlId));
            if (target && (!displayContest || target.id !== displayContest.id)) {
                setSelectedContest(target);
                setDisplayContest(target);
            }
        } else {
            if (displayContest) {
                setDisplayContest(null);
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
                            <div className="shms-skeleton" style={{ height: '24px', width: '120px', borderRadius: '20px' }}></div>
                            <div className="shms-skeleton" style={{ height: '48px', width: '80%', borderRadius: '8px' }}></div>
                            <div className="shms-skeleton" style={{ height: '48px', width: '60%', borderRadius: '8px' }}></div>
                            <div className="shms-skeleton" style={{ height: '64px', width: '100%', borderRadius: '8px', marginTop: '16px' }}></div>
                        </div>
                    </div>
                </div>
                <div className="ph-container" style={{ marginTop: '40px' }}>
                    <div className="ph-contests-grid">
                        <div className="shms-skeleton" style={{ height: '280px', borderRadius: 'var(--shms-radius-md)' }}></div>
                        <div className="shms-skeleton" style={{ height: '280px', borderRadius: 'var(--shms-radius-md)' }}></div>
                        <div className="shms-skeleton" style={{ height: '280px', borderRadius: 'var(--shms-radius-md)' }}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ph-page">
                <NavbarHome isTransparent={true} />
                <div className="ph-container" style={{ marginTop: '120px' }}>
                    <div className="shms-error-state">
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ margin: '0 auto 16px auto' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="shms-error-title">Connection Error</h3>
                        <p className="shms-error-desc">{error}</p>
                        <button className="shms-btn shms-btn-secondary" onClick={() => window.location.reload()}>Retry Connection</button>
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

    const renderWorkflowPreview = (step) => {
        switch (step) {
            case 0:
                return (
                    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                        <div className="shms-card" style={{ padding: '24px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>ACTIVE</div>
                                <div style={{ color: 'var(--shms-text-muted)', fontSize: '13px' }}>Ends in 2 days</div>
                            </div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Global AI Hackathon 2026</h3>
                            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--shms-text-secondary)' }}>Build the future of artificial intelligence with teams around the world.</p>
                            <button className="shms-btn shms-btn-primary" style={{ width: '100%' }}>Register Now</button>
                        </div>
                    </div>
                );
            case 1:
                return (
                    <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'left' }}>
                        <h4 style={{ marginBottom: '16px', color: 'var(--shms-navy)' }}>Team: Alpha Centauri</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { name: 'Alice Chen', role: 'Leader', badge: 'blue' },
                                { name: 'Bob Smith', role: 'Member', badge: 'gray' },
                                { name: 'Charlie Davis', role: 'Member', badge: 'gray' }
                            ].map(m => (
                                <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--shms-surface-2)', padding: '12px 16px', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--shms-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>{m.name.charAt(0)}</div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{m.name}</div>
                                    </div>
                                    <div style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '12px', background: m.badge === 'blue' ? 'rgba(37,99,235,0.1)' : 'rgba(100,116,139,0.1)', color: m.badge === 'blue' ? '#2563eb' : '#64748b', fontWeight: 'bold' }}>{m.role}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'left' }}>
                        <div className="shms-card" style={{ padding: '24px' }}>
                            <h4 style={{ marginBottom: '20px' }}>Project Submission</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ color: 'var(--shms-green)', marginTop: '2px' }}><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>Source Code Repository</div>
                                        <div style={{ fontSize: '13px', color: 'var(--shms-text-muted)' }}>github.com/team-alpha/project</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ color: 'var(--shms-green)', marginTop: '2px' }}><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>Demo Video Link</div>
                                        <div style={{ fontSize: '13px', color: 'var(--shms-text-muted)' }}>youtube.com/watch?v=...</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                    <div style={{ color: 'var(--shms-text-muted)', marginTop: '2px' }}><svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--shms-text-primary)' }}>Pitch Deck (Optional)</div>
                                        <div style={{ fontSize: '13px', color: 'var(--shms-accent)', cursor: 'pointer' }}>Upload PDF</div>
                                    </div>
                                </div>
                            </div>
                            <button className="shms-btn shms-btn-primary" style={{ marginTop: '24px', width: '100%' }}>Finalize Submission</button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="shms-table" style={{ width: '100%', marginBottom: 0 }}>
                                <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Criteria</th>
                                    <th style={{ textAlign: 'center' }}>Weight</th>
                                    <th style={{ textAlign: 'right' }}>Score (1-10)</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td style={{ fontWeight: 600 }}>Innovation & Creativity</td>
                                    <td style={{ textAlign: 'center' }}>40%</td>
                                    <td style={{ textAlign: 'right' }}><input type="number" defaultValue="8" style={{ width: '60px', padding: '4px 8px', border: '1px solid var(--shms-border)', borderRadius: '4px' }}/></td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 600 }}>Technical Implementation</td>
                                    <td style={{ textAlign: 'center' }}>40%</td>
                                    <td style={{ textAlign: 'right' }}><input type="number" defaultValue="9" style={{ width: '60px', padding: '4px 8px', border: '1px solid var(--shms-border)', borderRadius: '4px' }}/></td>
                                </tr>
                                <tr>
                                    <td style={{ fontWeight: 600 }}>Presentation</td>
                                    <td style={{ textAlign: 'center' }}>20%</td>
                                    <td style={{ textAlign: 'right' }}><input type="number" defaultValue="7" style={{ width: '60px', padding: '4px 8px', border: '1px solid var(--shms-border)', borderRadius: '4px' }}/></td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button className="shms-btn shms-btn-primary">Submit Evaluation</button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h4 style={{ margin: 0 }}>Score Calibration</h4>
                            <span style={{ fontSize: '12px', background: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>Variance Detected</span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div className="shms-card" style={{ flex: 1, padding: '16px', background: 'var(--shms-surface-2)', boxShadow: 'none' }}>
                                <div style={{ fontSize: '12px', color: 'var(--shms-text-muted)', marginBottom: '8px' }}>Judge 1</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--shms-green)' }}>8.5</div>
                            </div>
                            <div className="shms-card" style={{ flex: 1, padding: '16px', background: 'var(--shms-surface-2)', boxShadow: 'none' }}>
                                <div style={{ fontSize: '12px', color: 'var(--shms-text-muted)', marginBottom: '8px' }}>Judge 2</div>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--shms-red)' }}>5.0</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--shms-text-secondary)', margin: '16px 0' }}>A score variance of 3.5 requires organizer review before finalizing results.</p>
                        <button className="shms-btn shms-btn-secondary" style={{ width: '100%' }}>Initiate Review</button>
                    </div>
                );
            case 5:
                return (
                    <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
                        <div className="shms-card" style={{ padding: '24px' }}>
                            <h4 style={{ marginBottom: '16px' }}>Final Leaderboard</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { rank: 1, name: 'Team Alpha', score: '9.2', color: '#fbbf24' },
                                    { rank: 2, name: 'Data Miners', score: '8.8', color: '#94a3b8' },
                                    { rank: 3, name: 'Web Wizards', score: '8.5', color: '#b45309' }
                                ].map(t => (
                                    <div key={t.rank} style={{ display: 'flex', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--shms-border)' }}>
                                        <div style={{ width: '24px', fontWeight: 'bold', color: t.color }}>#{t.rank}</div>
                                        <div style={{ flex: 1, fontWeight: '600' }}>{t.name}</div>
                                        <div style={{ fontWeight: 'bold', color: 'var(--shms-accent)' }}>{t.score}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="ph-page">
            {renderNavbar()}
            <ContextBar />
            <section className="ph-hero fade-in">
                <div className="ph-hero-inner">
                    <div className="ph-hero-content" style={{ maxWidth: '600px' }}>
                        <div className="ph-hero-label">SEAL HACKATHON MANAGEMENT SYSTEM</div>
                        <h1>Build. Compete.<br/>Create the <span>Future</span>.</h1>
                        <p>A complete platform for managing hackathons — from team formation and project submission to expert evaluation, calibration, and results.</p>
                        <div className="ph-hero-actions" style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                            <a href={localStorage.getItem('shms_token') ? '#' : '#contests'} style={{textDecoration: 'none'}}>
                                <button className="shms-btn shms-btn-primary" style={{padding: '12px 24px', fontSize: '15px'}} onClick={(e) => {
                                    if (localStorage.getItem('shms_token')) {
                                        e.preventDefault();
                                        const role = localStorage.getItem('shms_role');
                                        if (role === 'STUDENT' || role === 'LEADER') navigate('/student/dashboard');
                                        else if (role === 'JUDGE') navigate('/judge/workspace');
                                        else if (role === 'MENTOR') navigate('/mentor/workspace');
                                        else if (role === 'ADMIN') navigate('/admin/config');
                                    }
                                }}>
                                    {localStorage.getItem('shms_token') ? 'Enter Workspace' : 'Explore Hackathons'}
                                </button>
                            </a>
                            <a href="#hall-of-fame" style={{textDecoration: 'none'}}><button className="shms-btn shms-btn-secondary" style={{padding: '12px 24px', fontSize: '15px', background: 'transparent', color: 'white', borderColor: 'rgba(255,255,255,0.4)'}}>View Leaderboard</button></a>
                        </div>
                    </div>
                    <div className="ph-hero-decoration">
                        <div className="ph-decor-window">
                            <div className="ph-decor-header">
                                <span className="ph-decor-dot" style={{background:'#ef4444'}}></span>
                                <span className="ph-decor-dot" style={{background:'#f59e0b'}}></span>
                                <span className="ph-decor-dot" style={{background:'#22c55e'}}></span>
                            </div>
                            <div className="ph-decor-body" style={{ padding: 0, flexDirection: 'row', display: 'flex' }}>
                                <div className="ph-mock-content" style={{ flex: 1, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#ffffff' }}>
                                    {heroContest ? (
                                        <>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: heroContest.status === 'ACTIVED' ? 'var(--shms-green)' : 'var(--shms-text-muted)' }}></div>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: heroContest.status === 'ACTIVED' ? 'var(--shms-green)' : 'var(--shms-text-secondary)', textTransform: 'uppercase' }}>
                                                        {heroContest.status === 'ACTIVED' ? 'ACTIVE' : humanizeStatus(heroContest.status)}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--shms-text-primary)' }}>{heroContest.name || 'SEAL HACKATHON 2026'}</div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '32px' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--shms-text-muted)', marginBottom: '4px' }}>Teams</div>
                                                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)' }}>{heroContest.totalTeams || 42}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--shms-text-muted)', marginBottom: '4px' }}>Remaining</div>
                                                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)' }}>{heroRemaining}</div>
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shms-text-primary)' }}>Submission Phase</div>
                                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--shms-accent)' }}>78%</div>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: 'var(--shms-surface-2)', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: '78%', height: '100%', background: 'var(--shms-accent)', borderRadius: '4px' }}></div>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--shms-border)' }}>
                                                <div style={{ display: 'inline-flex', padding: '6px 12px', background: 'var(--shms-surface-2)', color: 'var(--shms-text-secondary)', fontSize: '12px', fontWeight: 600, borderRadius: '20px' }}>
                                                    {heroContest.theme || 'AI & Web Innovation'}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                            <div style={{ height: '20px', width: '40%', background: 'var(--shms-border)', borderRadius: '4px' }}></div>
                                            <div style={{ height: '40px', width: '100%', background: 'var(--shms-border)', borderRadius: '4px' }}></div>
                                            <div style={{ height: '60px', width: '100%', background: 'var(--shms-surface-2)', borderRadius: '4px' }}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="ph-stats-bar fade-in">
                {universities && universities.length > 0 && (
                    <div className="ph-stat-item">
                        <div className="ph-stat-value">{universities.length}</div>
                        <div className="ph-stat-label">Universities</div>
                    </div>
                )}
                {contests && contests.length > 0 && (
                    <div className="ph-stat-item">
                        <div className="ph-stat-value">{contests.length}</div>
                        <div className="ph-stat-label">Hackathons</div>
                    </div>
                )}
                <div className="ph-stat-item">
                    <div className="ph-stat-value">{totalParticipants > 0 ? `${totalParticipants}+` : '500+'}</div>
                    <div className="ph-stat-label">Participants</div>
                </div>
                <div className="ph-stat-item">
                    <div className="ph-stat-value">{totalParticipants > 0 ? `${Math.floor(totalParticipants / 3.5)}+` : '150+'}</div>
                    <div className="ph-stat-label">Teams</div>
                </div>
            </div>

            <section id="tour" className="ph-section fade-in" style={{ padding: '80px 0', background: 'var(--shms-surface-2)' }}>
                <div className="ph-container">
                    <div className="ph-section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shms-navy)', letterSpacing: '-1px' }}>Explore how S-HMS works</h2>
                        <p style={{ fontSize: '18px', color: 'var(--shms-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>A quick tour of the S-HMS public experience.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                        {[
                            { step: '01', title: 'Explore Hackathons', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', desc: 'Browse active and upcoming hackathons. View rules, timelines, and requirements.', link: '#contests' },
                            { step: '02', title: 'View Workflow', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', desc: 'Understand how S-HMS orchestrates the entire competition lifecycle seamlessly.', link: '#workflow' },
                            { step: '03', title: 'View Leaderboard', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', desc: 'Check out the Hall of Fame featuring top-tier projects and final rankings.', link: '#hall-of-fame' },
                            { step: '04', title: 'Sign In / Join', icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1', desc: 'Create an account or log in to participate, mentor, or judge in an event.', link: '/login' }
                        ].map((d) => (
                            <a key={d.step} href={d.link} style={{ textDecoration: 'none', display: 'block' }}>
                                <div style={{ background: 'var(--shms-surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--shms-border)', transition: 'all 0.2s', height: '100%', display: 'flex', flexDirection: 'column' }} className="shms-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--shms-surface-2)', color: 'var(--shms-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={d.icon} /></svg>
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--shms-text-muted)' }}>{d.step}</div>
                                    </div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: 'var(--shms-navy)' }}>{d.title}</h3>
                                    <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--shms-text-secondary)', lineHeight: 1.5, flex: 1 }}>{d.desc}</p>
                                    <div style={{ fontSize: '13px', color: 'var(--shms-accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        Explore <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {activeLiveContest && <LiveContestState contest={activeLiveContest} />}

            <section id="workflow" className="ph-section fade-in" style={{ padding: '80px 0' }}>
                <div className="ph-container">
                    <div className="ph-section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shms-navy)', letterSpacing: '-1px' }}>How S-HMS Works</h2>
                        <p style={{ fontSize: '18px', color: 'var(--shms-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>A seamless lifecycle from ideation to final results.</p>
                    </div>

                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div className="ph-interactive-stepper">
                            {[
                                { title: 'Discover', desc: 'Browse and join contests', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
                                { title: 'Team', desc: 'Form or join a team', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                                { title: 'Submit', desc: 'Submit project materials', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
                                { title: 'Evaluate', desc: 'Judges score submissions', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                                { title: 'Calibrate', desc: 'Review and normalize', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
                                { title: 'Results', desc: 'Final leaderboard', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' }
                            ].map((step, idx) => (
                                <div key={idx} className={`ph-step-item ${activeWorkflowStep === idx ? 'active' : ''}`} onClick={() => setActiveWorkflowStep(idx)}>
                                    <div className="ph-step-icon">
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={step.icon}></path></svg>
                                    </div>
                                    <div>
                                        <div className="ph-step-title">{step.title}</div>
                                        <div className="ph-step-desc">{step.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="ph-preview-container" key={activeWorkflowStep} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            {renderWorkflowPreview(activeWorkflowStep)}
                        </div>
                    </div>
                </div>
            </section>

            <section id="roles" className="ph-section fade-in" style={{ padding: '80px 0', background: 'var(--shms-surface-2)' }}>
                <div className="ph-container">
                    <div className="ph-section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shms-navy)', letterSpacing: '-1px' }}>Explore the Platform</h2>
                        <p style={{ fontSize: '18px', color: 'var(--shms-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>See how S-HMS works from the perspective of each participant.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
                        {[
                            {
                                role: 'STUDENT',
                                icon: 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
                                desc: 'Compete and build amazing projects.',
                                tasks: ['Build and manage team', 'Register for contests', 'Submit projects', 'Track results'],
                                link: '/student'
                            },
                            {
                                role: 'JUDGE',
                                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                                desc: 'Evaluate and score submissions fairly.',
                                tasks: ['Review assigned submissions', 'Score rubric criteria', 'Provide feedback', 'Participate in calibration'],
                                link: '/evaluator'
                            },
                            {
                                role: 'MENTOR',
                                icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
                                desc: 'Guide teams to success.',
                                tasks: ['Monitor team progress', 'Provide guidance', 'Give feedback'],
                                link: '/mentor'
                            },
                            {
                                role: 'ADMIN',
                                icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
                                desc: 'Manage the entire hackathon lifecycle.',
                                tasks: ['Configure contests', 'Manage experts', 'Approve teams', 'Manage rankings and publication'],
                                link: '/admin'
                            }
                        ].map((role) => (
                            <div key={role.role} onClick={() => navigate(localStorage.getItem('shms_token') ? role.link : `/login?demoRole=${role.role}`)} className="shms-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                                 onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shms-shadow-md)'; }}
                                 onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shms-shadow-sm)'; }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--shms-surface-2)', color: 'var(--shms-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={role.icon} /></svg>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: 'var(--shms-navy)', letterSpacing: '0.5px' }}>{role.role}</h3>
                                        <div style={{ fontSize: '12px', color: 'var(--shms-text-secondary)' }}>{role.desc}</div>
                                    </div>
                                </div>
                                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {role.tasks.map(task => (
                                        <li key={task} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '14px', color: 'var(--shms-text-primary)' }}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--shms-green)', marginTop: '2px', flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            {task}
                                        </li>
                                    ))}
                                </ul>
                                {localStorage.getItem('shms_token') ? (
                                    <button onClick={(e) => { e.stopPropagation(); navigate(role.link); }} className="shms-btn shms-btn-secondary" style={{ width: '100%', fontSize: '13px', padding: '8px' }}>Open your workspace</button>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); navigate(`/login?demoRole=${role.role}`); }} className="shms-btn shms-btn-primary" style={{ width: '100%', fontSize: '13px', padding: '8px' }}>Explore as {role.role}</button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="hall-of-fame" className="ph-section fade-in" style={{ padding: '80px 0', background: 'var(--white)' }}>
                <div className="ph-container">
                    <div className="ph-section-header" style={{ textAlign: 'center', marginBottom: '64px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shms-navy)', letterSpacing: '-1px' }}>Hall of Fame</h2>
                        <p style={{ fontSize: '18px', color: 'var(--shms-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>Explore outstanding projects from previous competitions.</p>
                    </div>

                    {selectedShowcase && (
                        <ShowcaseDetail project={selectedShowcase} onClose={() => setSelectedShowcase(null)} />
                    )}

                    <div className="ph-contests-grid" style={{ display: selectedShowcase ? 'none' : 'grid' }}>
                        {(leaderboards.length > 0 ? leaderboards : MOCK_SHOWCASE_PROJECTS).map((lb, i) => (
                            <ShowcaseCard key={`${lb.teamId}-${i}`} project={lb} onClick={setSelectedShowcase} />
                        ))}
                    </div>
                </div>
            </section>

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
                        <div className="shms-empty-state" style={{ marginTop: '24px' }}>
                            <svg className="shms-empty-icon" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <h3 className="shms-empty-title">No hackathons found</h3>
                            <p className="shms-empty-desc">We couldn't find any hackathons matching your search.</p>
                            <button className="shms-btn shms-btn-secondary" onClick={() => setSearchTerm('')}>Clear search</button>
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

            <section className="ph-section fade-in" style={{ padding: '80px 0', borderBottom: '1px solid var(--shms-border)' }}>
                <div className="ph-container">
                    <div className="ph-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shms-navy)', letterSpacing: '-1px', margin: '0 0 8px 0' }}>Latest Results</h2>
                            <p style={{ fontSize: '18px', color: 'var(--shms-text-secondary)', maxWidth: '600px', margin: 0 }}>Top performing teams from recent competitions.</p>
                        </div>
                        <button className="ph-btn-card" onClick={() => navigate('/leaderboard')} style={{ display: 'inline-flex', width: 'fit-content', padding: '10px 20px', fontSize: '14px', height: 'fit-content' }}>View Full Leaderboard &rarr;</button>
                    </div>
                    <div className="ph-leaderboard-preview" style={{ maxWidth: '100%', margin: '0 auto', background: 'var(--shms-surface)', border: '1px solid var(--shms-border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shms-shadow-sm)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px', padding: '16px 24px', borderBottom: '1px solid var(--shms-border)', background: 'var(--shms-surface-2)', fontSize: '13px', fontWeight: 600, color: 'var(--shms-text-muted)', textTransform: 'uppercase' }}>
                            <div>Rank</div>
                            <div>Team & Contest</div>
                            <div style={{ textAlign: 'right' }}>Score</div>
                        </div>
                        {leaderboards.slice(0, 5).map((row, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px', padding: '16px 24px', borderBottom: '1px solid var(--shms-border)', alignItems: 'center' }}>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: row.rank === 1 ? '#eab308' : row.rank === 2 ? '#94a3b8' : row.rank === 3 ? '#b45309' : 'var(--shms-text-muted)' }}>#{row.rank}</div>
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--shms-navy)' }}>{row.teamName}</div>
                                    <div style={{ fontSize: '14px', color: 'var(--shms-text-secondary)' }}>{row.contestName}</div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '16px', fontWeight: 700, color: 'var(--shms-green)' }}>{row.finalScore ? row.finalScore.toFixed(1) : 'N/A'}</div>
                            </div>
                        ))}
                        {leaderboards.length === 0 && (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--shms-text-secondary)' }}>No results published yet.</div>
                        )}
                    </div>
                </div>
            </section>

            <section className="ph-section fade-in" style={{ padding: '80px 0', background: 'var(--white)', overflow: 'hidden' }}>
                <div className="ph-container">
                    <div className="ph-section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
                        <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--shms-navy)', letterSpacing: '-1px' }}>Trusted By</h2>
                        <p style={{ fontSize: '18px', color: 'var(--shms-text-secondary)', maxWidth: '600px', margin: '0 auto' }}>Partnering with top universities and organizations.</p>
                    </div>
                    <style>
                        {`
                            @keyframes marquee {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .marquee-container {
                                display: flex;
                                width: 200%;
                                animation: marquee 20s linear infinite;
                            }
                            .marquee-container:hover {
                                animation-play-state: paused;
                            }
                            .marquee-item {
                                flex: 1;
                                display: flex;
                                justify-content: center;
                                alignItems: center;
                                padding: 20px 32px;
                                margin: 0 12px;
                                background: var(--shms-surface);
                                border: 1px solid var(--shms-border);
                                border-radius: 12px;
                                font-weight: 700;
                                font-size: 16px;
                                color: var(--shms-navy);
                                white-space: nowrap;
                                box-shadow: var(--shms-shadow-sm);
                                transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s, border-color 0.2s;
                                cursor: default;
                            }
                            .marquee-container:hover .marquee-item {
                                opacity: 0.6;
                            }
                            .marquee-item:hover {
                                opacity: 1 !important;
                                transform: translateY(-2px);
                                box-shadow: var(--shms-shadow-md);
                                border-color: var(--shms-blue) !important;
                                color: var(--shms-blue);
                            }
                        `}
                    </style>
                    <div style={{ width: '100%', overflow: 'hidden', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to right, var(--white), transparent)', zIndex: 2 }}></div>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '100px', background: 'linear-gradient(to left, var(--white), transparent)', zIndex: 2 }}></div>
                        <div className="marquee-container">
                            {/* Duplicate array to create seamless loop */}
                            {[...universities, ...universities, ...universities].map((name, i) => (
                                <div className="marquee-item" key={i}>
                                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginRight: '10px', color: 'var(--shms-blue)' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    {name}
                                </div>
                            ))}
                            {universities.length === 0 && <p style={{ textAlign: 'center', width: '100%', color: '#888' }}>No universities found.</p>}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
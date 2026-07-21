import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
const formatJsDate = (str, options) =>
    str ? new Date(str).toLocaleDateString('en-GB', options) : '—';
const fmtDate = (str) => formatJsDate(str, { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (str) => {
    if (!str) return '—';
    if (str.length <= 10) return fmtDate(str);
    return formatJsDate(str, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

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
                                <span style={{ color: '#ef4444' }}>{penaltyText}</span>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {prizes.map((prize, idx) => (
                    <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🏅'}</span>
                            {prize.rank}
                        </div>
                        <div style={{ marginTop: '8px', fontWeight: 700, color: '#0f172a' }}>{prize.amount}</div>
                    </div>
                ))}
            </div>
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

export default function ContestDetailModal({ contest, onClose, hasParticipated }) {
    const navigate = useNavigate();
    const role = localStorage.getItem('shms_role');

    if (!contest) return null;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    const handleJoin = () => {
        onClose();
        if (!role) {
            navigate('/login');
        } else if (role === 'STUDENT') {
            navigate(`/student/competitions?contestId=${contest.id}`);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#f8fafc', zIndex: 99999, overflowY: 'auto' }}>
            {/* STICKY NAV */}
            <div style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e2e8f0', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', transition: 'color 0.2s' }} onClick={onClose} onMouseEnter={e => e.currentTarget.style.color='#0f172a'} onMouseLeave={e => e.currentTarget.style.color='#64748b'}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                        Back
                    </div>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    {contest.name}
                </h2>
                <div style={{ display: 'flex', gap: '12px' }}>
                </div>
            </div>

            {/* HERO BANNER */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#fff', padding: '80px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '140%', height: '200%', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 60%)', pointerEvents: 'none' }}></div>
                <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-block', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', padding: '6px 16px', borderRadius: '40px', fontSize: '13px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px', border: '1px solid rgba(56,189,248,0.4)' }}>
                        {contest.term || contest.season || 'SEASON'} {contest.year || ''}
                    </div>
                    <h1 style={{ fontSize: '48px', fontWeight: 800, margin: '0 0 24px 0', letterSpacing: '-1px', lineHeight: 1.2 }}>{contest.name}</h1>
                    <p style={{ fontSize: '18px', color: '#cbd5e1', margin: '0 auto', maxWidth: '700px', lineHeight: 1.6 }}>{contest.theme || 'Join the ultimate coding competition and showcase your software engineering skills.'}</p>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>

                    {/* LEFT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: '#3b82f6', display: 'flex' }}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
                                Contest Overview
                            </h3>
                            {contest.description && <p style={{ fontSize: '15px', color: '#475569', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: '24px' }}>{contest.description}</p>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Location</div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{contest.location || 'Online'}</div>
                                </div>
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Team Size</div>
                                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{contest.minTeamMembers && contest.maxTeamMembers ? `${contest.minTeamMembers} - ${contest.maxTeamMembers} members` : '—'}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: '#f59e0b', display: 'flex' }}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg></div>
                                Prize Structures
                            </h3>
                            {renderPrizeStructures(contest.tieredPrizeStructures)}
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: '#10b981', display: 'flex' }}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                                Important Milestones
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {(() => {
                                    const allRounds = [];
                                    if (contest.rounds && contest.rounds.length > 0) allRounds.push(...contest.rounds);
                                    else if (contest.categories) contest.categories.forEach(c => { if (c.rounds) allRounds.push(...c.rounds); });

                                    const uniqueRounds = [];
                                    const seen = new Set();
                                    allRounds.forEach(r => {
                                        if (!seen.has(r.phaseName)) { seen.add(r.phaseName); uniqueRounds.push(r); }
                                    });
                                    uniqueRounds.sort((a,b) => new Date(a.submissionDeadline) - new Date(b.submissionDeadline));

                                    const steps = [
                                        { label: 'Registration Open', date: fmtDate(contest.registrationStart), color: '#3b82f6' },
                                        { label: 'Registration Deadline', date: fmtDate(contest.registrationEnd), color: '#ef4444' }
                                    ];
                                    uniqueRounds.forEach((r, idx) => {
                                        steps.push({
                                            label: r.phaseName + ' Deadline',
                                            date: fmtDateTime(r.submissionDeadline),
                                            color: idx === uniqueRounds.length - 1 ? '#8b5cf6' : '#10b981'
                                        });
                                    });

                                    return steps.map((step, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: idx === steps.length - 1 ? '0' : '24px' }}>
                                            {idx !== steps.length - 1 && <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: '0', width: '2px', background: '#e2e8f0' }}></div>}
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: step.color, border: '4px solid #fff', boxShadow: '0 0 0 2px #e2e8f0', position: 'relative', zIndex: 2, marginTop: '2px' }}></div>
                                            <div>
                                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{step.label}</div>
                                                <div style={{ fontSize: '14px', color: '#64748b', marginTop: '2px' }}>{step.date}</div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: '#ef4444', display: 'flex' }}><svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
                                Rules & Compliance
                            </h3>
                            <div style={{ fontSize: '14px', color: '#374151', background: '#fff5f5', padding: '20px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                                {renderComplianceRules(contest.complianceRules)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CATEGORIES SECTION */}
                <div style={{ marginTop: '48px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginBottom: '24px', textAlign: 'center' }}>Competition Categories</h3>


                    <div style={{ background: 'transparent', padding: 0, border: 'none', boxShadow: 'none' }}>
                        {!contest || !contest.categories || contest.categories.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#9ca3af', padding: 32, background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                No categories available for this contest.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {contest.categories.map((cat, idx) => {
                                    const catName = typeof cat === 'string' ? cat : (cat.name || cat.categoryName || `Category ${idx + 1}`);
                                    const rounds = cat.rounds || contest.rounds || [];
                                    const description = typeof cat === 'object' ? cat.description : null;
                                    const guidelineUrl = typeof cat === 'object' ? cat.guidelineUrl : null;

                                    return (
                                        <div key={`cat-${idx}`} style={{ background: '#fff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                                <div>
                                                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#3b82f6', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>CATEGORY #{idx + 1}</div>
                                                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>{catName}</h3>
                                                    {description && <p style={{ fontSize: '15px', color: '#64748b', margin: '0', lineHeight: 1.6 }}>{description}</p>}
                                                </div>
                                                {guidelineUrl && (
                                                    <a href={guidelineUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#f8fafc', color: '#0f172a', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', border: '1px solid #e2e8f0', whiteSpace: 'nowrap', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background='#f8fafc'}>
                                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                                        Guidelines
                                                    </a>
                                                )}
                                            </div>
                                            {rounds.length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                                    {rounds.map((r, rId) => (
                                                        <div key={`r-${rId}`} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => {e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'}} onMouseLeave={e => {e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'}}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{r.phaseName || `Round ${rId + 1}`}</h4>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.roundFormat || 'FORMAT'}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Requirements</div>
                                                                    <div style={{ fontSize: '14px', color: '#334155' }}>{renderRequirements(r.submissionRequirements)}</div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '4px' }}>
                                                                    <div>
                                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Open</div>
                                                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{fmtDate(r.submissionOpen)}</div>
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Deadline</div>
                                                                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#ef4444' }}>{fmtDateTime(r.submissionDeadline)}</div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '14px', color: '#64748b' }}>No rounds defined for this category.</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER CTA */}
                <div style={{ textAlign: 'center', marginTop: '40px', padding: '40px', background: 'linear-gradient(to top, rgba(255,255,255,1), transparent)' }}>
                    {(() => {
                        const isRegClosed = (() => {
                            if (!contest.registrationEnd) return false;
                            const end = new Date(contest.registrationEnd);
                            end.setHours(23, 59, 59, 999);
                            return new Date() > end;
                        })();
                        const isRegNotStarted = (() => {
                            if (!contest.registrationStart) return false;
                            const start = new Date(contest.registrationStart);
                            return new Date() < start;
                        })();
                        // If user has participated in this closed contest
                        if (hasParticipated) {
                            return (
                                <button
                                    disabled
                                    style={{
                                        padding: '16px 48px',
                                        fontSize: '18px',
                                        background: 'linear-gradient(135deg, #94a3b8, #cbd5e1)',
                                        border: 'none',
                                        color: '#e2e8f0',
                                        borderRadius: '40px',
                                        cursor: 'not-allowed',
                                        fontWeight: 800,
                                        boxShadow: 'none'
                                    }}
                                >
                                    Participated
                                </button>
                            );
                        }
                        const isDisabled = isRegClosed || isRegNotStarted;
                        return (
                            <>
                                <button
                                    onClick={isDisabled ? undefined : handleJoin}
                                    disabled={isDisabled}
                                    style={{
                                        padding: '16px 48px',
                                        fontSize: '18px',
                                        background: isDisabled ? 'linear-gradient(135deg, #94a3b8, #cbd5e1)' : 'linear-gradient(135deg, #1e88e5, #42a5f5)',
                                        border: 'none',
                                        color: isDisabled ? '#e2e8f0' : '#fff',
                                        borderRadius: '40px',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        fontWeight: 800,
                                        boxShadow: isDisabled ? 'none' : '0 10px 25px rgba(30,136,229,0.4)',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseEnter={e => { if (!isDisabled) e.currentTarget.style.transform = 'translateY(-4px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    {isRegClosed ? 'Registration Closed' : isRegNotStarted ? 'Not Started' : 'Register For This Hackathon'}
                                </button>
                                {isRegClosed ? (
                                    <p style={{ fontSize: '14px', color: '#ef4444', marginTop: '16px', fontWeight: 600 }}>
                                        Registration closed on <strong>{fmtDateTime(contest.registrationEnd)}</strong>.
                                    </p>
                                ) : isRegNotStarted ? (
                                    <p style={{ fontSize: '14px', color: '#d97706', marginTop: '16px', fontWeight: 600 }}>
                                        Registration opens on <strong>{fmtDateTime(contest.registrationStart)}</strong>.
                                    </p>
                                ) : (
                                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '16px' }}>
                                        Don't have an account yet? You can create one during registration.
                                    </p>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
}

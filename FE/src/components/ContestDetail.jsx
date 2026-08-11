import { useNavigate } from 'react-router-dom';

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
            <ul className="ph-rules-list" style={{ margin: 0, paddingLeft: '20px' }}>
                {rules.map((r, idx) => {
                    if (typeof r === 'string') {
                        return <li key={idx} style={{ marginBottom: '8px' }}>{r}</li>;
                    } else if (typeof r === 'object' && r !== null) {
                        const penaltyText = r.penalty ? ` (Penalty: ${r.penalty})` : "";
                        return (
                            <li key={idx} style={{ marginBottom: '8px' }}>
                                <strong>{r.rule}</strong>
                                <span style={{ color: 'var(--shms-red)' }}>{penaltyText}</span>
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
                    <div key={idx} style={{ background: '#fff', border: '1px solid var(--shms-border)', borderRadius: 'var(--shms-radius-sm)', padding: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--shms-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', background: 'var(--shms-surface-2)', padding: '2px 8px', borderRadius: '12px', color: 'var(--shms-text-secondary)' }}>
                                {idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : 'Prize'}
                            </span>
                            {prize.rank}
                        </div>
                        <div style={{ marginTop: '8px', fontWeight: 700, color: 'var(--shms-text-primary)' }}>{prize.amount}</div>
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

export default function ContestDetail({ contest, onClose, hasParticipated }) {
    const navigate = useNavigate();
    const role = localStorage.getItem('shms_role');

    if (!contest) return null;

    const handleJoin = () => {
        if (!role) {
            navigate('/login');
        } else if (role === 'STUDENT') {
            navigate(`/student/competitions?contestId=${contest.id}`);
        }
    };

    return (
        <div id="contest-detail" style={{ maxWidth: '1100px', margin: '40px auto', background: 'var(--shms-surface)', borderRadius: 'var(--shms-radius-lg)', padding: '0', overflow: 'hidden', border: '1px solid var(--shms-border)', boxShadow: 'var(--shms-shadow-md)' }}>

            {/* HEADER / NAVIGATION */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--shms-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--shms-surface)' }}>
                <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--shms-text-secondary)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, padding: '8px 12px', borderRadius: 'var(--shms-radius-sm)', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--shms-surface-2)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                    Back to contests
                </button>
            </div>

            {/* HERO BANNER */}
            <div style={{ background: 'linear-gradient(150deg, var(--shms-navy) 0%, var(--shms-navy-mid) 100%)', color: '#fff', padding: '60px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'inline-block', background: 'rgba(56,189,248,0.1)', color: 'var(--shms-accent-2)', padding: '6px 16px', borderRadius: '40px', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '24px', border: '1px solid rgba(56,189,248,0.3)' }}>
                        {contest.term || contest.season || 'SEASON'} {contest.year || ''}
                    </div>
                    <h2 style={{ fontSize: '36px', fontWeight: 800, margin: '0 0 16px 0', letterSpacing: '-0.5px', lineHeight: 1.2 }}>{contest.name}</h2>
                    <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.8)', margin: '0 auto', maxWidth: '700px', lineHeight: 1.6 }}>{contest.theme || 'Join the ultimate coding competition and showcase your software engineering skills.'}</p>
                </div>
            </div>

            {/* CONTENT GRID */}
            <div style={{ padding: '40px 32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>

                    {/* LEFT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: 'var(--shms-accent)' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
                                Contest Overview
                            </h3>
                            {contest.description && <p style={{ fontSize: '14px', color: 'var(--shms-text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-line', marginBottom: '24px' }}>{contest.description}</p>}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ background: 'var(--shms-surface-2)', padding: '16px', borderRadius: 'var(--shms-radius-sm)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--shms-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Location</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shms-text-primary)' }}>{contest.location || 'Online'}</div>
                                </div>
                                <div style={{ background: 'var(--shms-surface-2)', padding: '16px', borderRadius: 'var(--shms-radius-sm)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--shms-text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Team Size</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shms-text-primary)' }}>{contest.minTeamMembers && contest.maxTeamMembers ? `${contest.minTeamMembers} - ${contest.maxTeamMembers} members` : '—'}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: 'var(--shms-yellow)' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg></div>
                                Prize Structures
                            </h3>
                            {renderPrizeStructures(contest.tieredPrizeStructures)}
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: 'var(--shms-green)' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
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
                                        { label: 'Registration Open', date: fmtDate(contest.registrationStart), color: 'var(--shms-accent)' },
                                        { label: 'Registration Deadline', date: fmtDate(contest.registrationEnd), color: 'var(--shms-red)' }
                                    ];
                                    uniqueRounds.forEach((r, idx) => {
                                        steps.push({
                                            label: r.phaseName + ' Deadline',
                                            date: fmtDateTime(r.submissionDeadline),
                                            color: idx === uniqueRounds.length - 1 ? '#8b5cf6' : 'var(--shms-green)'
                                        });
                                    });

                                    return steps.map((step, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '16px', position: 'relative', paddingBottom: idx === steps.length - 1 ? '0' : '24px' }}>
                                            {idx !== steps.length - 1 && <div style={{ position: 'absolute', left: '7px', top: '24px', bottom: '0', width: '2px', background: 'var(--shms-border)' }}></div>}
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: step.color, border: '3px solid #fff', boxShadow: '0 0 0 2px var(--shms-border)', position: 'relative', zIndex: 2, margin: '2px 0 0 0' }}></div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--shms-text-primary)' }}>{step.label}</div>
                                                <div style={{ fontSize: '13px', color: 'var(--shms-text-secondary)', marginTop: '2px' }}>{step.date}</div>
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>

                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ color: 'var(--shms-red)' }}><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg></div>
                                Rules & Compliance
                            </h3>
                            <div style={{ fontSize: '13px', color: 'var(--shms-text-secondary)', background: '#fff5f5', padding: '16px', borderRadius: 'var(--shms-radius-sm)', border: '1px solid #fecaca' }}>
                                {renderComplianceRules(contest.complianceRules)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CATEGORIES SECTION */}
                <div style={{ marginTop: '48px', paddingTop: '48px', borderTop: '1px solid var(--shms-border)' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--shms-text-primary)', marginBottom: '24px' }}>Competition Categories</h3>

                    {!contest || !contest.categories || contest.categories.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--shms-text-muted)', padding: '32px', background: 'var(--shms-surface-2)', borderRadius: 'var(--shms-radius-sm)', border: '1px dashed var(--shms-border)' }}>
                            No categories available for this contest.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {contest.categories.map((cat, idx) => {
                                const catName = typeof cat === 'string' ? cat : (cat.name || cat.categoryName || `Category ${idx + 1}`);
                                const rounds = cat.rounds || contest.rounds || [];
                                const description = typeof cat === 'object' ? cat.description : null;
                                const guidelineUrl = typeof cat === 'object' ? cat.guidelineUrl : null;

                                return (
                                    <div key={`cat-${idx}`} style={{ background: 'var(--shms-surface)', border: '1px solid var(--shms-border)', borderRadius: 'var(--shms-radius-md)', padding: '24px', boxShadow: 'var(--shms-shadow-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                            <div>
                                                <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--shms-text-primary)', margin: '0 0 8px 0' }}>{catName}</h4>
                                                {description && <p style={{ fontSize: '14px', color: 'var(--shms-text-secondary)', margin: '0', lineHeight: 1.6 }}>{description}</p>}
                                            </div>
                                            {guidelineUrl && (
                                                <a href={guidelineUrl} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: 'var(--shms-surface-2)', color: 'var(--shms-text-primary)', borderRadius: 'var(--shms-radius-sm)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', border: '1px solid var(--shms-border)', whiteSpace: 'nowrap', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                                    Guidelines
                                                </a>
                                            )}
                                        </div>
                                        {rounds.length > 0 ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                                                {rounds.map((r, rId) => (
                                                    <div key={`r-${rId}`} style={{ background: 'var(--shms-surface-2)', border: '1px solid var(--shms-border)', borderRadius: 'var(--shms-radius-sm)', padding: '16px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--shms-text-primary)' }}>{r.phaseName || `Round ${rId + 1}`}</h5>
                                                            <span style={{ fontSize: '10px', fontWeight: 700, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>{r.roundFormat || 'FORMAT'}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <div>
                                                                <div style={{ fontSize: '11px', color: 'var(--shms-text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Requirements</div>
                                                                <div style={{ fontSize: '13px', color: 'var(--shms-text-secondary)' }}>{renderRequirements(r.submissionRequirements)}</div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid var(--shms-border)', paddingTop: '12px' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--shms-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Open</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--shms-text-primary)' }}>{fmtDate(r.submissionOpen)}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--shms-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Deadline</div>
                                                                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--shms-red)' }}>{fmtDateTime(r.submissionDeadline)}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '13px', color: 'var(--shms-text-muted)' }}>No rounds defined.</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* FOOTER CTA */}
                <div style={{ textAlign: 'center', marginTop: '48px', paddingTop: '32px', borderTop: '1px solid var(--shms-border)' }}>
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

                        if (['ADMIN', 'JUDGE', 'MENTOR'].includes(role)) {
                            return null;
                        }

                        if (hasParticipated) {
                            return (
                                <button disabled className="ph-btn-primary" style={{ background: 'var(--shms-text-muted)', cursor: 'not-allowed', padding: '12px 32px', fontSize: '15px' }}>
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
                                    className="ph-btn-primary"
                                    style={{
                                        padding: '12px 32px',
                                        fontSize: '15px',
                                        background: isDisabled ? 'var(--shms-text-muted)' : 'var(--shms-accent)',
                                        border: 'none',
                                        color: '#fff',
                                        borderRadius: 'var(--shms-radius-sm)',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isRegClosed ? 'Registration Closed' : isRegNotStarted ? 'Not Started' : 'Register For This Hackathon'}
                                </button>
                                {isRegClosed ? (
                                    <p style={{ fontSize: '13px', color: 'var(--shms-red)', marginTop: '12px', fontWeight: 600 }}>
                                        Registration closed on <strong>{fmtDateTime(contest.registrationEnd)}</strong>.
                                    </p>
                                ) : isRegNotStarted ? (
                                    <p style={{ fontSize: '13px', color: 'var(--shms-yellow)', marginTop: '12px', fontWeight: 600 }}>
                                        Registration opens on <strong>{fmtDateTime(contest.registrationStart)}</strong>.
                                    </p>
                                ) : (
                                    <p style={{ fontSize: '13px', color: 'var(--shms-text-secondary)', marginTop: '12px' }}>
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

import { useState, useEffect, useMemo } from 'react';
import './CompetitionRegistration.css';
import { useSearchParams } from 'react-router-dom';
import ContestDetailModal from './ContestDetailModal';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/student";

const normalizeList = (json) => (Array.isArray(json) ? json : json?.data || []);
const safeJson = async (res) => { try { return await res.json(); } catch { return {}; } };

const categorizeCompetition = (c) => {
    const status = String(c.status || '').toUpperCase();
    if (['CLOSED', 'CANCELED', 'CANCELLED', 'ENDED', 'INACTIVE'].includes(status)) return 'PAST';
    if (status === 'UPCOMING') return 'UPCOMING';
    return 'ACTIVED';
};

const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const renderPrizes = (prizeStr) => {
    if (!prizeStr) return <span className="prize-tba">To be announced.</span>;
    try {
        const prizes = JSON.parse(prizeStr);
        if (Array.isArray(prizes)) {
            return (
                <div className="prize-container" style={{ marginTop: '12px' }}>
                    {prizes.map((p, i) => (
                        <div className="prize-item" key={i} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: 'white' }}>
                            <div className="prize-rank" style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="prize-icon">{i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅'}</span>
                                {p.rank}
                            </div>
                            <div className="prize-amount" style={{ marginTop: '8px', fontWeight: 700, color: '#0f172a' }}>{p.amount}</div>
                        </div>
                    ))}
                </div>
            );
        }
        return <span className="prize-tba">{prizeStr}</span>;
    } catch (e) {
        return <span className="prize-tba">{prizeStr}</span>;
    }
};

const renderComplianceRules = (rulesStr) => {
    if (!rulesStr) return <span style={{ color: '#64748b' }}>No rules specified.</span>;
    try {
        const rules = JSON.parse(rulesStr);
        if (!Array.isArray(rules) || rules.length === 0) return <span style={{ color: '#64748b' }}>No rules specified.</span>;
        return (
            <ul style={{ paddingLeft: '20px', margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.6' }}>
                {rules.map((r, idx) => (
                    <li key={idx} style={{ marginBottom: '12px' }}>
                        <div style={{ color: '#1e293b', fontWeight: 'bold' }}>{r.rule}</div>
                        {r.penalty && <div style={{ color: '#ef4444', fontSize: '14px', marginTop: '4px' }}>(Penalty: {r.penalty})</div>}
                    </li>
                ))}
            </ul>
        );
    } catch (e) {
        return <p style={{ color: '#475569' }}>{rulesStr}</p>;
    }
};

const CompetitionCard = ({ comp, onViewDetails, onRegister, isRegistering, myTeams, participatedContestIds }) => {
    const cat = categorizeCompetition(comp);
    const isOpen = cat === 'ACTIVED';

    const isAlreadyRegistered = myTeams?.some(team => {
        const isSameContest = team.contestId ? team.contestId === comp.id : team.contestName === comp.name;
        return isSameContest && ['APPROVED', 'PENDING'].includes(String(team.status).toUpperCase());
    });

    let isRegistrationExpired = false;
    if (comp.registrationEnd) {
        const endDate = new Date(comp.registrationEnd);
        endDate.setHours(23, 59, 59, 999);
        isRegistrationExpired = endDate < new Date();
    }

    let isRegistrationNotStarted = false;
    if (comp.registrationStart) {
        const startDate = new Date(comp.registrationStart);
        isRegistrationNotStarted = startDate > new Date();
    }

    const canRegister = (cat === 'ACTIVED' || cat === 'UPCOMING') && !isRegistrationExpired && !isRegistrationNotStarted;
    const hasParticipated = cat === 'PAST' && participatedContestIds?.has(comp.id);

    return (
        <div className={`comp-card ${isRegistering ? 'highlight' : ''}`}>
            <div className="comp-card-banner">
                <span className={`comp-badge badge-${cat.toLowerCase()}`}>{cat === 'PAST' ? (comp.status || 'CLOSED').toUpperCase() : cat}</span>
            </div>
            <div className="comp-card-content">
                <h3 className="comp-title">{comp.name}</h3>
                <p className="comp-desc">{comp.theme || comp.description || 'An exciting competition to showcase your coding skills.'}</p>
                <div className="comp-meta">
                    <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span>Reg: {formatDateTime(comp.registrationStart)} - {formatDateTime(comp.registrationEnd)}</span>
                    </div>
                    <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Date: {formatDateTime(comp.contestStartAt)} - {formatDateTime(comp.contestEndAt)}</span>
                    </div>
                    <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        <span>Team Size: {comp.minTeamMembers || 3} - {comp.maxTeamMembers || 5}</span>
                    </div>
                </div>
            </div>
            <div className="comp-card-actions">
                <button className="btn-secondary" onClick={() => onViewDetails(comp)}>View Details</button>
                {(isAlreadyRegistered || hasParticipated) ? (
                    <button
                        className="btn-primary"
                        disabled
                        style={{
                            backgroundColor: cat === 'PAST' ? '#94a3b8' : '#ef4444',
                            borderColor: cat === 'PAST' ? '#94a3b8' : '#ef4444',
                            color: 'white',
                            opacity: 0.9,
                            cursor: 'not-allowed',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {cat === 'PAST' ? 'Participated' : 'Participated'}
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        disabled={!canRegister}
                        style={{ ...(!canRegister ? { backgroundColor: '#94a3b8', borderColor: '#94a3b8', color: 'white', cursor: 'not-allowed' } : {}), display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        onClick={() => onRegister(comp)}
                    >
                        {isRegistrationExpired ? 'Registration Closed' : (isRegistrationNotStarted ? 'Not Started' : (canRegister ? 'Register' : 'Closed'))}
                    </button>
                )}
            </div>
        </div>
    );
};

// using ContestDetailModal from external component

const TeamSelector = ({ myTeams, selectedTeamId, onSelectTeam, registeringComp, selectedLeaderId, onSelectLeader, error }) => {
    if (!myTeams || myTeams.length === 0) {
        return (
            <div className="empty-teams-msg">
                <p style={{ color: 'red' }}>You don't have any teams yet. Please create a team in the "My Team" page first.</p>
            </div>
        );
    }

    return (
        <div className="team-selector-grid">
            {myTeams.map(team => {
                const roster = Array.isArray(team.roster) ? team.roster : [];
                // Only show APPROVED members (exclude PENDING invitations)
                const approvedRoster = roster.filter(m => (m.status || '').toUpperCase() !== 'PENDING');
                const leader = approvedRoster.find(m => m.internalRole === 'LEADER') || approvedRoster[0];
                const tId = team.teamId || team.teamName;
                const isSelected = selectedTeamId === String(tId);
                const isRegistered = ['APPROVED', 'PENDING'].includes(String(team.status).toUpperCase());

                return (
                    <div
                        key={tId}
                        className={`team-select-card ${isSelected ? 'selected' : ''} ${isRegistered ? 'disabled' : ''}`}
                        onClick={() => !isRegistered && onSelectTeam(String(tId))}
                    >
                        <div className="ts-header">
                            <h4>{team.teamName}</h4>
                            <div className={`ts-radio ${isSelected ? 'checked' : ''}`}></div>
                        </div>
                        <div className="ts-body">
                            {String(team.status).toUpperCase() !== 'FORMING' && (
                                <p><strong>Leader:</strong> <strong>{leader?.fullName || 'Not Selected'}</strong></p>
                            )}
                            <p><strong>Members:</strong> <strong>{approvedRoster.length} / {registeringComp?.maxTeamMembers || (team.maxMembers === 999 ? 5 : team.maxMembers) || 5}</strong></p>
                            <p><strong>Status:</strong> <span className={`ts-status ts-status-${String(team.status).toLowerCase().replace(/\s+/g, '-')}`}>{team.status}</span></p>
                        </div>
                        {isRegistered && <div className="ts-overlay">Participated</div>}

                        {isSelected && approvedRoster.length > 0 && (
                            <div className="ts-member-list" style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                                <p style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Select Team Leader:</p>
                                {approvedRoster.map(member => {
                                    const isErrorMember = (error && member.fullName && error.includes(member.fullName)) || member.isUnauthorized === true || member.hasAlreadyParticipated === true;
                                    return (
                                        <label key={member.studentId} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '6px' }}>
                                            <input
                                                type="radio"
                                                name="leaderSelect"
                                                value={member.studentId}
                                                checked={selectedLeaderId === member.studentId}
                                                onChange={() => onSelectLeader(member.studentId)}
                                            />
                                            <span style={{ fontSize: '14px', color: isErrorMember ? '#ef4444' : '#475569', fontWeight: isErrorMember ? '600' : 'normal' }}>
                                                {member.fullName}{member.studentCode ? ` - ${member.studentCode}` : ''} {member.internalRole === 'LEADER' ? '(Current)' : ''} {member.isUnauthorized ? '(Unauthorized University)' : ''} {member.hasAlreadyParticipated ? '(Already Participated)' : ''}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
/* ── Ineligible Members Confirmation Modal ── */
const IneligibleMembersModal = ({ members, onCancel, onConfirm, isSubmitting }) => {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
            <div style={{
                background: 'white', borderRadius: '14px', width: '100%', maxWidth: '700px',
                boxShadow: '0 24px 48px rgba(0,0,0,0.22)', overflow: 'hidden',
                margin: '0 20px'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '22px 30px', borderBottom: '1px solid #fee2e2', background: '#fff5f5'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#0f172a' }}>
                            Ineligible Team Members Found
                        </h3>
                    </div>
                    <button onClick={onCancel} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#64748b', fontSize: '24px', lineHeight: 1, padding: '2px'
                    }}>×</button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px 30px' }}>
                    <p style={{ margin: '0 0 18px', fontSize: '15px', color: '#475569', lineHeight: 1.7 }}>
                        The following member(s) <strong>cannot participate</strong> in this competition.
                        If you proceed, they will be <strong>automatically removed</strong> from the team.
                        Remaining eligible members will be kept.
                    </p>

                    <div style={{
                        border: '1px solid #fecaca', borderRadius: '10px',
                        overflow: 'hidden', marginBottom: '18px'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                            <tr style={{ background: '#fef2f2' }}>
                                <th style={{ padding: '13px 18px', textAlign: 'left', color: '#7f1d1d', fontWeight: 700, borderBottom: '1px solid #fecaca', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Member</th>
                                <th style={{ padding: '13px 18px', textAlign: 'left', color: '#7f1d1d', fontWeight: 700, borderBottom: '1px solid #fecaca', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Student Code</th>
                                <th style={{ padding: '13px 18px', textAlign: 'left', color: '#7f1d1d', fontWeight: 700, borderBottom: '1px solid #fecaca', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason</th>
                            </tr>
                            </thead>
                            <tbody>
                            {members.map((m, i) => (
                                <tr key={i} style={{ borderBottom: i < members.length - 1 ? '1px solid #fee2e2' : 'none' }}>
                                    <td style={{ padding: '13px 18px', color: '#0f172a', fontWeight: 700, fontSize: '15px' }}>{m.fullName}</td>
                                    <td style={{ padding: '13px 18px', color: '#334155', fontFamily: 'monospace', fontSize: '14px' }}>{m.studentCode}</td>
                                    <td style={{ padding: '13px 18px', color: '#dc2626', fontWeight: 600, fontSize: '14px' }}>{m.reason}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    <p style={{ margin: '0 0 22px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                        Do you want to proceed and register without these members?
                    </p>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            onClick={onCancel}
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 24px', background: 'white', color: '#475569',
                                border: '1px solid #cbd5e1', borderRadius: '8px',
                                fontWeight: 600, fontSize: '15px', cursor: 'pointer'
                            }}
                        >Cancel</button>
                        <button
                            onClick={onConfirm}
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 24px',
                                background: isSubmitting ? '#94a3b8' : '#1e293b',
                                color: 'white', border: 'none', borderRadius: '8px',
                                fontWeight: 600, fontSize: '15px', cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            {isSubmitting ? 'Processing...' : 'Accept & Remove'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CompetitionRegistration = () => {
    const [competitions, setCompetitions] = useState([]);
    const [myTeams, setMyTeams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [activeTab, setActiveTab] = useState('OPEN');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sortBy, setSortBy] = useState('NEWEST');
    const [viewDetailsComp, setViewDetailsComp] = useState(null);
    const [registeringComp, setRegisteringComp] = useState(null);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [selectedLeaderId, setSelectedLeaderId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    // Ineligible members modal state
    const [ineligibleModal, setIneligibleModal] = useState({ open: false, members: [], pendingRequest: null });
    const [participatedContestIds, setParticipatedContestIds] = useState(new Set());
    const loadData = async (silent = false) => {
        try {
            if (!silent) setIsLoading(true);
            const token = localStorage.getItem('shms_token');

            const contestsRes = await fetch(`${API_BASE}/contests`, { headers: { Authorization: `Bearer ${token}` } });
            const contestsJson = await safeJson(contestsRes);
            if (!contestsRes.ok) throw new Error(contestsJson.error || 'Failed to load contests');
            const contestList = normalizeList(contestsJson);
            setCompetitions(contestList);

            const statusResults = await Promise.all(
                contestList.map(async (contest) => {
                    try {
                        const res = await fetch(`${API_BASE}/teams/status?contestId=${contest.id}`, { headers: { Authorization: `Bearer ${token}` } });
                        return { contest, data: await safeJson(res) };
                    } catch { return null; }
                })
            );

            // Extract participated contest IDs (including closed/past ones)
            const participated = new Set(
                statusResults
                    .filter(res => res && res.data && !res.data.error &&
                        ['APPROVED', 'PENDING', 'CLOSED'].includes(String(res.data.status || '').toUpperCase()))
                    .map(res => res.contest.id)
            );
            setParticipatedContestIds(participated);

            let teams = statusResults
                .filter(res => res && res.data && !res.data.error && res.data.status !== 'NO TEAM' && String(res.data.status).toUpperCase() !== 'CLOSED' && !['CANCELED', 'CANCELLED'].includes(String(res.data.status).toUpperCase()))
                .map(res => res.data);

            const fallbackRes = await fetch(`${API_BASE}/teams/all-forming`, { headers: { Authorization: `Bearer ${token}` } });
            const fallbackDataList = await safeJson(fallbackRes);
            if (fallbackRes.ok && Array.isArray(fallbackDataList)) {
                fallbackDataList.forEach(data => {
                    const dataStatus = String(data.status).toUpperCase();
                    if (data && data.status !== 'NO TEAM' && dataStatus !== 'CLOSED' && !['CANCELED', 'CANCELLED'].includes(dataStatus)) {
                        teams.push(data);
                    }
                });
            }

            const uniqueTeamsMap = new Map();
            teams.forEach(t => {
                const id = String(t.teamId || t.teamName || '').toUpperCase();
                if (id && !uniqueTeamsMap.has(id)) uniqueTeamsMap.set(id, t);
            });

            setMyTeams(Array.from(uniqueTeamsMap.values()));
            setError('');

            const autoRegId = searchParams.get('contestId');
            if (autoRegId) {
                const target = contestList.find(c => String(c.id) === String(autoRegId));
                if (target) {
                    setRegisteringComp(target);
                    setTimeout(() => { document.getElementById('reg-flow-section')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
                }
            }
        } catch (err) {
            console.error(err);
            setError('Could not connect to server.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [searchParams]);

    // Filter & Sort Logic
    const filteredCompetitions = useMemo(() => {
        let result = competitions.filter(c => {
            const cat = categorizeCompetition(c);
            if (activeTab === 'OPEN') return cat === 'ACTIVED' || cat === 'UPCOMING';
            return cat === activeTab;
        });

        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            result = result.filter(c => c.name?.toLowerCase().includes(kw));
        }

        result.sort((a, b) => {
            const catA = categorizeCompetition(a);
            const catB = categorizeCompetition(b);

            if (catA === 'ACTIVED' && catB !== 'ACTIVED') return -1;
            if (catB === 'ACTIVED' && catA !== 'ACTIVED') return 1;

            if (sortBy === 'REG_DEADLINE') return new Date(a.registrationEnd) - new Date(b.registrationEnd);
            if (sortBy === 'DATE') return new Date(a.startDate) - new Date(b.startDate);
            return b.id - a.id;
        });

        return result;
    }, [competitions, activeTab, searchKeyword, sortBy]);

    const handleRegisterClick = (comp) => {
        setRegisteringComp(comp);
        setSelectedTeamId('');
        setSelectedLeaderId('');
        setSuccessMessage('');
        setError('');
        setTimeout(() => { document.getElementById('reg-flow-section')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    };

    const handleSubmitRegistration = async () => {
        if (!registeringComp || !selectedTeamId) { setError('Please select a team.'); return; }
        const team = myTeams.find(t => String(t.teamId) === String(selectedTeamId) || t.teamName === selectedTeamId);
        if (!team) return;

        if (['APPROVED', 'PENDING'].includes(String(team.status).toUpperCase())) {
            setError('This team is already registered or pending approval.'); return;
        }

        const roster = Array.isArray(team.roster) ? team.roster : [];
        const leader = roster.find(m => m.studentId === selectedLeaderId) || roster.find(m => m.internalRole === 'LEADER') || roster[0];
        if (!leader) { setError('Team has no leader.'); return; }
        if (!selectedLeaderId) { setError('Please select a team leader from the list.'); return; }

        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('shms_token');
            const response = await fetch(`${API_BASE}/teams/register-official`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teamName: team.teamName, contestId: registeringComp.id, leaderStudentId: leader.studentCode || leader.studentId }),
            });
            const result = await safeJson(response);

            if (!response.ok) throw new Error(result.error || result.message || 'Registration failed.');

            // Check if there are ineligible members – show confirmation modal
            if (result.status === 'INELIGIBLE_MEMBERS' && Array.isArray(result.ineligibleMembers)) {
                setIneligibleModal({
                    open: true,
                    members: result.ineligibleMembers,
                    pendingRequest: {
                        teamName: team.teamName,
                        contestId: registeringComp.id,
                        leaderStudentId: leader.studentCode || leader.studentId
                    }
                });
                return;
            }

            // Normal success
            if (result.newToken) {
                localStorage.setItem('shms_token', result.newToken);
            }
            setSuccessMessage('Registered Successfully!');
            setError('');
            setRegisteringComp(null);
            setSelectedTeamId('');
            loadData(true);
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 500);
        } catch (err) {
            setError(err.message || 'Registration failed.');
            setTimeout(() => { loadData(true); }, 5000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForceApprove = async () => {
        if (!ineligibleModal.pendingRequest) return;
        try {
            setIsSubmitting(true);
            const token = localStorage.getItem('shms_token');
            const response = await fetch(`${API_BASE}/teams/register-force`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(ineligibleModal.pendingRequest),
            });
            const result = await safeJson(response);

            if (!response.ok) throw new Error(result.error || result.message || 'Registration failed.');

            if (result.newToken) {
                localStorage.setItem('shms_token', result.newToken);
            }
            setIneligibleModal({ open: false, members: [], pendingRequest: null });
            setSuccessMessage('Team registered successfully! Ineligible members have been removed.');
            setError('');
            setRegisteringComp(null);
            setSelectedTeamId('');
            loadData(true);
            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 500);
        } catch (err) {
            setError(err.message || 'Force registration failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const stats = useMemo(() => {
        let open = 0, upcoming = 0, past = 0;
        competitions.forEach(c => {
            const cat = categorizeCompetition(c);
            if (cat === 'ACTIVED') open++;
            if (cat === 'UPCOMING') upcoming++;
            if (cat === 'PAST') past++;
        });
        return { total: competitions.length, open, upcoming, past };
    }, [competitions]);

    const pastCompetitions = useMemo(() => {
        return competitions
            .filter(c => categorizeCompetition(c) === 'PAST')
            .sort((a, b) => new Date(b.contestEndAt || b.endDate || 0) - new Date(a.contestEndAt || a.endDate || 0));
    }, [competitions]);

    const selectedTeamFull = selectedTeamId ? myTeams.find(t => String(t.teamId) === String(selectedTeamId) || t.teamName === selectedTeamId) : null;

    if (isLoading) return (
        <div className="global-loading">
            <div className="global-spinner"></div>
            <span>Loading competitions...</span>
        </div>
    );

    return (
        <div className="cr-page">

            <div className="cr-main-content">
                {successMessage && (
                    <div className="cr-alert cr-alert-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
                        {successMessage}
                    </div>
                )}
                {error && !registeringComp && (
                    <div className="cr-alert cr-alert-error">{error}</div>
                )}

                <div className="cr-grid">
                    {filteredCompetitions.length === 0 ? (
                        <div className="cr-empty-state">No competitions found for this category.</div>
                    ) : (
                        filteredCompetitions.map(comp => (
                            <CompetitionCard
                                key={comp.id}
                                comp={comp}
                                onViewDetails={setViewDetailsComp}
                                onRegister={handleRegisterClick}
                                isRegistering={registeringComp?.id === comp.id}
                                myTeams={myTeams}
                                participatedContestIds={participatedContestIds}
                            />
                        ))
                    )}
                </div>

                {/* Past / Closed Competitions Section */}
                {pastCompetitions.length > 0 && (
                    <div style={{ marginTop: '40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>Past Competitions</h2>
                            <span style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '2px 12px', fontSize: '13px', fontWeight: '600' }}>{pastCompetitions.length}</span>
                        </div>
                        <div className="cr-grid">
                            {pastCompetitions.map(comp => (
                                <CompetitionCard
                                    key={comp.id}
                                    comp={comp}
                                    onViewDetails={setViewDetailsComp}
                                    onRegister={handleRegisterClick}
                                    isRegistering={false}
                                    myTeams={myTeams}
                                    participatedContestIds={participatedContestIds}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {registeringComp && (
                    <div id="reg-flow-section" className="reg-flow-section">
                        <div className="reg-flow-header">
                            <h2>Complete Your Registration</h2>
                            <button className="cancel-reg-btn" onClick={() => { setRegisteringComp(null); setError(''); }}>Cancel</button>
                        </div>

                        <div className="reg-flow-content">
                            <div className="reg-team-selection">
                                <h3>Choose a Team</h3>
                                <p>Select one of your existing teams to register for <strong>{registeringComp.name}</strong>.</p>
                                <TeamSelector
                                    myTeams={myTeams}
                                    selectedTeamId={selectedTeamId}
                                    onSelectTeam={(tId) => {
                                        setSelectedTeamId(tId);
                                        const t = myTeams.find(x => String(x.teamId) === String(tId) || x.teamName === tId);
                                        const r = Array.isArray(t?.roster) ? t.roster : [];
                                        const curLeader = r.find(m => m.internalRole === 'LEADER') || r[0];
                                        setSelectedLeaderId(curLeader?.studentId || '');
                                    }}
                                    registeringComp={registeringComp}
                                    selectedLeaderId={selectedLeaderId}
                                    onSelectLeader={setSelectedLeaderId}
                                    error={error}
                                />
                            </div>

                            <div className="reg-summary-panel">
                                <h3>Registration Summary</h3>
                                <div className="summary-item">
                                    <span className="s-label">Competition:</span>
                                    <span className="s-val">{registeringComp.name}</span>
                                </div>
                                <div className="summary-item">
                                    <span className="s-label">Selected Team:</span>
                                    <span className="s-val">{selectedTeamFull ? selectedTeamFull.teamName : '--'}</span>
                                </div>
                                {selectedTeamFull && (
                                    <>
                                        <div className="summary-item">
                                            <span className="s-label">Leader:</span>
                                            <span className="s-val">{(selectedTeamFull.roster || []).filter(m => (m.status || '').toUpperCase() !== 'PENDING').find(m => m.studentId === selectedLeaderId)?.fullName || 'Not Selected'}</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="s-label">Members:</span>
                                            <span className="s-val">{(selectedTeamFull.roster || []).filter(m => (m.status || '').toUpperCase() !== 'PENDING').length} / {registeringComp?.maxTeamMembers || (selectedTeamFull.maxMembers === 999 ? 5 : selectedTeamFull.maxMembers) || 5}</span>
                                        </div>
                                    </>
                                )}

                                {error && <div className="cr-alert cr-alert-error small-alert">{error}</div>}

                                <button
                                    className="btn-primary btn-large btn-block mt-4"
                                    disabled={!selectedTeamId || isSubmitting}
                                    onClick={handleSubmitRegistration}
                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                                >
                                    {isSubmitting ? 'Processing...' : 'Register Competition'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {viewDetailsComp && (
                <ContestDetailModal
                    contest={viewDetailsComp}
                    onClose={() => setViewDetailsComp(null)}
                    hasParticipated={participatedContestIds?.has(viewDetailsComp.id)}
                />
            )}

            {ineligibleModal.open && (
                <IneligibleMembersModal
                    members={ineligibleModal.members}
                    isSubmitting={isSubmitting}
                    onCancel={() => setIneligibleModal({ open: false, members: [], pendingRequest: null })}
                    onConfirm={handleForceApprove}
                />
            )}
        </div>
    );
};

export default CompetitionRegistration;

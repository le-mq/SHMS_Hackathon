import { useState, useEffect, useMemo } from 'react';
import './CompetitionRegistration.css';

const API_BASE = 'http://localhost:8080/api/v1/student';

const normalizeList = (json) => (Array.isArray(json) ? json : json?.data || []);
const safeJson = async (res) => { try { return await res.json(); } catch { return {}; } };

const categorizeCompetition = (c) => {
    const status = String(c.status || '').toUpperCase();
    if (['CLOSED', 'ENDED', 'INACTIVE'].includes(status)) return 'PAST';
    const now = new Date();
    const regStart = new Date(c.registrationStart);
    if (regStart && regStart > now) return 'UPCOMING';

    return 'OPEN';
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
    } catch(e) {
        return <p style={{ color: '#475569' }}>{rulesStr}</p>;
    }
};

const CompetitionCard = ({ comp, onViewDetails, onRegister, isRegistering, myTeams }) => {
    const cat = categorizeCompetition(comp);
    const isOpen = cat === 'OPEN';

    const isAlreadyRegistered = myTeams?.some(team =>
        team.contestName === comp.name && ['APPROVED', 'PENDING'].includes(String(team.status).toUpperCase())
    );

    return (
        <div className={`comp-card ${isRegistering ? 'highlight' : ''}`}>
            <div className="comp-card-banner">
                <span className={`comp-badge badge-${cat.toLowerCase()}`}>{cat}</span>
            </div>
            <div className="comp-card-content">
                <h3 className="comp-title">{comp.name}</h3>
                <p className="comp-desc">An exciting competition to showcase your coding skills.</p>
                <div className="comp-meta">
                    <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span>Reg: {formatDateTime(comp.registrationStart)} - {formatDateTime(comp.registrationEnd)}</span>
                    </div>
                    <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span>Date: {formatDateTime(comp.contestStartAt)} - {formatDateTime(comp.contestEndAt)}</span>
                    </div>
                    <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        <span>Team Size: {comp.minTeamMembers || 3} - {comp.maxTeamMembers || 5}</span>
                    </div>
                </div>
            </div>
            <div className="comp-card-actions">
                <button className="btn-secondary" onClick={() => onViewDetails(comp)}>View Details</button>
                {isAlreadyRegistered ? (
                    <button
                        className="btn-primary"
                        disabled
                        style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: 'white', opacity: 0.9 }}
                    >
                        Already Registered
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        disabled={!isOpen}
                        onClick={() => onRegister(comp)}
                    >
                        {isOpen ? 'Register' : 'Closed'}
                    </button>
                )}
            </div>
        </div>
    );
};

const CompetitionDetailModal = ({ comp, onClose }) => {
    if (!comp) return null;
    return (
        <div className="cr-modal-overlay" onClick={onClose}>
            <div className="cr-modal" onClick={e => e.stopPropagation()}>
                <div className="cr-modal-header">
                    <h2>{comp.name}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="cr-modal-body">
                    <section>
                        <h3>Description</h3>
                        <p>{comp.description || `Welcome to ${comp.name}. This is an exciting opportunity to showcase your talent, solve challenging problems, and compete with peers.`}</p>
                    </section>
                    <div className="modal-grid">
                        <div className="modal-info-box">
                            <h4>Timeline</h4>
                            <p><strong>Registration:</strong> {formatDateTime(comp.registrationStart)} - {formatDateTime(comp.registrationEnd)}</p>
                            <p><strong>Competition:</strong> {formatDateTime(comp.contestStartAt)} - {formatDateTime(comp.contestEndAt)}</p>
                        </div>
                        <div className="modal-info-box">
                            <h4>Requirements & Categories</h4>
                            <p><strong>Team Size:</strong> {comp.minTeamMembers || 3} - {comp.maxTeamMembers || 5} members</p>
                            <p><strong>Category:</strong> {comp.categories?.length > 0 ? comp.categories.join(', ') : 'Not specified'}</p>
                        </div>
                    </div>
                    <section className="modal-section">
                        <div className="section-header" style={{ marginBottom: '16px' }}>
                            <h3>Compliance Rules</h3>
                        </div>
                        <div className="rules-box" style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {renderComplianceRules(comp.complianceRules)}
                        </div>
                    </section>
                    <section className="modal-section">
                        <div className="section-header" style={{ marginBottom: '16px' }}>
                            <h3>Location & Prizes</h3>
                        </div>
                        <div className="location-box" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '1.2rem' }}>📍</span>
                            <strong>Location:</strong> <span>{comp.location || 'Online / TBA'}</span>
                        </div>
                        <div className="prizes-box">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '1.2rem' }}>💵</span>
                                <strong>Prizes:</strong>
                            </div>
                            {renderPrizes(comp.tieredPrizeStructures)}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const TeamSelector = ({ myTeams, selectedTeamId, onSelectTeam, registeringComp, selectedLeaderId, onSelectLeader }) => {
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
                const leader = roster.find(m => m.internalRole === 'LEADER') || roster[0];
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
                            <p><strong>Members:</strong> <strong>{roster.length} / {registeringComp?.maxTeamMembers || (team.maxMembers === 999 ? 5 : team.maxMembers) || 5}</strong></p>
                            <p><strong>Status:</strong> <span className={`ts-status ts-status-${String(team.status).toLowerCase().replace(/\s+/g, '-')}`}>{team.status}</span></p>
                        </div>
                        {isRegistered && <div className="ts-overlay">Already Registered</div>}

                        {isSelected && roster.length > 0 && (
                            <div className="ts-member-list" style={{ marginTop: '16px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                                <p style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Select Team Leader:</p>
                                {roster.map(member => (
                                    <label key={member.studentId} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '6px' }}>
                                        <input
                                            type="radio"
                                            name="leaderSelect"
                                            value={member.studentId}
                                            checked={selectedLeaderId === member.studentId}
                                            onChange={() => onSelectLeader(member.studentId)}
                                        />
                                        <span style={{ fontSize: '14px', color: '#475569' }}>
                                            {member.fullName}{member.studentCode ? ` - ${member.studentCode}` : ''} {member.internalRole === 'LEADER' ? '(Current)' : ''}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
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
    const loadData = async () => {
        try {
            setIsLoading(true);
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

            let teams = statusResults
                .filter(res => res && res.data && !res.data.error && res.data.status !== 'NO TEAM' && String(res.data.status).toUpperCase() !== 'CLOSED')
                .map(res => res.data);

            const fallbackRes = await fetch(`${API_BASE}/teams/all-forming`, { headers: { Authorization: `Bearer ${token}` } });
            const fallbackDataList = await safeJson(fallbackRes);
            if (fallbackRes.ok && Array.isArray(fallbackDataList)) {
                fallbackDataList.forEach(data => {
                    if (data && data.status !== 'NO TEAM' && String(data.status).toUpperCase() !== 'CLOSED') {
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
        } catch (err) {
            console.error(err);
            setError('Could not connect to server.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // Filter & Sort Logic
    const filteredCompetitions = useMemo(() => {
        let result = competitions.filter(c => categorizeCompetition(c) === activeTab);

        if (searchKeyword) {
            const kw = searchKeyword.toLowerCase();
            result = result.filter(c => c.name?.toLowerCase().includes(kw));
        }

        result.sort((a, b) => {
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

        const allowed = registeringComp.allowedUniversities || [];
        if (allowed.length > 0) {
            const ineligible = roster.filter(m => !allowed.includes(m.universityName));
            if (ineligible.length > 0) {
                setError(`Members (${ineligible.map(m => m.fullName).join(', ')}) are not eligible.`); return;
            }
        }

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

            setSuccessMessage('Registered Successfully!');
            setError('');
            setRegisteringComp(null);
            setSelectedTeamId('');
            loadData();

            setTimeout(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 500);
        } catch (err) {
            setError(err.message || 'Registration failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const stats = useMemo(() => {
        let open = 0, upcoming = 0;
        competitions.forEach(c => {
            const cat = categorizeCompetition(c);
            if (cat === 'OPEN') open++;
            if (cat === 'UPCOMING') upcoming++;
        });
        return { total: competitions.length, open, upcoming };
    }, [competitions]);

    const selectedTeamFull = selectedTeamId ? myTeams.find(t => String(t.teamId) === String(selectedTeamId) || t.teamName === selectedTeamId) : null;

    if (isLoading) return <div className="cr-loading"><div className="spinner"></div>Loading competitions...</div>;

    return (
        <div className="cr-page">

            <div className="cr-main-content">
                {successMessage && (
                    <div className="cr-alert cr-alert-success">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>
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
                            />
                        ))
                    )}
                </div>

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
                                            <span className="s-val">{selectedTeamFull.roster?.find(m => m.studentId === selectedLeaderId)?.fullName || 'Not Selected'}</span>
                                        </div>
                                        <div className="summary-item">
                                            <span className="s-label">Members:</span>
                                            <span className="s-val">{(selectedTeamFull.roster || []).length} / {registeringComp?.maxTeamMembers || (selectedTeamFull.maxMembers === 999 ? 5 : selectedTeamFull.maxMembers) || 5}</span>
                                        </div>
                                    </>
                                )}

                                {error && <div className="cr-alert cr-alert-error small-alert">{error}</div>}

                                <button
                                    className="btn-primary btn-large btn-block mt-4"
                                    disabled={!selectedTeamId || isSubmitting}
                                    onClick={handleSubmitRegistration}
                                >
                                    {isSubmitting ? 'Processing...' : 'Register Competition'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {viewDetailsComp && (
                <CompetitionDetailModal comp={viewDetailsComp} onClose={() => setViewDetailsComp(null)} />
            )}
        </div>
    );
};

export default CompetitionRegistration;

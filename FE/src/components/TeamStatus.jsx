import { useState, useEffect } from 'react';
import './TeamStatus.css';
import NavbarStudent from './NavbarStudent';

const API_BASE = 'http://localhost:8080/api/v1/student';
const UNAVAILABLE_CONTEST_STATUSES = new Set(['CLOSED', 'ENDED', 'INACTIVE']);

const isContestRegistrable = (contest) => {
    const status = String(contest?.status || '').trim().toUpperCase();
    return !UNAVAILABLE_CONTEST_STATUSES.has(status);
};

const TeamStatus = () => {
    const [teamData, setTeamData] = useState(null);
    const [contests, setContests] = useState([]);
    const [categories, setCategories] = useState([]);
    const [participatedTeams, setParticipatedTeams] = useState([]);
    const [contestCategories, setContestCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [formTeamName, setFormTeamName] = useState('');
    const [selectedContestId, setSelectedContestId] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [selectedLeader, setSelectedLeader] = useState('');
    const [viewContestId, setViewContestId] = useState('');

    const emptyTeam = {
        teamName: 'Not available',
        categoryName: 'Not available',
        invitationCode: 'N/A',
        status: 'NO TEAM',
        roster: [],
    };

    const normalizeList = (json) => {
        if (Array.isArray(json)) return json;
        return json?.data || [];
    };

    const safeJson = async (res) => {
        try {
            return await res.json();
        } catch {
            return {};
        }
    };

    const isJoinedTeam = (item) => {
        return item && item.data && !item.data.error && item.data.status !== 'NO TEAM';
    };

    const applyTeamData = (team, contestList, categoryList, contestId = '') => {
        setTeamData(team);
        setContests(contestList);
        setCategories(categoryList);

        setFormTeamName(team?.teamName || '');
        setSelectedContestId(String(contestId || team?.contestId || ''));

        const matchedCategory = categoryList.find(
            c =>
                String(c.id) === String(team?.categoryId) ||
                c.name === team?.categoryName
        );

        setSelectedCategoryId(matchedCategory ? String(matchedCategory.id) : '');

        if (team?.roster?.length > 0) {
            const currentLeader = team.roster.find(m => m.internalRole === 'LEADER');
            setSelectedLeader(currentLeader ? currentLeader.studentId : team.roster[0].studentId);
        } else {
            setSelectedLeader('');
        }

        setError('');
    };

    useEffect(() => {
        let cancelled = false;

        const loadFromApi = async () => {
            const token = localStorage.getItem('shms_token');

            const [contestsRes, categoriesRes] = await Promise.all([
                fetch(`${API_BASE}/contests`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                fetch(`${API_BASE}/categories`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);

            const contestsJson = await safeJson(contestsRes);
            const categoriesJson = await safeJson(categoriesRes);

            if (!contestsRes.ok) {
                throw new Error(contestsJson.error || 'Failed to load contests');
            }

            const contestList = normalizeList(contestsJson);
            const categoryList = normalizeList(categoriesJson);

            const statusResults = await Promise.all(
                contestList.map(async (contest) => {
                    try {
                        const res = await fetch(`${API_BASE}/teams/status?contestId=${contest.id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });

                        const data = await safeJson(res);

                        return {
                            contest,
                            data,
                        };
                    } catch {
                        return null;
                    }
                })
            );

            const joinedTeams = statusResults.filter(isJoinedTeam);
            const currentContestId = String(
                viewContestId || joinedTeams[0]?.contest?.id || ''
            );

            if (cancelled) return;

            setContests(contestList);
            setCategories(categoryList);
            setParticipatedTeams(joinedTeams);

            if (currentContestId) {
                const currentTeam = joinedTeams.find(
                    item => String(item.contest.id) === currentContestId
                );

                if (!viewContestId) {
                    setViewContestId(currentContestId);
                }

                if (currentTeam) {
                    applyTeamData(currentTeam.data, contestList, categoryList, currentContestId);
                } else {
                    setTeamData(null);
                }
            } else {
                setTeamData(null);
                setFormTeamName('');
                setSelectedContestId('');
                setSelectedCategoryId('');
                setSelectedLeader('');
                setError('');
            }
        };

        const loadFromMock = async () => {
            const localRes = await fetch('/testFE.json');

            if (!localRes.ok) {
                throw new Error('Not found testFE.json');
            }

            const localJson = await localRes.json();
            const mockContests = localJson.teamStatusContests?.data || [];
            const mockCategories = localJson.teamStatusCategories?.data || [];

            const mockJoinedTeams = mockContests
                .map(contest => ({
                    contest,
                    data: localJson.teamStatusByContest?.[String(contest.id)],
                }))
                .filter(isJoinedTeam);

            const currentContestId = String(
                viewContestId || mockJoinedTeams[0]?.contest?.id || ''
            );

            if (cancelled) return;

            setContests(mockContests);
            setCategories(mockCategories);
            setParticipatedTeams(mockJoinedTeams);

            if (currentContestId) {
                const currentTeam = mockJoinedTeams.find(
                    item => String(item.contest.id) === currentContestId
                );

                if (!viewContestId) {
                    setViewContestId(currentContestId);
                }

                if (currentTeam) {
                    applyTeamData(currentTeam.data, mockContests, mockCategories, currentContestId);
                } else {
                    setTeamData(null);
                }
            } else {
                setTeamData(null);
                setFormTeamName('');
                setSelectedContestId('');
                setSelectedCategoryId('');
                setSelectedLeader('');
                setError('');
            }
        };

        const fetchTeamStatus = async () => {
            try {
                setIsLoading(true);
                await loadFromApi();
            } catch (apiError) {
                console.warn('Team status API unavailable, use mock:', apiError.message);

                try {
                    await loadFromMock();
                } catch (mockError) {
                    console.warn('Team status mock unavailable:', mockError.message);

                    if (!cancelled) {
                        setError('Could not connect to server.');
                        setTeamData(null);
                    }
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchTeamStatus();

        return () => {
            cancelled = true;
        };
    }, [viewContestId]);

    const getCategoryContestId = (category) => {
        return (
            category.contestId ||
            category.contestID ||
            category.contest_id ||
            category.contest?.id ||
            category.hackathonId ||
            category.hackathonID ||
            category.hackathon_id ||
            category.hackathon?.id ||
            category.eventId ||
            category.event_id
        );
    };
    
    useEffect(() => {
        if (!selectedContestId) {
            return;
        }

        let cancelled = false;

        const getCategoryId = (category) => {
            return category.id || category.categoryId;
        };

        const getCategoryName = (category) => {
            return category.name || category.categoryName || '';
        };

        const getContestCategoryList = () => {
            const selectedContest = contests.find(
                contest => String(contest.id) === String(selectedContestId)
            );

            return (
                selectedContest?.categories ||
                selectedContest?.categoryTracks ||
                selectedContest?.tracks ||
                []
            );
        };

        const filterByContest = (categoryList, allowServerFilteredList = false) => {
            const contestCategoryList = getContestCategoryList();

            if (contestCategoryList.length > 0) {
                const contestCategoryIds = contestCategoryList
                    .map(category => String(category.id || category.categoryId || category))
                    .filter(Boolean);

                const contestCategoryNames = contestCategoryList
                    .map(category =>
                        String(category.name || category.categoryName || category)
                            .trim()
                            .toLowerCase()
                    )
                    .filter(Boolean);

                return categoryList.filter(category => {
                    const categoryId = String(getCategoryId(category));
                    const categoryName = getCategoryName(category).trim().toLowerCase();

                    return (
                        contestCategoryIds.includes(categoryId) ||
                        contestCategoryNames.includes(categoryName)
                    );
                });
            }

            const hasContestId = categoryList.some(category =>
                getCategoryContestId(category)
            );

            if (hasContestId) {
                return categoryList.filter(category =>
                    String(getCategoryContestId(category)) === String(selectedContestId)
                );
            }

            if (allowServerFilteredList && categoryList.length !== categories.length) {
                return categoryList;
            }

            return [];
        };

        async function fetchContestCategories() {
            try {
                const token = localStorage.getItem('shms_token');

                const res = await fetch(`${API_BASE}/categories?contestId=${selectedContestId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const json = await safeJson(res);

                if (!res.ok) {
                    throw new Error(json.error || 'Failed to load contest categories');
                }

                const list = normalizeList(json);
                const filtered = filterByContest(list, true);

                if (!cancelled) {
                    setContestCategories(filtered);

                    if (
                        selectedCategoryId &&
                        !filtered.some(category => String(getCategoryId(category)) === String(selectedCategoryId))
                    ) {
                        setSelectedCategoryId('');
                    }
                }
            } catch (err) {
                console.warn('Contest categories API unavailable:', err.message);

                const filtered = filterByContest(categories, false);

                if (!cancelled) {
                    setContestCategories(filtered);

                    if (
                        selectedCategoryId &&
                        !filtered.some(category => String(getCategoryId(category)) === String(selectedCategoryId))
                    ) {
                        setSelectedCategoryId('');
                    }
                }
            }
        }

        fetchContestCategories();

        return () => {
            cancelled = true;
        };
    }, [selectedContestId, selectedCategoryId, categories, contests]);

    const data = teamData || emptyTeam;
    const status = data.status || 'NO TEAM';
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');

    const hasTeam = status !== 'NO TEAM';

    const canLeaveTeam = participatedTeams.some(item =>
        hasTeam &&
        String(item.contest.id) === String(viewContestId) &&
        item.contest.status === 'ACTIVE' &&
        status.toUpperCase() !== 'APPROVED'
    );

    const isSubmitted = status === 'APPROVED' || status === 'PENDING';

    const displayCategory = hasTeam
        ? isSubmitted ? data.categoryName : 'Not choose'
        : 'Not available';
    const approvedParticipatedTeams = participatedTeams.filter(item => {
        return item?.data?.status?.toUpperCase() === 'APPROVED';
    });
    const registrableContests = contests.filter(isContestRegistrable);
    const selectedContest = contests.find(
        contest => String(contest.id) === String(selectedContestId)
    );
    const registrationContestId =
        selectedContest && isContestRegistrable(selectedContest)
            ? selectedContestId
            : '';

    const getInitials = (name = '') => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    };

    const copyToClipboard = () => {
        if (!data.invitationCode || data.invitationCode === 'N/A') return;

        navigator.clipboard.writeText(data.invitationCode);
        alert('Invitation code copied!');
    };

    const handleSelectTeam = (contestId) => {
        const id = String(contestId);

        setViewContestId(id);
        setSelectedContestId(id);
        setSelectedCategoryId('');
        setSelectedLeader('');
        setFormTeamName('');
        setTeamData(null);
        setSuccessMessage('');
        setError('');
    };

    const handleSubmitRegistration = async () => {
        if (!selectedContestId || !selectedCategoryId || !formTeamName) {
            setError('Please fill in all general information fields.');
            return;
        }

        const contestToRegister = contests.find(
            contest => String(contest.id) === String(selectedContestId)
        );

        if (contestToRegister && !isContestRegistrable(contestToRegister)) {
            setError('This contest is closed and no longer accepts registrations.');
            return;
        }

        try {
            const token = localStorage.getItem('shms_token');

            const response = await fetch(`${API_BASE}/teams/register-official`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    teamName: formTeamName,
                    contestId: selectedContestId,
                    categoryId: selectedCategoryId,
                    leaderStudentId: selectedLeader,
                }),
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Registration failed.');
            }

            setSuccessMessage('Registration submitted successfully!');
            setError('');
            window.location.reload();
        } catch (err) {
            console.warn('Register team API unavailable, use mock:', err.message);

            const selectedCategory = categories.find(
                c => String(c.id) === String(selectedCategoryId)
            );

            const updatedTeam = {
                ...data,
                teamName: formTeamName,
                categoryName: selectedCategory?.name || 'Not choose',
                status: 'PENDING',
                roster: data.roster || [],
            };

            setTeamData(updatedTeam);

            setParticipatedTeams(prev => {
                const selectedContest = contests.find(
                    c => String(c.id) === String(selectedContestId)
                );

                if (!selectedContest) return prev;

                const existed = prev.some(
                    item => String(item.contest.id) === String(selectedContestId)
                );

                if (existed) {
                    return prev.map(item =>
                        String(item.contest.id) === String(selectedContestId)
                            ? { ...item, data: updatedTeam }
                            : item
                    );
                }

                return [
                    ...prev,
                    {
                        contest: selectedContest,
                        data: updatedTeam,
                    },
                ];
            });

            setViewContestId(String(selectedContestId));
            setSuccessMessage('Mock: Registration submitted successfully!');
            setError('');
        }
    };

    const resetAfterLeaveTeam = () => {
        const currentId = String(viewContestId);

        const nextTeams = participatedTeams.filter(
            item => String(item.contest.id) !== currentId
        );

        setParticipatedTeams(nextTeams);
        setTeamData(null);
        setFormTeamName('');
        setSelectedContestId('');
        setSelectedCategoryId('');
        setSelectedLeader('');

        if (nextTeams.length > 0) {
            setViewContestId(String(nextTeams[0].contest.id));
        } else {
            setViewContestId('');
        }
    };

    const handleLeaveTeam = async () => {
        if (!hasTeam) return;

        if (!window.confirm('Are you sure you want to leave this team?')) return;

        try {
            const token = localStorage.getItem('shms_token');

            const response = await fetch(`${API_BASE}/teams/leave`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await safeJson(response);

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Failed to leave team.');
            }

            resetAfterLeaveTeam();
            setSuccessMessage('Left team successfully!');
            setError('');
        } catch (err) {
            console.warn('Leave team API unavailable, use mock:', err.message);

            resetAfterLeaveTeam();
            setSuccessMessage('Mock: Left team successfully!');
            setError('');
        }
    };

    return (
        <div className="status-container">
            <NavbarStudent />

            <div className="status-layout-wrapper">
                <div className="status-sidebar">
                    <div className="sidebar-title">My Joined Teams</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {approvedParticipatedTeams.length > 0 ? approvedParticipatedTeams.map(pt => (
                            <div
                                key={pt.contest.id}
                                className={`sidebar-item ${viewContestId === String(pt.contest.id) ? 'active' : ''}`}
                                onClick={() => handleSelectTeam(pt.contest.id)}
                            >
                                <div className="sidebar-item-team">{pt.data.teamName}</div>
                                <div className="sidebar-item-contest">{pt.contest.name}</div>

                                <div className="sidebar-item-footer">
                                    <span className={`contest-status-badge ${pt.contest.status === 'ACTIVE' ? 'active' : 'ended'}`}>
                                        {pt.contest.status === 'ACTIVE' ? 'Active' : 'Ended'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div
                                style={{
                                    color: '#64748b',
                                    fontSize: '14px',
                                    fontStyle: 'italic',
                                    padding: '8px',
                                }}
                            >
                                No participated teams found.
                            </div>
                        )}
                    </div>
                </div>

                <div className="status-content">
                    <div className="status-header-flex">
                        <div>
                            <h1 className="status-title">My Team Status</h1>
                            <p className="status-subtitle">
                                Manage your hackathon team roster and tracking information.
                            </p>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {canLeaveTeam && (
                                <button
                                    onClick={handleLeaveTeam}
                                    style={{
                                        padding: '8px 14px',
                                        background: '#ef4444',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '999px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Leave Team
                                </button>
                            )}

                            <div className={`team-badge ${statusClass}`}>
                                <div className="team-badge-dot"></div>
                                {status === 'PENDING'
                                    ? 'Pending Approval'
                                    : status === 'NO TEAM'
                                        ? 'No Team'
                                        : status}
                            </div>
                        </div>
                    </div>

                    {isLoading && (
                        <div style={{ color: '#64748b', marginBottom: '20px' }}>
                            Loading team status...
                        </div>
                    )}

                    {error && (
                        <div style={{ color: 'red', marginBottom: '20px' }}>
                            {error}
                        </div>
                    )}

                    <div className="cards-row">
                        <div className="info-card">
                            <div className="card-label">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                TEAM NAME
                            </div>
                            <div className="card-value">{data.teamName}</div>
                        </div>

                        <div className="info-card">
                            <div className="card-label">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                SELECTED TRACK
                            </div>
                            <div className="card-value">{displayCategory}</div>
                        </div>

                        <div className="info-card dark">
                            <svg className="dark-bg-icon" width="120" height="120" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>

                            <div className="card-label">INVITATION CODE</div>
                            <div className="card-value">
                                {data.invitationCode}

                                <button className="copy-btn" onClick={copyToClipboard} title="Copy Code">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="roster-section">
                        <div className="roster-header">
                            <h2 className="roster-title">Member Roster</h2>
                        </div>

                        <table className="roster-table">
                            <thead>
                                <tr>
                                    <th>FULL NAME</th>
                                    <th>STUDENT ID</th>
                                    <th>EMAIL</th>
                                    <th>INTERNAL ROLE</th>
                                </tr>
                            </thead>

                            <tbody>
                                {data.roster.length > 0 ? data.roster.map((member, idx) => {
                                    const displayRole = isSubmitted ? member.internalRole : 'MEMBER';

                                    return (
                                        <tr key={idx}>
                                            <td>
                                                <div className="member-name-col">
                                                    <div className="member-avatar">
                                                        {getInitials(member.fullName)}
                                                    </div>
                                                    <span className="member-name">{member.fullName}</span>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="member-id">{member.studentId}</span>
                                            </td>

                                            <td>
                                                <span className="member-email">{member.email}</span>
                                            </td>

                                            <td>
                                                <span className={`role-badge ${displayRole === 'LEADER' ? 'role-leader' : 'role-member'}`}>
                                                    {displayRole}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td
                                            colSpan="4"
                                            style={{
                                                textAlign: 'center',
                                                padding: '20px',
                                                color: '#64748b',
                                            }}
                                        >
                                            No team members available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div
                        className="registration-form-section"
                        style={{
                            background: '#fff',
                            borderRadius: '12px',
                            padding: '24px',
                            marginTop: '24px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        }}
                    >
                        <div
                            className="section-header"
                            style={{
                                marginBottom: '20px',
                                borderBottom: '1px solid #e2e8f0',
                                paddingBottom: '16px',
                            }}
                        >
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
                                Official Team Registration Form
                            </h2>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
                                Review and finalize your team details to officially register for the competition.
                            </p>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>
                                1. General Information
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>
                                        Contest Name
                                    </label>

                                    <select
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        value={registrationContestId}
                                        onChange={(e) => {
                                            setSelectedContestId(e.target.value);
                                            setSelectedCategoryId('');
                                        }}
                                        disabled={isSubmitted}
                                    >

                                        <option value="" disabled>-- Select Contest --</option>
                                        {registrableContests.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>
                                        Category Track
                                    </label>
                                    <select
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                                        value={selectedCategoryId}
                                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                                        disabled={isSubmitted || !registrationContestId}
                                    >
                                        <option value="" disabled>-- Select Track --</option>

                                        {contestCategories.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}

                                        {registrationContestId && contestCategories.length === 0 && (
                                            <option value="" disabled>
                                                No tracks for this contest
                                            </option>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', color: '#475569', marginBottom: '4px' }}>
                                        Team Name
                                    </label>

                                    <input
                                        type="text"
                                        value={formTeamName}
                                        onChange={(e) => setFormTeamName(e.target.value)}
                                        readOnly={isSubmitted}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '6px',
                                            background: isSubmitted ? '#f8fafc' : '#fff',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#334155', marginBottom: '12px' }}>
                                2. Team Members & Leader Selection
                            </h3>

                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                }}
                            >
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569', width: '80px' }}>
                                            Leader
                                        </th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>
                                            Full Name
                                        </th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>
                                            Student ID
                                        </th>
                                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#475569' }}>
                                            Email
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.roster.length > 0 ? data.roster.map((member, idx) => (
                                        <tr
                                            key={idx}
                                            style={{
                                                borderBottom: '1px solid #e2e8f0',
                                                background: selectedLeader === member.studentId ? '#eff6ff' : '#fff',
                                            }}
                                        >
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <input
                                                    type="radio"
                                                    name="leaderSelect"
                                                    checked={selectedLeader === member.studentId}
                                                    onChange={() => setSelectedLeader(member.studentId)}
                                                    disabled={isSubmitted}
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: isSubmitted ? 'not-allowed' : 'pointer',
                                                        accentColor: '#2563eb',
                                                    }}
                                                />
                                            </td>

                                            <td style={{ padding: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={member.fullName}
                                                    readOnly
                                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }}
                                                />
                                            </td>

                                            <td style={{ padding: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={member.studentId}
                                                    readOnly
                                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }}
                                                />
                                            </td>

                                            <td style={{ padding: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={member.email}
                                                    readOnly
                                                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc' }}
                                                />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td
                                                colSpan="4"
                                                style={{
                                                    textAlign: 'center',
                                                    padding: '20px',
                                                    color: '#64748b',
                                                }}
                                            >
                                                No team members available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {successMessage && (
                            <div style={{ color: 'green', marginTop: '16px', fontWeight: 'bold' }}>
                                {successMessage}
                            </div>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                marginTop: '24px',
                                paddingTop: '16px',
                                borderTop: '1px solid #e2e8f0',
                            }}
                        >
                            <button
                                style={{
                                    padding: '10px 24px',
                                    background: isSubmitted ? '#94a3b8' : '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    cursor: isSubmitted ? 'not-allowed' : 'pointer',
                                }}
                                onClick={handleSubmitRegistration}
                                disabled={isSubmitted}
                            >
                                {isSubmitted ? 'Already Submitted' : 'Submit Official Registration'}
                            </button>
                        </div>
                    </div>

                    <div className="footer-warning" style={{ marginTop: '24px' }}>
                        <svg className="warning-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Category tracks cannot be modified after the team registration sheet has been officially approved. Please ensure all team details are correct before submission.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeamStatus;

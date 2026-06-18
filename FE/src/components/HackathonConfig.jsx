import { useState, useEffect } from 'react';
import './HackathonConfig.css';
import NavbarAdmin from './NavbarAdmin';

const BLANK_FORM = {
    name: '', term: 'SPRING', year: new Date().getFullYear(), regionScope: 'Ho Chi Minh',
    maximumAllowedTeams: 100, registrationStart: '', registrationEnd: '',
    complianceRules: '', tieredPrizeStructures: '', heroBrandingBanner: '', status: 'UPCOMING'
};
const INIT_ROUND = (id, name) => ({ id, phaseName: name, submissionOpen: '', submissionDeadline: '', state: 'UPCOMING' });
const INIT_CAT = { id: 1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVE' };

const HackathonConfig = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState(BLANK_FORM);
    const [universities, setUniversities] = useState([]);
    const [allUniversities, setAllUniversities] = useState([]);
    const [selectedUniToAdd, setSelectedUniToAdd] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [categories, setCategories] = useState([INIT_CAT]);
    const [rounds, setRounds] = useState([
        INIT_ROUND(1, 'Round 01: Screening'), INIT_ROUND(2, 'Round 02: Semi-final'), INIT_ROUND(3, 'Round 03: Final')
    ]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const nowLocalStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const isDateError = error.toLowerCase().includes('time') ||
        error.toLowerCase().includes('date') ||
        error.toLowerCase().includes('timeline');
    const getSemesterFromDate = (dateStr) => {
        if (!dateStr) return 'SPRING';
        const month = new Date(dateStr).getMonth() + 1;
        if (month >= 1 && month <= 3) return 'SPRING';
        if (month >= 4 && month <= 6) return 'SUMMER';
        if (month >= 7 && month <= 9) return 'FALL';
        return 'WINTER';
    };

    const getSemesterBounds = () => {
        const year = formData.year || new Date().getFullYear();
        const currentTerm = formData.term;

        if (currentTerm === 'SPRING') {
            return {
                start: new Date(year, 0, 1, 0, 0, 0),
                end: new Date(year, 2, 31, 23, 59, 59),
                min: `${year}-01-01T00:00` < nowLocalStr ? nowLocalStr : `${year}-01-01T00:00`,
                max: `${year}-03-31T23:59`
            };
        }
        if (currentTerm === 'SUMMER') {
            return {
                start: new Date(year, 3, 1, 0, 0, 0),
                end: new Date(year, 5, 30, 23, 59, 59),
                min: `${year}-04-01T00:00` < nowLocalStr ? nowLocalStr : `${year}-04-01T00:00`,
                max: `${year}-06-30T23:59`
            };
        }
        if (currentTerm === 'FALL') {
            return {
                start: new Date(year, 6, 1, 0, 0, 0),
                end: new Date(year, 8, 30, 23, 59, 59),
                min: `${year}-07-01T00:00` < nowLocalStr ? nowLocalStr : `${year}-07-01T00:00`,
                max: `${year}-09-30T23:59`
            };
        }
        return {
            start: new Date(year, 9, 1, 0, 0, 0),
            end: new Date(year, 11, 31, 23, 59, 59),
            min: `${year}-10-01T00:00` < nowLocalStr ? nowLocalStr : `${year}-10-01T00:00`,
            max: `${year}-12-31T23:59`
        };
    };

    const bounds = getSemesterBounds();
    const fetchData = async (url, mockKey) => {
        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('shms_token')}` } });
            if (res.ok) {
                const data = await res.json();
                if (Object.keys(data || {}).length > 0) return data;
            }
        } catch (e) { }
        const mock = await (await fetch('/testFE.json')).json();
        return mockKey === 'uni' ? mock.hackathonConfig?.universities || []
            : mockKey === 'contests' ? mock.contests?.data || []
                : mock.hackathonConfig?.contestDetail || {};
    };

    const fetchContests = async () => setContests(await fetchData('http://localhost:8080/api/v1/admin/contests', 'contests'));
    const fetchAllUniversities = async () => setAllUniversities(await fetchData('http://localhost:8080/api/v1/admin/universities', 'uni'));
    useEffect(() => {
        fetchContests();
        fetchAllUniversities();
    }, []);

    const handleSelectContest = async (id) => {
        setError(''); setSuccess('');
        if (!id) {
            setSelectedContestId(''); setFormData(BLANK_FORM); setUniversities([]);
            setCategories([INIT_CAT]); setRounds([INIT_ROUND(1, 'Round 01: Screening'), INIT_ROUND(2, 'Round 02: Semi-final'), INIT_ROUND(3, 'Round 03: Final')]);
            return;
        }
        setSelectedContestId(id); setIsLoading(true);
        try {
            const data = await fetchData(`http://localhost:8080/api/v1/admin/contests/${id}`);
            if (data) {
                setFormData({ ...BLANK_FORM, ...data, status: data.status || 'UPCOMING' });
                setUniversities(data.universities || []);
                if (data.tracks?.length) {
                    setCategories(data.tracks.map((t, idx) => ({ id: t.id || idx + 1, trackName: t.categoryName || '', trackDescription: t.trackDescription || '', guidelineUrl: t.guidelineUrl || '', status: t.status || 'ACTIVE' })));
                    if (data.tracks[0].rounds?.length) {
                        setRounds(data.tracks[0].rounds.map((r, idx) => ({ id: idx + 1, phaseName: r.phaseName || '', submissionOpen: r.submissionOpen || '', submissionDeadline: r.submissionDeadline || '', state: r.state || 'UPCOMING' })));
                    }
                }
            } else { setError('Failed to fetch contest details'); }
        } catch (err) { setError('Failed to connect to the server'); }
        finally { setIsLoading(false); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let updatedForm = { ...formData, [name]: value };
        if (name === 'registrationStart' && value) {
            if (value < todayStr) {
                return setError('Registration Start date cannot be in the past.');
            }
            const autoTerm = getSemesterFromDate(value);
            const selectedYear = new Date(value).getFullYear();
            updatedForm.term = autoTerm;
            updatedForm.year = selectedYear;
            if (formData.registrationEnd && (getSemesterFromDate(formData.registrationEnd) !== autoTerm || new Date(formData.registrationEnd).getFullYear() !== selectedYear || formData.registrationEnd <= value)) {
                updatedForm.registrationEnd = '';
            }
        }
        if (name === 'registrationEnd' && value && formData.registrationStart && value <= formData.registrationStart) {
            return setError('Registration End date must be after Registration Start date.');
        }
        setFormData(updatedForm);
        setError(''); setSuccess('');
    };

    const handleCategoryChange = (id, field, value) => {
        setCategories(categories.map(t => t.id === id ? { ...t, [field]: value } : t));
        setError(''); setSuccess('');
    };

    const handleRoundChange = (id, field, value) => {
        const targetRound = rounds.find(r => r.id === id);
        if (!targetRound) return;
        const roundIndex = rounds.findIndex(r => r.id === id);
        if (value) {
            const selectedTime = new Date(value);
            const now = new Date();
            if (selectedTime < now) {
                return setError(`[${targetRound.phaseName}] Selected time cannot be in the past.`);
            }
            if (selectedTime < bounds.start || selectedTime > bounds.end) {
                return setError(`[${targetRound.phaseName}] Time must be strictly within ${formData.term} ${formData.year}.`);
            }
        }
        if (field === 'submissionOpen' && value) {
            if (targetRound.submissionDeadline && value >= targetRound.submissionDeadline) {
                setRounds(rounds.map(r => r.id === id ? { ...r, submissionOpen: value, submissionDeadline: '' } : r));
                return setError(targetRound.phaseName + " Open time changed. Please re-select a valid Deadline.");
            }
            if (roundIndex > 0) {
                const prevRound = rounds[roundIndex - 1];
                if (prevRound.submissionDeadline && value <= prevRound.submissionDeadline) {
                    return setError(`${targetRound.phaseName} Open time must be after ${prevRound.phaseName} Deadline.`);
                }
            }
        }
        if (field === 'submissionDeadline' && value) {
            if (targetRound.submissionOpen && value <= targetRound.submissionOpen) {
                return setError(targetRound.phaseName + " Deadline time must be after Submission Open time!");
            }
            if (roundIndex < rounds.length - 1) {
                const nextRound = rounds[roundIndex + 1];
                if (nextRound.submissionOpen && value >= nextRound.submissionOpen) {
                    return setError(`${targetRound.phaseName} Deadline must be before ${nextRound.phaseName} Open time.`);
                }
            }
        }
        setRounds(rounds.map(r => r.id === id ? { ...r, [field]: value } : r));
        setError(''); setSuccess('');
    };

    const handleAddCategory = () => setCategories([...categories, { id: Date.now(), trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVE' }]);
    const handleDeleteCategory = (id) => setCategories(categories.filter(t => t.id !== id));
    const handleAddPhase = () => setRounds([...rounds, INIT_ROUND(Date.now(), `Phase 0${rounds.length + 1}: New Phase`)]);
    const handleDeletePhase = (id) => setRounds(rounds.filter(r => r.id !== id));
    const handleAddUni = (e) => {
        e?.preventDefault();
        if (selectedUniToAdd && !universities.includes(selectedUniToAdd)) {
            setUniversities([...universities, selectedUniToAdd]);
            setSelectedUniToAdd('');
        }
    };
    const handleRemoveUni = (uni) => setUniversities(universities.filter(u => u !== uni));
    const handleSubmit = async () => {
        if (!formData.name || !formData.term || !formData.year || !formData.regionScope || !formData.maximumAllowedTeams || universities.length === 0) {
            return setError('Please fill all required core settings and add at least one university.');
        }
        if (formData.registrationStart && new Date(formData.registrationStart).getFullYear() !== Number(formData.year)) {
            return setError(`Registration Start year must match the core settings Year (${formData.year}).`);
        }
        if (formData.registrationEnd && new Date(formData.registrationEnd).getFullYear() !== Number(formData.year)) {
            return setError(`Registration End year must match the core settings Year (${formData.year}).`);
        }
        if (formData.registrationStart && formData.registrationEnd && formData.registrationEnd <= formData.registrationStart) {
            return setError('Registration End date must be after Registration Start date.');
        }
        const outOfBoundRound = rounds.find(r => {
            const openTime = r.submissionOpen ? new Date(r.submissionOpen) : null;
            const deadlineTime = r.submissionDeadline ? new Date(r.submissionDeadline) : null;
            return (openTime && (openTime < bounds.start || openTime > bounds.end)) ||
                (deadlineTime && (deadlineTime < bounds.start || deadlineTime > bounds.end));
        });
        if (outOfBoundRound) return setError(`Cannot save! [${outOfBoundRound.phaseName}] contains dates out of the current season's 3-month block.`);
        const invalidRound = rounds.find(r => r.submissionOpen && r.submissionDeadline && r.submissionDeadline <= r.submissionOpen);
        if (invalidRound) return setError("Cannot save! " + invalidRound.phaseName + " has a Deadline earlier than or equal to its Open time.");
        setIsLoading(true); setError(''); setSuccess('');
        try {
            const token = localStorage.getItem('shms_token');
            let currentContestId = selectedContestId;
            const response = await fetch('http://localhost:8080/api/v1/admin/contests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...formData, allowedCorporateDomains: universities.join(',') })
            });
            const data = await response.json();
            if (!response.ok) return setError(data.error || 'Failed to create contest configuration');
            if (!currentContestId) {
                currentContestId = data.contestId;
                setSelectedContestId(data.contestId);
            }
            const validCategories = categories.filter(t => t.trackName.trim() !== '');
            const validRounds = rounds.filter(r => r.submissionOpen && r.submissionDeadline);
            for (const category of validCategories) {
                await fetch('http://localhost:8080/api/v1/admin/contests/rounds-tracks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        contestId: currentContestId, categoryName: category.trackName,
                        trackDescription: category.trackDescription || 'No description',
                        guidelineUrl: category.guidelineUrl || '',
                        status: category.status || 'ACTIVE',
                        rounds: validRounds.map(r => ({
                            id: r.id, phaseName: r.phaseName,
                            submissionOpen: r.submissionOpen.length === 16 ? r.submissionOpen + ':00' : r.submissionOpen,
                            submissionDeadline: r.submissionDeadline.length === 16 ? r.submissionDeadline + ':00' : r.submissionDeadline,
                            submissionFormat: 'PDF', state: r.state || 'UPCOMING'
                        }))
                    })
                });
            }
            setSuccess(selectedContestId ? 'Season Hackathon configuration saved successfully!' : 'Season Hackathon initialized successfully!');
            fetchContests();
        } catch (err) { setError(err.message || 'Failed to connect to the server'); }
        finally { setIsLoading(false); }
    };

    const filteredContests = contests.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || `${c.season} ${c.year}`.toLowerCase().includes(searchQuery.toLowerCase()));
    const formatTitleCase = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';
    return (
        <div className="admin-container">
            <NavbarAdmin />
            <div className="config-wrapper">
                <div className="config-header">
                    <div>
                        <h1 className="config-title">Hackathon Event Configuration</h1>
                        <p className="config-subtitle">Define core parameters and regulatory frameworks for the upcoming season, or adjust timelines for an existing one.</p>
                    </div>
                </div>
                <div className="config-card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">Select Existing Contest to Edit</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: '10px 0' }}>Select an existing contest to adjust its timeline or status, or leave unselected to initialize a new one.</p>
                    <div className="search-box">
                        <input type="text" className="search-input" placeholder="Search by contest name or season (e.g. SPRING 2026)" style={{ width: '100%' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    {searchQuery && (
                        <div className="partner-table-container mt-4">
                            <table className="partner-table">
                                <thead><tr><th>Contest Name</th><th>Season</th><th>Status</th><th>Action</th></tr></thead>
                                <tbody>
                                {filteredContests.length > 0 ? (filteredContests.map(c => (
                                        <tr key={c.id} className={selectedContestId === c.id ? 'selected-row' : ''}>
                                            <td><div className="uni-name">{c.name}</div></td>
                                            <td><div className="uni-domain">{c.season} {c.year}</div></td>
                                            <td><span style={{
                                                padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                                                background: c.status === 'ACTIVE' ? '#dcfce7' : c.status === 'CLOSED' ? '#f3f4f6' : '#dbeafe',
                                                color: c.status === 'ACTIVE' ? '#166534' : c.status === 'CLOSED' ? '#374151' : '#1e40af'
                                            }}>{c.status || 'UPCOMING'}</span>
                                            </td>
                                            <td><button className={selectedContestId === c.id ? "delete-btn" : "edit-btn"} onClick={() => handleSelectContest(selectedContestId === c.id ? '' : c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: selectedContestId === c.id ? '#ef4444' : '#1e40af' }}>
                                                {selectedContestId === c.id ? 'Deselect' : 'Select to Edit'}</button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (<tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px' }}>No contests found</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="config-grid">
                    {/* Left Panel */}
                    <div>
                        <div className="config-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="card-title" style={{ marginBottom: 0 }}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                    Core Settings</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#4b5563' }}>Status:</label>
                                    <select name="status" className="form-select" value={formData.status} onChange={handleChange} style={{ padding: '4px 30px 4px 4px', fontSize: '13px', height: 'auto' }}>
                                        <option value="UPCOMING">UPCOMING</option><option value="ACTIVE">ACTIVE</option><option value="CLOSED">CLOSED</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label className="form-label">Event Name</label><input type="text" name="name" className="form-input" placeholder="e.g., SEAL Summer Tech Sprint 2026" value={formData.name} onChange={handleChange} /></div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Term</label>
                                    <div className="form-input" style={{ backgroundColor: '#f3f4f6', color: '#1f2937', cursor: 'not-allowed', fontWeight: '500' }}>
                                        {formatTitleCase(formData.term)}
                                    </div>
                                </div>
                                <div className="form-group"><label className="form-label">Year</label><input type="number" name="year" className="form-input" value={formData.year} onChange={handleChange} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label className="form-label">Registration Start</label><input type="date" name="registrationStart" className="form-input" value={formData.registrationStart} onChange={handleChange} min={todayStr} /></div>
                                <div className="form-group"><label className="form-label">Registration End</label><input type="date" name="registrationEnd" className="form-input" value={formData.registrationEnd} onChange={handleChange} min={formData.registrationStart || todayStr} disabled={!formData.registrationStart} /></div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Region Scope</label>
                                <select name="regionScope" className="form-select" value={formData.regionScope} onChange={handleChange}>
                                    <option value="Ha Noi">Ha Noi</option><option value="Da Nang">Da Nang</option><option value="Ho Chi Minh">Ho Chi Minh</option><option value="Can Tho">Can Tho</option><option value="Quy Nhon">Quy Nhon</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Maximum Allowed Teams</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" name="maximumAllowedTeams" className="form-input" value={formData.maximumAllowedTeams} onChange={handleChange} style={{ paddingRight: '50px' }} placeholder="e.g 30" />
                                    <span style={{ position: 'absolute', right: '12px', top: '10px', fontSize: '11px', color: '#6b7280', fontWeight: '600' }}>Teams</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Participating Universities</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                    <select className="form-select" value={selectedUniToAdd} onChange={(e) => setSelectedUniToAdd(e.target.value)} style={{ flex: 1 }}>
                                        <option value="">-- Select a University --</option>
                                        {allUniversities.filter(u => !universities.includes(u.name)).map(u => (<option key={u.id} value={u.name}>{u.name}</option>))}
                                    </select>
                                    <button type="button" onClick={handleAddUni} style={{ padding: '0 16px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>Add</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {universities.map(uni => (
                                        <span key={uni} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: '500' }}>
                                            {uni}
                                            <button type="button" onClick={() => handleRemoveUni(uni)} style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', padding: '0', display: 'flex' }}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div>
                        <div className="config-card" style={{ marginBottom: '24px' }}>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="card-title">Category Definition</h3>
                                <button className="add-phase-btn" onClick={handleAddCategory} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add Category</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {categories.map((t) => (
                                    <div key={t.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                        {categories.length > 1 && (<button onClick={() => handleDeleteCategory(t.id)} style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>)}
                                        <div className="form-group"><label className="form-label">Category Name</label><input type="text" className="form-input" placeholder="e.g. AI & Machine Learning Innovation" value={t.trackName} onChange={(e) => handleCategoryChange(t.id, 'trackName', e.target.value)} /></div>
                                        <div className="form-group"><label className="form-label">Category Description</label><textarea className="form-textarea" placeholder="Describe the focus areas, technical requirements..." value={t.trackDescription} onChange={(e) => handleCategoryChange(t.id, 'trackDescription', e.target.value)}></textarea></div>
                                        <div className="form-row">
                                            <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Guideline URL</label><input type="text" className="form-input" placeholder="https://docs.hackathon.com/guidelines" value={t.guidelineUrl} onChange={(e) => handleCategoryChange(t.id, 'guidelineUrl', e.target.value)} style={{ paddingLeft: '10px' }} /></div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Category Status</label>
                                                <select className="form-select" value={t.status || 'ACTIVE'} onChange={(e) => handleCategoryChange(t.id, 'status', e.target.value)}>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="INACTIVE">INACTIVE</option>
                                                    <option value="CLOSED">CLOSED</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="config-card" style={{ marginBottom: '24px' }}>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 className="card-title">Rounds Sequence</h3>
                                <button className="add-phase-btn" onClick={handleAddPhase} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add Round</button>
                            </div>
                            <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {rounds.map((round, index) => (
                                    <div key={round.id} className="phase-item" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                        <div className="phase-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <input type="text" className="phase-title-input" value={round.phaseName} onChange={(e) => handleRoundChange(round.id, 'phaseName', e.target.value)} style={{ fontSize: '15px', fontWeight: '600', border: '1px solid transparent', background: 'transparent', padding: '4px 8px', borderRadius: '4px', width: '200px' }} />
                                            {index !== 0 && formData.status === 'UPCOMING' && (<button className="delete-phase-btn" onClick={() => handleDeletePhase(round.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>)}
                                        </div>
                                        <div className="phase-dates" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '12px' }}>Status</label>
                                                <select className="form-select" value={round.state || 'UPCOMING'} onChange={(e) => handleRoundChange(round.id, 'state', e.target.value)}><option value="UPCOMING">UPCOMING</option><option value="ACTIVE">ACTIVE</option><option value="CLOSED">CLOSED</option></select>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '12px' }}>Submission Open</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-input"
                                                    value={round.submissionOpen || ''}
                                                    onChange={(e) => handleRoundChange(round.id, 'submissionOpen', e.target.value)}
                                                    min={index > 0 && rounds[index - 1].submissionDeadline ? rounds[index - 1].submissionDeadline : bounds.min}
                                                    max={bounds.max}
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: '12px' }}>Submission Deadline</label>
                                                <input type="datetime-local" className="form-input" value={round.submissionDeadline || ''}
                                                       onChange={(e) => handleRoundChange(round.id, 'submissionDeadline', e.target.value)}
                                                       min={round.submissionOpen || bounds.min} max={bounds.max} disabled={!round.submissionOpen}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {error && isDateError && (
                                <div className="alert-error" style={{ marginTop: '16px', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', background: '#fee2e2', color: '#991b1b' }}>
                                    {error}
                                </div>
                            )}
                        </div>
                        <div className="config-card">
                            <div className="form-group" style={{ marginBottom: '32px' }}><div className="section-label">Compliance Rules</div><textarea name="complianceRules" className="form-textarea" placeholder="Outline eligibility..." value={formData.complianceRules} onChange={handleChange}></textarea></div>
                            <div className="form-group" style={{ marginBottom: '0' }}><div className="section-label">Tiered Prize Structures</div><textarea name="tieredPrizeStructures" className="form-textarea" placeholder="Define rewards..." value={formData.tieredPrizeStructures} onChange={handleChange}></textarea></div>
                        </div>
                    </div>
                </div>
                <div className="action-bar-container" style={{ marginTop: '24px' }}>
                    <div className="action-bar" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                        {success ? (<div className="alert-success" style={{ margin: 0, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: '#dcfce7', color: '#166534' }}>
                                {success}</div>
                        ) : (error && !isDateError) ? (
                            <div className="alert-error" style={{ margin: 0, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: '#fee2e2', color: '#991b1b' }}>
                                {error}</div>) : null}
                        <button className="submit-btn" onClick={handleSubmit} disabled={isLoading} style={{ margin: 0 }}>
                            {isLoading ? 'Saving...' : selectedContestId ? 'Save Configuration' : 'Initialize Season Hackathon'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HackathonConfig;
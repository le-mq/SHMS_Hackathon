import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HackathonConfig.css';
import NavbarAdmin from './NavbarAdmin';

const HackathonConfig = () => {
    const navigate = useNavigate();
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        term: 'SPRING',
        year: '2026',
        regionScope: 'Hanoi',
        maximumAllowedTeams: 100,
        registrationStart: '',
        registrationEnd: '',
        complianceRules: '',
        tieredPrizeStructures: '',
        heroBrandingBanner: '',
        status: 'UPCOMING'
    });
    
    const [universities, setUniversities] = useState(['FPT University']);
    const [uniInput, setUniInput] = useState('');

    const [tracks, setTracks] = useState([
        { id: 1, categoryName: '', trackDescription: '', guidelineUrl: '' }
    ]);

    const [rounds, setRounds] = useState([
        { id: 1, phaseName: 'Phase 01: Screening', submissionOpen: '', submissionDeadline: '', state: 'UPCOMING' },
        { id: 2, phaseName: 'Phase 02: Semi-final', submissionOpen: '', submissionDeadline: '', state: 'UPCOMING' },
        { id: 3, phaseName: 'Phase 03: Final', submissionOpen: '', submissionDeadline: '', state: 'UPCOMING' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchContests();
    }, []);

    const fetchContests = async () => {
        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch('http://localhost:8080/api/v1/admin/contests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setContests(data);
            }
        } catch (err) {
            console.error('Failed to fetch contests', err);
        }
    };

    const handleSelectContest = async (id) => {
        if (!id) {
            setSelectedContestId('');
            setFormData({
                name: '', term: 'SPRING', year: '2026', regionScope: 'Hanoi',
                maximumAllowedTeams: 100, registrationStart: '', registrationEnd: '', complianceRules: '', tieredPrizeStructures: '', heroBrandingBanner: '', status: 'UPCOMING'
            });
            setUniversities(['FPT University']);
            setTracks([{ id: 1, categoryName: '', trackDescription: '', guidelineUrl: '' }]);
            setRounds([
                { id: 1, phaseName: 'Phase 01: Screening', submissionOpen: '', submissionDeadline: '' },
                { id: 2, phaseName: 'Phase 02: Semi-final', submissionOpen: '', submissionDeadline: '' },
                { id: 3, phaseName: 'Phase 03: Final', submissionOpen: '', submissionDeadline: '' }
            ]);
            return;
        }

        setSelectedContestId(id);
        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch(`http://localhost:8080/api/v1/admin/contests/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setFormData({
                    name: data.name || '',
                    term: data.term || 'SPRING',
                    year: data.year || '2026',
                    regionScope: data.regionScope || 'Hanoi',
                    maximumAllowedTeams: data.maximumAllowedTeams || 100,
                    registrationStart: data.registrationStart || '',
                    registrationEnd: data.registrationEnd || '',
                    complianceRules: data.complianceRules || '',
                    tieredPrizeStructures: data.tieredPrizeStructures || '',
                    heroBrandingBanner: data.heroBrandingBanner || '',
                    status: data.status || 'UPCOMING'
                });
                
                if (data.universities && data.universities.length > 0) {
                    setUniversities(data.universities);
                } else {
                    setUniversities([]);
                }
                
                if (data.tracks && data.tracks.length > 0) {
                    setTracks(data.tracks.map((t, idx) => ({
                        id: t.id || idx + 1,
                        categoryName: t.categoryName || '',
                        trackDescription: t.trackDescription || '',
                        guidelineUrl: t.guidelineUrl || ''
                    })));
                    
                    if (data.tracks[0].rounds && data.tracks[0].rounds.length > 0) {
                        setRounds(data.tracks[0].rounds.map((r, idx) => ({
                            id: idx + 1,
                            phaseName: r.phaseName || '',
                            submissionOpen: r.submissionOpen || '',
                            submissionDeadline: r.submissionDeadline || '',
                            state: r.state || 'UPCOMING'
                        })));
                    }
                } else {
                    setTracks([{ id: 1, categoryName: '', trackDescription: '', guidelineUrl: '' }]);
                    setRounds([
                        { id: 1, phaseName: 'Phase 01: Screening', submissionOpen: '', submissionDeadline: '', state: 'UPCOMING' }
                    ]);
                }
            } else {
                setError('Failed to fetch contest details');
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
    };

    const handleTrackChange = (id, field, value) => {
        setTracks(tracks.map(t => t.id === id ? { ...t, [field]: value } : t));
        setError('');
        setSuccess('');
    };

    const handleAddTrack = () => {
        const newId = tracks.length > 0 ? Math.max(...tracks.map(t => t.id)) + 1 : 1;
        setTracks([...tracks, { id: newId, categoryName: '', trackDescription: '', guidelineUrl: '' }]);
    };

    const handleDeleteTrack = (id) => {
        setTracks(tracks.filter(t => t.id !== id));
    };

    const handleRoundChange = (id, field, value) => {
        setRounds(rounds.map(r => r.id === id ? { ...r, [field]: value } : r));
        setError('');
        setSuccess('');
    };

    const handleAddPhase = () => {
        const newId = rounds.length > 0 ? Math.max(...rounds.map(r => r.id)) + 1 : 1;
        const phaseNumber = rounds.length + 1;
        setRounds([...rounds, {
            id: newId,
            phaseName: `Phase 0${phaseNumber}: New Phase`,
            submissionOpen: '',
            submissionDeadline: '',
            state: 'UPCOMING'
        }]);
    };

    const handleDeletePhase = (id) => {
        setRounds(rounds.filter(r => r.id !== id));
    };

    const handleAddUni = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            e.preventDefault();
            if (uniInput.trim() && !universities.includes(uniInput.trim())) {
                setUniversities([...universities, uniInput.trim()]);
                setUniInput('');
            }
        }
    };

    const handleRemoveUni = (uni) => {
        setUniversities(universities.filter(u => u !== uni));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.term || !formData.year || !formData.regionScope || !formData.maximumAllowedTeams || universities.length === 0) {
            setError('Please fill all required core settings and add at least one university.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            // For testing: simulate an admin token or fetch from actual login
            const token = localStorage.getItem('shms_token');
            const payload = {
                ...formData,
                allowedCorporateDomains: universities.join(',')
            };

            const response = await fetch('http://localhost:8080/api/v1/admin/contests', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create contest configuration');
                return;
            }

            // Save Tracks and Rounds
            // Filter out empty tracks
            const validTracks = tracks.filter(t => t.categoryName.trim() !== '');
            const validRounds = rounds.filter(r => r.submissionOpen && r.submissionDeadline);

            if (validTracks.length > 0) {
                for (const track of validTracks) {
                    const trackPayload = {
                        contestId: data.contestId,
                        categoryName: track.categoryName,
                        trackDescription: track.trackDescription || 'No description',
                        guidelineUrl: track.guidelineUrl || '',
                        rounds: validRounds.length > 0 ? validRounds.map(r => ({
                            phaseName: r.phaseName,
                            submissionOpen: r.submissionOpen,
                            submissionDeadline: r.submissionDeadline,
                            submissionFormat: 'PDF',
                            state: r.state || 'UPCOMING'
                        })) : []
                    };

                    const trackResponse = await fetch('http://localhost:8080/api/v1/admin/contests/rounds-tracks', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(trackPayload)
                    });
                    
                    if (!trackResponse.ok) {
                        const trackData = await trackResponse.json();
                        console.warn('Failed to save track:', track.categoryName, trackData);
                        // Optional: show a warning but let the success message proceed for the contest
                    }
                }
            }

            setSuccess(selectedContestId ? 'Season Hackathon configuration saved successfully!' : 'Season Hackathon initialized successfully!');
            fetchContests(); // refresh contest list
        } catch (err) {
            setError(err.message || 'Failed to connect to the server');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredContests = contests.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || `${c.season} ${c.year}`.toLowerCase().includes(searchQuery.toLowerCase()));

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

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="config-card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        Select Existing Contest to Edit
                    </h3>
                    <p style={{fontSize: '13px', color: '#6b7280', marginBottom: '16px'}}>Select an existing contest to adjust its timeline or status, or leave unselected to initialize a new one.</p>
                    
                    <div className="search-box">
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Search by contest name or season (e.g. SPRING 2026)" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    {searchQuery && (
                        <div className="partner-table-container mt-4">
                            <table className="partner-table">
                                <thead>
                                    <tr>
                                        <th>Contest Name</th>
                                        <th>Season</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredContests.length > 0 ? (
                                        filteredContests.map(c => (
                                            <tr key={c.id} className={selectedContestId === c.id ? 'selected-row' : ''}>
                                                <td><div className="uni-name">{c.name}</div></td>
                                                <td><div className="uni-domain">{c.season} {c.year}</div></td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '500',
                                                        background: c.status === 'ACTIVE' ? '#dcfce7' : c.status === 'CLOSED' ? '#f3f4f6' : '#dbeafe',
                                                        color: c.status === 'ACTIVE' ? '#166534' : c.status === 'CLOSED' ? '#374151' : '#1e40af'
                                                    }}>
                                                        {c.status || 'UPCOMING'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {selectedContestId === c.id ? (
                                                        <button className="delete-btn" onClick={() => handleSelectContest('')} style={{color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>Deselect</button>
                                                    ) : (
                                                        <button className="edit-btn" onClick={() => handleSelectContest(c.id)} style={{color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>Select to Edit</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{textAlign: 'center', padding: '24px'}}>No contests found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="config-grid">
                    {/* Left Column */}
                    <div>
                        <div className="config-card">
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                <h3 className="card-title" style={{marginBottom: 0}}>
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                    Core Settings
                                </h3>
                                
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <label style={{fontSize: '13px', fontWeight: '500', color: '#4b5563'}}>Status:</label>
                                    <select name="status" className="form-select" value={formData.status} onChange={handleChange} style={{padding: '4px 8px', fontSize: '13px', height: 'auto'}}>
                                        <option value="UPCOMING">UPCOMING</option>
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="CLOSED">CLOSED</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Event Name</label>
                                <input type="text" name="name" className="form-input" placeholder="e.g., SEAL Summer Tech Sprint 2026" value={formData.name} onChange={handleChange} />
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Term</label>
                                    <select name="term" className="form-select" value={formData.term} onChange={handleChange}>
                                        <option value="SPRING">Spring</option>
                                        <option value="SUMMER">Summer</option>
                                        <option value="FALL">Fall</option>
                                        <option value="WINTER">Winter</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Year</label>
                                    <input type="number" name="year" className="form-input" value={formData.year} onChange={handleChange} />
                                </div>
                            </div>
                            
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Registration Start</label>
                                    <input type="date" name="registrationStart" className="form-input" value={formData.registrationStart} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Registration End</label>
                                    <input type="date" name="registrationEnd" className="form-input" value={formData.registrationEnd} onChange={handleChange} />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Region Scope</label>
                                <select name="regionScope" className="form-select" value={formData.regionScope} onChange={handleChange}>
                                    <option value="Hanoi">Hanoi</option>
                                    <option value="Danang">Danang</option>
                                    <option value="HCMC">HCMC</option>
                                    <option value="Can Tho">Can Tho</option>
                                    <option value="Quy Nhon">Quy Nhon</option>
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label">Maximum Allowed Teams</label>
                                <div style={{position: 'relative'}}>
                                    <input type="number" name="maximumAllowedTeams" className="form-input" value={formData.maximumAllowedTeams} onChange={handleChange} style={{paddingRight: '50px'}} />
                                    <span style={{position: 'absolute', right: '12px', top: '10px', fontSize: '11px', color: '#6b7280', fontWeight: '600'}}>Teams</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Participating Universities/Schools</label>
                                <div style={{display: 'flex', gap: '8px', marginBottom: '8px'}}>
                                    <input type="text" className="form-input" placeholder="e.g., FPT University" value={uniInput} onChange={(e) => setUniInput(e.target.value)} onKeyDown={handleAddUni} />
                                    <button type="button" onClick={handleAddUni} style={{padding: '0 16px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500'}}>Add</button>
                                </div>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                    {universities.map(uni => (
                                        <span key={uni} style={{display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: '500'}}>
                                            {uni}
                                            <button type="button" onClick={() => handleRemoveUni(uni)} style={{background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', padding: '0', display: 'flex'}}>
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>


                    </div>
                    {/* Right Column */}
                    <div>
                        <div className="config-card" style={{marginBottom: '24px'}}>
                            <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                <h3 className="card-title">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    Track Definition (Hạng mục thi)
                                </h3>
                                <button className="add-phase-btn" onClick={handleAddTrack} style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add Track
                                </button>
                            </div>

                            <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                                {tracks.map((t, index) => (
                                    <div key={t.id} style={{background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative'}}>
                                        {tracks.length > 1 && (
                                            <button onClick={() => handleDeleteTrack(t.id)} style={{position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer'}}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                        <div className="form-group">
                                            <label className="form-label">Category Name</label>
                                            <input 
                                                type="text" 
                                                className="form-input" 
                                                placeholder="e.g. AI & Machine Learning Innovation" 
                                                value={t.categoryName}
                                                onChange={(e) => handleTrackChange(t.id, 'categoryName', e.target.value)}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Track Description</label>
                                            <textarea 
                                                className="form-textarea" 
                                                placeholder="Describe the focus areas, technical requirements..."
                                                value={t.trackDescription}
                                                onChange={(e) => handleTrackChange(t.id, 'trackDescription', e.target.value)}
                                            ></textarea>
                                        </div>

                                        <div className="form-group" style={{marginBottom: 0}}>
                                            <label className="form-label">Guideline URL</label>
                                            <div className="input-with-icon">
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                                <input 
                                                    type="text" 
                                                    className="form-input" 
                                                    placeholder="https://docs.hackathon.com/guidelines" 
                                                    value={t.guidelineUrl}
                                                    onChange={(e) => handleTrackChange(t.id, 'guidelineUrl', e.target.value)}
                                                    style={{paddingLeft: '36px'}}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="config-card" style={{marginBottom: '24px'}}>
                            <div className="card-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                <h3 className="card-title">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Rounds Sequence (Cấu hình số vòng thi)
                                </h3>
                                <button className="add-phase-btn" onClick={handleAddPhase} style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500'}}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add Phase
                                </button>
                            </div>

                            <div className="timeline-container" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                {rounds.map((round, index) => (
                                    <div key={round.id} className="phase-item" style={{background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative'}}>
                                        <div className="phase-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                                            <input 
                                                type="text" 
                                                className="phase-title-input" 
                                                value={round.phaseName}
                                                onChange={(e) => handleRoundChange(round.id, 'phaseName', e.target.value)}
                                                style={{fontSize: '15px', fontWeight: '600', border: '1px solid transparent', background: 'transparent', padding: '4px 8px', borderRadius: '4px', width: '200px'}}
                                            />
                                            {index !== 0 && (
                                                <button className="delete-phase-btn" onClick={() => handleDeletePhase(round.id)} style={{color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer'}}>
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="phase-dates" style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px'}}>
                                            <div className="form-group" style={{marginBottom: 0}}>
                                                <label className="form-label" style={{fontSize: '12px'}}>Status</label>
                                                <select 
                                                    className="form-select" 
                                                    value={round.state || 'UPCOMING'}
                                                    onChange={(e) => handleRoundChange(round.id, 'state', e.target.value)}
                                                >
                                                    <option value="UPCOMING">UPCOMING</option>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                    <option value="CLOSED">CLOSED</option>
                                                </select>
                                            </div>
                                            <div className="form-group" style={{marginBottom: 0}}>
                                                <label className="form-label" style={{fontSize: '12px'}}>Submission Open</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="form-input" 
                                                    value={round.submissionOpen}
                                                    onChange={(e) => handleRoundChange(round.id, 'submissionOpen', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group" style={{marginBottom: 0}}>
                                                <label className="form-label" style={{fontSize: '12px'}}>Submission Deadline</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="form-input" 
                                                    value={round.submissionDeadline}
                                                    onChange={(e) => handleRoundChange(round.id, 'submissionDeadline', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="config-card">

                            <div className="form-group" style={{marginBottom: '32px'}}>
                                <div className="section-label">
                                    Compliance Rules 
                                    <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                </div>
                                <textarea name="complianceRules" className="form-textarea" placeholder="Outline eligibility, intellectual property rights, and code of conduct..." value={formData.complianceRules} onChange={handleChange}></textarea>
                            </div>

                            <div className="form-group" style={{marginBottom: '0'}}>
                                <div className="section-label">
                                    Tiered Prize Structures
                                    <svg width="16" height="16" fill="none" stroke="#6b7280" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                </div>
                                <textarea name="tieredPrizeStructures" className="form-textarea" placeholder="Define rewards for Grand Prize, Runners-up, and Category Winners..." value={formData.tieredPrizeStructures} onChange={handleChange}></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="action-bar">
                    <div className="action-info">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        All changes will be logged in the system audit trail.
                    </div>
                    <button className="submit-btn" onClick={handleSubmit} disabled={isLoading}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        {isLoading ? 'Saving...' : selectedContestId ? 'Save Configuration' : 'Initialize Season Hackathon'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HackathonConfig;

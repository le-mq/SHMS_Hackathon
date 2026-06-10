import { useState } from 'react';
import './TournamentRounds.css';
import NavbarAdmin from './NavbarAdmin';

const TournamentRounds = () => {
    const [track, setTrack] = useState({
        categoryName: '',
        trackDescription: '',
        guidelineUrl: ''
    });

    const [rounds, setRounds] = useState([
        { id: 1, phaseName: 'Phase 01: Screening', submissionOpen: '', submissionDeadline: '' },
        { id: 2, phaseName: 'Phase 02: Semi-final', submissionOpen: '', submissionDeadline: '' },
        { id: 3, phaseName: 'Phase 03: Final', submissionOpen: '', submissionDeadline: '' }
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleTrackChange = (e) => {
        const { name, value } = e.target;
        setTrack(prev => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
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
            submissionDeadline: ''
        }]);
    };

    const handleDeletePhase = (id) => {
        setRounds(rounds.filter(r => r.id !== id));
    };

    const handleSubmit = async () => {
        if (!track.categoryName || !track.trackDescription) {
            setError('Track Category Name and Description are required.');
            return;
        }

        if (rounds.length === 0) {
            setError('At least one round must be defined.');
            return;
        }

        for (let round of rounds) {
            if (!round.submissionOpen || !round.submissionDeadline) {
                setError(`Submission dates are required for ${round.phaseName}`);
                return;
            }
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('shms_token');
            const payload = {
                ...track,
                rounds: rounds.map(r => ({
                    phaseName: r.phaseName,
                    submissionOpen: r.submissionOpen,
                    submissionDeadline: r.submissionDeadline,
                    submissionFormat: 'PDF'
                }))
            };

            const response = await fetch('http://localhost:8080/api/v1/admin/rounds-tracks', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to create track and rounds');
            } else {
                setSuccess('Track and timeline updated successfully!');
            }
        } catch (err) {
            setError('Failed to connect to the server');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-container">
            <NavbarAdmin />

            <div className="config-wrapper">
                <div className="config-header">
                    <h1 className="config-title">Tracks & Tournament Rounds Manager</h1>
                    <p className="config-subtitle">Configure competition tracks and define their evaluation timeline.</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}

                <div className="tournament-grid">
                    {/* Left Column: Track Definition */}
                    <div className="config-card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Track Definition
                            </h3>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Category Name</label>
                            <input 
                                type="text" 
                                name="categoryName"
                                className="form-input" 
                                placeholder="e.g. AI & Machine Learning Innovation" 
                                value={track.categoryName}
                                onChange={handleTrackChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Track Description</label>
                            <textarea 
                                name="trackDescription"
                                className="form-textarea" 
                                placeholder="Describe the focus areas, technical requirements, and objectives for this track..."
                                value={track.trackDescription}
                                onChange={handleTrackChange}
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Guideline URL</label>
                            <div className="input-with-icon">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                <input 
                                    type="text" 
                                    name="guidelineUrl"
                                    className="form-input" 
                                    placeholder="https://docs.hackathon.com/guidelines" 
                                    value={track.guidelineUrl}
                                    onChange={handleTrackChange}
                                />
                            </div>
                        </div>

                        <button className="save-track-btn" onClick={handleSubmit} disabled={isLoading}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            {isLoading ? 'Saving...' : 'Save Track Configuration'}
                        </button>
                    </div>

                    {/* Right Column: Rounds Sequence */}
                    <div className="config-card">
                        <div className="card-header">
                            <h3 className="card-title">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Rounds Sequence
                            </h3>
                            <button className="add-phase-btn" onClick={handleAddPhase}>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Phase
                            </button>
                        </div>

                        <div className="timeline-container">
                            <div className="timeline-line"></div>
                            
                            {rounds.map((round, index) => (
                                <div key={round.id} className="phase-item">
                                    <div className="phase-icon">
                                        {index === 0 ? (
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                        ) : index === rounds.length - 1 ? (
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                        ) : (
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                        )}
                                    </div>
                                    
                                    <div className="phase-card">
                                        <div className="phase-header">
                                            <input 
                                                type="text" 
                                                className="phase-title-input" 
                                                value={round.phaseName}
                                                onChange={(e) => handleRoundChange(round.id, 'phaseName', e.target.value)}
                                            />
                                            {index === 0 ? (
                                                <span className="phase-badge">UPCOMING</span>
                                            ) : (
                                                <button className="delete-phase-btn" onClick={() => handleDeletePhase(round.id)}>
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="phase-dates">
                                            <div className="form-group" style={{marginBottom: 0}}>
                                                <label className="form-label">Submission Open</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="form-input" 
                                                    value={round.submissionOpen}
                                                    onChange={(e) => handleRoundChange(round.id, 'submissionOpen', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group" style={{marginBottom: 0}}>
                                                <label className="form-label">Submission Deadline</label>
                                                <input 
                                                    type="datetime-local" 
                                                    className="form-input" 
                                                    value={round.submissionDeadline}
                                                    onChange={(e) => handleRoundChange(round.id, 'submissionDeadline', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="action-bar">
                            <button className="discard-btn">Discard Changes</button>
                            <button className="update-timeline-btn" onClick={handleSubmit} disabled={isLoading}>Update Timeline</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentRounds;

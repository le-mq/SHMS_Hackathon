import { useState, useEffect } from 'react';
import './PublicationDataExport.css';


const API_BASE = "http://localhost:8080/api/v1";
const ANNOUNCEMENT_TYPES = [
    'General Update',
    'Deadline Reminder',
    'Rule Change',
    'Result Announcement',
    'System Maintenance'
];

const ROLES = ['Admin', 'Judge', 'Mentor', 'Student'];

const PublicationDataExport = () => {
    const [contests, setContests] = useState([]);
    const [isPublishing, setIsPublishing] = useState(false);

    const [formData, setFormData] = useState({
        contestId: '',
        title: '',
        content: '',
        type: ANNOUNCEMENT_TYPES[0],
        roles: []
    });

    useEffect(() => {
        let cancelled = false;
        async function fetchContests() {
            try {
                const token = localStorage.getItem("shms_token");
                const response = await fetch(API_BASE + "/admin/contests",
                    { headers: { Authorization: `Bearer ${token}` } });
                if (!response.ok)
                    throw new Error("HTTP " + response.status);
                const data = await response.json();
                if (!cancelled) {
                    setContests(data);
                    if (data.length > 0) {
                        setFormData(prev => ({ ...prev, contestId: data[0].id }));
                    }
                }
            } catch (error) {
                console.warn(
                    "API unavailable, loading fallback mock...",
                    error.message
                );
                try {
                    const localRes = await fetch("/testFE.json");
                    if (!localRes.ok)
                        throw new Error("Cannot load mock");
                    const localJson = await localRes.json();
                    const contestsData =
                        localJson.publicationDataExport?.contests || [];
                    if (!cancelled) {
                        setContests(contestsData);
                        if (contestsData.length > 0) {
                            setFormData(prev => ({ ...prev, contestId: contestsData[0].id }));
                        }
                    }
                } catch (localError) {
                    console.error(localError);
                }
            }
        }
        fetchContests();
        return () => { cancelled = true; };
    }, []);

    const handleRoleChange = (role) => {
        setFormData(prev => {
            if (prev.roles.includes(role)) {
                return { ...prev, roles: prev.roles.filter(r => r !== role) };
            } else {
                return { ...prev, roles: [...prev.roles, role] };
            }
        });
    };

    const handlePublishAnnouncement = async () => {
        if (!formData.title.trim() || !formData.content.trim() || formData.roles.length === 0) {
            alert('Please fill in all fields and select at least one role.');
            return;
        }

        setIsPublishing(true);

        let mappedType = 'GENERAL_UPDATE';
        if (formData.type === 'Deadline Reminder') mappedType = 'DEADLINE_REMINDER';
        else if (formData.type === 'Rule Change') mappedType = 'RULE_CHANGE';
        else if (formData.type === 'Result Announcement') mappedType = 'RESULT_ANNOUNCEMENT';
        else if (formData.type === 'System Maintenance') mappedType = 'SYSTEM_MAINTENANCE';

        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch('http://localhost:8080/api/v1/admin/contests/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    contestId: formData.contestId,
                    title: formData.title,
                    content: formData.content,
                    type: mappedType,
                    roles: formData.roles
                })
            });

            if (res.ok) {
                alert('Announcement broadcasted successfully!');
                setFormData({
                    ...formData,
                    title: '',
                    content: '',
                    roles: []
                });
            } else {
                alert('Failed to broadcast announcement.');
            }
        } catch (error) {
            console.error('Error broadcasting announcement:', error);
            alert('An error occurred.');
        } finally {
            setIsPublishing(false);
        }
    };

    const handleExport = (type) => {
        const token = localStorage.getItem('shms_token');
        const contestParam = formData.contestId ? `&contestId=${formData.contestId}` : '';
        window.open(`http://localhost:8080/api/v1/admin/results/export-csv?type=${type}${contestParam}&token=${token}`, '_blank');
    };

    return (
        <div className="publication-container">
            <div className="publication-content">
                <div className="pub-page-header">
                    <h1 className="pub-title">Broadcast & Export Center</h1>
                    <p className="pub-subtitle">Create system-wide announcements and generate CSV exports for administrative compliance.</p>
                </div>

                <div className="announcement-card">
                    <div className="announcement-header">
                        <h2 className="announcement-title">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                            Create Announcement
                        </h2>
                    </div>
                    <div className="announcement-form">
                        <div className="form-group">
                            <label>Contest</label>
                            <select
                                className="form-select"
                                value={formData.contestId}
                                onChange={e => setFormData({ ...formData, contestId: e.target.value })}
                            >
                                {contests.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Announcement Type</label>
                            <select
                                className="form-select"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                {ANNOUNCEMENT_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Title</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter announcement title..."
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label>Content</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Write the announcement content here..."
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label>Notify Roles</label>
                            <div className="roles-checkbox-group">
                                {ROLES.map(role => (
                                    <label key={role} className="role-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={formData.roles.includes(role)}
                                            onChange={() => handleRoleChange(role)}
                                        />
                                        {role}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            className="announcement-btn"
                            onClick={handlePublishAnnouncement}
                            disabled={isPublishing}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            {isPublishing ? 'Broadcasting...' : 'Broadcast Announcement'}
                        </button>
                    </div>
                </div>

                <div className="export-card">
                    <div className="export-header">
                        <div className="export-icon-box">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div className="export-title-wrap" style={{ flex: 1 }}>
                            <h2>Export Dataset Utility</h2>
                            <p>Generate final CSV reports for administrative compliance and auditing.</p>
                        </div>
                        <div className="export-contest-select">
                            <select
                                className="form-select"
                                value={formData.contestId}
                                onChange={e => setFormData({ ...formData, contestId: e.target.value })}
                                style={{ minWidth: '200px' }}
                            >
                                {contests.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="export-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <button className="export-btn" onClick={() => handleExport('teams')}>
                            <div className="export-btn-content">
                                <h3>Team List</h3>
                                <p>Export all teams (name, category, registration date) for the selected contest.</p>
                            </div>
                            <svg className="export-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                        <button className="export-btn" onClick={() => handleExport('scores')}>
                            <div className="export-btn-content">
                                <h3>Detailed Scores</h3>
                                <p>Export detailed scores (by criteria) of all teams across all categories in the selected contest.</p>
                            </div>
                            <svg className="export-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicationDataExport;

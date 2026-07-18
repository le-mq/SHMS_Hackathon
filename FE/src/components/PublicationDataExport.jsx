import { useState, useEffect } from 'react';
import './PublicationDataExport.css';


const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1");
const ANNOUNCEMENT_TYPES = [
    'General Update',
    'Deadline Reminder',
    'Rule Change',
    'Result Announcement',
    'System Maintenance'
];

const ROLES = ['Admin', 'Judge', 'Mentor', 'Student'];

const MAP_TYPE_TO_READABLE = {
    'GENERAL_UPDATE': 'General Update',
    'DEADLINE_REMINDER': 'Deadline Reminder',
    'RULE_CHANGE': 'Rule Change',
    'RESULT_ANNOUNCEMENT': 'Result Announcement',
    'SYSTEM_MAINTENANCE': 'System Maintenance',
    'INFO': 'General Update'
};

const MAP_READABLE_TO_TYPE = {
    'General Update': 'GENERAL_UPDATE',
    'Deadline Reminder': 'DEADLINE_REMINDER',
    'Rule Change': 'RULE_CHANGE',
    'Result Announcement': 'RESULT_ANNOUNCEMENT',
    'System Maintenance': 'SYSTEM_MAINTENANCE'
};

const PublicationDataExport = () => {
    const [contests, setContests] = useState([]);
    const [isPublishing, setIsPublishing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [announcements, setAnnouncements] = useState([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedDetailAnnouncement, setSelectedDetailAnnouncement] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedContestFilter, setSelectedContestFilter] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

    const [formData, setFormData] = useState({
        contestId: '',
        title: '',
        content: '',
        type: ANNOUNCEMENT_TYPES[0],
        roles: []
    });

    const fetchAnnouncements = async () => {
        setLoadingAnnouncements(true);
        try {
            const token = localStorage.getItem("shms_token");
            const response = await fetch(API_BASE + "/admin/contests/announcements", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok)
                throw new Error("HTTP " + response.status);
            const data = await response.json();
            setAnnouncements(data);
        } catch (error) {
            console.warn(
                "API unavailable, loading fallback announcements...",
                error.message
            );
            try {
                const localRes = await fetch("/testFE.json");
                if (!localRes.ok)
                    throw new Error("Cannot load mock");
                const localJson = await localRes.json();
                setAnnouncements(localJson.announcements?.data || []);
            } catch (localError) {
                console.error(localError);
                setAnnouncements([]);
            }
        } finally {
            setLoadingAnnouncements(false);
        }
    };

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
            } finally {
                if (!cancelled) {
                    setInitialLoading(false);
                }
            }
        }
        fetchContests();
        fetchAnnouncements();

        window.addEventListener('shms_announcements_updated', fetchAnnouncements);

        return () => {
            cancelled = true;
            window.removeEventListener('shms_announcements_updated', fetchAnnouncements);
        };
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

        const mappedType = MAP_READABLE_TO_TYPE[formData.type] || 'GENERAL_UPDATE';

        try {
            const token = localStorage.getItem("shms_token");
            const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + "/admin/contests/announcements", {
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
                window.dispatchEvent(new Event('shms_announcements_updated'));
                setFormData({
                    ...formData,
                    title: '',
                    content: '',
                    roles: []
                });
                setIsCreateModalOpen(false);
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
        window.open((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1") + `/admin/results/export-csv?type=${type}${contestParam}&token=${token}`, '_blank');
    };

    const formatType = (type) => {
        return MAP_TYPE_TO_READABLE[type] || type || 'General Update';
    };

    const getCategoryClass = (type) => {
        switch (type) {
            case 'DEADLINE_REMINDER':
                return 'category-deadline';
            case 'RULE_CHANGE':
            case 'SYSTEM_MAINTENANCE':
                return 'category-warning';
            case 'RESULT_ANNOUNCEMENT':
                return 'category-result';
            default:
                return 'category-info';
        }
    };

    const filteredAnnouncements = announcements.filter(ann => {
        const matchesSearch = !searchTerm.trim() ||
            ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ann.content.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesContest = !selectedContestFilter || String(ann.contestId) === String(selectedContestFilter);

        const matchesType = !selectedTypeFilter || ann.type === selectedTypeFilter;

        return matchesSearch && matchesContest && matchesType;
    });

    if (initialLoading) {
        return (
            <div className="publication-container">
                <div className="global-loading">
                    <div className="global-spinner"></div>
                    <span>Loading Broadcast & Export Center...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="publication-container">
            <div className="publication-content">
                <div className="pub-page-header">
                    <div className="pub-header-left">
                        <h1 className="pub-title">Broadcast & Export Center</h1>
                        <p className="pub-subtitle">Manage system-wide announcements and generate CSV exports for administrative compliance.</p>
                    </div>
                    <div className="pub-header-actions">
                        <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Create Announcement
                        </button>
                    </div>
                </div>

                <div className="announcements-management-card">
                    <div className="ann-card-header">
                        <h2>Announcements History</h2>
                    </div>

                    <div className="table-filter-bar">
                        <div className="search-wrapper">
                            <svg className="search-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by title or content..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-dropdowns">
                            <select
                                className="filter-select"
                                value={selectedContestFilter}
                                onChange={e => setSelectedContestFilter(e.target.value)}
                            >
                                <option value="">All Contests</option>
                                {contests.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <select
                                className="filter-select"
                                value={selectedTypeFilter}
                                onChange={e => setSelectedTypeFilter(e.target.value)}
                            >
                                <option value="">All Types</option>
                                {ANNOUNCEMENT_TYPES.map(t => (
                                    <option key={t} value={MAP_READABLE_TO_TYPE[t]}>{t}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="table-wrapper">
                        {loadingAnnouncements ? (
                            <div className="table-loading">
                                <div className="global-spinner"></div>
                                <span>Loading Announcements...</span>
                            </div>
                        ) : filteredAnnouncements.length === 0 ? (
                            <div className="table-empty">
                                <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                <p>No announcements found matching the criteria.</p>
                            </div>
                        ) : (
                            <table className="announcements-table">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Type</th>
                                        <th>Contest</th>
                                        <th>Target Roles</th>
                                        <th>Published At</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAnnouncements.map(ann => {
                                        const contestName = ann.contestName || contests.find(c => c.id === ann.contestId)?.name || 'General';
                                        return (
                                            <tr key={ann.id} onClick={() => setSelectedDetailAnnouncement(ann)} className="clickable-row">
                                                <td className="ann-title-cell">
                                                    <div className="ann-title-text">{ann.title}</div>
                                                    <div className="ann-content-snippet">{ann.content}</div>
                                                </td>
                                                <td>
                                                    <span className={`ann-category ${getCategoryClass(ann.type)}`}>
                                                        {formatType(ann.type)}
                                                    </span>
                                                </td>
                                                <td className="ann-contest-cell">{contestName}</td>
                                                <td>
                                                    <div className="ann-roles-cell">
                                                        {ann.targetRoles && ann.targetRoles.length > 0 ? (
                                                            ann.targetRoles.map(role => (
                                                                <span key={role} className="role-badge">{role}</span>
                                                            ))
                                                        ) : (
                                                            <span className="role-badge all">All Roles</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="ann-date-cell">
                                                    {ann.publishedAt ? new Date(ann.publishedAt).toLocaleString() : '--'}
                                                </td>
                                                <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                                    <button
                                                        className="btn-view-detail"
                                                        onClick={() => setSelectedDetailAnnouncement(ann)}
                                                    >
                                                        View Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
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

                    <div className="export-grid">
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

            {selectedDetailAnnouncement && (
                <div className="ann-modal-overlay" onClick={() => setSelectedDetailAnnouncement(null)}>
                    <div className="ann-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="ann-modal-header">
                            <h3 className="ann-modal-title">{selectedDetailAnnouncement.title}</h3>
                            <button className="ann-modal-close" onClick={() => setSelectedDetailAnnouncement(null)}>&times;</button>
                        </div>
                        <div className="ann-modal-meta">
                            <span className={`ann-category ${getCategoryClass(selectedDetailAnnouncement.type)}`}>
                                {formatType(selectedDetailAnnouncement.type)}
                            </span>
                            <span className="ann-contest">
                                🏆 {selectedDetailAnnouncement.contestName || contests.find(c => c.id === selectedDetailAnnouncement.contestId)?.name || 'General'}
                            </span>
                            <span className="ann-date">
                                📅 {selectedDetailAnnouncement.publishedAt ? new Date(selectedDetailAnnouncement.publishedAt).toLocaleString() : ''}
                            </span>
                        </div>
                        <div className="ann-modal-targets">
                            <span className="targets-label">Target Roles:</span>
                            <div className="targets-list">
                                {selectedDetailAnnouncement.targetRoles && selectedDetailAnnouncement.targetRoles.length > 0 ? (
                                    selectedDetailAnnouncement.targetRoles.map(role => (
                                        <span key={role} className="role-pill">{role}</span>
                                    ))
                                ) : (
                                    <span className="role-pill all">All Roles</span>
                                )}
                            </div>
                        </div>
                        <div className="ann-modal-body">
                            {selectedDetailAnnouncement.content}
                        </div>
                        <div className="ann-modal-footer">
                            <button className="btn-secondary" onClick={() => setSelectedDetailAnnouncement(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="ann-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="ann-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="ann-modal-header">
                            <h3 className="ann-modal-title">Create Announcement</h3>
                            <button className="ann-modal-close" onClick={() => setIsCreateModalOpen(false)}>&times;</button>
                        </div>
                        <div className="ann-modal-form-body">
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
                                    style={{ minHeight: '150px' }}
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
                        </div>
                        <div className="ann-modal-footer" style={{ gap: '12px' }}>
                            <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                            <button
                                className="announcement-btn"
                                onClick={handlePublishAnnouncement}
                                disabled={isPublishing}
                                style={{ margin: 0, width: 'auto' }}
                            >
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                {isPublishing ? 'Broadcasting...' : 'Broadcast Announcement'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicationDataExport;

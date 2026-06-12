import React, { useState, useEffect } from 'react';
import './LatestAnnouncements.css';

const LatestAnnouncements = ({ isModal = false, onClose = () => {} }) => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/v1/public/announcements');
                if (res.ok) {
                    const data = await res.json();
                    setAnnouncements(data);
                }
            } catch (err) {
                console.error("Failed to fetch announcements:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAnnouncements();
    }, []);

    const userEmail = localStorage.getItem('shms_user') || 'guest';
    const storageKey = `shms_read_announcements_${userEmail}`;

    // Get read IDs from localStorage
    const [readIds, setReadIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || [];
        } catch {
            return [];
        }
    });

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(readIds));
        // Dispatch custom event to update navbars
        window.dispatchEvent(new Event('shms_announcements_updated'));
    }, [readIds, storageKey]);

    const toggleRead = (e, id) => {
        e.stopPropagation(); // prevent opening modal
        if (readIds.includes(id)) {
            setReadIds(readIds.filter(x => x !== id));
        } else {
            setReadIds([...readIds, id]);
        }
    };

    const handleViewDetail = (ann) => {
        setSelectedAnnouncement(ann);
        if (!readIds.includes(ann.id)) {
            setReadIds([...readIds, ann.id]);
        }
    };

    const displayedAnnouncements = showAll ? announcements : announcements.slice(0, 3);

    const getCategoryClass = (type) => {
        switch (type) {
            case 'DEADLINE_REMINDER': return 'category-deadline';
            case 'RULE_CHANGE':
            case 'SYSTEM_MAINTENANCE': return 'category-warning';
            case 'RESULT_ANNOUNCEMENT': return 'category-result';
            case 'GENERAL_UPDATE':
            default: return 'category-info';
        }
    };

    const formatType = (type) => {
        if (!type) return 'General Update';
        return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleString();
    };

    const content = (
        <div className={`latest-announcements-container ${isModal ? 'is-modal' : ''}`}>
            {isModal && (
                <button className="close-modal-btn" onClick={onClose}>&times;</button>
            )}
            
            <div className="announcements-header">
                <div className="header-left">
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                    <h3>Latest Announcements</h3>
                </div>
                <div style={{display: 'flex', gap: '12px', marginRight: isModal ? '30px' : '0'}}>
                    <button className="view-all-btn" onClick={() => {
                        setReadIds(announcements.map(a => a.id));
                    }}>Mark all read</button>
                    {!showAll && announcements.length > 3 && (
                        <button className="view-all-btn" onClick={() => setShowAll(true)}>View All</button>
                    )}
                    {showAll && (
                        <button className="view-all-btn" onClick={() => setShowAll(false)}>Show Less</button>
                    )}
                </div>
            </div>

            <div className="announcements-table-wrapper">
                <table className="announcements-table">
                    <thead>
                        <tr>
                            <th>Announcement Title</th>
                            <th>Category</th>
                            <th>Date Posted</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="text-center">Loading...</td></tr>
                        ) : announcements.length === 0 ? (
                            <tr><td colSpan="4" className="text-center">No announcements found.</td></tr>
                        ) : (
                            displayedAnnouncements.map((ann) => {
                                const isRead = readIds.includes(ann.id);
                                return (
                                <tr key={ann.id} style={{ opacity: isRead ? 0.6 : 1, backgroundColor: isRead ? '#f8fafc' : 'white' }}>
                                    <td>
                                        <div className="ann-title" style={{ fontWeight: isRead ? 500 : 600 }}>
                                            {!isRead && <span style={{width: 8, height: 8, background: '#ef4444', borderRadius: '50%', display: 'inline-block', marginRight: 6}}></span>}
                                            {ann.title}
                                        </div>
                                        <div className="ann-desc">
                                            {ann.content && ann.content.length > 60 
                                                ? ann.content.substring(0, 60) + '...' 
                                                : ann.content}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`ann-category ${getCategoryClass(ann.type)}`}>
                                            {formatType(ann.type)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="ann-date">{formatDate(ann.publishedAt)}</span>
                                    </td>
                                    <td>
                                        <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                            <button className="view-all-btn" onClick={(e) => toggleRead(e, ann.id)} style={{fontSize: '12px', color: '#64748b', fontWeight: 'normal'}}>
                                                {isRead ? 'Mark unread' : 'Mark read'}
                                            </button>
                                            <button className="action-btn" onClick={() => handleViewDetail(ann)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
            </div>

            {selectedAnnouncement && (
                <div className="announcement-detail-modal">
                    <div className="announcement-detail-content">
                        <button className="close-detail-btn" onClick={() => setSelectedAnnouncement(null)}>&times;</button>
                        <h2 className="detail-title">{selectedAnnouncement.title}</h2>
                        <div className="detail-meta">
                            <span className={`ann-category ${getCategoryClass(selectedAnnouncement.type)}`}>
                                {formatType(selectedAnnouncement.type)}
                            </span>
                            <span className="ann-date">{formatDate(selectedAnnouncement.publishedAt)}</span>
                        </div>
                        <div className="detail-body">
                            {selectedAnnouncement.content}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (isModal) {
        return (
            <div className="announcements-overlay">
                {content}
            </div>
        );
    }

    return content;
};

export default LatestAnnouncements;

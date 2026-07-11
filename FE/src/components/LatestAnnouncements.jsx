import { useEffect, useState } from 'react';
import './LatestAnnouncements.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"+"/public/announcements";

const LatestAnnouncements = ({ isModal = false, onClose = () => { } }) => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

    const userEmail = localStorage.getItem('shms_user') || 'guest';
    const storageKey = `shms_read_announcements_${userEmail}`;

    const [readIds, setReadIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(storageKey)) || [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(readIds));
        window.dispatchEvent(new Event('shms_announcements_updated'));
    }, [readIds, storageKey]);

    const fetchAnnouncements = async () => {
        try {
            const token = localStorage.getItem('shms_token');
            const headers = {};

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(API_URL, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) {
                throw new Error('API unavailable');
            }

            const data = await response.json();
            setAnnouncements(Array.isArray(data) ? data : data.data || []);
        } catch {
            try {
                const response = await fetch('/testFE.json');
                const data = await response.json();

                setAnnouncements(data.announcements?.data || []);
            } catch {
                setAnnouncements([]);
            }
        } finally {
            setLoading(false);
        }
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

    const formatType = (type) => {
        if (!type) return 'General Update';

        return type
            .split('_')
            .map(word => word.charAt(0) + word.slice(1).toLowerCase())
            .join(' ');
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleString();
    };

    const toggleRead = (e, id) => {
        e.stopPropagation();

        setReadIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const openDetail = (announcement) => {
        setSelectedAnnouncement(announcement);

        if (!readIds.includes(announcement.id)) {
            setReadIds(prev => [...prev, announcement.id]);
        }
    };

    const displayedAnnouncements = showAll
        ? announcements
        : announcements.slice(0, 3);

    const content = (
        <div className={`latest-announcements-container ${isModal ? 'is-modal' : ''}`}>
            {isModal && (
                <button className="close-modal-btn" onClick={onClose}>
                    &times;
                </button>
            )}

            <div className="announcements-header">
                <div className="header-left">
                    <h3>Latest Announcements</h3>
                </div>

                <div className="announcement-header-actions">
                    <button
                        className="mark-all-read-btn"
                        onClick={() => setReadIds(announcements.map(item => item.id))}
                    >
                        Mark all read
                    </button>

                    {announcements.length > 3 && (
                        <button
                            className="show-all-announcements-btn"
                            onClick={() => setShowAll(!showAll)}
                        >
                            {showAll ? 'Show Less' : 'View All'}
                        </button>
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
                        {loading && (
                            <tr>
                                <td colSpan="4" className="text-center">
                                    Loading...
                                </td>
                            </tr>
                        )}

                        {!loading && announcements.length === 0 && (
                            <tr>
                                <td colSpan="4" className="text-center">
                                    No announcements found.
                                </td>
                            </tr>
                        )}

                        {!loading && displayedAnnouncements.map(announcement => {
                            const isRead = readIds.includes(announcement.id);

                            return (

                                <tr
                                    key={announcement.id}
                                    className="announcement-row"
                                    onClick={() => openDetail(announcement)}
                                >
                                    <td className="announcement-title-cell">
                                        <div className="ann-title">
                                            {announcement.title}
                                        </div>

                                        <div className="ann-desc">
                                            {announcement.content || 'No content'}
                                        </div>
                                    </td>


                                    <td>
                                        <span className={`ann-category ${getCategoryClass(announcement.type)}`}>
                                            {formatType(announcement.type)}
                                        </span>
                                    </td>

                                    <td>
                                        <span className="ann-date">
                                            {formatDate(announcement.publishedAt)}
                                        </span>
                                    </td>

                                    <td className="announcement-action-cell">
                                        <div className="announcement-action-buttons">
                                            <button
                                                className={`announcement-action-btn ${isRead ? 'unread-btn' : 'read-btn'}`}
                                                onClick={(e) => toggleRead(e, announcement.id)}
                                                title={isRead ? 'Mark as unread' : 'Mark as read'}
                                            >
                                                {isRead ? (
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19h18M3 19V9.172a2 2 0 01.586-1.414l3.828-3.828A2 2 0 018.828 3h6.344a2 2 0 011.414.586l3.828 3.828A2 2 0 0121 9.172V19M3 19l4-4m14 4l-4-4" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4" /></svg>
                                                ) : (
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                )}
                                            </button>

                                            <button
                                                className="announcement-action-btn view-detail-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDetail(announcement);
                                                }}
                                                title="View Detail"
                                            >
                                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {selectedAnnouncement && (
                <div
                    className="announcement-detail-modal"
                    onClick={() => setSelectedAnnouncement(null)}
                >
                    <div
                        className="announcement-detail-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="close-detail-btn"
                            onClick={() => setSelectedAnnouncement(null)}
                        >
                            &times;
                        </button>

                        <h2 className="detail-title">
                            {selectedAnnouncement.title}
                        </h2>

                        <div className="detail-meta">
                            <span className={`ann-category ${getCategoryClass(selectedAnnouncement.type)}`}>
                                {formatType(selectedAnnouncement.type)}
                            </span>

                            <span className="ann-date">
                                {formatDate(selectedAnnouncement.publishedAt)}
                            </span>
                        </div>

                        <div className="detail-body">
                            {selectedAnnouncement.content || 'No content'}
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

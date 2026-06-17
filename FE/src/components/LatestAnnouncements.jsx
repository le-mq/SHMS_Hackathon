import { useEffect, useState } from 'react';
import './LatestAnnouncements.css';

const API_URL = 'http://localhost:8080/api/v1/public/announcements';

const LatestAnnouncements = ({ isModal = false, onClose = () => {} }) => {
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
            const response = await fetch(API_URL);

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

                <div>
                    <button
                        className="view-all-btn"
                        onClick={() => setReadIds(announcements.map(item => item.id))}
                    >
                        Mark all read
                    </button>

                    {announcements.length > 3 && (
                        <button
                            className="view-all-btn"
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
                                <tr key={announcement.id}>
                                    <td>
                                        <div className="ann-title">
                                            {announcement.title}
                                        </div>

                                        <div className="ann-desc">
                                            {announcement.content?.length > 60
                                                ? announcement.content.slice(0, 60) + '...'
                                                : announcement.content}
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

                                    <td>
                                        <button
                                            className="view-all-btn"
                                            onClick={(e) => toggleRead(e, announcement.id)}
                                        >
                                            {isRead ? 'Mark unread' : 'Mark read'}
                                        </button>

                                        <button
                                            className="action-btn"
                                            onClick={() => openDetail(announcement)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selectedAnnouncement && (
                <div className="announcement-detail-modal">
                    <div className="announcement-detail-content">
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
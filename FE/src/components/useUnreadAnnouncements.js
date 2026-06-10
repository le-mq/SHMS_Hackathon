import { useState, useEffect } from 'react';

export function useUnreadAnnouncements() {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/v1/public/announcements');
                if (res.ok) {
                    const announcements = await res.json();
                    const userEmail = localStorage.getItem('shms_user') || 'guest';
                    const storageKey = `shms_read_announcements_${userEmail}`;
                    let readIds = [];
                    try {
                        readIds = JSON.parse(localStorage.getItem(storageKey)) || [];
                    } catch (e) {
                        readIds = [];
                    }
                    const unread = announcements.filter(a => !readIds.includes(a.id)).length;
                    setUnreadCount(unread);
                }
            } catch (err) {
                console.error("Failed to fetch unread announcements:", err);
            }
        };

        fetchUnreadCount();

        const handleUpdate = () => {
            fetchUnreadCount();
        };

        window.addEventListener('shms_announcements_updated', handleUpdate);
        return () => window.removeEventListener('shms_announcements_updated', handleUpdate);
    }, []);

    return unreadCount;
}

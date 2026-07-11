import { useState, useEffect } from 'react';

export function useUnreadAnnouncements() {
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const headers = {};

                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const res = await fetch((import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/public/announcements", {
                    method: 'GET',
                    headers: headers
                });
                if (res.ok) {
                    const data = await res.json();
                    const announcements = Array.isArray(data) ? data : data.data || [];
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

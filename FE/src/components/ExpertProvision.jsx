import React, { useState, useEffect } from 'react';
import './ExpertProvision.css';
import NavbarAdmin from './NavbarAdmin';

const ExpertProvision = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        professionalEmail: '',
        username: '',
        password: '',
        roleSelection: [],
        accessExpiry: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
        setSuccess('');
    };

    const handleGenerate = async () => {
        if (!formData.fullName || !formData.professionalEmail || !formData.username || !formData.password || !formData.accessExpiry || formData.roleSelection.length === 0) {
            setError('Please fill out all required fields and select at least one role.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('shms_token');
            // Adding time to the date so it matches LocalDateTime
            const accessExpiryDate = new Date(formData.accessExpiry);
            accessExpiryDate.setHours(23, 59, 59);

            const payload = {
                fullName: formData.fullName,
                professionalEmail: formData.professionalEmail,
                username: formData.username,
                password: formData.password,
                roleSelection: formData.roleSelection,
                accessExpiry: `${formData.accessExpiry}T23:59:59`
            };

            const response = await fetch('http://localhost:8080/api/v1/admin/contests/experts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            let data;
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch (e) {
                data = { error: text || 'Unknown server error.' };
            }

            if (!response.ok) {
                let errorMsg = 'Failed to provision expert credentials.';
                if (data.error && data.message) {
                    errorMsg = `${data.error}: ${data.message}`;
                } else if (data.message) {
                    errorMsg = data.message;
                } else if (data.error) {
                    errorMsg = data.error;
                }
                setError(errorMsg);
            } else {
                setSuccess('Account generated! An invitation has been sent.');
                setFormData({
                    fullName: '',
                    professionalEmail: '',
                    username: '',
                    password: '',
                    roleSelection: [],
                    accessExpiry: ''
                });
                fetchExperts();
            }
        } catch (err) {
            setError('Failed to connect to the server: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const [experts, setExperts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [extendUserId, setExtendUserId] = useState('');
    const [newExpiry, setNewExpiry] = useState('');
    const [extendLoading, setExtendLoading] = useState(false);
    const [extendMsg, setExtendMsg] = useState('');

    const fetchExperts = async () => {
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch('http://localhost:8080/api/v1/admin/contests/experts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setExperts(data);
            }
        } catch (e) {
            console.error(e);
        }
    };
    const [manageRoleSelection, setManageRoleSelection] = useState([]);
    const [updateRolesLoading, setUpdateRolesLoading] = useState(false);

    useEffect(() => {
        fetchExperts();
    }, []);

    const handleExpertChange = (e) => {
        const userId = e.target.value;
        setExtendUserId(userId);
        if (userId) {
            const exp = experts.find(x => String(x.userId) === String(userId));
            if (exp) {
                setManageRoleSelection(exp.roles);
            } else {
                setManageRoleSelection([]);
            }
        } else {
            setManageRoleSelection([]);
        }
    };

    const handleRoleUpdate = async () => {
        if (!extendUserId || manageRoleSelection.length === 0) return;
        setUpdateRolesLoading(true);
        setExtendMsg('');
        try {
            const token = localStorage.getItem('shms_token');
            const res = await fetch(`http://localhost:8080/api/v1/admin/contests/experts/${extendUserId}/roles`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ roles: manageRoleSelection })
            });
            if (res.ok) {
                setExtendMsg('Roles updated successfully!');
                fetchExperts(); // refresh
            } else {
                setExtendMsg('Failed to update roles.');
            }
        } catch (e) {
            setExtendMsg('Error connecting to server.');
        } finally {
            setUpdateRolesLoading(false);
        }
    };

    return (
        <div className="admin-container">
            <NavbarAdmin />
        </div>
    )
};
export default ExpertProvision;

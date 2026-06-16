import React, { useState, useEffect, useMemo } from 'react';
import './PanelAllocation.css';
import NavbarAdmin from './NavbarAdmin';

const PanelAllocation = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [tracks, setTracks] = useState([]);
    const [experts, setExperts] = useState([]);

    const [selectedExpertId, setSelectedExpertId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Structure: { [expertId]: { [trackId]: { isMentor: false, isJudge: false } } }
    const [allocations, setAllocations] = useState({});

    const [isLoading, setIsLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch Contests
                const contestRes = await fetch('http://localhost:8080/api/v1/admin/contests', { headers });
                if (contestRes.ok) {
                    const cData = await contestRes.json();
                    setContests(cData);
                }

                // Fetch Experts
                const expertRes = await fetch('http://localhost:8080/api/v1/admin/contests/experts', { headers });
                if (expertRes.ok) {
                    const eData = await expertRes.json();
                    // Filter active experts
                    const now = new Date();
                    const activeExps = eData.filter(e => !e.accessExpiry || new Date(e.accessExpiry) > now);
                    setExperts(activeExps);
                    if (activeExps.length > 0) {
                        setSelectedExpertId(activeExps[0].userId);
                    }
                }

                // Fetch Allocations
                const allocRes = await fetch('http://localhost:8080/api/v1/admin/contests/allocations', { headers });
                if (allocRes.ok) {
                    const aData = await allocRes.json();
                    setAllocations(aData);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!selectedContestId) {
            setTracks([]);
            return;
        }
        const fetchContestDetails = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const res = await fetch(`http://localhost:8080/api/v1/admin/contests/${selectedContestId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setTracks(data.tracks || []);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchContestDetails();
    }, [selectedContestId]);

    const activeExpert = useMemo(() => experts.find(e => e.userId === selectedExpertId), [experts, selectedExpertId]);

    const filteredExperts = experts.filter(e =>
        e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleJudgeToggle = (expertId, trackId) => {
        setAllocations(prev => {
            const expertAlloc = prev[expertId] || {};
            const trackAlloc = expertAlloc[trackId] || { isJudge: false, mentoredTeamIds: [] };

            return {
                ...prev,
                [expertId]: {
                    ...expertAlloc,
                    [trackId]: {
                        ...trackAlloc,
                        isJudge: !trackAlloc.isJudge
                    }
                }
            };
        });
        setSuccessMsg('');
    };

    const handleTeamToggle = (expertId, trackId, teamId) => {
        setAllocations(prev => {
            const expertAlloc = prev[expertId] || {};
            const trackAlloc = expertAlloc[trackId] || { isJudge: false, mentoredTeamIds: [] };
            const currentTeams = trackAlloc.mentoredTeamIds || [];
            const newTeams = currentTeams.includes(teamId)
                ? currentTeams.filter(id => id !== teamId)
                : [...currentTeams, teamId];

            return {
                ...prev,
                [expertId]: {
                    ...expertAlloc,
                    [trackId]: {
                        ...trackAlloc,
                        mentoredTeamIds: newTeams
                    }
                }
            };
        });
        setSuccessMsg('');
    };

    const hasConflicts = useMemo(() => {
        if (!selectedExpertId) return false;
        const expertAlloc = allocations[selectedExpertId];
        if (!expertAlloc) return false;

        for (const trackId in expertAlloc) {
            const alloc = expertAlloc[trackId];
            if (alloc.isJudge && alloc.mentoredTeamIds && alloc.mentoredTeamIds.length > 0) return true;
        }
        return false;
    }, [allocations, selectedExpertId]);

    const handleSave = async () => {
        if (hasConflicts || !selectedExpertId) return;

        setIsLoading(true);
        setSuccessMsg('');

        try {
            const token = localStorage.getItem('shms_token');
            const expertAlloc = allocations[selectedExpertId] || {};
            const assignmentList = Object.keys(expertAlloc).map(trackId => ({
                trackId: Number(trackId),
                mentoredTeamIds: expertAlloc[trackId].mentoredTeamIds || [],
                isJudge: expertAlloc[trackId].isJudge || false
            }));

            const payload = {
                userId: selectedExpertId,
                assignments: assignmentList
            };

            const response = await fetch('http://localhost:8080/api/v1/admin/contests/allocations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setSuccessMsg('Allocation mapping saved successfully');
                alert('Allocation mapping saved successfully!');
            } else {
                const errorData = await response.json();
                console.error(errorData);
                alert('Save failed: ' + (errorData.error || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Save failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <div className="admin-container">
            <NavbarAdmin />

        </div>);
};

export default PanelAllocation;
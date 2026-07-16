import { useState, useEffect, useMemo } from 'react';
import './RubricConfig.css';

const CONTEST_API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/admin/contests";
const CATEGORY_API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1")+"/student/categories";
const newCriterion = () => ({
    _localId: Date.now() + Math.random(),
    criteriaName: '', maxScore: 100, description: '', percentageWeight: ''
});

const RubricConfig = () => {
    const token = localStorage.getItem('shms_token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [templates, setTemplates] = useState([]);
    const [contestRubrics, setContestRubrics] = useState([]);
    const [allGlobalCategories, setAllGlobalCategories] = useState([]);
    const [editorMode, setEditorMode] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [filterContestId, setFilterContestId] = useState('ALL');
    const [initialLoading, setInitialLoading] = useState(true);
    const requestData = async (baseUrl, endpoint, fallbackPath) => {
        try {
            const res = await fetch(`${baseUrl}${endpoint}`, { headers });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn(`API ${baseUrl}${endpoint} failed, loading backup file...`);
        }
        const fileRes = await fetch('/testFE.json');
        const fileData = await fileRes.json();
        return fallbackPath(fileData);
    };

    useEffect(() => {
        setInitialLoading(true);
        Promise.all([
            requestData(CONTEST_API, '', (json) => json.contests?.data || [])
                .then(data => setContests(Array.isArray(data) ? data : data.data || [])),
            requestData(CONTEST_API, '/rubric-templates', (json) => json.rubricTemplates?.data || []).then(setTemplates),
            requestData(CONTEST_API, '/rubrics', (json) => json.contestRubrics?.data || []).then(setContestRubrics),
            fetch(CATEGORY_API, { headers })
                .then(res => res.ok ? res.json() : [])
                .then(data => {
                    if (Array.isArray(data)) {
                        const uniqueMap = new Map();
                        data.forEach(item => {
                            if (item && item.id) {
                                uniqueMap.set(item.id, { id: item.id, categoryName: item.name });
                            }
                        });
                        setAllGlobalCategories(Array.from(uniqueMap.values()));
                    }
                })
                .catch(err => console.error("Failed to load global categories", err))
        ])
            .catch(err => console.error("Initial load error in RubricConfig", err))
            .finally(() => setInitialLoading(false));
    }, []);

    useEffect(() => {
        if (!selectedContestId) { setCategories([]); setSelectedCategoryId(''); return; }
        fetch(`${CATEGORY_API}?contestId=${selectedContestId}`, { headers })
            .then(res => res.ok ? res.json() : [])
            .then(data => {
                if (Array.isArray(data)) {
                    setCategories(data.map(item => ({ id: item.id, categoryName: item.name })));
                } else {
                    setCategories([]);
                }
                setSelectedCategoryId('');
            })
            .catch(() => setCategories([]));
    }, [selectedContestId]);

    const selectedCategory = useMemo(() =>
        categories.find(c => c.id == selectedCategoryId) || null, [categories, selectedCategoryId]
    );
    const officialTemplates = useMemo(() => {
        let bindings = contestRubrics;
        if (selectedContestId) bindings = bindings.filter(cr => cr.contestId == selectedContestId);
        if (selectedCategoryId) bindings = bindings.filter(cr => cr.categoryId == selectedCategoryId);
        const uniqueIds = Array.from(new Set(bindings.map(b => b.templateId)));
        return uniqueIds.map(id => templates.find(t => t.id == id)).filter(Boolean);
    }, [contestRubrics, templates, selectedContestId, selectedCategoryId]);

    const totalWeight = useMemo(() =>
            editingTemplate?.criteria?.reduce((sum, c) => sum + Number(c.percentageWeight || 0), 0) || 0,
        [editingTemplate]
    );
    const isBalanced = totalWeight === 100;
    const startNew = (isOfficialIntention = false) => {
        setEditingTemplate({
            id: null, name: selectedCategory ? `${selectedCategory.categoryName} Rubric` : '', description: '',
            publicVisibility: true, weightedScoring: true, bindContestId: selectedContestId || '', bindCategoryId: selectedCategoryId || '',
            criteria: [{ ...newCriterion(), percentageWeight: '100' }],
            isOfficialBinding: isOfficialIntention
        });
        setEditorMode('new'); setError(''); setSuccess('');
        setTimeout(() => {
            const el = document.getElementById('rubric-editor');
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
        }, 100);
    };

    const startEdit = (tpl, isOfficial) => {
        const binding = contestRubrics.find(cr => cr.templateId == tpl.id && (!selectedContestId || cr.contestId == selectedContestId) && (!selectedCategoryId || cr.categoryId == selectedCategoryId))
            || contestRubrics.find(cr => cr.templateId == tpl.id);

        let initialName = tpl.name;
        if (initialName.includes('(Copy)')) {
            initialName = initialName.replace(' (Copy)', '').trim();
        }

        setEditingTemplate({
            ...JSON.parse(JSON.stringify(tpl)),
            name: initialName,
            isOfficialBinding: isOfficial,
            bindContestId: binding ? String(binding.contestId) : '',
            bindCategoryId: binding ? String(binding.categoryId) : (tpl.categoryId ? String(tpl.categoryId) : (tpl.category ? String(tpl.category.id) : '')),
            criteria: (tpl.criteria || []).map((c, i) => ({ ...c, _localId: c.id ?? i, percentageWeight: c.percentageWeight !== undefined && c.percentageWeight !== null ? String(c.percentageWeight) : '' }))
        });
        setEditorMode('edit'); setError(''); setSuccess('');
        setTimeout(() => {
            const el = document.getElementById('rubric-editor');
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
        }, 100);
    };

    const cancelEditor = () => { setEditorMode(null); setEditingTemplate(null); setError(''); setSuccess(''); };

    const handleCriterionChange = (localId, field, value) => {
        let finalValue = value;
        if (field === 'percentageWeight') {
            finalValue = value.replace(/[^0-9]/g, '');
        }
        setEditingTemplate(prev => ({
            ...prev, criteria: prev.criteria.map(c => c._localId === localId ? { ...c, [field]: finalValue } : c)
        }));
        setError('');
    };

    const handleAddCriterion = () => setEditingTemplate(prev => ({ ...prev, criteria: [...prev.criteria, newCriterion()] }));
    const handleDeleteCriterion = (localId) => {
        if (window.confirm('Are you sure you want to remove this criterion?')) {
            setEditingTemplate(prev => ({ ...prev, criteria: prev.criteria.filter(c => c._localId !== localId) }));
        }
    };

    const handleSave = async () => {
        if (!editingTemplate.name.trim()) return setError('Template name is required.');
        if (!isBalanced) return setError('Total weight must equal exactly 100%.');
        if (!editingTemplate.bindCategoryId && editingTemplate.bindContestId) return setError('Category is required when assigning an official rubric to a contest.');
        if (editingTemplate.criteria.some(c => !c.criteriaName.trim())) return setError('All criteria must have a name.');
        if (editingTemplate.bindContestId && editingTemplate.bindCategoryId) {
            const isDuplicateOfficial = contestRubrics.some(cr =>
                cr.contestId == editingTemplate.bindContestId &&
                cr.categoryId == editingTemplate.bindCategoryId &&
                cr.templateId !== editingTemplate.id
            );
            if (isDuplicateOfficial) {
                return setError('Cannot save! This Category already has an official rubric assigned in the selected Contest.');
            }
        }
        setIsLoading(true); setError(''); setSuccess('');

        const payload = {
            id: editingTemplate.id ? Number(editingTemplate.id) : null,
            name: editingTemplate.name, description: editingTemplate.description || '',
            publicVisibility: editingTemplate.publicVisibility, weightedScoring: editingTemplate.weightedScoring,
            categoryId: editingTemplate.bindCategoryId ? Number(editingTemplate.bindCategoryId) : null,
            contestId: editingTemplate.bindContestId ? Number(editingTemplate.bindContestId) : null,
            criteria: editingTemplate.criteria.map(c => ({
                id: c.id ? Number(c.id) : null,
                criteriaName: c.criteriaName, description: c.description || '', maxScore: Number(c.maxScore), percentageWeight: Number(c.percentageWeight || 0)
            }))
        };

        try {
            let res;
            const isMakingOfficial = editorMode === 'edit' && !editingTemplate.isOfficialBinding && payload.contestId;
            if (editorMode === 'edit' && editingTemplate.id && !isMakingOfficial) {
                res = await fetch(`${CONTEST_API}/rubric-templates/${editingTemplate.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
            } else {
                const isOfficialBinding = payload.contestId;
                res = await fetch(`${CONTEST_API}${isOfficialBinding ? '/rubrics' : '/rubric-templates'}`, { method: 'POST', headers, body: JSON.stringify(payload) });
            }
            if (res.ok) {
                setSuccess(editorMode === 'edit' ? 'Template updated successfully!' : 'Template saved successfully!');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                const updatedTemplates = await requestData(CONTEST_API, '/rubric-templates', (json) => json.rubricTemplates?.data || []);
                const updatedRubrics = await requestData(CONTEST_API, '/rubrics', (json) => json.contestRubrics?.data || []);
                setTemplates(updatedTemplates); setContestRubrics(updatedRubrics);
                setTimeout(() => cancelEditor(), 1400);
            } else {
                const d = await res.json().catch(() => ({}));
                setError(d.error || d.message || `Error ${res.status}: ${res.statusText}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (e) {
            setError('Connection error: ' + e.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        finally { setIsLoading(false); }
    };

    const handleAction = async (endpoint, method, successMsg, mockAction) => {
        setIsLoading(true); setError(''); setSuccess('');
        try {
            const res = await fetch(`${CONTEST_API}/rubric-templates/${endpoint}`, { method, headers });
            if (res.ok) {
                setSuccess(successMsg);
                const updatedTemplates = await requestData(CONTEST_API, '/rubric-templates', (json) => json.rubricTemplates?.data || []);
                const updatedRubrics = await requestData(CONTEST_API, '/rubrics', (json) => json.contestRubrics?.data || []);
                setTemplates(updatedTemplates); setContestRubrics(updatedRubrics);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const d = await res.json().catch(() => ({}));
                setError(d.error || d.message || `Error ${res.status}: ${res.statusText}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (e) {
            if (mockAction) {
                mockAction();
                setSuccess(`${successMsg}`);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                setError('Server error: ' + e.message);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        finally { setIsLoading(false); }
    };

    const handleClone = (id) => handleAction(`${id}/clone`, 'POST', 'Template cloned successfully!', () => {
        const tpl = templates.find(t => t.id === id);
        if (tpl) {
            setTemplates(prev => [...prev, { ...tpl, id: Date.now(), name: tpl.name + ' (Copy)' }]);
            setSuccess('Template cloned successfully!');
        }
    });

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await fetch(`${CONTEST_API}/rubric-templates/${id}`, {
                method: 'DELETE',
                headers,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || data.message || `Delete failed (${res.status})`);
            }
            setTemplates(prev => prev.filter(t => String(t.id) !== String(id)));
            setContestRubrics(prev => prev.filter(cr => String(cr.templateId) !== String(id)));
            setSuccess(data.message || 'Template deleted successfully!');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e) {
            setError(e.message || 'Cannot delete this template. It may be in use.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="admin-container">
                <div className="config-wrapper">
                    <div className="global-loading">
                        <div className="global-spinner"></div>
                        <span>Loading Rubric Settings...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <div className="config-wrapper">
                <div className="rubric-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
                    <div style={{ flexShrink: 0 }}>
                        <h1 className="config-title">Rubric Configuration</h1>
                        <p className="config-subtitle">Manage reusable scoring criteria for each contest category.</p>
                    </div>
                    {editorMode === null && (
                        <div style={{ display: 'flex', flex: 1, maxWidth: 800, alignItems: 'center', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '4px 12px', gap: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                <input type="text" style={{ border: 'none', background: 'transparent', margin: 0, padding: '8px 0', outline: 'none', width: '100%', fontSize: 14 }} placeholder="Search rubrics, categories, contests..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div style={{ width: 1, height: 24, backgroundColor: '#e5e7eb' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <label style={{ margin: 0, fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Contest:</label>
                                <select className="form-select" style={{ border: 'none', background: 'transparent', padding: '4px 8px', outline: 'none', cursor: 'pointer', fontWeight: 600, color: '#111827', margin: 0, maxWidth: 300 }} value={filterContestId} onChange={e => setFilterContestId(e.target.value)}>
                                    <option value="ALL">All Contests</option>
                                    {contests.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div style={{ width: 1, height: 24, backgroundColor: '#e5e7eb' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                <label style={{ margin: 0, fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Show:</label>
                                <select className="form-select" style={{ border: 'none', background: 'transparent', padding: '4px 8px', outline: 'none', cursor: 'pointer', fontWeight: 600, color: '#111827', margin: 0 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                    <option value="ALL">All Types</option>
                                    <option value="OFFICIAL">Official</option>
                                    <option value="DRAFT">Template</option>
                                    <option value="CLONE">Cloned</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
                {!editorMode && error && <div className="alert-main alert-error">{error}</div>}
                {!editorMode && success && <div className="alert-main alert-success">{success}</div>}
                {editorMode === null && (
                    <>
                        {(() => {
                            const renderCard = (tpl, isOfficial) => {
                                const isActived = contestRubrics.some(cr => cr.templateId === tpl.id);
                                const isClone = tpl.name.includes('(Copy)');
                                const catBinding = (tpl.categoryId || tpl.category?.id) ? (allGlobalCategories.find(c => String(c.id) === String(tpl.categoryId || tpl.category?.id))?.categoryName || 'Uncategorized') : 'Uncategorized';

                                let cardClass = "rt-card";
                                if (isClone) cardClass += " rt-card-clone";
                                else if (isOfficial) cardClass += " rt-card-official";
                                else cardClass += " rt-card-draft";

                                // Get associated contest names
                                const associatedContests = contests.filter(c => contestRubrics.some(cr => cr.templateId === tpl.id && cr.contestId === c.id)).map(c => c.name);

                                return (
                                    <div key={`${isOfficial ? 'off' : 'bank'}-${tpl.id}`} className={cardClass}>
                                        <div className="rt-card-top" style={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                            <div className="rt-card-info">
                                                <div className="rt-card-row" style={{ marginBottom: 12 }}>
                                                    <span className="rt-card-label">Name:</span>
                                                    <h3 className="rt-card-name" style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                                                        {tpl.name.replace(' (Copy)', '')}
                                                    </h3>
                                                </div>
                                                <div className="rt-card-row" style={{ marginBottom: 16 }}>
                                                    <span className="rt-card-label">Description:</span>
                                                    <p className="rt-card-desc" style={{ color: '#1f2937', fontSize: '13px', lineHeight: 1.5, margin: '4px 0 0 0' }}>{tpl.description || 'No description provided.'}</p>
                                                </div>
                                            </div>
                                            <div className="rt-card-badge">
                                                {isOfficial ? <span className="rt-chip rt-chip-green">Official</span> : isClone ? <span className="rt-chip rt-chip-gray">Cloned</span> : <span className="rt-chip rt-chip-orange">Template</span>}
                                            </div>
                                        </div>
                                        <div className="rt-card-details" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, paddingTop: 12 }}>
                                            {isOfficial ? (
                                                <div style={{ fontSize: 13, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    <span style={{ fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Used by:</span>
                                                    <span style={{ marginLeft: 6, fontWeight: 600, color: '#111827' }}>
                                                {associatedContests.length === 1 ? associatedContests[0] : associatedContests.length > 1 ? `${associatedContests.length} contests` : 'None'}
                                            </span>
                                                </div>
                                            ) : isClone ? (
                                                <div style={{ fontSize: 13, color: '#4b5563' }}>
                                                    <span style={{ fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Cloned From:</span>
                                                    <span style={{ marginLeft: 6, fontWeight: 500, color: '#4b5563' }}>Original Template</span>
                                                </div>
                                            ) : null}
                                            <div style={{ fontSize: 13, color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <span style={{ fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Category:</span>
                                                <span style={{ marginLeft: 6, fontWeight: 500, color: '#111827' }}>{catBinding}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: '#4b5563' }}>
                                                <span style={{ fontWeight: 700, color: '#6b7280', fontSize: 11, textTransform: 'uppercase' }}>Criteria:</span>
                                                <span style={{ marginLeft: 6, fontWeight: 500, color: '#111827' }}>{(tpl.criteria || []).length}</span>
                                            </div>
                                        </div>
                                        <div className="rt-card-actions" style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                                            <button className="rt-btn-ghost" onClick={() => startEdit(tpl, isOfficial)}>Edit</button>
                                            <button className="rt-btn-ghost" onClick={() => handleClone(tpl.id)} disabled={isLoading}>Clone</button>
                                            {!isActived && (
                                                <button className="rt-btn-ghost" style={{ color: '#dc2626', marginLeft: 'auto' }} onClick={() => handleDelete(tpl.id)} disabled={isLoading}>Delete</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            };

                            const searchFilter = (tpl) => {
                                if (filterContestId !== 'ALL') {
                                    const isBoundToContest = contestRubrics.some(cr => cr.templateId === tpl.id && String(cr.contestId) === filterContestId);
                                    if (!isBoundToContest) return false;
                                }
                                const term = searchTerm.toLowerCase();
                                if (!term) return true;
                                const catBinding = allGlobalCategories.find(c => String(c.id) === String(tpl.categoryId || tpl.category?.id))?.categoryName || '';
                                const associatedContests = contests.filter(c => contestRubrics.some(cr => cr.templateId === tpl.id && cr.contestId === c.id)).map(c => c.name).join(' ');
                                return tpl.name.toLowerCase().includes(term) ||
                                    catBinding.toLowerCase().includes(term) ||
                                    associatedContests.toLowerCase().includes(term);
                            };

                            let bankTemplates = templates.filter(tpl => tpl.status !== 'ACTIVE' && !contestRubrics.some(cr => cr.templateId === tpl.id)).filter(searchFilter);
                            let cloneTemplates = bankTemplates.filter(tpl => tpl.name.includes('(Copy)'));
                            let draftTemplates = bankTemplates.filter(tpl => !tpl.name.includes('(Copy)'));
                            let offTemplates = officialTemplates.filter(searchFilter);

                            if (filterType === 'OFFICIAL') { draftTemplates = []; cloneTemplates = []; }
                            else if (filterType === 'TEMPLATE') { offTemplates = []; cloneTemplates = []; }
                            else if (filterType === 'CLONE') { offTemplates = []; draftTemplates = []; }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                                    {(filterType === 'ALL' || filterType === 'OFFICIAL') && (
                                        <div className="rt-workspace">
                                            <div className="rt-workspace-header">
                                                <div>
                                                    <h2 className="rt-workspace-title">Official Rubrics</h2>
                                                    <p className="rt-workspace-desc">Rubrics currently assigned to contests and used during evaluation.</p>
                                                </div>
                                                <button className="rt-btn-primary" onClick={() => startNew(true)}>Create Official</button>
                                            </div>
                                            {offTemplates.length > 0 ? (
                                                <div className="rt-card-grid">{offTemplates.map(tpl => renderCard(tpl, true))}</div>
                                            ) : (
                                                <div className="rt-empty">
                                                    <h3>No official rubrics found</h3>
                                                    <p>Assign a draft rubric to a contest to make it official.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(filterType === 'ALL' || filterType === 'TEMPLATE') && (
                                        <div className="rt-workspace">
                                            <div className="rt-workspace-header">
                                                <div>
                                                    <h2 className="rt-workspace-title">Template Rubrics</h2>
                                                    <p className="rt-workspace-desc">Independent rubrics that are not assigned to any contest yet.</p>
                                                </div>
                                                <button className="rt-btn-primary" style={{ background: '#f59e0b', color: '#fff' }} onClick={() => startNew(false)}>Create Template</button>
                                            </div>
                                            {draftTemplates.length > 0 ? (
                                                <div className="rt-card-grid">{draftTemplates.map(tpl => renderCard(tpl, false))}</div>
                                            ) : (
                                                <div className="rt-empty">
                                                    <h3>No templates found</h3>
                                                    <p>Create your first template to start designing evaluation criteria.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {(filterType === 'ALL' || filterType === 'CLONE') && (
                                        <div className="rt-workspace">
                                            <div className="rt-workspace-header">
                                                <div>
                                                    <h2 className="rt-workspace-title">Cloned Rubrics</h2>
                                                    <p className="rt-workspace-desc">Private copies created from existing rubrics for customization.</p>
                                                </div>
                                            </div>
                                            {cloneTemplates.length > 0 ? (
                                                <div className="rt-card-grid">{cloneTemplates.map(tpl => renderCard(tpl, false))}</div>
                                            ) : (
                                                <div className="rt-empty">
                                                    <h3>No cloned rubrics found</h3>
                                                    <p>Clone an existing rubric to customize it safely.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </>
                )}

                {editorMode && editingTemplate && (
                    <div className="rubric-grid" id="rubric-editor">
                        <div>
                            {editorMode === 'new' && editingTemplate.isOfficialBinding && (
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <svg style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', color: '#1e3a8a', fontSize: 13, fontWeight: 700 }}>Creating an Official Rubric</h4>
                                        <p style={{ margin: 0, color: '#1e40af', fontSize: 12, lineHeight: 1.4 }}>To save this as an Official Rubric, you <strong>must select both a Contest and a Category</strong> in the "Summary & Binding" panel on the right. Otherwise, it will just be saved as a Template.</p>
                                    </div>
                                </div>
                            )}
                            <div className="criterion-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                                <div className="criterion-header" style={{ marginBottom: 12 }}>
                                    <div className="criterion-title">
                                        {editorMode === 'edit' ? 'EDITING TEMPLATE' : 'NEW TEMPLATE'}
                                    </div>
                                    {editorMode === 'edit' && <span className="rt-editing-label">#{editingTemplate.id}</span>}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Template Name <span style={{ color: 'red' }}>*</span></label>
                                        <input className="form-input" style={{ margin: 0, fontWeight: 600, fontSize: 16 }} type="text" value={editingTemplate.name} onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard Evaluation Rubric" />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Description</label>
                                        <textarea className="form-textarea" style={{ margin: 0, minHeight: 40, padding: '8px 12px' }} value={editingTemplate.description || ''} onChange={e => setEditingTemplate(p => ({ ...p, description: e.target.value }))} placeholder="Describe when to use this template..." />
                                    </div>
                                </div>
                            </div>

                            {editingTemplate.criteria.map((c, index) => (
                                <div key={c._localId} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fff', marginBottom: 12 }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                        <div style={{ color: '#9ca3af', fontWeight: 600, paddingTop: 26, width: 20, textAlign: 'center' }}>{index + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <label className="form-label" style={{ fontSize: 10, marginBottom: 4, color: '#6b7280', display: 'block' }}>CRITERION NAME</label>
                                            <input type="text" className="form-input" style={{ margin: 0, fontWeight: 600, width: '100%', boxSizing: 'border-box' }} value={c.criteriaName} onChange={e => handleCriterionChange(c._localId, 'criteriaName', e.target.value)} placeholder="e.g. Code Quality" />
                                        </div>
                                        <div style={{ width: 80 }}>
                                            <label className="form-label" style={{ fontSize: 10, marginBottom: 4, color: '#6b7280', display: 'block', textAlign: 'center' }}>MAX SCORE</label>
                                            <input type="text" className="form-input" style={{ margin: 0, textAlign: 'center', width: '100%', boxSizing: 'border-box' }} value={c.maxScore} onChange={e => handleCriterionChange(c._localId, 'maxScore', e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                                        </div>
                                        <div style={{ width: 80 }}>
                                            <label className="form-label" style={{ fontSize: 10, marginBottom: 4, color: '#6b7280', display: 'block', textAlign: 'center' }}>WEIGHT (%)</label>
                                            <input type="text" className="form-input" style={{ margin: 0, textAlign: 'center', width: '100%', boxSizing: 'border-box' }} value={c.percentageWeight} onChange={e => handleCriterionChange(c._localId, 'percentageWeight', e.target.value.replace(/[^0-9]/g, ''))} placeholder="0" />
                                        </div>
                                        <button className="delete-btn" onClick={() => handleDeleteCriterion(c._localId)} style={{ padding: 8, marginTop: 18, color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Remove Criterion">
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <div style={{ paddingLeft: 32, marginTop: 12 }}>
                                        <label className="form-label" style={{ fontSize: 10, marginBottom: 4, color: '#6b7280', display: 'block' }}>DESCRIPTION</label>
                                        <textarea className="form-textarea" style={{ margin: 0, minHeight: 40, padding: '8px 12px', width: '100%', boxSizing: 'border-box', resize: 'vertical' }} value={c.description || ''} onChange={e => handleCriterionChange(c._localId, 'description', e.target.value)} placeholder="Explain the expectations for this criterion..." />
                                    </div>
                                </div>
                            ))}
                            <button className="add-criterion-btn" onClick={handleAddCriterion}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                ADD NEW CRITERION
                            </button>
                        </div>

                        <div>
                            <div className="summary-card">
                                <h3 className="summary-title">Rubric Summary</h3>
                                <div className="weight-display">
                                    <div className="weight-display-label">Total Weightage</div>
                                    <div className="weight-display-value" style={{ color: isBalanced ? '#111827' : '#b91c1c' }}>{totalWeight}%</div>
                                </div>
                                {!isBalanced && (
                                    <div className="balance-error">
                                        <div className="balance-error-title">
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Improper Balance
                                        </div>
                                        <p className="balance-error-desc">Total weight must equal exactly 100%.</p>
                                    </div>
                                )}
                                <div className="stats-row" style={{ marginTop: 24 }}>
                                    <span className="stats-label">Criteria Count</span>
                                    <span className="stats-value">{editingTemplate.criteria.length}</span>
                                </div>
                                <div className="rt-action-btns">
                                    <button className="save-btn" onClick={handleSave} disabled={isLoading || !isBalanced} style={{ backgroundColor: (!editingTemplate.bindContestId && !(editorMode === 'edit' && editingTemplate.isOfficialBinding)) ? '#f59e0b' : '#10b981', color: '#fff', border: 'none' }}>
                                        {isLoading ? 'SAVING...' : editorMode === 'edit' ? (editingTemplate.isOfficialBinding ? 'UPDATE OFFICIAL RUBRIC' : 'UPDATE TEMPLATE') : (editingTemplate.bindContestId ? 'SAVE OFFICIAL RUBRIC' : 'SAVE TEMPLATE')}
                                    </button>
                                    <button className="preview-btn" onClick={cancelEditor}>CANCEL</button>
                                </div>
                                {editorMode && error && <div className="alert-main alert-error" style={{ marginTop: 16 }}>{error}</div>}
                                {editorMode && success && <div className="alert-main alert-success" style={{ marginTop: 16 }}>{success}</div>}
                            </div>
                            <div className="settings-card">
                                <div className="settings-title">TEMPLATE CONFIGURATION</div>
                                <div className="rt-info-badge" style={{ backgroundColor: editingTemplate.bindContestId && editingTemplate.bindCategoryId ? '#dcfce7' : '#fef3c7' }}>
                                    {editingTemplate.bindContestId && editingTemplate.bindCategoryId ? (<span style={{ color: '#16a34a' }}>Saving as Official Contest Rubric</span>
                                    ) : (<span style={{ color: '#d97706' }}>Saving as Template in Template Bank</span>)}
                                </div>
                                <p className="rt-card-desc" style={{ marginBottom: 12, fontSize: 12 }}>
                                    {editingTemplate.isOfficialBinding
                                        ? "Select both a Category and a Contest to bind this rubric officially."
                                        : "Category and Contest bindings are optional for Templates. They can be assigned later."}
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select className="form-select" value={editingTemplate.bindCategoryId || ''} onChange={e => setEditingTemplate(p => ({ ...p, bindCategoryId: e.target.value }))} disabled={editorMode === 'edit' && editingTemplate.isOfficialBinding}>
                                        <option value="">{editingTemplate.isOfficialBinding ? "— Select Category (Required) —" : "— Optional Category Binding —"}</option>
                                        {allGlobalCategories.map(cat => {
                                            const isDuplicate = editingTemplate.bindContestId && contestRubrics.some(cr =>
                                                String(cr.contestId) === String(editingTemplate.bindContestId) &&
                                                String(cr.categoryId) === String(cat.id) &&
                                                String(cr.templateId) !== String(editingTemplate.id)
                                            );
                                            return <option key={cat.id} value={cat.id} disabled={isDuplicate}>{cat.categoryName} {isDuplicate ? '(Already Assigned)' : ''}</option>
                                        })}
                                        {editingTemplate.bindCategoryId && !allGlobalCategories.some(c => String(c.id) === String(editingTemplate.bindCategoryId)) && (
                                            <option value={editingTemplate.bindCategoryId}>Category #{editingTemplate.bindCategoryId}</option>
                                        )}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Contest</label>
                                    <select className="form-select" value={editingTemplate.bindContestId || ''} onChange={e => setEditingTemplate(p => ({ ...p, bindContestId: e.target.value }))} disabled={editorMode === 'edit' && editingTemplate.isOfficialBinding}>
                                        <option value="">{editingTemplate.isOfficialBinding ? "— Select Contest (Required) —" : "— Leave blank for Template —"}</option>
                                        {contests.map(c => {
                                            const isDuplicate = editingTemplate.bindCategoryId && contestRubrics.some(cr =>
                                                String(cr.contestId) === String(c.id) &&
                                                String(cr.categoryId) === String(editingTemplate.bindCategoryId) &&
                                                String(cr.templateId) !== String(editingTemplate.id)
                                            );
                                            return <option key={c.id} value={c.id} disabled={isDuplicate}>{c.name} {isDuplicate ? '(Has Official Rubric)' : ''}</option>
                                        })}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RubricConfig;
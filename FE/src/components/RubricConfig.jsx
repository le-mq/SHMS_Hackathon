import { useState, useEffect, useMemo } from 'react';
import './RubricConfig.css';

const CONTEST_API = 'http://localhost:8080/api/v1/admin/contests';
const CATEGORY_API = 'http://localhost:8080/api/v1/student/categories';
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
        requestData(CONTEST_API, '', (json) => json.contests?.data || [])
            .then(data => setContests(Array.isArray(data) ? data : data.data || []));
        requestData(CONTEST_API, '/rubric-templates', (json) => json.rubricTemplates?.data || []).then(setTemplates);
        requestData(CONTEST_API, '/rubrics', (json) => json.contestRubrics?.data || []).then(setContestRubrics);
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
            .catch(err => console.error("Failed to load global categories", err));
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
    const startNew = () => {
        setEditingTemplate({
            id: null, name: selectedCategory ? `${selectedCategory.categoryName} Rubric` : '', description: '',
            publicVisibility: true, weightedScoring: true, bindContestId: selectedContestId || '', bindCategoryId: selectedCategoryId || '',
            criteria: [{ ...newCriterion(), percentageWeight: '100' }]
        });
        setEditorMode('new'); setError(''); setSuccess('');
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
    const handleDeleteCriterion = (localId) => setEditingTemplate(prev => ({ ...prev, criteria: prev.criteria.filter(c => c._localId !== localId) }));

    const handleSave = async () => {
        if (!editingTemplate.name.trim()) return setError('Template name is required.');
        if (!isBalanced) return setError('Total weight must equal exactly 100%.');
        if (!editingTemplate.bindCategoryId) return setError('Category is required to save the template.');
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
            categoryId: Number(editingTemplate.bindCategoryId),
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

    const handleClone = (id) => handleAction(`${id}/clone`, 'POST', 'Template cloned!', () => {
        const tpl = templates.find(t => t.id === id);
        if (tpl) setTemplates(prev => [...prev, { ...tpl, id: Date.now(), name: tpl.name + ' (Copy)' }]);
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

    return (
        <div className="admin-container">
            <div className="config-wrapper">
                <div className="rubric-page-header">
                    <div>
                        <h1 className="config-title">Rubric Configuration</h1>
                        <p className="config-subtitle">Manage reusable scoring criteria for each contest category.</p>
                    </div>
                    {editorMode === null && (
                        <button className="rt-btn-primary" onClick={startNew}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            New Template
                        </button>
                    )}
                </div>
                {!editorMode && error && <div className="alert-main alert-error">{error}</div>}
                {!editorMode && success && <div className="alert-main alert-success">{success}</div>}
                <div className="rt-filter-bar" style={{ marginBottom: 24 }}>
                    <div className="rt-filter-item">
                        <label className="form-label">Contest</label>
                        <select className="form-select" value={selectedContestId} onChange={e => { setSelectedContestId(e.target.value); setEditorMode(null); }}>
                            <option value="">— All Contests —</option>
                            {contests.map(c => <option key={c.id} value={c.id}>{c.name} ({c.year} {c.season})</option>)}
                        </select>
                    </div>
                    {selectedContestId && (
                        <div className="rt-filter-item">
                            <label className="form-label">Category</label>
                            <select className="form-select" value={selectedCategoryId} onChange={e => { setSelectedCategoryId(e.target.value); setEditorMode(null); }}>
                                <option value="">— All Categories —</option>
                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.categoryName}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                {(() => {
                    const renderCard = (tpl, isOfficial) => {
                        const isActived = contestRubrics.some(cr => cr.templateId === tpl.id);
                        const isClone = tpl.name.includes('(Copy)');

                        let cardClass = "rt-card";
                        if (isClone) {
                            cardClass += " rt-card-clone";
                        } else if (isOfficial) {
                            cardClass += " rt-card-official";
                        } else {
                            cardClass += " rt-card-draft";
                        }

                        return (
                            <div key={`${isOfficial ? 'off' : 'bank'}-${tpl.id}`} className={cardClass}>
                                <div className="rt-card-top">
                                    <div className="rt-card-icon">
                                        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    </div>
                                    <div className="rt-card-info">
                                        <h3 className="rt-card-name">
                                            {tpl.name.replace(' (Copy)', '')}
                                        </h3>
                                        <p className="rt-card-desc" style={{ color: '#000', fontSize: '13px' }}>{tpl.description || 'No description'}</p>
                                    </div>
                                </div>
                                <div className="rt-card-meta">
                                    <span className="rt-chip">{(tpl.criteria || []).length} criteria</span>
                                    {tpl.publicVisibility && <span className="rt-chip rt-chip-green">Public</span>}
                                    {tpl.weightedScoring && <span className="rt-chip rt-chip-blue">Weighted</span>}
                                </div>
                                <div className="rt-card-actions">
                                    <button className="rt-btn-ghost" onClick={() => startEdit(tpl, isOfficial)}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>Edit</button>
                                    <button className="rt-btn-ghost" onClick={() => handleClone(tpl.id)} disabled={isLoading}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Clone</button>
                                    {!isActived && (
                                        <button className="rt-btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleDelete(tpl.id)} disabled={isLoading}><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete</button>
                                    )}
                                </div>
                            </div>
                        );
                    };

                    const bankTemplates = templates.filter(tpl => tpl.status !== 'ACTIVE' && !contestRubrics.some(cr => cr.templateId == tpl.id));
                    const cloneTemplates = bankTemplates.filter(tpl => tpl.name.includes('(Copy)'));
                    const draftTemplates = bankTemplates.filter(tpl => !tpl.name.includes('(Copy)'));
                    return (
                        <>
                            {officialTemplates.length > 0 && editorMode === null && (
                                <div style={{ marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#15803d', marginBottom: 16, borderBottom: '2px solid #dcfce7', paddingBottom: 8 }}>
                                        {selectedContestId ? 'Official Contest Rubrics' : 'All Official Contest Rubrics'}
                                    </h2>
                                    <div className="rt-card-grid">{officialTemplates.map(tpl => renderCard(tpl, true))}</div>
                                </div>
                            )}
                            {editorMode === null && (
                                <div style={{ marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#c2410c', marginBottom: 16, borderBottom: '2px solid #ffedd5', paddingBottom: 8 }}>
                                        Draft Rubrics
                                    </h2>
                                    {draftTemplates.length > 0 ? (
                                        <div className="rt-card-grid">{draftTemplates.map(tpl => renderCard(tpl, false))}</div>
                                    ) : (<div className="rt-empty" style={{ marginBottom: 24 }}><p>No draft templates found.</p></div>)}
                                </div>
                            )}
                            {editorMode === null && cloneTemplates.length > 0 && (
                                <div style={{ marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#4b5563', marginBottom: 16, borderBottom: '2px solid #e5e7eb', paddingBottom: 8 }}>
                                        Clone Templates
                                    </h2>
                                    <div className="rt-card-grid">{cloneTemplates.map(tpl => renderCard(tpl, false))}</div>
                                </div>
                            )}
                        </>
                    );
                })()}


                {editorMode && editingTemplate && (
                    <div className="rubric-grid">
                        <div>
                            <div className="criterion-card" style={{ marginBottom: 20 }}>
                                <div className="criterion-header">
                                    <div className="criterion-title">
                                        {editorMode === 'edit' ? 'EDITING TEMPLATE' : 'NEW TEMPLATE'}
                                    </div>
                                    {editorMode === 'edit' && <span className="rt-editing-label">#{editingTemplate.id}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Template Name <span style={{ color: 'red' }}>*</span></label>
                                    <input className="form-input" type="text" value={editingTemplate.name} onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Standard Evaluation Rubric" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" value={editingTemplate.description || ''} onChange={e => setEditingTemplate(p => ({ ...p, description: e.target.value }))} placeholder="Describe when to use this template..." />
                                </div>
                            </div>

                            {editingTemplate.criteria.map((c, index) => (
                                <div key={c._localId} className="criterion-card">
                                    <div className="criterion-header">
                                        <div className="criterion-title">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                            CRITERION #{index + 1}
                                        </div>
                                        <button className="delete-btn" onClick={() => handleDeleteCriterion(c._localId)}>
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Criteria Name</label>
                                            <input type="text" className="form-input" value={c.criteriaName} onChange={e => handleCriterionChange(c._localId, 'criteriaName', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Max Score</label>
                                            <input type="number" className="form-input" value={c.maxScore} onChange={e => handleCriterionChange(c._localId, 'maxScore', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Criterion Description</label>
                                        <textarea className="form-textarea" value={c.description || ''} onChange={e => handleCriterionChange(c._localId, 'description', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Percentage Weight (%)</label>
                                        <input type="text" className="form-input" placeholder="0" value={c.percentageWeight} onChange={e => handleCriterionChange(c._localId, 'percentageWeight', e.target.value)} />
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
                                    <button className="save-btn" onClick={handleSave} disabled={isLoading || !isBalanced}>
                                        {isLoading ? 'SAVING...' : editorMode === 'edit' ? 'UPDATE TEMPLATE' : (editingTemplate.bindContestId ? 'SAVE OFFICIAL RUBRIC' : 'SAVE DRAFT TEMPLATE')}
                                    </button>
                                    <button className="preview-btn" onClick={cancelEditor}>CANCEL</button>
                                </div>
                                {editorMode && error && <div className="alert-main alert-error" style={{ marginTop: 16 }}>{error}</div>}
                                {editorMode && success && <div className="alert-main alert-success" style={{ marginTop: 16 }}>{success}</div>}
                            </div>
                            <div className="settings-card">
                                <div className="settings-title">TEMPLATE CONFIGURATION</div>
                                <div className="rt-info-badge" style={{ backgroundColor: editingTemplate.bindContestId ? '#dcfce7' : '#fef3c7' }}>
                                    {editingTemplate.bindContestId ? (<span style={{ color: '#16a34a' }}>Saving as Official Contest Rubric</span>
                                    ) : (<span style={{ color: '#d97706' }}>Saving as Draft in Template Bank</span>)}
                                </div>
                                <p className="rt-card-desc" style={{ marginBottom: 12, fontSize: 12 }}>
                                    Category is mandatory for template base definition. Select a contest only when establishing an official live rubric binding.</p>
                                <div className="form-group">
                                    <label className="form-label">Category <span style={{ color: 'red' }}>*</span></label>
                                    <select className="form-select" value={editingTemplate.bindCategoryId || ''} onChange={e => setEditingTemplate(p => ({ ...p, bindCategoryId: e.target.value }))} disabled={editingTemplate.isOfficialBinding}>
                                        <option value="">— Choose category —</option>
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
                                    <select className="form-select" value={editingTemplate.bindContestId || ''} onChange={e => setEditingTemplate(p => ({ ...p, bindContestId: e.target.value }))} disabled={editingTemplate.isOfficialBinding}>
                                        <option value="">— Optional (Bank Draft Template) —</option>
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
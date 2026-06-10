import { useState, useEffect, useMemo } from 'react';
import './RubricTemplates.css';
import NavbarAdmin from './NavbarAdmin';

const API = 'http://localhost:8080/api/v1/admin/contests';

const newCriterion = () => ({
    _localId: Date.now() + Math.random(),
    criteriaName: '', maxScore: 10, description: '', percentageWeight: 0
});

const RubricTemplates = () => {
    const token = localStorage.getItem('shms_token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    /* ── Data ─────────────────────────────── */
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [templates, setTemplates] = useState([]);     // all templates from bank
    const [contestRubrics, setContestRubrics] = useState([]); // bindings

    /* ── Editor state ─────────────────────── */
    // editorMode: null | 'new' | 'edit' | 'clone-then-edit'
    const [editorMode, setEditorMode] = useState(null);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [bindCategories, setBindCategories] = useState([]);
    
    useEffect(() => {
        if (!editingTemplate || !editingTemplate.bindContestId) { setBindCategories([]); return; }
        fetch(`${API}/${editingTemplate.bindContestId}`, { headers })
            .then(r => r.ok ? r.json() : {})
            .then(d => { setBindCategories(d.tracks || []); })
            .catch(() => setBindCategories([]));
    }, [editingTemplate?.bindContestId]);

    /* ── UI ───────────────────────────────── */
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    /* ── Load contests ────────────────────── */
    useEffect(() => {
        fetch(`${API}`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(d => setContests(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    /* ── Load categories when contest changes ─ */
    useEffect(() => {
        if (!selectedContestId) { setCategories([]); setSelectedCategoryId(''); return; }
        fetch(`${API}/${selectedContestId}`, { headers })
            .then(r => r.ok ? r.json() : {})
            .then(d => { setCategories(d.tracks || []); setSelectedCategoryId(''); })
            .catch(() => setCategories([]));
    }, [selectedContestId]);

    /* ── Load all templates and bindings ── */
    const loadTemplates = () => {
        fetch(`${API}/rubric-templates`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(d => setTemplates(Array.isArray(d) ? d : []))
            .catch(() => {});
        fetch(`${API}/rubrics`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(d => setContestRubrics(Array.isArray(d) ? d : []))
            .catch(() => {});
    };
    useEffect(() => { loadTemplates(); }, []);

    /* ── Computed ─────────────────────────── */
    const selectedCategory = useMemo(
        () => categories.find(c => String(c.id) === String(selectedCategoryId)) || null,
        [categories, selectedCategoryId]
    );

    // Official Rubrics based on filter
    const officialTemplates = useMemo(() => {
        let bindings = contestRubrics;
        if (selectedContestId) {
            bindings = bindings.filter(cr => String(cr.contestId) === String(selectedContestId));
        }
        if (selectedCategoryId) {
            bindings = bindings.filter(cr => String(cr.categoryId) === String(selectedCategoryId));
        }
        const uniqueIds = Array.from(new Set(bindings.map(b => b.templateId)));
        return uniqueIds.map(id => templates.find(t => t.id === id)).filter(Boolean);
    }, [contestRubrics, templates, selectedContestId, selectedCategoryId]);

    // Template Bank
    const bankTemplates = useMemo(() => {
        return templates;
    }, [templates]);

    const totalWeight = useMemo(() => {
        if (!editingTemplate) return 0;
        return editingTemplate.criteria.reduce((s, c) => s + Number(c.percentageWeight || 0), 0);
    }, [editingTemplate]);

    const isBalanced = totalWeight === 100;

    /* ── Editor helpers ───────────────────── */
    const startNew = () => {
        setEditingTemplate({
            id: null,
            name: selectedCategory ? `${selectedCategory.categoryName} Rubric` : '',
            description: '',
            publicVisibility: true,
            weightedScoring: true,
            bindContestId: '',
            bindCategoryId: '',
            bindRoundId: '',
            criteria: [{ ...newCriterion(), percentageWeight: 100 }]
        });
        setEditorMode('new');
        setError(''); setSuccess('');
    };

    const startEdit = (tpl, isOfficial) => {
        let binding = null;
        if (isOfficial) {
            // Find a binding that matches the current filter (if applied) or just any binding for this template
            binding = contestRubrics.find(cr => String(cr.templateId) === String(tpl.id) && 
                (!selectedContestId || String(cr.contestId) === String(selectedContestId)) && 
                (!selectedCategoryId || String(cr.categoryId) === String(selectedCategoryId))) 
                || contestRubrics.find(cr => String(cr.templateId) === String(tpl.id));
        }

        setEditingTemplate({
            ...JSON.parse(JSON.stringify(tpl)),
            bindContestId: binding ? binding.contestId : '',
            bindCategoryId: binding ? binding.categoryId : '',
            bindRoundId: binding ? binding.roundId : '',
            criteria: (tpl.criteria || []).map((c, i) => ({ ...c, _localId: c.id ?? i }))
        });
        setEditorMode('edit');
        setError(''); setSuccess('');
    };

    const cancelEditor = () => {
        setEditorMode(null);
        setEditingTemplate(null);
        setError(''); setSuccess('');
    };

    const handleCriterionChange = (localId, field, value) => {
        setEditingTemplate(prev => ({
            ...prev,
            criteria: prev.criteria.map(c => c._localId === localId ? { ...c, [field]: value } : c)
        }));
        setError('');
    };

    const handleAddCriterion = () => {
        setEditingTemplate(prev => ({ ...prev, criteria: [...prev.criteria, newCriterion()] }));
    };

    const handleDeleteCriterion = (localId) => {
        setEditingTemplate(prev => ({
            ...prev,
            criteria: prev.criteria.filter(c => c._localId !== localId)
        }));
    };

    /* ── Save ─────────────────────────────── */
    const handleSave = async () => {
        if (!editingTemplate.name.trim()) { setError('Template name is required.'); return; }
        if (!isBalanced) { setError('Total weight must equal exactly 100%.'); return; }
        for (const c of editingTemplate.criteria) {
            if (!c.criteriaName.trim()) { setError('All criteria must have a name.'); return; }
        }

        setIsLoading(true); setError(''); setSuccess('');

        const payload = {
            name: editingTemplate.name,
            description: editingTemplate.description || '',
            publicVisibility: editingTemplate.publicVisibility,
            weightedScoring: editingTemplate.weightedScoring,
            categoryId: editingTemplate.bindCategoryId ? Number(editingTemplate.bindCategoryId) : null,
            roundId: editingTemplate.bindRoundId ? Number(editingTemplate.bindRoundId) : null,
            criteria: editingTemplate.criteria.map(c => ({
                criteriaName: c.criteriaName,
                description: c.description || '',
                maxScore: Number(c.maxScore),
                percentageWeight: Number(c.percentageWeight)
            }))
        };

        try {
            let r;
            if (editorMode === 'edit' && editingTemplate.id) {
                r = await fetch(`${API}/rubric-templates/${editingTemplate.id}`, {
                    method: 'PUT', headers, body: JSON.stringify(payload)
                });
            } else {
                if (payload.categoryId && payload.roundId) {
                    // Create and bind officially
                    r = await fetch(`${API}/rubrics`, {
                        method: 'POST', headers, body: JSON.stringify(payload)
                    });
                } else {
                    // Create draft (template-only endpoint)
                    r = await fetch(`${API}/rubric-templates`, {
                        method: 'POST', headers, body: JSON.stringify(payload)
                    });
                }
            }

            if (r.ok) {
                setSuccess(editorMode === 'edit' ? 'Template updated successfully!' : 'Template saved successfully!');
                loadTemplates();
                setTimeout(() => { cancelEditor(); }, 1400);
            } else {
                const d = await r.json().catch(() => ({}));
                setError(d.error || `Error ${r.status}: ${r.statusText}`);
            }
        } catch (e) {
            setError('Connection error: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Clone & Delete ────────────────────── */
    const handleClone = async (id) => {
        setIsLoading(true); setError(''); setSuccess('');
        try {
            const r = await fetch(`${API}/rubric-templates/${id}/clone`, { method: 'POST', headers });
            if (r.ok) { setSuccess('Template cloned!'); loadTemplates(); }
            else { const d = await r.json(); setError(d.error || 'Clone failed'); }
        } catch { setError('Server error'); }
        finally { setIsLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;
        setIsLoading(true); setError(''); setSuccess('');
        try {
            const r = await fetch(`${API}/rubric-templates/${id}`, { method: 'DELETE', headers });
            if (r.ok) { setSuccess('Template deleted!'); loadTemplates(); }
            else { const d = await r.json().catch(()=>({})); setError(d.error || 'Delete failed'); }
        } catch { setError('Server error'); }
        finally { setIsLoading(false); }
    };

    /* ── Render ────────────────────────────── */
    return (
        <div className="admin-container">
            <NavbarAdmin />
            <div className="config-wrapper">

                {/* Page header */}
                <div className="rubric-page-header">
                    <div>
                        <h1 className="config-title">Rubric Bank &amp; Evaluation Templates</h1>
                        <p className="config-subtitle">Manage reusable scoring criteria for each contest category.</p>
                    </div>
                </div>

                {error   && <div className="alert-main alert-error">{error}</div>}
                {success && <div className="alert-main alert-success">{success}</div>}

                {/* ── Contest / Category selector ── */}
                <div className="rt-filter-bar" style={{ marginBottom: 24 }}>
                    <div className="rt-filter-item">
                        <label className="form-label">Contest</label>
                        <select className="form-select" value={selectedContestId}
                            onChange={e => { setSelectedContestId(e.target.value); setEditorMode(null); }}>
                            <option value="">— All Contests —</option>
                            {contests.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.year} {c.season})</option>
                            ))}
                        </select>
                    </div>
                    {selectedContestId && (
                        <div className="rt-filter-item">
                            <label className="form-label">Category</label>
                            <select className="form-select" value={selectedCategoryId}
                                onChange={e => { setSelectedCategoryId(e.target.value); setEditorMode(null); }}>
                                <option value="">— All Categories —</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.categoryName}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* ── Render Function for Cards ── */}
                {(() => {
                    const renderCard = (tpl, isOfficial) => (
                        <div key={`${isOfficial ? 'off' : 'bank'}-${tpl.id}`} className="rt-card">
                            <div className="rt-card-top">
                                <div className="rt-card-icon">
                                    <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <div className="rt-card-info">
                                    <h3 className="rt-card-name">{tpl.name} {isOfficial && <span style={{fontSize: 12, color: '#6b7280', marginLeft: 6, fontWeight: 500}}>(Official)</span>}</h3>
                                    <p className="rt-card-desc">{tpl.description || 'No description'}</p>
                                </div>
                            </div>
                            <div className="rt-card-meta">
                                <span className="rt-chip">{(tpl.criteria || []).length} criteria</span>
                                {tpl.publicVisibility && <span className="rt-chip rt-chip-green">Public</span>}
                                {tpl.weightedScoring && <span className="rt-chip rt-chip-blue">Weighted</span>}
                            </div>
                            <div className="rt-card-actions">
                                <button className="rt-btn-ghost" onClick={() => startEdit(tpl, isOfficial)}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                </button>
                                <button className="rt-btn-ghost" onClick={() => handleClone(tpl.id)} disabled={isLoading}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    Clone
                                </button>
                                <button className="rt-btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleDelete(tpl.id)} disabled={isLoading}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    );

                    return (
                        <>
                            {/* ── Official Templates ── */}
                            {officialTemplates.length > 0 && editorMode === null && (
                                <div style={{ marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                                        {selectedContestId ? 'Official Contest Rubrics' : 'All Official Contest Rubrics'}
                                    </h2>
                                    <div className="rt-card-grid">
                                        {officialTemplates.map(tpl => renderCard(tpl, true))}
                                    </div>
                                </div>
                            )}

                            {/* ── Bank Templates ── */}
                            {editorMode === null && (
                                <div style={{ marginBottom: 32 }}>
                                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
                                        Rubric Template Bank (Drafts)
                                    </h2>
                                    {bankTemplates.length > 0 ? (
                                        <div className="rt-card-grid">
                                            {bankTemplates.map(tpl => renderCard(tpl, false))}
                                        </div>
                                    ) : (
                                        <div className="rt-empty" style={{ marginBottom: 24 }}>
                                            <svg width="48" height="48" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <p>No rubric templates found in bank.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    );
                })()}

                {/* ── "Add another" button ── */}
                {editorMode === null && (
                    <button className="rt-btn-primary" style={{ marginBottom: 24 }} onClick={startNew}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Template
                    </button>
                )}

                {/* ── Inline editor (new / edit) ── */}
                {editorMode && editingTemplate && (
                    <div className="rubric-grid">
                        {/* Left: criteria builder */}
                        <div>
                            {/* Template meta card */}
                            <div className="criterion-card" style={{ marginBottom: 20 }}>
                                <div className="criterion-header">
                                    <div className="criterion-title">
                                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        {editorMode === 'edit' ? 'EDITING TEMPLATE' : 'NEW TEMPLATE'}
                                    </div>
                                    {editorMode === 'edit' && (
                                        <span className="rt-editing-label">#{editingTemplate.id}</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Template Name *</label>
                                    <input className="form-input" type="text" value={editingTemplate.name}
                                        onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))}
                                        placeholder="e.g. Standard Evaluation Rubric" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-textarea" value={editingTemplate.description || ''}
                                        onChange={e => setEditingTemplate(p => ({ ...p, description: e.target.value }))}
                                        placeholder="Describe when to use this template..." />
                                </div>
                                {editorMode === 'new' && (
                                    <div className="rt-info-badge">
                                        {selectedCategory
                                            ? `Linked to category: ${selectedCategory.categoryName}`
                                            : 'No category selected — template will be saved to the bank only'}
                                    </div>
                                )}
                            </div>

                            {/* Criteria cards */}
                            {editingTemplate.criteria.map((c, index) => (
                                <div key={c._localId} className="criterion-card">
                                    <div className="criterion-header">
                                        <div className="criterion-title">
                                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                            </svg>
                                            CRITERION #{index + 1}
                                        </div>
                                        <button className="delete-btn" onClick={() => handleDeleteCriterion(c._localId)}>
                                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Criteria Name</label>
                                            <input type="text" className="form-input" value={c.criteriaName}
                                                onChange={e => handleCriterionChange(c._localId, 'criteriaName', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Max Score</label>
                                            <input type="number" className="form-input" value={c.maxScore}
                                                onChange={e => handleCriterionChange(c._localId, 'maxScore', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Criterion Description</label>
                                        <textarea className="form-textarea" value={c.description || ''}
                                            onChange={e => handleCriterionChange(c._localId, 'description', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Percentage Weight: <strong>{c.percentageWeight}%</strong></label>
                                        <div className="weight-slider-container">
                                            <input type="range" className="weight-slider" min="0" max="100"
                                                value={c.percentageWeight}
                                                onChange={e => handleCriterionChange(c._localId, 'percentageWeight', Number(e.target.value))} />
                                            <div className="weight-value">{c.percentageWeight}%</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button className="add-criterion-btn" onClick={handleAddCriterion}>
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                ADD NEW CRITERION
                            </button>
                        </div>

                        {/* Right: summary + settings */}
                        <div>
                            <div className="summary-card">
                                <h3 className="summary-title">Rubric Summary</h3>

                                <div className="weight-display">
                                    <div className="weight-display-label">Total Weightage</div>
                                    <div className="weight-display-value"
                                        style={{ color: isBalanced ? '#111827' : '#b91c1c' }}>
                                        {totalWeight}%
                                    </div>
                                </div>

                                {!isBalanced && (
                                    <div className="balance-error">
                                        <div className="balance-error-title">
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
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
                                    <button className="save-btn" onClick={handleSave}
                                        disabled={isLoading || !isBalanced}>
                                        {isLoading ? 'SAVING...' : editorMode === 'edit' ? 'UPDATE TEMPLATE' : 'SAVE TEMPLATE'}
                                    </button>
                                    <button className="preview-btn" onClick={cancelEditor}>CANCEL</button>
                                </div>
                            </div>

                                <div className="settings-card">
                                    <div className="settings-title">TEMPLATE BINDING (OFFICIAL)</div>
                                    <p className="rt-card-desc" style={{ marginBottom: 12, fontSize: 12 }}>
                                        Để trống nếu bạn chỉ muốn lưu thành bản nháp (Draft) trong ngân hàng Template. Chọn Contest, Category và Round để đưa vào sử dụng chính thức.
                                    </p>
                                    <div className="form-group">
                                        <label className="form-label">Contest</label>
                                        <select className="form-select" value={editingTemplate.bindContestId || ''}
                                            onChange={e => setEditingTemplate(p => ({ ...p, bindContestId: e.target.value, bindCategoryId: '', bindRoundId: '' }))}>
                                            <option value="">— Không chọn —</option>
                                            {contests.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    {editingTemplate.bindContestId && (
                                        <div className="form-group">
                                            <label className="form-label">Category (Hạng mục)</label>
                                            <select className="form-select" value={editingTemplate.bindCategoryId || ''}
                                                onChange={e => setEditingTemplate(p => ({ ...p, bindCategoryId: e.target.value, bindRoundId: '' }))}>
                                                <option value="">— Chọn Hạng mục —</option>
                                                {bindCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.categoryName}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {editingTemplate.bindCategoryId && (
                                        <div className="form-group">
                                            <label className="form-label">Round (Vòng thi)</label>
                                            <select className="form-select" value={editingTemplate.bindRoundId || ''}
                                                onChange={e => setEditingTemplate(p => ({ ...p, bindRoundId: e.target.value }))}>
                                                <option value="">— Chọn Vòng thi —</option>
                                                {(bindCategories.find(c => String(c.id) === String(editingTemplate.bindCategoryId))?.rounds || []).map(r => 
                                                    <option key={r.id} value={r.id}>{r.phaseName}</option>
                                                )}
                                            </select>
                                        </div>
                                    )}
                                </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RubricTemplates;

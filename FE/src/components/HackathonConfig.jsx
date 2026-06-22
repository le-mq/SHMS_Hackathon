import { useState, useEffect } from 'react';
import { useFormik, FieldArray, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { Form, Button } from 'react-bootstrap';
import './HackathonConfig.css';
import NavbarAdmin from './NavbarAdmin';

const API_BASE = "http://localhost:8080/api/v1";

const HackathonConfig = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [allUniversities, setAllUniversities] = useState([]);
    const [selectedUniToAdd, setSelectedUniToAdd] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const todayStr = new Date().toISOString().slice(0, 10);

    const getSemesterBounds = (term, year) => {
        const currentYear = year || new Date().getFullYear();
        const baseDates = {
            SPRING: { startMonth: 0, endMonth: 3, endDay: 30, maxTime: '04-30T23:59' },
            SUMMER: { startMonth: 4, endMonth: 7, endDay: 31, maxTime: '08-31T23:59' },
            FALL: { startMonth: 8, endMonth: 11, endDay: 31, maxTime: '12-31T23:59' }
        };
        const config = baseDates[term] || baseDates.SPRING;
        const startIso = `${currentYear}-${String(config.startMonth + 1).padStart(2, '0')}-01T00:00`;
        return {
            start: new Date(currentYear, config.startMonth, 1, 0, 0, 0),
            end: new Date(currentYear, config.endMonth, config.endDay, 23, 59, 59),
            min: startIso,
            max: `${currentYear}-${config.maxTime}`
        };
    };

    const getSemesterFromDate = (dateStr) => {
        const month = new Date(dateStr).getMonth();
        if (month >= 0 && month <= 3) return 'SPRING';
        if (month >= 4 && month <= 7) return 'SUMMER';
        return 'FALL';
    };

    const fetchData = async (url, mockKey) => {
        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('shms_token')}` } });
            if (res.ok) {
                const data = await res.json();
                if (Object.keys(data || {}).length > 0) return data;
            }
        } catch (e) { }
        const mock = await (await fetch('/testFE.json')).json();
        return mockKey === 'uni' ? mock.hackathonConfig?.universities || []
            : mockKey === 'contests' ? mock.contests?.data || []
                : mock.hackathonConfig?.contestDetail || {};
    };

    const fetchContests = async () => setContests(await fetchData(`${API_BASE}/admin/contests`, 'contests'));
    const fetchAllUniversities = async () => setAllUniversities(await fetchData(`${API_BASE}/admin/universities`, 'uni'));

    useEffect(() => {
        fetchContests();
        fetchAllUniversities();
    }, []);

    const initialValues = {
        name: '', theme: '', term: 'Auto setup', year: new Date().getFullYear(), regionScope: 'Ha Noi',
        maximumAllowedTeams: 100, registrationStart: '', registrationEnd: '',
        complianceRules: '', tieredPrizeStructures: '', status: 'UPCOMING',
        universities: [],
        categories: [{ id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVE' }],
        rounds: [{ id: -1, phaseName: 'Round 1', categoryId: -1, submissionOpen: '', submissionDeadline: '', state: 'UPCOMING' }]
    };

    const validationSchema = Yup.object().shape({
        name: Yup.string().required('Event Name is required'),
        theme: Yup.string().required('Theme is required'),
        year: Yup.number().required('Year is required'),
        regionScope: Yup.string().required('Region Scope is required'),
        maximumAllowedTeams: Yup.number().min(1, 'Must be at least 1').required('Required'),
        registrationStart: Yup.date().required('Registration Start is required').test('year-match', 'Year must match core settings', function (val) {
            return val ? new Date(val).getFullYear() === Number(this.parent.year) : true;
        }),
        registrationEnd: Yup.date().required('Registration End is required').min(Yup.ref('registrationStart'), 'Must be after start date').test('year-match', 'Year must match core settings', function (val) {
            return val ? new Date(val).getFullYear() === Number(this.parent.year) : true;
        }),
        universities: Yup.array().min(1, 'Add at least one university'),
        categories: Yup.array().of(Yup.object().shape({ trackName: Yup.string().required('Category Name is required') })).min(1, 'Add at least one category'),
        rounds: Yup.array().of(
            Yup.object().shape({
                phaseName: Yup.string().required('Phase Name is required'),
                categoryId: Yup.string().required('Category is required').test('unique-category', 'Category already assigned to another round', function (val) {
                    if (!val) return true;
                    return this.from[1].value.rounds.filter(r => String(r.categoryId) === String(val)).length <= 1;
                }),
                submissionOpen: Yup.date().required('Open time is required'),
                submissionDeadline: Yup.date().required('Deadline is required').min(Yup.ref('submissionOpen'), 'Must be after Open time')
            })
        ).min(1, 'Add at least one round')
    });

    const formik = useFormik({
        initialValues,
        validationSchema,
        onSubmit: async (values, { setSubmitting, setStatus }) => {
            const bounds = getSemesterBounds(values.term, values.year);
            const startLimit = bounds.start.getTime();
            const endLimit = bounds.end.getTime();
            const outOfBound = values.rounds.find(r => {
                const d1 = r.submissionOpen ? new Date(r.submissionOpen).getTime() : null;
                const d2 = r.submissionDeadline ? new Date(r.submissionDeadline).getTime() : null;
                return (d1 && (d1 < startLimit || d1 > endLimit)) || (d2 && (d2 < startLimit || d2 > endLimit));
            });
            if (outOfBound) {
                setStatus({ error: `Cannot save! ${outOfBound.phaseName} contains dates out of the ${values.term} ${values.year} season.` });
                setSubmitting(false);
                return;
            }
            for (let i = 1; i < values.rounds.length; i++) {
                const prevDeadline = values.rounds[i - 1].submissionDeadline ? new Date(values.rounds[i - 1].submissionDeadline).getTime() : 0;
                const currOpen = values.rounds[i].submissionOpen ? new Date(values.rounds[i].submissionOpen).getTime() : 0;
                if (currOpen && prevDeadline && currOpen <= prevDeadline) {
                    setStatus({ error: `${values.rounds[i].phaseName} Open time must be after ${values.rounds[i - 1].phaseName} Deadline.` });
                    setSubmitting(false);
                    return;
                }
            }
            setIsLoading(true); setStatus({});
            try {
                const token = localStorage.getItem('shms_token');
                let currentContestId = selectedContestId;
                const response = await fetch(`${API_BASE}/admin/contests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ ...values, id: currentContestId || null, allowedCorporateDomains: values.universities.join(',') })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to create contest configuration');
                if (!currentContestId) currentContestId = data.contestId;
                setSelectedContestId(currentContestId);

                for (const category of values.categories) {
                    const categoryRounds = values.rounds.filter(r => String(r.categoryId) === String(category.id));

                    if (categoryRounds.length > 0) {
                        const trackRes = await fetch(`${API_BASE}/admin/contests/rounds-tracks`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                                contestId: currentContestId,
                                categoryName: category.trackName,
                                trackDescription: category.trackDescription || 'No description',
                                guidelineUrl: category.guidelineUrl || '',
                                status: values.status === 'CLOSED' ? 'CLOSED' : (category.status || 'ACTIVE'),
                                rounds: categoryRounds.map((r, rIndex) => ({
                                    id: String(r.id).startsWith('-') ? null : r.id,
                                    phaseName: r.phaseName,
                                    roundOrder: rIndex + 1,
                                    submissionOpen: r.submissionOpen.length === 16 ? r.submissionOpen + ':00' : r.submissionOpen,
                                    submissionDeadline: r.submissionDeadline.length === 16 ? r.submissionDeadline + ':00' : r.submissionDeadline,
                                    state: values.status === 'CLOSED' ? 'CLOSED' : (r.state || 'UPCOMING')
                                }))
                            })
                        });

                        if (!trackRes.ok) {
                            const errData = await trackRes.json();
                            throw new Error(errData.error || `Failed to save rounds for category: ${category.trackName}`);
                        }
                    }
                }

                setStatus({ success: selectedContestId ? 'Season Hackathon configuration saved successfully!' : 'Season Hackathon initialized successfully!' });
                fetchContests();
            } catch (err) {
                setStatus({ error: err.message || 'Failed to connect to the server' });
            } finally {
                setIsLoading(false);
                setSubmitting(false);
            }
        }
    });

    const handleSelectContest = async (id) => {
        formik.setStatus({});
        if (!id) {
            setSelectedContestId('');
            formik.resetForm();
            return;
        }
        setSelectedContestId(id); setIsLoading(true);
        try {
            const data = await fetchData(`${API_BASE}/admin/contests/${id}`);
            if (data) {
                const fetchedCategories = data.tracks?.length ? data.tracks.map((t, idx) => ({
                    id: t.id || -(idx + 1), trackName: t.categoryName || '', trackDescription: t.trackDescription || '',
                    guidelineUrl: t.guidelineUrl || '', status: t.status || 'ACTIVE'
                })) : [{ id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVE' }];

                let fetchedRounds = [];
                if (data.tracks?.length) {
                    const roundMap = new Map();
                    data.tracks.forEach((t, tIdx) => {
                        const cat = fetchedCategories.find(c => c.trackName === t.categoryName);
                        const catId = t.id || (cat ? cat.id : -(tIdx + 1));
                        if (t.rounds?.length) {
                            t.rounds.forEach((r) => {
                                const rId = r.roundId || r.id;
                                if (rId && !roundMap.has(String(rId))) {
                                    roundMap.set(String(rId), {
                                        id: rId,
                                        phaseName: r.roundName || r.phaseName || '',
                                        categoryId: catId,
                                        submissionOpen: r.submissionOpen ? r.submissionOpen.slice(0, 16) : '',
                                        submissionDeadline: r.submissionDeadline ? r.submissionDeadline.slice(0, 16) : '',
                                        state: r.status || r.state || 'UPCOMING'
                                    });
                                }
                            });
                        }
                    });
                    fetchedRounds = Array.from(roundMap.values());
                }

                if (fetchedRounds.length === 0) {
                    fetchedRounds = fetchedCategories.map((cat, idx) => ({
                        id: -(idx + 1), phaseName: `Round ${idx + 1}`, categoryId: cat.id, submissionOpen: '', submissionDeadline: '', state: 'UPCOMING'
                    }));
                }

                formik.setValues({
                    name: data.name || '', theme: data.theme || '', term: data.term || 'Auto setup', year: data.year || new Date().getFullYear(),
                    regionScope: data.regionScope || 'Ha Noi', maximumAllowedTeams: data.maximumAllowedTeams || 100,
                    registrationStart: data.registrationStart ? data.registrationStart.slice(0, 10) : '',
                    registrationEnd: data.registrationEnd ? data.registrationEnd.slice(0, 10) : '',
                    complianceRules: data.complianceRules || '', tieredPrizeStructures: data.tieredPrizeStructures || '',
                    status: data.status || 'UPCOMING', universities: data.universities || [],
                    categories: fetchedCategories,
                    rounds: fetchedRounds
                });
            } else { formik.setStatus({ error: 'Failed to fetch contest details' }); }
        } catch (err) { formik.setStatus({ error: 'Failed to connect to the server' }); }
        finally { setIsLoading(false); }
    };

    const handleRegistrationStartChange = (e) => {
        formik.handleChange(e);
        const value = e.target.value;
        if (value) {
            formik.setFieldValue('term', getSemesterFromDate(value));
            formik.setFieldValue('year', new Date(value).getFullYear());
        }
    };

    const bounds = getSemesterBounds(formik.values.term, formik.values.year);
    const filteredContests = contests.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())
        || `${c.season} ${c.year}`.toLowerCase().includes(searchQuery.toLowerCase()));
    const isDateError = formik.status?.error && (
        formik.status.error.toLowerCase().includes('time') ||
        formik.status.error.toLowerCase().includes('date') ||
        formik.status.error.toLowerCase().includes('season') ||
        formik.status.error.toLowerCase().includes('round')
    );

    return (
        <div className="admin-container">
            <NavbarAdmin />
            <div className="config-wrapper">
                <div className="config-header">
                    <h1 className="config-title">Hackathon Event Configuration</h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>Define core parameters and regulatory frameworks for the upcoming season, or adjust timelines for an existing one.</p>
                </div>
                <div className="config-card" style={{ marginBottom: '24px' }}>
                    <h3 className="card-title">Select Existing Contest to Edit</h3>
                    <div className="search-box">
                        <input type="text" style={{ width: '100%' }} placeholder="Search by contest name or season" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    {searchQuery && (
                        <div className="partner-table-container mt-4">
                            <table className="partner-table">
                                <thead>
                                    <tr><th>Contest Name</th><th>Season</th><th>Status</th><th>Action</th></tr>
                                </thead>
                                <tbody>
                                    {filteredContests.length > 0 ? (filteredContests.map(c => (
                                        <tr key={c.id} className={selectedContestId === c.id ? 'selected-row' : ''}>
                                            <td><div className="uni-name">{c.name}</div></td>
                                            <td><div className="uni-domain">{c.season} {c.year}</div></td>
                                            <td><span className="status-badge">{c.status || 'UPCOMING'}</span></td>
                                            <td>
                                                <button type="button" className={selectedContestId === c.id ? "delete-btn" : "edit-btn"} onClick={() => handleSelectContest(selectedContestId === c.id ? '' : c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: selectedContestId === c.id ? '#ef4444' : '#1e40af' }}>
                                                    {selectedContestId === c.id ? 'Deselect' : 'Select to Edit'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))) : (<tr><td colSpan="4" style={{ textAlign: 'center' }}>No contests found</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <FormikProvider value={formik}>
                    <Form onSubmit={formik.handleSubmit}>
                        <div className="config-grid">
                            <div>
                                <div className="config-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 className="card-title" style={{ marginBottom: 0 }}>Core Settings</h3>
                                        <Form.Select name="status" className="form-select w-auto" value={formik.values.status} onChange={formik.handleChange}>
                                            <option value="UPCOMING">UPCOMING</option><option value="ACTIVE">ACTIVE</option><option value="CLOSED">CLOSED</option>
                                        </Form.Select>
                                    </div>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Event Name</Form.Label>
                                        <Form.Control type="text" name="name" className="form-input" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.name && !!formik.errors.name} />
                                        <Form.Control.Feedback type="invalid">{formik.errors.name}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Theme</Form.Label>
                                        <Form.Control type="text" name="theme" className="form-input" value={formik.values.theme} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.theme && !!formik.errors.theme} />
                                        <Form.Control.Feedback type="invalid">{formik.errors.theme}</Form.Control.Feedback>
                                    </Form.Group>
                                    <div className="form-row mb-3" style={{ display: 'flex', gap: '16px', width: '100%' }}>
                                        <Form.Group style={{ flex: 1 }}>
                                            <Form.Label className="form-label">Term</Form.Label>
                                            <Form.Control type="text" className="form-input bg-light text-muted" value={formik.values.term} disabled />
                                        </Form.Group>
                                        <Form.Group style={{ flex: 1 }}>
                                            <Form.Label className="form-label">Year</Form.Label>
                                            <Form.Control type="number" name="year" className="form-input bg-light text-muted" value={formik.values.year} disabled />
                                            <Form.Control.Feedback type="invalid">{formik.errors.year}</Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <div className="form-row mb-3" style={{ display: 'block', width: '100%' }}>
                                        <Form.Group>
                                            <Form.Label className="form-label">Registration Start</Form.Label>
                                            <Form.Control type="date" name="registrationStart" className="form-input" value={formik.values.registrationStart} onChange={handleRegistrationStartChange} onBlur={formik.handleBlur} min={todayStr} isInvalid={formik.touched.registrationStart && !!formik.errors.registrationStart} />
                                            <Form.Control.Feedback type="invalid">{formik.errors.registrationStart}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label className="form-label">Registration End</Form.Label>
                                            <Form.Control type="date" name="registrationEnd" className="form-input" value={formik.values.registrationEnd} onChange={formik.handleChange} onBlur={formik.handleBlur} min={formik.values.registrationStart || todayStr} disabled={!formik.values.registrationStart} isInvalid={formik.touched.registrationEnd && !!formik.errors.registrationEnd} />
                                            <Form.Control.Feedback type="invalid">{formik.errors.registrationEnd}</Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Region Scope</Form.Label>
                                        <Form.Select name="regionScope" className="form-select" value={formik.values.regionScope} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.regionScope && !!formik.errors.regionScope}>
                                            <option value="Ha Noi">Ha Noi</option><option value="Da Nang">Da Nang</option><option value="Ho Chi Minh">Ho Chi Minh</option><option value="Can Tho">Can Tho</option><option value="Quy Nhon">Quy Nhon</option>
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">{formik.errors.regionScope}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Maximum Allowed Teams</Form.Label>
                                        <Form.Control type="number" name="maximumAllowedTeams" className="form-input" value={formik.values.maximumAllowedTeams} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.maximumAllowedTeams && !!formik.errors.maximumAllowedTeams} />
                                        <Form.Control.Feedback type="invalid">{formik.errors.maximumAllowedTeams}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Participating Universities</Form.Label>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <Form.Select value={selectedUniToAdd} onChange={(e) => setSelectedUniToAdd(e.target.value)} className="form-select flex-grow-1">
                                                <option value="">-- Select a University --</option>
                                                {allUniversities.filter(u => !formik.values.universities.includes(u.name)).map(u => (<option key={u.id} value={u.name}>{u.name}</option>))}
                                            </Form.Select>
                                            <Button variant="secondary" onClick={() => {
                                                if (selectedUniToAdd && !formik.values.universities.includes(selectedUniToAdd)) {
                                                    formik.setFieldValue('universities', [...formik.values.universities, selectedUniToAdd]);
                                                    setSelectedUniToAdd('');
                                                }
                                            }}>Add</Button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {formik.values.universities.map(uni => (
                                                <span key={uni} style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                                                    {uni}
                                                    <button type="button" onClick={() => formik.setFieldValue('universities', formik.values.universities.filter(u => u !== uni))} style={{ background: 'none', border: 'none', color: '#1e40af', cursor: 'pointer', padding: '0 0 0 4px' }}>x</button>
                                                </span>
                                            ))}
                                        </div>
                                        {formik.touched.universities && typeof formik.errors.universities === 'string' && <div className="text-danger mt-1" style={{ fontSize: '14px' }}>{formik.errors.universities}</div>}
                                    </Form.Group>
                                </div>
                            </div>

                            <div>
                                <div className="config-card" style={{ marginBottom: '24px' }}>
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 className="card-title">Category Definition</h3>
                                        <Button type="button" variant="light" size="sm" onClick={() => formik.setFieldValue('categories', [...formik.values.categories, { id: -Date.now(), trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVE' }])}>+ Add Category</Button>
                                    </div>
                                    <FieldArray name="categories">
                                        {() => (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                {formik.values.categories.map((t, index) => (
                                                    <div key={t.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                                        {formik.values.categories.length > 1 && formik.values.status === 'UPCOMING' && (
                                                            <button type="button" onClick={() => formik.setFieldValue('categories', formik.values.categories.filter((_, i) => i !== index))} style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: 'none', border: 'none' }}>x</button>
                                                        )}
                                                        <Form.Group className="mb-3">
                                                            <Form.Label className="form-label">Category Name</Form.Label>
                                                            <Form.Control type="text" name={`categories[${index}].trackName`} className="form-input" value={t.trackName} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.categories?.[index]?.trackName && !!formik.errors.categories?.[index]?.trackName} />
                                                            <Form.Control.Feedback type="invalid">{formik.errors.categories?.[index]?.trackName}</Form.Control.Feedback>
                                                        </Form.Group>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label className="form-label">Description</Form.Label>
                                                            <Form.Control as="textarea" name={`categories[${index}].trackDescription`} className="form-textarea" value={t.trackDescription} onChange={formik.handleChange} />
                                                        </Form.Group>
                                                        <div className="row g-3 mb-3">
                                                            <Form.Group className="col-md-8 col-sm-10">
                                                                <Form.Label className="form-label">Guideline URL</Form.Label>
                                                                <Form.Control type="text" name={`categories[${index}].guidelineUrl`} className="form-input" value={t.guidelineUrl} onChange={formik.handleChange} />
                                                            </Form.Group>
                                                            <Form.Group className="col-md-4 col-sm-2">
                                                                <Form.Label className="form-label">Status</Form.Label>
                                                                <Form.Select name={`categories[${index}].status`} className="form-select" value={t.status} onChange={formik.handleChange}>
                                                                    <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="CLOSED">CLOSED</option>
                                                                </Form.Select>
                                                            </Form.Group>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </FieldArray>
                                    {typeof formik.errors.categories === 'string' && <div className="text-danger mt-3" style={{ fontSize: '14px' }}>{formik.errors.categories}</div>}
                                </div>
                                <div className="config-card" style={{ marginBottom: '24px' }}>
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 className="card-title">Rounds Sequence</h3>
                                        <Button type="button" variant="light" size="sm" onClick={() => formik.setFieldValue('rounds', [...formik.values.rounds, { id: -Date.now(), phaseName: `Phase ${formik.values.rounds.length + 1}`, categoryId: formik.values.categories[0]?.id || '', submissionOpen: '', submissionDeadline: '', state: 'UPCOMING' }])}>+ Add Round</Button>
                                    </div>
                                    <FieldArray name="rounds">
                                        {() => (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                {formik.values.rounds.map((round, index) => {
                                                    const roundTouched = formik.touched.rounds?.[index];
                                                    const roundErrors = formik.errors.rounds?.[index];
                                                    return (
                                                        <div key={round.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                                <Form.Control type="text" name={`rounds[${index}].phaseName`} className="phase-title-input w-50" value={round.phaseName} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={roundTouched?.phaseName && !!roundErrors?.phaseName} />
                                                                {index !== 0 && formik.values.status === 'UPCOMING' && (<button type="button" onClick={() => formik.setFieldValue('rounds', formik.values.rounds.filter((_, i) => i !== index))} style={{ color: '#ef4444', background: 'none', border: 'none' }}>x</button>)}
                                                            </div>
                                                            {roundTouched?.phaseName && roundErrors?.phaseName && <div className="text-danger mb-2" style={{ fontSize: '12px' }}>{roundErrors.phaseName}</div>}

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                                                <Form.Group>
                                                                    <Form.Label style={{ fontSize: '12px' }}>Category</Form.Label>
                                                                    <Form.Select name={`rounds[${index}].categoryId`} className="form-select" value={round.categoryId} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={roundTouched?.categoryId && !!roundErrors?.categoryId}>
                                                                        <option value="">-- Select Category --</option>
                                                                        {formik.values.categories.map(c => {
                                                                            const isSelectedByOther = formik.values.rounds.some((r, rIdx) => rIdx !== index && String(r.categoryId) === String(c.id));
                                                                            return (<option key={c.id} value={c.id} disabled={isSelectedByOther}>{c.trackName || 'Unnamed Category'}</option>);
                                                                        })}
                                                                    </Form.Select>
                                                                    {roundTouched?.categoryId && roundErrors?.categoryId && <div className="text-danger mt-1" style={{ fontSize: '12px' }}>{roundErrors.categoryId}</div>}
                                                                </Form.Group>
                                                                <Form.Group>
                                                                    <Form.Label style={{ fontSize: '12px' }}>Status</Form.Label>
                                                                    <Form.Select name={`rounds[${index}].state`} className="form-select" value={round.state} onChange={formik.handleChange}>
                                                                        <option value="UPCOMING">UPCOMING</option><option value="ACTIVE">ACTIVE</option><option value="CLOSED">CLOSED</option>
                                                                    </Form.Select>
                                                                </Form.Group>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                                <Form.Group>
                                                                    <Form.Label style={{ fontSize: '12px' }}>Submission Open</Form.Label>
                                                                    <Form.Control type="datetime-local" name={`rounds[${index}].submissionOpen`} className="form-input" value={round.submissionOpen} onChange={formik.handleChange} onBlur={formik.handleBlur} min={bounds.min} max={bounds.max} isInvalid={roundTouched?.submissionOpen && !!roundErrors?.submissionOpen} />
                                                                    {roundTouched?.submissionOpen && roundErrors?.submissionOpen && <div className="text-danger mt-1" style={{ fontSize: '12px' }}>{roundErrors.submissionOpen}</div>}
                                                                </Form.Group>
                                                                <Form.Group>
                                                                    <Form.Label style={{ fontSize: '12px' }}>Submission Deadline</Form.Label>
                                                                    <Form.Control type="datetime-local" name={`rounds[${index}].submissionDeadline`} className="form-input" value={round.submissionDeadline} onChange={formik.handleChange} onBlur={formik.handleBlur} min={round.submissionOpen || bounds.min} max={bounds.max} disabled={!round.submissionOpen} isInvalid={roundTouched?.submissionDeadline && !!roundErrors?.submissionDeadline} />
                                                                    {roundTouched?.submissionDeadline && roundErrors?.submissionDeadline && <div className="text-danger mt-1" style={{ fontSize: '12px' }}>{roundErrors.submissionDeadline}</div>}
                                                                </Form.Group>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </FieldArray>
                                    {formik.status?.error && isDateError && (
                                        <div className="alert-error" style={{ marginTop: '16px', padding: '10px 16px', borderRadius: '6px', fontSize: '13px', background: '#fee2e2', color: '#991b1b' }}>
                                            {formik.status.error}
                                        </div>
                                    )}
                                    {typeof formik.errors.rounds === 'string' && <div className="text-danger mt-3" style={{ fontSize: '14px' }}>{formik.errors.rounds}</div>}
                                </div>
                                <div className="config-card">
                                    <Form.Group className="mb-3">
                                        <div className="section-label">Compliance Rules</div>
                                        <Form.Control as="textarea" name="complianceRules" className="form-textarea" value={formik.values.complianceRules} onChange={formik.handleChange} />
                                    </Form.Group>
                                    <Form.Group>
                                        <div className="section-label">Tiered Prize Structures</div>
                                        <Form.Control as="textarea" name="tieredPrizeStructures" className="form-textarea" value={formik.values.tieredPrizeStructures} onChange={formik.handleChange} />
                                    </Form.Group>
                                </div>
                            </div>
                        </div>
                        <div className="action-bar-container" style={{ marginTop: '24px' }}>
                            <div className="action-bar" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                                {formik.status?.error && !isDateError ? (
                                    <div className="alert-error" style={{ margin: 0, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: '#fee2e2', color: '#991b1b' }}>
                                        {formik.status.error}</div>
                                ) : formik.status?.success ? (
                                    <div className="alert-success" style={{ margin: 0, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: '#dcfce7', color: '#166534' }}>
                                        {formik.status.success}
                                    </div>) : null}
                                <Button type="submit" className="submit-btn" disabled={formik.isSubmitting} style={{ margin: 0 }}>
                                    {formik.isSubmitting ? 'Saving...' : selectedContestId ? 'Save Configuration' : 'Initialize Season Hackathon'}
                                </Button>
                            </div>
                        </div>
                    </Form>
                </FormikProvider>
            </div>
        </div>
    );
};

export default HackathonConfig;
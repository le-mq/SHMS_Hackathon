import {useState, useEffect, useMemo} from 'react';
import {useFormik, FieldArray, FormikProvider} from 'formik';
import * as Yup from 'yup';
import {Form, Button} from 'react-bootstrap';
import './HackathonConfig.css';

const API_BASE = "http://localhost:8080/api/v1";

function HackathonConfig() {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [allUniversities, setAllUniversities] = useState([]);
    const [selectedUniToAdd, setSelectedUniToAdd] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [availableSubReqs, setAvailableSubReqs] = useState([
        {value: 'Source Code URL', label: 'Source Code / GitHub Repository'},
        {value: 'Live Demo URL', label: 'Live Demo / Video Link'},
        {value: 'Documentation URL', label: 'Project Documentation'},
        {value: 'Presentation Slide URL', label: 'Presentation Slides'}
    ]);
    const [availableRoundFormats, setAvailableRoundFormats] = useState([
        'On-site Submission', 'Remote Submission', 'In-booth Presentation', 'Stage Presentation'
    ]);
    const [customSubReqInput, setCustomSubReqInput] = useState({});
    const [customFormatInput, setCustomFormatInput] = useState({});
    const todayStr = new Date().toISOString().slice(0, 10);
    const determineStatus = (startDateStr, endDateStr) => {
        if (!startDateStr || !endDateStr) return 'UPCOMING';
        const now = new Date().getTime();
        const start = new Date(startDateStr).getTime();
        const end = new Date(endDateStr).getTime();
        if (now < start) return 'UPCOMING';
        if (now >= start && now <= end) return 'ACTIVED';
        return 'CLOSED';
    };

    const isClosedContest = useMemo(() => {
        const currentContest = contests.find(c => c.id === selectedContestId);
        if (!currentContest) return false;
        return determineStatus(currentContest.registrationStart, currentContest.contestEndAt) === 'CLOSED';
    }, [contests, selectedContestId]);

    const getSemesterBounds = (term, year) => {
        const currentYear = year || new Date().getFullYear();
        const baseDates = {
            SPRING: {startMonth: 1, endMonth: 4, endDay: 30, maxTime: '04-30T23:59'},
            SUMMER: {startMonth: 5, endMonth: 8, endDay: 31, maxTime: '08-31T23:59'},
            FALL: {startMonth: 9, endMonth: 12, endDay: 31, maxTime: '12-31T23:59'}
        };
        const config = baseDates[term] || baseDates.SPRING;
        const startIso = `${currentYear}-${String(config.startMonth).padStart(2, '0')}-01T00:00`;
        return {
            start: new Date(currentYear, config.startMonth - 1, 1, 0, 0, 0),
            end: new Date(currentYear, config.endMonth - 1, config.endDay, 23, 59, 59),
            min: startIso,
            max: `${currentYear}-${config.maxTime}`
        };
    };
    const getSemesterFromDate = (dateStr) => {
        const month = new Date(dateStr).getMonth() + 1;
        if (month >= 1 && month <= 4) return 'SPRING';
        if (month >= 5 && month <= 8) return 'SUMMER';
        return 'FALL';
    };

    const fetchData = async (url, mockKey) => {
        try {
            const res = await fetch(url, {headers: {Authorization: `Bearer ${localStorage.getItem('shms_token')}`}});
            if (res.ok) {
                const data = await res.json();
                if (Object.keys(data || {}).length > 0) return data;
            }
        } catch (e) {}
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
    const formik = useFormik({
        initialValues: {
            name: '', theme: '', term: 'Auto setup', year: new Date().getFullYear(), regionScope: 'Ha Noi',
            maximumAllowedTeams: 100, minTeamMembers: 3, maxTeamMembers: 5, registrationStart: '', registrationEnd: '', contestEndAt: '',
            complianceRules: [{rule: '', penalty: ''}], tieredPrizeStructures: [{rank: '', amount: ''}], status: 'UNSAVED',
            location: '', contestStartAt: '', publishedAt: '', universities: [],
            categories: [{id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'UNSAVED'}],
            rounds: [{id: -1, phaseName: 'Round 1', categoryId: -1, submissionOpen: '', submissionDeadline: '',
                gradingDeadlineAt: '', publishResultAt: '', state: 'UNSAVED',
                submissionRequirements: [], roundFormat: ''}]
        },
        validationSchema: Yup.object().shape({
            name: Yup.string().required('Event Name is required'),
            theme: Yup.string().required('Theme is required'),
            year: Yup.number().required('Year is required'),
            regionScope: Yup.string().required('Region Scope is required'),
            maximumAllowedTeams: Yup.number().min(1, 'Must be at least 1').required('Required'),
            minTeamMembers: Yup.number().min(1, 'Must be at least 1').required('Required').test('min-max-check', 'Min must be <= Max', function(val) {
                const max = this.parent.maxTeamMembers;
                if (!val || !max) return true;
                return val <= max;
            }),
            maxTeamMembers: Yup.number().min(1, 'Must be at least 1').required('Required').test('max-min-check', 'Max must be >= Min', function(val) {
                const min = this.parent.minTeamMembers;
                if (!val || !min) return true;
                return val >= min;
            }),
            location: Yup.string().required('Location is required'),
            contestStartAt: Yup.date().required('Contest Start Time is required').test('is-after-reg', 'Start time must be on or after Registration End', function(val) {
                const regEnd = this.parent.registrationEnd;
                if (!val || !regEnd) return true;
                const startOfDay = new Date(regEnd); startOfDay.setHours(0,0,0,0);
                return new Date(val) >= startOfDay;
            }),
            publishedAt: Yup.date().required('Publish Info Time is required'),
            registrationStart: Yup.date().required('Registration Start is required'),
            registrationEnd: Yup.date().required('Registration End is required').min(Yup.ref('registrationStart'), 'Must be after start date'),
            contestEndAt: Yup.date().required('Contest End Time is required').test('is-after-reg', 'Contest End Time must be after Registration End', function(val) {
                const regEnd = this.parent.registrationEnd;
                if (!val || !regEnd) return true;
                const endOfDayReg = new Date(regEnd); endOfDayReg.setHours(23, 59, 59, 999);
                return new Date(val) > endOfDayReg;
            }),
            universities: Yup.array().min(1, 'Add at least one university'),
            categories: Yup.array().of(Yup.object().shape({trackName: Yup.string().required('Category Name is required')})).min(1, 'Add at least one category'),
            rounds: Yup.array().of(
                Yup.object().shape({
                    phaseName: Yup.string().required('Phase Name is required'),
                    categoryId: Yup.string().required('Category is required').test('unique-category', 'Category already assigned to another round', function (val) {
                        if (!val) return true;
                        return this.from[1].value.rounds.filter(r => String(r.categoryId) === String(val)).length <= 1;
                    }),
                    submissionOpen: Yup.date().required('Open time is required')
                        .test('is-after-reg', 'Must be after Registration End', function(val) {
                            const regEnd = this.from[1].value.registrationEnd;
                            if (!val || !regEnd) return true;
                            const startOfDay = new Date(regEnd); startOfDay.setHours(0,0,0,0);
                            return new Date(val) > startOfDay;
                        })
                        .test('is-before-contest-end', 'Must be before Contest End Time', function(val) {
                            const contestEnd = this.from[1].value.contestEndAt;
                            return (!val || !contestEnd) || new Date(val) < new Date(contestEnd);
                        }),
                    submissionDeadline: Yup.date().required('Deadline is required')
                        .test('is-after-sub', 'Must be after Open time', function(val) {
                            return (!val || !this.parent.submissionOpen) || new Date(val) > new Date(this.parent.submissionOpen);
                        })
                        .test('is-before-contest-end', 'Must be before Contest End Time', function(val) {
                            const contestEnd = this.from[1].value.contestEndAt;
                            return (!val || !contestEnd) || new Date(val) < new Date(contestEnd);
                        }),
                    gradingDeadlineAt: Yup.date().required('Grading Deadline is required')
                        .test('is-after-sub-dl', 'Must be after Submission Deadline', function(val) {
                            return (!val || !this.parent.submissionDeadline) || new Date(val) > new Date(this.parent.submissionDeadline);
                        })
                        .test('is-before-contest-end', 'Must be before Contest End Time', function(val) {
                            const contestEnd = this.from[1].value.contestEndAt;
                            return (!val || !contestEnd) || new Date(val) < new Date(contestEnd);
                        }),
                    publishResultAt: Yup.date().required('Publish Result time is required')
                        .test('is-after-grad-dl', 'Must be after Grading Deadline', function(val) {
                            return (!val || !this.parent.gradingDeadlineAt) || new Date(val) > new Date(this.parent.gradingDeadlineAt);
                        })
                        .test('is-before-contest-end', 'Must be before Contest End Time', function(val) {
                            const contestEnd = this.from[1].value.contestEndAt;
                            return (!val || !contestEnd) || new Date(val) < new Date(contestEnd);
                        })
                })
            ).min(1, 'Add at least one round')
        }),
        onSubmit: async (values, {setSubmitting, setStatus}) => {
            const computedContestStatus = determineStatus(values.registrationStart, values.contestEndAt);
            if (computedContestStatus === 'CLOSED') return setStatus({error: "Cannot modify or save a closed contest."}), setSubmitting(false);

            const bounds = getSemesterBounds(values.term, values.year);
            const startLimit = bounds.start.getTime();
            const endLimit = bounds.end.getTime();
            const outOfBound = values.rounds.find(r => {
                const d1 = r.submissionOpen ? new Date(r.submissionOpen).getTime() : null;
                const d2 = r.submissionDeadline ? new Date(r.submissionDeadline).getTime() : null;
                return (d1 && (d1 < startLimit || d1 > endLimit)) || (d2 && (d2 < startLimit || d2 > endLimit));
            });
            if (outOfBound) {
                setStatus({error: `Cannot save! ${outOfBound.phaseName} contains dates out of the ${values.term} ${values.year} season.`});
                setSubmitting(false);
                return;
            }
            for (let i = 1; i < values.rounds.length; i++) {
                const prevDeadline = values.rounds[i - 1].submissionDeadline ? new Date(values.rounds[i - 1].submissionDeadline).getTime() : 0;
                const currOpen = values.rounds[i].submissionOpen ? new Date(values.rounds[i].submissionOpen).getTime() : 0;
                if (currOpen && prevDeadline && currOpen <= prevDeadline) {
                    setStatus({error: `${values.rounds[i].phaseName} Open time must be after ${values.rounds[i - 1].phaseName} Deadline.`});
                    setSubmitting(false);
                    return;
                }
            }
            setIsLoading(true);
            setStatus({});
            try {
                const token = localStorage.getItem('shms_token');
                let currentContestId = selectedContestId;
                const response = await fetch(`${API_BASE}/admin/contests`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                    body: JSON.stringify({ ...values, id: currentContestId || null, status: computedContestStatus,
                        allowedCorporateDomains: values.universities.join(','),
                        complianceRules: JSON.stringify(values.complianceRules.filter(r => r.rule.trim() !== '')),
                        tieredPrizeStructures: JSON.stringify(values.tieredPrizeStructures.filter(p => p.rank.trim() !== '' || p.amount.trim() !== '')),
                        contestEndAt: (values.contestEndAt && values.contestEndAt.length === 16) ? values.contestEndAt + ':00' : (values.contestEndAt || null),
                        contestStartAt: (values.contestStartAt && values.contestStartAt.length === 16) ? values.contestStartAt + ':00' : (values.contestStartAt || null),
                        publishedAt: (values.publishedAt && values.publishedAt.length === 16) ? values.publishedAt + ':00' : (values.publishedAt || null)
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to create contest configuration');
                if (!currentContestId) currentContestId = data.contestId;
                setSelectedContestId(currentContestId);
                for (const category of values.categories) {
                    const categoryRounds = values.rounds.filter(r => String(r.categoryId) === String(category.id));
                    const trackRes = await fetch(`${API_BASE}/admin/contests/rounds-tracks`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                        body: JSON.stringify({
                            contestId: currentContestId,
                            categoryName: category.trackName,
                            trackDescription: category.trackDescription || 'No description',
                            guidelineUrl: category.guidelineUrl || '',
                            status: computedContestStatus,
                            rounds: categoryRounds.map((r, rIndex) => ({
                                id: String(r.id).startsWith('-') ? null : r.id,
                                phaseName: r.phaseName,
                                roundOrder: rIndex + 1,
                                submissionOpen: (r.submissionOpen && r.submissionOpen.length === 16) ? r.submissionOpen + ':00' : (r.submissionOpen || null),
                                submissionDeadline: (r.submissionDeadline && r.submissionDeadline.length === 16) ? r.submissionDeadline + ':00' : (r.submissionDeadline || null),
                                gradingDeadlineAt: (r.gradingDeadlineAt && r.gradingDeadlineAt.length === 16) ? r.gradingDeadlineAt + ':00' : (r.gradingDeadlineAt || null),
                                publishResultAt: (r.publishResultAt && r.publishResultAt.length === 16) ? r.publishResultAt + ':00' : (r.publishResultAt || null),
                                state: computedContestStatus === 'CLOSED' ? 'CLOSED' : determineStatus(r.submissionOpen, r.submissionDeadline),
                                submissionRequirements: Array.isArray(r.submissionRequirements) ? r.submissionRequirements.join(',') : r.submissionRequirements || '',
                                roundFormat: r.roundFormat || ''
                            }))
                        })
                    });
                    if (!trackRes.ok) {
                        const errData = await trackRes.json();
                        throw new Error(errData.error || `Failed to save rounds for category: ${category.trackName}`);
                    }
                }
                setStatus({success: selectedContestId ? 'Season Hackathon configuration saved successfully!' : 'Season Hackathon initialized successfully!'});
                fetchContests();
            } catch (err) {
                setStatus({error: err.message || 'Failed to connect to the server'});
            } finally {
                setIsLoading(false);
                setSubmitting(false);
            }
        }
    });

    useEffect(() => {
        if (!selectedContestId) return;
        const computedContestStatus = determineStatus(formik.values.registrationStart, formik.values.contestEndAt);
        if (formik.values.status !== computedContestStatus) {
            formik.setFieldValue('status', computedContestStatus);
        }
    }, [formik.values.registrationStart, formik.values.contestEndAt, selectedContestId]);

    useEffect(() => {
        if (!selectedContestId) return;
        formik.values.rounds.forEach((round, idx) => {
            const computedRoundState = determineStatus(round.submissionOpen, round.submissionDeadline);
            if (round.state !== computedRoundState) {
                formik.setFieldValue(`rounds[${idx}].state`, computedRoundState);
            }
        });
    }, [formik.values.rounds, selectedContestId]);

    useEffect(() => {
        if (formik.submitCount > 0 && !formik.isValid) {
            const firstErrorNode = document.querySelector('.is-invalid, .text-danger');
            if (firstErrorNode) {
                firstErrorNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [formik.submitCount, formik.isValid]);

    const handleSelectContest = async (id) => {
        formik.setStatus({});
        if (!id) {
            setSelectedContestId('');
            formik.resetForm();
            return;
        }
        setSelectedContestId(id);
        setIsLoading(true);
        try {
            const data = await fetchData(`${API_BASE}/admin/contests/${id}`);
            if (data) {
                const fetchedCategories = data.tracks?.length ? data.tracks.map((t, idx) => ({
                    id: t.id || -(idx + 1), trackName: t.categoryName || '', trackDescription: t.trackDescription || '',
                    guidelineUrl: t.guidelineUrl || '', status: t.status || 'ACTIVED'
                })) : [{id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVED'}];
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
                                        id: rId, phaseName: r.roundName || r.phaseName || '',
                                        categoryId: catId,
                                        submissionOpen: r.submissionOpen ? r.submissionOpen.slice(0, 16) : '',
                                        submissionDeadline: r.submissionDeadline ? r.submissionDeadline.slice(0, 16) : '',
                                        gradingDeadlineAt: r.gradingDeadlineAt ? r.gradingDeadlineAt.slice(0, 16) : '',
                                        publishResultAt: r.publishResultAt ? r.publishResultAt.slice(0, 16) : '',
                                        state: r.status || r.state || 'UPCOMING',
                                        submissionRequirements: r.submissionRequirements ? r.submissionRequirements.split(',') : [],
                                        roundFormat: r.roundFormat || ''
                                    });
                                    if (r.submissionRequirements) {
                                        const rReqs = r.submissionRequirements.split(',');
                                        setAvailableSubReqs(prev => {
                                            const next = [...prev];
                                            let changed = false;
                                            rReqs.forEach(req => {
                                                if (!next.some(p => p.value === req)) {
                                                    next.push({value: req, label: req});
                                                    changed = true;
                                                }
                                            });
                                            return changed ? next : prev;
                                        });
                                    }
                                    if (r.roundFormat) {
                                        setAvailableRoundFormats(prev => {
                                            if (!prev.includes(r.roundFormat)) {
                                                return [...prev, r.roundFormat];
                                            }
                                            return prev;
                                        });
                                    }
                                }
                            });
                        }
                    });
                    fetchedRounds = Array.from(roundMap.values());
                }
                if (fetchedRounds.length === 0) {
                    fetchedRounds = fetchedCategories.map((cat, idx) => ({
                        id: -(idx + 1), phaseName: `Round ${idx + 1}`,
                        categoryId: cat.id, submissionOpen: '', submissionDeadline: '',
                        gradingDeadlineAt: '', publishResultAt: '', state: 'UPCOMING',
                        submissionRequirements: [], roundFormat: ''
                    }));
                }
                formik.setValues({
                    name: data.name || '', theme: data.theme || '',
                    term: data.term || 'Auto setup', year: data.year || new Date().getFullYear(),
                    regionScope: data.regionScope || 'Ha Noi', maximumAllowedTeams: data.maximumAllowedTeams || 100,
                    minTeamMembers: data.minTeamMembers || 3, maxTeamMembers: data.maxTeamMembers || 5,
                    registrationStart: data.registrationStart ? data.registrationStart.slice(0, 10) : '',
                    registrationEnd: data.registrationEnd ? data.registrationEnd.slice(0, 10) : '',
                    contestEndAt: data.contestEndAt ? data.contestEndAt.slice(0, 16) : '',
                    complianceRules: data.complianceRules ? (() => { try { return JSON.parse(data.complianceRules); } catch(e) { return [{rule: '', penalty: ''}]; } })() : [{rule: '', penalty: ''}],
                    tieredPrizeStructures: data.tieredPrizeStructures ? (() => { try { return JSON.parse(data.tieredPrizeStructures); } catch(e) { return [{rank: '', amount: ''}]; } })() : [{rank: '', amount: ''}],
                    location: data.location || '',
                    contestStartAt: data.contestStartAt ? data.contestStartAt.slice(0, 16) : '',
                    publishedAt: data.publishedAt ? data.publishedAt.slice(0, 16) : '',
                    status: data.status || 'UPCOMING', universities: data.universities || [],
                    categories: fetchedCategories, rounds: fetchedRounds
                });
            } else {
                formik.setStatus({error: 'Failed to fetch contest details'});
            }
        } catch (err) {
            formik.setStatus({error: 'Failed to connect to the server'});
        } finally {
            setIsLoading(false);
        }
    };

    const handleContestStartAtChange = (e) => {
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
            <div className="config-wrapper">
                <div className="config-header">
                    <h1 className="config-title">Hackathon Event Configuration</h1>
                    <p style={{fontSize: '14px', color: '#6b7280'}}>Define core parameters and regulatory frameworks for the upcoming season, or adjust timelines for an existing one.</p>
                </div>
                <div className="config-card" style={{marginBottom: '24px'}}>
                    <h3 className="card-title">Select Existing Contest to Edit</h3>
                    <div className="search-box">
                        <input type="text" style={{width: '100%'}} placeholder="Search by contest name or season" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
                    </div>
                    {searchQuery && (
                        <div className="partner-table-container mt-4">
                            <table className="partner-table">
                                <thead>
                                <tr><th>Contest Name</th><th>Season</th><th>Status</th><th>Action</th></tr>
                                </thead>
                                <tbody>
                                {filteredContests.length > 0 ? (filteredContests.map(c => {
                                    const liveStatus = determineStatus(c.registrationStart, c.contestEndAt);
                                    return (
                                        <tr key={c.id} className={selectedContestId === c.id ? 'selected-row' : ''}>
                                            <td><div className="uni-name">{c.name}</div></td>
                                            <td><div className="uni-domain">{c.season} {c.year}</div></td>
                                            <td><span className="status-badge">{liveStatus}</span></td>
                                            <td><button type="button" className={selectedContestId === c.id ? "delete-btn" : "edit-btn"}
                                                        onClick={() => handleSelectContest(selectedContestId === c.id ? '' : c.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: selectedContestId === c.id ? '#ef4444' : '#1e40af' }}>
                                                {selectedContestId === c.id ? 'Deselect' : liveStatus === 'CLOSED' ? 'View details' : 'Select to Edit'}
                                            </button>
                                            </td>
                                        </tr>
                                    );
                                })) : (<tr><td colSpan="4" style={{textAlign: 'center'}}>No contests found</td></tr>)}
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
                                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                        <h3 className="card-title" style={{marginBottom: 0}}>Core Settings</h3>
                                        <div style={{ background: '#e5e7eb', color: '#4b5563', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>{formik.values.status}</div>
                                    </div>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Event Name <span style={{color: 'red'}}>*</span></Form.Label>
                                        <Form.Control type="text" name="name" className="form-input" value={formik.values.name} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.name && !!formik.errors.name} disabled={isClosedContest}/>
                                        <Form.Control.Feedback type="invalid">{formik.errors.name}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Theme <span style={{color: 'red'}}>*</span></Form.Label>
                                        <Form.Control type="text" name="theme" className="form-input" value={formik.values.theme} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.theme && !!formik.errors.theme} disabled={isClosedContest}/>
                                        <Form.Control.Feedback type="invalid">{formik.errors.theme}</Form.Control.Feedback>
                                    </Form.Group>
                                    <div className="form-row mb-3" style={{display: 'flex', gap: '16px', width: '100%'}}>
                                        <Form.Group style={{flex: 1}}>
                                            <Form.Label className="form-label">Term <span style={{color: 'red'}}>*</span></Form.Label>
                                            <Form.Control type="text" className="form-input bg-light text-muted" value={formik.values.term} disabled/>
                                        </Form.Group>
                                        <Form.Group style={{flex: 1}}>
                                            <Form.Label className="form-label">Year <span style={{color: 'red'}}>*</span></Form.Label>
                                            <Form.Control type="number" name="year" className="form-input bg-light text-muted" value={formik.values.year} disabled/>
                                            <Form.Control.Feedback type="invalid">{formik.errors.year}</Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <div className="form-row mb-3" style={{display: 'flex', flexDirection: 'column', gap: '16px', width: '100%'}}>
                                        <Form.Group>
                                            <Form.Label className="form-label">Registration Start <span style={{color: 'red'}}>*</span></Form.Label>
                                            <Form.Control type="date" name="registrationStart" className="form-input" value={formik.values.registrationStart} onChange={formik.handleChange} onBlur={formik.handleBlur} min={selectedContestId ? undefined : todayStr} isInvalid={formik.touched.registrationStart && !!formik.errors.registrationStart} disabled={isClosedContest}/>
                                            <Form.Control.Feedback type="invalid">{formik.errors.registrationStart}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label className="form-label">Registration End <span style={{color: 'red'}}>*</span></Form.Label>
                                            <Form.Control type="date" name="registrationEnd" className="form-input" value={formik.values.registrationEnd} onChange={formik.handleChange} onBlur={formik.handleBlur} min={formik.values.registrationStart || (selectedContestId ? undefined : todayStr)} disabled={!formik.values.registrationStart || isClosedContest} isInvalid={formik.touched.registrationEnd && !!formik.errors.registrationEnd}/>
                                            <Form.Control.Feedback type="invalid">{formik.errors.registrationEnd}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label className="form-label">Contest Start Time <span style={{color: 'red'}}>*</span></Form.Label>
                                            <Form.Control type="datetime-local" name="contestStartAt" className="form-input" value={formik.values.contestStartAt} onChange={handleContestStartAtChange} onBlur={formik.handleBlur} min={formik.values.registrationEnd ? `${formik.values.registrationEnd}T00:00` : ''} isInvalid={formik.touched.contestStartAt && !!formik.errors.contestStartAt} disabled={isClosedContest}/>
                                            <Form.Control.Feedback type="invalid">{formik.errors.contestStartAt}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label className="form-label">Contest End Time <span style={{color: 'red'}}>*</span></Form.Label>
                                            <Form.Control type="datetime-local" name="contestEndAt" className="form-input" value={formik.values.contestEndAt} onChange={formik.handleChange} onBlur={formik.handleBlur} min={formik.values.registrationEnd ? `${formik.values.registrationEnd}T00:00` : ''} isInvalid={formik.touched.contestEndAt && !!formik.errors.contestEndAt} disabled={isClosedContest}/>
                                            <Form.Control.Feedback type="invalid">{formik.errors.contestEndAt}</Form.Control.Feedback>
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Label className="form-label">Publish Info At <span style={{color: 'red'}}>*</span></Form.Label>
                                            <Form.Control type="datetime-local" name="publishedAt" className="form-input" value={formik.values.publishedAt} onChange={formik.handleChange} onBlur={formik.handleBlur} min={selectedContestId ? undefined : todayStr + 'T00:00'} isInvalid={formik.touched.publishedAt && !!formik.errors.publishedAt} disabled={isClosedContest}/>
                                            <Form.Control.Feedback type="invalid">{formik.errors.publishedAt}</Form.Control.Feedback>
                                        </Form.Group>
                                    </div>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Location <span style={{color: 'red'}}>*</span></Form.Label>
                                        <Form.Control type="text" name="location" className="form-input" placeholder="e.g. FPT University, Campus HCM" value={formik.values.location} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.location && !!formik.errors.location} disabled={isClosedContest}/>
                                        <Form.Control.Feedback type="invalid">{formik.errors.location}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Region Scope <span style={{color: 'red'}}>*</span></Form.Label>
                                        <Form.Select name="regionScope" className="form-select" value={formik.values.regionScope} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.regionScope && !!formik.errors.regionScope} disabled={isClosedContest}>
                                            <option value="Ha Noi">Ha Noi</option><option value="Da Nang">Da Nang</option><option value="Ho Chi Minh">Ho Chi Minh</option><option value="Can Tho">Can Tho</option><option value="Quy Nhon">Quy Nhon</option>
                                        </Form.Select>
                                        <Form.Control.Feedback type="invalid">{formik.errors.regionScope}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Maximum Allowed Teams <span style={{color: 'red'}}>*</span></Form.Label>
                                        <Form.Control type="number" name="maximumAllowedTeams" className="form-input" value={formik.values.maximumAllowedTeams} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.maximumAllowedTeams && !!formik.errors.maximumAllowedTeams} disabled={isClosedContest}/>
                                        <Form.Control.Feedback type="invalid">{formik.errors.maximumAllowedTeams}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Min Team Members <span style={{color: 'red'}}>*</span></Form.Label>
                                        <Form.Control type="number" name="minTeamMembers" className="form-input" value={formik.values.minTeamMembers} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.minTeamMembers && !!formik.errors.minTeamMembers} disabled={isClosedContest}/>
                                        <Form.Control.Feedback type="invalid">{formik.errors.minTeamMembers}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Max Team Members <span style={{color: 'red'}}>*</span></Form.Label>
                                        <Form.Control type="number" name="maxTeamMembers" className="form-input" value={formik.values.maxTeamMembers} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.maxTeamMembers && !!formik.errors.maxTeamMembers} disabled={isClosedContest}/>
                                        <Form.Control.Feedback type="invalid">{formik.errors.maxTeamMembers}</Form.Control.Feedback>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="form-label">Participating Universities <span style={{color: 'red'}}>*</span></Form.Label>
                                        <div style={{ display: isClosedContest ? 'none' : 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <Form.Select value={selectedUniToAdd} onChange={(e) => setSelectedUniToAdd(e.target.value)} className="form-select flex-grow-1">
                                                <option value="">-- Select a University --</option>
                                                {allUniversities.filter(u => !formik.values.universities.includes(u.name)).map(u => (
                                                    <option key={u.id} value={u.name}>{u.name}</option>))}
                                            </Form.Select>
                                            <Button variant="secondary" onClick={() => {
                                                if (selectedUniToAdd && !formik.values.universities.includes(selectedUniToAdd)) {
                                                    formik.setFieldValue('universities', [...formik.values.universities, selectedUniToAdd]);
                                                    setSelectedUniToAdd('');
                                                }
                                            }}>Add</Button>
                                        </div>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                                            {formik.values.universities.map(uni => (
                                                <span key={uni} style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>{uni}
                                                    {!isClosedContest && <button type="button" onClick={() => formik.setFieldValue('universities', formik.values.universities.filter(u => u !== uni))} style={{background: 'rgba(30, 64, 175, 0.1)', border: 'none', color: '#1e40af', cursor: 'pointer', padding: '2px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', fontSize: '10px' }} title="Remove">&#10005;</button>}
                                                </span>
                                            ))}
                                        </div>
                                        {formik.touched.universities && typeof formik.errors.universities === 'string' && <div className="text-danger mt-1" style={{fontSize: '14px'}}>{formik.errors.universities}</div>}
                                    </Form.Group>
                                </div>
                            </div>

                            <div>
                                <div className="config-card" style={{marginBottom: '24px'}}>
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 className="card-title">Category Definition</h3>
                                        {!isClosedContest && <Button type="button" variant="light" size="sm" onClick={() => formik.setFieldValue('categories', [...formik.values.categories, { id: -Date.now(), trackName: '', trackDescription: '', guidelineUrl: '', status: selectedContestId ? 'ACTIVED' : 'UNSAVED' }])}>
                                            <svg style={{marginBottom: '3px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg> Add Category
                                        </Button>}
                                    </div>
                                    <FieldArray name="categories">
                                        {() => (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                                                {formik.values.categories.map((t, index) => (
                                                    <div key={t.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                                        {formik.values.categories.length > 1 && !isClosedContest && (
                                                            <button type="button" onClick={() => formik.setFieldValue('categories', formik.values.categories.filter((_, i) => i !== index))} style={{ position: 'absolute', top: '16px', right: '16px', color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', fontSize: '12px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'} onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'} title="Delete Category">&#10005;</button>
                                                        )}
                                                        <Form.Group className="mb-3">
                                                            <Form.Label className="form-label">Category Name <span style={{color: 'red'}}>*</span></Form.Label>
                                                            <Form.Control type="text" name={`categories[${index}].trackName`} className="form-input" value={t.trackName} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={formik.touched.categories?.[index]?.trackName && !!formik.errors.categories?.[index]?.trackName} disabled={isClosedContest}/>
                                                            <Form.Control.Feedback type="invalid">{formik.errors.categories?.[index]?.trackName}</Form.Control.Feedback>
                                                        </Form.Group>
                                                        <Form.Group className="mb-3">
                                                            <Form.Label className="form-label">Description</Form.Label>
                                                            <Form.Control as="textarea" name={`categories[${index}].trackDescription`} className="form-textarea" value={t.trackDescription} onChange={formik.handleChange} disabled={isClosedContest}/>
                                                        </Form.Group>
                                                        <div className="row g-3 mb-3">
                                                            <Form.Group className="col-md-8 col-sm-10">
                                                                <Form.Label className="form-label">Guideline URL</Form.Label>
                                                                <Form.Control type="text" name={`categories[${index}].guidelineUrl`} className="form-input" value={t.guidelineUrl} onChange={formik.handleChange} disabled={isClosedContest}/>
                                                            </Form.Group>
                                                            <Form.Group className="col-md-4 col-sm-2">
                                                                <Form.Label className="form-label">Status</Form.Label>
                                                                <div style={{ background: '#e5e7eb', color: '#4b5563', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>{t.status}</div>
                                                            </Form.Group>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </FieldArray>
                                    {typeof formik.errors.categories === 'string' && <div className="text-danger mt-3" style={{fontSize: '14px'}}>{formik.errors.categories}</div>}
                                </div>
                                <div className="config-card" style={{marginBottom: '24px'}}>
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <h3 className="card-title">Rounds Sequence</h3>
                                        {!isClosedContest && <Button type="button" variant="light" size="sm" onClick={() => formik.setFieldValue('rounds', [...formik.values.rounds, { id: -Date.now(), phaseName: `Round ${formik.values.rounds.length + 1}`, categoryId: formik.values.categories[formik.values.categories.length - 1]?.id || '', submissionOpen: '', submissionDeadline: '', gradingDeadlineAt: '', publishResultAt: '', state: selectedContestId ? 'UPCOMING' : 'UNSAVED', submissionRequirements: '', roundFormat: '' }])}>
                                            <svg style={{marginBottom: '3px'}} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg> Add Round
                                        </Button>}
                                    </div>
                                    <FieldArray name="rounds">
                                        {() => (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                                {formik.values.rounds.map((round, index) => {
                                                    const roundTouched = formik.touched.rounds?.[index];
                                                    const roundErrors = formik.errors.rounds?.[index];
                                                    return (
                                                        <div key={round.id} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                                <Form.Control type="text" name={`rounds[${index}].phaseName`} className="phase-title-input w-50" value={round.phaseName} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={roundTouched?.phaseName && !!roundErrors?.phaseName} disabled={isClosedContest}/>
                                                                {index !== 0 && !isClosedContest && (
                                                                    <button type="button" onClick={() => formik.setFieldValue('rounds', formik.values.rounds.filter((_, i) => i !== index))} style={{ color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', fontSize: '12px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'} onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'} title="Delete Round">&#10005;</button>)}
                                                            </div>
                                                            {roundTouched?.phaseName && roundErrors?.phaseName && <div className="text-danger mb-2" style={{fontSize: '12px'}}>{roundErrors.phaseName}</div>}

                                                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px'}}>
                                                                <Form.Group>
                                                                    <Form.Label style={{fontSize: '12px'}}>Category</Form.Label>
                                                                    <Form.Select name={`rounds[${index}].categoryId`} className="form-select" value={round.categoryId} onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={roundTouched?.categoryId && !!roundErrors?.categoryId} disabled={isClosedContest}>
                                                                        <option value="">-- Select Category --</option>
                                                                        {formik.values.categories.map(c => {
                                                                            const isSelectedByOther = formik.values.rounds.some((r, rIdx) => rIdx !== index && String(r.categoryId) === String(c.id));
                                                                            return (<option key={c.id} value={c.id} disabled={isSelectedByOther}>{c.trackName || 'Unnamed Category'}</option>);
                                                                        })}
                                                                    </Form.Select>
                                                                    {roundTouched?.categoryId && roundErrors?.categoryId && <div className="text-danger mt-1" style={{fontSize: '12px'}}>{roundErrors.categoryId}</div>}
                                                                </Form.Group>
                                                                <Form.Group>
                                                                    <Form.Label style={{fontSize: '12px'}}>Status</Form.Label>
                                                                    <div style={{ background: '#e5e7eb', color: '#4b5563', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>{round.state}</div>
                                                                </Form.Group>
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                                <Form.Group>
                                                                    <Form.Label style={{fontSize: '12px'}}>Submission Open <span style={{color: 'red'}}>*</span></Form.Label>
                                                                    <Form.Control type="datetime-local" name={`rounds[${index}].submissionOpen`} className="form-input" value={round.submissionOpen} onChange={formik.handleChange} onBlur={formik.handleBlur} min={formik.values.registrationEnd ? `${formik.values.registrationEnd}T00:00` : bounds.min} max={formik.values.contestEndAt || bounds.max} isInvalid={roundTouched?.submissionOpen && !!roundErrors?.submissionOpen} disabled={isClosedContest}/>
                                                                    {roundTouched?.submissionOpen && roundErrors?.submissionOpen && <div className="text-danger mt-1" style={{fontSize: '12px'}}>{roundErrors.submissionOpen}</div>}
                                                                </Form.Group>
                                                                <Form.Group>
                                                                    <Form.Label style={{fontSize: '12px'}}>Submission Deadline <span style={{color: 'red'}}>*</span></Form.Label>
                                                                    <Form.Control type="datetime-local" name={`rounds[${index}].submissionDeadline`} className="form-input" value={round.submissionDeadline} onChange={formik.handleChange} onBlur={formik.handleBlur} min={round.submissionOpen || bounds.min} max={formik.values.contestEndAt || bounds.max} disabled={!round.submissionOpen || isClosedContest} isInvalid={roundTouched?.submissionDeadline && !!roundErrors?.submissionDeadline}/>
                                                                    {roundTouched?.submissionDeadline && roundErrors?.submissionDeadline && <div className="text-danger mt-1" style={{fontSize: '12px'}}>{roundErrors.submissionDeadline}</div>}
                                                                </Form.Group>
                                                            </div>
                                                            <div className="form-group mt-3">
                                                                <Form.Label style={{fontSize: '12px'}}>Grading Deadline <span style={{color: 'red'}}>*</span></Form.Label>
                                                                <Form.Control type="datetime-local" name={`rounds[${index}].gradingDeadlineAt`} className="form-input" value={round.gradingDeadlineAt} onChange={formik.handleChange} onBlur={formik.handleBlur} min={round.submissionDeadline || bounds.min} max={formik.values.contestEndAt || bounds.max} isInvalid={roundTouched?.gradingDeadlineAt && !!roundErrors?.gradingDeadlineAt} disabled={!round.submissionDeadline || isClosedContest}/>
                                                                {roundTouched?.gradingDeadlineAt && roundErrors?.gradingDeadlineAt && <div className="text-danger mt-1" style={{fontSize: '12px'}}>{roundErrors.gradingDeadlineAt}</div>}
                                                            </div>
                                                            <div className="form-group mt-3">
                                                                <Form.Label style={{fontSize: '12px'}}>Publish Result At <span style={{color: 'red'}}>*</span></Form.Label>
                                                                <Form.Control type="datetime-local" name={`rounds[${index}].publishResultAt`} className="form-input" value={round.publishResultAt} onChange={formik.handleChange} onBlur={formik.handleBlur} min={round.gradingDeadlineAt || bounds.min} max={formik.values.contestEndAt || bounds.max} isInvalid={roundTouched?.publishResultAt && !!roundErrors?.publishResultAt} disabled={!round.gradingDeadlineAt || isClosedContest}/>
                                                                {roundTouched?.publishResultAt && roundErrors?.publishResultAt && <div className="text-danger mt-1" style={{fontSize: '12px'}}>{roundErrors.publishResultAt}</div>}
                                                            </div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                                                                <Form.Group>
                                                                    <Form.Label style={{fontSize: '12px'}}>Round Format</Form.Label>
                                                                    {!isClosedContest && (
                                                                        <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                                                                            <Form.Control type="text" placeholder="Custom format..." value={customFormatInput[index] || ''} onChange={(e) => setCustomFormatInput({...customFormatInput, [index]: e.target.value})} style={{fontSize: '12px'}}/>
                                                                            <Button variant="secondary" size="sm" onClick={() => {
                                                                                const val = customFormatInput[index]?.trim();
                                                                                if (val && !availableRoundFormats.includes(val)) {
                                                                                    setAvailableRoundFormats([...availableRoundFormats, val]);
                                                                                    formik.setFieldValue(`rounds[${index}].roundFormat`, val);
                                                                                }
                                                                                setCustomFormatInput({...customFormatInput, [index]: ''});
                                                                            }}>Add</Button>
                                                                        </div>
                                                                    )}
                                                                    <Form.Select name={`rounds[${index}].roundFormat`} className="form-select" value={round.roundFormat || ''} onChange={formik.handleChange} disabled={isClosedContest}>
                                                                        <option value="">-- Select Format --</option>
                                                                        {availableRoundFormats.map((fmt, i) => (
                                                                            <option key={i} value={fmt}>{fmt}</option>
                                                                        ))}
                                                                    </Form.Select>
                                                                </Form.Group>
                                                                <Form.Group>
                                                                    <Form.Label style={{fontSize: '12px'}}>Submission Requirements</Form.Label>
                                                                    {!isClosedContest && (
                                                                        <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                                                                            <Form.Control type="text" placeholder="New requirement..." value={customSubReqInput[index] || ''} onChange={(e) => setCustomSubReqInput({...customSubReqInput, [index]: e.target.value})} style={{fontSize: '12px'}}/>
                                                                            <Button variant="secondary" size="sm" onClick={() => {
                                                                                const val = customSubReqInput[index]?.trim();
                                                                                if (val && !availableSubReqs.some(r => r.value === val)) {
                                                                                    setAvailableSubReqs([...availableSubReqs, {value: val, label: val}]);
                                                                                }
                                                                                setCustomSubReqInput({...customSubReqInput, [index]: ''});
                                                                            }}>Add</Button>
                                                                        </div>
                                                                    )}
                                                                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                                                        {availableSubReqs.map(req => (
                                                                            <Form.Check
                                                                                key={req.value} type="checkbox" label={req.label}
                                                                                name={`rounds[${index}].submissionRequirements`}
                                                                                value={req.value}
                                                                                checked={Array.isArray(round.submissionRequirements) && round.submissionRequirements.includes(req.value)}
                                                                                onChange={formik.handleChange}
                                                                                disabled={isClosedContest}
                                                                                style={{fontSize: '13px'}}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </Form.Group>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </FieldArray>

                                    {typeof formik.errors.rounds === 'string' && <div className="text-danger mt-3" style={{fontSize: '14px'}}>{formik.errors.rounds}</div>}
                                </div>
                                <div className="config-card">
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <div className="section-label" style={{marginBottom: 0}}>Compliance Rules</div>
                                        {!isClosedContest && <Button type="button" variant="light" size="sm" onClick={() => formik.setFieldValue('complianceRules', [...formik.values.complianceRules, {rule: '', penalty: ''}])}>
                                            + Add Rule
                                        </Button>}
                                    </div>
                                    <FieldArray name="complianceRules">
                                        {() => (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                                {formik.values.complianceRules.map((item, idx) => (
                                                    <div key={idx} style={{display: 'flex', gap: '8px'}}>
                                                        <Form.Control type="text" name={`complianceRules[${idx}].rule`} className="form-input" value={item.rule} onChange={formik.handleChange} disabled={isClosedContest} placeholder={`Rule Description ${idx + 1}`}/>
                                                        <Form.Control type="text" name={`complianceRules[${idx}].penalty`} className="form-input" value={item.penalty} onChange={formik.handleChange} disabled={isClosedContest} placeholder={`Default Penalty (Optional)`}/>
                                                        {formik.values.complianceRules.length > 1 && !isClosedContest && (
                                                            <button type="button" onClick={() => formik.setFieldValue('complianceRules', formik.values.complianceRules.filter((_, i) => i !== idx))} style={{ color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', fontSize: '12px', flexShrink: 0, marginTop: '5px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'} onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'} title="Delete Rule">&#10005;</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </FieldArray>
                                </div>
                                <div className="config-card">
                                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <div className="section-label" style={{marginBottom: 0}}>Tiered Prize Structures</div>
                                        {!isClosedContest && <Button type="button" variant="light" size="sm" onClick={() => formik.setFieldValue('tieredPrizeStructures', [...formik.values.tieredPrizeStructures, {rank: '', amount: ''}])}>
                                            + Add Prize Tier
                                        </Button>}
                                    </div>
                                    <FieldArray name="tieredPrizeStructures">
                                        {() => (
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                                                {formik.values.tieredPrizeStructures.map((prize, idx) => (
                                                    <div key={idx} style={{display: 'flex', gap: '8px'}}>
                                                        <Form.Control type="text" name={`tieredPrizeStructures[${idx}].rank`} className="form-input" value={prize.rank} onChange={formik.handleChange} disabled={isClosedContest} placeholder="e.g. First Prize"/>
                                                        <Form.Control type="text" name={`tieredPrizeStructures[${idx}].amount`} className="form-input" value={prize.amount} onChange={formik.handleChange} disabled={isClosedContest} placeholder="e.g. $5000"/>
                                                        {formik.values.tieredPrizeStructures.length > 1 && !isClosedContest && (
                                                            <button type="button" onClick={() => formik.setFieldValue('tieredPrizeStructures', formik.values.tieredPrizeStructures.filter((_, i) => i !== idx))} style={{ color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', fontSize: '12px', flexShrink: 0, marginTop: '5px' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'} onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'} title="Delete Prize Tier">&#10005;</button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </FieldArray>
                                </div>
                            </div>
                        </div>
                        <div className="action-bar-container" style={{marginTop: '24px'}}>
                            <div className="action-bar" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                                {formik.status?.error ? (
                                    <div className="alert-error" style={{ margin: 0, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: '#fee2e2', color: '#991b1b' }}>{formik.status.error}</div>
                                ) : !formik.isValid && formik.submitCount > 0 ? (
                                    <div className="alert-error" style={{ margin: 0, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: '#fee2e2', color: '#991b1b' }}>Please fix the highlighted validation errors above.</div>
                                ) : formik.status?.success ? (
                                    <div className="alert-success" style={{ margin: 0, padding: '8px 16px', borderRadius: '6px', fontSize: '13px', background: '#dcfce7', color: '#166534' }}>{formik.status.success}</div>
                                ) : null}

                                {!isClosedContest && (
                                    <Button type="submit" className="submit-btn" disabled={formik.isSubmitting} style={{margin: 0}}>{formik.isSubmitting ? 'Saving...' : selectedContestId ? 'Save Configuration' : 'Initialize Season Hackathon'}</Button>
                                )}
                                {isClosedContest && (
                                    <div style={{ color: '#6b7280', fontSize: '14px', fontStyle: 'italic', fontWeight: '500' }}>This past contest has been closed and cannot be modified.</div>
                                )}
                            </div>
                        </div>
                    </Form>
                </FormikProvider>
            </div>
        </div>
    );
}

export default HackathonConfig;
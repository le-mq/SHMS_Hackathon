import { useState, useEffect, useMemo } from 'react';
import { useFormik, FormikProvider } from 'formik';
import * as Yup from 'yup';
import { Form } from 'react-bootstrap';
import './HackathonConfig.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
const todayStr = (() => { const d = new Date(); const pad = n => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();

const RemoveButton = ({ onClick, title }) => (
    <button type="button" onClick={(e) => {
        if (window.confirm('Are you sure you want to remove this item?')) {
            onClick(e);
        }
    }} title={title} className="hc-remove-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
    </button>
);

const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const pad = (n) => String(n).padStart(2, '0');
    let hh = d.getHours();
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(hh)}:${pad(d.getMinutes())} ${ampm}`;
};

const toLocalISOString = (d) => {
    const pad = n => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function HackathonConfig() {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [allUniversities, setAllUniversities] = useState([]);
    const [selectedUniToAdd, setSelectedUniToAdd] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [deletedCategories, setDeletedCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('core');
    const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
    const [suggestions, setSuggestions] = useState({});
    const [originalDates, setOriginalDates] = useState({});
    const [shiftBanner, setShiftBanner] = useState(null);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    const [availableSubReqs, setAvailableSubReqs] = useState([
        { value: 'Source Code URL', label: 'Source Code / GitHub Repository' },
        { value: 'Live Demo URL', label: 'Live Demo / Video Link' },
        { value: 'Documentation URL', label: 'Project Documentation' },
        { value: 'Presentation Slide URL', label: 'Presentation Slides' }
    ]);
    const [availableRoundFormats, setAvailableRoundFormats] = useState([
        'On-site Submission', 'Remote Submission', 'In-booth Presentation', 'Stage Presentation'
    ]);
    const [customSubReqInput, setCustomSubReqInput] = useState({});
    const [customFormatInput, setCustomFormatInput] = useState({});

    // Close search dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.hc-search-wrap')) {
                setShowSearchDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const determineStatus = (startDateStr, endDateStr) => {
        if (!startDateStr || !endDateStr) return 'UPCOMING';
        const now = Date.now();
        const start = new Date(startDateStr).getTime();
        const end = new Date(endDateStr).getTime();
        if (now < start) return 'UPCOMING';
        if (now >= start && now <= end) return 'ACTIVED';
        return 'CLOSED';
    };

    const isClosedContest = useMemo(() => {
        const currentContest = contests.find(c => c.id === selectedContestId);
        return currentContest ? determineStatus(currentContest.registrationStart, currentContest.contestEndAt) === 'CLOSED' : false;
    }, [contests, selectedContestId]);

    const getSemesterBounds = (term, year) => {
        const currentYear = year || new Date().getFullYear();
        const baseDates = {
            SPRING: { startMonth: 1, endMonth: 4, endDay: 30, maxTime: '04-30T23:59' },
            SUMMER: { startMonth: 5, endMonth: 8, endDay: 31, maxTime: '08-31T23:59' },
            FALL: { startMonth: 9, endMonth: 12, endDay: 31, maxTime: '12-31T23:59' }
        };
        const config = baseDates[term] || baseDates.SPRING;
        return {
            start: new Date(currentYear, config.startMonth - 1, 1).getTime(),
            end: new Date(currentYear, config.endMonth - 1, config.endDay, 23, 59, 59).getTime(),
            min: `${currentYear}-${String(config.startMonth).padStart(2, '0')}-01T00:00`,
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
            const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('shms_token')}` } });
            if (res.ok) {
                const data = await res.json();
                if (data && Object.keys(data).length > 0) return data;
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
        Promise.all([fetchContests(), fetchAllUniversities()]).finally(() => setInitialLoading(false));
    }, []);

    const formik = useFormik({
        initialValues: {
            name: '', theme: '', description: '', term: 'Auto setup', year: new Date().getFullYear(),
            maximumAllowedTeams: 100, minTeamMembers: 3, maxTeamMembers: 5, registrationStart: '', registrationEnd: '', contestEndAt: '',
            complianceRules: [{ rule: '', penalty: '' }], tieredPrizeStructures: [{ rank: '', amount: '' }], status: 'UNSAVED',
            location: '', contestStartAt: '', publishedAt: '', universities: [],
            categories: [{ id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'UNSAVED' }],
            rounds: [{ id: -1, phaseName: 'Round 1', categoryId: -1, submissionOpen: '', submissionDeadline: '', gradingDeadlineAt: '', reviewCalibrationAt: '', publishResultAt: '', state: 'UNSAVED', submissionRequirements: [], roundFormat: '' }]
        },
        validationSchema: Yup.object().shape({
            name: Yup.string().required('Event Name is required'),
            theme: Yup.string().required('Theme is required'),
            year: Yup.number().required('Year is required'),
            maximumAllowedTeams: Yup.number().min(1, 'Must be at least 1').required('Required'),
            minTeamMembers: Yup.number().min(1, 'Must be at least 1').required('Required').test('min-max', 'Min <= Max', function (val) { return !val || !this.parent.maxTeamMembers || val <= this.parent.maxTeamMembers; }),
            maxTeamMembers: Yup.number().min(1, 'Must be at least 1').required('Required').test('max-min', 'Max >= Min', function (val) { return !val || !this.parent.minTeamMembers || val >= this.parent.minTeamMembers; }),
            location: Yup.string().required('Location is required'),
            contestStartAt: Yup.date().required('Required').test('after-reg', 'Must be on or after Registration End', function (val) { if (!val || !this.parent.registrationEnd) return true; const d = new Date(this.parent.registrationEnd); d.setHours(0, 0, 0, 0); return new Date(val) >= d; }),
            publishedAt: Yup.date().required('Publish Info Time is required'),
            registrationStart: Yup.date().required('Registration Start is required'),
            registrationEnd: Yup.date().required('Registration End is required').min(Yup.ref('registrationStart'), 'Must be after start date'),
            contestEndAt: Yup.date().required('Required').test('after-reg-end', 'Must be after Registration End', function (val) { if (!val || !this.parent.registrationEnd) return true; const d = new Date(this.parent.registrationEnd); d.setHours(23, 59, 59, 999); return new Date(val) > d; }),
            universities: Yup.array().min(1, 'Add at least one university'),
            categories: Yup.array().of(Yup.object().shape({ trackName: Yup.string().required('Category Name is required'), guidelineUrl: Yup.string().url('Invalid URL format') })).min(1, 'Add at least one category'),
            rounds: Yup.array().of(Yup.object().shape({
                phaseName: Yup.string().required('Phase Name is required'),
                categoryId: Yup.string().required('Required').test('uniq-cat', 'Category unique error', function (val) { return !val || this.from[1].value.rounds.filter(r => String(r.categoryId) === String(val)).length <= 1; }),
                submissionOpen: Yup.date().required('Required').test('after-reg-end', 'Must be after Registration End', function (val) { if (!val || !this.from[1].value.registrationEnd) return true; const d = new Date(this.from[1].value.registrationEnd); d.setHours(0, 0, 0, 0); return new Date(val) > d; }).test('after-prev', 'Must be after previous round result', function (val) { if (!val) return true; const m = this.path.match(/rounds\[(\d+)\]/); if (m) { const idx = parseInt(m[1], 10); if (idx > 0) { const prev = this.from[1].value.rounds[idx - 1]; if (prev && prev.publishResultAt && new Date(val) <= new Date(prev.publishResultAt)) return false; } } return true; }).test('before-end', 'Must be before Contest End', function (val) { return !val || !this.from[1].value.contestEndAt || new Date(val) <= new Date(this.from[1].value.contestEndAt); }),
                submissionDeadline: Yup.date().required('Required').test('after-open', 'Must be after open', function (val) { return !val || !this.parent.submissionOpen || new Date(val) > new Date(this.parent.submissionOpen); }).test('before-end', 'Must be before Contest End', function (val) { return !val || !this.from[1].value.contestEndAt || new Date(val) <= new Date(this.from[1].value.contestEndAt); }),
                gradingDeadlineAt: Yup.date().required('Required').test('after-dl', 'Must be after submission deadline', function (val) { return !val || !this.parent.submissionDeadline || new Date(val) > new Date(this.parent.submissionDeadline); }).test('before-end', 'Must be before Contest End', function (val) { return !val || !this.from[1].value.contestEndAt || new Date(val) <= new Date(this.from[1].value.contestEndAt); }),
                reviewCalibrationAt: Yup.date().required('Required').test('after-grading', 'Must be after grading deadline', function (val) { return !val || !this.parent.gradingDeadlineAt || new Date(val) > new Date(this.parent.gradingDeadlineAt); }).test('before-end', 'Must be before Contest End', function (val) { return !val || !this.from[1].value.contestEndAt || new Date(val) <= new Date(this.from[1].value.contestEndAt); }),
                publishResultAt: Yup.date().required('Required').test('after-review', 'Must be after review time', function (val) { return !val || !this.parent.reviewCalibrationAt || new Date(val) > new Date(this.parent.reviewCalibrationAt); }).test('before-end', 'Must be before Contest End', function (val) { return !val || !this.from[1].value.contestEndAt || new Date(val) <= new Date(this.from[1].value.contestEndAt); }),
                roundFormat: Yup.string().required('Round Format is required'),
                submissionRequirements: Yup.array().min(1, 'Add at least one requirement')
            })).min(1, 'Add at least one round')
        }),
        onSubmit: async (values, { setSubmitting, setStatus }) => {
            const computedContestStatus = determineStatus(values.registrationStart, values.contestEndAt);
            if (computedContestStatus === 'CLOSED') return setStatus({ error: "Cannot modify or save a closed contest." }), setSubmitting(false);

            const boundsData = getSemesterBounds(values.term, values.year);
            const outOfBound = values.rounds.find(r => {
                const d1 = r.submissionOpen ? new Date(r.submissionOpen).getTime() : null;
                const d2 = r.submissionDeadline ? new Date(r.submissionDeadline).getTime() : null;
                return (d1 && (d1 < boundsData.start || d1 > boundsData.end)) || (d2 && (d2 < boundsData.start || d2 > boundsData.end));
            });
            if (outOfBound) return setStatus({ error: `Cannot save! ${outOfBound.phaseName} contains dates out of ${values.term} ${values.year} season.` }), setSubmitting(false);

            for (let i = 1; i < values.rounds.length; i++) {
                const prev = values.rounds[i - 1].submissionDeadline ? new Date(values.rounds[i - 1].submissionDeadline).getTime() : 0;
                const curr = values.rounds[i].submissionOpen ? new Date(values.rounds[i].submissionOpen).getTime() : 0;
                if (curr && prev && curr <= prev) return setStatus({ error: `${values.rounds[i].phaseName} Open time must be after ${values.rounds[i - 1].phaseName} Deadline.` }), setSubmitting(false);
            }

            setIsLoading(true); setStatus({});
            try {
                const token = localStorage.getItem('shms_token');
                let currentId = selectedContestId;
                const formatSec = (d) => d && d.length === 16 ? d + ':00' : d;

                const response = await fetch(`${API_BASE}/admin/contests`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        ...values, id: currentId || null, status: computedContestStatus,
                        allowedCorporateDomains: values.universities.join(','),
                        complianceRules: JSON.stringify(values.complianceRules.filter(r => r.rule.trim() !== '')),
                        tieredPrizeStructures: JSON.stringify(values.tieredPrizeStructures.filter(p => p.rank.trim() !== '' || p.amount.trim() !== '')),
                        contestEndAt: formatSec(values.contestEndAt), contestStartAt: formatSec(values.contestStartAt), publishedAt: formatSec(values.publishedAt)
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.errors ? data.errors.map(e => e.defaultMessage || e.field).join(', ') : (data.message || data.error || 'Submission failed'));
                if (!currentId) currentId = data.contestId;
                setSelectedContestId(currentId);

                for (const category of values.categories) {
                    const categoryRounds = values.rounds.filter(r => String(r.categoryId) === String(category.id));
                    const trackRes = await fetch(`${API_BASE}/admin/contests/rounds-tracks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            contestId: currentId, categoryName: category.trackName, trackDescription: category.trackDescription || 'No description', guidelineUrl: category.guidelineUrl || '', status: computedContestStatus,
                            rounds: categoryRounds.map((r, rIdx) => ({
                                id: String(r.id).startsWith('-') ? null : r.id, phaseName: r.phaseName, roundOrder: rIdx + 1,
                                submissionOpen: formatSec(r.submissionOpen), submissionDeadline: formatSec(r.submissionDeadline), gradingDeadlineAt: formatSec(r.gradingDeadlineAt), reviewCalibrationAt: formatSec(r.reviewCalibrationAt), publishResultAt: formatSec(r.publishResultAt),
                                state: (computedContestStatus === 'CLOSED' || (r.state === 'CLOSED' && !(r.publishResultAt && new Date(r.publishResultAt).getTime() > Date.now()))) ? 'CLOSED' : determineStatus(r.submissionOpen, r.publishResultAt),
                                submissionRequirements: Array.isArray(r.submissionRequirements) ? r.submissionRequirements.join(',') : r.submissionRequirements || '', roundFormat: r.roundFormat || ''
                            }))
                        })
                    });
                    if (!trackRes.ok) throw new Error((await trackRes.json()).error || `Failed to save ${category.trackName}`);
                }

                for (const delCat of deletedCategories) {
                    if (delCat.id > 0) await fetch(`${API_BASE}/admin/contests/tracks/${delCat.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                }
                setDeletedCategories([]);
                setStatus({ success: selectedContestId ? 'Configuration saved successfully!' : 'Season Hackathon initialized successfully!' });
                fetchContests();
            } catch (err) {
                setStatus({ error: err.message || 'Failed to connect to server' });
            } finally { setIsLoading(false); setSubmitting(false); }
        }
    });

    useEffect(() => {
        if (formik.status) {
            const timer = setTimeout(() => {
                formik.setStatus(undefined);
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [formik.status, formik.setStatus]);

    useEffect(() => {
        if (!selectedContestId) return;
        const computedContestStatus = determineStatus(formik.values.registrationStart, formik.values.contestEndAt);
        if (formik.values.status !== computedContestStatus) formik.setFieldValue('status', computedContestStatus);

        let categoriesUpdated = false;
        const newCategories = [...formik.values.categories];

        formik.values.rounds.forEach((round, idx) => {
            const isPublishInFuture = round.publishResultAt && new Date(round.publishResultAt).getTime() > Date.now();
            if (round.state === 'CLOSED' && !isPublishInFuture) return;
            const computedRoundState = determineStatus(round.submissionOpen, round.publishResultAt);
            if (round.state !== computedRoundState) formik.setFieldValue(`rounds[${idx}].state`, computedRoundState);
        });

        newCategories.forEach((category, idx) => {
            const categoryRounds = formik.values.rounds.filter(r => String(r.categoryId) === String(category.id));
            if (categoryRounds.length > 0) {
                const allClosed = categoryRounds.every(r => determineStatus(r.submissionOpen, r.publishResultAt) === 'CLOSED');
                const computedCategoryStatus = allClosed ? 'CLOSED' : 'ACTIVED';
                if (category.status !== computedCategoryStatus) { newCategories[idx].status = computedCategoryStatus; categoriesUpdated = true; }
            }
        });
        if (categoriesUpdated) formik.setFieldValue('categories', newCategories);
    }, [formik.values.rounds, formik.values.registrationStart, formik.values.contestEndAt, selectedContestId]);


    const handleSelectContest = async (id) => {
        formik.setStatus({}); setActiveTab('core'); setDeletedCategories([]); setActiveCategoryIdx(0);
        setShowSearchDropdown(false);
        if (!id) return setSelectedContestId(''), formik.resetForm();
        setSelectedContestId(id); setIsLoading(true);
        try {
            const data = await fetchData(`${API_BASE}/admin/contests/${id}`);
            if (!data) return formik.setStatus({ error: 'Failed to fetch contest details' });

            const fetchedCategories = data.tracks?.length ? data.tracks.map((t, idx) => ({
                id: t.id || -(idx + 1), trackName: t.categoryName || '', trackDescription: t.trackDescription || '', guidelineUrl: t.guidelineUrl || '', status: t.status || 'ACTIVED'
            })) : [{ id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVED' }];

            let fetchedRounds = [];
            if (data.tracks?.length) {
                const roundMap = new Map();
                data.tracks.forEach((t, tIdx) => {
                    const catId = t.id || fetchedCategories.find(c => c.trackName === t.categoryName)?.id || -(tIdx + 1);
                    t.rounds?.forEach((r) => {
                        const rId = r.roundId || r.id;
                        if (rId && !roundMap.has(String(rId))) {
                            const sliceDt = (dt) => dt ? dt.slice(0, 16) : '';
                            roundMap.set(String(rId), {
                                id: rId, phaseName: r.roundName || r.phaseName || '', categoryId: catId,
                                submissionOpen: sliceDt(r.submissionOpen), submissionDeadline: sliceDt(r.submissionDeadline), gradingDeadlineAt: sliceDt(r.gradingDeadlineAt), reviewCalibrationAt: sliceDt(r.reviewCalibrationAt), publishResultAt: sliceDt(r.publishResultAt),
                                state: r.status || r.state || 'UPCOMING', roundFormat: r.roundFormat || '', submissionRequirements: r.submissionRequirements ? r.submissionRequirements.split(',') : []
                            });
                            if (r.submissionRequirements) r.submissionRequirements.split(',').forEach(req => setAvailableSubReqs(p => p.some(x => x.value === req) ? p : [...p, { value: req, label: req }]));
                            if (r.roundFormat) setAvailableRoundFormats(p => p.includes(r.roundFormat) ? p : [...p, r.roundFormat]);
                        }
                    });
                });
                fetchedRounds = Array.from(roundMap.values());
            }

            if (fetchedRounds.length === 0) {
                fetchedRounds = fetchedCategories.map((cat, idx) => ({ id: -(idx + 1), phaseName: `Round ${idx + 1}`, categoryId: cat.id, submissionOpen: '', submissionDeadline: '', gradingDeadlineAt: '', reviewCalibrationAt: '', publishResultAt: '', state: 'UPCOMING', submissionRequirements: [], roundFormat: '' }));
            }

            const parseJsonList = (str, fallback) => { if (!str) return fallback; try { return JSON.parse(str); } catch { return fallback; } };
            formik.setValues({
                name: data.name || '', theme: data.theme || '', description: data.description || '', term: data.term || 'Auto setup', year: data.year || new Date().getFullYear(), maximumAllowedTeams: data.maximumAllowedTeams || 100, minTeamMembers: data.minTeamMembers || 3, maxTeamMembers: data.maxTeamMembers || 5, location: data.location || '', status: data.status || 'UPCOMING', universities: data.universities || [], categories: fetchedCategories, rounds: fetchedRounds,
                registrationStart: data.registrationStart ? data.registrationStart.slice(0, 10) : '', registrationEnd: data.registrationEnd ? data.registrationEnd.slice(0, 10) : '', contestEndAt: data.contestEndAt ? data.contestEndAt.slice(0, 16) : '', contestStartAt: data.contestStartAt ? data.contestStartAt.slice(0, 16) : '', publishedAt: data.publishedAt ? data.publishedAt.slice(0, 16) : '',
                complianceRules: parseJsonList(data.complianceRules, [{ rule: '', penalty: '' }]), tieredPrizeStructures: parseJsonList(data.tieredPrizeStructures, [{ rank: '', amount: '' }])
            });
        } catch (err) {
            formik.setStatus({ error: 'Failed to connect to the server' });
        } finally { setIsLoading(false); }
    };

    const handleContestStartAtChange = (e) => {
        formik.handleChange(e);
        if (e.target.value) {
            formik.setFieldValue('term', getSemesterFromDate(e.target.value));
            formik.setFieldValue('year', new Date(e.target.value).getFullYear());
        }
    };

    const handleFocusDate = (roundIdx, field) => {
        setOriginalDates(p => ({ ...p, [`${roundIdx}_${field}`]: formik.values.rounds[roundIdx]?.[field] }));
    };

    const handleSmartDateChange = (e, roundIdx) => {
        const { name, value } = e.target;
        const field = name.split('.').pop();
        const oldVal = originalDates[`${roundIdx}_${field}`] || formik.values.rounds[roundIdx]?.[field];
        formik.handleChange(e);
        if (!value) return;

        const shiftTime = (base, mins) => { const d = new Date(base); d.setMinutes(d.getMinutes() + mins); return toLocalISOString(d); };

        if (oldVal && value !== oldVal) {
            const delta = new Date(value) - new Date(oldVal);
            if (delta !== 0) {
                setShiftBanner({ roundIdx, delta, field, newVal: value });
            }
        } else {
            if (field === 'submissionDeadline' && !formik.values.rounds[roundIdx]?.gradingDeadlineAt) setSuggestions(p => ({ ...p, [`${roundIdx}_gradingDeadlineAt`]: shiftTime(value, 30) }));
            else if (field === 'gradingDeadlineAt' && !formik.values.rounds[roundIdx]?.reviewCalibrationAt) setSuggestions(p => ({ ...p, [`${roundIdx}_reviewCalibrationAt`]: shiftTime(value, 1440) }));
            else if (field === 'reviewCalibrationAt' && !formik.values.rounds[roundIdx]?.publishResultAt) setSuggestions(p => ({ ...p, [`${roundIdx}_publishResultAt`]: shiftTime(value, 30) }));
        }
        setSuggestions(p => { const n = { ...p }; delete n[`${roundIdx}_${field}`]; return n; });
    };

    const applySuggestion = (roundIdx, field, value) => {
        formik.setFieldValue(`rounds[${roundIdx}].${field}`, value);
        const shiftTime = (base, mins) => { const d = new Date(base); d.setMinutes(d.getMinutes() + mins); return toLocalISOString(d); };
        let nextField = null;
        let nextMins = 0;
        if (field === 'submissionDeadline' && !formik.values.rounds[roundIdx]?.gradingDeadlineAt) { nextField = 'gradingDeadlineAt'; nextMins = 30; }
        else if (field === 'gradingDeadlineAt' && !formik.values.rounds[roundIdx]?.reviewCalibrationAt) { nextField = 'reviewCalibrationAt'; nextMins = 1440; }
        else if (field === 'reviewCalibrationAt' && !formik.values.rounds[roundIdx]?.publishResultAt) { nextField = 'publishResultAt'; nextMins = 30; }

        setSuggestions(p => {
            const n = { ...p };
            delete n[`${roundIdx}_${field}`];
            if (nextField) n[`${roundIdx}_${nextField}`] = shiftTime(value, nextMins);
            return n;
        });
    };

    const applyShiftAll = () => {
        if (!shiftBanner) return;
        const { roundIdx, delta, field } = shiftBanner;
        const rounds = [...formik.values.rounds];
        const round = { ...rounds[roundIdx] };
        const shift = (s) => s ? toLocalISOString(new Date(new Date(s).getTime() + delta)) : '';

        const fields = ['submissionOpen', 'submissionDeadline', 'gradingDeadlineAt', 'reviewCalibrationAt', 'publishResultAt'];
        const startIdx = fields.indexOf(field) + 1;
        for (let i = startIdx; i < fields.length; i++) {
            const f = fields[i];
            if (round[f]) {
                round[f] = shift(round[f]);
            }
        }
        rounds[roundIdx] = round;
        formik.setFieldValue('rounds', rounds);
        setShiftBanner(null);
    };

    const getValidationItems = () => {
        const v = formik.values;
        const items = [];
        const match = (cond, eMsg, fld, tab) => {
            if (!cond) items.push({ type: 'error', msg: eMsg, field: fld, tab });
        };

        Object.keys(formik.errors).forEach(key => {
            if (['name', 'theme', 'year', 'maximumAllowedTeams', 'minTeamMembers', 'maxTeamMembers', 'location', 'contestStartAt', 'publishedAt', 'registrationStart', 'registrationEnd', 'contestEndAt', 'universities', 'complianceRules', 'tieredPrizeStructures'].includes(key)) {
                match(false, formik.errors[key], key, 'core');
            }
        });

        if (formik.errors.categories) {
            formik.errors.categories.forEach((err, idx) => {
                if (err) Object.keys(err).forEach(k => match(false, err[k], `categories[${idx}].${k}`, 'categories'));
            });
        }
        if (formik.errors.rounds) {
            formik.errors.rounds.forEach((err, idx) => {
                if (err) Object.keys(err).forEach(k => match(false, err[k], `rounds[${idx}].${k}`, 'rounds'));
            });
        }
        return items;
    };

    const valItems = getValidationItems();

    const getErrorsForTab = (tabName) => {
        return valItems.filter(v => v.tab === tabName).length;
    };

    const focusField = (item) => {
        setActiveTab(item.tab);
        if (item.tab === 'rounds' || item.tab === 'categories') {
            const match = item.field.match(/(?:rounds|categories)\[(\d+)\]/);
            if (match) {
                const arrIdx = parseInt(match[1], 10);
                if (item.tab === 'categories') {
                    setActiveCategoryIdx(arrIdx);
                } else if (item.tab === 'rounds') {
                    const round = formik.values.rounds[arrIdx];
                    if (round) {
                        const catIdx = formik.values.categories.findIndex(c => String(c.id) === String(round.categoryId));
                        if (catIdx >= 0) setActiveCategoryIdx(catIdx);
                    }
                }
            }
        }
        setTimeout(() => {
            const el = document.querySelector(`[name="${item.field}"]`);
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
        }, 150);
    };

    useEffect(() => {
        if (formik.submitCount > 0 && !formik.isValid && valItems.length > 0) {
            focusField(valItems[0]);
        }
    }, [formik.submitCount]);

    const handleBlurTrim = (e) => {
        const { name, value } = e.target;
        if (typeof value === 'string') {
            formik.setFieldValue(name, value.trim());
        }
        formik.handleBlur(e);
    };

    const buildAllGanttBars = () => {
        const v = formik.values;
        const start = v.registrationStart ? new Date(v.registrationStart).getTime() : null;
        const end = v.contestEndAt ? new Date(v.contestEndAt).getTime() : null;
        if (!start || !end || end <= start) return { rows: [], maxRight: 100 };
        const total = end - start;
        const pct = (d) => Math.max(0, Math.min(100, (d - start) / total * 100));

        const rows = [];
        let maxRight = 100;

        if (v.registrationStart && v.registrationEnd) {
            const w = Math.max(3, pct(new Date(v.registrationEnd).getTime()) - pct(start));
            rows.push({ rowLabel: 'Registration Phase', stages: [{ label: 'Registration', color: '#3b82f6', left: pct(start), width: w }] });
            maxRight = Math.max(maxRight, pct(start) + w);
        }

        let rLeft = 0;
        v.rounds.forEach((r, i) => {
            const stg = [];
            const dts = ['submissionOpen', 'submissionDeadline', 'gradingDeadlineAt', 'reviewCalibrationAt', 'publishResultAt'].map(k => r?.[k] ? new Date(r[k]).getTime() : null);
            let cLeft = Math.max(rLeft, pct(dts[0] || start));

            const addBar = (sIdx, eIdx, label, color) => {
                if (dts[sIdx] && dts[eIdx]) {
                    cLeft = Math.max(cLeft, pct(dts[sIdx]));
                    const w = Math.max(3, pct(dts[eIdx]) - pct(dts[sIdx]));
                    stg.push({ label, color, left: cLeft, width: w });
                    cLeft += w;
                }
            };

            addBar(0, 1, 'Submission', '#8b5cf6');
            addBar(1, 2, 'Grading', '#f97316');
            addBar(2, 3, 'Review', '#f59e0b');
            addBar(r?.reviewCalibrationAt ? 3 : 2, 4, 'Publish', '#22c55e');

            rLeft = cLeft; maxRight = Math.max(maxRight, cLeft);
            const catName = v.categories.find(c => String(c.id) === String(r.categoryId))?.trackName;
            rows.push({ rowLabel: catName ? `${catName} - ${r.phaseName || ('Round ' + (i + 1))}` : (r.phaseName || `Round ${i + 1}`), stages: stg });
        });

        const scale = Math.max(100, maxRight + 5);
        rows.forEach(r => r.stages.forEach(s => { s.left = (s.left / scale) * 100; s.width = (s.width / scale) * 100; }));
        return { rows, maxRight, scale };
    };
    const safeIdx = Math.min(activeCategoryIdx, Math.max(0, formik.values.categories.length - 1));
    const activeCat = formik.values.categories[safeIdx];
    const activeRoundIdx = activeCat ? formik.values.rounds.findIndex(r => String(r.categoryId) === String(activeCat.id)) : -1;
    const activeRound = activeRoundIdx >= 0 ? formik.values.rounds[activeRoundIdx] : null;

    const bounds = getSemesterBounds(formik.values.term, formik.values.year);
    const filteredContests = contests.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || `${c.season} ${c.year}`.toLowerCase().includes(searchQuery.toLowerCase()));
    const ganttBars = useMemo(() => buildAllGanttBars(), [formik.values.rounds, formik.values.registrationStart, formik.values.registrationEnd, formik.values.contestEndAt]);

    if (initialLoading) return (
        <div className="hc-root">
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[80, 60, 70, 55].map((w, i) => <div key={i} className="hc-skeleton" style={{ height: 38, width: `${w}%`, borderRadius: 6 }} />)}
            </div>
        </div>
    );

    const DotBadge = ({ errCount }) => {
        if (errCount > 0) return (
            <div className="hc-val-dot error">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {errCount} issues
            </div>
        );
        if (!selectedContestId && !formik.dirty) return null;
        return (
            <div className="hc-val-dot ok">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                Valid
            </div>
        );
    }

    return (
        <div className="hc-root">
            <FormikProvider value={formik}><Form onSubmit={formik.handleSubmit} style={{ display: 'contents' }}>
                <div className="hc-topbar">
                    <div className="hc-topbar-left">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
                        <h1>Season Setup {selectedContestId && <>- {formik.values.name} <span style={{ marginLeft: 12, padding: '4px 10px', fontSize: 13, background: formik.values.status === 'ACTIVED' ? '#dcfce7' : formik.values.status === 'CLOSED' ? '#f1f5f9' : '#ffedd5', color: formik.values.status === 'ACTIVED' ? '#166534' : formik.values.status === 'CLOSED' ? '#475569' : '#c2410c', borderRadius: 12 }}>{formik.values.status}</span></>}</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {selectedContestId && <button type="button" className="hc-btn-save" onClick={() => { handleSelectContest(''); setSearchQuery(''); formik.resetForm(); }} style={{ padding: '8px 16px', width: 'auto' }}>+ Create New Contest</button>}
                        <div className="hc-search-wrap" onClick={() => setShowSearchDropdown(true)}>
                            <span className="hc-search-icon"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></span>
                            <input placeholder="Search contest..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setShowSearchDropdown(true); }} />
                            {showSearchDropdown && searchQuery && (
                                <div className="hc-search-dropdown">
                                    {filteredContests.length > 0 ? filteredContests.map(c => {
                                        const st = determineStatus(c.registrationStart, c.contestEndAt);
                                        return (
                                            <div key={c.id} className={`hc-search-item${selectedContestId === c.id ? ' selected' : ''}`} onClick={() => { handleSelectContest(c.id); setSearchQuery(''); setShowSearchDropdown(false); }}>
                                                <div><div className="hc-search-name">{c.name}</div><div className="hc-search-season">{c.season} {c.year}</div></div>
                                                <div className={`hc-badge ${st}`}>{st}</div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="hc-search-item" style={{justifyContent: 'center', color: '#64748b', cursor: 'default'}}>No results found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hc-body">
                    {/* LEFT COLUMN */}
                    <div className="hc-sidebar">
                        <div className="hc-sidebar-scroll">
                            <div className={`hc-nav-card${activeTab === 'core' ? ' active' : ''}`} onClick={() => setActiveTab('core')}>
                                <div className="hc-nav-card-header">
                                    <h3 className="hc-nav-card-title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> Contest Information</h3>
                                    <DotBadge errCount={getErrorsForTab('core')} />
                                </div>
                                <p className="hc-nav-card-desc">{formik.values.name || 'Unnamed Event'} • {formik.values.term} {formik.values.year}</p>
                            </div>

                            <div className={`hc-nav-card${activeTab === 'categories' ? ' active' : ''}`} onClick={() => setActiveTab('categories')}>
                                <div className="hc-nav-card-header">
                                    <h3 className="hc-nav-card-title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg> Categories Config</h3>
                                    <DotBadge errCount={getErrorsForTab('categories')} />
                                </div>
                                <p className="hc-nav-card-desc">{formik.values.categories.length} categories configured</p>
                            </div>

                            <div className={`hc-nav-card${activeTab === 'rounds' ? ' active' : ''}`} onClick={() => setActiveTab('rounds')}>
                                <div className="hc-nav-card-header">
                                    <h3 className="hc-nav-card-title"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg> Rounds Config</h3>
                                    <DotBadge errCount={getErrorsForTab('rounds')} />
                                </div>
                                <p className="hc-nav-card-desc">{formik.values.rounds.length} rounds configured</p>
                            </div>
                        </div>

                        <div className="hc-sidebar-footer">
                            {formik.status?.error && <div className="hc-save-warning" style={{ color: '#ef4444' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.status.error}
                            </div>}
                            {formik.status?.success && <div className="hc-save-warning" style={{ color: '#22c55e' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> {formik.status.success}
                            </div>}
                            <button type="submit" className="hc-btn-save" disabled={valItems.length > 0 || isLoading || isClosedContest}>
                                {formik.isSubmitting ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="hc-content">
                        {activeTab === 'core' && (
                            <div className="hc-tab-scroll">
                                <div>
                                    <h2 className="hc-content-title">Contest Information</h2>
                                    <p className="hc-content-subtitle">Define the foundational properties of the event</p>
                                </div>

                                <div className="hc-section">
                                    <div className="hc-section-header"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> Basic Information</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <div className="hc-field">
                                                <label className="hc-label">Event Name <span>*</span></label>
                                                <input className={`hc-input${formik.touched.name && formik.errors.name ? ' is-invalid' : ''}`} name="name" value={formik.values.name} onChange={formik.handleChange} onBlur={handleBlurTrim} disabled={isClosedContest} placeholder="e.g. FPT Hackathon 2026" />
                                                {formik.touched.name && formik.errors.name && <div className="hc-err">{formik.errors.name}</div>}
                                            </div>
                                            <div className="hc-field">
                                                <label className="hc-label">Theme <span>*</span></label>
                                                <input className={`hc-input${formik.touched.theme && formik.errors.theme ? ' is-invalid' : ''}`} name="theme" value={formik.values.theme} onChange={formik.handleChange} onBlur={handleBlurTrim} disabled={isClosedContest} placeholder="e.g. AI & Web3 Innovation" />
                                                {formik.touched.theme && formik.errors.theme && <div className="hc-err">{formik.errors.theme}</div>}
                                            </div>
                                            <div className="hc-field">
                                                <label className="hc-label">Location <span>*</span></label>
                                                <input className={`hc-input${formik.touched.location && formik.errors.location ? ' is-invalid' : ''}`} name="location" value={formik.values.location} onChange={formik.handleChange} onBlur={handleBlurTrim} disabled={isClosedContest} placeholder="e.g. FPT University, HCMC" />
                                                {formik.touched.location && formik.errors.location && <div className="hc-err">{formik.errors.location}</div>}
                                            </div>
                                        </div>
                                        <div className="hc-field" style={{ display: 'flex', flexDirection: 'column' }}>
                                            <label className="hc-label">Description</label>
                                            <textarea className="hc-textarea" name="description" value={formik.values.description} onChange={formik.handleChange} onBlur={handleBlurTrim} disabled={isClosedContest} placeholder="Enter a brief description for this contest" style={{ flex: 1, resize: 'vertical' }} />
                                        </div>
                                    </div>
                                </div>

                                <div className="hc-section">
                                    <div className="hc-section-header"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Dates & Time</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 20 }}>
                                        <div className="hc-field"><label className="hc-label">Term</label><input className="hc-input" value={formik.values.term} disabled /></div>
                                        <div className="hc-field"><label className="hc-label">Year</label><input className="hc-input" value={formik.values.year} disabled /></div>
                                        <div className="hc-field">
                                            <label className="hc-label">Registration Start <span>*</span></label>
                                            <input type="date" className={`hc-input${formik.touched.registrationStart && formik.errors.registrationStart ? ' is-invalid' : ''}`} name="registrationStart" value={formik.values.registrationStart} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest} />
                                            {formik.touched.registrationStart && formik.errors.registrationStart && <div className="hc-err">{formik.errors.registrationStart}</div>}
                                        </div>
                                        <div className="hc-field">
                                            <label className="hc-label">Registration End <span>*</span></label>
                                            <input type="date" className={`hc-input${formik.touched.registrationEnd && formik.errors.registrationEnd ? ' is-invalid' : ''}`} name="registrationEnd" value={formik.values.registrationEnd} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest} />
                                            {formik.touched.registrationEnd && formik.errors.registrationEnd && <div className="hc-err">{formik.errors.registrationEnd}</div>}
                                        </div>
                                        <div className="hc-field">
                                            <label className="hc-label">Contest Start <span>*</span></label>
                                            <input type="datetime-local" className={`hc-input${formik.touched.contestStartAt && formik.errors.contestStartAt ? ' is-invalid' : ''}`} name="contestStartAt" value={formik.values.contestStartAt} onChange={handleContestStartAtChange} onBlur={formik.handleBlur} disabled={isClosedContest} />
                                            {formik.touched.contestStartAt && formik.errors.contestStartAt && <div className="hc-err">{formik.errors.contestStartAt}</div>}
                                        </div>
                                        <div className="hc-field">
                                            <label className="hc-label">Contest End <span>*</span></label>
                                            <input type="datetime-local" className={`hc-input${formik.touched.contestEndAt && formik.errors.contestEndAt ? ' is-invalid' : ''}`} name="contestEndAt" value={formik.values.contestEndAt} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest} />
                                            {formik.touched.contestEndAt && formik.errors.contestEndAt && <div className="hc-err">{formik.errors.contestEndAt}</div>}
                                        </div>
                                        <div className="hc-field">
                                            <label className="hc-label">Publish Info At <span>*</span></label>
                                            <input type="datetime-local" className={`hc-input${formik.touched.publishedAt && formik.errors.publishedAt ? ' is-invalid' : ''}`} name="publishedAt" value={formik.values.publishedAt} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest} />
                                            {formik.touched.publishedAt && formik.errors.publishedAt && <div className="hc-err">{formik.errors.publishedAt}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="hc-section">
                                    <div className="hc-section-header"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> Team & Participant Setup</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 40 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                            {['maximumAllowedTeams', 'minTeamMembers', 'maxTeamMembers'].map(fld => (
                                                <div className="hc-field" key={fld}>
                                                    <label className="hc-label">{fld === 'maximumAllowedTeams' ? 'Max Teams' : fld === 'minTeamMembers' ? 'Min Members' : 'Max Members'} <span>*</span></label>
                                                    <input type="number" className={`hc-input${formik.touched[fld] && formik.errors[fld] ? ' is-invalid' : ''}`} name={fld} value={formik.values[fld]} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest} />
                                                    {formik.touched[fld] && formik.errors[fld] && <div className="hc-err">{formik.errors[fld]}</div>}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="hc-field">
                                            <label className="hc-label">Allowed Universities <span>*</span></label>
                                            <div className="hc-checklist-grid" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                                                {allUniversities.map(u => (
                                                    <label key={u.id} className="hc-check-item" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155' }}>
                                                        <input type="checkbox" name="universities" value={u.name} checked={formik.values.universities.includes(u.name)} onChange={e => {
                                                            const set = new Set(formik.values.universities);
                                                            if (e.target.checked) set.add(u.name); else set.delete(u.name);
                                                            formik.setFieldValue('universities', Array.from(set));
                                                        }} disabled={isClosedContest} />
                                                        {u.name}
                                                    </label>
                                                ))}
                                            </div>
                                            {formik.touched.universities && formik.errors.universities && typeof formik.errors.universities === 'string' && <div className="hc-err" style={{ marginTop: 12 }}>{formik.errors.universities}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                                    <div className="hc-section">
                                        <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> Compliance Rules</div>
                                            {!isClosedContest && <button type="button" className="hc-list-add-btn" onClick={() => formik.setFieldValue('complianceRules', [...formik.values.complianceRules, { rule: '', penalty: '' }])}>+ Add Rule</button>}
                                        </div>
                                        <div>
                                            {formik.values.complianceRules.map((item, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 12 }}>
                                                    <textarea className="hc-textarea" name={`complianceRules[${idx}].rule`} value={item.rule} onChange={formik.handleChange} disabled={isClosedContest} placeholder={`Rule ${idx + 1}`} rows={2} style={{ resize: 'vertical' }} />
                                                    <textarea className="hc-textarea" name={`complianceRules[${idx}].penalty`} value={item.penalty} onChange={formik.handleChange} disabled={isClosedContest} placeholder="Penalty Details" rows={2} style={{ resize: 'vertical' }} />
                                                    {formik.values.complianceRules.length > 1 && !isClosedContest && <RemoveButton onClick={() => formik.setFieldValue('complianceRules', formik.values.complianceRules.filter((_, i) => i !== idx))} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="hc-section">
                                        <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Prize Structure</div>
                                            {!isClosedContest && <button type="button" className="hc-list-add-btn" onClick={() => formik.setFieldValue('tieredPrizeStructures', [...formik.values.tieredPrizeStructures, { rank: '', amount: '' }])}>+ Add Prize</button>}
                                        </div>
                                        <div>
                                            {formik.values.tieredPrizeStructures.map((prize, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 12 }}>
                                                    <input className="hc-input" name={`tieredPrizeStructures[${idx}].rank`} value={prize.rank} onChange={formik.handleChange} disabled={isClosedContest} placeholder="1st Prize" />
                                                    <input className="hc-input" name={`tieredPrizeStructures[${idx}].amount`} value={prize.amount} onChange={formik.handleChange} disabled={isClosedContest} placeholder="$5000" />
                                                    {formik.values.tieredPrizeStructures.length > 1 && !isClosedContest && <RemoveButton onClick={() => formik.setFieldValue('tieredPrizeStructures', formik.values.tieredPrizeStructures.filter((_, i) => i !== idx))} />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'categories' && (
                            <div className="hc-tab-scroll">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <div>
                                        <h2 className="hc-content-title">Categories Config</h2>
                                        <p className="hc-content-subtitle">Define the tracks or categories available in this season.</p>
                                    </div>
                                    {!isClosedContest && <button type="button" className="hc-btn-primary" onClick={() => {
                                        const newId = -Date.now();
                                        formik.setFieldValue('categories', [...formik.values.categories, { id: newId, trackName: '', trackDescription: '', guidelineUrl: '', status: selectedContestId ? 'ACTIVED' : 'UNSAVED' }]);
                                    }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Add Category</button>}
                                </div>

                                {formik.values.categories.length === 0 ? (
                                    <div className="hc-empty">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
                                        <h3>No categories yet</h3>
                                        <p>Add a category to start configuring tracks.</p>
                                    </div>
                                ) : (
                                    formik.values.categories.map((cat, idx) => (
                                        <div key={cat.id} className="hc-section" style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                            <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                                                    {cat.trackName || `Category ${idx + 1}`}
                                                </div>
                                                {!isClosedContest && formik.values.categories.length > 1 && (() => {
                                                    const usedByActiveRound = formik.values.rounds.some(r => String(r.categoryId) === String(cat.id) && (r.state === 'ACTIVE' || r.state === 'ACTIVED' || r.state === 'CLOSED'));
                                                    return (
                                                        <button type="button" className="hc-btn-danger" disabled={usedByActiveRound} title={usedByActiveRound ? 'Cannot delete category assigned to an active/closed round' : ''} onClick={() => {
                                                            if (window.confirm('Are you sure you want to delete this category? This will also unassign it from any associated rounds.')) {
                                                                if (cat.id > 0) setDeletedCategories(p => [...p, cat]);
                                                                formik.setFieldValue('categories', formik.values.categories.filter((_, i) => i !== idx));
                                                                const newRounds = formik.values.rounds.map(r => String(r.categoryId) === String(cat.id) ? { ...r, categoryId: '' } : r);
                                                                formik.setFieldValue('rounds', newRounds);
                                                            }
                                                        }}>Delete</button>
                                                    );
                                                })()}
                                            </div>
                                            <div className="hc-grid-1-1" style={{ marginBottom: 16 }}>
                                                <div className="hc-field">
                                                    <label className="hc-label">Category Name <span>*</span></label>
                                                    <input className={`hc-input${formik.touched.categories?.[idx]?.trackName && formik.errors.categories?.[idx]?.trackName ? ' is-invalid' : ''}`} name={`categories[${idx}].trackName`} value={cat.trackName} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest} placeholder="e.g. AI Track" />
                                                    {formik.touched.categories?.[idx]?.trackName && formik.errors.categories?.[idx]?.trackName && <div className="hc-err"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.errors.categories[idx].trackName}</div>}
                                                </div>
                                                <div className="hc-field">
                                                    <label className="hc-label">Guideline URL</label>
                                                    <input className={`hc-input${formik.touched.categories?.[idx]?.guidelineUrl && formik.errors.categories?.[idx]?.guidelineUrl ? ' is-invalid' : ''}`} name={`categories[${idx}].guidelineUrl`} value={cat.guidelineUrl} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest} placeholder="https://..." />
                                                    {formik.touched.categories?.[idx]?.guidelineUrl && formik.errors.categories?.[idx]?.guidelineUrl && <div className="hc-err"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.errors.categories[idx].guidelineUrl}</div>}
                                                </div>
                                            </div>
                                            <div className="hc-field">
                                                <label className="hc-label">Category Description</label>
                                                <textarea className="hc-textarea" name={`categories[${idx}].trackDescription`} value={cat.trackDescription || ''} onChange={formik.handleChange} disabled={isClosedContest} placeholder="Briefly describe the focus of this category..." />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === 'rounds' && (
                            <div className="hc-tab-scroll" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '16px 32px 0px 32px', flexShrink: 0, background: '#fff' }}>
                                    <div style={{ marginBottom: 24 }}>
                                        <h2 className="hc-content-title">Rounds Config</h2>
                                        <p className="hc-content-subtitle" style={{ borderBottom: 'none', paddingBottom: 0 }}>Configure rounds and manage the contest timeline seamlessly.</p>
                                    </div>
                                    <div className="hc-round-nav" style={{ marginBottom: 0 }}>
                                        {formik.values.rounds.map((round, rIdx) => {
                                            const isActiveTab = activeCategoryIdx === rIdx;
                                            const bg = round.state === 'ACTIVED' ? '#dcfce7' : round.state === 'CLOSED' ? '#f1f5f9' : '#ffedd5';
                                            const fg = round.state === 'ACTIVED' ? '#166534' : round.state === 'CLOSED' ? '#475569' : '#c2410c';
                                            const border = round.state === 'ACTIVED' ? '#22c55e' : round.state === 'CLOSED' ? '#94a3b8' : '#f97316';

                                            return (
                                                <button key={round.id} type="button" className={`hc-round-tab${isActiveTab ? ' active' : ''}`}
                                                        style={{ background: bg, color: fg, borderColor: isActiveTab ? border : '#cbd5e1', opacity: isActiveTab ? 1 : 0.7 }}
                                                        onClick={() => setActiveCategoryIdx(rIdx)}>
                                                    <span style={{ fontWeight: 'normal', opacity: 0.8, marginRight: 4 }}>#{rIdx + 1}</span>
                                                    {round.phaseName || `Round ${rIdx + 1}`}
                                                    {isActiveTab && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginLeft: 6, background: border }} title="Currently configuring"></span>}
                                                </button>
                                            );
                                        })}
                                        {!isClosedContest && <button type="button" className="hc-round-tab" onClick={() => {
                                            const newId = -(Date.now() + 1);
                                            formik.setFieldValue('rounds', [...formik.values.rounds, { id: newId, phaseName: `Round ${formik.values.rounds.length + 1}`, categoryId: '', submissionOpen: '', submissionDeadline: '', gradingDeadlineAt: '', reviewCalibrationAt: '', publishResultAt: '', state: selectedContestId ? 'UPCOMING' : 'UNSAVED', submissionRequirements: [], roundFormat: '' }]);
                                            setActiveCategoryIdx(formik.values.rounds.length);
                                        }} style={{ borderStyle: 'dashed', background: 'transparent', color: '#3b82f6' }}>+ Add Round</button>}
                                    </div>
                                </div>

                                <div style={{ padding: '0 40px 32px 40px', background: '#fff', flex: '1 0 auto' }}>
                                    {formik.values.rounds.length === 0 ? (
                                        <div className="hc-empty">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                                            <h3>No rounds yet</h3>
                                            <p>Add a round to configure the timeline.</p>
                                        </div>
                                    ) : (
                                        (() => {
                                            const rIdx = Math.min(activeCategoryIdx, Math.max(0, formik.values.rounds.length - 1));
                                            const round = formik.values.rounds[rIdx];
                                            if (!round) return null;
                                            const originalRound = formik.initialValues.rounds?.find(r => r.id === round.id);
                                            const isLockedRound = originalRound ? originalRound.state === 'CLOSED' : false;
                                            return (
                                                <div key={round.id} style={{ marginBottom: 16 }}>
                                                    <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                            Configuring Round {rIdx + 1}{round.phaseName ? `: ${round.phaseName}` : ''}
                                                            {round.state && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: round.state === 'ACTIVED' ? '#dcfce7' : round.state === 'CLOSED' ? '#f1f5f9' : '#ffedd5', color: round.state === 'ACTIVED' ? '#166534' : round.state === 'CLOSED' ? '#475569' : '#c2410c', fontWeight: 600, marginLeft: 8 }}>{round.state}</span>}
                                                        </div>
                                                        {!isClosedContest && (rIdx !== 0 || formik.values.rounds.length > 1) && (round.state === 'UPCOMING' || round.state === 'UNSAVED') && (
                                                            <button type="button" className="hc-btn-danger" onClick={() => {
                                                                if (window.confirm('Are you sure you want to delete this round?')) {
                                                                    formik.setFieldValue('rounds', formik.values.rounds.filter((_, i) => i !== rIdx));
                                                                    setActiveCategoryIdx(Math.max(0, rIdx - 1));
                                                                }
                                                            }}>Delete Round</button>
                                                        )}
                                                    </div>

                                                    <div className="hc-grid-2" style={{ marginBottom: 20 }}>
                                                        <div className="hc-field">
                                                            <label className="hc-label">Round Name <span>*</span></label>
                                                            <input className={`hc-input${formik.touched.rounds?.[rIdx]?.phaseName && formik.errors.rounds?.[rIdx]?.phaseName ? ' is-invalid' : ''}`} name={`rounds[${rIdx}].phaseName`} value={round.phaseName} onChange={formik.handleChange} onBlur={handleBlurTrim} disabled={isClosedContest || isLockedRound} />
                                                            {formik.touched.rounds?.[rIdx]?.phaseName && formik.errors.rounds?.[rIdx]?.phaseName && <div className="hc-err"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.errors.rounds[rIdx].phaseName}</div>}
                                                        </div>
                                                        <div className="hc-field">
                                                            <label className="hc-label">Select Category <span>*</span></label>
                                                            <select className={`hc-select${formik.touched.rounds?.[rIdx]?.categoryId && formik.errors.rounds?.[rIdx]?.categoryId ? ' is-invalid' : ''}`} name={`rounds[${rIdx}].categoryId`} value={round.categoryId} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest || isLockedRound}>
                                                                <option value="">-- Select Category --</option>
                                                                {formik.values.categories.map(c => {
                                                                    const isSelected = formik.values.rounds.some(other => other.id !== round.id && String(other.categoryId) === String(c.id));
                                                                    return <option key={c.id} value={c.id} disabled={isSelected}>{c.trackName || 'Unnamed Category'}</option>
                                                                })}
                                                            </select>
                                                            {formik.touched.rounds?.[rIdx]?.categoryId && formik.errors.rounds?.[rIdx]?.categoryId && <div className="hc-err"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.errors.rounds[rIdx].categoryId}</div>}
                                                        </div>
                                                    </div>

                                                    <div style={{ marginBottom: 20 }}>
                                                        <div className="hc-grid-2">
                                                            <div className="hc-field">
                                                                <label className="hc-label">Round Format <span>*</span></label>
                                                                {!isClosedContest && !isLockedRound && (
                                                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                                                        <input className="hc-input" style={{ height: 30, fontSize: 12 }} placeholder="Add new format..." value={customFormatInput[rIdx] || ''} onChange={e => setCustomFormatInput(p => ({ ...p, [rIdx]: e.target.value }))} />
                                                                        <button type="button" className="hc-btn-primary" style={{ height: 30, padding: '0 12px' }} onClick={() => {
                                                                            const val = customFormatInput[rIdx]?.trim();
                                                                            if (val && !availableRoundFormats.includes(val)) {
                                                                                setAvailableRoundFormats(p => [...p, val]);
                                                                                formik.setFieldValue(`rounds[${rIdx}].roundFormat`, val);
                                                                                setCustomFormatInput(p => ({ ...p, [rIdx]: '' }));
                                                                            }
                                                                        }}>Add</button>
                                                                    </div>
                                                                )}
                                                                <select className={`hc-select${formik.touched.rounds?.[rIdx]?.roundFormat && formik.errors.rounds?.[rIdx]?.roundFormat ? ' is-invalid' : ''}`} name={`rounds[${rIdx}].roundFormat`} value={round.roundFormat || ''} onChange={formik.handleChange} onBlur={formik.handleBlur} disabled={isClosedContest || isLockedRound}>
                                                                    <option value="">-- Select Format --</option>
                                                                    {availableRoundFormats.map((fmt, i) => <option key={i} value={fmt}>{fmt}</option>)}
                                                                </select>
                                                                {formik.touched.rounds?.[rIdx]?.roundFormat && formik.errors.rounds?.[rIdx]?.roundFormat && <div className="hc-err"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.errors.rounds[rIdx].roundFormat}</div>}
                                                            </div>
                                                            <div className="hc-field">
                                                                <label className="hc-label">Submission Requirements <span>*</span></label>
                                                                {!isClosedContest && !isLockedRound && (
                                                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                                                        <input className="hc-input" style={{ height: 30, fontSize: 12 }} placeholder="Custom requirement..." value={customSubReqInput[rIdx] || ''} onChange={e => setCustomSubReqInput(p => ({ ...p, [rIdx]: e.target.value }))} />
                                                                        <button type="button" className="hc-btn-primary" style={{ height: 30, padding: '0 12px' }} onClick={() => {
                                                                            const val = customSubReqInput[rIdx]?.trim();
                                                                            if (val && !availableSubReqs.some(x => x.value === val)) {
                                                                                setAvailableSubReqs(p => [...p, { value: val, label: val }]);
                                                                                formik.setFieldValue(`rounds[${rIdx}].submissionRequirements`, [...(round.submissionRequirements || []), val]);
                                                                                setCustomSubReqInput(p => ({ ...p, [rIdx]: '' }));
                                                                            }
                                                                        }}>Add</button>
                                                                    </div>
                                                                )}
                                                                <div className="hc-checklist-grid">
                                                                    {availableSubReqs.map(req => (
                                                                        <label key={req.value} className="hc-check-item">
                                                                            <input type="checkbox" name={`rounds[${rIdx}].submissionRequirements`} value={req.value} checked={Array.isArray(round.submissionRequirements) && round.submissionRequirements.includes(req.value)} onChange={formik.handleChange} disabled={isClosedContest || isLockedRound} />
                                                                            {req.label}
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                                {formik.touched.rounds?.[rIdx]?.submissionRequirements && formik.errors.rounds?.[rIdx]?.submissionRequirements && <div className="hc-err"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.errors.rounds[rIdx].submissionRequirements}</div>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {shiftBanner && shiftBanner.roundIdx === rIdx && (
                                                        <div className="hc-shift-banner">
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> Adjust subsequent timeline milestones with the same delta?</span>
                                                            <div>
                                                                <button type="button" className="hc-shift-btn move" onClick={applyShiftAll}>Move All</button>
                                                                <button type="button" className="hc-shift-btn keep" onClick={() => setShiftBanner(null)}>Keep Current</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="hc-grid-3">
                                                        {['submissionOpen', 'submissionDeadline', 'gradingDeadlineAt', 'reviewCalibrationAt', 'publishResultAt'].map((field) => {
                                                            let minVal = bounds.min;
                                                            if (field === 'submissionOpen') {
                                                                minVal = rIdx > 0 && formik.values.rounds[rIdx - 1]?.publishResultAt ? formik.values.rounds[rIdx - 1].publishResultAt : (formik.values.registrationEnd ? `${formik.values.registrationEnd}T00:00` : bounds.min);
                                                            } else if (field === 'submissionDeadline') {
                                                                minVal = round.submissionOpen || bounds.min;
                                                            } else if (field === 'gradingDeadlineAt') {
                                                                minVal = round.submissionDeadline || bounds.min;
                                                            } else if (field === 'reviewCalibrationAt') {
                                                                minVal = round.gradingDeadlineAt || bounds.min;
                                                            } else if (field === 'publishResultAt') {
                                                                minVal = round.reviewCalibrationAt || bounds.min;
                                                            }
                                                            return (
                                                                <div className="hc-field" key={field}>
                                                                    <label className="hc-label">{field.charAt(0).toUpperCase() + field.replace(/At$|AtUrgent$/, '').slice(1).replace(/([A-Z])/g, ' $1')} <span>*</span></label>
                                                                    <input type="datetime-local" className={`hc-input${formik.touched.rounds?.[rIdx]?.[field] && formik.errors.rounds?.[rIdx]?.[field] ? ' is-invalid' : ''}`} name={`rounds[${rIdx}].${field}`} value={round[field] || ''} onChange={e => handleSmartDateChange(e, rIdx)} onFocus={() => handleFocusDate(rIdx, field)} onBlur={formik.handleBlur} min={minVal} max={formik.values.contestEndAt || bounds.max} disabled={isClosedContest || isLockedRound} />
                                                                    {formik.touched.rounds?.[rIdx]?.[field] && formik.errors.rounds?.[rIdx]?.[field] && <div className="hc-err"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> {formik.errors.rounds[rIdx][field]}</div>}
                                                                    {suggestions[`${rIdx}_${field}`] && (
                                                                        <div className="hc-suggest-banner">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v2" /><path d="M12 20v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="M4.93 19.07l1.41-1.41" /><path d="M17.66 6.34l1.41-1.41" /></svg> Suggested: {formatDateString(suggestions[`${rIdx}_${field}`])}
                                                                            <button type="button" className="hc-suggest-apply" onClick={() => applySuggestion(rIdx, field, suggestions[`${rIdx}_${field}`])}>Apply</button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    )}
                                </div>

                                {formik.values.rounds.length > 0 && (
                                    <div style={{ flexShrink: 0, padding: '12px 32px 24px 32px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                        <div className="hc-timeline-card" style={{ marginTop: 0 }}>
                                            <div className="hc-timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                                                    Overall Timeline Preview
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, fontWeight: 500, color: '#64748b' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }}></span> Registration</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#8b5cf6' }}></span> Submission</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f97316' }}></span> Grading</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }}></span> Review</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }}></span> Publish</div>
                                                </div>
                                            </div>
                                            <div className="hc-timeline-body">
                                                {ganttBars.rows?.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 0' }}>Enter dates to see the Gantt timeline</div>
                                                ) : (
                                                    <div>
                                                        <div className="hc-timeline-track" style={{ width: `${ganttBars.scale}%` }}>
                                                            {ganttBars.rows.map((row, i) => (
                                                                <div key={i} className="hc-timeline-row">
                                                                    <div className="hc-timeline-label">{row.rowLabel}</div>
                                                                    <div className="hc-timeline-outer">
                                                                        {row.stages.map((bar, j) => (
                                                                            <div key={j} className="hc-timeline-bar" style={{ left: `${bar.left}%`, width: `${bar.width}%`, background: bar.color }}>
                                                                                <span className="hc-timeline-bar-label">{bar.label}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="hc-timeline-date-labels">
                                                            <span>{formatDateString(formik.values.registrationStart)}</span>
                                                            <span>{formatDateString(formik.values.contestEndAt)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {valItems.length > 0 && (
                            <div className="hc-val-summary" style={{ padding: '16px 24px' }}>
                                <div className="hc-val-summary-header" style={{ marginBottom: 8, paddingBottom: 0, borderBottom: 'none' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg> Validation Summary
                                </div>
                                <div style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <span>Found <strong>{valItems.length}</strong> validation errors. Please review the tabs and fields marked in red above.</span>
                                    <button type="button" onClick={() => { if (valItems[0]) focusField(valItems[0]); }} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 12px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Go to error</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Form></FormikProvider>
        </div>
    );
}

export default HackathonConfig;
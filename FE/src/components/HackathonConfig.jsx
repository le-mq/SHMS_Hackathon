import { useState, useEffect, useMemo } from 'react';
import { useFormik, FormikProvider, getIn } from 'formik';
import * as Yup from 'yup';
import { Form } from 'react-bootstrap';
import './HackathonConfig.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const Icon = ({ name, color = "currentColor", size = 16, className = "" }) => {
    const icons = {
        remove: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
        error: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
        check: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
        setup: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></>,
        search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
        core: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
        category: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
        round: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
        info: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
        time: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
        team: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
        rule: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
        prize: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
        plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
        catItem: <><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></>,
        suggest: <><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.93 19.07l1.41-1.41"/><path d="M17.66 6.34l1.41-1.41"/></>
    };
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" className={className}>{icons[name]}</svg>;
};

const FormInput = ({ formik, name, label, type = 'text', req, ...props }) => {
    const error = getIn(formik.errors, name);
    const touched = getIn(formik.touched, name);
    const hasErr = touched && error;
    return (
        <div className="hc-field">
            {label && <label className="hc-label">{label} {req && <span>*</span>}</label>}
            <input type={type} className={`hc-input${hasErr ? ' is-invalid' : ''}`} {...formik.getFieldProps(name)} {...props} />
            {hasErr && <div className="hc-err"><Icon name="error" size={12} /> {error}</div>}
        </div>
    );
};

const FormSelect = ({ formik, name, label, req, options, ...props }) => {
    const error = getIn(formik.errors, name);
    const touched = getIn(formik.touched, name);
    const hasErr = touched && error;
    return (
        <div className="hc-field">
            {label && <label className="hc-label">{label} {req && <span>*</span>}</label>}
            <select className={`hc-select${hasErr ? ' is-invalid' : ''}`} {...formik.getFieldProps(name)} {...props}>
                <option value="">-- Select --</option>
                {options.map((o, i) => <option key={i} value={typeof o === 'object' ? o.value : o} disabled={o?.disabled}>{typeof o === 'object' ? (o.label || 'Unnamed') : o}</option>)}
            </select>
            {hasErr && <div className="hc-err"><Icon name="error" size={12} /> {error}</div>}
        </div>
    );
};

const FormTextArea = ({ formik, name, label, ...props }) => (
    <div className="hc-field">
        {label && <label className="hc-label">{label}</label>}
        <textarea className="hc-textarea" {...formik.getFieldProps(name)} {...props} />
    </div>
);

const formatDate = dStr => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d)) return dStr;
    const p = n => String(n).padStart(2, '0');
    let hh = d.getHours(), ampm = hh >= 12 ? 'PM' : 'AM';
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(hh % 12 || 12)}:${p(d.getMinutes())} ${ampm}`;
};

const toISO = d => {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function HackathonConfig() {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [allUniversities, setAllUniversities] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [deletedCategories, setDeletedCategories] = useState([]);
    const [activeTab, setActiveTab] = useState('core');
    const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
    const [suggestions, setSuggestions] = useState({});
    const [originalDates, setOriginalDates] = useState({});
    const [shiftBanner, setShiftBanner] = useState(null);
    const [availableSubReqs, setAvailableSubReqs] = useState([{ value: 'Source Code URL', label: 'Source Code / GitHub Repository' }, { value: 'Live Demo URL', label: 'Live Demo / Video Link' }, { value: 'Documentation URL', label: 'Project Documentation' }, { value: 'Presentation Slide URL', label: 'Presentation Slides' }]);
    const [availableRoundFormats, setAvailableRoundFormats] = useState(['On-site Submission', 'Remote Submission', 'In-booth Presentation', 'Stage Presentation']);

    const getStatus = (start, end) => {
        if (!start || !end) return 'UPCOMING';
        const now = Date.now(), s = new Date(start).getTime(), e = new Date(end).getTime();
        return now < s ? 'UPCOMING' : now <= e ? 'ACTIVED' : 'CLOSED';
    };

    const isClosedContest = useMemo(() => {
        const c = contests.find(c => c.id === selectedContestId);
        return c ? getStatus(c.registrationStart, c.contestEndAt) === 'CLOSED' : false;
    }, [contests, selectedContestId]);

    const getBounds = (term, year) => {
        const y = year || new Date().getFullYear();
        const conf = { SPRING: { sm: 1, em: 4, ed: 30, mt: '04-30T23:59' }, SUMMER: { sm: 5, em: 8, ed: 31, mt: '08-31T23:59' }, FALL: { sm: 9, em: 12, ed: 31, mt: '12-31T23:59' } }[term] || { sm: 1, em: 4, ed: 30, mt: '04-30T23:59' };
        return { start: new Date(y, conf.sm - 1, 1).getTime(), end: new Date(y, conf.em - 1, conf.ed, 23, 59, 59).getTime(), min: `${y}-${String(conf.sm).padStart(2, '0')}-01T00:00`, max: `${y}-${conf.mt}` };
    };

    const fetchData = async (url, mockKey) => {
        try {
            const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('shms_token')}` } });
            if (res.ok) {
                const data = await res.json();
                if (data && Object.keys(data).length) return data;
            }
        } catch {}
        const mock = await (await fetch('/testFE.json')).json();
        return mockKey === 'uni' ? mock.hackathonConfig?.universities || [] : mockKey === 'contests' ? mock.contests?.data || [] : mock.hackathonConfig?.contestDetail || {};
    };

    const fetchContests = async () => setContests(await fetchData(`${API_BASE}/admin/contests`, 'contests'));
    const fetchUniversities = async () => setAllUniversities(await fetchData(`${API_BASE}/admin/universities`, 'uni'));

    useEffect(() => { Promise.all([fetchContests(), fetchUniversities()]).finally(() => setInitialLoading(false)); }, []);

    const formik = useFormik({
        initialValues: {
            name: '', theme: '', term: 'Auto setup', year: new Date().getFullYear(), maximumAllowedTeams: 100, minTeamMembers: 3, maxTeamMembers: 5, registrationStart: '', registrationEnd: '', contestEndAt: '', location: '', contestStartAt: '', publishedAt: '', universities: [], status: 'UNSAVED',
            complianceRules: [{ rule: '', penalty: '' }], tieredPrizeStructures: [{ rank: '', amount: '' }],
            categories: [{ id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'UNSAVED' }],
            rounds: [{ id: -1, phaseName: 'Round 1', categoryId: -1, submissionOpen: '', submissionDeadline: '', gradingDeadlineAt: '', reviewCalibrationAt: '', publishResultAt: '', state: 'UNSAVED', submissionRequirements: [], roundFormat: '' }]
        },
        validationSchema: Yup.object().shape({
            name: Yup.string().required('Required'), theme: Yup.string().required('Required'), year: Yup.number().required('Required'), location: Yup.string().required('Required'), publishedAt: Yup.date().required('Required'), registrationStart: Yup.date().required('Required'), registrationEnd: Yup.date().required('Required').min(Yup.ref('registrationStart'), 'Must be after start'),
            maximumAllowedTeams: Yup.number().min(1).required('Required'),
            minTeamMembers: Yup.number().min(1).required('Required').test('min-max', 'Min <= Max', function(v) { return !v || !this.parent.maxTeamMembers || v <= this.parent.maxTeamMembers; }),
            maxTeamMembers: Yup.number().min(1).required('Required').test('max-min', 'Max >= Min', function(v) { return !v || !this.parent.minTeamMembers || v >= this.parent.minTeamMembers; }),
            contestStartAt: Yup.date().required('Required').test('after-reg', 'Must be >= Reg End', function(v) { return !v || !this.parent.registrationEnd || new Date(v) >= new Date(this.parent.registrationEnd).setHours(0,0,0,0); }),
            contestEndAt: Yup.date().required('Required').test('after-reg-end', 'Must be > Reg End', function(v) { return !v || !this.parent.registrationEnd || new Date(v) > new Date(this.parent.registrationEnd).setHours(23,59,59,999); }),
            universities: Yup.array().min(1, 'Select at least one'),
            categories: Yup.array().of(Yup.object().shape({ trackName: Yup.string().required('Required'), guidelineUrl: Yup.string().url('Invalid URL') })).min(1),
            rounds: Yup.array().of(Yup.object().shape({
                phaseName: Yup.string().required('Required'), roundFormat: Yup.string().required('Required'), submissionRequirements: Yup.array().min(1, 'Required'),
                categoryId: Yup.string().required('Required').test('uniq', 'Unique error', function(v) { return !v || this.from[1].value.rounds.filter(r => String(r.categoryId) === String(v)).length <= 1; }),
                submissionOpen: Yup.date().required('Required').test('after-prev', 'After prev round', function(v) { const match = this.path.match(/\[(\d+)\]/); if(match && match[1]>0){ const p = this.from[1].value.rounds[match[1]-1]; if(p?.publishResultAt) return new Date(v)>=new Date(p.publishResultAt); } return true; }).test('after-reg', 'After Reg End', function(v) { return !v || !this.from[1].value.registrationEnd || new Date(v) > new Date(this.from[1].value.registrationEnd).setHours(0,0,0,0); }),
                submissionDeadline: Yup.date().required('Required').test('seq', 'After Open', function(v) { return !v || !this.parent.submissionOpen || new Date(v) > new Date(this.parent.submissionOpen); }),
                gradingDeadlineAt: Yup.date().required('Required').test('seq', 'After Deadline', function(v) { return !v || !this.parent.submissionDeadline || new Date(v) > new Date(this.parent.submissionDeadline); }),
                reviewCalibrationAt: Yup.date().required('Required').test('seq', 'After Grading', function(v) { return !v || !this.parent.gradingDeadlineAt || new Date(v) > new Date(this.parent.gradingDeadlineAt); }).test('seq2', 'Before Publish', function(v) { return !v || !this.parent.publishResultAt || new Date(v) < new Date(this.parent.publishResultAt); }),
                publishResultAt: Yup.date().required('Required').test('seq', 'After Review', function(v) { const ref = this.parent.reviewCalibrationAt || this.parent.gradingDeadlineAt; return !v || !ref || new Date(v) > new Date(ref); })
            })).min(1)
        }),
        onSubmit: async (v, { setSubmitting, setStatus }) => {
            const st = getStatus(v.registrationStart, v.contestEndAt);
            if (st === 'CLOSED') return setStatus({ error: "Cannot modify closed contest." }), setSubmitting(false);
            const b = getBounds(v.term, v.year);
            const out = v.rounds.find(r => [r.submissionOpen, r.submissionDeadline].some(d => d && (new Date(d).getTime() < b.start || new Date(d).getTime() > b.end)));
            if (out) return setStatus({ error: `${out.phaseName} dates out of season bounds.` }), setSubmitting(false);
            for (let i = 1; i < v.rounds.length; i++) if (new Date(v.rounds[i].submissionOpen) <= new Date(v.rounds[i - 1].submissionDeadline)) return setStatus({ error: `${v.rounds[i].phaseName} Open must be after previous Deadline.` }), setSubmitting(false);

            setIsLoading(true); setStatus({});
            try {
                const token = localStorage.getItem('shms_token');
                const fmtSec = d => d && d.length === 16 ? d + ':00' : d;
                const res = await fetch(`${API_BASE}/admin/contests`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        ...v, id: selectedContestId || null, status: st, allowedCorporateDomains: v.universities.join(','),
                        complianceRules: JSON.stringify(v.complianceRules.filter(r => r.rule.trim())),
                        tieredPrizeStructures: JSON.stringify(v.tieredPrizeStructures.filter(p => p.rank.trim() || p.amount.trim())),
                        contestEndAt: fmtSec(v.contestEndAt), contestStartAt: fmtSec(v.contestStartAt), publishedAt: fmtSec(v.publishedAt)
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.errors ? data.errors.map(e => e.defaultMessage || e.field).join(', ') : data.message || 'Error');
                const cid = selectedContestId || data.contestId;
                setSelectedContestId(cid);

                for (const cat of v.categories) {
                    const cRounds = v.rounds.filter(r => String(r.categoryId) === String(cat.id));
                    const trRes = await fetch(`${API_BASE}/admin/contests/rounds-tracks`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                            contestId: cid, categoryName: cat.trackName, trackDescription: cat.trackDescription || 'No description', guidelineUrl: cat.guidelineUrl || '', status: st,
                            rounds: cRounds.map((r, i) => ({
                                id: String(r.id).startsWith('-') ? null : r.id, phaseName: r.phaseName, roundOrder: i + 1,
                                submissionOpen: fmtSec(r.submissionOpen), submissionDeadline: fmtSec(r.submissionDeadline), gradingDeadlineAt: fmtSec(r.gradingDeadlineAt), reviewCalibrationAt: fmtSec(r.reviewCalibrationAt), publishResultAt: fmtSec(r.publishResultAt),
                                state: st === 'CLOSED' || (r.state === 'CLOSED' && !(r.publishResultAt && new Date(r.publishResultAt) > Date.now())) ? 'CLOSED' : getStatus(r.submissionOpen, r.publishResultAt),
                                submissionRequirements: Array.isArray(r.submissionRequirements) ? r.submissionRequirements.join(',') : r.submissionRequirements, roundFormat: r.roundFormat
                            }))
                        })
                    });
                    if (!trRes.ok) throw new Error((await trRes.json()).error || `Failed ${cat.trackName}`);
                }
                for (const del of deletedCategories) if (del.id > 0) await fetch(`${API_BASE}/admin/contests/tracks/${del.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });

                setDeletedCategories([]); setStatus({ success: 'Saved successfully!' }); fetchContests();
            } catch (err) { setStatus({ error: err.message }); } finally { setIsLoading(false); setSubmitting(false); }
        }
    });

    useEffect(() => {
        if (!selectedContestId) return;
        const cStatus = getStatus(formik.values.registrationStart, formik.values.contestEndAt);
        if (formik.values.status !== cStatus) formik.setFieldValue('status', cStatus);

        let catsUpd = false;
        const newCats = [...formik.values.categories];
        formik.values.rounds.forEach((r, i) => {
            const s = r.state === 'CLOSED' && !(r.publishResultAt && new Date(r.publishResultAt) > Date.now()) ? r.state : getStatus(r.submissionOpen, r.publishResultAt);
            if (r.state !== s) formik.setFieldValue(`rounds[${i}].state`, s);
        });
        newCats.forEach((c, i) => {
            const cr = formik.values.rounds.filter(r => String(r.categoryId) === String(c.id));
            if (cr.length) {
                const s = cr.every(r => getStatus(r.submissionOpen, r.publishResultAt) === 'CLOSED') ? 'CLOSED' : 'ACTIVED';
                if (c.status !== s) { newCats[i].status = s; catsUpd = true; }
            }
        });
        if (catsUpd) formik.setFieldValue('categories', newCats);
    }, [formik.values.rounds, formik.values.registrationStart, formik.values.contestEndAt, selectedContestId]);

    const handleSelect = async (id) => {
        formik.setStatus({}); setActiveTab('core'); setDeletedCategories([]); setActiveCategoryIdx(0);
        if (!id) return setSelectedContestId(''), formik.resetForm();
        setSelectedContestId(id); setIsLoading(true);
        try {
            const data = await fetchData(`${API_BASE}/admin/contests/${id}`);
            if (!data) return formik.setStatus({ error: 'Fetch failed' });

            const fCats = data.tracks?.length ? data.tracks.map((t, i) => ({ id: t.id || -(i + 1), trackName: t.categoryName || '', trackDescription: t.trackDescription || '', guidelineUrl: t.guidelineUrl || '', status: t.status || 'ACTIVED' })) : [{ id: -1, trackName: '', trackDescription: '', guidelineUrl: '', status: 'ACTIVED' }];
            const rm = new Map();
            data.tracks?.forEach((t, i) => {
                const cid = t.id || fCats.find(c => c.trackName === t.categoryName)?.id || -(i + 1);
                t.rounds?.forEach(r => {
                    const rid = r.roundId || r.id;
                    if (rid && !rm.has(String(rid))) {
                        const sl = d => d ? d.slice(0, 16) : '';
                        rm.set(String(rid), { id: rid, phaseName: r.roundName || r.phaseName || '', categoryId: cid, submissionOpen: sl(r.submissionOpen), submissionDeadline: sl(r.submissionDeadline), gradingDeadlineAt: sl(r.gradingDeadlineAt), reviewCalibrationAt: sl(r.reviewCalibrationAt), publishResultAt: sl(r.publishResultAt), state: r.status || r.state || 'UPCOMING', roundFormat: r.roundFormat || '', submissionRequirements: r.submissionRequirements ? r.submissionRequirements.split(',') : [] });
                        if (r.submissionRequirements) r.submissionRequirements.split(',').forEach(rq => setAvailableSubReqs(p => p.some(x => x.value === rq) ? p : [...p, { value: rq, label: rq }]));
                        if (r.roundFormat) setAvailableRoundFormats(p => p.includes(r.roundFormat) ? p : [...p, r.roundFormat]);
                    }
                });
            });
            const fRounds = rm.size ? Array.from(rm.values()) : fCats.map((c, i) => ({ id: -(i + 1), phaseName: `Round ${i + 1}`, categoryId: c.id, submissionOpen: '', submissionDeadline: '', gradingDeadlineAt: '', reviewCalibrationAt: '', publishResultAt: '', state: 'UPCOMING', submissionRequirements: [], roundFormat: '' }));
            const pj = (s, fb) => { try { return s ? JSON.parse(s) : fb; } catch { return fb; } };

            formik.setValues({ ...data, term: data.term || 'Auto setup', year: data.year || new Date().getFullYear(), maximumAllowedTeams: data.maximumAllowedTeams || 100, minTeamMembers: data.minTeamMembers || 3, maxTeamMembers: data.maxTeamMembers || 5, categories: fCats, rounds: fRounds, registrationStart: data.registrationStart?.slice(0, 10) || '', registrationEnd: data.registrationEnd?.slice(0, 10) || '', contestEndAt: data.contestEndAt?.slice(0, 16) || '', contestStartAt: data.contestStartAt?.slice(0, 16) || '', publishedAt: data.publishedAt?.slice(0, 16) || '', complianceRules: pj(data.complianceRules, [{ rule: '', penalty: '' }]), tieredPrizeStructures: pj(data.tieredPrizeStructures, [{ rank: '', amount: '' }]) });
        } catch { formik.setStatus({ error: 'Connection failed' }); } finally { setIsLoading(false); }
    };

    const handleSmartDate = (e, rIdx) => {
        const { name, value } = e.target;
        const field = name.split('.').pop();
        const old = originalDates[`${rIdx}_${field}`] || formik.values.rounds[rIdx]?.[field];
        formik.handleChange(e);
        if (!value) return;

        const shift = (b, m) => toISO(new Date(new Date(b).getTime() + m * 60000));
        if (old && value !== old) {
            const d = new Date(value) - new Date(old);
            if (d !== 0) setShiftBanner({ roundIdx: rIdx, delta: d, field, newVal: value });
        } else {
            const r = formik.values.rounds[rIdx];
            if (field === 'submissionDeadline' && !r?.gradingDeadlineAt) setSuggestions(p => ({ ...p, [`${rIdx}_gradingDeadlineAt`]: shift(value, 30) }));
            else if (field === 'gradingDeadlineAt' && !r?.reviewCalibrationAt) setSuggestions(p => ({ ...p, [`${rIdx}_reviewCalibrationAt`]: shift(value, 1440) }));
            else if (field === 'reviewCalibrationAt' && !r?.publishResultAt) setSuggestions(p => ({ ...p, [`${rIdx}_publishResultAt`]: shift(value, 30) }));
        }
        setSuggestions(p => { const n = { ...p }; delete n[`${rIdx}_${field}`]; return n; });
    };

    const applySuggest = (rIdx, f, v) => {
        formik.setFieldValue(`rounds[${rIdx}].${f}`, v);
        const s = (b, m) => toISO(new Date(new Date(b).getTime() + m * 60000));
        let nf, nm;
        if (f === 'submissionDeadline' && !formik.values.rounds[rIdx]?.gradingDeadlineAt) { nf = 'gradingDeadlineAt'; nm = 30; }
        else if (f === 'gradingDeadlineAt' && !formik.values.rounds[rIdx]?.reviewCalibrationAt) { nf = 'reviewCalibrationAt'; nm = 1440; }
        else if (f === 'reviewCalibrationAt' && !formik.values.rounds[rIdx]?.publishResultAt) { nf = 'publishResultAt'; nm = 30; }
        setSuggestions(p => { const n = { ...p }; delete n[`${rIdx}_${f}`]; if (nf) n[`${rIdx}_${nf}`] = s(v, nm); return n; });
    };

    const getValItems = () => {
        const i = [], f = formik;
        const m = (c, msg, fld, tab) => { if (!c) i.push({ type: 'error', msg, field: fld, tab }); };
        const cores = ['name', 'theme', 'year', 'maximumAllowedTeams', 'minTeamMembers', 'maxTeamMembers', 'location', 'contestStartAt', 'publishedAt', 'registrationStart', 'registrationEnd', 'contestEndAt', 'universities', 'complianceRules', 'tieredPrizeStructures'];
        cores.forEach(k => { if (f.errors[k] && f.touched[k]) m(false, f.errors[k], k, 'core'); });
        f.errors.categories?.forEach((e, x) => e && f.touched.categories?.[x] && Object.keys(e).forEach(k => m(false, e[k], `categories[${x}].${k}`, 'categories')));
        f.errors.rounds?.forEach((e, x) => e && f.touched.rounds?.[x] && Object.keys(e).forEach(k => m(false, e[k], `rounds[${x}].${k}`, 'rounds')));
        return i;
    };
    const valItems = getValItems();

    const buildGantt = () => {
        const v = formik.values, s = v.registrationStart ? new Date(v.registrationStart).getTime() : null, e = v.contestEndAt ? new Date(v.contestEndAt).getTime() : null;
        if (!s || !e || e <= s) return { rows: [], maxRight: 100 };
        const tot = e - s, p = d => Math.max(0, Math.min(100, (d - s) / tot * 100)), rows = [];
        let mr = 100;
        if (v.registrationStart && v.registrationEnd) { const w = Math.max(3, p(new Date(v.registrationEnd).getTime()) - p(s)); rows.push({ rowLabel: 'Registration Phase', stages: [{ label: 'Registration', color: '#3b82f6', left: p(s), width: w }] }); mr = Math.max(mr, p(s) + w); }
        let rl = 0;
        v.rounds.forEach((r, i) => {
            const st = [], d = ['submissionOpen', 'submissionDeadline', 'gradingDeadlineAt', 'reviewCalibrationAt', 'publishResultAt'].map(k => r?.[k] ? new Date(r[k]).getTime() : null);
            let cl = Math.max(rl, p(d[0] || s));
            const add = (sX, eX, lbl, col) => { if (d[sX] && d[eX]) { cl = Math.max(cl, p(d[sX])); const w = Math.max(3, p(d[eX]) - p(d[sX])); st.push({ label: lbl, color: col, left: cl, width: w }); cl += w; } };
            add(0, 1, 'Submission', '#8b5cf6'); add(1, 2, 'Grading', '#f97316'); add(2, 3, 'Review', '#f59e0b'); add(r?.reviewCalibrationAt ? 3 : 2, 4, 'Publish', '#22c55e');
            rl = cl; mr = Math.max(mr, cl);
            rows.push({ rowLabel: `${v.categories.find(c => String(c.id) === String(r.categoryId))?.trackName || ''} - ${r.phaseName || ('Round ' + (i + 1))}`, stages: st });
        });
        const sc = Math.max(100, mr + 5);
        rows.forEach(r => r.stages.forEach(st => { st.left = (st.left / sc) * 100; st.width = (st.width / sc) * 100; }));
        return { rows, mr, scale: sc };
    };

    if (initialLoading) return <div className="hc-root"><div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>{[80, 60, 70, 55].map((w, i) => <div key={i} className="hc-skeleton" style={{ height: 38, width: `${w}%`, borderRadius: 6 }} />)}</div></div>;

    const b = getBounds(formik.values.term, formik.values.year);
    const badgeErr = tab => { const c = valItems.filter(v => v.tab === tab).length; return c > 0 ? <div className="hc-val-dot error"><Icon name="error" size={12} /> {c} issues</div> : <div className="hc-val-dot ok"><Icon name="check" size={12} /> Valid</div>; };

    return (
        <div className="hc-root">
            <FormikProvider value={formik}><Form onSubmit={formik.handleSubmit} style={{ display: 'contents' }}>
                <div className="hc-topbar">
                    <div className="hc-topbar-left">
                        <Icon name="setup" color="#2563eb" size={20} />
                        <h1>Season Setup {selectedContestId && <>- {formik.values.name} <span className={`status-badge ${formik.values.status.toLowerCase()}`}>{formik.values.status}</span></>}</h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {selectedContestId && <button type="button" className="hc-btn-save" onClick={() => handleSelect('')} style={{ padding: '8px 16px', width: 'auto' }}>+ Create New Contest</button>}
                        <div className="hc-search-wrap">
                            <span className="hc-search-icon"><Icon name="search" size={14} /></span>
                            <input placeholder="Search contest..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                            {searchQuery && (
                                <div className="hc-search-dropdown">
                                    {contests.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || `${c.season} ${c.year}`.toLowerCase().includes(searchQuery.toLowerCase())).map(c => {
                                        const st = getStatus(c.registrationStart, c.contestEndAt);
                                        return (
                                            <div key={c.id} className={`hc-search-item${selectedContestId === c.id ? ' selected' : ''}`} onClick={() => { handleSelect(c.id); setSearchQuery(''); }}>
                                                <div><div className="hc-search-name">{c.name}</div><div className="hc-search-season">{c.season} {c.year}</div></div>
                                                <div className={`hc-badge ${st}`}>{st}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hc-body">
                    <div className="hc-sidebar">
                        <div className="hc-sidebar-scroll">
                            {[{ id: 'core', icon: 'core', title: 'Contest Information', desc: `${formik.values.name || 'Unnamed Event'} • ${formik.values.term} ${formik.values.year}` },
                                { id: 'categories', icon: 'category', title: 'Categories Config', desc: `${formik.values.categories.length} categories configured` },
                                { id: 'rounds', icon: 'round', title: 'Rounds Config', desc: `${formik.values.rounds.length} rounds configured` }].map(t => (
                                <div key={t.id} className={`hc-nav-card${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
                                    <div className="hc-nav-card-header"><h3 className="hc-nav-card-title"><Icon name={t.icon} size={18} /> {t.title}</h3>{badgeErr(t.id)}</div>
                                    <p className="hc-nav-card-desc">{t.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div className="hc-sidebar-footer">
                            {valItems.length > 0 && <div className="hc-save-warning"><Icon name="error" size={14} /> Please fix issues before saving</div>}
                            {formik.status?.error && <div className="hc-save-warning err"><Icon name="error" size={14} /> {formik.status.error}</div>}
                            {formik.status?.success && <div className="hc-save-warning succ"><Icon name="check" size={14} /> {formik.status.success}</div>}
                            <button type="submit" className="hc-btn-save" disabled={!formik.isValid || valItems.length > 0 || isLoading || isClosedContest}>{formik.isSubmitting ? 'Saving...' : 'Save Configuration'}</button>
                        </div>
                    </div>

                    <div className="hc-content">
                        {activeTab === 'core' && (
                            <div className="hc-tab-scroll">
                                <h2 className="hc-content-title">Contest Information</h2><p className="hc-content-subtitle">Define the foundational properties of the event</p>
                                <div className="hc-section">
                                    <div className="hc-section-header"><Icon name="info" size={18} /> Basic Information</div>
                                    <div className="hc-grid-2">
                                        <FormInput formik={formik} name="name" label="Event Name" req disabled={isClosedContest} placeholder="e.g. FPT Hackathon" />
                                        <FormInput formik={formik} name="theme" label="Theme" req disabled={isClosedContest} />
                                    </div>
                                    <div className="hc-grid-4" style={{ marginTop: 20 }}>
                                        <FormInput formik={formik} name="term" label="Term" disabled />
                                        <FormInput formik={formik} name="year" label="Year" disabled />
                                        <div style={{ gridColumn: 'span 2' }}><FormInput formik={formik} name="location" label="Location" req disabled={isClosedContest} /></div>
                                    </div>
                                </div>
                                <div className="hc-section">
                                    <div className="hc-section-header"><Icon name="time" size={18} /> Dates & Time</div>
                                    <div className="hc-grid-2">
                                        <FormInput formik={formik} name="registrationStart" label="Registration Start" type="date" req disabled={isClosedContest} />
                                        <FormInput formik={formik} name="registrationEnd" label="Registration End" type="date" req disabled={isClosedContest} />
                                    </div>
                                    <div className="hc-grid-3" style={{ marginTop: 20 }}>
                                        <FormInput formik={formik} name="contestStartAt" label="Contest Start" type="datetime-local" req disabled={isClosedContest} onChange={e => { formik.handleChange(e); if (e.target.value) { formik.setFieldValue('term', new Date(e.target.value).getMonth() + 1 <= 4 ? 'SPRING' : new Date(e.target.value).getMonth() + 1 <= 8 ? 'SUMMER' : 'FALL'); formik.setFieldValue('year', new Date(e.target.value).getFullYear()); } }} />
                                        <FormInput formik={formik} name="contestEndAt" label="Contest End" type="datetime-local" req disabled={isClosedContest} />
                                        <FormInput formik={formik} name="publishedAt" label="Publish Info At" type="datetime-local" req disabled={isClosedContest} />
                                    </div>
                                </div>
                                <div className="hc-section">
                                    <div className="hc-section-header"><Icon name="team" size={18} /> Team & Participant Setup</div>
                                    <div className="hc-grid-3">
                                        <FormInput formik={formik} name="maximumAllowedTeams" label="Max Teams" type="number" req disabled={isClosedContest} />
                                        <FormInput formik={formik} name="minTeamMembers" label="Min Members" type="number" req disabled={isClosedContest} />
                                        <FormInput formik={formik} name="maxTeamMembers" label="Max Members" type="number" req disabled={isClosedContest} />
                                    </div>
                                    <div className="hc-field" style={{ marginTop: 20 }}>
                                        <label className="hc-label">Allowed Universities <span>*</span></label>
                                        <div className="hc-checklist-grid" style={{ marginTop: 12 }}>
                                            {allUniversities.map(u => (
                                                <label key={u.id} className="hc-check-item">
                                                    <input type="checkbox" name="universities" value={u.name} checked={formik.values.universities.includes(u.name)} disabled={isClosedContest} onChange={e => formik.setFieldValue('universities', e.target.checked ? [...formik.values.universities, u.name] : formik.values.universities.filter(x => x !== u.name))} /> {u.name}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="hc-section">
                                    <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="rule" size={18} /> Compliance Rules</div>
                                        {!isClosedContest && <button type="button" className="hc-list-add-btn" onClick={() => formik.setFieldValue('complianceRules', [...formik.values.complianceRules, { rule: '', penalty: '' }])}>+ Add Rule</button>}
                                    </div>
                                    {formik.values.complianceRules.map((item, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 12 }}>
                                            <FormTextArea formik={formik} name={`complianceRules[${idx}].rule`} disabled={isClosedContest} placeholder={`Rule ${idx + 1}`} rows={2} />
                                            <FormTextArea formik={formik} name={`complianceRules[${idx}].penalty`} disabled={isClosedContest} placeholder="Penalty Details" rows={2} />
                                            {formik.values.complianceRules.length > 1 && !isClosedContest && <button type="button" onClick={() => formik.setFieldValue('complianceRules', formik.values.complianceRules.filter((_, i) => i !== idx))} className="hc-remove-btn"><Icon name="remove" /></button>}
                                        </div>
                                    ))}
                                </div>
                                <div className="hc-section">
                                    <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="prize" size={18} /> Prize Structure</div>
                                        {!isClosedContest && <button type="button" className="hc-list-add-btn" onClick={() => formik.setFieldValue('tieredPrizeStructures', [...formik.values.tieredPrizeStructures, { rank: '', amount: '' }])}>+ Add Prize</button>}
                                    </div>
                                    {formik.values.tieredPrizeStructures.map((p, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, marginBottom: 12 }}>
                                            <FormInput formik={formik} name={`tieredPrizeStructures[${idx}].rank`} disabled={isClosedContest} placeholder="Rank" />
                                            <FormInput formik={formik} name={`tieredPrizeStructures[${idx}].amount`} disabled={isClosedContest} placeholder="Amount" />
                                            {formik.values.tieredPrizeStructures.length > 1 && !isClosedContest && <button type="button" onClick={() => formik.setFieldValue('tieredPrizeStructures', formik.values.tieredPrizeStructures.filter((_, i) => i !== idx))} className="hc-remove-btn"><Icon name="remove" /></button>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'categories' && (
                            <div className="hc-tab-scroll">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                    <div><h2 className="hc-content-title">Categories Config</h2><p className="hc-content-subtitle">Define tracks or categories</p></div>
                                    {!isClosedContest && <button type="button" className="hc-btn-primary" onClick={() => formik.setFieldValue('categories', [...formik.values.categories, { id: -Date.now(), trackName: '', trackDescription: '', guidelineUrl: '', status: selectedContestId ? 'ACTIVED' : 'UNSAVED' }])}><Icon name="plus" /> Add Category</button>}
                                </div>
                                {!formik.values.categories.length ? <div className="hc-empty"><Icon name="category" size={48} /><h3>No categories</h3></div> : formik.values.categories.map((cat, idx) => (
                                    <div key={cat.id} className="hc-section" style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                        <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="catItem" color="#3b82f6" size={18} /> {cat.trackName || `Category ${idx + 1}`}</div>
                                            {!isClosedContest && formik.values.categories.length > 1 && (
                                                <button type="button" className="hc-btn-danger" disabled={formik.values.rounds.some(r => String(r.categoryId) === String(cat.id))} onClick={() => {
                                                    if (cat.id > 0) setDeletedCategories(p => [...p, cat]);
                                                    formik.setFieldValue('categories', formik.values.categories.filter((_, i) => i !== idx));
                                                    formik.setFieldValue('rounds', formik.values.rounds.map(r => String(r.categoryId) === String(cat.id) ? { ...r, categoryId: '' } : r));
                                                }}>Delete</button>
                                            )}
                                        </div>
                                        <div className="hc-grid-1-2" style={{ marginBottom: 16 }}>
                                            <FormInput formik={formik} name={`categories[${idx}].trackName`} label="Category Name" req disabled={isClosedContest} />
                                            <FormInput formik={formik} name={`categories[${idx}].guidelineUrl`} label="Guideline URL" disabled={isClosedContest} />
                                        </div>
                                        <FormTextArea formik={formik} name={`categories[${idx}].trackDescription`} label="Description" disabled={isClosedContest} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'rounds' && (
                            <div className="hc-tab-scroll" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '32px 40px 24px', flexShrink: 0, background: '#fff' }}>
                                    <div style={{ marginBottom: 24 }}><h2 className="hc-content-title">Rounds Config</h2><p className="hc-content-subtitle" style={{ borderBottom: 'none', paddingBottom: 0 }}>Configure the timeline</p></div>
                                    <div className="hc-round-nav" style={{ marginBottom: 0 }}>
                                        {formik.values.rounds.map((r, i) => (
                                            <button key={r.id} type="button" className={`hc-round-tab${activeCategoryIdx === i ? ' active' : ''}`} style={{ background: r.state === 'ACTIVED' ? '#dcfce7' : r.state === 'CLOSED' ? '#f1f5f9' : '#ffedd5', color: r.state === 'ACTIVED' ? '#166534' : r.state === 'CLOSED' ? '#475569' : '#c2410c' }} onClick={() => setActiveCategoryIdx(i)}>{r.phaseName || `Round ${i + 1}`}</button>
                                        ))}
                                        {!isClosedContest && <button type="button" className="hc-round-tab" onClick={() => { formik.setFieldValue('rounds', [...formik.values.rounds, { id: -(Date.now() + 1), phaseName: `Round ${formik.values.rounds.length + 1}`, categoryId: '', submissionOpen: '', submissionDeadline: '', gradingDeadlineAt: '', reviewCalibrationAt: '', publishResultAt: '', state: selectedContestId ? 'UPCOMING' : 'UNSAVED', submissionRequirements: [], roundFormat: '' }]); setActiveCategoryIdx(formik.values.rounds.length); }} style={{ borderStyle: 'dashed', background: 'transparent', color: '#3b82f6' }}>+ Add Round</button>}
                                    </div>
                                </div>
                                <div style={{ padding: '0 40px 32px', background: '#fff', flex: '1 0 auto' }}>
                                    {!formik.values.rounds.length ? <div className="hc-empty"><Icon name="round" size={48} /><h3>No rounds</h3></div> : (() => {
                                        const rIdx = Math.min(activeCategoryIdx, Math.max(0, formik.values.rounds.length - 1));
                                        const r = formik.values.rounds[rIdx];
                                        if (!r) return null;
                                        return (
                                            <div key={r.id} style={{ marginBottom: 32 }}>
                                                <div className="hc-section-header" style={{ justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <Icon name="time" color="#2563eb" size={20} /> Configuring {r.phaseName}
                                                        {r.state && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 12, background: r.state === 'ACTIVED' ? '#dcfce7' : r.state === 'CLOSED' ? '#f1f5f9' : '#ffedd5', color: r.state === 'ACTIVED' ? '#166534' : r.state === 'CLOSED' ? '#475569' : '#c2410c', fontWeight: 600, marginLeft: 8 }}>{r.state}</span>}
                                                    </div>
                                                    {!isClosedContest && rIdx !== 0 && r.state === 'UPCOMING' && <button type="button" className="hc-btn-danger" onClick={() => { formik.setFieldValue('rounds', formik.values.rounds.filter((_, i) => i !== rIdx)); setActiveCategoryIdx(Math.max(0, rIdx - 1)); }}>Delete Round</button>}
                                                </div>
                                                <div className="hc-grid-2" style={{ marginBottom: 20 }}>
                                                    <FormInput formik={formik} name={`rounds[${rIdx}].phaseName`} label="Round Name" req disabled={isClosedContest} />
                                                    <FormSelect formik={formik} name={`rounds[${rIdx}].categoryId`} label="Category" req disabled={isClosedContest} options={formik.values.categories.map(c => ({ value: c.id, label: c.trackName, disabled: formik.values.rounds.some(other => other.id !== r.id && String(other.categoryId) === String(c.id)) }))} />
                                                </div>
                                                <div style={{ marginBottom: 20 }}>
                                                    <div className="hc-grid-2">
                                                        <FormSelect formik={formik} name={`rounds[${rIdx}].roundFormat`} label="Format" req disabled={isClosedContest} options={availableRoundFormats} />
                                                        <div className="hc-field">
                                                            <label className="hc-label">Submission Requirements <span>*</span></label>
                                                            <div className="hc-checklist-grid">
                                                                {availableSubReqs.map(rq => (
                                                                    <label key={rq.value} className="hc-check-item">
                                                                        <input type="checkbox" checked={Array.isArray(r.submissionRequirements) && r.submissionRequirements.includes(rq.value)} onChange={e => formik.setFieldValue(`rounds[${rIdx}].submissionRequirements`, e.target.checked ? [...r.submissionRequirements, rq.value] : r.submissionRequirements.filter(x => x !== rq.value))} disabled={isClosedContest} /> {rq.label}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                            {getIn(formik.touched, `rounds[${rIdx}].submissionRequirements`) && getIn(formik.errors, `rounds[${rIdx}].submissionRequirements`) && <div className="hc-err"><Icon name="error" size={12} /> {getIn(formik.errors, `rounds[${rIdx}].submissionRequirements`)}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                                {shiftBanner && shiftBanner.roundIdx === rIdx && (
                                                    <div className="hc-shift-banner">
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="error" /> Adjust subsequent milestones with the same delta?</span>
                                                        <div>
                                                            <button type="button" className="hc-shift-btn move" onClick={() => { const fld = ['submissionOpen', 'submissionDeadline', 'gradingDeadlineAt', 'reviewCalibrationAt', 'publishResultAt']; const sId = fld.indexOf(shiftBanner.field) + 1; const nR = [...formik.values.rounds]; for(let i=sId; i<fld.length; i++) if(nR[rIdx][fld[i]]) nR[rIdx][fld[i]] = toISO(new Date(new Date(nR[rIdx][fld[i]]).getTime() + shiftBanner.delta)); formik.setFieldValue('rounds', nR); setShiftBanner(null); }}>Move All</button>
                                                            <button type="button" className="hc-shift-btn keep" onClick={() => setShiftBanner(null)}>Keep</button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="hc-grid-3">
                                                    {['submissionOpen', 'submissionDeadline', 'gradingDeadlineAt', 'reviewCalibrationAt', 'publishResultAt'].map(fld => (
                                                        <div className="hc-field" key={fld}>
                                                            <label className="hc-label">{fld.charAt(0).toUpperCase() + fld.replace(/At$|AtUrgent$/, '').slice(1).replace(/([A-Z])/g, ' $1')} <span>*</span></label>
                                                            <input type="datetime-local" className={`hc-input${getIn(formik.touched, `rounds[${rIdx}].${fld}`) && getIn(formik.errors, `rounds[${rIdx}].${fld}`) ? ' is-invalid' : ''}`} name={`rounds[${rIdx}].${fld}`} value={r[fld] || ''} onChange={e => handleSmartDate(e, rIdx)} onFocus={() => setOriginalDates(p => ({ ...p, [`${rIdx}_${fld}`]: r[fld] }))} min={fld === 'submissionOpen' ? (formik.values.registrationEnd ? `${formik.values.registrationEnd}T00:00` : b.min) : (r.submissionOpen || b.min)} max={formik.values.contestEndAt || b.max} disabled={isClosedContest} />
                                                            {getIn(formik.touched, `rounds[${rIdx}].${fld}`) && getIn(formik.errors, `rounds[${rIdx}].${fld}`) && <div className="hc-err"><Icon name="error" size={12} /> {getIn(formik.errors, `rounds[${rIdx}].${fld}`)}</div>}
                                                            {suggestions[`${rIdx}_${fld}`] && <div className="hc-suggest-banner"><Icon name="suggest" size={12} /> Suggested: {formatDate(suggestions[`${rIdx}_${fld}`])} <button type="button" className="hc-suggest-apply" onClick={() => applySuggest(rIdx, fld, suggestions[`${rIdx}_${fld}`])}>Apply</button></div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                {formik.values.rounds.length > 0 && (
                                    <div style={{ flexShrink: 0, padding: '32px 40px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                        <div className="hc-timeline-card" style={{ marginTop: 0 }}>
                                            <div className="hc-timeline-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="round" color="#2563eb" size={18} /> Timeline Preview</div>
                                            </div>
                                            <div className="hc-timeline-body">
                                                {!buildGantt().rows.length ? <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 0' }}>Enter dates to see timeline</div> : (
                                                    <div>
                                                        <div className="hc-timeline-track" style={{ width: `${buildGantt().scale}%` }}>
                                                            {buildGantt().rows.map((row, i) => (
                                                                <div key={i} className="hc-timeline-row">
                                                                    <div className="hc-timeline-label">{row.rowLabel}</div>
                                                                    <div className="hc-timeline-outer">
                                                                        {row.stages.map((bar, j) => <div key={j} className="hc-timeline-bar" style={{ left: `${bar.left}%`, width: `${bar.width}%`, background: bar.color }}><span className="hc-timeline-bar-label">{bar.label}</span></div>)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="hc-timeline-date-labels"><span>{formatDate(formik.values.registrationStart)}</span><span>{formatDate(formik.values.contestEndAt)}</span></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {valItems.length > 0 && (
                            <div className="hc-val-summary">
                                <div className="hc-val-summary-header"><Icon name="error" color="#dc2626" size={16} /> Validation Summary</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {valItems.map((item, i) => <div key={i} className={`hc-val-item ${item.type}`} onClick={() => { setActiveTab(item.tab); if (item.tab === 'rounds' && item.field.match(/rounds\[(\d+)\]/)) setActiveCategoryIdx(parseInt(item.field.match(/rounds\[(\d+)\]/)[1])); setTimeout(() => { const el = document.querySelector(`[name="${item.field}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); } }, 150); }}><Icon name="error" size={14} /> {item.msg}</div>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Form></FormikProvider>
        </div>
    );
}
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
        </div>
    );
}
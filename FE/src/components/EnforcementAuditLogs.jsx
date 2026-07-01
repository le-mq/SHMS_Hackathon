import { useState, useEffect } from 'react';
import './EnforcementAuditLogs.css';

const ACTION_TYPE_STYLES = {
    DISQUALIFICATION: 'at-disqualify',
    SCORE_REVOCATION: 'at-revoke',
    SYSTEM_CONFIG: 'at-config',
    ACCESS_GRANT: 'at-access',
};

const ACTION_TYPE_LABELS = {
    DISQUALIFICATION: 'DISQUALIFICATION',
    SCORE_REVOCATION: 'SCORE REVOCATION',
    SYSTEM_CONFIG: 'SYSTEM CONFIG',
    ACCESS_GRANT: 'ACCESS GRANT',
};

const EnforcementAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [form, setForm] = useState({ targetEntityId: '', actionType: 'DISQUALIFICATION', justificationReason: '' });
    const [isExecuting, setIsExecuting] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch(`${API_BASE}/admin/audit-logs`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();

                    const auditLogs = data.logs || data.data || data.content || data;

                    if (Array.isArray(auditLogs)) {
                        setLogs(auditLogs.map(l => ({
                            id: l.id || l.logId,
                            actionType: l.actionType,
                            target: l.target || l.targetEntityId,
                            timestamp: l.timestamp || l.createdAt,
                            performer: l.performer || l.performedBy || l.createdBy,
                            justification: l.justification || l.justificationReason
                        })));
                    }
                }
            } catch {
                setFormError('Cannot load audit logs.');
            }
        };
        fetchLogs();
    }, []);

    const handleExecute = async () => {
        if (!form.targetEntityId.trim()) {
            setFormError('Team ID is required.'); return;
        }
        if (form.justificationReason.trim().length < 20) {
            setFormError('Justification must be at least 20 characters (BR-AUD-01).'); return;
        }
        setFormError('');
        setIsExecuting(true);
        try {
            const token = localStorage.getItem('shms_token');
            const response = await fetch('http://localhost:8080/api/v1/admin/audit-logs/enforcement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(form)
            });

            if (!response.ok) {
                throw new Error('Failed to execute enforcement action.');
            }

            setForm({ targetEntityId: '', actionType: 'DISQUALIFICATION', justificationReason: '' });
            alert('Enforcement action executed and logged successfully.');
            window.location.reload();
        } catch {
            setFormError('Cannot execute enforcement action. Please try again.');
        }
        finally {
            setIsExecuting(false);
        }
    };

    const handleExportCsv = async () => {
        try {
            const token = localStorage.getItem('shms_token');

            const response = await fetch('http://localhost:8080/api/v1/admin/audit-logs/export-csv', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Export CSV failed.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'audit-logs.csv';
            a.click();

            window.URL.revokeObjectURL(url);
        } catch {
            setFormError('Cannot export CSV. Please try again.');
        }
    };

    return (
        <div className="audit-container">
            <div className="audit-content">
                <div className="audit-page-header">
                    <h1 className="audit-title">Compliance Enforcement & Audit Logs</h1>
                    <p className="audit-subtitle">Monitor system integrity and execute administrative disciplinary measures across the hackathon ecosystem.</p>
                </div>

                <div className="audit-grid">
                    {/* Left: Enforcement Form */}
                    <div className="enforcement-panel">
                        <h2 className="enforcement-title">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Disciplinary Enforcement
                        </h2>
                        <div className="enforcement-divider" />

                        <div className="ef-field">
                            <label className="ef-label">Team ID</label>
                            <input
                                type="text"
                                className="ef-input"
                                placeholder="e.g., TEAM-2026-084"
                                value={form.targetEntityId}
                                onChange={e => setForm(f => ({ ...f, targetEntityId: e.target.value }))}
                            />
                        </div>

                        <div className="ef-field">
                            <label className="ef-label">Action Selection</label>
                            <div className="ef-select-wrap">
                                <select
                                    className="ef-select"
                                    value={form.actionType}
                                    onChange={e => setForm(f => ({ ...f, actionType: e.target.value }))}
                                >
                                    <option value="DISQUALIFICATION">Disqualify Team</option>
                                    <option value="SCORE_REVOCATION">Revoke Score</option>
                                    <option value="SYSTEM_CONFIG">System Config Change</option>
                                    <option value="ACCESS_GRANT">Grant/Revoke Access</option>
                                </select>
                                <svg className="select-chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* BR-AUD-01: Mandatory justification */}
                        <div className="ef-field">
                            <label className="ef-label">
                                Justification Reason <span className="required-star">*</span>
                            </label>
                            <textarea
                                className="ef-textarea"
                                placeholder="Detailed justification for this enforcement action..."
                                value={form.justificationReason}
                                onChange={e => setForm(f => ({ ...f, justificationReason: e.target.value }))}
                            />
                            {formError && <p className="ef-error">{formError}</p>}
                        </div>

                        <button
                            className="execute-btn"
                            onClick={handleExecute}
                            disabled={isExecuting}
                        >
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            {isExecuting ? 'Executing...' : 'Execute Disciplinary Action'}
                        </button>

                        <div className="enforcement-protocol">
                            <div className="protocol-header">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Enforcement Protocol
                            </div>
                            <p>All enforcement actions are final once executed. Ensure that the justification provided aligns with the Official Competition Rulebook Section IV: Integrity & Conduct.</p>
                        </div>
                    </div>

                    {/* Right: Audit Stream */}
                    <div className="audit-stream-panel">
                        <div className="audit-stream-header">
                            <h2 className="audit-stream-title">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                System Audit Stream
                            </h2>
                            <div className="audit-actions">
                                <button className="audit-action-btn" onClick={handleExportCsv}>
                                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Log ID</th>
                                    <th>Action Type</th>
                                    <th>Target Entity</th>
                                    <th>Timestamp</th>
                                    <th>Performer</th>
                                    <th>Justification</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log, idx) => (
                                    <tr key={idx}>
                                        <td className="log-id">{log.id}</td>
                                        <td>
                                            <span className={`action-type-badge ${ACTION_TYPE_STYLES[log.actionType] || 'at-config'}`}>
                                                {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                                            </span>
                                        </td>
                                        <td className="target-entity">{log.target}</td>
                                        <td className="log-timestamp">
                                            {String(log.timestamp || '-').split('\n').map((l, i) => (
                                                <div key={i}>{l}</div>
                                            ))}
                                        </td>
                                        <td className="log-performer">
                                            {String(log.timestamp || '-').split('\n').map((l, i) => (
                                                <div key={i}>{l}</div>
                                            ))}
                                        </td>
                                        <td className="log-justification">{log.justification}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="audit-table-footer">
                            <span>Showing {logs.length} logs</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button className="page-btn">‹</button>
                                <span style={{ fontSize: 13, color: '#475569' }}>Page 1</span>
                                <button className="page-btn">›</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnforcementAuditLogs;

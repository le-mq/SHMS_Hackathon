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
    const [selectedLog, setSelectedLog] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(15);
    const [filters, setFilters] = useState({ actionType: '', performer: '', date: '' });
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const token = localStorage.getItem('shms_token');
                const response = await fetch('http://localhost:8080/api/v1/admin/audit-logs', {
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
                            actionType: l.action || l.actionType || 'UNKNOWN',
                            target: l.entityName ? `${l.entityType ? l.entityType + ' ' : ''}${l.entityName}` : (l.entityType ? `${l.entityType} ${l.entityId || ''}` : (l.target || l.targetEntityId || 'N/A')),
                            timestamp: l.performedAt || l.timestamp || l.createdAt,
                            performer: (l.user && (l.user.email || l.user.username)) || l.performer || l.performedBy || l.createdBy || 'System',
                            justification: l.reason || l.justification || l.justificationReason || '',
                            oldValue: l.oldValue || l.oldValues,
                            newValue: l.newValue || l.newValues
                        })));
                    }
                }
            } catch (err) {
                console.error('Cannot load audit logs.', err);
            }
        };
        fetchLogs();
    }, []);
    const filteredLogs = logs.filter(log => {
        let match = true;
        if (filters.actionType && log.actionType !== filters.actionType) match = false;
        if (filters.performer && !log.performer.toLowerCase().includes(filters.performer.toLowerCase())) match = false;
        if (filters.date) {
            const logDate = new Date(log.timestamp).toISOString().split('T')[0];
            if (logDate !== filters.date) match = false;
        }
        return match;
    });

    const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
    const currentLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
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
        } catch (err) {
            console.error('Cannot export CSV.', err);
            alert('Cannot export CSV. Please try again.');
        }
    };

    return (
        <div className="audit-container">
            <div className="audit-content">
                <div className="audit-grid">
                    {/* Top: Search Filters */}
                    <div className="enforcement-panel">
                        <h2 className="enforcement-title">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>Search Audit Logs
                        </h2>
                        <div className="enforcement-divider" />
                        <div className="enforcement-filters">
                            <div className="ef-field">
                                <label className="ef-label">Action Type</label>
                                <div className="ef-select-wrap">
                                    <select className="ef-select" value={filters.actionType}
                                            onChange={e => { setFilters(f => ({ ...f, actionType: e.target.value })); setCurrentPage(1); }}
                                    >
                                        <option value="">All Types</option>
                                        <option value="DISQUALIFICATION">Disqualify Team</option>
                                        <option value="SCORE_REVOCATION">Revoke Score</option>
                                        <option value="SYSTEM_CONFIG">System Config Change</option>
                                        <option value="ACCESS_GRANT">Grant/Revoke Access</option>
                                        <option value="UPDATE_CATEGORY">Update Category</option>
                                        <option value="UPDATE_CONTEST">Update Contest</option>
                                        <option value="PUBLISH_LEADERBOARD">Publish Leaderboard</option>
                                        <option value="ALLOCATE_EXPERT">Allocate Expert</option>
                                    </select>
                                    <svg className="select-chevron" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ef-field">
                                <label className="ef-label">Performer</label>
                                <input type="text" className="ef-input" placeholder="e.g. admin@gmail.com"
                                       value={filters.performer}
                                       onChange={e => { setFilters(f => ({ ...f, performer: e.target.value })); setCurrentPage(1); }}
                                />
                            </div>
                            <div className="ef-field">
                                <label className="ef-label">Date</label>
                                <input type="date" className="ef-input" value={filters.date}
                                       onChange={e => { setFilters(f => ({ ...f, date: e.target.value })); setCurrentPage(1); }}
                                />
                            </div>
                            <button className="execute-btn"
                                    onClick={() => { setFilters({ actionType: '', performer: '', date: '' }); setCurrentPage(1); }}
                                    style={{ background: '#e2e8f0', color: '#0f172a' }}
                            >Clear Filters</button>
                        </div>
                    </div>
                    {/* Right: Audit Stream */}
                    <div className="audit-stream-panel">
                        <div className="audit-stream-header">
                            <h2 className="audit-stream-title">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>System Audit Stream
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

                        <div style={{ overflowX: 'auto' }}>
                            <table className="audit-table">
                                <thead>
                                <tr>
                                    <th>Log ID</th>
                                    <th>Action Type</th>
                                    <th>Entity Name</th>
                                    <th>Timestamp</th>
                                    <th>Performer</th>
                                    <th>Details</th>
                                </tr>
                                </thead>
                                <tbody>
                                {currentLogs.map((log, idx) => (
                                    <tr key={idx}>
                                        <td className="log-id">{log.id}</td>
                                        <td>
                                                <span className={`action-type-badge ${ACTION_TYPE_STYLES[log.actionType] || 'at-config'}`}>
                                                    {ACTION_TYPE_LABELS[log.actionType] || log.actionType}
                                                </span>
                                        </td>
                                        <td className="target-entity">{log.target}</td>
                                        <td className="log-timestamp" style={{ whiteSpace: 'nowrap' }}>
                                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                                        </td>
                                        <td className="log-performer" style={{ whiteSpace: 'nowrap' }}>
                                            {log.performer}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <button onClick={() => setSelectedLog(log)} style={{ padding: '6px 12px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>View Details</button>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="audit-table-footer">
                            <span>Showing {currentLogs.length} of {filteredLogs.length} logs</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>‹</button>
                                <span style={{ fontSize: 13, color: '#475569' }}>Page {currentPage} of {totalPages}</span>
                                <button className="page-btn" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>›</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedLog && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '700px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#0f172a' }}>Audit Log Details</h2>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <p><strong>Action Type:</strong> {ACTION_TYPE_LABELS[selectedLog.actionType] || selectedLog.actionType}</p>
                            <p><strong>Entity Name:</strong> {selectedLog.target}</p>
                            <p><strong>Performer:</strong> {selectedLog.performer}</p>
                            <p><strong>Timestamp:</strong> {selectedLog.timestamp ? new Date(selectedLog.timestamp).toLocaleString() : '-'}</p>
                            <p><strong>Justification:</strong> {selectedLog.justification}</p>
                        </div>
                        <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Data Changes</h3>
                        {(() => {
                            let oldObj = selectedLog.oldValue, newObj = selectedLog.newValue;
                            try { if (typeof selectedLog.oldValue === 'string') oldObj = JSON.parse(selectedLog.oldValue); } catch(e){}
                            try { if (typeof selectedLog.newValue === 'string') newObj = JSON.parse(selectedLog.newValue); } catch(e){}

                            if (typeof oldObj === 'object' && oldObj !== null && typeof newObj === 'object' && newObj !== null) {
                                const keys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));
                                return (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                        <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Field</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Old Value</th>
                                            <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>New Value</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {keys.map(k => {
                                            const o = oldObj[k] !== undefined ? JSON.stringify(oldObj[k]) : 'N/A';
                                            const n = newObj[k] !== undefined ? JSON.stringify(newObj[k]) : 'N/A';
                                            const changed = o !== n;
                                            return (
                                                <tr key={k} style={{ background: changed ? '#fff1f2' : 'transparent', borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '10px', fontWeight: 600, color: '#475569' }}>{k}</td>
                                                    <td style={{ padding: '10px', color: changed ? '#be123c' : '#64748b' }}>{o}</td>
                                                    <td style={{ padding: '10px', color: changed ? '#15803d' : '#64748b' }}>{n}</td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                );
                            }
                            return (
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <div style={{ flex: 1, padding: '16px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', overflowX: 'auto' }}>
                                        <div style={{ fontWeight: 600, color: '#9f1239', marginBottom: '8px' }}>Old Value</div>
                                        <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: '13px' }}>{String(selectedLog.oldValue || 'N/A')}</div>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', overflowX: 'auto' }}>
                                        <div style={{ fontWeight: 600, color: '#166534', marginBottom: '8px' }}>New Value</div>
                                        <div style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: '13px' }}>{String(selectedLog.newValue || 'N/A')}</div>
                                    </div>
                                </div>
                            );
                        })()}
                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => setSelectedLog(null)} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>

    );
};

export default EnforcementAuditLogs;

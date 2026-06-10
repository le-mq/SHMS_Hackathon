import { useState } from 'react';
import './ProjectDeliverables.css';
import NavbarMentor from './NavbarMentor';

const ProjectDeliverables = () => {
    const [teams] = useState([
        { id: 1, name: 'Neural Titans', track: 'Artificial Intelligence', hasCode: true, hasPdf: true, hasDemo: true, status: 'READY', dsClass: 'ds-ready' },
        { id: 2, name: 'BlockChamps', track: 'Blockchain & Web3', hasCode: true, hasPdf: true, hasDemo: false, status: 'SUBMITTED', dsClass: 'ds-submit' },
        { id: 3, name: 'Cloud Force', track: 'Cloud Infrastructure', hasCode: true, hasPdf: true, hasDemo: true, status: 'READY', dsClass: 'ds-ready' },
        { id: 4, name: 'CyberSentinels', track: 'Cybersecurity', hasCode: true, hasPdf: false, hasDemo: false, status: 'INCOMPLETE', dsClass: 'ds-inc' }
    ]);

    return (
        <div className="deliverables-container">
            <NavbarMentor />

            <div className="deliverables-content">
                <div className="deliv-header">
                    <h1 className="deliv-title">Project Deliverables Monitor</h1>
                    <p className="deliv-subtitle">Real-time status of technical assets and project milestones from all participating teams.</p>
                </div>

                <div className="deliv-stats">
                    <div className="deliv-stat-card">
                        <div className="deliv-stat-label">TOTAL TEAMS</div>
                        <div className="deliv-stat-value">42</div>
                    </div>
                    <div className="deliv-stat-card">
                        <div className="deliv-stat-label">REPOSITORIES LINKED</div>
                        <div className="deliv-stat-value">38 / 42</div>
                    </div>
                    <div className="deliv-stat-card">
                        <div className="deliv-stat-label">SUBMISSIONS STATUS</div>
                        <div className="deliv-stat-value">90% Complete</div>
                    </div>
                </div>

                <div className="deliv-table-wrap">
                    <table className="deliv-table">
                        <thead>
                            <tr>
                                <th>TEAM NAME</th>
                                <th>SELECTED TRACK</th>
                                <th>GITHUB REPO</th>
                                <th>PRESENTATION SLIDES</th>
                                <th>LIVE DEMO</th>
                                <th>STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map(team => (
                                <tr key={team.id}>
                                    <td><div className="deliv-team-name">{team.name}</div></td>
                                    <td><div className="deliv-track">{team.track}</div></td>
                                    <td>
                                        {team.hasCode ? (
                                            <button className="btn-asset btn-code">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                                Code
                                            </button>
                                        ) : <span className="empty-txt">No repo linked</span>}
                                    </td>
                                    <td>
                                        {team.hasPdf ? (
                                            <button className="btn-asset btn-pdf">
                                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                View PDF
                                            </button>
                                        ) : <span className="empty-txt">No slides uploaded</span>}
                                    </td>
                                    <td>
                                        {team.hasDemo ? (
                                            <button className="btn-asset btn-demo">
                                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                                                Demo
                                            </button>
                                        ) : <span className="empty-txt">Pending deployment</span>}
                                    </td>
                                    <td>
                                        <span className={`deliv-status ${team.dsClass}`}>{team.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="deliv-footer">
                        <span>Showing 4 of 42 Teams</span>
                        <div className="deliv-pager">
                            <button>Previous</button>
                            <button>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDeliverables;

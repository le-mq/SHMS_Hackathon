import React, { useState, useEffect, useMemo } from 'react';
import './PanelAllocation.css';
import NavbarAdmin from './NavbarAdmin';

const API_BASE = "http://localhost:8080/api/v1";

const PanelAllocation = () => {
    const [contests, setContests] = useState([]);
    const [selectedContestId, setSelectedContestId] = useState('');
    const [categories, setCategories] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [experts, setExperts] = useState([]);
    const [selectedExpertId, setSelectedExpertId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [allocations, setAllocations] = useState({});
    const [isLoading, setIsLoading] = useState(false);

    const token = localStorage.getItem("shms_token");
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    // 1. Fetch dữ liệu ban đầu
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [contestsRes, expertsRes, allocationsRes] = await Promise.all([
                    fetch(API_BASE + "/admin/contests", { headers }),
                    fetch(API_BASE + "/admin/contests/experts", { headers }),
                    fetch(API_BASE + "/admin/contests/allocations", { headers })
                ]);

                if (contestsRes.ok) {
                    const cData = await contestsRes.json();
                    setContests(cData);
                    if (cData.length > 0) setSelectedContestId(String(cData[0].id));
                }
                if (expertsRes.ok) {
                    const eData = await expertsRes.json();
                    setExperts(eData);
                    if (eData.length > 0) setSelectedExpertId(String(eData[0].userId));
                }
                if (allocationsRes.ok) {
                    const aData = await allocationsRes.json();
                    setAllocations(aData || {});
                }
            } catch (err) {
                console.error("Lỗi fetch data ban đầu:", err);
            }
        };
        fetchInitialData();
    }, [headers]);

    // 2. Fetch danh mục và đội thi khi chọn cuộc thi
    useEffect(() => {
        if (!selectedContestId || selectedContestId === '') return;

        // Gọi endpoint dashboard tổng - nơi chứa toàn bộ cấu trúc lồng nhau của teams và contest
        fetch(API_BASE + "/admin/contests/teams/dashboard-data", { headers })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(json => {
                // Khớp cấu trúc mảng giống hệt bên TeamRegistrationApproval
                const contestsData = Array.isArray(json) ? json : (json.contests || json.data || []);

                // Tìm đúng contest đang được chọn trên giao diện
                const currentContest = contestsData.find(c => String(c.id) === String(selectedContestId));

                if (currentContest) {
                    // Set categories lấy từ tracks hoặc categories
                    setCategories(currentContest.categories || currentContest.tracks || []);

                    // Lọc danh sách đội thi: Chỉ lấy những đội đã được APPROVED (hoặc giữ nguyên nếu muốn hiển thị hết)
                    const rawTeams = currentContest.teams || [];
                    const approvedTeams = rawTeams.filter(team =>
                        (team.status || '').toLowerCase() === 'approved'
                    );

                    setAllTeams(approvedTeams);
                    console.log(`Đã load thành công ${approvedTeams.length} đội APPROVED cho contest ID: ${selectedContestId}`);
                } else {
                    // Nếu không tìm thấy cuộc thi trong danh sách dashboard
                    setCategories([]);
                    setAllTeams([]);
                }
            })
            .catch(err => console.error("Lỗi fetch dữ liệu cấu hình panel:", err));
    }, [selectedContestId, headers]);

    const activeExpert = useMemo(() => experts.find(e => String(e.userId) === String(selectedExpertId)), [experts, selectedExpertId]);

    // Lấy danh sách đội thi đang được Mentor bởi Expert này
    const currentMentoredTeamIds = useMemo(() => {
        if (!allocations || !selectedExpertId) return [];

        // Hỗ trợ tìm kiếm key linh hoạt theo cả String lẫn Number
        const expertAlloc = allocations[String(selectedExpertId)] || allocations[Number(selectedExpertId)] || {};
        const teamIds = new Set();

        Object.values(expertAlloc).forEach(trackAlloc => {
            // Kiểm tra trackAlloc tồn tại và có mảng mentoredTeamIds không
            if (trackAlloc && Array.isArray(trackAlloc.mentoredTeamIds)) {
                trackAlloc.mentoredTeamIds.forEach(id => {
                    if (id !== undefined && id !== null) {
                        teamIds.add(String(id));
                    }
                });
            }
        });

        return Array.from(teamIds);
    }, [allocations, selectedExpertId]);

    const isActingAsJudgeAnywhere = useMemo(() => {
        if (!allocations || !selectedExpertId) return false;

        const expertAlloc = allocations[String(selectedExpertId)] || allocations[Number(selectedExpertId)] || {};
        return Object.values(expertAlloc).some(trackAlloc => trackAlloc && trackAlloc.isJudge === true);
    }, [allocations, selectedExpertId]);

    // Xử lý Mentor Team
    const handleGlobalTeamToggle = (teamId) => {
        if (!selectedExpertId) return;

        // KHÓA CỨNG: Nếu đang làm Giám khảo ở BẤT KỲ hạng mục nào -> Chặn click Mentor
        if (isActingAsJudgeAnywhere) {
            alert("Không thể gán Mentor! Chuyên gia này đã được phân công làm Giám khảo chấm thi trong cuộc thi này.");
            return;
        }

        setAllocations(prev => {
            // Xác định chính xác key đang tồn tại trong state (String hoặc Number)
            const expertKey = Object.keys(prev).find(key => String(key) === String(selectedExpertId)) || selectedExpertId;
            const expertAlloc = prev[expertKey] || {};
            const updatedAlloc = { ...expertAlloc };

            // Kiểm tra xem teamId đã có trong danh sách được gán chưa
            const isAssigned = currentMentoredTeamIds.includes(String(teamId));

            // Đồng bộ danh sách team lên tất cả hạng mục để khớp cấu hình Database
            categories.forEach(cat => {
                if (!cat || !cat.id) return;

                const trackAlloc = updatedAlloc[cat.id] || { isJudge: false, mentoredTeamIds: [] };
                // Copy mảng an toàn, đảm bảo newTeams luôn là một mảng
                let newTeams = Array.isArray(trackAlloc.mentoredTeamIds) ? [...trackAlloc.mentoredTeamIds].map(Number) : [];

                if (isAssigned) {
                    // Nếu đã gán -> Xóa đội thi này đi
                    newTeams = newTeams.filter(id => String(id) !== String(teamId));
                } else {
                    // Nếu chưa gán -> Thêm vào dưới dạng số Nguyên (Number) để gửi lên DB
                    if (!newTeams.map(String).includes(String(teamId))) {
                        newTeams.push(Number(teamId));
                    }
                }

                updatedAlloc[cat.id] = { ...trackAlloc, mentoredTeamIds: newTeams };
            });

            return { ...prev, [expertKey]: updatedAlloc };
        });
    };

    // Xử lý Toggle Judge
    const handleJudgeToggle = (catId) => {
        setAllocations(prev => {
            const expertAlloc = prev[selectedExpertId] || {};
            const trackAlloc = expertAlloc[catId] || { isJudge: false, mentoredTeamIds: [] };

            // KHÓA CỨNG: Nếu mảng Team đang có phần tử -> Chặn bật Giám khảo
            if (!trackAlloc.isJudge && currentMentoredTeamIds.length > 0) {
                alert("Không thể gán làm Giám khảo! Chuyên gia đang là Mentor hướng dẫn cho đội thi trong giải đấu này.");
                return prev;
            }

            return {
                ...prev,
                [selectedExpertId]: {
                    ...expertAlloc,
                    [catId]: { ...trackAlloc, isJudge: !trackAlloc.isJudge }
                }
            };
        });
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const expertAlloc = allocations[selectedExpertId] || {};
            const assignmentList = Object.keys(expertAlloc).map(catId => ({
                trackId: Number(catId),
                mentoredTeamIds: expertAlloc[catId].mentoredTeamIds || [],
                isJudge: expertAlloc[catId].isJudge || false
            }));

            const response = await fetch(API_BASE + "/admin/contests/allocations", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ userId: Number(selectedExpertId), assignments: assignmentList })
            });
            if (response.ok) alert("Đã lưu thông tin cấu hình phân bổ thành công!");
        } catch {
            alert("Lưu thất bại!");
        } finally {
            setIsLoading(false);
        }
    };

    // Lọc danh sách chuyên gia theo ô tìm kiếm
    const filteredExperts = useMemo(() => {
        return experts.filter(e =>
            e.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.username?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [experts, searchQuery]);

    return (
        <div className="admin-container">
            <NavbarAdmin />

            <div className="config-wrapper">
                {/* 1. THANH HÀNG NGANG TIÊU ĐỀ & CHỌN CUỘC THI */}
                <div className="header-flex">
                    <div>
                        <h1 className="config-title">Panel Allocation</h1>
                        <p className="config-subtitle">Assign judges to categories and allocate mentors to registered teams.</p>
                    </div>
                    <div style={{ minWidth: '250px' }}>
                        <select
                            className="form-select"
                            value={selectedContestId}
                            onChange={(e) => setSelectedContestId(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%', outline: 'none' }}
                        >
                            <option value="">-- Chọn Cuộc Thi --</option>
                            {contests.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.year} {c.season})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* BỐ CỤC CHÍNH BẢNG TRÁI & BẢNG PHẢI */}
                <div className="allocation-grid">

                    {/* 2. PANEL BÊN TRÁI: DANH SÁCH CHUYÊN GIA */}
                    <div className="left-panel">
                        <div className="panel-header">
                            <h2 className="panel-title">Expert Registry</h2>
                            <span className="panel-badge">{filteredExperts.length} Active</span>
                        </div>

                        <div className="search-inner-wrapper">
                            <svg className="search-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Tìm kiếm chuyên gia..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="expert-list">
                            {filteredExperts.map(expert => (
                                <div
                                    key={expert.userId}
                                    className={`expert-item ${String(selectedExpertId) === String(expert.userId) ? 'active' : ''}`}
                                    onClick={() => setSelectedExpertId(expert.userId)}
                                >
                                    <div className="expert-info">
                                        <div className="expert-avatar">
                                            {expert.fullName ? expert.fullName.charAt(0).toUpperCase() : 'E'}
                                        </div>
                                        <div className="expert-details">
                                            <span className="expert-name">{expert.fullName || expert.username}</span>
                                            <span className="expert-title">{(expert.roles || []).join(', ')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredExperts.length === 0 && (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                    Không có chuyên gia nào phù hợp.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. PANEL BÊN PHẢI: CONFIG MENTOR & JUDGE */}
                    <div className="right-panel" style={{ padding: '24px' }}>
                        <div className="panel-header-custom" style={{ marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: '#111827' }}>Advanced Panel Allocation</h2>
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Cấu hình chuyên gia: <strong style={{ color: '#2563eb' }}>{activeExpert?.fullName || 'Chưa chọn'}</strong></p>
                        </div>

                        {/* VÙNG 1: CHỌN MENTOR CHO ĐỘI THI */}
                        <div className="management-block">
                            <h3>🤝 Vai Trò Cố Vấn (Mentor) — Quản lý suốt cuộc thi</h3>
                            <p className="block-hint">Chọn các đội thi mà chuyên gia này sẽ dẫn dắt xuyên suốt các vòng đấu.</p>

                            <div className="global-teams-grid">
                                {allTeams.map(team => {
                                    const isChecked = currentMentoredTeamIds.map(String).includes(String(team.id));
                                    return (
                                        <label key={team.id} className={`team-card-global ${isChecked ? 'active' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => handleGlobalTeamToggle(team.id)}
                                                disabled={isActingAsJudgeAnywhere}
                                            />
                                            <div className="team-name-text" title={team.name}>{team.name}</div>
                                        </label>
                                    );
                                })}
                            </div>
                            {allTeams.length === 0 && (
                                <p className="hint-text">Chưa có dữ liệu đội thi hoặc chưa chọn cuộc thi.</p>
                            )}
                        </div>

                        {/* VÙNG 2: BẬT VAI TRÒ GIÁM KHẢO THEO HẠNG MỤC */}
                        <div className="management-block" style={{ marginTop: '24px' }}>
                            <h3>⚖️ Vai Trò Giám Khảo (Judge) — Theo từng Hạng mục vòng đấu</h3>
                            <p className="block-hint">Bật quyền chấm thi tại các hạng mục tương ứng (Chỉ khả dụng khi không làm Mentor).</p>

                            <table className="judge-pure-table">
                                <thead>
                                    <tr>
                                        <th>Hạng mục thi đấu</th>
                                        <th className="center">Trạng thái chấm điểm</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(cat => {
                                        const isJudge = allocations[selectedExpertId]?.[cat.id]?.isJudge || false;
                                        return (
                                            <tr key={cat.id}>
                                                <td><strong>{cat.categoryName || cat.name}</strong></td>
                                                <td className="center">
                                                    <label className="ui-switch-blue">
                                                        <input
                                                            type="checkbox"
                                                            checked={isJudge}
                                                            onChange={() => handleJudgeToggle(cat.id)}
                                                            disabled={currentMentoredTeamIds.length > 0}
                                                        />
                                                        <span className="slider"></span>
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {categories.length === 0 && (
                                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                                    Không có hạng mục nào được tìm thấy.
                                </div>
                            )}
                        </div>

                        {/* NÚT LƯU TỔNG */}
                        <div className="panel-footer-actions">
                            <button className="btn-save-master" onClick={handleSave} disabled={isLoading}>
                                {isLoading ? 'Đang lưu...' : 'Lưu toàn bộ phân bổ'}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PanelAllocation;
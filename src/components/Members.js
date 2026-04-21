import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import RowActionMenu from "./RowActionMenu";

const Members = ({ token, user }) => {
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [editingMember, setEditingMember] = useState(null);
    const [viewingMember, setViewingMember] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
    
    // New Term Management State
    const [terms, setTerms] = useState([]);
    const [selectedTerm, setSelectedTerm] = useState("");

    const departments = [
        "ትምህርት ክፍል", "አባላት ጉዳይ", "መዝሙር ክፍል", "ባች ክፍል", "ሙያ ክፍል",
        "ልማት ክፍል", "ቋንቋ ክፍል", "መረጃ ክፍል", "ሂሳብ ክፍል", "ኦዲት"
    ];

    useEffect(() => {
        fetchTerms();
        
        const handleClickOutside = (e) => {
            if (activeMenu && !e.target.closest('.dropdown-container')) {
                setActiveMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeMenu]);

    const fetchTerms = async () => {
        try {
            const res = await axios.get("/settings/terms", { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                setTerms(res.data.terms);
                if (res.data.terms.length > 0) {
                    // Determine current active term (assuming default from settings was included)
                    setSelectedTerm(res.data.terms[0]);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (selectedTerm) {
            fetchMembers();
        }
    }, [selectedTerm]);

    // Set default department filter based on user role
    useEffect(() => {
        if (user && !['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user.role)) {
            const roleToDept = {
                'abalat_guday': 'አባላት ጉዳይ',
                'timhirt': 'ትምህርት ክፍል',
                'mezmur': 'መዝሙር ክፍል',
                'bach': 'ባች ክፍል',
                'muya': 'ሙያ ክፍል',
                'lmat': 'ልማት ክፍል',
                'kwanqwa': 'ቋንቋ ክፍል',
                'merja': 'መረጃ ክፍል',
                'hisab': 'ሂሳብ ክፍል',
                'audit': 'ኦዲት'
            };
            const defaultDept = roleToDept[user.role];
            if (defaultDept) {
                setFilterDept(defaultDept);
            }
        }
    }, [user]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            // Append term filter if selected
            const url = selectedTerm ? `/members?term=${selectedTerm}` : "/members";
            const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setMembers(res.data);
        } catch (err) {
            toast.error("ተማሪዎችን መጫን አልተቻለም (Failed to load members)");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberDetail = async (id) => {
        setLoadingDetail(true);
        setViewMode('detail');
        setViewingMember({}); 
        try {
            const res = await axios.get(`/members/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setViewingMember(res.data);
        } catch (err) {
            toast.error("ዝርዝር መረጃውን መጫን አልተቻለም (Failed to load details)");
            setViewMode('list');
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axios.put(`/members/${id}`, { active: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`ተማሪው ${!currentStatus ? 'አክቲቭ ሆኗል' : 'ታግዷል'} (Status updated)`);
            fetchMembers();
            if (viewMode === 'detail' && viewingMember?._id === id) {
                setViewingMember(prev => ({ ...prev, active: !currentStatus }));
            }
        } catch (err) {
            toast.error("ሁኔታውን መለወጥ አልተቻለም");
        }
    };


    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this member? This action cannot be undone.")) return;
        try {
            await axios.delete(`/members/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Member deleted successfully");
            setViewMode('list');
            setViewingMember(null);
            fetchMembers();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete member");
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            await axios.put(`/members/${id}`, { active: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`ተማሪው ${!currentStatus ? 'አክቲቭ ሆኗል' : 'ታግዷል'} (Status updated)`);
            fetchMembers();
        } catch (err) {
            const msg = err.response?.data?.message || "ሁኔታውን መለወጥ አልተቻለም (Failed to toggle status)";
            toast.error(msg);
        }
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/members/${editingMember._id}`, editingMember, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("መረጃው ተስተካክሏል (Profile updated)");
            setEditingMember(null);
            fetchMembers();
        } catch (err) {
            toast.error("ማስተካከል አልተቻለም");
        }
    };

    const filteredMembers = members.filter(m => {
        const matchesSearch = (m.firstName + " " + m.fatherName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.studentId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.fellowshipId || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept ? m.serviceDepartment === filterDept : true;
        return matchesSearch && matchesDept;
    });

    if (viewMode === 'detail' && viewingMember) {
        return (
            <div className="dashboard-content animate-fade-in">
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                    <button 
                        onClick={() => setViewMode('list')} 
                        style={{ 
                            background: '#fff', border: '1.5px solid #e2e8f0', padding: '10px 20px', 
                            borderRadius: '12px', cursor: 'pointer', fontWeight: '800', color: '#444',
                            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        ← Back
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--primary)' }}>የአባል ዝርዝር መረጃ (Member Profile)</h2>
                        <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>የአባሉን ሙሉ መረጃ እዚህ መመልከት ይችላሉ</p>
                    </div>
                </div>

                {loadingDetail ? (
                    <div style={{ padding: '8rem', textAlign: 'center', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                        <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                        <p style={{ color: '#64748b', fontWeight: '600' }}>በመጫን ላይ...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', gap: '30px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <div style={{ width: '140px', height: '140px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '5px solid #fff', background: '#f8fafc' }}>
                                {viewingMember.photo ? (
                                    <img src={viewingMember.photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', color: '#cbd5e1' }}>👤</div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', color: '#0f172a' }}>{viewingMember.firstName} {viewingMember.fatherName} {viewingMember.grandFatherName}</h1>
                                        <div style={{ display: 'flex', gap: '15px', marginTop: '12px', flexWrap: 'wrap' }}>
                                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800' }}>🏛️ {viewingMember.serviceDepartment}</span>
                                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700' }}>🆔 ID: {viewingMember.studentId}</span>
                                            <span className={`status-pill ${viewingMember.active ? 'active' : 'inactive'}`} style={{ padding: '6px 16px', fontSize: '0.75rem' }}>{viewingMember.active ? 'ACTIVE' : 'BLOCKED'}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={() => handleToggleStatus(viewingMember._id, viewingMember.active)}
                                            style={{ 
                                                padding: '12px 24px', borderRadius: '12px', border: 'none', 
                                                background: viewingMember.active ? '#fee2e2' : '#dcfce7',
                                                color: viewingMember.active ? '#991b1b' : '#166534',
                                                fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem'
                                            }}
                                        >
                                            {viewingMember.active ? '🚫 Block' : '✅ Unblock'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                            <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>👤</span> የግልና የትምህርት መረጃ
                                </h4>
                                <div className="detail-row"><strong>Gender:</strong> <span>{viewingMember.gender}</span></div>
                                <div className="detail-row"><strong>Phone Number:</strong> <span>{viewingMember.phone || 'N/A'}</span></div>
                                <div className="detail-row"><strong>University Dept:</strong> <span>{viewingMember.department}</span></div>
                                <div className="detail-row"><strong>Batch / Year:</strong> <span>{viewingMember.batch}</span></div>
                                <div className="detail-row"><strong>Fellowship ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '900', color: '#0369a1', background: '#f0f9ff', padding: '2px 8px', borderRadius: '4px' }}>{viewingMember.fellowshipId || 'N/A'}</span></div>
                            </div>

                            <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>📍</span> የመኖሪያ አድራሻ (Origin)
                                </h4>
                                <div className="detail-row"><strong>Region:</strong> <span>{viewingMember.region}</span></div>
                                <div className="detail-row"><strong>Zone:</strong> <span>{viewingMember.zone}</span></div>
                                <div className="detail-row"><strong>Woreda:</strong> <span>{viewingMember.woreda}</span></div>
                                <div className="detail-row"><strong>Kebele:</strong> <span>{viewingMember.kebele}</span></div>
                            </div>

                            <div className="card shadow-sm" style={{ gridColumn: '1 / -1', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase' }}>መንፈሳዊ መረጃና ሌሎች (Spiritual & Additional)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                    <div className="detail-row"><strong>Christian Name:</strong> <span>{viewingMember.christianName || 'N/A'}</span></div>
                                    <div className="detail-row"><strong>Spiritual Father:</strong> <span style={{ color: '#0369a1' }}>{viewingMember.spiritualFather || 'N/A'}</span></div>
                                    <div className="detail-row"><strong>Ordination:</strong> <span>{viewingMember.ordination || 'None'}</span></div>
                                    <div className="detail-row"><strong>Sunday School:</strong> <span>{viewingMember.isSundaySchoolServed || 'N/A'}</span></div>
                                    <div className="detail-row"><strong>Reg. Term:</strong> <span>{viewingMember.term || 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <style>{`
                    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #f1f5f9; font-size: 0.95rem; }
                    .detail-row:last-child { border-bottom: none; }
                    .detail-row strong { color: #64748b; font-weight: 500; }
                    .detail-row span { color: #1e293b; font-weight: 800; }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="role-banner banner-abalat" data-symbol="👥" style={{ marginBottom: '20px' }}>
                <div className="banner-icon">📋</div>
                <div className="banner-text">
                    <h2 className="banner-title">ማዕከላዊ የተማሪዎች ዳታቤዝ (Central Member Database)</h2>
                    <p className="banner-subtitle">የአባላትን መረጃ እዚህ ያስተዳድሩ (Manage all fellowship members here)</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="card shadow-sm" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 2, minWidth: '250px' }}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="በስም፣ በመለያ ወይም በID ይፈልጉ (Search name, ID...)"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px' }}
                        />
                    </div>
                    {['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'hisab', 'audit'].includes(user?.role) && (
                        <div style={{ flex: 1, minWidth: '180px' }}>
                            <select
                                className="form-control"
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                style={{ borderRadius: '10px' }}
                            >
                                <option value="">ሁሉም ክፍሎች (All Depts)</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    )}
                    
                    <div style={{ flex: 1, minWidth: '180px' }}>
                        <select
                            className="form-control"
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            style={{ fontWeight: '600', color: 'var(--primary)', borderRadius: '10px' }}
                        >
                            {terms.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <button onClick={fetchMembers} className="action-btn-pill" style={{ height: '42px', padding: '0 20px' }}>🔄 አድስ</button>
                </div>
            </div>

            <div className="card shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h3 className="card-title">የተከታዮች ዝርዝር (Members List)</h3>
                        <span className="badge badge-primary">{filteredMembers.length} አባላት</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {selectedMemberId && (() => {
                            const m = members.find(m => m._id === selectedMemberId);
                            if (!m) return null;
                            return (
                                <RowActionMenu 
                                    trigger={
                                        <div style={{ border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', padding: '8px 16px', borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'center', transition: 'all 0.2s' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>አስተዳድር (Actions)</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                                            </div>
                                        </div>
                                    }
                                    actions={[
                                        { icon: '🔍', label: 'ዝርዝር መረጃ (Details)', onClick: () => fetchMemberDetail(selectedMemberId) },
                                        { icon: '📝', label: 'መረጃ አሻሽል (Edit)', onClick: () => setEditingMember(m) },
                                        { 
                                            icon: m.active ? '🚫' : '✅', 
                                            label: m.active ? 'ተማሪውን አግድ (Block)' : 'ተማሪውን ፍታ (Unblock)', 
                                            onClick: () => handleToggleStatus(m._id, m.active),
                                            color: m.active ? '#dc2626' : '#16a34a' 
                                        },
                                        { divider: true },
                                        { icon: '🗑️', label: 'ተማሪውን ሰርዝ (Delete)', onClick: () => handleDelete(m._id), color: '#dc2626' }
                                    ]}
                                />
                            );
                        })()}
                    </div>
                </div>
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ተማሪ (Student)</th>
                                <th>የግቢ ID (Student ID)</th>
                                <th>የግቢ ጉባኤ ID (Fellowship ID)</th>
                                <th>ክፍል (Dept)</th>
                                <th>ሁኔታ (Status)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>በመጫን ላይ...</td></tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>ምንም ተማሪ አልተገኘም</td></tr>
                            ) : (
                                filteredMembers.map(m => (
                                    <tr 
                                        key={m._id} 
                                        onClick={() => setSelectedMemberId(m._id)}
                                        className={`${!m.active ? 'inactive-row' : ''} ${selectedMemberId === m._id ? 'selected-row' : ''}`}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>{m.firstName?.[0]}</div>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '0.9rem' }}>{m.firstName} {m.fatherName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{m.batch} - {m.gender}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><code style={{ fontSize: '0.8rem' }}>{m.studentId}</code></td>
                                        <td>{m.fellowshipId ? <span className="fellowship-id-badge">{m.fellowshipId}</span> : <span style={{ color: '#9ca3af', fontSize: '11px' }}>አልተሰጠም</span>}</td>
                                        <td><span className="dept-tag">{m.serviceDepartment}</span></td>
                                        <td>
                                            <span className={`status-pill ${m.active ? 'active' : 'inactive'}`}>
                                                {m.active ? 'ACTIVE' : 'INACTIVE'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal (Keeping Edit as Modal for quick edits) */}
            {editingMember && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', width: '95%', borderRadius: '24px' }}>
                        <div className="modal-header">
                            <h3>የተማሪ መረጃ ማስተካከያ</h3>
                            <button className="close-btn" onClick={() => setEditingMember(null)}>&times;</button>
                        </div>
                        <form onSubmit={handleEditSave} className="modal-body" style={{ padding: '25px' }}>
                            <div className="form-group-inline">
                                <div className="form-group flex-1">
                                    <label>ስም</label>
                                    <input type="text" value={editingMember.firstName} onChange={e => setEditingMember({ ...editingMember, firstName: e.target.value })} required className="form-control" style={{ borderRadius: '10px' }} />
                                </div>
                                <div className="form-group flex-1">
                                    <label>የአባት ስም</label>
                                    <input type="text" value={editingMember.fatherName} onChange={e => setEditingMember({ ...editingMember, fatherName: e.target.value })} required className="form-control" style={{ borderRadius: '10px' }} />
                                </div>
                            </div>
                            <div className="form-group-inline">
                                <div className="form-group flex-1">
                                    <label>የግቢ መታወቂያ</label>
                                    <input type="text" value={editingMember.studentId} onChange={e => setEditingMember({ ...editingMember, studentId: e.target.value })} required className="form-control" style={{ borderRadius: '10px' }} />
                                </div>
                                <div className="form-group flex-1">
                                    <label>ክፍል</label>
                                    <select 
                                        value={editingMember.serviceDepartment} 
                                        onChange={e => setEditingMember({ ...editingMember, serviceDepartment: e.target.value })} 
                                        className="form-control" 
                                        required 
                                        style={{ borderRadius: '10px' }}
                                        disabled={!['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'hisab', 'audit'].includes(user?.role)}
                                    >
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>ስልክ ቁጥር</label>
                                <input type="text" value={editingMember.phone} onChange={e => setEditingMember({ ...editingMember, phone: e.target.value })} className="form-control" style={{ borderRadius: '10px' }} />
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                <button type="submit" className="login-btn" style={{ flex: 1, margin: 0, borderRadius: '12px' }}>💾 አስቀምጥ</button>
                                <button type="button" onClick={() => setEditingMember(null)} className="cancel-btn" style={{ borderRadius: '12px' }}>Back</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .fellowship-id-badge { background: #eff6ff; color: #2563eb; font-family: monospace; padding: 2px 8px; border-radius: 4px; font-weight: 700; border: 1px solid #bfdbfe; font-size: 0.8rem; }
                .dept-tag { background: #f8fafc; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; border: 1px solid #e2e8f0; font-weight: 600; }
                .status-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
                .status-pill.active { background: #dcfce7; color: #166534; }
                .status-pill.inactive { background: #fee2e2; color: #991b1b; }
                .inactive-row { background: #f9fafb; opacity: 0.8; }
                .selected-row { background: #e0f2fe !important; border-left: 5px solid #0369a1; }
                .data-table tr:hover:not(.selected-row) { background: #f8fafc; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default Members;
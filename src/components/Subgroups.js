import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { greToEth } from "../utils/ethiopianDate";

const Subgroups = ({ token, user }) => {
    const [subgroups, setSubgroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [managingSubgroup, setManagingSubgroup] = useState(null);
    const [form, setForm] = useState({ name: "", department: user?.departmentAmharic || "", leader: "" });
    const [newMemberId, setNewMemberId] = useState("");

    const fetchSubgroups = useCallback(async () => {
        try {
            const res = await axios.get("/subgroups", { headers: { Authorization: `Bearer ${token}` } });
            // Filter subgroups by department if not admin
            const isCore = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user?.role);
            const filtered = isCore ? res.data : res.data.filter(sg => sg.department === user?.departmentAmharic);
            setSubgroups(filtered);
        } catch (err) {
            toast.error("ንዑስ ቡድኖችን መጫን አልተቻለም");
        }
    }, [token, user]);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await axios.get("/auth/users", { headers: { Authorization: `Bearer ${token}` } });
            setUsers(res.data);
        } catch (err) {
            console.error("Error fetching users", err);
        }
    }, [token]);

    const fetchMembers = useCallback(async () => {
        try {
            const res = await axios.get("/members", { headers: { Authorization: `Bearer ${token}` } });
            setMembers(res.data);
        } catch (err) {
            console.error("Error fetching members", err);
        }
    }, [token]);

    useEffect(() => {
        setLoading(true);
        Promise.all([fetchSubgroups(), fetchUsers(), fetchMembers()]).finally(() => setLoading(false));
    }, [fetchSubgroups, fetchUsers, fetchMembers]);

    const handleCreateSubgroup = async (e) => {
        e.preventDefault();
        try {
            await axios.post("/subgroups", form, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("ንዑስ ቡድን ተፈጥሯል (Subgroup created)");
            setShowCreateModal(false);
            setForm({ name: "", department: user?.departmentAmharic || "", leader: "" });
            fetchSubgroups();
        } catch (err) {
            toast.error(err.response?.data?.error || "መፍጠር አልተቻለም");
        }
    };

    const handleDeleteSubgroup = async (id) => {
        if (!window.confirm("እርግጠኛ ነዎት ይህንን ንዑስ ቡድን መሰረዝ ይፈልጋሉ?")) return;
        try {
            await axios.delete(`/subgroups/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("ተሰርዟል (Deleted)");
            fetchSubgroups();
        } catch (err) {
            toast.error("መሰረዝ አልተቻለም");
        }
    };

    const handleAddMember = async (e) => {
        e.preventDefault();
        if (!newMemberId) return;
        try {
            await axios.post(`/subgroups/${managingSubgroup._id}/members`, { memberId: newMemberId }, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("አባል ተጨምሯል (Member added)");
            setNewMemberId("");
            fetchSubgroups();
            // Update local managingSubgroup state to show member instantly
            const updated = subgroups.find(s => s._id === managingSubgroup._id);
            setManagingSubgroup(updated);
        } catch (err) {
            toast.error("አባል መጨመር አልተቻለም");
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await axios.delete(`/subgroups/${managingSubgroup._id}/members/${memberId}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("አባል ተወግዷል (Member removed)");
            fetchSubgroups();
        } catch (err) {
            toast.error("አባል ማስወገድ አልተቻለም");
        }
    };

    // Helper to get total members in all subgroups for specific department
    const totalSubgroupMembers = subgroups.reduce((acc, sg) => acc + (sg.members?.length || 0), 0);

    return (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <div className="role-banner banner-lmat" data-symbol="📂" style={{ marginBottom: '20px' }}>
                <div className="banner-icon">📂</div>
                <div className="banner-text">
                    <h2 className="banner-title">የንዑስ ቡድኖች ማስተዳደሪያ (Subgroups Management)</h2>
                    <p className="banner-subtitle">ንዑስ ቡድኖችን ይፍጠሩ እና አባላትን ያደራጁ (Organize department members into groups)</p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div className="stat-pill">
                        <span className="label">Total Groups:</span>
                        <span className="value">{subgroups.length}</span>
                    </div>
                    <div className="stat-pill">
                        <span className="label">Assigned Members:</span>
                        <span className="value">{totalSubgroupMembers}</span>
                    </div>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="action-btn-pill">
                    ➕ አዲስ ንዑስ ቡድን (New Subgroup)
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>በመጫን ላይ... (Loading)</div>
            ) : subgroups.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    ምንም ንዑስ ቡድን አልተገኘም (No subgroups found)
                </div>
            ) : (
                <div className="subgroup-grid">
                    {subgroups.map(sg => (
                        <div key={sg._id} className="card subgroup-card">
                            <div className="card-header">
                                <h3 className="card-title">{sg.name}</h3>
                                <span className="badge badge-primary">{sg.members?.length || 0} Members</span>
                            </div>
                            <div className="card-body">
                                <div className="info-item">
                                    <span className="label">Department:</span>
                                    <span className="value">{sg.department}</span>
                                </div>
                                <div className="info-item">
                                    <span className="label">Leader:</span>
                                    <span className="value">{sg.leader?.name || "No Leader"}</span>
                                </div>
                            </div>
                            <div className="card-footer" style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => setManagingSubgroup(sg)} className="btn-secondary" style={{ flex: 1 }}>Manage Members</button>
                                <button onClick={() => handleDeleteSubgroup(sg._id)} className="btn-danger-outline" style={{ width: '40px' }}>🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Subgroup Modal */}
            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>ንዑስ ቡድን መፍጠሪያ (Create Subgroup)</h3>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateSubgroup} className="modal-body">
                            <div className="form-group">
                                <label>የንዑስ ቡድን ስም (Subgroup Name)</label>
                                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="form-control" placeholder={`e.g., ባች ${greToEth(new Date()).year} A`} />
                            </div>
                            <div className="form-group">
                                <label>ክፍል (Department)</label>
                                <input type="text" value={form.department} readOnly className="form-control" style={{ background: '#f8fafc' }} />
                                <small style={{ color: '#64748b' }}>Automatically set to your department</small>
                            </div>
                            <div className="form-group">
                                <label>መሪ (Leader)</label>
                                <select value={form.leader} onChange={e => setForm({...form, leader: e.target.value})} required className="form-control">
                                    <option value="">Select a leader</option>
                                    {users.filter(u => u.departmentAmharic === user?.departmentAmharic).map(u => (
                                        <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                <button type="submit" className="login-btn" style={{ flex: 1, margin: 0 }}>Create Subgroup</button>
                                <button type="button" onClick={() => setShowCreateModal(false)} className="cancel-btn">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Members Modal */}
            {managingSubgroup && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px', width: '95%' }}>
                        <div className="modal-header">
                            <h3>የአባላት ማስተዳደሪያ: {managingSubgroup.name}</h3>
                            <button className="close-btn" onClick={() => setManagingSubgroup(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {/* Add Member Form */}
                            <form onSubmit={handleAddMember} style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px' }}>
                                <select value={newMemberId} onChange={e => setNewMemberId(e.target.value)} className="form-control" style={{ flex: 1 }}>
                                    <option value="">ተማሪ ይምረጡ (Select Member to Add)</option>
                                    {members.filter(m => !managingSubgroup.members?.some(ms => ms._id === m._id)).map(m => (
                                        <option key={m._id} value={m._id}>{m.firstName} {m.fatherName} ({m.studentId})</option>
                                    ))}
                                </select>
                                <button type="submit" className="action-btn-pill" style={{ height: '42px' }}>➕ ጨምር (Add)</button>
                            </form>

                            <div className="table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Member Name</th>
                                            <th>Student ID</th>
                                            <th>Gender</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subgroups.find(s => s._id === managingSubgroup._id)?.members?.length === 0 ? (
                                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No members in this group yet.</td></tr>
                                        ) : (
                                            subgroups.find(s => s._id === managingSubgroup._id)?.members?.map(m => (
                                                <tr key={m._id}>
                                                    <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{m.firstName} {m.fatherName}</td>
                                                    <td><code>{m.studentId}</code></td>
                                                    <td>{m.gender}</td>
                                                    <td>
                                                        <button onClick={() => handleRemoveMember(m._id)} className="btn-danger-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>Remove</button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .subgroup-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
                .subgroup-card { height: 100%; display: flex; flex-direction: column; transition: transform 0.2s; }
                .subgroup-card:hover { transform: translateY(-4px); }
                .info-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
                .info-item .label { color: #64748b; font-size: 0.85rem; }
                .info-item .value { font-weight: 600; color: #1e293b; font-size: 0.9rem; }
                .stat-pill { background: #fff; padding: 8px 16px; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; gap: 8px; font-size: 0.9rem; }
                .stat-pill .label { color: #64748b; }
                .stat-pill .value { font-weight: 700; color: #4f46e5; }
                .btn-secondary { background: #f1f5f9; color: #1e293b; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; }
                .btn-secondary:hover { background: #e2e8f0; }
                .btn-danger-outline { background: #fff; color: #ef4444; border: 1px solid #fee2e2; padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-danger-outline:hover { background: #fee2e2; }
            `}</style>
        </div>
    );
};

export default Subgroups;
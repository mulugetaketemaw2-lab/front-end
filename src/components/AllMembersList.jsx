import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import RowActionMenu from './RowActionMenu';

const AllMembersList = ({ token, user }) => {
    const isMerja = user?.role === 'merja';
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDept, setFilterDept] = useState(""); // Show all by default
    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [viewingMember, setViewingMember] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [terms, setTerms] = useState([]);
    const [selectedTerm, setSelectedTerm] = useState("");

    const [viewMode, setViewMode] = useState('list'); // 'list', 'detail', or 'edit'
    const [editFormData, setEditFormData] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const handleEditInitiate = (member) => {
        setEditFormData({
            ...member,
            // Ensure all fields are present for controlled inputs
            firstName: member.firstName || '',
            fatherName: member.fatherName || '',
            grandFatherName: member.grandFatherName || '',
            studentId: member.studentId || '',
            phone: member.phone || '',
            department: member.department || '',
            batch: member.batch || '',
            gender: member.gender || '',
            region: member.region || '',
            zone: member.zone || '',
            woreda: member.woreda || '',
            kebele: member.kebele || '',
            serviceDepartment: member.serviceDepartment || '',
            spiritualFather: member.spiritualFather || '',
            graduationYear: member.graduationYear || '',
            ordination: member.ordination || '',
            christianName: member.christianName || '',
            isSundaySchoolServed: member.isSundaySchoolServed || '',
            fellowshipId: member.fellowshipId || ''
        });
        setViewMode('edit');
    };

    const handleUpdateMember = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.put(`/members/${editFormData._id}`, editFormData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("አባል መረጃ በተሳካ ሁኔታ ተስተካክሏል! (Member profile updated!)");
            setViewMode('list');
            fetchMembers();
        } catch (err) {
            toast.error(err.response?.data?.message || "ማስተካከል አልተቻለም (Update failed)");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [settingsRes, termsRes] = await Promise.all([
                axios.get('/settings'),
                axios.get('/settings/terms')
            ]);
            if (settingsRes.data?.currentTerm) {
                setSelectedTerm(settingsRes.data.currentTerm);
            }
            if (termsRes.data.success) {
                setTerms(termsRes.data.terms);
            }
        } catch (err) {
            console.error('Error fetching terms:', err);
        }
    };

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const termQuery = selectedTerm ? `?term=${encodeURIComponent(selectedTerm)}&fullList=true` : '?fullList=true';
            const { data } = await axios.get(`/members${termQuery}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMembers(data);
        } catch (err) {
            toast.error("አባላትን መጫን አልተቻለም (Failed to load members)");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTerm) {
            fetchMembers();
        }
    }, [selectedTerm]);

    const fetchMemberDetail = async (id) => {
        setLoadingDetail(true);
        setViewMode('detail');
        setViewingMember({}); 
        try {
            const { data } = await axios.get(`/members/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setViewingMember(data);
        } catch (err) {
            toast.error("ዝርዝር መረጃ መጫን አልተቻለም");
            setViewMode('list');
            setViewingMember(null);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axios.put(`/members/${id}`, { active: !currentStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`አባል በስኬት ${!currentStatus ? 'አክቲቭ ሆኗል' : 'ታግዷል'}`);
            fetchMembers();
            if (viewMode === 'detail' && viewingMember?._id === id) {
                setViewingMember(prev => ({ ...prev, active: !currentStatus }));
            }
        } catch (err) {
            toast.error("ሁኔታውን መለወጥ አልተቻለም");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("ይህንን አባል በቋሚነት መሰረዝ ይፈልጋሉ? (Delete permanently?)")) return;
        try {
            await axios.delete(`/members/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("አባል ተሰርዟል");
            setSelectedMemberId(null);
            setViewMode('list');
            setViewingMember(null);
            fetchMembers();
        } catch (err) {
            toast.error("መሰረዝ አልተቻለም");
        }
    };

    const handleResetPassword = async (m) => {
        if (!m.userId) return toast.error("ይህ አባል የዩዘር አካውንት የለውም (No user account linked)");
        const newPwd = window.prompt(`ለአባል ${m.firstName} አዲስ የይለፍ ቃል ያስገቡ (Enter new password for ${m.firstName}):`);
        if (!newPwd) return;
        if (newPwd.length < 4) return toast.error("የይለፍ ቃል ቢያንስ 4 ቁምፊ መሆን አለበት (Min 4 characters)");

        try {
            await axios.post(`/auth/reset-password/${m.userId}`, { newPassword: newPwd }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("የይለፍ ቃል በስኬት ተቀይሯል! (Password reset successfully)");
        } catch (err) {
            toast.error(err.response?.data?.message || "መቀየር አልተቻለም (Reset failed)");
        }
    };

    const exportToCSV = () => {
        if (members.length === 0) return toast.error("ምንም መረጃ የለም");
        
        const headers = [
            "Full Name", "Gender", "Phone", "Student ID", "Fellowship ID", 
            "University Dept", "Batch", "Region", "Zone", "Woreda", "Kebele", 
            "Spiritual Father", "Ordination", "Selected Department", "Status", "Registration Term"
        ];
        
        const rows = filteredMembers.map(m => [
            `${m.firstName || ''} ${m.fatherName || ''} ${m.grandFatherName || ''}`.trim() || (m.name || "N/A"),
            m.gender || "N/A",
            m.phone ? ` ${m.phone}` : "N/A",
            m.studentId || "N/A",
            m.fellowshipId || "N/A",
            m.department || "N/A",
            m.batch || "N/A",
            m.region || "N/A",
            m.zone || "N/A",
            m.woreda || "N/A",
            m.kebele || "N/A",
            m.spiritualFather || "N/A",
            m.ordination || "N/A",
            m.serviceDepartment || "N/A",
            m.active ? "Active" : "Blocked",
            m.term || "N/A"
        ]);

        let csvContent = "\uFEFF"; // UTF-8 BOM
        csvContent += headers.join(",") + "\n";
        rows.forEach(row => {
            csvContent += row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `Master_Members_Report_${new Date().toLocaleDateString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("ሪፖርቱ በስኬት ወጥቷል!");
    };

    const departments = [
        "ትምህርት ክፍል", "አባላት ጉዳይ", "መዝሙር ክፍል", "ባች ክፍል", "ሙያ ክፍል",
        "ልማት ክፍል", "ቋንቋ ክፍል", "መረጃ ክፍል", "ሂሳብ ክፍል", "ኦዲት"
    ];

    const filteredMembers = members.filter(m => {
        const fullSearch = `${m.firstName || ''} ${m.fatherName || ''} ${m.grandFatherName || ''} ${m.studentId || ''} ${m.phone || ''} ${m.fellowshipId || ''}`.toLowerCase();
        const matchesSearch = fullSearch.includes(searchTerm.toLowerCase());
        const matchesDept = filterDept ? m.serviceDepartment === filterDept : true;
        return matchesSearch && matchesDept;
    });

    if (viewMode === 'edit') {
        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setEditFormData(prev => ({ ...prev, [name]: value }));
        };

        return (
            <div className="dashboard-content animate-fade-in">
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button 
                            onClick={() => setViewMode('list')} 
                            className="btn-back-modern"
                            style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            ← Back
                        </button>
                        <div>
                            <h2 style={{ margin: 0, color: 'var(--primary)' }}>✏️ አባልን ማስተካከል (Edit Member)</h2>
                            <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>የተማሪውን መረጃዎች እዚህ ማስተካከል ይችላሉ</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button className="btn btn-ghost" onClick={() => setViewMode('list')} style={{ padding: '12px 25px', borderRadius: '12px' }}>ሰርዝ (Cancel)</button>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleUpdateMember} 
                            disabled={submitting}
                            style={{ padding: '12px 30px', borderRadius: '12px', fontWeight: '800', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}
                        >
                            {submitting ? 'በማስተካከል ላይ...' : '💾 ሴቭ አድርግ (Save Changes)'}
                        </button>
                    </div>
                </div>

                <form className="card shadow-sm" style={{ padding: '30px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                        
                        {/* Personal Info */}
                        <div>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>👤 የግል መረጃ (Personal Info)</h4>
                            <div className="form-group">
                                <label>ስም (First Name)</label>
                                <input type="text" className="form-control" name="firstName" value={editFormData.firstName} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>የአባት ስም (Father Name)</label>
                                <input type="text" className="form-control" name="fatherName" value={editFormData.fatherName} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>የአያት ስም (Grandfather Name)</label>
                                <input type="text" className="form-control" name="grandFatherName" value={editFormData.grandFatherName} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>ጾታ (Gender)</label>
                                <select className="form-control" name="gender" value={editFormData.gender} onChange={handleInputChange}>
                                    <option value="">ምረጥ (Select)</option>
                                    <option value="ወንድ">ወንድ (Male)</option>
                                    <option value="ሴት">ሴት (Female)</option>
                                </select>
                            </div>
                        </div>

                        {/* Academic Info */}
                        <div>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>🎓 የትምህርት መረጃ (Academic Info)</h4>
                            <div className="form-group">
                                <label>የግቢ መታወቂያ (Student ID)</label>
                                <input type="text" className="form-control" name="studentId" value={editFormData.studentId} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>የትምህርት ክፍል (University Dept)</label>
                                <input type="text" className="form-control" name="department" value={editFormData.department} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>ባች (Batch)</label>
                                <select className="form-control" name="batch" value={editFormData.batch} onChange={handleInputChange}>
                                    <option value="">ምረጥ (Select)</option>
                                    <option value="Remedial">Remedial</option>
                                    <option value="Fresh">Fresh</option>
                                    <option value="1st Year">1st Year</option>
                                    <option value="2nd Year">2nd Year</option>
                                    <option value="3rd Year">3rd Year</option>
                                    <option value="4th Year">4th Year</option>
                                    <option value="5th Year">5th Year</option>
                                    <option value="6th Year">6th Year</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>የመረጡት አገልግሎት (Service Dept)</label>
                                <select className="form-control" name="serviceDepartment" value={editFormData.serviceDepartment} onChange={handleInputChange}>
                                    <option value="">ምረጥ (Select)</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Spiritual Info */}
                        <div>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>⛪ መንፈሳዊ መረጃ (Spiritual Info)</h4>
                            <div className="form-group">
                                <label>የክርስትና ስም (Christian Name)</label>
                                <input type="text" className="form-control" name="christianName" value={editFormData.christianName} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>የንስሐ አባት (Spiritual Father)</label>
                                <input type="text" className="form-control" name="spiritualFather" value={editFormData.spiritualFather} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>ክህነት (Ordination)</label>
                                <input type="text" className="form-control" name="ordination" value={editFormData.ordination} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>ማህበረ ቅዱሳን (Fellowship ID)</label>
                                <input type="text" className="form-control" name="fellowshipId" value={editFormData.fellowshipId} onChange={handleInputChange} />
                            </div>
                        </div>

                        {/* Address Info */}
                        <div>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>📍 አድራሻ (Address)</h4>
                            <div className="form-group">
                                <label>ስልክ ቁጥር (Phone Number)</label>
                                <input type="text" className="form-control" name="phone" value={editFormData.phone} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>ክልል (Region)</label>
                                <input type="text" className="form-control" name="region" value={editFormData.region} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>ዞን (Zone)</label>
                                <input type="text" className="form-control" name="zone" value={editFormData.zone} onChange={handleInputChange} />
                            </div>
                            <div className="form-group">
                                <label>ወረዳ / ከተማ (Woreda / City)</label>
                                <input type="text" className="form-control" name="woreda" value={editFormData.woreda} onChange={handleInputChange} />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

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
                        <h2 style={{ margin: 0, color: 'var(--primary)' }}>የአባል ዝርዝር መረጃ (Member Detail)</h2>
                        <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>ሁሉንም መረጃዎች እዚህ መከታተል ይችላሉ</p>
                    </div>
                </div>

                {loadingDetail ? (
                    <div style={{ padding: '8rem', textAlign: 'center', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                        <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                        <p style={{ color: '#64748b', fontWeight: '600' }}>የአባል መረጃ በመጫን ላይ...</p>
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
                                            <span className={`status-pill ${viewingMember.active ? 'active' : 'inactive'}`} style={{ padding: '6px 16px', fontSize: '0.75rem' }}>{viewingMember.active ? 'ACTIVE ACCOUNT' : 'BLOCKED ACCOUNT'}</span>
                                        </div>
                                    </div>
                                    {!isMerja && (
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                onClick={() => handleToggleStatus(viewingMember._id, viewingMember.active)}
                                                style={{ 
                                                    padding: '10px 20px', borderRadius: '12px', border: 'none', 
                                                    background: viewingMember.active ? '#fee2e2' : '#dcfce7',
                                                    color: viewingMember.active ? '#991b1b' : '#166534',
                                                    fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem'
                                                }}
                                            >
                                                {viewingMember.active ? '🚫 Block' : '✅ Unblock'}
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(viewingMember._id)}
                                                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: '#ef4444', fontWeight: '800', cursor: 'pointer', fontSize: '0.85rem' }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                            <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>👤</span> የግልና የትምህርት መረጃ
                                </h4>
                                <div className="detail-row"><strong>Full Name (AM):</strong> <span>{viewingMember.firstName} {viewingMember.fatherName} {viewingMember.grandFatherName}</span></div>
                                <div className="detail-row"><strong>Gender:</strong> <span>{viewingMember.gender}</span></div>
                                <div className="detail-row"><strong>Phone Number:</strong> <span>{viewingMember.phone}</span></div>
                                <div className="detail-row"><strong>University Dept:</strong> <span>{viewingMember.department}</span></div>
                                <div className="detail-row"><strong>Batch / Year:</strong> <span>{viewingMember.batch}</span></div>
                                <div className="detail-row"><strong>Fellowship ID:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '900', color: '#0369a1', background: '#f0f9ff', padding: '2px 8px', borderRadius: '4px' }}>{viewingMember.fellowshipId || 'N/A'}</span></div>
                            </div>

                            <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: '1.4rem' }}>📍</span> የመኖሪያ አድራሻ (Residential)
                                </h4>
                                <div className="detail-row"><strong>Region:</strong> <span>{viewingMember.region}</span></div>
                                <div className="detail-row"><strong>Zone:</strong> <span>{viewingMember.zone}</span></div>
                                <div className="detail-row"><strong>Woreda / City:</strong> <span>{viewingMember.woreda}</span></div>
                                <div className="detail-row"><strong>Kebele / House No:</strong> <span>{viewingMember.kebele}</span></div>
                            </div>

                            <div className="card shadow-sm" style={{ gridColumn: '1 / -1', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase' }}>መንፈሳዊ መረጃና ሌሎች (Spiritual & Additional)</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                    <div className="detail-row"><strong>Christian Name:</strong> <span>{viewingMember.christianName || 'N/A'}</span></div>
                                    <div className="detail-row"><strong>Spiritual Father:</strong> <span style={{ color: '#0369a1' }}>{viewingMember.spiritualFather || 'N/A'}</span></div>
                                    <div className="detail-row"><strong>Ordination:</strong> <span>{viewingMember.ordination || 'None'}</span></div>
                                    <div className="detail-row"><strong>Sunday School Saved:</strong> <span>{viewingMember.isSundaySchoolServed || 'N/A'}</span></div>
                                    <div className="detail-row"><strong>Joined Term:</strong> <span>{viewingMember.term || 'N/A'}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <style>{`
                    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #f1f5f9; font-size: 0.95rem; }
                    .detail-row:last-child { border-bottom: none; }
                    .detail-row strong { color: #64748b; font-weight: 600; }
                    .detail-row span { color: #1e293b; font-weight: 800; }
                `}</style>
            </div>
        );
    }

    return (
        <div className="dashboard-content animate-fade-in">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        🌐 ጠቅላላ የአባላት ዝርዝር (Master Members List)
                    </h2>
                    <p style={{ color: '#64748b', margin: '5px 0 0', fontWeight: '500' }}>የሁሉንም ክፍሎች አባላት በአንድ ላይ እዚህ ማስተዳደር ይችላሉ</p>
                </div>
                <button 
                    onClick={exportToCSV}
                    style={{ 
                        background: '#059669', color: 'white', border: 'none', padding: '12px 24px', 
                        borderRadius: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', 
                        alignItems: 'center', gap: '10px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s'
                    }}
                >
                    📊 ጠቅላላ ሪፖርት አውጣ (Master Export)
                </button>
            </div>

            <div className="card shadow-sm" style={{ marginBottom: '25px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1', minWidth: '300px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>🔍 አባልን ይፈልጉ (Search by Name, ID, Phone...)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ borderRadius: '10px', padding: '10px 15px', border: '1.5px solid #e2e8f0' }}
                        />
                    </div>
                    
                    <div style={{ width: '200px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>🏛️ በክፍል ይለዩ (Filter by Dept)</label>
                        <select 
                            className="form-control" 
                            value={filterDept} 
                            onChange={(e) => setFilterDept(e.target.value)}
                            style={{ borderRadius: '10px', fontWeight: '600' }}
                        >
                            <option value="">ሁሉም ክፍሎች (All Depts)</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div style={{ width: '150px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>📅 አመተ ምህረት (Term)</label>
                        <select 
                            className="form-control" 
                            value={selectedTerm} 
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            style={{ borderRadius: '10px', fontWeight: '600', color: 'var(--primary)' }}
                        >
                            {terms.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <button onClick={fetchMembers} className="action-btn-pill" style={{ height: '42px', padding: '0 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569' }}>🔄 አድስ</button>
                </div>
            </div>

            <div className="card shadow-sm" style={{ overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 25px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>አጠቃላይ የአባላት ዝርዝር</h3>
                        <span className="badge badge-primary" style={{ padding: '4px 12px', borderRadius: '30px' }}>{filteredMembers.length} አባላት</span>
                    </div>
                    
                    {selectedMemberId && !isMerja && (() => {
                        const m = members.find(m => m._id === selectedMemberId);
                        if (!m) return null;
                        return (
                            <RowActionMenu 
                                trigger={
                                    <div style={{ border: '1.5px solid #e2e8f0', background: '#fff', cursor: 'pointer', padding: '10px 20px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#334155' }}>አስተዳድሩ (Manage Member)</span>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                                        </div>
                                    </div>
                                }
                                actions={[
                                    { icon: '🔍', label: 'Details', onClick: () => fetchMemberDetail(selectedMemberId) },
                                    { divider: true },
                                    { icon: '✏️', label: 'Edit Profile', onClick: () => handleEditInitiate(m) },
                                    { icon: '🔑', label: 'Reset Password', onClick: () => handleResetPassword(m) },
                                    { 
                                        icon: m.active ? '🚫' : '✅', 
                                        label: m.active ? 'Block' : 'Unblock', 
                                        onClick: () => handleToggleStatus(m._id, m.active),
                                        color: m.active ? '#dc2626' : '#16a34a' 
                                    },
                                    { divider: true },
                                    { icon: '🗑️', label: 'Delete', onClick: () => handleDelete(m._id), color: '#dc2626' }
                                ]}
                            />
                        );
                    })()}
                </div>
                
                <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '15px 25px' }}>ተማሪ (Full Name)</th>
                                <th>የግቢ መለያ (Student ID)</th>
                                <th>ስልክ (Phone)</th>
                                <th>ዲፓርትመንት (Dept)</th>
                                {!isMerja && <th>ሁኔታ (Status)</th>}
                                {isMerja && <th>ድርጊት (Actions)</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={isMerja ? "4" : "5"} style={{ textAlign: 'center', padding: '4rem' }}>
                                    <div className="spinner" style={{ margin: '0 auto 15px' }}></div>
                                    <p style={{ color: '#64748b', fontWeight: '500' }}>በመጫን ላይ... (Loading Master List)</p>
                                </td></tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr><td colSpan={isMerja ? "4" : "5"} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>ምንም አባል አልተገኘም (No members found)</td></tr>
                            ) : (
                                filteredMembers.map(m => (
                                    <tr 
                                        key={m._id} 
                                        onClick={() => setSelectedMemberId(m._id)}
                                        className={`${!m.active ? 'inactive-row' : ''} ${selectedMemberId === m._id ? 'selected-row' : ''}`}
                                        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                    >
                                        <td style={{ padding: '15px 25px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'var(--primary)', fontSize: '1rem', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                    {m.firstName?.[0]}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '0.92rem', color: '#1e293b' }}>{m.firstName} {m.fatherName} {m.grandFatherName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{m.gender} • {m.batch}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><code style={{ fontSize: '0.85rem', background: '#f8fafc', padding: '3px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#475569' }}>{m.studentId}</code></td>
                                        <td><span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>{m.phone}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span className="dept-tag" style={{ border: 'none', background: 'rgba(99, 102, 241, 0.1)', color: '#4f46e5', fontWeight: '800', padding: '2px 10px', fontSize: '0.72rem' }}>{m.serviceDepartment}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '4px' }}>{m.department}</span>
                                            </div>
                                        </td>
                                        {!isMerja && (
                                            <td>
                                                <span className={`status-pill ${m.active ? 'active' : 'inactive'}`} style={{ letterSpacing: '0.5px', fontSize: '0.68rem', padding: '4px 12px' }}>
                                                    {m.active ? 'ACTIVE' : 'BLOCKED'}
                                                </span>
                                            </td>
                                        )}
                                        {isMerja && (
                                            <td>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); fetchMemberDetail(m._id); }}
                                                    style={{ background: '#e0f2fe', color: '#0369a1', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                >
                                                    🔍 ዝርዝር
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed #f1f5f9; font-size: 0.9rem; }
                .detail-row:last-child { border-bottom: none; }
                .detail-row strong { color: #64748b; font-weight: 600; }
                .detail-row span { color: #1e293b; font-weight: 700; }
                .selected-row { background: #eff6ff !important; border-left: 6px solid #3b82f6; }
                .inactive-row { background: #f9fafb; opacity: 0.7; }
                .dept-tag { border-radius: 6px; }
            `}</style>
        </div>
    );
};

export default AllMembersList;

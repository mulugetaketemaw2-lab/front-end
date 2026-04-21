import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const PendingApprovals = ({ token }) => {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'review'
  const [selectedIds, setSelectedIds] = useState([]);
  const [reviewing, setReviewing] = useState(null);
  const [approving, setApproving] = useState(false);
  const [disapproving, setDisapproving] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(null);
  const [filters, setFilters] = useState({
    batch: "all",
    department: "all",
    gender: "all",
    search: ""
  });

  const batches = ["Remedial", "Fresh", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "GC"];
  const departments = [
    "ትምህርት ክፍል", "አባላት ጉዳይ", "መዝሙር ክፍል", "ባች ክፍል", "ሙያ ክፍል", 
    "ልማት ክፍል", "ቋንቋ ክፍል", "መረጃ ክፍል", "ሂሳብ ክፍል", "ኦዲት"
  ];

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.batch !== "all") params.append("batch", filters.batch);
      if (filters.department !== "all") params.append("department", filters.department);
      if (filters.gender !== "all") params.append("gender", filters.gender);
      if (filters.search) params.append("search", filters.search);

      const res = await axios.get(`/members/pending?${params.toString()}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setPending(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch pending members");
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(pending.map(p => p._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApproveOne = async (memberId, dept) => {
    setApproving(true);
    try {
      await axios.put(`/members/approve/${memberId}`, 
        { serviceDepartment: dept }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("ተማሪው ጸድቋል! (Member approved!)");
      setReviewing(null);
      setViewMode('list');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const handleDisapproveOne = async (memberId, memberName) => {
    if (!window.confirm(`"${memberName}" ን ምዝገባ ለመሰረዝ ይፈልጋሉ? (Disapprove and delete this registration?)\nThis action cannot be undone.`)) return;
    setDisapproving(true);
    try {
      await axios.delete(`/members/${memberId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('ምዝገባው ተሰርዟል! (Registration disapproved and removed)');
      setReviewing(null);
      setViewMode('list');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Disapproval failed');
    } finally {
      setDisapproving(false);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    
    const dept = window.prompt("እባክዎ ለሁሉም የተመረጡት ተማሪዎች ክፍል ይጥቀሱ (Assign department for all selected):", "ትምህርት ክፍል");
    if (dept === null) return;

    setApproving(true);
    try {
      const res = await axios.post("/members/approve-batch", 
        { ids: selectedIds, serviceDepartment: dept },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      setSelectedIds([]);
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || "Batch approval failed");
    } finally {
      setApproving(false);
    }
  };

  if (viewMode === 'review' && reviewing) {
      return (
          <div className="dashboard-content animate-fade-in">
              <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                  <button 
                      onClick={() => { setReviewing(null); setViewMode('list'); }} 
                      style={{ 
                          background: '#fff', border: '1.5px solid #e2e8f0', padding: '10px 20px', 
                          borderRadius: '12px', cursor: 'pointer', fontWeight: '800', color: '#444',
                          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                  >
                      ← Back
                  </button>
                  <div>
                      <h2 style={{ margin: 0, color: 'var(--primary)' }}>ምዝገባ መገምገሚያ (Registration Review)</h2>
                      <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>አዲስ የተመዘገቡ ተማሪዎችን እዚህ መርምረው ያጽድቁ</p>
                  </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', gap: '30px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                      <div style={{ width: '150px', height: '150px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '5px solid #fff', background: '#f8fafc' }}>
                          {reviewing.photo ? (
                              <img src={reviewing.photo} alt="Profile" onClick={() => setViewPhoto(reviewing.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                          ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', color: '#cbd5e1' }}>👤</div>
                          )}
                      </div>
                      <div style={{ flex: 1 }}>
                          <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: '900', color: '#0f172a' }}>{reviewing.firstName} {reviewing.fatherName} {reviewing.grandFatherName}</h1>
                          <div style={{ display: 'flex', gap: '15px', marginTop: '12px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800' }}>🎓 {reviewing.department}</span>
                              <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700' }}>🆔 ID: {reviewing.studentId}</span>
                              <span style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700' }}>📅 Batch: {reviewing.batch}</span>
                          </div>
                      </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                      <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase' }}>📍 የግልና የአድራሻ መረጃ (Personal & Address)</h4>
                          <div className="detail-row"><strong>Gender:</strong> <span>{reviewing.gender}</span></div>
                          <div className="detail-row"><strong>Region:</strong> <span>{reviewing.region}</span></div>
                          <div className="detail-row"><strong>Zone/Woreda:</strong> <span>{reviewing.zone}, {reviewing.woreda}</span></div>
                          <div className="detail-row"><strong>Kebele:</strong> <span>{reviewing.kebele}</span></div>
                          <div className="detail-row"><strong>Phone:</strong> <span>{reviewing.phone}</span></div>
                      </div>

                      <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase' }}>⛪ መንፈሳዊ መረጃ (Spiritual Details)</h4>
                          <div className="detail-row"><strong>Ordination:</strong> <span>{reviewing.ordination}</span></div>
                          <div className="detail-row"><strong>Spiritual Father:</strong> <span style={{ color: '#0369a1' }}>{reviewing.spiritualFather || 'N/A'}</span></div>
                          <div className="detail-row"><strong>Previously Served:</strong> <span>{reviewing.isSundaySchoolServed || 'N/A'}</span></div>
                          <div className="detail-row"><strong>Christian Name:</strong> <span>{reviewing.christianName || 'N/A'}</span></div>
                      </div>

                      <div className="card shadow-sm" style={{ gridColumn: '1 / -1', padding: '30px', borderRadius: '24px', border: '1px solid #bfdbfe', background: '#f0f9ff' }}>
                          <h4 style={{ margin: '0 0 20px', color: '#0369a1', fontSize: '1.1rem', fontWeight: '900' }}>✅ ማጽደቂያና ክፍል መመደቢያ (Approval & Assignment)</h4>
                          <p style={{ margin: '0 0 20px', color: '#64748b', fontWeight: '500' }}>እባክዎ ተማሪው የሚመደብበትን የአገልግሎት ክፍል መርጠው ያጽድቁ። በማረጋገጫው ደስተኛ ካልሆኑ ምዝገባውን መሰረዝ ይችላሉ።</p>
                          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: '250px' }}>
                                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>የሚመደብበት ክፍል (Service Department)</label>
                                  <select 
                                      className="form-control" 
                                      value={reviewing.serviceDepartment} 
                                      onChange={e => setReviewing({...reviewing, serviceDepartment: e.target.value})}
                                      style={{ borderRadius: '12px', padding: '12px', border: '2px solid #bfdbfe', background: '#fff' }}
                                  >
                                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                  <button 
                                      onClick={() => handleDisapproveOne(reviewing._id, `${reviewing.firstName} ${reviewing.fatherName}`)} 
                                      disabled={disapproving || approving}
                                      style={{ padding: '14px 28px', border: 'none', borderRadius: '12px', background: '#fee2e2', color: '#991b1b', fontWeight: '800', cursor: 'pointer' }}
                                  >
                                      {disapproving ? 'ሰርዝ...' : '❌ ምዝገባውን ሰርዝ (Disapprove)'}
                                  </button>
                                  <button 
                                      onClick={() => handleApproveOne(reviewing._id, reviewing.serviceDepartment)} 
                                      disabled={approving || disapproving}
                                      style={{ padding: '14px 40px', border: 'none', borderRadius: '12px', background: 'var(--primary)', color: '#fff', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.25)' }}
                                  >
                                      {approving ? 'በማጽደቅ ላይ...' : '✅ አጽድቅ (Approve Member)'}
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

                {/* Photo Lightbox */}
                {viewPhoto && (
                  <div
                    onClick={() => setViewPhoto(null)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, cursor: 'zoom-out' }}
                  >
                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <img src={viewPhoto} alt="Full size" style={{ maxWidth: '80vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', display: 'block' }} />
                      <button className="close-btn lightbox-close" onClick={() => setViewPhoto(null)}>&times;</button>
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
      <div className="role-banner banner-abalat" data-symbol="🔔" style={{ marginBottom: '20px' }}>
        <div className="banner-icon">🔔</div>
        <div className="banner-text">
          <h2 className="banner-title">የተማሪዎች ማረጋገጫ (Pending Approvals)</h2>
          <p className="banner-subtitle">አዲስ የተመዘገቡ ተማሪዎችን መርምረው ያጽድቁ (Review and approve new registrations)</p>
        </div>
        <div className="banner-stats">
          <div className="banner-stat">
            <span className="banner-stat-num">{pending.length}</span>
            <span className="banner-stat-lbl">Pending</span>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="card shadow-sm" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>በስም ይፈልጉ (Search Name)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search..." 
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              style={{ borderRadius: '10px' }}
            />
          </div>
          <div style={{ width: '150px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ባች (Batch)</label>
            <select 
              className="form-control" 
              value={filters.batch}
              onChange={e => setFilters(prev => ({ ...prev, batch: e.target.value }))}
              style={{ borderRadius: '10px' }}
            >
              <option value="all">ሁሉም (All Batches)</option>
              {batches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ width: '180px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ክፍል (Dept)</label>
            <select 
              className="form-control" 
              value={filters.department}
              onChange={e => setFilters(prev => ({ ...prev, department: e.target.value }))}
              style={{ borderRadius: '10px' }}
            >
              <option value="all">All Depts</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={fetchPending} className="action-btn-pill" style={{ height: '42px', padding: '0 15px' }}>🔄 አድስ</button>
        </div>
      </div>

      {/* Batch Actions */}
      {selectedIds.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '15px 25px', borderRadius: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: 'slideDown 0.2s ease', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{selectedIds.length}</div>
              <span style={{ fontWeight: '700', color: '#1e40af', fontSize: '1.1rem' }}>
                ተማሪዎች ተመርጠዋል (Selected)
              </span>
          </div>
          <button 
            onClick={handleBatchApprove} 
            disabled={approving}
            style={{ margin: 0, padding: '12px 30px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.25)' }}
          >
            ✅ በጅምላ አጽድቅ (Batch Approve)
          </button>
        </div>
      )}

      <div className="card shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === pending.length && pending.length > 0} />
                </th>
                <th>ተማሪ (Student)</th>
                <th>የትምህርት ክፍል (Academic)</th>
                <th>መታወቂያ (ID)</th>
                <th>ድርጊት (Actions)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>በመጫን ላይ...</td></tr>
              ) : pending.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>ምንም የሚጸድቅ ተማሪ የለም</td></tr>
              ) : (
                pending.map(m => (
                  <tr key={m._id} className="member-tr">
                    <td>
                      <input type="checkbox" checked={selectedIds.includes(m._id)} onChange={() => handleSelectOne(m._id)} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {m.photo ? (
                          <img src={m.photo} alt="S" style={{ width: '45px', height: '45px', objectFit: 'cover', borderRadius: '12px', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                        ) : (
                          <div style={{ width: '45px', height: '45px', background: '#f1f5f9', color: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem' }}>{m.firstName?.[0]}</div>
                        )}
                        <div>
                          <div style={{ fontWeight: '800', color: '#1e293b' }}>{m.firstName} {m.fatherName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>{m.gender} • {m.batch}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: '#475569', fontSize: '0.9rem' }}>{m.department}</div>
                      <div style={{ fontSize: '0.72rem', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase', marginTop: '4px' }}>መርጠው የተመዘገቡት፡ {m.serviceDepartment}</div>
                    </td>
                    <td><span className="id-badge" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontWeight: '800', fontFamily: 'monospace' }}>{m.studentId}</span></td>
                    <td>
                      <button onClick={() => { setReviewing(m); setViewMode('review'); }} className="action-btn-pill" style={{ background: 'var(--primary)', color: 'white', padding: '8px 20px', fontWeight: '800', borderRadius: '10px' }}>
                        🔍 መርምር (Review)
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default PendingApprovals;

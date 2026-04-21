import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth } from '../utils/ethiopianDate';
import RowActionMenu from './RowActionMenu';

const Mezemran = ({ token, setView }) => {
  const [mezemranList, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'took1', 'sub2'
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [isAttendanceMode, setIsAttendanceMode] = useState(false);
  const [attendanceData, setAttendanceData] = useState({}); // { mezemranId: boolean }
  const [sessionTitle, setSessionTitle] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [availableTerms, setAvailableTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  
  const initialFormState = { 
    firstName: '',
    fatherName: '',
    grandFatherName: '',
    studentId: '',
    phone: '', 
    department: '',
    batch: '',
    gender: '',
    region: '',
    zone: '',
    woreda: '',
    kebele: '',
    subject: '', 
    availability: '', 
    category: 'መዘምራን 1 የወሰዱ',
    photo: '',
    term: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchTeachers = async (termParam) => {
    setLoading(true);
    try {
      const termToUse = termParam || selectedTerm;
      const termQuery = termToUse ? `?term=${encodeURIComponent(termToUse)}` : '';
      const { data } = await axios.get(`/mezemran${termQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(data);
    } catch (err) {
      toast.error('Failed to fetch mezemranList');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
    
    const handleClickOutside = (e) => {
      if (activeMenu && !e.target.closest('.dropdown-container')) {
        setActiveMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [token, activeMenu]);
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image size must be less than 20MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullName = `${formData.firstName} ${formData.fatherName} ${formData.grandFatherName}`.trim();
    const payload = { ...formData, name: fullName, term: selectedTerm };
    
    try {
      if (isEditing) {
        await axios.put(`/mezemran/${currentId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('መዘምራን በተሳካ ሁኔታ ተስተካክሏል!');
      } else {
        await axios.post('/mezemran', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('መዘምራን በተሳካ ሁኔታ ተመዝግቧል!');
      }
      fetchTeachers();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher/member?')) return;
    try {
      await axios.delete(`/mezemran/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Deleted successfully');
      setSelectedId(null);
      fetchTeachers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = !item.active;
      await axios.put(`/mezemran/${item._id}`, { active: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`በትክክል ${newStatus ? 'አክቲቭ ሆኗል (Unblocked)' : 'ታግዷል (Blocked)'}`);
      fetchTeachers();
    } catch (err) {
      toast.error('የሁኔታ ለውጥ አልተሳካም (Failed to change status)');
    }
  };

  const handleToggleCategory = async (mezemran) => {
    const isPassing = mezemran.category === 'መዘምራን 1 የወሰዱ';
    const newCategory = isPassing ? 'መዘምራን 2 ደርሰዋል' : 'መዘምራን 1 የወሰዱ';
    
    if (isPassing) {
      if (!window.confirm(`${m.name} ወደ መዘምራን 2 ደርሰዋል እንዲሸጋገር ይፈልጋሉ? (Pass to Level 2?)`)) return;
    } else {
      if (!window.confirm(`${m.name} ወደ ተተኪ 1 እንዲመለስ ይፈልጋሉ? (Move back to Level 1?)`)) return;
    }

    try {
      // Optimistic update
      setTeachers(prev => prev.map(t => t._id === m._id ? { ...t, category: newCategory } : t));
      
      await axios.put(`/mezemran/${m._id}`, { category: newCategory }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isPassing 
        ? `${m.name} ወደ መዘምራን 2 ደርሰዋል በተሳካ ሁኔታ ተሸጋግሯል! (Passed to Level 2)`
        : `${m.name} ወደ ተተኪ 1 ተመልሷል`
      );
    } catch (err) {
      toast.error('ሁኔታውን መለወጥ አልተቻለም');
      fetchTeachers(); // Revert on error
    }
  };

  const handleToggleAttendanceMode = () => {
    if (!isAttendanceMode) {
      // Initialize everyone as present by default when starting
      const initialAttendance = {};
      filteredTeachers.forEach(t => {
        initialAttendance[t._id] = true;
      });
      setAttendanceData(initialAttendance);
      
      // Get current Ethiopian date for the session title
      const ethDate = greToEth(new Date());
      const formattedMonth = ethDate.month < 10 ? `0${ethDate.month}` : ethDate.month;
      const ethTitle = `${ethDate.monthAmharic} ${ethDate.day}/${formattedMonth}/${ethDate.year} - የትምህርት ክትትል (${selectedTerm || ''})`;
      setSessionTitle(ethTitle);
    }
    setIsAttendanceMode(!isAttendanceMode);
  };

  const handleAttendanceChange = (mezemranId) => {
    setAttendanceData(prev => ({
      ...prev,
      [mezemranId]: !prev[mezemranId]
    }));
  };

  const handleSaveAttendance = async () => {
    if (!sessionTitle) return toast.error('Please enter a session title');
    
    const attendanceRecords = Object.keys(attendanceData).map(id => ({
      mezemran: id,
      present: attendanceData[id]
    }));

    try {
      await axios.post('/mezemran/sessions', {
        title: sessionTitle,
        category: 'መዘምራን 1 የወሰዱ',
        attendance: attendanceRecords,
        term: selectedTerm
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('የተተኪዎች ክትትል በተሳካ ሁኔታ ተመዝግቧል!');
      setIsAttendanceMode(false);
      fetchSessions(); // Refresh history
    } catch (err) {
      toast.error('Failed to save attendance');
    }
  };

  const fetchSessions = async (termParam) => {
    try {
      const termToUse = termParam || selectedTerm;
      const termQuery = termToUse ? `&term=${encodeURIComponent(termToUse)}` : '';
      const { data } = await axios.get(`/mezemran/sessions?category=መዘምራን 1 የወሰዱ${termQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(data);
    } catch (err) {
      console.log('Failed to fetch sessions');
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
      const currentTerm = settingsRes.data.currentTerm;
      if (currentTerm) {
        setSelectedTerm(currentTerm);
      }
      if (termsRes.data.success) {
        setAvailableTerms(termsRes.data.terms);
      }
    } catch (err) {
      console.error('Error fetching initial settings:', err);
    }
  };

  const exportToCSV = () => {
    if (mezemranList.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Full Name", "ID", "Phone", "Gender", "University Department", "Batch", "Subject", "Availability", "Category", "Region", "Zone", "Woreda", "Kebele", "Status"];
    const rows = mezemranList.map(m => {
      const fullName = (m.firstName || m.fatherName) 
        ? `${m.firstName || ''} ${m.fatherName || ''} ${m.grandFatherName || ''}`.trim() 
        : (m.name || "N/A");
      
      return [
        fullName,
        m.studentId || "N/A",
        m.phone ? ` ${m.phone}` : "N/A", // Leading space to prevent scientific notation in Excel
        m.gender || "N/A",
        m.department || "N/A",
        m.batch || "N/A",
        m.subject || "N/A",
        m.availability || "N/A",
        m.category || "N/A",
        m.region || "N/A",
        m.zone || "N/A",
        m.woreda || "N/A",
        m.kebele || "N/A",
        m.active !== false ? "Active" : "Blocked"
      ];
    });

    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Mezemran_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("የመዘምራን ሪፖርት ወጥቷል!");
  };

  useEffect(() => {
    if (selectedTerm) {
      fetchTeachers(selectedTerm);
      fetchSessions(selectedTerm);
    }
  }, [selectedTerm]);

  const handleViewDetail = async (mezemran) => {
    setViewingTeacher(mezemran);
    setViewLoading(true);
    setActiveMenu(false);
    try {
      if (m.studentId) {
        const { data } = await axios.get(`/members/by-student-id/${m.studentId.trim()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setViewingMember(data);
      } else {
        setViewingMember(null);
      }
    } catch (err) {
      console.log('Member profile not found for this mezemran');
      setViewingMember(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = (m) => {
    const nameParts = (m.name || "").trim().split(/\s+/);
    setCurrentId(m._id);
    setIsEditing(true);
    setFormData({
      ...m,
      firstName: nameParts[0] || "",
      fatherName: nameParts[1] || "",
      grandFatherName: nameParts[2] || ""
    });
    setShowModal(true);
    setActiveMenu(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentId(null);
    setFormData(initialFormState);
  };

  const filteredTeachers = activeTab === 'all' 
    ? mezemranList 
    : mezemranList.filter(t => t.category === (activeTab === 'took1' ? 'መዘምራን 1 የወሰዱ' : 'መዘምራን 2 ደርሰዋል'));

  const selectedTeacher = mezemranList.find(t => t._id === selectedId);

  return (
    <div className="dashboard-content animate-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>👨‍🏫 መዘምራን (Mezemran)</h2>
          <p style={{ color: '#666', margin: '5px 0 0' }}>የተተኪ መምህራንን ዝርዝር በየክፍሉ እዚህ ማስተዳደር ይችላሉ</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isAttendanceMode ? (
            <>
              {activeTab === 'took1' && (
                <>
                  <button className="btn btn-ghost" onClick={() => setView('mezemran-history')} style={{ border: '1px solid #e2e8f0' }}>
                    📜 የታሪክ መዝገብ (History)
                  </button>
                  <button className="btn btn-ghost" onClick={() => setView('mezemran-attendance')} style={{ border: '1px solid #e2e8f0' }}>
                    📋 ክትትል መዝግብ (Attendance)
                  </button>
                </>
              )}
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <span>➕</span> አዲስ መምህር መዝግብ (Add)
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => setIsAttendanceMode(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveAttendance}>💾 Save Attendance</button>
            </>
          )}
        </div>
      </div>

      {isAttendanceMode && (
        <div className="attendance-header card shadow-sm" style={{ padding: '20px', marginBottom: '20px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: '700', color: '#0369a1' }}>የክፍለ ጊዜው መጠሪያ (Session Title / Date)</label>
            <input 
              type="text" 
              className="form-control" 
              value={sessionTitle} 
              onChange={e => setSessionTitle(e.target.value)}
              placeholder={`e.g. መስከረም 1/01/${greToEth(new Date()).year} - መዘምራን 1 የወሰዱ መደበኛ ትምህርት`}
              style={{ background: '#fff' }}
            />
          </div>
        </div>
      )}



      <div className="tabs-container" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('all')}
        >
          ሁሉም (All)
        </button>
        <button 
          className={`btn ${activeTab === 'took1' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('took1')}
        >
          መዘምራን 1 የወሰዱ
        </button>
        <button 
          className={`btn ${activeTab === 'sub2' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('sub2')}
        >
          መዘምራን 2 ደርሰዋል
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>የተተኪዎች ዝርዝር (Mezemran List)</h3>
            <span className="badge badge-primary">{filteredTeachers.length}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              className="form-control" 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)}
              style={{ padding: '6px 12px', height: '34px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', width: 'auto' }}
            >
              {availableTerms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', padding: '6px 12px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <span>Active</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginLeft: '10px' }}></span>
              <span>Inactive</span>
            </div>

            {selectedId && (() => {
              const m = mezemranList.find(t => t._id === selectedId);
              if (!m) return null;
              return (
                <RowActionMenu 
                  trigger={
                    <div style={{ border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Actions for Selected</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }}></div>
                      </div>
                    </div>
                  }
                  actions={[
                    { icon: '🔍', label: 'View Details', onClick: () => handleViewDetail(m) },
                    { icon: '✏️', label: 'Edit Profile', onClick: () => handleEdit(m) },
                    { divider: true },
                    { icon: '🗑️', label: 'Delete Teacher', onClick: () => handleDelete(selectedId), color: '#dc2626' }
                  ]}
                />
              );
            })()}
            <button 
              onClick={exportToCSV}
              style={{ 
                background: '#059669', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '8px', 
                fontWeight: '600', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                fontSize: '0.85rem',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
              }}
            >
              📊 ሪፖርት አውጣ (Export CSV)
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>አስተማሪ (Teacher)</th>
                <th>የግቢ ID (Student ID)</th>
                <th>ስልክ (Phone)</th>
                <th>ዲፓርትመንት (Dept)</th>
                <th>አድራሻ (Address)</th>
                <th>{isAttendanceMode ? 'የትምህርት ክትትል (Attendance)' : 'ምድብ (Category)'}</th>
                <th>ድርጊት (Action)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>የመረጃ ፍለጋ ላይ ነው (Loading...)...</td></tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
                    ምንም መዘምራን አልተገኘም
                  </td>
                </tr>
              ) : (
                filteredTeachers.map(mezemran => (
                  <tr 
                    key={mezemran._id}
                    onClick={() => setSelectedId(selectedId === mezemran._id ? null : mezemran._id)}
                    className={`${!mezemran.active ? 'inactive-row' : ''} ${selectedId === mezemran._id ? 'selected-row' : ''}`}
                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{mezemran.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{mezemran.gender || '—'}</div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: '0.85rem' }}>{mezemran.studentId || '—'}</code></td>
                    <td>{mezemran.phone}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500' }}>{mezemran.department || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{mezemran.batch || ''}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {mezemran.region ? `${mezemran.region}, ${mezemran.zone}` : '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {!isAttendanceMode ? (
                          <>
                            <input 
                              type="checkbox" 
                              checked={mezemran.category === 'መዘምራን 2 ደርሰዋል'} 
                              onChange={(e) => { e.stopPropagation(); handleToggleCategory(mezemran); }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span className={`status-pill ${mezemran.category === 'መዘምራን 1 የወሰዱ' ? 'active' : 'inactive'}`} style={{ fontSize: '0.7rem', opacity: mezemran.active ? 1 : 0.6 }}>
                              {mezemran.category}
                            </span>
                            {!mezemran.active && (
                                <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold' }}>
                                🚫
                                </span>
                            )}
                          </>
                        ) : (
                          <>
                            <input 
                              type="checkbox" 
                              checked={attendanceData[mezemran._id] || false} 
                              onChange={(e) => { e.stopPropagation(); handleAttendanceChange(mezemran._id); }}
                              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <span style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: '700', 
                              color: attendanceData[mezemran._id] ? '#166534' : '#991b1b' 
                            }}>
                              {attendanceData[mezemran._id] ? '✅ Present' : '❌ Absent'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(mezemran); }}
                        className={`action-btn-pill ${mezemran.active ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '6px 12px', fontSize: '0.7rem', border: 'none', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      >
                        {mezemran.active ? '🚫 Block' : '✅ Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="dashboard-content animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#f8fafc', overflowY: 'auto', padding: '20px' }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', maxWidth: '800px', margin: '0 auto 25px auto' }}>
            <button onClick={handleCloseModal} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              ← Back
            </button>
            <div>
               <h2 style={{ margin: 0, color: 'var(--primary)' }}>{isEditing ? '✏️ መዘምራን መረጃ ማስተካከያ (Edit Profile)' : '➕ አዲስ መዘምራን መመዝገቢያ (Register Choir)'}</h2>
               <p style={{ margin: '5px 0 0', color: '#64748b' }}>እባክዎ ትክክለኛ መረጃዎችን በጥንቃቄ ያስገቡ</p>
            </div>
          </div>
          
          <div style={{ 
            background: '#ffffff', 
            padding: '40px', 
            borderRadius: '24px', 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            maxWidth: '800px',
            margin: '0 auto 40px auto',
            border: '1px solid #e2e8f0'
          }}>
            <form onSubmit={handleSubmit}>
              {/* Photo Upload Section */}
              <div style={{ marginBottom: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', border: '3px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                  {formData.photo ? (
                    <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '48px' }}>👤</span>
                  )}
                  {formData.photo && (
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, photo: "" }))}
                      style={{ position: 'absolute', bottom: 0, right: 0, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                      &times;
                    </button>
                  )}
                </div>
                <label style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: '700', textDecoration: 'underline' }}>
                  {formData.photo ? 'ፎቶ ቀይር (Change Photo)' : 'የመዘምራኑን ፎቶ እዚህ ይጫኑ (Upload Photo)'}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="form-section">
                <h4 style={{ color: 'var(--primary)', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '1.1rem', fontWeight: '800' }}>👤 የግል መረጃ (Personal Details)</h4>
                
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ስም (First Name)</label>
                    <input className="form-control" type="text" value={formData.firstName} onChange={e => { if (/^[\u1200-\u137F\s/]*$/.test(e.target.value)) setFormData({...formData, firstName: e.target.value}) }} required style={{ borderRadius: '12px', padding: '12px' }} />
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአባት (Father)</label>
                    <input className="form-control" type="text" value={formData.fatherName} onChange={e => { if (/^[\u1200-\u137F\s/]*$/.test(e.target.value)) setFormData({...formData, fatherName: e.target.value}) }} required style={{ borderRadius: '12px', padding: '12px' }} />
                  </div>
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአያት (Grandfather)</label>
                    <input className="form-control" type="text" value={formData.grandFatherName} onChange={e => { if (/^[\u1200-\u137F\s/]*$/.test(e.target.value)) setFormData({...formData, grandFatherName: e.target.value}) }} required style={{ borderRadius: '12px', padding: '12px' }} />
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ጾታ (Gender)</label>
                    <select className="form-control" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} style={{ borderRadius: '12px', padding: '12px' }}>
                      <option value="">ይምረጡ</option>
                      <option value="Male">ወንድ (Male)</option>
                      <option value="Female">ሴት (Female)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ምድብ (Category)</label>
                    <select className="form-control" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} required style={{ borderRadius: '12px', padding: '12px' }}>
                      <option value="መዘምራን 1 የወሰዱ">መዘምራን 1 የወሰዱ</option>
                      <option value="መዘምራን 2 ደርሰዋል">መዘምራን 2 ደርሰዋል</option>
                    </select>
                  </div>
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ተማሪ መታወቂያ (Student ID)</label>
                    <input className="form-control" type="text" value={formData.studentId} onChange={e => { if (/^[a-zA-Z0-9/\-_.]*$/.test(e.target.value)) setFormData({...formData, studentId: e.target.value}) }} placeholder="WU/..." style={{ borderRadius: '12px', padding: '12px' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ስልክ ቁጥር (Phone)</label>
                    <input className="form-control" type="text" value={formData.phone} onChange={e => { if (/^[0-9]*$/.test(e.target.value)) setFormData({...formData, phone: e.target.value}) }} required placeholder="09..." style={{ borderRadius: '12px', padding: '12px' }} />
                  </div>
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '30px' }}>
                <h4 style={{ color: 'var(--primary)', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '1.1rem', fontWeight: '800' }}>🎓 የዩኒቨርሲቲ እና የትምህርት መረጃ (University)</h4>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ዲፓርትመንት (Department)</label>
                    <select className="form-control" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ borderRadius: '12px', padding: '12px' }}>
                      <option value="">ትምህርት ክፍል ይምረጡ</option>
                      {['Software engineering', 'Computer science', 'information Technology', 'information system', 'electrical engineering', 'Mechatronics engineering', 'Mechanical engineering', 'Civil engineering', 'Textile engineering', 'Water Resource and Irrigation engineering', 'Industrial engineering', 'Cotem engineering', 'Garment engineering', 'Leather engineering', 'Chemical engineering', 'Food Engineering', 'Construction Technology and Management', 'Hydraulics', 'Biomedical Engineering', 'Fashion design', 'Architecture', 'Msc', 'የለም/ሌላ'].map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ባች (Batch)</label>
                    <select className="form-control" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} style={{ borderRadius: '12px', padding: '12px' }}>
                      <option value="">Select Batch</option>
                      {['Remedial', 'Fresh', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'GC'].map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ትምህርት (Subject)</label>
                    <input type="text" className="form-control" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="የሚያስተምሩት ትምህርት" style={{ borderRadius: '12px', padding: '12px' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአገልግሎት ጊዜ (Availability)</label>
                    <input type="text" className="form-control" value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} placeholder="ለምሳሌ፡ ቅዳሜና እሁድ" style={{ borderRadius: '12px', padding: '12px' }} />
                  </div>
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ color: '#475569', marginBottom: '15px', fontSize: '1rem', fontWeight: '700' }}>📍 የመኖሪያ አድራሻ (Address)</h4>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ክልል (Region)</label>
                    <input type="text" className="form-control" value={formData.region} onChange={e => { if (/^[\u1200-\u137F\s/]*$/.test(e.target.value)) setFormData({...formData, region: e.target.value}) }} style={{ borderRadius: '10px' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ዞን (Zone)</label>
                    <input type="text" className="form-control" value={formData.zone} onChange={e => { if (/^[\u1200-\u137F\s/]*$/.test(e.target.value)) setFormData({...formData, zone: e.target.value}) }} style={{ borderRadius: '10px' }} />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ወረዳ (Woreda)</label>
                    <input type="text" className="form-control" value={formData.woreda} onChange={e => { if (/^[\u1200-\u137F\s/]*$/.test(e.target.value)) setFormData({...formData, woreda: e.target.value}) }} style={{ borderRadius: '10px' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ቀበሌ (Kebele)</label>
                    <input type="text" className="form-control" value={formData.kebele} onChange={e => { if (/^[\u1200-\u137F\s/0-9]*$/.test(e.target.value)) setFormData({...formData, kebele: e.target.value}) }} style={{ borderRadius: '10px' }} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '40px', paddingBottom: '10px', display: 'flex', gap: '15px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                  {isEditing ? '💾 መረጃውን አድስ (Update Profile)' : '✅ መዝግብ (Complete Registration)'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={handleCloseModal} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: '#f1f5f9', color: '#64748b', fontWeight: '700' }}>ሰርዝ (Cancel)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingTeacher && (
        <div className="modal-overlay" onClick={() => setViewingTeacher(null)}>
          <div className="modal-content animate-zoom-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)', color: '#fff', padding: '20px 25px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>📋 የመዘምራን ዝርዝር መረጃ</h3>
              <button className="close-btn" onClick={() => setViewingTeacher(null)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ padding: '0' }}>
              {viewLoading ? (
                <div style={{ padding: '4rem', textAlign: 'center' }}>
                  <div className="spinner"></div>
                  <p style={{ marginTop: '1rem', color: '#64748b' }}>መረጃ በመፈለግ ላይ...</p>
                </div>
              ) : (
                <div className="mezemran-detail-view">
                  <div className="detail-hero" style={{ padding: '30px', background: '#f8fafc', display: 'flex', gap: '25px', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <div className="detail-photo-container" style={{ width: '120px', height: '120px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#fff', border: '3px solid #fff' }}>
                      {viewingMember?.photo ? (
                        <img src={viewingMember.photo} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '40px' }}>👤</div>
                      )}
                    </div>
                    <div className="detail-main-info">
                      <h2 style={{ margin: '0 0 5px', fontSize: '1.5rem', color: '#1e293b' }}>{viewingTeacher.name}</h2>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{viewingTeacher.category}</span>
                        {viewingMember?.fellowshipId && (
                          <span className="badge" style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534' }}>ID: {viewingMember.fellowshipId}</span>
                        )}
                      </div>
                      <p style={{ margin: '10px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                        <span style={{ marginRight: '15px' }}>📱 {viewingTeacher.phone}</span>
                        <span>🆔 {viewingTeacher.studentId || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="detail-grid" style={{ padding: '25px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '25px' }}>
                    <div className="detail-section">
                      <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎓 Academic Info</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Department:</span>
                          <span style={{ fontWeight: '600', color: '#334155' }}>{viewingTeacher.department || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Batch:</span>
                          <span style={{ fontWeight: '600', color: '#334155' }}>{viewingTeacher.batch || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Subject:</span>
                          <span style={{ fontWeight: '600', color: '#334155' }}>{viewingTeacher.subject || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="detail-section">
                      <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📍 Residence Info</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Region/Zone:</span>
                          <span style={{ fontWeight: '600', color: '#334155', textAlign: 'right' }}>{viewingTeacher.region ? `${viewingTeacher.region}, ${viewingTeacher.zone}` : '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Woreda/Kebele:</span>
                          <span style={{ fontWeight: '600', color: '#334155', textAlign: 'right' }}>{viewingTeacher.woreda ? `${viewingTeacher.woreda}, ${viewingTeacher.kebele}` : '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Availability:</span>
                          <span style={{ fontWeight: '600', color: '#334155' }}>{viewingTeacher.availability || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {viewingMember && (
                    <div style={{ margin: '0 25px 25px', padding: '15px', background: '#eff6ff', borderRadius: '12px', border: '1px solid #dbeafe' }}>
                      <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#1e40af' }}>ℹ️ Linked Fellowship Member Profile</h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#3b82f6', lineHeight: '1.4' }}>
                        This mezemran is registered as a fellowship member. Their profile photo and Fellowship ID have been automatically linked via Student ID.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="modal-footer" style={{ padding: '15px 25px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-ghost" onClick={() => setViewingTeacher(null)}>Close Window</button>
              <button className="btn btn-primary" onClick={() => { handleEdit(viewingTeacher); setViewingTeacher(null); }}>✏️ Edit Profile</button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content animate-zoom-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', borderRadius: '16px', overflow: 'hidden' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)', color: '#fff' }}>
              <h3 style={{ margin: 0 }}>📜 የታሪክ መዝገብ (Attendance History)</h3>
              <button className="close-btn" onClick={() => setShowHistory(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '0' }}>
              {!selectedSession ? (
                <div className="sessions-list" style={{ padding: '20px' }}>
                  {sessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      <div style={{ fontSize: '40px' }}>📭</div>
                      ምንም የታሪክ መዝገብ የለም
                    </div>
                  ) : (
                    <div className="data-table-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                      <table className="data-table">
                        <thead style={{ background: '#f8fafc' }}>
                          <tr>
                            <th>ርዕስ (Title)</th>
                            <th>ቀን (Date)</th>
                            <th>ተገኝተዋል (Present)</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map(s => {
                            const ethDate = greToEth(s.date);
                            const formattedMonth = ethDate.month < 10 ? `0${ethDate.month}` : ethDate.month;
                            return (
                              <tr key={s._id}>
                                <td><strong>{s.title}</strong></td>
                                <td>{`${ethDate.monthAmharic} ${ethDate.day}/${formattedMonth}/${ethDate.year}`}</td>
                                <td>
                                  <span className="badge badge-primary" style={{ background: '#dcfce7', color: '#166534' }}>
                                    {s.attendance.filter(r => r.present).length} / {s.attendance.length}
                                  </span>
                                </td>
                                <td>
                                  <button className="btn btn-ghost" onClick={() => setSelectedSession(s)} style={{ color: 'var(--primary)', fontWeight: '600' }}>🔍 View Results</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="session-detail" style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedSession(null)} style={{ fontSize: '0.85rem' }}>← Back to List</button>
                    <h4 style={{ margin: 0, color: '#1e293b' }}>{selectedSession.title}</h4>
                  </div>
                  <div className="data-table-wrap" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', maxHieght: '400px', overflowY: 'auto' }}>
                    <table className="data-table">
                      <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                        <tr>
                          <th>አስተማሪ (Teacher)</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSession.attendance.map((record, idx) => (
                          <tr key={idx}>
                            <td><strong>{record.m?.name || 'Unknown Teacher'}</strong></td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ 
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: '700', 
                                background: record.present ? '#dcfce7' : '#fee2e2',
                                color: record.present ? '#166534' : '#991b1b',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}>
                                {record.present ? '✅ Present' : '❌ Absent'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0' }}>
               <button className="btn btn-ghost" onClick={() => setShowHistory(false)}>Close History</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .selected-row { background: #e0f2fe !important; border-left: 5px solid #0369a1; box-shadow: inset 0 0 0 1px #bae6fd; }
        .data-table tr:hover:not(.selected-row) { background: #f8fafc; }
        .dropdown-item { width: 100%; text-align: left; padding: 10px 16px; border: none; background: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #475569; transition: background 0.2s; display: flex; align-items: center; gap: 8px; }
        .dropdown-item:hover { background: #f8fafc; color: var(--primary); }
        .menu-trigger:hover { background: #f1f5f9; }
        .status-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; }
        .status-pill.active { background: #dcfce7; color: #166534; }
        .status-pill.inactive { background: #fee2e2; color: #991b1b; }
        
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes dropdownIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-zoom-in {
          animation: zoomIn 0.2s ease-out forwards;
        }

        .form-section h4 {
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .modal-body {
          max-height: 75vh;
          overflow-y: auto;
          scrollbar-width: thin;
        }
        .modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .modal-body::-webkit-scrollbar-thumb {
          background-color: #ddd;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default Mezemran;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth } from '../utils/ethiopianDate';
import RowActionMenu from './RowActionMenu';

const SubstituteLeaders = ({ token, setView }) => {
  const [leaders, setLeaders] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'detail', 'form'
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); 
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(false);
  const [viewingLeader, setViewingLeader] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState({}); 
  const [sessionTitle, setSessionTitle] = useState('');
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
    position: '', 
    availability: '', 
    category: 'ተተኪ አመራር 1 የወሰዱ',
    photo: '',
    term: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchLeaders = async (termParam) => {
    setLoading(true);
    try {
      const termToUse = termParam || selectedTerm;
      const termQuery = termToUse ? `&term=${encodeURIComponent(termToUse)}` : '';
      const { data } = await axios.get(`/substitute-leaders?${termQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLeaders(data);
    } catch (err) {
      toast.error('Failed to fetch leaders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
    
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
        await axios.put(`/substitute-leaders/${currentId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ተተኪ አመራር በተሳካ ሁኔታ ተስተካክሏል!');
      } else {
        await axios.post('/substitute-leaders', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ተተኪ አመራር በተሳካ ሁኔታ ተመዝግቧል!');
      }
      fetchLeaders();
      handleCloseForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leader?')) return;
    try {
      await axios.delete(`/substitute-leaders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Leader deleted successfully');
      setSelectedId(null);
      fetchLeaders();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = !item.active;
      await axios.put(`/substitute-leaders/${item._id}`, { active: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`በትክክል ${newStatus ? 'አክቲቭ ሆኗል (Unblocked)' : 'ታግዷል (Blocked)'}`);
      fetchLeaders();
      if (viewingLeader?._id === item._id) {
          setViewingLeader(prev => ({ ...prev, active: newStatus }));
      }
    } catch (err) {
      toast.error('የሁኔታ ለውጥ አልተሳካም (Failed to change status)');
    }
  };

  const handleToggleCategory = async (leader) => {
    const isPassing = leader.category === 'ተተኪ አመራር 1 የወሰዱ';
    const newCategory = isPassing ? 'ተተኪ 2 የወሰዱ' : 'ተተኪ አመራር 1 የወሰዱ';
    
    if (isPassing) {
      if (!window.confirm(`${leader.name} ወደ ተተኪ 2 እንዲሸጋገር ይፈልጋሉ? (Pass to Level 2?)`)) return;
    } else {
      if (!window.confirm(`${leader.name} ወደ ተተኪ 1 እንዲመለስ ይፈልጋሉ? (Move back to Level 1?)`)) return;
    }

    try {
      // Optimistic update
      setLeaders(prev => prev.map(l => l._id === leader._id ? { ...l, category: newCategory } : l));
      
      await axios.put(`/substitute-leaders/${leader._id}`, { category: newCategory }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isPassing 
        ? `${leader.name} ወደ ተተኪ 2 በተሳካ ሁኔታ ተሸጋግሯል! (Passed to Level 2)`
        : `${leader.name} ወደ ተተኪ 1 ተመልሷል`
      );
      if (viewingLeader?._id === leader._id) {
          setViewingLeader(prev => ({ ...prev, category: newCategory }));
      }
    } catch (err) {
      toast.error('ሁኔታውን መለወጥ አልተቻለም');
      fetchLeaders(); // Revert on error
    }
  };

  const handleToggleAttendanceMode = () => {
    setViewMode('attendance');
    const initialAttendance = {};
    filteredLeaders.forEach(l => {
      initialAttendance[l._id] = true;
    });
    setAttendanceData(initialAttendance);
    
    const ethDate = greToEth(new Date());
    const formattedMonth = ethDate.month < 10 ? `0${ethDate.month}` : ethDate.month;
    const ethTitle = `${ethDate.monthAmharic} ${ethDate.day}/${formattedMonth}/${ethDate.year} - የአመራር ክትትል (${selectedTerm || ''})`;
    setSessionTitle(ethTitle);
  };

  const handleAttendanceChange = (leaderId) => {
    setAttendanceData(prev => ({
      ...prev,
      [leaderId]: !prev[leaderId]
    }));
  };

  const handleSaveAttendance = async () => {
    if (!sessionTitle) return toast.error('Please enter a session title');
    
    const attendanceRecords = Object.keys(attendanceData).map(id => ({
      leader: id,
      present: attendanceData[id]
    }));

    try {
      await axios.post('/substitute-leaders/sessions', {
        title: sessionTitle,
        category: 'ተተኪ አመራር 1 የወሰዱ',
        attendance: attendanceRecords,
        term: selectedTerm
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('የተተኪ አመራሮች ክትትል በተሳካ ሁኔታ ተመዝግቧል!');
      setViewMode('list');
      fetchSessions();
    } catch (err) {
      toast.error('Failed to save attendance');
    }
  };

  const fetchSessions = async (termParam) => {
    try {
      const termToUse = termParam || selectedTerm;
      const termQuery = termToUse ? `&term=${encodeURIComponent(termToUse)}` : '';
      const { data } = await axios.get(`/substitute-leaders/sessions?category=ተተኪ አመራር 1 የወሰዱ${termQuery}`, {
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
    if (leaders.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Full Name", "ID", "Phone", "Gender", "University Department", "Batch", "Position", "Availability", "Category", "Region", "Zone", "Woreda", "Kebele", "Status"];
    const rows = leaders.map(l => {
      const fullName = (l.firstName && l.fatherName) 
        ? `${l.firstName} ${l.fatherName} ${l.grandFatherName || ''}`.trim() 
        : (l.name || "N/A");
      
      return [
        fullName,
        l.studentId || "N/A",
        l.phone ? ` ${l.phone}` : "N/A", // Leading space to prevent scientific notation in Excel
        l.gender || "N/A",
        l.department || "N/A",
        l.batch || "N/A",
        l.position || "N/A",
        l.availability || "N/A",
        l.category || "N/A",
        l.region || "N/A",
        l.zone || "N/A",
        l.woreda || "N/A",
        l.kebele || "N/A",
        l.active !== false ? "Active" : "Blocked"
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
    link.setAttribute("download", `Substitute_Leaders_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("የተተኪ አመራሮች ሪፖርት ወጥቷል!");
  };

  useEffect(() => {
    if (selectedTerm) {
      fetchLeaders(selectedTerm);
      fetchSessions(selectedTerm);
    }
  }, [selectedTerm]);

  const handleViewDetail = async (leader) => {
    setViewingLeader(leader);
    setViewMode('detail');
    setViewLoading(true);
    setActiveMenu(false);
    try {
      if (leader.studentId) {
        const { data } = await axios.get(`/members/by-student-id/${leader.studentId.trim()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setViewingMember(data);
      } else {
        setViewingMember(null);
      }
    } catch (err) {
      setViewingMember(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = (leader) => {
    const nameParts = (leader.name || "").trim().split(/\s+/);
    setCurrentId(leader._id);
    setIsEditing(true);
    setFormData({
      ...leader,
      firstName: nameParts[0] || "",
      fatherName: nameParts[1] || "",
      grandFatherName: nameParts[2] || ""
    });
    setViewMode('form');
    setActiveMenu(false);
  };

  const handleCloseForm = () => {
    setViewMode('list');
    setIsEditing(false);
    setCurrentId(null);
    setFormData(initialFormState);
  };

  const filteredLeaders = activeTab === 'all' 
    ? leaders 
    : leaders.filter(l => l.category === (activeTab === 'took1' ? 'ተተኪ አመራር 1 የወሰዱ' : 'ተተኪ 2 የወሰዱ'));

  if (viewMode === 'form') {
    return (
      <div className="dashboard-content animate-fade-in">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
          <button onClick={handleCloseForm} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back
          </button>
          <div>
             <h2 style={{ margin: 0, color: 'var(--primary)' }}>{isEditing ? '✏️ ተተኪ አመራር ማስተካከያ (Edit Leader)' : '➕ አዲስ ተተኪ አመራር መመዝገቢያ (Register Leader)'}</h2>
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
            <div style={{ marginBottom: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', border: '3px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {formData.photo ? (
                  <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '48px' }}>🕯️</span>
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
                {formData.photo ? 'ፎቶ ቀይር (Change Photo)' : 'የአመራሩን ፎቶ እዚህ ይጫኑ (Upload Photo)'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="form-section">
              <h4 style={{ color: 'var(--primary)', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '1.1rem', fontWeight: '800' }}>👤 የግል መረጃ (Personal Details)</h4>
              
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ስም (First Name)</label>
                  <input className="form-control" type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} required placeholder="e.g. Abebe" style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአባት (Father)</label>
                  <input className="form-control" type="text" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} required placeholder="e.g. Kebede" style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአያት (Grandfather)</label>
                  <input className="form-control" type="text" value={formData.grandFatherName} onChange={e => setFormData({...formData, grandFatherName: e.target.value})} required placeholder="e.g. Tola" style={{ borderRadius: '12px', padding: '12px' }} />
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
                    <option value="ተተኪ አመራር 1 የወሰዱ">ተተኪ 1 የወሰዱ</option>
                    <option value="ተተኪ 2 የወሰዱ">ተተኪ 2 የወሰዱ</option>
                  </select>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ተማሪ መታወቂያ (Student ID)</label>
                  <input className="form-control" type="text" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} placeholder="WU/..." style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ስልክ ቁጥር (Phone)</label>
                  <input className="form-control" type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required placeholder="09..." style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginTop: '30px' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '1.1rem', fontWeight: '800' }}>🎓 የዩኒቨርሲቲ እና የሀላፊነት መረጃ (University)</h4>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ዲፓርትመንት (Department)</label>
                  <select className="form-control" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} style={{ borderRadius: '12px', padding: '12px' }}>
                    <option value="">ትምህርት ክፍል ይምረጡ</option>
                    {['Software engineering', 'Computer science', 'information Technology', 'information system', 'electrical engineering', 'Mechatronics engineering', 'Mechanical engineering', 'Civil engineering', 'Textile engineering', 'Water Resource and Irrigation engineering', 'Industrial engineering', 'Cotem engineering', 'Garment engineering', 'Leather engineering', 'Chemical engineering', 'Food Engineering', 'Construction Technology and Management', 'Hydraulics', 'Biomedical Engineering', 'Fashion design', 'Architecture', 'Msc', 'የለም/ሌላ'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ሀላፊነት (Current Position)</label>
                  <input type="text" className="form-control" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="e.g. Department Rep" style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ባች (Batch)</label>
                  <select className="form-control" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} style={{ borderRadius: '12px', padding: '12px' }}>
                    <option value="">Select Batch</option>
                    {['Remedial', 'Fresh', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'GC'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአገልግሎት ጊዜ (Availability)</label>
                  <input type="text" className="form-control" value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#475569', marginBottom: '15px', fontSize: '1rem', fontWeight: '700' }}>📍 የመኖሪያ አድራሻ (Address)</h4>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ክልል (Region)</label>
                  <input type="text" className="form-control" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} style={{ borderRadius: '10px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ዞን (Zone)</label>
                  <input type="text" className="form-control" value={formData.zone} onChange={e => setFormData({...formData, zone: e.target.value})} style={{ borderRadius: '10px' }} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ወረዳ (Woreda)</label>
                  <input type="text" className="form-control" value={formData.woreda} onChange={e => setFormData({...formData, woreda: e.target.value})} style={{ borderRadius: '10px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ቀበሌ (Kebele)</label>
                  <input type="text" className="form-control" value={formData.kebele} onChange={e => setFormData({...formData, kebele: e.target.value})} style={{ borderRadius: '10px' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '40px', paddingBottom: '10px', display: 'flex', gap: '15px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                {isEditing ? '💾 መረጃውን አድስ (Update Profile)' : '✅ መዝግብ (Complete Registration)'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleCloseForm} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: '#f1f5f9', color: '#64748b', fontWeight: '700' }}>ሰርዝ (Cancel)</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'detail' && viewingLeader) {
      return (
          <div className="dashboard-content animate-fade-in" style={{ padding: '20px' }}>
              <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                  <button 
                      onClick={() => { setViewMode('list'); setViewingLeader(null); }} 
                      className="btn-export print"
                      style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: '800', background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#475569' }}
                  >
                      ← Back to List
                  </button>
                  <div>
                      <h2 style={{ margin: 0, color: 'var(--primary)' }}>የተተኪ አመራር ዝርዝር (Leader Details)</h2>
                      <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>ሁሉንም የአመራር መረጃዎች እዚህ ማግኘት ይችላሉ</p>
                  </div>
              </div>

              {viewLoading ? (
                  <div className="card shadow-sm" style={{ padding: '8rem', textAlign: 'center', background: '#fff', borderRadius: '24px' }}>
                      <div className="spinner" style={{ margin: '0 auto 15px' }}></div>
                      <p style={{ color: '#64748b', fontWeight: '600' }}>በመጫን ላይ... (Loading Details)</p>
                  </div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                      <div className="card shadow-sm" style={{ padding: '30px', background: '#fff', borderRadius: '24px', display: 'flex', gap: '30px', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                          <div style={{ width: '150px', height: '150px', borderRadius: '24px', overflow: 'hidden', border: '5px solid #fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: '#f8fafc' }}>
                              {viewingLeader.photo ? (
                                  <img src={viewingLeader.photo} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : viewingMember?.photo ? (
                                  <img src={viewingMember.photo} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', color: '#cbd5e1' }}>👤</div>
                              )}
                          </div>
                          <div style={{ flex: 1 }}>
                              <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{viewingLeader.name}</h1>
                              <div style={{ display: 'flex', gap: '15px', marginTop: '15px', flexWrap: 'wrap' }}>
                                  <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800' }}>🛡️ {viewingLeader.category}</span>
                                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700' }}>🆔 ID: {viewingLeader.studentId || '—'}</span>
                                  <span className={`status-pill ${viewingLeader.active ? 'active' : 'inactive'}`} style={{ padding: '6px 16px', fontSize: '0.75rem' }}>{viewingLeader.active ? 'ACTIVE ACCOUNT' : 'BLOCKED ACCOUNT'}</span>
                              </div>
                          </div>
                          <div style={{ display: 'flex', gap: '10px' }}>
                              <button onClick={() => handleEdit(viewingLeader)} className="btn btn-primary" style={{ padding: '12px 25px', borderRadius: '12px', fontWeight: '800' }}>✏️ Edit Profile</button>
                              <button onClick={() => handleDelete(viewingLeader._id)} className="btn btn-danger" style={{ padding: '12px 25px', borderRadius: '12px', fontWeight: '800' }}>🗑️ Delete</button>
                          </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                          <div className="card shadow-sm" style={{ padding: '30px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                              <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px', fontWeight: '800' }}>👤 የግልና መንፈሳዊ (Personal & Spiritual)</h4>
                              <div className="detail-row"><strong>ፆታ (Gender):</strong> <span>{viewingLeader.gender || '—'}</span></div>
                              <div className="detail-row"><strong>ስልክ (Phone):</strong> <span>{viewingLeader.phone || '—'}</span></div>
                              
                              {viewingMember?.spiritualFather && (
                                  <div style={{ background: '#eff6ff', padding: '20px', borderRadius: '16px', marginTop: '20px', borderLeft: '5px solid #3b82f6' }}>
                                      <strong style={{ color: '#1e40af', display: 'block', fontSize: '0.8rem', marginBottom: '5px' }}>የንስሐ አባት (Spiritual Father)</strong>
                                      <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e3a8a' }}>{viewingMember.spiritualFather}</span>
                                  </div>
                              )}
                          </div>

                          <div className="card shadow-sm" style={{ padding: '30px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                              <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px', fontWeight: '800' }}>🎓 ትምህርትና ሀላፊነት (University & Role)</h4>
                              <div className="detail-row"><strong>ዲፓርትመንት (Dept):</strong> <span>{viewingLeader.department || '—'}</span></div>
                              <div className="detail-row"><strong>ባች (Batch):</strong> <span>{viewingLeader.batch || '—'}</span></div>
                              <div className="detail-row"><strong>ሀላፊነት (Position):</strong> <span>{viewingLeader.position || '—'}</span></div>
                              <div className="detail-row"><strong>የአገልግሎት ጊዜ (Availability):</strong> <span>{viewingLeader.availability || '—'}</span></div>
                              <div className="detail-row"><strong>የመዝገብ አመት (Term):</strong> <span>{viewingLeader.term || '—'}</span></div>
                          </div>

                          <div className="card shadow-sm" style={{ padding: '30px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                              <h4 style={{ color: 'var(--primary)', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px', fontWeight: '800' }}>📍 የመኖሪያ አድራሻ (Residential Address)</h4>
                              <div className="detail-row"><strong>ክልል (Region):</strong> <span>{viewingLeader.region || '—'}</span></div>
                              <div className="detail-row"><strong>ዞን (Zone):</strong> <span>{viewingLeader.zone || '—'}</span></div>
                              <div className="detail-row"><strong>ወረዳ (Woreda):</strong> <span>{viewingLeader.woreda || '—'}</span></div>
                              <div className="detail-row"><strong>ቀበሌ (Kebele):</strong> <span>{viewingLeader.kebele || '—'}</span></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  if (viewMode === 'attendance') {
      const presentCount = Object.values(attendanceData).filter(Boolean).length;
      return (
          <div className="dashboard-content animate-fade-in" style={{ padding: '20px' }}>
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={() => setViewMode('list')} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                        ← Back
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--primary)' }}>📋 የክትትል መዝገብ (Attendance Recording)</h2>
                        <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>የተተኪ አመራሮችን የዛሬ ስልጠና ክትትል እዚህ ይመዝግቡ</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                      <button className="btn btn-ghost" onClick={() => setViewMode('list')} style={{ padding: '12px 25px', borderRadius: '12px' }}>ሰርዝ (Cancel)</button>
                      <button className="btn btn-primary" onClick={handleSaveAttendance} style={{ padding: '12px 30px', borderRadius: '12px', fontWeight: '800', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>💾 ክትትሉን መዝግብ (Save & Exit)</button>
                  </div>
              </div>

              <div className="card shadow-sm" style={{ padding: '25px', marginBottom: '25px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: '24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '20px', alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ fontWeight: '800', color: '#0369a1', marginBottom: '10px', display: 'block' }}>የክፍለ ጊዜው መጠሪያ / ቀን (Session Title & Date)</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            value={sessionTitle} 
                            onChange={e => setSessionTitle(e.target.value)}
                            style={{ background: '#fff', borderRadius: '14px', padding: '14px', border: '1.5px solid #cbd5e1', fontSize: '1rem', fontWeight: '600' }}
                        />
                    </div>
                    <div style={{ background: '#fff', padding: '10px 20px', borderRadius: '14px', border: '1.5px solid #bae6fd', textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>የተገኙ (Present)</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: '900', color: '#059669' }}>{presentCount} <small style={{ fontSize: '0.9rem', color: '#94a3b8' }}>/ {filteredLeaders.length}</small></span>
                    </div>
                  </div>
              </div>

              <div className="card shadow-sm" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                    <div className="table-wrap">
                        <table className="data-table">
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '20px' }}>አመራር (Leader Name)</th>
                                    <th>ምድብ (Category)</th>
                                    <th>ስልክ (Phone)</th>
                                    <th style={{ textAlign: 'center' }}>የመገኘት ሁኔታ (Attendance Status)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeaders.map(leader => (
                                    <tr key={leader._id} style={{ height: '70px' }}>
                                        <td style={{ padding: '15px 20px' }}>
                                             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#64748b' }}>
                                                    {leader.name.charAt(0)}
                                                </div>
                                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{leader.name}</span>
                                             </div>
                                        </td>
                                        <td><span style={{ background: '#f1f5f9', padding: '5px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>{leader.category}</span></td>
                                        <td style={{ color: '#64748b', fontWeight: '600' }}>{leader.phone}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div 
                                                onClick={() => handleAttendanceChange(leader._id)}
                                                style={{ 
                                                    display: 'inline-flex', 
                                                    alignItems: 'center', 
                                                    gap: '12px', 
                                                    padding: '8px 20px', 
                                                    borderRadius: '14px', 
                                                    cursor: 'pointer',
                                                    background: attendanceData[leader._id] ? '#dcfce7' : '#fee2e2',
                                                    color: attendanceData[leader._id] ? '#166534' : '#991b1b',
                                                    transition: 'all 0.2s',
                                                    border: `1.5px solid ${attendanceData[leader._id] ? '#86efac' : '#fca5a5'}`,
                                                    userSelect: 'none',
                                                    minWidth: '140px',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.2rem' }}>{attendanceData[leader._id] ? '✅' : '❌'}</span>
                                                <strong style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>{attendanceData[leader._id] ? 'ተኝል (Present)' : 'አልተገኘም (Absent)'}</strong>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
              </div>
          </div>
      );
  }

  if (viewMode === 'history') {
      return (
          <div className="dashboard-content animate-fade-in" style={{ padding: '20px' }}>
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button onClick={() => setViewMode('list')} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '10px 18px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                        ← Back
                    </button>
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--primary)' }}>📜 የታሪክ መዝገብ (Attendance History)</h2>
                        <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>ያለፉ የክትትል መዛግብትን እዚህ ኦዲት ያድርጉ</p>
                    </div>
                  </div>
              </div>

              {!selectedSession ? (
                <div className="card shadow-sm" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                  <div className="table-wrap">
                    <table className="data-table">
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '20px' }}>የክፍለ ጊዜው መጠሪያ (Session Title)</th>
                                <th>ቀን (Date)</th>
                                <th>የተገኙ (Attendance Status)</th>
                                <th style={{ textAlign: 'right', paddingRight: '30px' }}>ድርጊት (Actions)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>ምንም የታሪክ መዝገብ አልተገኘም (No history found)</td></tr>
                            ) : (
                                sessions.map(s => {
                                    const ethDate = greToEth(s.date);
                                    const present = s.attendance.filter(r => r.present).length;
                                    const total = s.attendance.length;
                                    return (
                                        <tr key={s._id} style={{ height: '75px' }}>
                                            <td style={{ paddingLeft: '20px' }}><strong style={{ color: '#1e293b' }}>{s.title}</strong></td>
                                            <td><span style={{ color: '#475569', fontWeight: '600' }}>{`${ethDate.monthAmharic} ${ethDate.day}/${ethDate.month}/${ethDate.year}`}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', maxWidth: '100px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(present/total)*100}%`, height: '100%', background: '#059669' }}></div>
                                                    </div>
                                                    <strong style={{ fontSize: '0.85rem' }}>{present} / {total}</strong>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                                                <button onClick={() => setSelectedSession(s)} className="btn btn-ghost" style={{ background: '#f8fafc', color: 'var(--primary)', fontWeight: '800', padding: '8px 20px', borderRadius: '10px', border: '1.5px solid #e2e8f0' }}>🔍 ዝርዝር እይ (View Details)</button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                    <div className="card shadow-sm" style={{ padding: '30px', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <button onClick={() => setSelectedSession(null)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>← Back to Sessions</button>
                                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900' }}>{selectedSession.title}</h3>
                                <p style={{ color: '#64748b', margin: '5px 0 0', fontWeight: '600' }}>📅 የክትትል ቀን፡ {new Date(selectedSession.date).toLocaleDateString()}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '800' }}>የተገኘው ብዛት (PRESENT)</span>
                                <span style={{ fontSize: '2rem', fontWeight: '900', color: '#059669' }}>{selectedSession.attendance.filter(r => r.present).length} <small style={{ fontSize: '1rem', color: '#94a3b8' }}>/ {selectedSession.attendance.length}</small></span>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                      <table className="data-table">
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '20px' }}>አመራር (Leader Name)</th>
                                <th style={{ textAlign: 'center' }}>ሁኔታ (Status)</th>
                            </tr>
                        </thead>
                        <tbody>
                          {selectedSession.attendance.map((r, idx) => (
                            <tr key={idx} style={{ height: '65px' }}>
                                <td style={{ paddingLeft: '20px', fontWeight: '700' }}>{r.leader?.name || 'Unknown'}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <span style={{ 
                                        padding: '6px 16px', 
                                        borderRadius: '10px', 
                                        fontSize: '0.8rem', 
                                        fontWeight: '800',
                                        background: r.present ? '#dcfce7' : '#fee2e2',
                                        color: r.present ? '#166534' : '#991b1b'
                                    }}>
                                        {r.present ? '✅ ተገኝቷል' : '❌ አልተገኘም'}
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
      );
  }

  return (
    <div className="dashboard-content animate-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>👨‍💼 ተተኪ አመራር (Substitute Leaders)</h2>
          <p style={{ color: '#666', margin: '5px 0 0' }}>የተተኪ አመራሮችን ዝርዝር እዚህ ማስተዳደር ይችላሉ</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'took1' && (
            <>
              <button className="btn btn-ghost" onClick={() => setViewMode('history')} style={{ border: '1px solid #e2e8f0' }}>
                📜 የታሪክ መዝገብ (History)
              </button>
              <button className="btn btn-ghost" onClick={handleToggleAttendanceMode} style={{ border: '1px solid #e2e8f0' }}>
                📋 ክትትል መዝግብ (Attendance)
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={() => setViewMode('form')}>
            <span>➕</span> አዲስ አመራር መዝግብ (Add)
          </button>
        </div>
      </div>

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
          ተተኪ 1 የወሰዱ
        </button>
        <button 
          className={`btn ${activeTab === 'sub2' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('sub2')}
        >
          ተተኪ 2 የወሰዱ
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>የተተኪ አመራሮች ዝርዝር (Leaders List)</h3>
            <span className="badge badge-primary">{filteredLeaders.length}</span>
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
              const l = leaders.find(l => l._id === selectedId);
              if (!l) return null;
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
                    { icon: '🔍', label: 'View Details', onClick: () => handleViewDetail(l) },
                    { icon: '✏️', label: 'Edit Profile', onClick: () => handleEdit(l) },
                    { divider: true },
                    { icon: '🗑️', label: 'Delete Leader', onClick: () => handleDelete(selectedId), color: '#dc2626' }
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
                <th>አመራር (Leader)</th>
                <th>የግቢ ID (Student ID)</th>
                <th>ስልክ (Phone)</th>
                <th>ሀላፊነት (Position)</th>
                <th>አድራሻ (Address)</th>
                <th>ምድብ (Category)</th>
                <th>ድርጊት (Action)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td></tr>
              ) : filteredLeaders.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    ምንም ተተኪ አመራር አልተገኘም
                  </td>
                </tr>
              ) : (
                filteredLeaders.map(leader => (
                  <tr 
                    key={leader._id}
                    onClick={() => setSelectedId(selectedId === leader._id ? null : leader._id)}
                    className={`${!leader.active ? 'inactive-row' : ''} ${selectedId === leader._id ? 'selected-row' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: '700' }}>{leader.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{leader.gender || '—'}</div>
                      </div>
                    </td>
                    <td><code>{leader.studentId || '—'}</code></td>
                    <td>{leader.phone}</td>
                    <td>{leader.position || '—'}</td>
                    <td>{leader.region ? `${leader.region}, ${leader.zone}` : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input 
                          type="checkbox" 
                          checked={leader.category === 'ተተኪ 2 የወሰዱ'} 
                          onChange={(e) => { e.stopPropagation(); handleToggleCategory(leader); }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <span className={`status-pill ${leader.category === 'ተተኪ አመራር 1 የወሰዱ' ? 'active' : 'inactive'}`} style={{ fontSize: '0.7rem', opacity: leader.active ? 1 : 0.6 }}>
                          {leader.category}
                        </span>
                        {!leader.active && (
                            <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold' }}>
                            🚫
                            </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(leader); }}
                        className={`action-btn-pill ${leader.active ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '6px 12px', fontSize: '0.7rem', border: 'none', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      >
                        {leader.active ? '🚫 Block' : '✅ Activate'}
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
        .selected-row { background: #e0f2fe !important; border-left: 5px solid #0369a1; }
        .dropdown-item { width: 100%; text-align: left; padding: 10px 16px; border: none; background: none; cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .dropdown-item:hover { background: #f8fafc; color: var(--primary); }
        .status-pill { padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
        .status-pill.active { background: #dcfce7; color: #166534; }
        .status-pill.inactive { background: #fee2e2; color: #991b1b; }
        .section-title { color: var(--primary); border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
      `}</style>
    </div>
  );
};

export default SubstituteLeaders;

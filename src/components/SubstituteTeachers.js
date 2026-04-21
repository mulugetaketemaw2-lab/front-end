import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth } from '../utils/ethiopianDate';
import RowActionMenu from './RowActionMenu';

const SubstituteTeachers = ({ token, setView }) => {
  const [teachers, setTeachers] = useState([]);
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
  const [attendanceData, setAttendanceData] = useState({}); // { teacherId: boolean }
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
    category: 'ተተኪ 1 የወሰዱ',
    photo: '',
    term: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchTeachers = async (termParam) => {
    setLoading(true);
    try {
      const termToUse = termParam || selectedTerm;
      const termQuery = termToUse ? `?term=${encodeURIComponent(termToUse)}` : '';
      const { data } = await axios.get(`/substitute-teachers${termQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTeachers(data);
    } catch (err) {
      toast.error('Failed to fetch teachers');
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
        await axios.put(`/substitute-teachers/${currentId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ተተኪ መምህር በተሳካ ሁኔታ ተስተካክሏል!');
      } else {
        await axios.post('/substitute-teachers', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ተተኪ መምህር በተሳካ ሁኔታ ተመዝግቧል!');
      }
      fetchTeachers();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await axios.delete(`/substitute-teachers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Teacher deleted successfully');
      setSelectedId(null);
      fetchTeachers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = !item.active;
      await axios.put(`/substitute-teachers/${item._id}`, { active: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`በትክክል ${newStatus ? 'አክቲቭ ሆኗል (Unblocked)' : 'ታግዷል (Blocked)'}`);
      fetchTeachers();
    } catch (err) {
      toast.error('የሁኔታ ለውጥ አልተሳካም (Failed to change status)');
    }
  };

  const handleToggleCategory = async (teacher) => {
    const isPassing = teacher.category === 'ተተኪ 1 የወሰዱ';
    const newCategory = isPassing ? 'ተተኪ 2' : 'ተተኪ 1 የወሰዱ';
    
    if (isPassing) {
      if (!window.confirm(`${teacher.name} ወደ ተተኪ 2 እንዲሸጋገር ይፈልጋሉ? (Pass to Level 2?)`)) return;
    } else {
      if (!window.confirm(`${teacher.name} ወደ ተተኪ 1 እንዲመለስ ይፈልጋሉ? (Move back to Level 1?)`)) return;
    }

    try {
      // Optimistic update
      setTeachers(prev => prev.map(t => t._id === teacher._id ? { ...t, category: newCategory } : t));
      
      await axios.put(`/substitute-teachers/${teacher._id}`, { category: newCategory }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isPassing 
        ? `${teacher.name} ወደ ተተኪ 2 በተሳካ ሁኔታ ተሸጋግሯል! (Passed to Level 2)`
        : `${teacher.name} ወደ ተተኪ 1 ተመልሷል`
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

  const handleAttendanceChange = (teacherId) => {
    setAttendanceData(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  const handleSaveAttendance = async () => {
    if (!sessionTitle) return toast.error('Please enter a session title');
    
    const attendanceRecords = Object.keys(attendanceData).map(id => ({
      teacher: id,
      present: attendanceData[id]
    }));

    try {
      await axios.post('/substitute-teachers/sessions', {
        title: sessionTitle,
        category: 'ተተኪ 1 የወሰዱ',
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
      const { data } = await axios.get(`/substitute-teachers/sessions?category=ተተኪ 1 የወሰዱ${termQuery}`, {
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
    if (teachers.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Full Name", "ID", "Phone", "Gender", "University Department", "Batch", "Subject", "Availability", "Category", "Region", "Zone", "Woreda", "Kebele", "Status"];
    const rows = teachers.map(t => {
      const fullName = (t.firstName && t.fatherName) 
        ? `${t.firstName} ${t.fatherName} ${t.grandFatherName || ''}`.trim() 
        : (t.name || "N/A");
      
      return [
        fullName,
        t.studentId || "N/A",
        t.phone ? ` ${t.phone}` : "N/A", // Leading space to prevent scientific notation in Excel
        t.gender || "N/A",
        t.department || "N/A",
        t.batch || "N/A",
        t.subject || "N/A",
        t.availability || "N/A",
        t.category || "N/A",
        t.region || "N/A",
        t.zone || "N/A",
        t.woreda || "N/A",
        t.kebele || "N/A",
        t.active !== false ? "Active" : "Blocked"
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
    link.setAttribute("download", `Substitute_Teachers_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("የተተኪ መምህራን ሪፖርት ወጥቷል!");
  };

  useEffect(() => {
    if (selectedTerm) {
      fetchTeachers(selectedTerm);
      fetchSessions(selectedTerm);
    }
  }, [selectedTerm]);

  const handleViewDetail = async (teacher) => {
    setViewingTeacher(teacher);
    setViewLoading(true);
    setActiveMenu(false);
    try {
      if (teacher.studentId) {
        const { data } = await axios.get(`/members/by-student-id/${teacher.studentId.trim()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setViewingMember(data);
      } else {
        setViewingMember(null);
      }
    } catch (err) {
      console.log('Member profile not found for this teacher');
      setViewingMember(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = (teacher) => {
    const nameParts = (teacher.name || "").trim().split(/\s+/);
    setCurrentId(teacher._id);
    setIsEditing(true);
    setFormData({
      ...teacher,
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
    ? teachers 
    : teachers.filter(t => t.category === (activeTab === 'took1' ? 'ተተኪ 1 የወሰዱ' : 'ተተኪ 2'));

  const selectedTeacher = teachers.find(t => t._id === selectedId);

  if (showModal) {
    return (
      <div className="dashboard-content animate-fade-in">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
          <button onClick={handleCloseModal} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back
          </button>
          <div>
             <h2 style={{ margin: 0, color: 'var(--primary)' }}>{isEditing ? '✏️ ተተኪ መምህር ማስተካከያ (Edit Teacher)' : '➕ አዲስ ተተኪ መምህር መመዝገቢያ (Register Teacher)'}</h2>
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
                  <span style={{ fontSize: '48px' }}>👨‍🏫</span>
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
                {formData.photo ? 'ፎቶ ቀይር (Change Photo)' : 'የመምህሩን ፎቶ እዚህ ይጫኑ (Upload Photo)'}
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
                    <option value="ተተኪ 1 የወሰዱ">ተተኪ 1 የወሰዱ</option>
                    <option value="ተተኪ 2">ተተኪ 2</option>
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
              <button type="button" className="btn btn-ghost" onClick={handleCloseModal} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: '#f1f5f9', color: '#64748b', fontWeight: '700' }}>ሰርዝ (Cancel)</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (viewingTeacher) {
    return (
      <div className="dashboard-content animate-fade-in">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
          <button 
            onClick={() => setViewingTeacher(null)} 
            style={{ 
                background: '#fff', border: '1.5px solid #e2e8f0', padding: '10px 20px', 
                borderRadius: '12px', cursor: 'pointer', fontWeight: '800', color: '#444',
                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>📋 የተተኪ መምህር ዝርዝር መረጃ</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>የመምህሩን ሙሉ መረጃ እዚህ መመልከት ይችላሉ</p>
          </div>
        </div>

        {viewLoading ? (
            <div style={{ padding: '8rem', textAlign: 'center', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                <p style={{ color: '#64748b', fontWeight: '600' }}>መረጃ በመፈለግ ላይ...</p>
            </div>
        ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                <div style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', display: 'flex', gap: '30px', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '140px', height: '140px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '5px solid #fff', background: '#f8fafc' }}>
                        {viewingTeacher.photo ? (
                            <img src={viewingTeacher.photo} alt="Teacher" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : viewingMember?.photo ? (
                            <img src={viewingMember.photo} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', color: '#cbd5e1' }}>👤</div>
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900', color: '#0f172a' }}>{viewingTeacher.name}</h1>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '12px', flexWrap: 'wrap' }}>
                                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '800' }}>🎓 {viewingTeacher.category}</span>
                                    {viewingMember?.fellowshipId && (
                                        <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 16px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700' }}>🆔 {viewingMember.fellowshipId}</span>
                                    )}
                                    <span className={`status-pill ${viewingTeacher.active !== false ? 'active' : 'inactive'}`} style={{ padding: '6px 16px', fontSize: '0.75rem' }}>
                                        {viewingTeacher.active !== false ? 'ACTIVE' : 'BLOCKED'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={() => { handleEdit(viewingTeacher); setViewingTeacher(null); }}
                                    style={{ 
                                        padding: '10px 20px', borderRadius: '12px', border: 'none', 
                                        background: '#f1f5f9', color: '#334155', fontWeight: '800', cursor: 'pointer', fontSize: '0.9rem'
                                    }}
                                >
                                    ✏️ Edit Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                    <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.4rem' }}>🎓</span> Academic Info
                        </h4>
                        <div className="detail-row"><strong>Department:</strong> <span>{viewingTeacher.department || '—'}</span></div>
                        <div className="detail-row"><strong>Batch:</strong> <span>{viewingTeacher.batch || '—'}</span></div>
                        <div className="detail-row"><strong>Subject:</strong> <span>{viewingTeacher.subject || '—'}</span></div>
                        <div className="detail-row"><strong>Student ID:</strong> <span style={{ fontFamily: 'monospace', color: '#0369a1' }}>{viewingTeacher.studentId || 'N/A'}</span></div>
                        {viewingMember?.spiritualFather && (
                            <div className="detail-row" style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '15px', marginTop: '5px' }}>
                                <strong style={{ color: 'var(--primary)' }}>የንስሐ አባት (Spiritual Father):</strong>
                                <span style={{ color: 'var(--primary)', fontWeight: '900' }}>{viewingMember.spiritualFather}</span>
                            </div>
                        )}
                    </div>

                    <div className="card shadow-sm" style={{ padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 25px', color: 'var(--primary)', fontSize: '1rem', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '1.4rem' }}>📍</span> Residence Info
                        </h4>
                        <div className="detail-row"><strong>Phone:</strong> <span>{viewingTeacher.phone}</span></div>
                        <div className="detail-row"><strong>Region/Zone:</strong> <span>{viewingTeacher.region ? `${viewingTeacher.region}, ${viewingTeacher.zone}` : '—'}</span></div>
                        <div className="detail-row"><strong>Woreda/Kebele:</strong> <span>{viewingTeacher.woreda ? `${viewingTeacher.woreda}, ${viewingTeacher.kebele}` : '—'}</span></div>
                        <div className="detail-row"><strong>Availability:</strong> <span>{viewingTeacher.availability || '—'}</span></div>
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
    <div className="dashboard-content animate-fade-in">
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>👨‍🏫 ተተኪ መምህር (Substitute Teachers)</h2>
          <p style={{ color: '#666', margin: '5px 0 0' }}>የተተኪ መምህራንን ዝርዝር በየክፍሉ እዚህ ማስተዳደር ይችላሉ</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isAttendanceMode ? (
            <>
              {activeTab === 'took1' && (
                <>
                  <button className="btn btn-ghost" onClick={() => setView('sub-teachers-history')} style={{ border: '1px solid #e2e8f0' }}>
                    📜 የታሪክ መዝገብ (History)
                  </button>
                  <button className="btn btn-ghost" onClick={() => setView('sub-teachers-attendance')} style={{ border: '1px solid #e2e8f0' }}>
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
              placeholder={`e.g. መስከረም 1/01/${greToEth(new Date()).year} - ተተኪ 1 የወሰዱ መደበኛ ትምህርት`}
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
          ተተኪ 1 የወሰዱ
        </button>
        <button 
          className={`btn ${activeTab === 'sub2' ? 'btn-primary' : 'btn-ghost'}`} 
          onClick={() => setActiveTab('sub2')}
        >
          ተተኪ 2
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>የተተኪዎች ዝርዝር (Teachers List)</h3>
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
              const t = teachers.find(t => t._id === selectedId);
              if (!t) return null;
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
                    { icon: '🔍', label: 'View Details', onClick: () => handleViewDetail(t) },
                    { icon: '✏️', label: 'Edit Profile', onClick: () => handleEdit(t) },
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
                    ምንም ተተኪ መምህር አልተገኘም
                  </td>
                </tr>
              ) : (
                filteredTeachers.map(teacher => (
                  <tr 
                    key={teacher._id}
                    onClick={() => setSelectedId(selectedId === teacher._id ? null : teacher._id)}
                    className={`${!teacher.active ? 'inactive-row' : ''} ${selectedId === teacher._id ? 'selected-row' : ''}`}
                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{teacher.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{teacher.gender || '—'}</div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: '0.85rem' }}>{teacher.studentId || '—'}</code></td>
                    <td>{teacher.phone}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500' }}>{teacher.department || '—'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{teacher.batch || ''}</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {teacher.region ? `${teacher.region}, ${teacher.zone}` : '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {!isAttendanceMode ? (
                          <>
                            <input 
                              type="checkbox" 
                              checked={teacher.category === 'ተተኪ 2'} 
                              onChange={(e) => { e.stopPropagation(); handleToggleCategory(teacher); }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span className={`status-pill ${teacher.category === 'ተተኪ 1 የወሰዱ' ? 'active' : 'inactive'}`} style={{ fontSize: '0.7rem', opacity: teacher.active ? 1 : 0.6 }}>
                              {teacher.category}
                            </span>
                            {!teacher.active && (
                                <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold' }}>
                                🚫
                                </span>
                            )}
                          </>
                        ) : (
                          <>
                            <input 
                              type="checkbox" 
                              checked={attendanceData[teacher._id] || false} 
                              onChange={(e) => { e.stopPropagation(); handleAttendanceChange(teacher._id); }}
                              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                            />
                            <span style={{ 
                              fontSize: '0.8rem', 
                              fontWeight: '700', 
                              color: attendanceData[teacher._id] ? '#166534' : '#991b1b' 
                            }}>
                              {attendanceData[teacher._id] ? '✅ Present' : '❌ Absent'}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(teacher); }}
                        className={`action-btn-pill ${teacher.active ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '6px 12px', fontSize: '0.7rem', border: 'none', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      >
                        {teacher.active ? '🚫 Block' : '✅ Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>



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
                            <td><strong>{record.teacher?.name || 'Unknown Teacher'}</strong></td>
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

export default SubstituteTeachers;

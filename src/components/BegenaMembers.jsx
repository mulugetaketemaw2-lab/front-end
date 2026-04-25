import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { greToEth } from "../utils/ethiopianDate";

const BegenaMembers = ({ token }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    fatherName: '',
    grandFatherName: '',
    studentId: '',
    department: '',
    batch: '',
    phone: '',
    gender: 'Male',
    begenaCycle: '1',
    region: '',
    zone: '',
    woreda: '',
    kebele: '',
    photo: '',
    term: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    fetchBegenaMembers();
  }, []);

  const fetchBegenaMembers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/members?isBegena=true');
      setMembers(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch Begena members');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this member?")) return;
    try {
      await axios.delete(`/members/${id}`);
      toast.success("Member deleted successfully");
      fetchBegenaMembers();
      setSelectedId(null);
    } catch (err) {
      toast.error("Failed to delete member");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axios.patch(`/members/${id}`, { isActive: !currentStatus });
      toast.success(currentStatus ? "Member Blocked" : "Member Activated");
      fetchBegenaMembers();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleEditClick = (member) => {
    setEditingMember(member._id);
    setFormData({
      firstName: member.firstName || '',
      fatherName: member.fatherName || '',
      grandFatherName: member.grandFatherName || '',
      studentId: member.studentId || '',
      department: member.department || '',
      batch: member.batch || '',
      phone: member.phone || '',
      gender: member.gender || 'Male',
      begenaCycle: member.begenaCycle || '1',
      region: member.region || '',
      zone: member.zone || '',
      woreda: member.woreda || '',
      kebele: member.kebele || '',
      photo: member.photo || '',
      term: member.term || ''
    });
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const amharicFields = ['firstName', 'fatherName', 'grandFatherName', 'region', 'zone', 'woreda'];
    if (amharicFields.includes(name)) {
      const amharicRegex = /^[\u1200-\u137F\s/]*$/;
      if (value !== '' && !amharicRegex.test(value)) return;
    }
    if (name === 'kebele') {
      if (value !== '' && !/^[\u1200-\u137F\s/0-9]*$/.test(value)) return;
    }
    if (name === 'studentId') {
      if (value !== '' && !/^[a-zA-Z0-9/\-_.]*$/.test(value)) return;
    }
    if (name === 'phone') {
      if (value !== '' && !/^[0-9]*$/.test(value)) return;
    }
    setFormData({ ...formData, [name]: value });
  };

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        serviceDepartment: 'መዝሙር ክፍል',
        isBegena: true
      };

      if (editingMember) {
        await axios.patch(`/members/${editingMember}`, payload);
        toast.success('Begena member updated successfully!');
      } else {
        payload.username = `begena_${Math.floor(Math.random() * 90000)}`;
        payload.password = 'password123';
        await axios.post('/members/self-register', payload);
        toast.success('Begena member registered successfully!');
      }

      setShowForm(false);
      setEditingMember(null);
      fetchBegenaMembers();
      setFormData({
        ...formData, firstName: '', fatherName: '', grandFatherName: '', studentId: '', phone: '',
        region: '', zone: '', woreda: '', kebele: '', photo: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  const exportToCSV = () => {
    if (members.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Full Name", "ID", "Phone", "Gender", "University Department", "Batch", "Cycle", "Region", "Zone", "Woreda", "Kebele", "Status"];
    const rows = members.map(m => {
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
        `Cycle ${m.begenaCycle || 1}`,
        m.region || "N/A",
        m.zone || "N/A",
        m.woreda || "N/A",
        m.kebele || "N/A",
        m.isActive !== false ? "Active" : "Blocked"
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
    link.setAttribute("download", `Begena_Members_Report_${new Date().toLocaleDateString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Report exported successfully!");
  };

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;

  if (showForm) {
    return (
      <div className="dashboard-content animate-fade-in">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
          <button onClick={() => { setShowForm(false); setEditingMember(null); }} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>{editingMember ? '✏️ የበገና አባል መረጃ ማስተካከያ (Update Begena Member)' : '🎸 አዲስ የበገና አባል ምዝገባ (New Begena Registration)'}</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b' }}>{editingMember ? 'የአባሉን መረጃ እዚህ ያስተካክሉ' : 'እባክዎ ትክክለኛ መረጃዎችን በጥንቃቄ ያስገቡ'}</p>
          </div>
        </div>

        <div style={{ 
          background: '#ffffff', 
          padding: '40px', 
          borderRadius: '24px', 
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
          maxWidth: '800px',
          margin: '0 auto 40px auto',
          border: '1px solid #e2e8f0',
          position: 'relative'
        }}>
          {/* Close Button X */}
          <button 
            onClick={() => { setShowForm(false); setEditingMember(null); }}
            style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: '#f1f5f9', color: '#64748b', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}
          >
            &times;
          </button>
          <form onSubmit={handleRegister}>
            {/* Photo Upload Section */}
            <div style={{ marginBottom: '35px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', border: '3px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {formData.photo ? (
                   <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                   <span style={{ fontSize: '48px' }}>🎸</span>
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
                {formData.photo ? 'ፎቶ ቀይር (Change Photo)' : 'የአባሉን ፎቶ እዚህ ይጫኑ (Upload Photo)'}
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="form-section">
              <h4 style={{ color: 'var(--primary)', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '1.1rem', fontWeight: '800' }}>👤 የግል መረጃ (Personal Details)</h4>
              
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ስም (First Name)</label>
                  <input className="form-control" name="firstName" type="text" value={formData.firstName} onChange={handleChange} required style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአባት (Father)</label>
                  <input className="form-control" name="fatherName" type="text" value={formData.fatherName} onChange={handleChange} required style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የአያት (Grandfather)</label>
                  <input className="form-control" name="grandFatherName" type="text" value={formData.grandFatherName} onChange={handleChange} required style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                 <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ጾታ (Gender)</label>
                  <select className="form-control" name="gender" value={formData.gender} onChange={handleChange} style={{ borderRadius: '12px', padding: '12px' }}>
                    <option value="Male">ወንድ (Male)</option>
                    <option value="Female">ሴት (Female)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>መታወቂያ (Student ID)</label>
                  <input className="form-control" name="studentId" type="text" value={formData.studentId} onChange={handleChange} placeholder="WU/..." style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ስልክ ቁጥር (Phone)</label>
                  <input className="form-control" name="phone" type="text" value={formData.phone} onChange={handleChange} required placeholder="09..." style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginTop: '30px' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '1.1rem', fontWeight: '800' }}>🎓 የዩኒቨርሲቲ እና የትምህርት መረጃ (University)</h4>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ዲፓርትመንት (Department)</label>
                  <select className="form-control" name="department" value={formData.department} onChange={handleChange} style={{ borderRadius: '12px', padding: '12px' }}>
                    <option value="">ትምህርት ክፍል ይምረጡ</option>
                    {['Software engineering', 'Computer science', 'information Technology', 'information system', 'electrical engineering', 'Mechatronics engineering', 'Mechanical engineering', 'Civil engineering', 'Textile engineering', 'Water Resource and Irrigation engineering', 'Industrial engineering', 'Cotem engineering', 'Garment engineering', 'Leather engineering', 'Chemical engineering', 'Food Engineering', 'Construction Technology and Management', 'Hydraulics', 'Biomedical Engineering', 'Fashion design', 'Architecture', 'Msc', 'የለም/ሌላ'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ባች (Batch)</label>
                  <select className="form-control" name="batch" value={formData.batch} onChange={handleChange} style={{ borderRadius: '12px', padding: '12px' }}>
                    <option value="">Select Batch</option>
                    {['Remedial', 'Fresh', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'GC'].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ዙር (Cycle)</label>
                  <select className="form-control" name="begenaCycle" value={formData.begenaCycle} onChange={handleChange} style={{ borderRadius: '12px', padding: '12px' }}>
                    <option value="1">1ኛ ዙር (Cycle 1)</option>
                    <option value="2">2ኛ ዙር (Cycle 2)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ color: '#475569', marginBottom: '15px', fontSize: '1rem', fontWeight: '700' }}>📍 የመኖሪያ አድራሻ (Address)</h4>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ክልል (Region)</label>
                  <input type="text" name="region" className="form-control" value={formData.region} onChange={handleChange} style={{ borderRadius: '10px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ዞን (Zone)</label>
                  <input type="text" name="zone" className="form-control" value={formData.zone} onChange={handleChange} style={{ borderRadius: '10px' }} />
                </div>
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ወረዳ (Woreda)</label>
                  <input type="text" name="woreda" className="form-control" value={formData.woreda} onChange={handleChange} style={{ borderRadius: '10px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ቀበሌ (Kebele)</label>
                  <input type="text" name="kebele" className="form-control" value={formData.kebele} onChange={handleChange} style={{ borderRadius: '10px' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '40px', paddingBottom: '10px', display: 'flex', gap: '15px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 2, padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                {submitting ? 'በማከናወን ላይ...' : (editingMember ? '✅ አድስ (Update Member)' : '✅ መዝግብ (Complete Registration)')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setShowForm(false); setEditingMember(null); }} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: '#f1f5f9', color: '#64748b', fontWeight: '700' }}>ሰርዝ (Cancel)</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: '20px', borderRadius: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0 }}>🎸 የበገና አባላት (Begena Members)</h2>
          <span className="badge badge-primary">{members.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedId && (() => {
            const sel = members.find(m => m._id === selectedId);
            return (
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setActiveMenu(!activeMenu)}
                  style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  Actions for Selected
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                  </div>
                </button>
                {activeMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '45px', background: '#fff', borderRadius: '10px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                    <button onClick={() => { setViewingMember(sel); setActiveMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📄 Detail</button>
                    <button onClick={() => { handleEditClick(sel); setActiveMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>✏️ Edit</button>
                    <button onClick={() => { handleToggleStatus(sel._id, sel.isActive !== false); setActiveMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {sel.isActive !== false ? '🚫 Block' : '✅ Activate'}
                    </button>
                    <div style={{ height: '1px', background: '#f1f5f9' }} />
                    <button onClick={() => { handleDelete(sel._id); setActiveMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>🗑️ Delete</button>
                  </div>
                )}
              </div>
            );
          })()}
          <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingMember(null); }}>
            ➕ አዲስ ይመዝግቡ (Register New)
          </button>
          <button 
            onClick={exportToCSV}
            style={{ 
              background: '#059669', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '10px', 
              fontWeight: '600', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
            }}
          >
            📊 ሪፖርት አውጣ (Export CSV)
          </button>
        </div>
      </div>

      <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginBottom: '20px', borderLeft: '4px solid #3b82f6' }}>
        <p style={{ margin: 0, color: '#334155', fontWeight: 'bold' }}>
          This section is exclusively for registering and tracking Begena members, updated twice a year.
        </p>
      </div>

      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
          <h4>ምንም የበገና አባል አልተገኘም (No Begena members found)</h4>
        </div>
      ) : (
        <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>ሙሉ ስም (Name)</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>መታወቂያ (ID)</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>ስልክ (Phone)</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>ጾታ (Gender)</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>አድራሻ (Address)</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>ዙር (Cycle)</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>ሁኔታ (Status)</th>
              <th style={{ padding: '12px 15px', textAlign: 'left' }}>ድርጊት (Action)</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr 
                key={m._id} 
                onClick={() => setSelectedId(selectedId === m._id ? null : m._id)}
                style={{ 
                  borderBottom: '1px solid #f1f5f9', 
                  cursor: 'pointer',
                  background: selectedId === m._id ? '#f0f9ff' : 'transparent',
                  transition: 'background 0.2s',
                  opacity: m.isActive === false ? 0.7 : 1
                }}
              >
                <td style={{ padding: '12px 15px', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {m.photo ? (
                      <img src={m.photo} alt="Profile" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                    ) : (
                      <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</div>
                    )}
                    <span style={{ fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap' }}>{m.firstName} {m.fatherName} {m.grandFatherName}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 15px', textAlign: 'left', fontSize: '0.9rem', color: '#64748b' }}>{m.studentId}</td>
                <td style={{ padding: '12px 15px', textAlign: 'left', fontSize: '0.9rem', minWidth: '120px' }}>{m.phone}</td>
                <td style={{ padding: '12px 15px', textAlign: 'left', fontSize: '0.9rem' }}>{m.gender}</td>
                <td style={{ padding: '12px 15px', textAlign: 'left', fontSize: '0.85rem', color: '#475569', whiteSpace: 'nowrap' }}>
                  {[m.region, m.zone, m.woreda].filter(Boolean).join(', ') || '-'}
                </td>
                <td style={{ padding: '12px 15px', textAlign: 'left' }}>
                  <span className="badge" style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.75rem' }}>Cycle {m.begenaCycle || 1}</span>
                </td>
                <td style={{ padding: '12px 15px', textAlign: 'left' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontSize: '0.7rem', 
                    fontWeight: '700',
                    background: m.isActive !== false ? '#dcfce7' : '#fee2e2',
                    color: m.isActive !== false ? '#166534' : '#991b1b'
                  }}>
                    {m.isActive !== false ? 'Active' : 'Blocked'}
                  </span>
                </td>
                <td style={{ padding: '12px 15px', textAlign: 'left' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(m._id, m.isActive !== false); }}
                    style={{ 
                      padding: '6px 14px', 
                      borderRadius: '8px', 
                      border: 'none', 
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      background: m.isActive !== false ? '#fee2e2' : '#dcfce7',
                      color: m.isActive !== false ? '#991b1b' : '#166534'
                    }}
                  >
                    {m.isActive !== false ? '🚫 Block' : '✅ Active'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Details Modal */}
      {viewingMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '90%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative' }}>
            <button onClick={() => setViewingMember(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#94a3b8', zIndex: 10 }}>&times;</button>
            <div style={{ padding: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '30px', paddingBottom: '25px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #f1f5f9' }}>
                  {viewingMember.photo ? <img src={viewingMember.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profile" /> : <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👤</div>}
                </div>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{viewingMember.firstName} {viewingMember.fatherName} {viewingMember.grandFatherName}</h2>
                  <div style={{ color: '#64748b', fontSize: '0.95rem' }}>ID: {viewingMember.studentId || 'N/A'}</div>
                  <div style={{ marginTop: '10px' }}>
                    <span className="badge badge-primary">Begena Member</span>
                    <span className="badge" style={{ marginLeft: '8px', background: '#dcfce7', color: '#166534' }}>Cycle {viewingMember.begenaCycle}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>📞 Contact Info</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}><strong>Phone:</strong> {viewingMember.phone}</p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}><strong>Gender:</strong> {viewingMember.gender}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>🏫 Academic Inf</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}><strong>Dept:</strong> {viewingMember.department}</p>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}><strong>Batch:</strong> {viewingMember.batch}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', gridColumn: 'span 2' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>📍 Address</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {[viewingMember.region, viewingMember.zone, viewingMember.woreda, viewingMember.kebele].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BegenaMembers;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth } from '../utils/ethiopianDate';
import RowActionMenu from './RowActionMenu';
import { exportDeaconsToExcel } from '../utils/ReportExporter';

const Deacons = ({ token }) => {
  const [deacons, setDeacons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'የተቀበሉ', 'የሚቀበሉ', 'ያልተቀበሉ'
  const [viewMode, setViewMode] = useState('list'); // 'list', 'add', 'edit', 'detail'
  const isEditing = viewMode === 'edit';
  const [currentId, setCurrentId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(false);
  const [viewingDeacon, setViewingDeacon] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [availableTerms, setAvailableTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [populating, setPopulating] = useState(false);
  
  const initialFormState = { 
    firstName: '',
    fatherName: '',
    grandFatherName: '',
    studentId: '',
    phone: '', 
    department: '',
    batch: '',
    gender: 'Male',
    region: '',
    zone: '',
    woreda: '',
    kebele: '',
    studyField: 'ቅዳሴ',
    studyFieldOther: '',
    deaconshipStatus: 'ያልተቀበሉ',
    photo: '',
    term: '' 
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchDeacons = async (termParam) => {
    setLoading(true);
    try {
      const termToUse = termParam || selectedTerm;
      const termQuery = termToUse ? `?term=${encodeURIComponent(termToUse)}` : '';
      const { data } = await axios.get(`/deacons${termQuery}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeacons(data);
    } catch (err) {
      toast.error('መረጃ ማምጣት አልተቻለም (Failed to fetch deacons)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeacons();
    
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

  const handleStudentIdBlur = async (val) => {
    if (isEditing || !val || val.trim().length < 5) return;
    
    setPopulating(true);
    try {
      const { data } = await axios.get(`/members/by-student-id/${val.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          fatherName: data.fatherName || prev.fatherName,
          grandFatherName: data.grandFatherName || prev.grandFatherName,
          phone: data.phone || prev.phone,
          department: data.department || prev.department,
          batch: data.batch || prev.batch,
          gender: data.gender || prev.gender,
          region: data.region || prev.region,
          zone: data.zone || prev.zone,
          woreda: data.woreda || prev.woreda,
          kebele: data.kebele || prev.kebele,
          photo: data.photo || prev.photo,
        }));
        toast.success(`የአባላት መረጃ ተገኝቷል፡ ${data.firstName} ${data.fatherName}`);
      }
    } catch (err) {
      console.log('Member not found for auto-populate');
    } finally {
      setPopulating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullName = `${formData.firstName} ${formData.fatherName} ${formData.grandFatherName}`.trim();
    const payload = { ...formData, name: fullName, term: selectedTerm };
    
    try {
      if (isEditing) {
        await axios.put(`/deacons/${currentId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ዲያቆን መረጃ በተሳካ ሁኔታ ተስተካክሏል!');
      } else {
        await axios.post('/deacons', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('ዲያቆን በተሳካ ሁኔታ ተመዝግቧል!');
      }
      fetchDeacons();
      handleBackToList();
    } catch (err) {
      toast.error(err.response?.data?.message || 'መዝገቡ አልተሳካም');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('እርግጠኛ ነዎት ይህን መረጃ መሰረዝ ይፈልጋሉ? (Are you sure you want to delete?)')) return;
    try {
      await axios.delete(`/deacons/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('መረጃው ተሰርዟል');
      setSelectedId(null);
      fetchDeacons();
    } catch (err) {
      toast.error('መረጃ ማጥፋት አልተቻለም');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const newStatus = !item.active;
      await axios.put(`/deacons/${item._id}`, { active: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`በትክክል ${newStatus ? 'አክቲቭ ሆኗል (Unblocked)' : 'ታግዷል (Blocked)'}`);
      fetchDeacons();
    } catch (err) {
      toast.error('የሁኔታ ለውጥ አልተሳካም (Failed to change status)');
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
        
        // If the current term from settings is not in available terms list yet, add it
        if (currentTerm && !termsRes.data.terms.includes(currentTerm)) {
          setAvailableTerms(prev => [...new Set([...prev, currentTerm])].sort((a,b) => b.localeCompare(a)));
        }
      }
    } catch (err) {
      console.error('Error fetching initial settings:', err);
    }
  };

  useEffect(() => {
    if (selectedTerm) {
      fetchDeacons(selectedTerm);
    }
  }, [selectedTerm]);

  const handleViewDetail = async (deacon) => {
    setViewingDeacon(deacon);
    setViewLoading(true);
    setActiveMenu(false);
    setViewMode('detail');
    try {
      if (deacon.studentId) {
        const { data } = await axios.get(`/members/by-student-id/${deacon.studentId.trim()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setViewingMember(data);
      } else {
        setViewingMember(null);
      }
    } catch (err) {
      console.log('Member profile not found for this deacon');
      setViewingMember(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleEdit = (deacon) => {
    const nameParts = (deacon.name || "").trim().split(/\s+/);
    setCurrentId(deacon._id);
    setFormData({
      ...deacon,
      firstName: nameParts[0] || "",
      fatherName: nameParts[1] || "",
      grandFatherName: nameParts[2] || ""
    });
    setViewMode('edit');
    setActiveMenu(false);
  };

  const handleBackToList = () => {
    setViewMode('list');
    setCurrentId(null);
    setFormData(initialFormState);
    setViewingDeacon(null);
  };

  const filteredDeacons = activeTab === 'all' 
    ? deacons 
    : deacons.filter(d => d.deaconshipStatus === activeTab);

  const selectedDeacon = deacons.find(d => d._id === selectedId);

  if (viewMode === 'add' || viewMode === 'edit') {
    return (
      <div className="dashboard-content animate-fade-in">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
          <button onClick={handleBackToList} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back
          </button>
          <div>
             <h2 style={{ margin: 0, color: 'var(--primary)' }}>{viewMode === 'edit' ? '✏️ የዲያቆን መረጃ ማስተካከያ (Edit Deacon)' : '➕ አዲስ ዲያቆን መዝግብ (Register Deacon)'}</h2>
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
                {formData.photo ? 'ፎቶ ቀይር (Change Photo)' : 'የዲያቆኑን ፎቶ እዚህ ይጫኑ (Upload Photo)'}
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
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>መለያ ቁጥር (Student ID)</label>
                  <input className="form-control" type="text" value={formData.studentId} onChange={e => { if (/^[a-zA-Z0-9/\-_.]*$/.test(e.target.value)) setFormData({...formData, studentId: e.target.value}) }} onBlur={e => handleStudentIdBlur(e.target.value)} required placeholder="WU/..." style={{ borderRadius: '12px', padding: '12px' }} />
                  {populating && <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '5px' }}>⏳ መረጃ በመፈለግ ላይ...</p>}
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ስልክ ቁጥር (Phone)</label>
                  <input className="form-control" type="text" value={formData.phone} onChange={e => { if (/^[0-9]*$/.test(e.target.value)) setFormData({...formData, phone: e.target.value}) }} required placeholder="09..." style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ትምህርት ክፍል (Department)</label>
                  <input className="form-control" type="text" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} placeholder="e.g. Software Eng" style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>ባች (Batch)</label>
                  <input className="form-control" type="text" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} placeholder="e.g. 2014" style={{ borderRadius: '12px', padding: '12px' }} />
                </div>
              </div>
            </div>

            <div className="form-section" style={{ marginTop: '30px' }}>
              <h4 style={{ color: '#047857', marginBottom: '20px', borderBottom: '2px solid #ecfdf5', paddingBottom: '10px', fontSize: '1.1rem', fontWeight: '800' }}>📖 የድቁና እና የትምህርት መረጃ (Service)</h4>
              
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                   <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የሚማሩት ዘርፍ (Field of Study)</label>
                   <select className="form-control" value={formData.studyField} onChange={e => setFormData({...formData, studyField: e.target.value})} required style={{ borderRadius: '12px', padding: '12px' }}>
                      {['ቁጥር', 'ቅዳሴ', 'ዳዊት', 'ዜማ', 'ሰአታት', 'መዝገብ', 'ቅኔ', 'ሌላ'].map(f => <option key={f} value={f}>{f}</option>)}
                   </select>
                </div>
                <div className="form-group">
                   <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>የድቁና ሁኔታ (Status)</label>
                   <select className="form-control" value={formData.deaconshipStatus} onChange={e => setFormData({...formData, deaconshipStatus: e.target.value})} required style={{ borderRadius: '12px', padding: '12px' }}>
                      {['የተቀበሉ', 'የሚቀበሉ', 'ያልተቀበሉ'].map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
              </div>

              {formData.studyField === 'ሌላ' && (
                <div className="form-group animate-slide-down" style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#047857', marginBottom: '8px', display: 'block' }}>የሚማሩትን እዚህ ይጥቀሱ (Specify)</label>
                  <input className="form-control" type="text" value={formData.studyFieldOther || ''} onChange={e => setFormData({...formData, studyFieldOther: e.target.value})} required placeholder="እዚህ ጋር ይጻፉ..." style={{ borderRadius: '12px', padding: '12px', border: '1px solid #10b981' }} />
                </div>
              )}
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
                {viewMode === 'edit' ? '💾 መረጃውን አድስ (Update Profile)' : '✅ መዝግብ (Complete Registration)'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={handleBackToList} style={{ flex: 1, padding: '16px', borderRadius: '16px', background: '#f1f5f9', color: '#64748b', fontWeight: '700' }}>ሰርዝ (Cancel)</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'detail' && viewingDeacon) {
    return (
      <div className="dashboard-content animate-fade-in">
        <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
          <button onClick={handleBackToList} className="btn-back-modern" style={{ background: '#f1f5f9', color: '#334155', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>📋 የዲያቆን ዝርዝር መረጃ</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b' }}>የተመረጠው ዲያቆን ዝርዝር መረጃ ከዚህ በታች ቀርቧል</p>
          </div>
        </div>

        {viewLoading ? (
          <div className="card shadow-sm" style={{ padding: '4rem', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: '#64748b' }}>መረጃ በመፈለግ ላይ...</p>
          </div>
        ) : (
          <div className="detail-view-container card shadow-sm" style={{ background: '#fff', borderRadius: '15px', overflow: 'hidden' }}>
            <div className="detail-hero" style={{ padding: '40px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', display: 'flex', gap: '35px', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
              <div className="detail-photo-wrapper" style={{ position: 'relative' }}>
                <div className="detail-photo-container" style={{ width: '180px', height: '180px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', background: '#fff', border: '5px solid #fff' }}>
                  {viewingDeacon.photo ? (
                    <img src={viewingDeacon.photo} alt="Deacon" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : viewingMember?.photo ? (
                    <img src={viewingMember.photo} alt="Member" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#94a3b8', fontSize: '60px' }}>🕯️</div>
                  )}
                </div>
                <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', background: 'var(--primary)', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '3px solid #fff' }}>
                  <span style={{ fontSize: '18px' }}>✓</span>
                </div>
              </div>

              <div className="detail-header-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                  <h1 style={{ margin: 0, fontSize: '2.2rem', color: '#1e293b', fontWeight: '800' }}>{viewingDeacon.name}</h1>
                  <span className={`status-pill ${viewingDeacon.deaconshipStatus === 'የተቀበሉ' ? 'active' : viewingDeacon.deaconshipStatus === 'የሚቀበሉ' ? 'warning' : 'inactive'}`} style={{ padding: '6px 15px', borderRadius: '20px', fontSize: '0.85rem' }}>
                    {viewingDeacon.deaconshipStatus}
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '20px', color: '#64748b', fontSize: '1.05rem' }}>
                  <span>🆔 <strong>{viewingDeacon.studentId || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>📱 <strong>{viewingDeacon.phone}</strong></span>
                  <span>•</span>
                  <span>📅 <strong>{viewingDeacon.term}</strong></span>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button onClick={() => handleEdit(viewingDeacon)} className="btn btn-primary" style={{ padding: '10px 20px', borderRadius: '8px' }}>✏️ መረጃ ቀይር (Edit Profile)</button>
                  <button onClick={() => { if(window.confirm('መሰረዝ ትፈልጋለህ?')) { handleDelete(viewingDeacon._id); handleBackToList(); } }} className="btn btn-ghost" style={{ border: '1px solid #fee2e2', color: '#dc2626', padding: '10px 20px', borderRadius: '8px' }}>🗑️ ሰርዝ (Delete)</button>
                </div>
              </div>
            </div>

            <div className="detail-content" style={{ padding: '40px' }}>
              <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px' }}>
                <div className="detail-card">
                  <h4 style={{ margin: '0 0 20px', color: 'var(--primary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🎓</span> የአካዳሚክ መረጃ
                  </h4>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                      <span style={{ color: '#64748b' }}>ዲፓርትመንት:</span>
                      <span style={{ fontWeight: '700', color: '#334155' }}>{viewingDeacon.department || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>ባች (Batch):</span>
                      <span style={{ fontWeight: '700', color: '#334155' }}>{viewingDeacon.batch || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <h4 style={{ margin: '0 0 20px', color: '#047857', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>📖</span> የትምህርት ዘርፍ
                  </h4>
                  <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #dcfce7', paddingBottom: '10px' }}>
                      <span style={{ color: '#166534' }}>የሚማሩት ዘርፍ:</span>
                      <span style={{ fontWeight: '700', color: '#14532d' }}>{viewingDeacon.studyField === 'ሌላ' ? viewingDeacon.studyFieldOther : viewingDeacon.studyField}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#166534' }}>የድቁና ደረጃ:</span>
                      <span style={{ fontWeight: '700', color: '#14532d' }}>{viewingDeacon.deaconshipStatus}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <h4 style={{ margin: '0 0 20px', color: '#b45309', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>📍</span> የመኖሪያ አድራሻ
                  </h4>
                  <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#92400e' }}>ክልል:</span>
                      <span style={{ fontWeight: '700' }}>{viewingDeacon.region || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#92400e' }}>ዞን:</span>
                      <span style={{ fontWeight: '700' }}>{viewingDeacon.zone || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#92400e' }}>ወረዳ:</span>
                      <span style={{ fontWeight: '700' }}>{viewingDeacon.woreda || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
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
          <h2 style={{ margin: 0, color: 'var(--primary)' }}>🕯️ ዲያቆናት (Deacons)</h2>
          <p style={{ color: '#666', margin: '5px 0 0' }}>የዲያቆናትን መረጃ እዚህ ማስተዳደር ይችላሉ (ትምህርት ክፍል)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-ghost" 
            onClick={() => exportDeaconsToExcel(filteredDeacons, `deacons_${activeTab}_${selectedTerm}.xls`)}
            style={{ border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <span>📊</span> ዝርዝር አውጣ (Export)
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setFormData({ ...initialFormState, term: selectedTerm });
              setViewMode('add');
            }}
          >
            <span>➕</span> አዲስ መዝግብ (Register)
          </button>
        </div>
      </div>


      <div className="tabs-container" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('all')}>ሁሉም (All)</button>
        <button className={`btn ${activeTab === 'የተቀበሉ' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('የተቀበሉ')}>የተቀበሉ</button>
        <button className={`btn ${activeTab === 'የሚቀበሉ' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('የሚቀበሉ')}>የሚቀበሉ</button>
        <button className={`btn ${activeTab === 'ያልተቀበሉ' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('ያልተቀበሉ')}>ያልተቀበሉ</button>
      </div>

      <div className="card shadow-sm">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>የዲያቆናት ዝርዝር</h3>
            <span className="badge badge-primary">{filteredDeacons.length} የተመዘገቡ</span>
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

            {selectedId && (
              <RowActionMenu 
                trigger={
                  <div style={{ border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>Actions for Selected</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#64748b' }}></div>
                      <div style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#64748b' }}></div>
                      <div style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#64748b' }}></div>
                    </div>
                  </div>
                }
                actions={[
                  { icon: '🔍', label: 'View Details', onClick: () => handleViewDetail(selectedDeacon) },
                  { icon: '✏️', label: 'Edit Profile', onClick: () => handleEdit(selectedDeacon) },
                  { divider: true },
                  { icon: '🗑️', label: 'Delete Record', onClick: () => handleDelete(selectedId), color: '#dc2626' }
                ]}
              />
            )}
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ስም (Name)</th>
                <th>የግቢ ID (Student ID)</th>
                <th>ስልክ (Phone)</th>
                <th>የሚማሩት (Field of Study)</th>
                <th>የድቁና ሁኔታ (Status)</th>
                <th>ድርጊት (Action)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>የመረጃ ፍለጋ ላይ ነው (Loading...)...</td></tr>
              ) : filteredDeacons.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
                    ምንም መረጃ አልተገኘም
                  </td>
                </tr>
              ) : (
                filteredDeacons.map(deacon => (
                  <tr 
                    key={deacon._id}
                    onClick={() => setSelectedId(selectedId === deacon._id ? null : deacon._id)}
                    className={`${!deacon.active ? 'inactive-row' : ''} ${selectedId === deacon._id ? 'selected-row' : ''}`}
                    style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>{deacon.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{deacon.gender || '—'}</div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: '0.85rem' }}>{deacon.studentId || '—'}</code></td>
                    <td>{deacon.phone}</td>
                    <td>
                      <div style={{ fontWeight: '500', color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {deacon.studyField === 'ሌላ' ? deacon.studyFieldOther : deacon.studyField}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className={`status-pill ${deacon.deaconshipStatus === 'የተቀበሉ' ? 'active' : deacon.deaconshipStatus === 'የሚቀበሉ' ? 'warning' : 'inactive'}`} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '12px', opacity: deacon.active ? 1 : 0.6 }}>
                          {deacon.deaconshipStatus}
                        </span>
                        {!deacon.active && (
                          <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 'bold' }}>
                            🚫
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(deacon); }}
                        className={`action-btn-pill ${deacon.active !== false ? 'btn-danger' : 'btn-success'}`}
                        style={{ padding: '6px 12px', fontSize: '0.7rem', border: 'none', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      >
                        {deacon.active !== false ? '🚫 Block' : '✅ Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Deacons;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const MemberSelfRegistration = ({ onBack, generateUsername, generatePassword, theme, toggleTheme }) => {
  const [formData, setFormData] = useState({
    firstName: '', fatherName: '', grandFatherName: '', christianName: '',
    studentId: '', department: '', batch: '', region: '', zone: '',
    woreda: '', kebele: '', phone: '', email: '', gender: '',
    ordination: 'የለም', isSundaySchoolServed: 'አላገለገልኩም',
    spiritualFatherSelect: '', customSpiritualFather: '',
    serviceDepartment: '', password: '', confirmPassword: '',
    photo: '', username: '', term: ""
  });
  const [loading, setLoading] = useState(false);
  const [showGenPassword, setShowGenPassword] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState("");
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  useEffect(() => {
    // Public settings
    axios.get('/settings/public').then(res => {
      if (res.data?.currentTerm) setFormData(prev => ({ ...prev, term: res.data.currentTerm }));
      if (res.data?.registrationNotice) setRegistrationNotice(res.data.registrationNotice);
    }).catch(() => { });
  }, []);

  const handleNameChange = (field, value) => {
    const amharicRegex = /^[\u1200-\u137F\s/]*$/;
    if (value !== '' && !amharicRegex.test(value)) return;

    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (!prev._usernameManuallyEdited) {
        updated.username = generateUsername(
          field === 'firstName' ? value : prev.firstName,
          field === 'fatherName' ? value : prev.fatherName
        );
      }
      return updated;
    });
  };
  const handleAmharicInput = (field, value) => {
    const amharicRegex = /^[\u1200-\u137F\s/]*$/;
    if (value === '' || amharicRegex.test(value)) {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setFormData(prev => ({ ...prev, password: pwd, confirmPassword: pwd }));
    setShowGenPassword(true);
    toast.success('Password generated — save it!', { duration: 4000 });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image size must be less than 20MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      const payload = { ...formData };
      if (payload.spiritualFatherSelect) {
        payload.spiritualFather = payload.spiritualFatherSelect === 'የለኝም' && payload.customSpiritualFather 
          ? payload.customSpiritualFather 
          : payload.spiritualFatherSelect;
      }
      const res = await axios.post('/members/self-register', payload);
      toast.success(res.data?.message || 'Registration submitted! Pending approval.');
      onBack();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Registration failed', { duration: 6000 });
    } finally { setLoading(false); }
  };

  return (
    <div className="registration-container" style={{ 
      background: 'var(--bg)',
      minHeight: '100vh',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      position: 'relative',
      transition: 'background 0.3s'
    }}>
      {/* Floating Theme Toggle */}
      <button 
        className="header-icon-btn theme-toggle-btn" 
        title="Toggle System Color" 
        onClick={toggleTheme}
        style={{ 
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          cursor: 'pointer'
        }}
      >
        {theme === 'default' ? '🎨' : '🌈'}
      </button>
      <div className="registration-box" style={{ 
        maxWidth: '850px', 
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.8)'
      }}>
        {/* Religious Invocation - Full Width Banner */}
        <div style={{ 
          margin: '-40px -40px 30px -40px',
          padding: '22px 40px',
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 30%, #1a4a6e 60%, #0f2d44 100%)',
          borderRadius: '24px 24px 0 0',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(212, 175, 55, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '10%',
            right: '10%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #d4af37, #f0d060, #d4af37, transparent)',
            borderRadius: '2px'
          }} />
          <h4 style={{ 
            fontFamily: 'inherit', 
            fontSize: '1.25rem', 
            fontWeight: '800', 
            margin: 0, 
            color: '#d4af37',
            letterSpacing: '0.06em',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            position: 'relative',
            zIndex: 1
          }}>
            ✠ በስመ አብ ወወልድ ወመንፈስ ቅዱስ አሐዱ አምላክ ዘለዓለም ሥላሴ ✠
          </h4>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: '800', margin: '0 0 10px', color: '#1e293b' }}>
            Student Self-Registration
          </h2>
          <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
            Fill in your details to join the GBI Gubae Fellowship
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Photo Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ position: 'relative', width: '130px', height: '130px' }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%', border: '4px solid #fff',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)', overflow: 'hidden', background: '#f1f5f9',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {formData.photo ? 
                  <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 
                  <span style={{ fontSize: '3rem' }}>👤</span>
                }
              </div>
              <label style={{
                position: 'absolute', bottom: '0', right: '0', background: '#3b82f6',
                color: '#fff', width: '36px', height: '36px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', transition: 'transform 0.2s'
              }}>
                <span style={{ fontSize: '1.2rem' }}>+</span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
              </label>
              {formData.photo && (
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, photo: ''})}
                  style={{
                    position: 'absolute', top: '0', right: '0', background: '#ef4444',
                    color: '#fff', width: '30px', height: '30px', borderRadius: '50%',
                    border: 'none', cursor: 'pointer', fontSize: '1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >&times;</button>
              )}
            </div>
            <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
              Passport-size 3/4 photo (Max 20MB)
            </p>

            {registrationNotice && (
              <button 
                type="button" 
                onClick={() => setShowNoticeModal(true)}
                className="btn btn-warning"
                style={{ 
                  marginTop: '15px',
                  borderRadius: '12px', 
                  padding: '12px 24px', 
                  fontWeight: '800',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                  animation: 'pulse 2s infinite'
                }}
              >
                📜 አስፈላጊ መረጃ (Important Info)
              </button>
            )}
          </div>

          {/* Section: Personal Info */}
          <div className="premium-form-section" style={{ marginBottom: '35px', padding: '25px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 20px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <span>👤</span> የግል መረጃ (Personal Info)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ስም (First Name) *</label>
                <input type="text" className="form-control" value={formData.firstName} onChange={e => handleNameChange('firstName', e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>የአባት ስም (Father's Name) *</label>
                <input type="text" className="form-control" value={formData.fatherName} onChange={e => handleNameChange('fatherName', e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>የአያት ስም (Grandfather's Name) *</label>
                <input type="text" className="form-control" value={formData.grandFatherName} onChange={e => handleAmharicInput('grandFatherName', e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>የክርስትና ስም (Christian Name)</label>
                <input type="text" className="form-control" value={formData.christianName} onChange={e => handleAmharicInput('christianName', e.target.value)} placeholder="አማራጭ (Optional)" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>የንስሐ አባት (Spiritual Father)</label>
                <select className="form-control" value={formData.spiritualFatherSelect} onChange={e => setFormData({ ...formData, spiritualFatherSelect: e.target.value })} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <option value="">ይምረጡ (Select)</option>
                  <option value="አባ ገብረ ሚካኤል">አባ ገብረ ሚካኤል</option>
                  <option value="ቀሲስ ደጀኔ">ቀሲስ ደጀኔ</option>
                  <option value="ቀሲስ ብርሃኑ">ቀሲስ ብርሃኑ</option>
                  <option value="ቀሲስ ዘድንግል">ቀሲስ ዘድንግል</option>
                  <option value="ቀሲስ ተስፋ ማርያም">ቀሲስ ተስፋ ማርያም</option>
                  <option value="ቀሲስ ጸጋየ">ቀሲስ ጸጋየ</option>
                  <option value="ቀሲስ መሰረት">ቀሲስ መሰረት</option>
                  <option value="ቀሲስ ገብረሃና">ቀሲስ ገብረሃና</option>
                  <option value="ቀሲስ ወዳጀ">ቀሲስ ወዳጀ</option>
                  <option value="ቀሲስ መልካሙ">ቀሲስ መልካሙ</option>
                  <option value="ቀሲስ ሃይለ ማርያም">ቀሲስ ሃይለ ማርያም</option>
                  <option value="ቀሲስ ይሄይስ">ቀሲስ ይሄይስ</option>
                  <option value="ቀሲስ ዘሪሁን">ቀሲስ ዘሪሁን</option>
                  <option value="ቀሲስ ገብረ መስቀል">ቀሲስ ገብረ መስቀል</option>
                  <option value="መሪጌታ ለይኩን">መሪጌታ ለይኩን</option>
                  <option value="መሪጌታ ኢሳይያስ">መሪጌታ ኢሳይያስ</option>
                  <option value="መሪጌታ አክሊሉ">መሪጌታ አክሊሉ</option>
                  <option value="መምህር ዕዝራ">መምህር ዕዝራ</option>
                  <option value="የለኝም">የለኝም / ሌላ</option>
                </select>
                {formData.spiritualFatherSelect === 'የለኝም' && (
                  <input type="text" className="form-control fadeIn" value={formData.customSpiritualFather} onChange={e => setFormData({ ...formData, customSpiritualFather: e.target.value })} placeholder="የንስሐ አባትዎን ስም ያስገቡ (እራስዎ ይፃፉ)" style={{ marginTop: '8px', width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #3b82f6' }} />
                )}
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ሰንበት ት/ቤት አገልግለዋል? (Sunday School Service) *</label>
                <select className="form-control" value={formData.isSundaySchoolServed} onChange={e => setFormData({ ...formData, isSundaySchoolServed: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <option value="አላገለገልኩም">አላገለገልኩም</option>
                  <option value="አገልግያለሁ">አገልግያለሁ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: University Info */}
          <div className="premium-form-section" style={{ marginBottom: '35px', padding: '25px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 20px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <span>🎓</span> የዩኒቨርሲቲ መረጃ (University Info)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>መታወቂያ (ID) *</label>
                <input type="text" className="form-control" value={formData.studentId} onChange={e => { if (/^[a-zA-Z0-9/\-_.]*$/.test(e.target.value)) setFormData({ ...formData, studentId: e.target.value }) }} placeholder="WU/..." required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ትምህርት ክፍል (Department) *</label>
                <select className="form-control" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <option value="">Select Department</option>
                  <option value="Software engineering">Software engineering</option>
                  <option value="Computer science">Computer science</option>
                  <option value="information Technology">information Technology</option>
                  <option value="information system">information system</option>
                  <option value="electrical engineering">electrical engineering</option>
                  <option value="Mechatronics engineering">Mechatronics engineering</option>
                  <option value="Mechanical engineering">Mechanical engineering</option>
                  <option value="Civil engineering">Civil engineering</option>
                  <option value="Textile engineering">Textile engineering</option>
                  <option value="Water Resource and Irrigation engineering">Water Resource and Irrigation engineering</option>
                  <option value="Industrial engineering">Industrial engineering</option>
                  <option value="Cotem engineering">Cotem engineering</option>
                  <option value="Garment engineering">Garment engineering</option>
                  <option value="Leather engineering">Leather engineering</option>
                  <option value="Chemical engineering">Chemical engineering</option>
                  <option value="Food Engineering">Food Engineering</option>
                  <option value="Construction Technology and Management">Construction Technology and Management</option>
                  <option value="Hydraulics">Hydraulics</option>
                  <option value="Biomedical Engineering">Biomedical Engineering</option>
                  <option value="Fashion design">Fashion design</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Msc">Msc</option>
                  <option value="የለም/ሌላ">የለም/ሌላ</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ባች (Batch) *</label>
                <select className="form-control" value={formData.batch} onChange={e => setFormData({ ...formData, batch: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <option value="">Select Batch</option>
                  {['Remedial', 'Fresh', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'GC'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ጾታ (Gender) *</label>
                <select className="form-control" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <option value="">Select</option>
                  <option value="Male">ወንድ (Male)</option>
                  <option value="Female">ሴት (Female)</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ክህነት (Ordination)</label>
                <select className="form-control" value={formData.ordination} onChange={e => setFormData({ ...formData, ordination: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <option value="የለም">የለኝም (None)</option>
                  <option value="ቅስና">ቅስና (Priest)</option>
                  <option value="ድቁና">ድቁና (Deacon)</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ማገልገል የሚፈልጉት? *</label>
                <select className="form-control" value={formData.serviceDepartment} onChange={e => setFormData({ ...formData, serviceDepartment: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                  <option value="">ይምረጡ (Select)</option>
                  <option value="ትምህርት ክፍል">ትምህርት ክፍል (Education)</option>
                  <option value="አባላት ጉዳይ">አባላት ጉዳይ (Member Affairs)</option>
                  <option value="መዝሙር ክፍል">መዝሙር ክፍል (Music)</option>
                  <option value="ባች ክፍል">ባች ክፍል (Batch)</option>
                  <option value="ሙያ ክፍል">ሙያ ክፍል (Skills)</option>
                  <option value="ልማት ክፍል">ልማት ክፍል (Development)</option>
                  <option value="ቋንቋ ክፍል">ቋንቋ ክፍል (Language)</option>
                  <option value="መረጃ ክፍል">መረጃ ክፍል (Information)</option>
                  <option value="ሂሳብ ክፍል">ሂሳብ ክፍል (Finance)</option>
                  <option value="ኦዲት">ኦዲት (Audit)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Residence */}
          <div className="premium-form-section" style={{ marginBottom: '35px', padding: '25px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 20px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <span>📍</span> የመኖሪያ አድራሻ (Residence)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ክልል (Region) *</label>
                <input type="text" className="form-control" value={formData.region} onChange={e => handleAmharicInput('region', e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ዞን (Zone) *</label>
                <input type="text" className="form-control" value={formData.zone} onChange={e => handleAmharicInput('zone', e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ወረዳ (Woreda) *</label>
                <input type="text" className="form-control" value={formData.woreda} onChange={e => handleAmharicInput('woreda', e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ቀበሌ (Kebele) *</label>
                <input type="text" className="form-control" value={formData.kebele} onChange={e => { if (/^[\u1200-\u137F\s/0-9]*$/.test(e.target.value)) setFormData({ ...formData, kebele: e.target.value }) }} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
            </div>
          </div>

          {/* Section: Account & Contact */}
          <div className="premium-form-section" style={{ marginBottom: '35px', padding: '25px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 20px', color: '#334155', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <span>🔑</span> የመለያ እና መገናኛ (Account & Contact)
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ስልክ ቁጥር (Phone) *</label>
                <input type="tel" className="form-control" value={formData.phone} onChange={e => { if (/^[0-9]*$/.test(e.target.value)) setFormData({ ...formData, phone: e.target.value }) }} placeholder="09..." required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ኢሜይል (Email)</label>
                <input type="email" className="form-control" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Optional" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>የተጠቃሚ ስም (Username) *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="text" className="form-control" value={formData.username} onChange={e => { if (/^[a-zA-Z0-9_.]*$/.test(e.target.value)) setFormData({ ...formData, username: e.target.value, _usernameManuallyEdited: true }) }} required style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, username: generateUsername(prev.firstName, prev.fatherName), _usernameManuallyEdited: false }))}
                  style={{ padding: '0 15px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>
                  🔄 New
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>የይለፍ ቃል (Password) *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input type={showGenPassword ? 'text' : 'password'} className="form-control" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
                  <button type="button" onClick={handleGeneratePassword} style={{ padding: '0 10px', background: '#d1fae5', color: '#059669', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    ⚡ Generate
                  </button>
                </div>
                {showGenPassword && formData.password && (
                  <div style={{ marginTop: '5px', padding: '8px', background: '#fef3c7', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', color: '#92400e', textAlign: 'center' }}>
                    📋 {formData.password} (Save this!)
                  </div>
                )}
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem', color: '#475569' }}>ይለፍ ቃል አረጋግጥ *</label>
                <input type={showGenPassword ? 'text' : 'password'} className="form-control" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px' }}>
            <button 
              type="submit" 
              disabled={loading} 
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                color: '#fff',
                fontSize: '1.1rem',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Processing...' : 'Complete Registration'}
            </button>
            <button 
              type="button" 
              onClick={onBack} 
              style={{
                width: '100%',
                padding: '12px',
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>

      {/* Notice Modal */}
      {showNoticeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setShowNoticeModal(false)}>
          <div style={{
            background: '#fff', borderRadius: '28px', maxWidth: '650px', width: '100%',
            maxHeight: '85vh', overflowY: 'auto', padding: '40px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowNoticeModal(false)}
              style={{ position: 'absolute', top: '25px', right: '25px', border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >&times;</button>
            
            <h3 style={{ marginTop: 0, paddingBottom: '20px', borderBottom: '2px solid #f1f5f9', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>📜</span> ከመመዝገብዎ በፊት ይህንን ያንብቡ 
            </h3>
            
            <div style={{ 
              marginTop: '25px', fontSize: '1.1rem', lineHeight: '1.8', color: '#334155',
              padding: '25px', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0'
            }}
              dangerouslySetInnerHTML={{ __html: registrationNotice }}
            />
            
            <div style={{ marginTop: '35px', textAlign: 'center' }}>
              <button 
                onClick={() => setShowNoticeModal(false)}
                className="btn btn-primary"
                style={{ 
                  borderRadius: '16px', padding: '15px 50px', fontWeight: '800', fontSize: '1.1rem',
                  boxShadow: '0 4px 6px rgba(59, 130, 246, 0.3)'
                }}
              >ተረድቻለሁ (I Understand)</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MemberSelfRegistration;

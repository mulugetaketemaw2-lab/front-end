import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const MemberMessaging = ({ user, initialType = 'leadership', replyTo = null, onClose }) => {
  const isOffice = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user?.role);
  const isCoreExec = !isOffice && user?.role !== 'member' && user?.role !== 'sub_executive';
  const isSubExec = user?.role === 'sub_executive';
  const isMember = user?.role === 'member';

  const executiveRolesAll = [
    { role: 'timhirt', name: 'ትምህርት ክፍል' },
    { role: 'abalat_guday', name: 'አባላት ጉዳይ' },
    { role: 'mezmur', name: 'መዝሙር ክፍል' },
    { role: 'bach', name: 'ባች ክፍል' },
    { role: 'muya', name: 'ሙያ ክፍል' },
    { role: 'lmat', name: 'ልማት ክፍል' },
    { role: 'kwanqwa', name: 'ቋንቋ ክፍል' },
    { role: 'merja', name: 'መረጃ ክፍል' },
    { role: 'hisab', name: 'ሂሳብ ክፍል' },
    { role: 'audit', name: 'ኦዲት' }
  ];

  const isMySent = replyTo && (replyTo.sender === user?.id || replyTo.sender?._id === user?.id);
  const isFromOffice = replyTo && ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(replyTo.senderRole);

  const [formData, setFormData] = useState({
    recipientType: replyTo 
      ? (isMySent 
          ? (replyTo.recipientType || 'individual') 
          : (isFromOffice ? 'leadership' : (replyTo.recipientType === 'department' ? 'department' : 'individual'))
        ) 
      : (isCoreExec ? 'leadership' : (isOffice ? 'broadcast_members' : initialType)),
    targetDepartment: replyTo?.targetDepartment || (isMember ? (user.serviceDepartment || user.department || '') : (isCoreExec ? '' : user.department || '')),
    recipientUser: replyTo 
      ? (isMySent ? replyTo.recipientUser : replyTo.sender) 
      : '',
    recipientName: replyTo 
      ? (isMySent ? (replyTo.recipientName || 'Member') : (replyTo.senderName || 'Sender')) 
      : '',
    recipientRole: replyTo 
      ? (isMySent ? (replyTo.recipientRole || 'member') : (replyTo.senderRole || 'member')) 
      : (isOffice ? 'member' : ''),
    title: replyTo ? (replyTo.title?.startsWith('Re:') ? replyTo.title : `Re: ${replyTo.title}`) : '',
    content: '',
    attachments: []
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ allowMemberMessaging: true, allowExecutiveMessaging: true, allowDeptMessaging: true });
  const [fetchingStatus, setFetchingStatus] = useState(true);

  React.useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/messages/status');
      setStatus({
        allowMemberMessaging: res.data.allowMemberMessaging,
        allowExecutiveMessaging: res.data.allowExecutiveMessaging,
        allowDeptMessaging: res.data.allowDeptMessaging
      });
    } catch (err) {
      console.error("Status fetch error", err);
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          attachments: [...prev.attachments, {
            type: file.type.includes('image') ? 'photo' : 'pdf',
            data: reader.result,
            fileName: file.name
          }]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title) return toast.error('እባክዎ ርዕስ ያስገቡ (Please provide a title)');
    
    setLoading(true);
    try {
      if (formData.recipientType === 'broadcast_members' || formData.recipientType === 'broadcast_executives') {
        const payload = {
          title: formData.title,
          message: formData.content,
          targetGroup: formData.recipientType === 'broadcast_members' ? 'member' : 'executive',
          attachments: formData.attachments
        };
        await axios.post('/announcements', payload);
        toast.success('መልዕክቱ ተሰራጭቷል! (Announcement broadcasted)');
      } else {
        const payload = {
          ...formData,
          targetDepartment: formData.recipientType === 'department' ? formData.targetDepartment : undefined
        };
        const res = await axios.post('/messages', payload);
        if (res.data.success) {
          toast.success('መልዕክቱ በተሳካ ሁኔታ ተልኳል! (Message sent successfully)');
        }
      }
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'መልዕክት መላክ አልተቻለም (Failed to send message)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#fff' }}>
      <header style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '15px', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontWeight: '800', fontSize: '1.3rem', color: '#1e293b' }}>
          {replyTo ? '↪️ ምላሽ ስጥ (Reply Message)' : '📤 መልዕክት መላኪያ (Send Message)'}
        </h3>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.85rem' }}>ለጽህፈት ቤት ወይም ለክፍል ሃላፊ መልዕክት ለመላክ ይህንን ይጠቀሙ።</p>
      </header>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {/* Recipient Selection */}
        <div className="recipient-selector">
          <label style={{ fontWeight: '700', fontSize: '0.9rem', color: '#475569', display: 'block', marginBottom: '8px' }}>
            {replyTo ? 'ተቀባይ (Recipient)' : 'ተቀባይ ይምረጡ (Select Recipient)'}
          </label>
          
          {replyTo ? (
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👤</div>
              <div>
                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.85rem' }}>{formData.recipientName}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{formData.recipientType === 'individual' ? 'Direct Message' : 'Department Feed'}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button 
                type="button"
                disabled={(!status.allowMemberMessaging && isMember) || (!status.allowExecutiveMessaging && (isCoreExec || isSubExec))}
                onClick={() => setFormData(p => ({ ...p, recipientType: isOffice ? 'broadcast_members' : 'leadership', recipientRole: 'member', targetDepartment: '' }))}
                style={{
                  padding: '12px', borderRadius: '12px', border: '2px solid', 
                  borderColor: formData.recipientType === (isOffice ? 'broadcast_members' : 'leadership') ? '#4f46e5' : '#f1f5f9',
                  background: formData.recipientType === (isOffice ? 'broadcast_members' : 'leadership') ? '#f5f7ff' : '#fff',
                  color: formData.recipientType === (isOffice ? 'broadcast_members' : 'leadership') ? '#4f46e5' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px',
                  opacity: ((!status.allowMemberMessaging && isMember) || (!status.allowExecutiveMessaging && (isCoreExec || isSubExec))) ? 0.5 : 1
                }}
              >
                <div style={{ fontSize: '1.2rem' }}>{isOffice ? '👥' : '🏢'}</div>
                <div style={{ fontWeight: '800', fontSize: '0.8rem' }}>{isOffice ? 'ለአባላት' : 'ለጽህፈት ቤት'}</div>
                {((!status.allowMemberMessaging && isMember) || (!status.allowExecutiveMessaging && (isCoreExec || isSubExec))) && (
                  <span style={{ fontSize: '10px', color: '#ef4444' }}>🔒</span>
                )}
              </button>

              <button 
                type="button"
                disabled={!status.allowDeptMessaging && isMember}
                onClick={() => setFormData(p => ({ ...p, recipientType: isOffice ? 'broadcast_executives' : 'department', recipientRole: 'executive', targetDepartment: isOffice ? '' : (user.serviceDepartment || user.department || '') }))}
                style={{
                  padding: '12px', borderRadius: '12px', border: '2px solid', 
                  borderColor: formData.recipientType === (isOffice ? 'broadcast_executives' : 'department') ? '#4f46e5' : '#f1f5f9',
                  background: formData.recipientType === (isOffice ? 'broadcast_executives' : 'department') ? '#f5f7ff' : '#fff',
                  color: formData.recipientType === (isOffice ? 'broadcast_executives' : 'department') ? '#4f46e5' : '#64748b',
                  cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px',
                  opacity: (!status.allowDeptMessaging && isMember) ? 0.5 : 1
                }}
              >
                <div style={{ fontSize: '1.2rem' }}>{isOffice ? '👔' : '💼'}</div>
                <div style={{ fontWeight: '800', fontSize: '0.8rem' }}>{isOffice ? 'ለስራ አስፈጻሚ' : 'ለመሪዎ (Dept)'}</div>
                {!status.allowDeptMessaging && isMember && (
                  <span style={{ fontSize: '10px', color: '#ef4444' }}>🔒</span>
                )}
              </button>
            </div>
          )}
        </div>

        {formData.recipientType === 'department' && (
          <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase' }}>📍 ተቀባይ ክፍል</div>
                <div style={{ fontWeight: '800', color: '#0c4a6e', fontSize: '0.95rem' }}>
                  {isOffice ? (
                    <select 
                      value={formData.targetDepartment} 
                      onChange={e => setFormData(p => ({ ...p, targetDepartment: e.target.value }))}
                      style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: '800', color: 'inherit', outline: 'none' }}
                    >
                      <option value="">ክፍል ይምረጡ...</option>
                      {executiveRolesAll.map(role => <option key={role.role} value={role.name}>{role.name}</option>)}
                    </select>
                  ) : (
                    user.departmentAmharic || user.serviceDepartment || user.department || 'ያልታወቀ ክፍል'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group">
            <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '5px' }}>ርዕስ (Title)</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="መልዕክት ርዕስ..."
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
              required
              style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.9rem' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#475569', display: 'block', marginBottom: '5px' }}>መልዕክት (Message)</label>
            <textarea 
              className="form-control" 
              rows="3" 
              placeholder="መልዕክትዎን እዚህ ይጻፉ..."
              value={formData.content}
              onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
              style={{ padding: '10px 15px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.9rem', resize: 'none' }}
            />
          </div>

          <div className="form-group">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontWeight: '700', fontSize: '0.85rem', color: '#475569' }}>📎 ፋይል (Attachments)</label>
                {formData.attachments.length > 0 && <span style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: '800' }}>{formData.attachments.length} files</span>}
             </div>
             <div style={{ position: 'relative', overflow: 'hidden', padding: '10px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*,.pdf" 
                  onChange={handleFileChange}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                />
                <div style={{ color: '#64748b', fontSize: '0.8rem' }}>📷 ወይም 📄 ይለጥፉ</div>
             </div>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
          {onClose && (
            <button type="button" onClick={onClose} className="btn" style={{ flex: 1, padding: '12px', borderRadius: '10px', color: '#64748b', fontWeight: '700', background: '#f1f5f9' }}>
              ቢቀር (Cancel)
            </button>
          )}
          <button 
            type="submit" 
            disabled={loading} 
            className="btn btn-primary" 
            style={{ 
              flex: 2, padding: '12px', borderRadius: '10px', background: '#4f46e5', 
              color: '#fff', fontWeight: '800', border: 'none', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.2)'
            }}>
            {loading ? '⌛ ...' : '🚀 ላክ (Send Message)'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemberMessaging;

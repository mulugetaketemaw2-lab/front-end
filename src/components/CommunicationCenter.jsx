import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import MemberMessaging from './MemberMessaging';

const CommunicationCenter = ({ user, token, initialTab = 'announcements' }) => {
  const isOffice = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user?.role);
  const isExec = !isOffice && user?.role !== 'member' && user?.role !== 'sub_executive';
  const isMemberLike = user?.role === 'member' || user?.role === 'sub_executive';

  const [activeTab, setActiveTab] = useState(user?.role === 'sub_executive' ? 'messages' : initialTab); // For members
  const [officeView, setOfficeView] = useState('from_members'); // For office
  const [execView, setExecView] = useState('inbox_members'); // For executives
  const [subTab, setSubTab] = useState(isMemberLike ? 'inbox_office' : 'received'); // For members
  const [roleFilter, setRoleFilter] = useState('all');
  
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [allowDeptMessaging, setAllowDeptMessaging] = useState(false);

  // Announcement Form State (for non-office executives)
  const [annoForm, setAnnoForm] = useState({
    title: '',
    message: '',
    targetGroup: 'member',
    displayDate: new Date().toISOString().split('T')[0],
    attachments: []
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, officeView, execView]);

  const fetchData = async () => {
    setFetching(true);
    try {
      // Unified Fetch for all roles
      const [msgRes, annoRes, statusRes] = await Promise.all([
        axios.get('/messages', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/announcements', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/messages/status', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setMessages(msgRes.data.data || []);
      setAnnouncements(annoRes.data.data || []);
      setAllowDeptMessaging(statusRes.data.allowDeptMessaging);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setFetching(false);
    }
  };

  const handleToggleDeptMessaging = async () => {
    setLoading(true);
    try {
      const res = await axios.patch('/messages/toggle-dept', {}, { headers: { Authorization: `Bearer ${token}` } });
      setAllowDeptMessaging(res.data.allowDeptMessaging);
      toast.success(res.data.message);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);
    const newAttachments = [];
    for (const file of files) {
      const reader = new FileReader();
      const promise = new Promise((resolve) => {
        reader.onloadend = () => resolve({
          type: file.type.includes('pdf') ? 'pdf' : 'photo',
          data: reader.result,
          fileName: file.name
        });
      });
      reader.readAsDataURL(file);
      newAttachments.push(await promise);
    }
    setAnnoForm(prev => ({ ...prev, attachments: [...prev.attachments, ...newAttachments] }));
    setUploading(false);
    toast.success('Attached');
  };

  const handleAnnoSubmit = async (target) => {
    if (!annoForm.title) return toast.error('Title is required');
    setLoading(true);
    try {
      if (target === 'office') {
        // Send as a direct message to leadership, not a broadcast
        await axios.post('/messages', {
          recipientType: 'leadership',
          title: annoForm.title,
          content: annoForm.message,
          attachments: annoForm.attachments
        }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('ለጽህፈት ቤቱ ተልኳል! (Sent to Office)');
      } else {
        await axios.post('/announcements', { ...annoForm, targetGroup: target }, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('ለአባላት ተልኳል! (Sent to Members)');
      }
      setAnnoForm({ title: '', message: '', targetGroup: 'member', attachments: [], displayDate: new Date().toISOString().split('T')[0] });
      fetchData();

    } catch (error) {
      toast.error('Failed to send');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnno = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`/announcements/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await axios.patch(`/messages/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
    } catch (err) {}
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`/messages/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Deleted');
      setMessages(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      toast.error('Failed');
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const endpoint = item.isBroadcast ? `/announcements/${item._id}/toggle-status` : `/messages/${item._id}/toggle-status`;
      const res = await axios.patch(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="communication-center" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.5s ease' }}>
      
      {/* 1. TOP NAVIGATION */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', background: '#f1f5f9', padding: '8px', borderRadius: '16px', width: 'fit-content', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
        {isOffice ? (
          <>
            {[
              { id: 'from_members', label: '👤 ከአባላት የመጡ', sub: 'From Members', color: '#4f46e5' },
              { id: 'from_executives', label: '💼 ከስራ አስፈጻሚ የመጡ', sub: 'From Executives', color: '#0f172a' },
              { id: 'sent_members', label: '👥 ለአባላት የተላኩ', sub: 'Sent to Members', color: '#ec4899' },
              { id: 'sent_executives', label: '👔 ለስራ አስፈጻሚ የተላኩ', sub: 'Sent to Executives', color: '#8b5cf6' }
            ].map(btn => (
              <button 
                key={btn.id}
                onClick={() => setOfficeView(btn.id)}
                style={{
                  padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer',
                  background: officeView === btn.id ? btn.color : 'transparent',
                  color: officeView === btn.id ? '#fff' : '#64748b',
                  boxShadow: officeView === btn.id ? `0 4px 12px ${btn.color}33` : 'none',
                  transition: 'all 0.3s'
                }}
              >
                {btn.label} <span style={{ fontSize: '10px', opacity: 0.8, display: 'block' }}>{btn.sub}</span>
              </button>
            ))}
          </>
        ) : (isExec || user?.role === 'sub_executive') ? (
          <>
            {user?.role === 'sub_executive' ? (
              /* Sub-Executive Specific Tabs */
              [
                { id: 'inbox_office', label: '🏢 ከጽህፈት ቤት የመጡ', sub: 'From Office', color: '#0f172a' },
                { id: 'inbox_dept', label: '📥 ከክፍሌ የመጡ', sub: 'From Dept', color: '#10b981' },
                { id: 'sent_office', label: '👔 ለጽህፈት ቤት የተላኩ', sub: 'To Office', color: '#8b5cf6' },
                { id: 'sent_dept', label: '📤 ለክፍሉ የተላኩ', sub: 'To Dept', color: '#0f172a' }
              ].map(btn => (
                <button 
                  key={btn.id}
                  onClick={() => setSubTab(btn.id)}
                  style={{
                    padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer',
                    background: subTab === btn.id ? btn.color : 'transparent',
                    color: subTab === btn.id ? '#fff' : '#64748b',
                    boxShadow: subTab === btn.id ? `0 4px 12px ${btn.color}33` : 'none',
                    transition: 'all 0.3s'
                  }}
                >
                  {btn.label} <span style={{ fontSize: '10px', opacity: 0.8, display: 'block' }}>{btn.sub}</span>
                </button>
              ))
            ) : (
              /* Regular Executive Tabs */
              [
                { id: 'inbox_members', label: '📥 ከአባላት የመጡ', sub: 'From Members', color: '#4f46e5' },
                { id: 'from_office', label: '🏢 ከጽህፈት ቤት የመጡ', sub: 'From Office', color: '#0f172a' },
                { id: 'sent_members', label: '👥 ለአባላት የተላኩ', sub: 'To Members', color: '#ec4899' },
                { id: 'sent_office', label: '👔 ለጽህፈት ቤት የተላኩ', sub: 'To Office', color: '#8b5cf6' }
              ].map(btn => (
                <button 
                  key={btn.id}
                  onClick={() => setExecView(btn.id)}
                  style={{
                    padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '900', cursor: 'pointer',
                    background: execView === btn.id ? btn.color : 'transparent',
                    color: execView === btn.id ? '#fff' : '#64748b',
                    boxShadow: execView === btn.id ? `0 4px 12px ${btn.color}33` : 'none',
                    transition: 'all 0.3s'
                  }}
                >
                  {btn.label} <span style={{ fontSize: '10px', opacity: 0.8, display: 'block' }}>{btn.sub}</span>
                </button>
              ))
            )}
          </>
        ) : (
          <>
            <button onClick={() => setActiveTab('announcements')} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '800', background: activeTab === 'announcements' ? '#fff' : 'transparent', color: activeTab === 'announcements' ? '#4f46e5' : '#64748b', boxShadow: activeTab === 'announcements' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none' }}>📣 ማስታወቂያዎች (Announcements)</button>
            <button onClick={() => setActiveTab('messages')} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: '800', background: activeTab === 'messages' ? '#fff' : 'transparent', color: activeTab === 'messages' ? '#4f46e5' : '#64748b', boxShadow: activeTab === 'messages' ? '0 4px 10px rgba(0,0,0,0.05)' : 'none' }}>💬 መልዕክቶች (Messages)</button>
          </>
        )}
      </div>

      {/* 2. MAIN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: isMemberLike ? '1fr' : '1fr 1.5fr', gap: '40px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Actions & Member View */}
        <div style={{ position: 'sticky', top: '20px' }}>
          {isMemberLike ? (
            <div style={{ display: 'none' }}>
              {/* Removed messaging form from here as per user request. It remains on Dashboard. */}
            </div>
          ) : (
            isOffice ? (
              <div className="card" style={{ padding: '25px', borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                <MemberMessaging user={user} replyTo={replyTo} onClose={() => { setReplyTo(null); fetchData(); }} />
              </div>
            ) : activeTab === 'announcements' ? (
              isExec && (
                <div className="card" style={{ padding: '25px', borderRadius: '24px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                  <h3 style={{ marginBottom: '20px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ background: '#eef2ff', padding: '8px', borderRadius: '12px' }}>📤</span> ዜና ያሰራጩ (Announcement)
                  </h3>
                  <div className="form-group" style={{ marginBottom: '15px' }}><label style={{ fontWeight: '800', fontSize: '0.8rem', color: '#64748b' }}>የርዕስ ስም (Title)</label><input type="text" className="form-control" value={annoForm.title} onChange={e => setAnnoForm(p => ({ ...p, title: e.target.value }))} style={{ borderRadius: '12px' }} /></div>
                  <div className="form-group" style={{ marginBottom: '15px' }}><label style={{ fontWeight: '800', fontSize: '0.8rem', color: '#64748b' }}>ቀን (Display Date)</label><input type="date" className="form-control" value={annoForm.displayDate} onChange={e => setAnnoForm(p => ({ ...p, displayDate: e.target.value }))} style={{ borderRadius: '12px' }} /></div>
                  <div className="form-group" style={{ marginBottom: '15px' }}><label style={{ fontWeight: '800', fontSize: '0.8rem', color: '#64748b' }}>ዝርዝር መግለጫ (Message)</label><textarea rows="4" className="form-control" value={annoForm.message} onChange={e => setAnnoForm(p => ({ ...p, message: e.target.value }))} style={{ borderRadius: '12px', resize: 'none' }}></textarea></div>
                  <input type="file" multiple onChange={handleFileChange} hidden id="anno-files" />
                  <label htmlFor="anno-files" style={{ cursor: 'pointer', padding: '12px', border: '2px dashed #cbd5e1', borderRadius: '14px', display: 'block', textAlign: 'center', marginBottom: '15px', color: '#64748b', fontSize: '0.9rem', background: '#f8fafc' }}>{uploading ? '⌛ በመጫን ላይ...' : '📎 ፎቶ ወይም ፋይል አያይዝ'}</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button onClick={() => handleAnnoSubmit('member')} disabled={loading} className="btn" style={{ width: '100%', borderRadius: '14px', padding: '14px', fontWeight: '900', background: '#4f46e5', color: '#fff', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)' }}>👥 ለአባላቶቼ አሰራጭ</button>
                    <button onClick={() => handleAnnoSubmit('office')} disabled={loading} className="btn" style={{ width: '100%', borderRadius: '14px', padding: '14px', fontWeight: '900', background: '#0f172a', color: '#fff' }}>🏢 ለጽህፈት ቤት ላክ</button>
                  </div>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {isExec && (
                  <div className="card" style={{ padding: '20px', borderRadius: '24px', background: allowDeptMessaging ? '#f0fdf4' : '#fff1f2', border: `1px solid ${allowDeptMessaging ? '#dcfce7' : '#fee2e2'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: 0, fontWeight: '900', color: allowDeptMessaging ? '#166534' : '#991b1b' }}>{allowDeptMessaging ? '🟢 ክፍት ነው' : '🔴 ተዘግቷል'}</h4>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: allowDeptMessaging ? '#15803d' : '#ef4444', fontWeight: '600' }}>የአባላት መልዕክት መቀበያ (Messaging)</p>
                      </div>
                      <button onClick={handleToggleDeptMessaging} className="btn" style={{ background: allowDeptMessaging ? '#166534' : '#991b1b', color: '#fff', borderRadius: '10px', fontSize: '0.8rem', padding: '8px 16px', fontWeight: '800' }}>{allowDeptMessaging ? 'ዝጋ' : 'ክፈት'}</button>
                    </div>
                  </div>
                )}
                <div className="card" style={{ padding: '25px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                  <MemberMessaging user={user} replyTo={replyTo} onClose={() => { setReplyTo(null); fetchData(); }} />
                </div>
              </div>
            )
          )}
        </div>

        {/* RIGHT COLUMN: Feed & History */}
        <div style={{ minHeight: '600px' }}>
          {/* Feed & History list */}

          {fetching ? (
            <div style={{ textAlign: 'center', padding: '150px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px', animation: 'bounce 1s infinite' }}>⏳</div>
              <p style={{ fontWeight: '800', color: '#94a3b8' }}>መረጃዎች በመጫን ላይ ናቸው...</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', width: '100%' }}>
              {(() => {
                const combined = [
                  ...messages.map(m => ({ ...m, isMessage: true })),
                  ...announcements.map(a => ({ ...a, isBroadcast: true, content: a.message }))
                ].filter(item => {
                  const isMySent = item.sender?.toString() === (user?._id || user?.id)?.toString();
                  const sRole = item.senderRole === 'member' ? 'member' : 'executive';

                  if (isOffice) {
                    if (officeView === 'from_members') return !isMySent && sRole === 'member';
                    if (officeView === 'from_executives') return !isMySent && sRole === 'executive';
                    if (officeView === 'sent_members') return isMySent && (item.targetGroup === 'member' || item.recipientRole === 'member');
                    if (officeView === 'sent_executives') return isMySent && (item.targetGroup === 'executive' || item.recipientRole === 'executive');
                    return false;
                  }

                  if (isExec) {
                    const isFromOffice = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(item.senderRole);
                    if (execView === 'inbox_members') return !isMySent && sRole === 'member' && item.recipientType === 'department';
                    if (execView === 'from_office') return !isMySent && isFromOffice;
                    if (execView === 'sent_members') return isMySent && (item.targetGroup === 'member' || item.recipientRole === 'member');
                    if (execView === 'sent_office') return isMySent && (item.recipientType === 'leadership' || item.recipientRole === 'office');
                    return false;
                  }
                  
                  // Member/Sub-Exec tabs
                  if (activeTab === 'announcements') {
                    if (!item.isBroadcast) return false;
                    return !isMySent;
                  } else {
                    if (!item.isMessage) return false;
                    const isFromOffice = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(item.senderRole);
                    if (subTab === 'inbox_office') return !isMySent && isFromOffice;
                    if (subTab === 'inbox_dept') return !isMySent && !isFromOffice;
                    if (subTab === 'sent_office') return isMySent && item.recipientType === 'leadership';
                    if (subTab === 'sent_dept') return isMySent && item.recipientType === 'department';
                    return false;
                  }
                }).sort((a,b) => new Date(b.createdAt || b.displayDate) - new Date(a.createdAt || a.displayDate));

                if (combined.length === 0) return (
                  <div style={{ padding: '100px', textAlign: 'center', background: '#f8fafc', borderRadius: '32px', color: '#94a3b8', border: '2px dashed #e2e8f0' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>📭</div>
                    <h3 style={{ margin: 0, fontWeight: '900', color: '#cbd5e1' }}>ምንም የተገኘ መረጃ የለም</h3>
                    <p style={{ margin: '5px 0 0', fontSize: '0.9rem' }}>No messages found in this category.</p>
                  </div>
                );

                return combined.map(item => {
                  const isPremium = user?.role === 'sub_executive';
                  const isSentByMe = item.sender?.toString() === (user?._id || user?.id)?.toString();
                  
                  if (isPremium) {
                    return (
                      <div key={item._id} className="card premium-message-card" onClick={() => !item.isBroadcast && handleMarkRead(item._id)} style={{ padding: '30px', borderRadius: '35px', background: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: 'none', position: 'relative', animation: 'fadeInUp 0.4s ease' }}>
                        {/* Top row: Badges and Date */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <span style={{ background: item.isRead ? '#f1f5f9' : '#eef2ff', color: item.isRead ? '#64748b' : '#4f46e5', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.5px' }}>
                              {item.isBroadcast ? '📢 BROADCAST' : (item.isRead ? '✓ ✓ SEEN' : '✓ DELIVERED')}
                            </span>
                            <span style={{ background: '#f8fafc', color: '#1e293b', padding: '6px 14px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid #f1f5f9' }}>
                              {isSentByMe ? `To: ${item.recipientName || item.targetDepartment || 'Leadership'}` : `From: ${item.senderName}`}
                            </span>
                          </div>
                          <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '700' }}>{new Date(item.createdAt || item.displayDate).toLocaleDateString()}</div>
                        </div>

                        {/* Title */}
                        <h3 style={{ margin: '0 0 15px', fontWeight: '900', fontSize: '1.5rem', color: '#0f172a' }}>{item.title}</h3>

                        {/* Content Bubble */}
                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '24px', marginBottom: '20px' }}>
                          <p style={{ color: '#334155', fontSize: '1.05rem', whiteSpace: 'pre-wrap', lineHeight: '1.7', margin: 0 }}>{item.content || item.message}</p>
                        </div>

                        {/* Attachments */}
                        {item.attachments?.length > 0 && (
                          <div style={{ marginBottom: '25px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {item.attachments.map((f, i) => (
                              <div key={i} style={{ fontSize: '0.75rem', background: '#fff', padding: '8px 16px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#475569', cursor: 'pointer' }} onClick={() => window.open(f.data, '_blank')}>
                                🖼️ {f.fileName}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setReplyTo(item); }} 
                            className="btn" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.85rem', fontWeight: '900', background: '#eef2ff', color: '#4f46e5', borderRadius: '16px', border: 'none' }}
                          >
                            <span style={{ background: '#4f46e5', color: '#fff', width: '22px', height: '22px', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↪</span> ምላሽ ስጥ (Reply)
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); item.isBroadcast ? handleDeleteAnno(item._id) : handleDeleteMessage(item._id); }} 
                            className="btn" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.85rem', fontWeight: '900', background: '#fff1f2', color: '#e11d48', borderRadius: '16px', border: 'none' }}
                          >
                            <span style={{ fontSize: '1rem' }}>🗑️</span> አጥፋ
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(item); }} 
                            className="btn" 
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.85rem', fontWeight: '900', background: '#f1f5f9', color: '#475569', borderRadius: '16px', border: 'none' }}
                          >
                            <span style={{ fontSize: '1rem' }}>👁️</span> {item.isActive === false ? 'Unhide' : 'Hide'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  /* Standard View for other roles */
                  return (
                    <div key={item._id} className="card message-card" onClick={() => !item.isBroadcast && handleMarkRead(item._id)} style={{ padding: '30px', borderRadius: '28px', position: 'relative', borderLeft: (item.isMessage && !item.isRead) ? '8px solid #4f46e5' : 'none', background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', transition: 'all 0.3s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {item.isBroadcast ? (
                            <span style={{ background: '#fff7ed', color: '#ea580c', padding: '6px 14px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid #ffedd5' }}>📢 BROADCAST</span>
                          ) : (
                            <span style={{ background: item.isRead ? '#f1f5f9' : '#eef2ff', color: item.isRead ? '#64748b' : '#4f46e5', padding: '6px 14px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' }}>
                              {item.isRead ? '✓ ✓ SEEN' : '✓ DELIVERED'}
                            </span>
                          )}
                          <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#1e293b', background: '#f8fafc', padding: '6px 14px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            {isOffice && (officeView === 'sent_members' || officeView === 'sent_executives') 
                              ? `To: ${item.isBroadcast ? (item.targetGroup === 'member' ? 'Members' : 'Executives') : (item.recipientType === 'individual' ? item.recipientName : (item.targetDepartment || 'Leadership'))}`
                              : `From: ${item.senderName} ${item.senderDepartmentAmharic ? `(${item.senderDepartmentAmharic})` : ''}`
                            }
                          </span>
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '800' }}>{new Date(item.createdAt || item.displayDate).toLocaleDateString()}</div>
                      </div>
                      <h3 style={{ margin: '0 0 12px', fontWeight: '900', fontSize: '1.3rem', color: '#0f172a' }}>{item.title}</h3>
                      <p style={{ color: '#444', fontSize: '1.05rem', whiteSpace: 'pre-wrap', lineHeight: '1.7', background: '#fcfcfc', padding: '15px', borderRadius: '16px' }}>{item.content || item.message}</p>
                      
                      {item.attachments?.length > 0 && (
                        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {item.attachments.map((f, i) => (
                            <div key={i} style={{ fontSize: '0.75rem', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', color: '#475569' }}>
                              {f.type === 'photo' ? '🖼️' : '📄'} {f.fileName}
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: '25px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          {(isOffice || isExec) ? (
                            <button onClick={(e) => { e.stopPropagation(); setReplyTo(item); }} className="btn" style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: '900', background: '#eef2ff', color: '#4f46e5', borderRadius: '12px', border: 'none' }}>↪️ ምላሽ ስጥ (Reply)</button>
                          ) : (!item.isBroadcast && !isSentByMe && (
                            <button onClick={(e) => { e.stopPropagation(); setReplyTo(item); }} className="btn" style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: '900', background: '#eef2ff', color: '#4f46e5', borderRadius: '12px', border: 'none' }}>↪️ ምላሽ ስጥ (Reply)</button>
                          ))}
                          {(isOffice || (isExec && execView !== 'from_office') || isSentByMe) && (
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button onClick={(e) => { e.stopPropagation(); item.isBroadcast ? handleDeleteAnno(item._id) : handleDeleteMessage(item._id); }} className="btn" style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: '900', background: '#fff1f2', color: '#e11d48', borderRadius: '12px', border: 'none' }}>🗑️ አጥፋ</button>
                              {(execView === 'inbox_members' || execView === 'sent_members' || officeView === 'sent_members' || officeView === 'sent_executives') && (
                                <button onClick={(e) => { e.stopPropagation(); handleToggleStatus(item); }} className="btn" style={{ padding: '8px 20px', fontSize: '0.8rem', fontWeight: '900', background: item.isActive === false ? '#dcfce7' : '#f1f5f9', color: item.isActive === false ? '#15803d' : '#475569', borderRadius: '12px', border: 'none' }}>
                                  {item.isActive === false ? '🔓 Unhide' : '👁️ Hide'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {!item.isRead && !isMemberLike && !item.isBroadcast && !isSentByMe && (
                          <span style={{ fontSize: '0.7rem', fontWeight: '900', color: '#4f46e5', background: '#eef2ff', padding: '6px 14px', borderRadius: '20px', alignSelf: 'center' }}>⭐ አዲስ መልዕክት</span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default CommunicationCenter;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const MessagesPage = ({ user, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagingEnabled, setMessagingEnabled] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isAdmin = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user?.role);

  useEffect(() => {
    fetchMessages();
    fetchMessagingStatus();
  }, []);

  const fetchMessagingStatus = async () => {
    try {
      const res = await axios.get('/messages/status');
      setMessagingEnabled(res.data.allowOfficeMessaging);
    } catch (err) {}
  };

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/messages");
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMessaging = async () => {
    setToggling(true);
    try {
      const res = await axios.patch('/settings/toggle-messaging');
      if (res.data.success) {
        setMessagingEnabled(res.data.allowMemberMessaging);
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error('Failed to toggle messaging');
    } finally {
      setToggling(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`/messages/${id}/read`);
      setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
    } catch (err) {}
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('ይህን መልዕክት ማጥፋት ይፈልጋሉ? (Are you sure you want to delete this message?)')) return;

    try {
      const res = await axios.delete(`/messages/${id}`);
      if (res.data.success) {
        setMessages(prev => prev.filter(m => m._id !== id));
        toast.success('መልዕክቱ ጠፍቷል (Message deleted)');
      }
    } catch (err) {
      toast.error('Failed to delete message');
    }
  };

  return (
    <div className="messages-page" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <button onClick={onBack} className="btn btn-sm btn-outline-secondary" style={{ marginBottom: '10px' }}>
            ← Back to Dashboard
          </button>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>
            {user?.role === 'member' ? '📤 የላክኳቸው መልዕክቶች (Sent Messages)' : '📥 ከአባላት የመጡ መልዕክቶች (Member Messages)'}
          </h2>
        </div>

        {/* Messaging Toggle Control (Leadership only) */}
        {isAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: messagingEnabled ? 'linear-gradient(135deg, #dcfce7, #bbf7d0)' : 'linear-gradient(135deg, #fee2e2, #fecaca)',
            border: `2px solid ${messagingEnabled ? '#86efac' : '#fca5a5'}`,
            borderRadius: '16px',
            padding: '16px 24px',
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: messagingEnabled ? '#15803d' : '#b91c1c', marginBottom: '4px' }}>
                የአባላት መልዕክት
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '900', color: messagingEnabled ? '#166534' : '#7f1d1d' }}>
                {messagingEnabled ? '🟢 ክፍት ነው (Open)' : '🔴 ተዘግቷል (Closed)'}
              </div>
            </div>
            <button
              onClick={handleToggleMessaging}
              disabled={toggling}
              style={{
                background: messagingEnabled ? '#ef4444' : '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 22px',
                fontWeight: '900',
                fontSize: '0.85rem',
                cursor: toggling ? 'not-allowed' : 'pointer',
                opacity: toggling ? 0.7 : 1,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {toggling ? '...' : messagingEnabled ? '🔒 አጥፋ (Disable)' : '🔓 ክፈት (Enable)'}
            </button>
          </div>
        )}
      </div>

      {/* Messages List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>🔄 Loading messages...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {messages.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '80px', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', color: '#94a3b8' }}>
              <span style={{ fontSize: '3rem', display: 'block', marginBottom: '15px' }}>📭</span>
              {user?.role === 'member' ? 'ምንም የላኩት መልዕክት የለም። (No sent messages.)' : 'ምንም መልዕክት የለም። (No messages in inbox.)'}
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg._id} className="card" onClick={() => handleMarkAsRead(msg._id)} style={{ 
                borderRadius: '20px', position: 'relative', overflow: 'hidden', 
                borderLeft: msg.isRead ? '6px solid #cbd5e1' : '6px solid #4f46e5',
                background: msg.isRead ? '#fcfcfc' : '#fff',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
              }}>
                <div style={{ padding: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <span style={{ 
                      fontSize: '11px', fontWeight: '900', 
                      color: user?.role === 'member' ? (msg.recipientType === 'leadership' ? '#ea580c' : '#059669') : (msg.isRead ? '#64748b' : '#4f46e5'), 
                      textTransform: 'uppercase', 
                      background: user?.role === 'member' ? (msg.recipientType === 'leadership' ? '#fff7ed' : '#ecfdf5') : (msg.isRead ? '#f1f5f9' : '#eef2ff'), 
                      padding: '4px 10px', borderRadius: '6px' 
                    }}>
                      {user?.role === 'member' 
                        ? (msg.recipientType === 'leadership' ? '🏢 ለጽህፈት ቤት የተላከ (To Office)' : `💼 ለስራ አስፈጻሚ የተላከ (To Executive)`)
                        : (msg.recipientType === 'leadership' ? '🏛️ Leadership Info' : `💼 ${msg.department} Dept`)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>
                        {new Date(msg.createdAt).toLocaleDateString('am-ET')}
                      </span>
                      <button 
                        onClick={(e) => handleDelete(e, msg._id)}
                        style={{ 
                          background: '#fee2e2', border: 'none', color: '#ef4444', 
                          cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', borderRadius: '8px', transition: 'background 0.2s',
                          fontSize: '14px'
                        }}
                        title="Delete Message"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <h4 style={{ margin: '0 0 10px', color: '#1e293b', fontWeight: '800' }}>{msg.subject || msg.title || 'No Subject'}</h4>
                  <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>{msg.content}</p>
                  
                  <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>
                      {msg.senderName?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>{msg.senderName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{msg.senderPhone || msg.senderDepartment}</div>
                    </div>
                    {user?.role === 'member' ? (
                      <div style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '800', color: msg.isRead ? '#10b981' : '#f59e0b' }}>
                        {msg.isRead ? '✓ ✓ ታይቷል (Seen)' : '✓ አልታየም (Delivered)'}
                      </div>
                    ) : (
                      !msg.isRead && (
                        <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: '800', background: '#4f46e5', color: '#fff', padding: '3px 8px', borderRadius: '20px' }}>
                          ⭐ NEW
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MessagesPage;

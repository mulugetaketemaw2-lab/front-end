import React from 'react';
import { formatEthDate } from '../utils/ethiopianDate';

const AnnouncementsFeed = ({ announcements, loading, onDelete, onToggleStatus, currentUserRole, currentUserId, activeFilter }) => {
  if (loading) return <div className="mt-4 p-4 text-center">🔄 Loading Announcements...</div>;
  
  const isAdmin = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(currentUserRole);
  
  const filteredAnnouncements = announcements.filter(post => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'office') {
      return ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole);
    }
    if (activeFilter === 'executive') {
      if (currentUserRole === 'member') {
        return !['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole);
      }
      return post.targetGroup === 'executive';
    }
    return post.targetGroup === activeFilter;
  });

  return (
    <div className="announcements-feed-section mt-4 mb-4">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {filteredAnnouncements.length === 0 ? (
          <div className="no-data-text" style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📭</span>
            {activeFilter === 'all' ? 'ምንም አዲስ ማስታወቂያ የለም።' : `ምንም የ${activeFilter === 'executive' ? 'አመራር' : 'አባላት'} ማስታወቂያ የለም።`}
          </div>
        ) : (
          filteredAnnouncements.map((post) => (
            <div key={post._id} className="card" style={{ 
              borderRadius: '16px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              border: post.targetGroup === 'executive' ? '1px solid #e2e8f0' : 'none',
              background: post.targetGroup === 'executive' ? '#fcfcfc' : '#fff',
              position: 'relative'
            }}>
              {post.targetGroup === 'executive' && (
                <div style={{ position: 'absolute', top: 0, right: 0, background: '#1e293b', color: '#fff', fontSize: '10px', padding: '4px 10px', borderRadius: '0 0 0 10px', fontWeight: '800' }}>
                  🎖️ EXECUTIVE ONLY
                </div>
              )}
              
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                  <div style={{ 
                    width: '45px', height: '45px', borderRadius: '12px', background: post.targetGroup === 'executive' ? '#1e293b' : '#3b82f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem'
                  }}>
                    {post.targetGroup === 'executive' ? '🎖️' : '👥'}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{post.title}</h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: '800', 
                        padding: '2px 8px', 
                        borderRadius: '50px',
                        background: ['super_admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole) ? '#fff7ed' : '#ecfdf5',
                        color: ['super_admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole) ? '#ea580c' : '#059669',
                      }}>
                        {['super_admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole) 
                          ? '🏢 ከጽህፈት ቤት (Office)' 
                          : `💼 ከ${post.senderDepartmentAmharic || 'ስራ አስፈጻሚ'} (Dept)`}
                      </span>
                      <small style={{ color: '#94a3b8', fontWeight: '600', fontSize: '11px' }}>
                        {formatEthDate(post.displayDate || post.createdAt)}
                      </small>
                    </div>
                  </div>
                </div>
                
                <p style={{ color: '#334155', lineHeight: '1.6', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{post.message}</p>
                
                {post.attachments && post.attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                    {post.attachments.map((file, idx) => (
                      <div key={idx} className="attachment-preview" style={{ 
                        borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0', cursor: 'pointer',
                        width: '80px', height: '80px', position: 'relative'
                      }} onClick={() => window.open(file.data, '_blank')}>
                        {file.type === 'photo' ? (
                          <img src={file.data} alt="att" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                            <span style={{ fontSize: '1.5rem' }}>📄</span>
                            <small style={{ fontSize: '8px', padding: '2px', textAlign: 'center' }}>PDF</small>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {(isAdmin || post.sender?.toString() === currentUserId?.toString()) && (
                  <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => onToggleStatus(post._id)}
                      className={`btn btn-sm ${post.isActive !== false ? 'btn-outline-warning' : 'btn-outline-success'}`}
                      style={{ borderRadius: '8px', fontSize: '0.8rem' }}
                    >
                      {post.isActive !== false ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => onDelete(post._id)}
                      className="btn btn-sm btn-outline-danger"
                      style={{ borderRadius: '8px', fontSize: '0.8rem' }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementsFeed;

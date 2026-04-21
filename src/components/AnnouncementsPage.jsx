import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import AnnouncementsFeed from './AnnouncementsFeed';

const AnnouncementsPage = ({ user, initialFilter = 'all', onBack }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/announcements");
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to fetch announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this?')) return;
    try {
      await axios.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      toast.success('Deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await axios.patch(`/announcements/${id}/toggle-status`);
      if (res.data.success) {
        setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, isActive: res.data.isActive } : a));
        toast.success(res.data.message);
      }
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  return (
    <div className="announcements-page" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <button onClick={onBack} className="btn btn-sm btn-outline-secondary" style={{ marginBottom: '10px' }}>
            ← Back to Dashboard
          </button>
          <h2 style={{ fontSize: '2rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>
             {user?.role === 'member' ? (
                activeFilter === 'office' ? '🏢 ከጽህፈት ቤት (From Office)' : 
                activeFilter === 'executive' ? '💼 ከስራ አስፈጻሚ (From Executive)' : 
                '📢 ዜናዎች እና ማስታወቂያዎች (Announcements)'
             ) : (
                activeFilter === 'executive' ? '🎖️ የአመራር ዜናዎች (Executive News)' : 
                activeFilter === 'member' ? '👥 የአባላት ዜናዎች (Member News)' : 
                '📢 ዜናዎች እና ማስታወቂያዎች (Announcements)'
             )}
          </h2>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '5px', borderRadius: '12px' }}>
          {user?.role === 'member' ? (
            <>
              <button 
                onClick={() => setActiveFilter('member')}
                style={{ 
                  border: 'none', padding: '8px 15px', borderRadius: '8px', 
                  background: activeFilter === 'member' ? '#fff' : 'transparent',
                  boxShadow: activeFilter === 'member' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                }}>📰 ሁሉም (All)</button>
              <button 
                onClick={() => setActiveFilter('office')}
                style={{ 
                  border: 'none', padding: '8px 15px', borderRadius: '8px', 
                  background: activeFilter === 'office' ? '#fff' : 'transparent',
                  boxShadow: activeFilter === 'office' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                }}>🏢 ከጽህፈት ቤት (Office)</button>
              <button 
                onClick={() => setActiveFilter('executive')}
                style={{ 
                  border: 'none', padding: '8px 15px', borderRadius: '8px', 
                  background: activeFilter === 'executive' ? '#fff' : 'transparent',
                  boxShadow: activeFilter === 'executive' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                }}>💼 ከስራ አስፈጻሚ (Department)</button>
            </>
          ) : (
            <>
              <button 
                onClick={() => setActiveFilter('all')}
                style={{ 
                  border: 'none', padding: '8px 15px', borderRadius: '8px', 
                  background: activeFilter === 'all' ? '#fff' : 'transparent',
                  boxShadow: activeFilter === 'all' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                }}>ALL</button>
              <button 
                onClick={() => setActiveFilter('member')}
                style={{ 
                  border: 'none', padding: '8px 15px', borderRadius: '8px', 
                  background: activeFilter === 'member' ? '#fff' : 'transparent',
                  boxShadow: activeFilter === 'member' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                }}>MEMBERS</button>
              <button 
                onClick={() => setActiveFilter('executive')}
                style={{ 
                  border: 'none', padding: '8px 15px', borderRadius: '8px', 
                  background: activeFilter === 'executive' ? '#fff' : 'transparent',
                  boxShadow: activeFilter === 'executive' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                }}>EXECUTIVE</button>
            </>
          )}
        </div>
      </div>

      <AnnouncementsFeed 
        announcements={announcements} 
        loading={loading} 
        onDelete={handleDelete} 
        onToggleStatus={handleToggleStatus} 
        currentUserRole={user?.role} 
        currentUserId={user?._id}
        activeFilter={activeFilter} 
      />
    </div>
  );
};

export default AnnouncementsPage;

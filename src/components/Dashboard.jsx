import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import MemberMessaging from "./MemberMessaging";

const AnnouncementsFeed = ({ announcements, loading, onDelete, onToggleStatus, currentUserRole, activeFilter, currentUserId }) => {
  if (loading) return <div className="mt-4 p-4 text-center">🔄 Loading Announcements...</div>;
  
  const isAdmin = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(currentUserRole);
  
  return (
    <div className="announcements-feed-section mt-4 mb-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#1e293b' }}>
          {activeFilter === 'executive' ? '🎖️ የአመራር ዜናዎች (Executive News)' : 
           activeFilter === 'member' ? '👥 የአባላት ዜናዎች (Member News)' : 
           '📢 ዜናዎች እና ማስታወቂያዎች (News & Announcements)'}
        </h3>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {announcements
          .filter(post => activeFilter === 'all' ? true : post.targetGroup === activeFilter)
          .length === 0 ? (
          <div className="no-data-text" style={{ gridColumn: '1 / -1', padding: '40px' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📭</span>
            {activeFilter === 'all' ? 'ምንም አዲስ ማስታወቂያ የለም።' : `ምንም የ${activeFilter === 'executive' ? 'አመራር' : 'አባላት'} ማስታወቂያ የለም።`}
          </div>
        ) : (
          announcements
            .filter(post => activeFilter === 'all' ? true : post.targetGroup === activeFilter)
            .map((post) => (
            <div key={post._id} className="card" style={{ 
              borderRadius: '16px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              background: post.isActive === false ? '#f8fafc' : '#fff',
              border: post.isActive === false ? '1px dashed #cbd5e1' : 'none',
              transition: 'transform 0.2s ease',
              position: 'relative',
              opacity: post.isActive === false ? 0.8 : 1
            }}>
              {(isAdmin || post.sender?.toString() === currentUserId?.toString()) && (
                <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px', zIndex: 10 }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleStatus(post._id); }} 
                    style={{ 
                      background: post.isActive === false ? '#dcfce7' : '#f1f5f9', 
                      color: post.isActive === false ? '#166534' : '#475569', 
                      border: 'none', borderRadius: '8px', padding: '6px 12px',
                      fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                    }}>
                    {post.isActive === false ? '👁️ Unhide' : '👁️ Hide'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(post._id); }} 
                    style={{ 
                      background: '#fee2e2', color: '#ef4444', 
                      border: 'none', borderRadius: '8px', padding: '6px 12px',
                      fontSize: '12px', fontWeight: '800', cursor: 'pointer'
                    }}>
                    🗑️ Delete
                  </button>
                </div>
              )}
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      padding: '4px 10px', 
                      borderRadius: '50px',
                      background: post.targetGroup === 'member' ? '#eef2ff' : '#fef2f2',
                      color: post.targetGroup === 'member' ? '#4f46e5' : '#ef4444',
                      textTransform: 'uppercase'
                    }}>
                      {post.targetGroup === 'member' ? '👥 ALL MEMBERS' : '🎖️ EXECUTIVES ONLY'}
                    </span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '800', 
                      padding: '4px 10px', 
                      borderRadius: '50px',
                      background: ['super_admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole) ? '#fff7ed' : '#ecfdf5',
                      color: ['super_admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole) ? '#ea580c' : '#059669',
                    }}>
                      {['super_admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole) ? '🏢 ከጽህፈት ቤት (Office)' : '💼 ከስራ አስፈጻሚ (Executive)'}
                    </span>
                  </div>
                  <small style={{ color: '#94a3b8' }}>{new Date(post.displayDate || post.createdAt).toLocaleDateString()}</small>
                </div>
                
                <h4 style={{ margin: '0 0 10px', fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{post.title}</h4>
                {post.message && (
                  <p style={{ 
                    margin: '0 0 15px', 
                    fontSize: '0.95rem', 
                    color: '#475569', 
                    whiteSpace: 'pre-wrap',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {post.message}
                  </p>
                )}

                {post.attachments && post.attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {post.attachments.map((file, idx) => (
                      <div key={idx} onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = file.data;
                        link.download = file.fileName || `attachment-${idx}`;
                        link.click();
                      }} style={{
                        width: '40px', height: '40px', borderRadius: '8px', 
                        background: '#f1f5f9', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', fontSize: '20px'
                      }} title={`Download ${file.fileName || 'file'}`}>
                        {file.type === 'photo' ? '🖼️' : '📄'}
                      </div>
                    ))}
                    <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>
                      {post.attachments.length} attachment(s)
                    </span>
                  </div>
                )}
                
                <div style={{ marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                    {post.senderName ? post.senderName[0] : 'U'}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                    {post.senderName} ({['super_admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(post.senderRole) ? 'ጽህፈት ቤት (Office)' : 'ስራ አስፈጻሚ (Executive)'})
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
const Dashboard = ({ user, setView }) => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalSubgroups: 0,
    todayAttendance: 0,
    pendingApprovals: 0
  });
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [financeSummary, setFinanceSummary] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [allowOfficeMessaging, setAllowOfficeMessaging] = useState(false);
  const [allowDeptMessaging, setAllowDeptMessaging] = useState(false);
  const [selectedRecipientType, setSelectedRecipientType] = useState('leadership');
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
  const [memberStats, setMemberStats] = useState(null);
  const messagesSectionRef = useRef(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchAnnouncements();
    checkMessagingSettings();
    fetchMessages();
  }, []);

  const checkMessagingSettings = async () => {
    try {
      const res = await axios.get("/messages/status");
      setAllowOfficeMessaging(res.data.allowOfficeMessaging);
      setAllowDeptMessaging(res.data.allowDeptMessaging);
    } catch (err) {}
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await axios.get("/messages");
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`/messages/${id}/read`);
      setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
    } catch (err) {}
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get("/announcements");
      if (res.data.success) {
        setAnnouncements(res.data.data);
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await axios.delete(`/announcements/${id}`);
      setAnnouncements(prev => prev.filter(post => post._id !== id));
      toast.success('Announcement deleted');
    } catch (error) {
      toast.error('Failed to delete announcement');
    }
  };

  const handleToggleAnnouncementStatus = async (id) => {
    try {
      const res = await axios.patch(`/announcements/${id}/toggle-status`);
      if (res.data.success) {
        setAnnouncements(prev => prev.map(post => 
          post._id === id ? { ...post, isActive: res.data.isActive } : post
        ));
        toast.success(res.data.message);
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const fetchDashboardStats = async () => {
    try {
      if (user?.role === 'member' || user?.role === 'sub_executive') {
        const response = await axios.get("/reports/member/overview");
        if (response.data.success) {
          setMemberStats(response.data.data);
        }
      } else {
        const response = await axios.get("/reports/dashboard");
        if (response.data.success) {
          setStats(response.data.data.overview);
        }
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinanceStats = async () => {
    try {
      const mode = ['super_admin', 'admin', 'audit', 'hisab'].includes(user?.role) ? 'central' : 'standard';
      const res = await axios.get(`/finance/summary?mode=${mode}`);
      if (res.data.success) {
        setFinanceSummary(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching finance stats:", error);
    }
  };

  useEffect(() => {
    if (['super_admin', 'admin', 'audit', 'hisab', 'lmat'].includes(user?.role)) {
      fetchFinanceStats();
    }
  }, [user]);

  const navTo = (path) => {
    // Attempt SPA navigation without reload
    window.history.pushState(null, '', path);
    window.dispatchEvent(new Event('popstate'));
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ marginTop: '50px' }}>
        <div className="spinner" style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
        <p>Loading Dashboard...</p>
      </div>
    );
  }

    const isSubExec = user?.role === 'sub_executive';
    const isMember = user?.role === 'member';
    const departmentName = user?.departmentAmharic || user?.department || 'Department';

    return (
      <div className="dashboard-container animate-fade-in">
        
        {/* Pending Registrations Notification Alert (Tailwind) */}
        {stats.pendingApprovals > 0 && ['abalat_guday', 'admin', 'super_admin'].includes(user?.role) && (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl px-6 py-4 mb-6 shadow-sm animate-slide-down">
            <div className="flex items-center gap-4">
              <span className="w-12 h-12 flex items-center justify-center bg-amber-100 text-amber-600 rounded-xl text-2xl shadow-sm animate-bounce">🔔</span>
              <div>
                <h4 className="text-amber-900 font-extrabold text-base m-0">አዲስ የተመዘገቡ ተማሪዎች አሉ! <span className="text-amber-600 font-medium text-sm">(New Registrations)</span></h4>
                <p className="text-amber-700 text-sm font-medium m-0 mt-1">
                  በአሁኑ ሰዓት <strong className="text-amber-900">{stats.pendingApprovals}</strong> የሚጸድቁ ተማሪዎች ይጠብቃሉ።
                </p>
              </div>
            </div>
            <button
              onClick={() => navTo("/pending")}
              className="bg-amber-500 hover:bg-amber-600 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border-0 cursor-pointer"
            >
              አሁን አጽድቅ →
            </button>
          </div>
        )}
        
        {/* Premium Welcome Banner (Tailwind) */}
        <div className={`relative overflow-hidden rounded-3xl p-7 mb-2 shadow-lg ${isSubExec ? 'bg-gradient-to-br from-slate-800 to-slate-700' : 'bg-gradient-to-br from-indigo-700 via-indigo-600 to-purple-600'}`}>
          {/* decorative blur blobs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-52 h-52 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            {/* Left: Icon + Text */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 flex items-center justify-center bg-white/15 rounded-2xl text-4xl shadow-md backdrop-blur-sm border border-white/20">
                {isSubExec ? '🎖️' : '👋'}
              </div>
              <div>
                <p className="text-white/70 text-sm font-semibold tracking-wide m-0 uppercase">
                  {isSubExec ? `${departmentName} · ንኡስ ተጠሪ` : 'Administrative Dashboard'}
                </p>
                <p className="text-white font-bold text-base m-0 mt-1 max-w-md leading-snug">
                  {isSubExec
                    ? `የ${departmentName} ንኡስ ተጠሪ Dashboard`
                    : 'የተቋሙን አጠቃላይ መረጃዎች እና ስታቲስቲክስ እዚህ ማየት ይችላሉ።'}
                </p>
                {isSubExec && user.leaderName && (
                  <p className="text-white/50 text-xs m-0 mt-1">የሚመሩት በ: <strong className="text-white/75">{user.leaderName}</strong></p>
                )}
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full pl-4 pr-2 py-2 border border-white/20 shrink-0">
              {isMember || isSubExec ? (
                <button
                  onClick={() => setIsMessagingModalOpen(true)}
                  className="bg-white text-indigo-600 hover:bg-indigo-50 font-black text-sm px-5 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border-0 cursor-pointer flex items-center gap-2"
                >
                  🚀 <span>መልዕክት ላክ</span>
                </button>
              ) : (
                <>
                  <span className="text-white/80 text-xs font-bold mr-1 hidden sm:block">📢 ዜናዎች</span>
                  <button
                    onClick={() => setView('communication')}
                    className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-2 rounded-full border-0 cursor-pointer transition-all duration-200 flex items-center gap-1.5"
                  >
                    📢 NEWS
                  </button>
                  <button
                    onClick={() => setView('comm-messages')}
                    className="bg-white/90 hover:bg-white text-slate-800 font-black text-xs px-4 py-2 rounded-full border-0 cursor-pointer transition-all duration-200 shadow-sm hover:shadow flex items-center gap-1.5"
                  >
                    📥 MESSAGES
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      {/* Advanced Stats Grid for All Roles (Refactored with Tailwind) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 select-none mt-8">
        {(!isMember && !isSubExec) ? (
          <>
            {/* Total Members */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 shadow-sm border border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -right-4 -bottom-4 text-blue-200/50 text-8xl pointer-events-none">👥</div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-blue-900 uppercase tracking-widest">ጠቅላላ አባላት</h3>
                <span className="w-10 h-10 flex items-center justify-center bg-blue-200 text-blue-700 rounded-xl shadow-sm text-lg">👥</span>
              </div>
              <p className="text-5xl font-black text-blue-800 tracking-tight">{stats.totalMembers}</p>
              <p className="text-xs text-blue-700 mt-3 font-semibold bg-blue-200/50 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">TOTAL MEMBERS</p>
            </div>

            {/* Pending */}
            {user?.role === 'abalat_guday' && (
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl p-6 shadow-sm border border-amber-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ring-2 ring-transparent hover:ring-amber-300" onClick={() => navTo("/pending")}>
                <div className="absolute -right-4 -bottom-4 text-amber-200/50 text-8xl pointer-events-none animate-pulse">🔔</div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-amber-900 uppercase tracking-widest">የሚጸድቁ ጠባቂ</h3>
                  <span className="w-10 h-10 flex items-center justify-center bg-amber-200 text-amber-700 rounded-xl shadow-sm text-lg">🔔</span>
                </div>
                <p className="text-5xl font-black text-amber-800 tracking-tight">{stats.pendingApprovals || 0}</p>
                <p className="text-xs text-amber-800 mt-3 font-semibold bg-amber-200/70 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">PENDING REGISTRATIONS</p>
              </div>
            )}

            {/* Active Members */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-6 shadow-sm border border-emerald-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -right-4 -bottom-4 text-emerald-200/50 text-8xl pointer-events-none">✅</div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-emerald-900 uppercase tracking-widest">ንቁ አባላት</h3>
                <span className="w-10 h-10 flex items-center justify-center bg-emerald-200 text-emerald-700 rounded-xl shadow-sm text-lg">✅</span>
              </div>
              <p className="text-5xl font-black text-emerald-800 tracking-tight">{stats.activeMembers}</p>
              <p className="text-xs text-emerald-700 mt-3 font-semibold bg-emerald-200/50 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">ACTIVE MEMBERS</p>
            </div>

            {/* Subgroups */}
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 rounded-3xl p-6 shadow-sm border border-orange-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -right-4 -bottom-4 text-orange-200/50 text-8xl pointer-events-none">📑</div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-orange-900 uppercase tracking-widest">ንኡስ ቡድኖች</h3>
                <span className="w-10 h-10 flex items-center justify-center bg-orange-200 text-orange-700 rounded-xl shadow-sm text-lg">📑</span>
              </div>
              <p className="text-5xl font-black text-orange-800 tracking-tight">{stats.totalSubgroups}</p>
              <p className="text-xs text-orange-700 mt-3 font-semibold bg-orange-200/50 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">ACTIVE SUBGROUPS</p>
            </div>
          </>
        ) : (
          <>
            <div className="relative overflow-hidden bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-3xl p-6 shadow-sm border border-cyan-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -right-4 -bottom-4 text-cyan-200/50 text-8xl pointer-events-none">🏢</div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-cyan-900 uppercase tracking-widest">የተመዘገቡበት ክፍል</h3>
                <span className="w-10 h-10 flex items-center justify-center bg-cyan-200 text-cyan-700 rounded-xl shadow-sm text-lg">🏢</span>
              </div>
              <p className="text-2xl font-bold text-cyan-900 leading-tight pr-8">{memberStats?.department || departmentName}</p>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-6 shadow-sm border border-teal-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -right-4 -bottom-4 text-teal-200/50 text-8xl pointer-events-none">🎯</div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-teal-900 uppercase tracking-widest">ተሳትፎ</h3>
                <span className="w-10 h-10 flex items-center justify-center bg-teal-200 text-teal-700 rounded-xl shadow-sm text-lg">🎯</span>
              </div>
              <p className="text-3xl font-black text-teal-800">{memberStats?.engagement || 'ንቁ አሳታፊ'}</p>
              <p className="text-xs text-teal-700 mt-3 font-semibold bg-teal-200/50 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">{memberStats?.engagementDetail || 'Your status is currently active'}</p>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-6 shadow-sm border border-purple-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute -right-4 -bottom-4 text-purple-200/50 text-8xl pointer-events-none">📣</div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-purple-900 uppercase tracking-widest">አዳዲስ ዜናዎች</h3>
                <span className="w-10 h-10 flex items-center justify-center bg-purple-200 text-purple-700 rounded-xl shadow-sm text-lg">📣</span>
              </div>
              <p className="text-5xl font-black text-purple-800 tracking-tight">{memberStats?.announcementCount ?? announcements.length}</p>
              <p className="text-xs text-purple-700 mt-3 font-semibold bg-purple-200/50 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">RECENT ANNOUNCEMENTS</p>
            </div>
          </>
        )}
        
        {/* Attendance */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100 rounded-3xl p-6 shadow-sm border border-rose-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="absolute -right-4 -bottom-4 text-rose-200/50 text-8xl pointer-events-none">📅</div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-extrabold text-rose-900 uppercase tracking-widest">ዛሬ የተገኙ</h3>
            <span className="w-10 h-10 flex items-center justify-center bg-rose-200 text-rose-700 rounded-xl shadow-sm text-lg">📅</span>
          </div>
          <p className="text-5xl font-black text-rose-800 tracking-tight">{(isMember || isSubExec) ? (memberStats?.personalAttendance || 0) : stats.todayAttendance}</p>
          <p className="text-xs text-rose-700 mt-3 font-semibold bg-rose-200/50 px-3 py-1.5 rounded-full inline-block backdrop-blur-md">{(isMember || isSubExec) ? `Attendance Rate: ${memberStats?.attendanceRate || '0%'}` : 'ATTENDANCE'}</p>
        </div>
      </div>

      {/* Finance Oversight for Audit/Admin (Refactored with Tailwind) */}
      {['super_admin', 'admin', 'audit', 'hisab'].includes(user?.role) && financeSummary && (
        <div className="mt-8 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 rounded-l-3xl"></div>
          <div className="flex flex-wrap items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl text-lg shadow-sm">💰</span> 
              የሂሳብ ክትትል <span className="text-slate-400 font-semibold text-lg hidden sm:inline">(Financial Oversight)</span>
            </h3>
            <span className="px-4 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full border border-emerald-200 flex items-center gap-1.5 shadow-sm">
              Automatic Audit Sync <span className="text-[12px]">✅</span>
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-8 select-none bg-slate-50/30">
            
            {/* Income */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-xl shadow-sm">↑</div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Income</span>
              </div>
              <span className="text-3xl font-black text-emerald-600 pl-1 block group-hover:scale-105 transition-transform origin-left">
                +{financeSummary.monthly.income.toLocaleString()} <span className="text-sm text-emerald-400 font-bold ml-1">ETB</span>
              </span>
            </div>

            {/* Expense */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-rose-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-xl shadow-sm">↓</div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Monthly Expense</span>
              </div>
              <span className="text-3xl font-black text-rose-600 pl-1 block group-hover:scale-105 transition-transform origin-left">
                -{financeSummary.monthly.expense.toLocaleString()} <span className="text-sm text-rose-400 font-bold ml-1">ETB</span>
              </span>
            </div>

            {/* Net Balance */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl shadow-sm">⚖️</div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Net Balance (Annual)</span>
              </div>
              <span className="text-3xl font-black text-indigo-700 pl-1 block group-hover:scale-105 transition-transform origin-left">
                {(financeSummary.annual.income - financeSummary.annual.expense).toLocaleString()} <span className="text-sm text-indigo-400 font-bold ml-1">ETB</span>
              </span>
            </div>

            {/* Action */}
            <div className="flex items-center justify-center h-full pt-4 lg:pt-0">
              <button 
                onClick={() => {
                  if (user?.role === 'audit') setView('audit');
                  else if (['super_admin', 'admin', 'hisab'].includes(user?.role)) setView('finance-central');
                  else setView('finance');
                }} 
                className="w-full h-full min-h-[140px] bg-slate-50 text-indigo-600 font-black text-lg rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-all flex flex-col items-center justify-center gap-3 group shadow-sm hover:shadow"
              >
                ዝርዝር ማጠቃለያ 
                <span className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider block">View Details</span>
                <span className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform shadow-sm">→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Messaging Form Hidden for Members (Now in Modal) */}

      {/* 4. Messaging Section */}
      {isMember && (
        <div style={{ marginTop: '20px', marginBottom: '50px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.4rem', color: '#1e293b' }}>💬 የእኔ መልዕክቶች (My Messages)</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            
            {/* INBOX: FROM OFFICE */}
            <div className="card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid #eef2ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#4f46e5', fontWeight: '900' }}>📥 ከጽህፈት ቤት (From Office)</h4>
                 <span style={{ fontSize: '1.2rem' }}>🏢</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages
                  .filter(m => (m.sender?.toString() !== (user?._id || user?.id)?.toString()) && ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(m.senderRole))
                  .slice(0, 3)
                  .map(m => (
                    <div key={m._id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(m.createdAt).toLocaleDateString()} • {m.isRead ? '✓ Seen' : '✓ Delivered'}</div>
                    </div>
                  ))}
                {messages.filter(m => (m.sender?.toString() !== (user?._id || user?.id)?.toString()) && ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(m.senderRole)).length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', margin: '20px 0' }}>ምንም መልዕክት የለም (No messages)</p>
                )}
              </div>
            </div>

            {/* INBOX: FROM DEPT */}
            <div className="card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid #f0fdf4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#10b981', fontWeight: '900' }}>📥 ከክፍሌ (From Dept)</h4>
                 <span style={{ fontSize: '1.2rem' }}>💼</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages
                  .filter(m => (m.sender?.toString() !== (user?._id || user?.id)?.toString()) && !['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(m.senderRole))
                  .slice(0, 3)
                  .map(m => (
                    <div key={m._id} style={{ padding: '12px', background: '#fcfdfd', borderRadius: '12px', border: '1px solid #f0fdf4' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(m.createdAt).toLocaleDateString()} • {m.isRead ? '✓ Seen' : '✓ Delivered'}</div>
                    </div>
                  ))}
                {messages.filter(m => (m.sender?.toString() !== (user?._id || user?.id)?.toString()) && !['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(m.senderRole)).length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', margin: '20px 0' }}>ምንም መልዕክት የለም (No messages)</p>
                )}
              </div>
            </div>

            {/* SENT: TO OFFICE */}
            <div className="card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid #f5f3ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#8b5cf6', fontWeight: '900' }}>📤 ለጽህፈት ቤት (To Office)</h4>
                 <span style={{ fontSize: '1.2rem' }}>🏛️</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages
                  .filter(m => (m.sender?.toString() === (user?._id || user?.id)?.toString()) && m.recipientType === 'leadership')
                  .slice(0, 3)
                  .map(m => (
                    <div key={m._id} style={{ padding: '12px', background: '#fbfaff', borderRadius: '12px', border: '1px solid #f5f3ff' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        <span style={{ fontWeight: '700', color: m.isRead ? '#4f46e5' : '#64748b' }}>{m.isRead ? '✓ ✓ Seen' : '✓ Delivered'}</span>
                      </div>
                    </div>
                  ))}
                {messages.filter(m => (m.sender?.toString() === (user?._id || user?.id)?.toString()) && m.recipientType === 'leadership').length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', margin: '20px 0' }}>ምንም መልዕክት የለም (No messages)</p>
                )}
              </div>
            </div>

            {/* SENT: TO DEPT */}
            <div className="card" style={{ padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: '900' }}>📤 ለክፍሉ (To Dept)</h4>
                 <span style={{ fontSize: '1.2rem' }}>👔</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages
                  .filter(m => (m.sender?.toString() === (user?._id || user?.id)?.toString()) && m.recipientType === 'department')
                  .slice(0, 3)
                  .map(m => (
                    <div key={m._id} style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.85rem', color: '#1e293b', marginBottom: '4px' }}>{m.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                        <span style={{ fontWeight: '700', color: m.isRead ? '#4f46e5' : '#64748b' }}>{m.isRead ? '✓ ✓ Seen' : '✓ Delivered'}</span>
                      </div>
                    </div>
                  ))}
                {messages.filter(m => (m.sender?.toString() === (user?._id || user?.id)?.toString()) && m.recipientType === 'department').length === 0 && (
                  <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', margin: '20px 0' }}>ምንም መልዕክት የለም (No messages)</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Announcements Feed Section - Visible only for Members on Dashboard to avoid duplication for Executives */}
      {announcements.length > 0 && user?.role === 'member' && (
        <div className="mt-4">
          <AnnouncementsFeed 
            announcements={announcements} 
            loading={loadingAnnouncements} 
            onDelete={handleDeleteAnnouncement}
            onToggleStatus={handleToggleAnnouncementStatus}
            currentUserRole={user?.role}
            activeFilter="member"
            currentUserId={user?.id || user?._id}
          />
        </div>
      )}

      {/* 5. Messaging Modal for Members */}
      {isMessagingModalOpen && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div className="card" style={{ 
            width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
            borderRadius: '35px', border: 'none', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            position: 'relative', animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            background: '#fff'
          }}>
            <button 
              onClick={() => setIsMessagingModalOpen(false)}
              style={{ 
                position: 'absolute', top: '25px', right: '35px', 
                background: '#f1f5f9', border: 'none', borderRadius: '50%', 
                width: '45px', height: '45px', cursor: 'pointer', zIndex: 10, 
                fontWeight: '900', color: '#64748b', fontSize: '1.2rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              ✕
            </button>
            <div style={{ padding: '10px' }}>
              <MemberMessaging user={user} onClose={() => { setIsMessagingModalOpen(false); fetchMessages(); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { exportToCSV, exportToExcel, printBookForm } from '../utils/ReportExporter';
import { greToEth, formatEthDate } from '../utils/ethiopianDate';
import FinanceReport from './FinanceReport';

const MerjaDashboard = ({ user, token }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [members, setMembers] = useState([]);
  const [allMembers, setAllMembers] = useState([]); // For reports
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    term: '',
    serviceDepartment: 'all',
    batch: 'all',
    gender: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const isFinanceRole = ['hisab', 'audit', 'super_admin'].includes(user?.role);
  const [activeTab, setActiveTab] = useState(isFinanceRole ? 'finance' : 'members');
  const [staffData, setStaffData] = useState({ admins: [], executives: [], subExecutives: [] });
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'memberDetail', 'staffDetail'
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [viewingMember, setViewingMember] = useState(null);

  const departments = [
    "ትምህርት ክፍል", "አባላት ጉዳይ", "መዝሙር ክፍል", "ባች ክፍል", "ሙያ ክፍል", 
    "ልማት ክፍል", "ቋንቋ ክፍል", "መረጃ ክፍል", "ሂሳብ ክፍል", "ኦዲት"
  ];
  const batches = ["Remedial", "Fresh", "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "GC"];

  useEffect(() => {
    if (activeTab === 'members') {
      fetchDashboard();
      fetchMembers();
    } else if (activeTab === 'staff') {
      fetchStaff();
      setLoading(false); // Clear initial global loading
    } else if (activeTab === 'finance') {
      setLoading(false); // Finance tab handles its own loading
    }
  }, [filters, currentPage, activeTab]);

  const fetchDashboard = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') params.append(key, filters[key]);
      });

      const response = await axios.get(`/merja/dashboard?${params}`);
      setDashboardData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') params.append(key, filters[key]);
      });
      params.append('page', currentPage);
      params.append('limit', 50);

      const response = await axios.get(`/merja/members?${params}`);
      setMembers(response.data.data.members);
      setTotalPages(response.data.data.totalPages);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };
  
  const fetchStaff = async () => {
    setLoadingStaff(true);
    try {
      const response = await axios.get('/reports/merja/staff');
      setStaffData(response.data.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchAllForReport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all') params.append(key, filters[key]);
      });
      params.append('limit', 10000); 

      const response = await axios.get(`/merja/members?${params}`);
      setAllMembers(response.data.data.members);
      return response.data.data.members;
    } catch (error) {
      console.error('Error fetching for export:', error);
      toast.error('ሪፖርት ማዘጋጀት አልተሳካም');
      return [];
    } finally {
      setExporting(false);
    }
  };

  const fetchMemberDetail = async (id) => {
    setLoadingDetail(true);
    setViewMode('memberDetail');
    try {
      const response = await axios.get(`/members/${id}`);
      setViewingMember(response.data);
    } catch (error) {
      console.error('Error fetching member detail:', error);
      toast.error('ዝርዝር መረጃውን መጫን አልተቻለም');
      setViewMode('dashboard');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStaffExport = (type, data, filename) => {
    if (!data || data.length === 0) {
      toast.error('ምንም መረጃ የለም (No data to export)');
      return;
    }
    
    const exportData = data.map(u => ({
      'Name': u.name,
      'Email/Username': u.email,
      'Role': u.role,
      'Department': u.departmentAmharic || u.department || '—',
      'Term': u.term || '—',
      'Phone': u.phone || '—',
      'Region': u.region || '—',
      'Zone': u.zone || '—',
      'Woreda': u.woreda || '—',
      'Kebele': u.kebele || '—',
      'Leader': u.leaderName || '—'
    }));

    if (type === 'csv') exportToCSV(exportData, `${filename}_${formatEthDate(new Date())}.csv`);
    else if (type === 'excel') exportToExcel(exportData, `${filename}_${formatEthDate(new Date())}.xls`);
  };

  const handleExport = async (type) => {
    const data = await fetchAllForReport();
    if (!data || data.length === 0) return;

    if (type === 'csv') exportToCSV(data, `GBI_Members_${formatEthDate(new Date())}.csv`);
    else if (type === 'excel') exportToExcel(data, `GBI_Members_${new Date().toLocaleDateString()}.xls`);
    else if (type === 'book') {
      setTimeout(() => printBookForm(), 500);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  if (loading) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center' }}>በመጫን ላይ...</div>;
  }

  if (viewMode === 'memberDetail' && (viewingMember || loadingDetail)) {
      return (
          <div className="dashboard-content animate-fade-in" style={{ padding: '20px' }}>
              <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                  <button 
                      onClick={() => { setViewingMember(null); setViewMode('dashboard'); }} 
                      className="btn-export print"
                      style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: '800' }}
                  >
                      ← Back to Analytics
                  </button>
                  <div>
                      <h2 style={{ margin: 0, color: '#b45309' }}>የአባል ዝርዝር መረጃ (Member Detail)</h2>
                  </div>
              </div>

              {loadingDetail ? (
                  <div className="card" style={{ padding: '50px', textAlign: 'center' }}>መረጃ በመጫን ላይ...</div>
              ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                      <div className="card" style={{ padding: '30px', display: 'flex', gap: '30px', alignItems: 'center' }}>
                          <div style={{ width: '150px', height: '150px', borderRadius: '20px', overflow: 'hidden', border: '4px solid #fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                              {viewingMember.photo ? (
                                  <img src={viewingMember.photo} alt="P" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                  <div style={{ width: '100%', height: '100%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px' }}>👤</div>
                              )}
                          </div>
                          <div>
                              <h1 style={{ margin: 0, fontSize: '2.5rem', color: '#1e293b' }}>{viewingMember.firstName} {viewingMember.fatherName} {viewingMember.grandFatherName}</h1>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                  <span className="id-badge-small" style={{ fontSize: '1rem', padding: '5px 15px' }}>🆔 {viewingMember.fellowshipId || 'No GBI ID'}</span>
                                  <span className="dept-tag" style={{ fontSize: '1rem', padding: '5px 15px' }}>👥 {viewingMember.serviceDepartment}</span>
                              </div>
                          </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px' }}>
                          <div className="card shadow-sm" style={{ padding: '30px' }}>
                              <h4 style={{ color: '#b45309', borderBottom: '2px solid #fff7ed', paddingBottom: '10px', marginBottom: '20px' }}>👤 የግልና መንፈሳዊ (Personal & Spiritual)</h4>
                              <div className="info-row"><strong>Gender:</strong> <span>{viewingMember.gender}</span></div>
                              <div className="info-row"><strong>Christian Name:</strong> <span>{viewingMember.christianName || 'N/A'}</span></div>
                              <div className="info-row" style={{ background: '#fffbeb', padding: '15px', borderRadius: '12px', marginTop: '10px' }}>
                                  <strong style={{ color: '#b45309' }}>የንስሐ አባት:</strong> <span style={{ fontSize: '1.1rem', color: '#92400e' }}>{viewingMember.spiritualFather || 'N/A'}</span>
                              </div>
                              <div className="info-row"><strong>Phone:</strong> <span>{viewingMember.phone}</span></div>
                              <div className="info-row"><strong>Ordination:</strong> <span>{viewingMember.ordination || 'None'}</span></div>
                          </div>

                          <div className="card shadow-sm" style={{ padding: '30px' }}>
                              <h4 style={{ color: '#b45309', borderBottom: '2px solid #fff7ed', paddingBottom: '10px', marginBottom: '20px' }}>🎓 ትምህርትና አድራሻ (Academic & Origin)</h4>
                              <div className="info-row"><strong>Student ID:</strong> <span>{viewingMember.studentId}</span></div>
                              <div className="info-row"><strong>Batch:</strong> <span>{viewingMember.batch}</span></div>
                              <div className="info-row"><strong>University Dept:</strong> <span>{viewingMember.department}</span></div>
                              <div className="info-row"><strong>Region:</strong> <span>{viewingMember.region}</span></div>
                              <div className="info-row"><strong>Kebele:</strong> <span>{viewingMember.kebele}</span></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  if (viewMode === 'staffDetail' && selectedStaff) {
      return (
          <div className="dashboard-content animate-fade-in" style={{ padding: '20px' }}>
              <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' }}>
                  <button 
                      onClick={() => { setSelectedStaff(null); setViewMode('dashboard'); }} 
                      className="btn-export print"
                      style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: '800' }}
                  >
                      ← Back to Analytics
                  </button>
                  <div>
                      <h2 style={{ margin: 0, color: '#1e3a8a' }}>የአመራር ዝርዝር መረጃ (Staff Detail)</h2>
                  </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                  <div className="card" style={{ padding: '40px', background: 'linear-gradient(to right, #fff, #f8fafc)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                         <div>
                            <label style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '1px' }}>FULL NAME</label>
                            <h1 style={{ margin: '5px 0 20px', fontSize: '2.5rem', color: '#1e293b' }}>{selectedStaff.name}</h1>
                            
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '8px 20px', borderRadius: '12px', fontWeight: 'bold' }}>🛡️ {selectedStaff.role}</span>
                                <span style={{ background: '#eff6ff', color: '#1e40af', padding: '8px 20px', borderRadius: '12px', fontWeight: 'bold' }}>🏛️ {selectedStaff.departmentAmharic || selectedStaff.department || '—'}</span>
                            </div>
                         </div>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div><label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>USERNAME</label><p style={{ margin: '5px 0', fontWeight: '500' }}>{selectedStaff.email}</p></div>
                            <div><label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>PHONE</label><p style={{ margin: '5px 0', fontWeight: '500' }}>{selectedStaff.phone || '—'}</p></div>
                            <div><label style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 'bold' }}>TERM</label><p style={{ margin: '5px 0', fontWeight: '500' }}>{selectedStaff.term || '—'}</p></div>
                         </div>
                      </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '25px' }}>
                      <div className="card shadow-sm" style={{ padding: '30px' }}>
                          <h4 style={{ color: '#1e3a8a', borderBottom: '2px solid #eff6ff', paddingBottom: '10px', marginBottom: '20px' }}>🏠 የግል አድራሻ (Residential Information)</h4>
                          <div className="info-row"><strong>Region:</strong> <span>{selectedStaff.region || '—'}</span></div>
                          <div className="info-row"><strong>Zone:</strong> <span>{selectedStaff.zone || '—'}</span></div>
                          <div className="info-row"><strong>Woreda:</strong> <span>{selectedStaff.woreda || '—'}</span></div>
                          <div className="info-row"><strong>Kebele:</strong> <span>{selectedStaff.kebele || '—'}</span></div>
                      </div>

                      {selectedStaff.subRoleDescription && (
                          <div className="card shadow-sm" style={{ padding: '30px', borderLeft: '8px solid #3b82f6' }}>
                              <h4 style={{ color: '#1e3a8a', marginBottom: '15px' }}>📋 የተሰጠ ኃላፊነት (Assigned Responsibility)</h4>
                              <p style={{ fontSize: '1.1rem', lineHeight: '1.6', color: '#334155' }}>{selectedStaff.subRoleDescription}</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

    if (isFinanceRole) {
      return (
        <div className="dashboard-content animate-fade-in" style={{ padding: '20px' }}>
          <FinanceReport user={user} token={token} />
        </div>
      );
    }

    return (
      <div className="dashboard-content animate-fade-in" style={{ padding: '20px' }}>
        <div className="section-header" style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.8rem', fontWeight: '900' }}>
               📊 የመረጃ ክፍል ማዕከል (Information & Reports)
            </h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500', fontSize: '1rem' }}>የአባላትን እና የአመራሮችን መረጃ እዚህ ያግኙ (Member & Staff analytics and reports)</p>
          </div>
          
          {/* Modern Pill Tabs */}
          <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '6px', borderRadius: '16px', width: 'fit-content' }}>
            <button 
              className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`} 
              onClick={() => setActiveTab('members')} 
              style={{ 
                padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
                transition: 'all 0.3s ease', background: activeTab === 'members' ? '#fff' : 'transparent', 
                color: activeTab === 'members' ? '#0f172a' : '#64748b', 
                boxShadow: activeTab === 'members' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' 
              }}>
              👨‍👩‍👧‍👦 አባላት (Members)
            </button>
            <button 
              className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`} 
              onClick={() => setActiveTab('staff')} 
              style={{ 
                padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
                transition: 'all 0.3s ease', background: activeTab === 'staff' ? '#fff' : 'transparent', 
                color: activeTab === 'staff' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'staff' ? '0 4px 6px -1px rgba(0,0,0,0.05)' : 'none' 
              }}>
              👔 አመራሮች (Staff)
            </button>
          </div>
        </div>

      {activeTab === 'members' ? (
        <>
          <div className="card shadow-sm" style={{ marginBottom: '30px', border: '1px solid #e2e8f0', borderRadius: '24px', overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '20px 30px', borderBottom: '1px outset #f8fafc' }}>
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>🔍 ማጣሪያ (Search Filters)</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => handleExport('csv')} disabled={exporting} className="btn-export csv" style={{ padding: '8px 16px', borderRadius: '10px' }}>📥 CSV</button>
              <button onClick={() => handleExport('excel')} disabled={exporting} className="btn-export excel" style={{ padding: '8px 16px', borderRadius: '10px' }}>📗 Excel</button>
              <button onClick={() => handleExport('book')} disabled={exporting} className="btn-export print" style={{ padding: '8px 16px', borderRadius: '10px' }}>🖨️ Book Form</button>
            </div>
          </div>
          <div style={{ padding: '20px 30px', background: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', overflowX: 'auto' }}>
            <div>
               <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>ከ ቀን (Start)</label>
               <input className="form-control" type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} style={{ borderRadius: '10px', padding: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
               <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>እስከ ቀን (End)</label>
               <input className="form-control" type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} style={{ borderRadius: '10px', padding: '10px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
               <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>ዘመን (Term)</label>
                <input className="form-control" type="text" value={filters.term} onChange={(e) => handleFilterChange('term', e.target.value)} placeholder={`e.g. ${formatEthDate(new Date()).year} E.C`} style={{ borderRadius: '10px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold' }} title="በኢትዮጵያ ዘመን አቆጣጠር (e.g., 2018)" />
            </div>
            <div>
               <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>ክፍል (Dept)</label>
               <select className="form-control" value={filters.serviceDepartment} onChange={(e) => handleFilterChange('serviceDepartment', e.target.value)} style={{ borderRadius: '10px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                 <option value="all">ሁሉም (All)</option>
                 {departments.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>
            <div>
               <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>ባች (Batch)</label>
               <select className="form-control" value={filters.batch} onChange={(e) => handleFilterChange('batch', e.target.value)} style={{ borderRadius: '10px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                 <option value="all">ሁሉም (All)</option>
                 {batches.map(b => <option key={b} value={b}>{b}</option>)}
               </select>
            </div>
            <div>
               <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' }}>ጾታ (Gender)</label>
               <select className="form-control" value={filters.gender} onChange={(e) => handleFilterChange('gender', e.target.value)} style={{ borderRadius: '10px', padding: '10px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                 <option value="all">ሁለቱም</option>
                 <option value="male">ወንድ (M)</option>
                 <option value="female">ሴት (F)</option>
               </select>
            </div>
          </div>
        </div>

      {dashboardData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>👥</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#92400e', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>ጠቅላላ አባላት (Total)</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#b45309' }}>{dashboardData.totalMembers}</p>
            </div>
            
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '0px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>🛡️</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#065f46', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>አክቲቭ (Active)</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#059669' }}>{dashboardData.activeMembers}</p>
            </div>
            
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '0px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>👨</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1e40af', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>ወንድ (Male)</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#2563eb' }}>{dashboardData.maleMembers}</p>
            </div>
            
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #fce7f3, #fbcfe8)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '0px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>👩</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#9d174d', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>ሴት (Female)</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#db2777' }}>{dashboardData.femaleMembers}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '20px' }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">📊 በባች (By Batch)</h3></div>
              <div className="table-wrap">
                <table className="data-table small">
                  <thead><tr><th>ባች</th><th>ጠቅላላ</th><th>ወንድ</th><th>ሴት</th></tr></thead>
                  <tbody>
                    {dashboardData.byBatch.map(b => (
                      <tr key={b._id}><td><strong>{b._id}</strong></td><td>{b.total}</td><td>{b.male}</td><td>{b.female}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">📊 በክፍል (By Department)</h3></div>
              <div className="table-wrap">
                <table className="data-table small">
                  <thead><tr><th>ክፍል</th><th>ጠቅላላ</th><th>ወንድ</th><th>ሴት</th></tr></thead>
                  <tbody>
                    {dashboardData.byServiceDept.map(d => (
                      <tr key={d._id}><td><strong>{d._id}</strong></td><td>{d.total}</td><td>{d.male}</td><td>{d.female}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card">
          <div className="card-header merja-card-header">
            <h3 className="card-title">📋 የአባላት ዝርዝር (Filtered Members List)</h3>
            <span className="badge badge-primary">{dashboardData?.totalMembers || 0} ተገኝተዋል</span>
          </div>
         <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ስም (Full Name)</th>
                <th>ፆታ</th>
                <th>ክፍል</th>
                <th>ባች</th>
                <th>ስልክ</th>
                <th>ID</th>
                <th style={{ textAlign: 'center' }}>ድርጊት (Action)</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>ምንም አባል አልተገኘም (No members found)</td></tr>
              ) : (
                members.map(member => (
                  <tr key={member._id}>
                    <td style={{ fontWeight: '700' }}>{member.firstName} {member.fatherName}</td>
                    <td>{member.gender}</td>
                    <td><span className="dept-tag">{member.serviceDepartment}</span></td>
                    <td><span className="role-chip">{member.batch}</span></td>
                    <td><code style={{ fontSize: '0.8rem' }}>{member.phone}</code></td>
                    <td><span className="id-badge-small">{member.studentId}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => fetchMemberDetail(member._id)} 
                        className="btn-export print" 
                        style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '20px' }}
                      >
                        🔍 View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '20px' }}>
        <button className="btn-page" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>⬅️</button>
        <span style={{ fontWeight: 'bold', color: '#6b7280' }}>ገጽ {currentPage} ከ {totalPages}</span>
        <button className="btn-page" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>➡️</button>
      </div>
      </>
      ) : activeTab === 'finance' ? (
        <FinanceReport user={user} token={token} />
      ) : (
        <div style={{ animation: 'slideIn 0.3s ease' }}>
          {/* Summary Cards for Staff */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>👔</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#3730a3', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>አጠቃላይ አመራር (Total Staff)</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#1e3a8a' }}>{staffData.summary?.totalStaff || 0}</p>
            </div>
            
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '0px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>👑</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#065f46', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Admins</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#059669' }}>{staffData.summary?.adminCount || 0}</p>
            </div>
            
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #ffedd5, #fdba74)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '0px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>🏛️</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#9a3412', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Dept Executives</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#c2410c' }}>{staffData.summary?.executiveCount || 0}</p>
            </div>
            
            <div className="card shadow-sm" style={{ padding: '25px', borderRadius: '24px', background: 'linear-gradient(135deg, #fae8ff, #f0abfc)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: '0px', bottom: '-20px', fontSize: '6rem', opacity: '0.2' }}>⚙️</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#86198f', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Sub Executives</h3>
              <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900', color: '#a21caf' }}>{staffData.summary?.subExecCount || 0}</p>
            </div>
          </div>

          {/* Detailed Lists by Category */}
          {Object.entries({
            'Admins (Main System Admin)': staffData.admins,
            'Department Executives (Lead staff)': staffData.executives,
            'Sub-Executives (Department Support)': staffData.subExecutives
          }).map(([title, list]) => (
            <div className="card" key={title} style={{ marginBottom: '20px' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="card-title">{title}</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                   <button className="btn-export csv" onClick={() => handleStaffExport('csv', list, title.split(' ')[0])}>📥 CSV</button>
                   <button className="btn-export excel" onClick={() => handleStaffExport('excel', list, title.split(' ')[0])}>📗 Excel</button>
                </div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ስም (Full Name)</th>
                      <th>ክፍል (Dept)</th>
                      <th>መለያ (Login)</th>
                      <th>ስልክ (Phone)</th>
                      <th>ክልል/ዞን (Region-Zone)</th>
                      <th>እርምጃ (Action)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>ምንም መረጃ አልተገኘም</td></tr>
                    ) : (
                      list.map(u => (
                        <tr key={u._id}>
                          <td style={{ fontWeight: '700' }}>{u.name}</td>
                          <td><span className="dept-tag">{u.departmentAmharic || u.department || '—'}</span></td>
                          <td style={{ fontSize: '0.85rem' }}>{u.email}</td>
                          <td>{u.phone || '—'}</td>
                          <td style={{ fontSize: '0.8rem' }}>{u.region || '—'}{u.zone ? `, ${u.zone}` : ''}</td>
                          <td>
                            <button className="btn-export print" onClick={() => { setSelectedStaff(u); setViewMode('staffDetail'); }} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>ℹ️ Details</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Printable Book Form */}
      <div id="printable-book-form" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>ወሎ ዩኒቨርሲቲ ኮምፓስ ግቢ ጉባኤ</h1>
            <h2 style={{ margin: '2px 0', fontSize: '1rem', fontWeight: '700' }}>Wollo University Campus Fellowship (GBI)</h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
            <div>ቀን/Date: {formatEthDate(new Date())}</div>
            <div>ዘመን/Term: {filters.term || 'All'}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h3 style={{ textDecoration: 'underline', margin: '10px 0' }}>የአባላት መዝገብ (Members Register Book)</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px', border: '1px solid #000', padding: '10px' }}>
          <div style={{ fontSize: '0.85rem' }}><strong>ጠቅላላ/Total:</strong> {allMembers.length}</div>
          <div style={{ fontSize: '0.85rem' }}><strong>ወንድ/M:</strong> {allMembers.filter(m => m.gender === 'male').length}</div>
          <div style={{ fontSize: '0.85rem' }}><strong>ሴት/F:</strong> {allMembers.filter(m => m.gender === 'female').length}</div>
          <div style={{ fontSize: '0.85rem' }}><strong>ክፍል/Dept:</strong> {filters.serviceDepartment || 'All'}</div>
        </div>

        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ሙሉ ስም<br/>Full Name</th>
              <th>ጾታ<br/>Sex</th>
              <th>Student ID</th>
              <th>Department</th>
              <th>የንስሐ አባት<br/>Spiritual Father</th>
              <th>ባች<br/>Batch</th>
              <th>መለያ<br/>GBI ID</th>
              <th style={{ width: '80px' }}>ፊርማ<br/>Sign</th>
            </tr>
          </thead>
          <tbody>
            {allMembers.map((m, index) => (
              <tr key={m._id} style={{ breakInside: 'avoid' }}>
                <td>{index + 1}</td>
                <td style={{ fontWeight: '700' }}>{m.firstName} {m.fatherName}</td>
                <td>{m.gender === 'male' ? 'ወንድ' : 'ሴት'}</td>
                <td>{m.studentId}</td>
                <td>{m.serviceDepartment}</td>
                <td>{m.spiritualFather || '—'}</td>
                <td>{m.batch}</td>
                <td>{m.fellowshipId || '—'}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .tab-btn:hover { background: rgba(255,255,255,0.5); }
        .tab-btn.active:hover { background: white; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .btn-export { padding: 6px 12px; border-radius: 8px; border: none; cursor: pointer; font-size: 0.8rem; font-weight: 700; transition: all 0.2s; }
        .btn-export.csv { background: #f3f4f6; color: #475569; border: 1px solid #e2e8f0; }
        .btn-export.excel { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .btn-export.print { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
        .btn-export:hover:not(:disabled) { filter: brightness(0.95); transform: translateY(-1px); }
        .id-badge-small { background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-family: monospace; }
        .dept-tag { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
        .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #f1f5f9; font-size: 0.95rem; }
        .info-row:last-child { border-bottom: none; }
        .info-row strong { color: #64748b; font-weight: 500; }
        .info-row span { color: #1e293b; font-weight: 600; }
        @media print {
          body * { visibility: hidden; }
          #printable-book-form, #printable-book-form * { visibility: visible; }
          #printable-book-form { position: absolute; left: 0; top: 0; display: block !important; width: 100%; color: #000; }
          .print-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .print-table th, .print-table td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 9pt; }
        }
      `}</style>
    </div>
  );
};

export default MerjaDashboard;

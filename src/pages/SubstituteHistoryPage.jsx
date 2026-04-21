import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth } from '../utils/ethiopianDate';

const SubstituteHistoryPage = ({ token, type = 'teacher', onBack }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [availableTerms, setAvailableTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');

  const endpoint = type === 'teacher' ? '/substitute-teachers/sessions' 
                 : type === 'mezemran' ? '/mezemran/sessions'
                 : '/substitute-leaders/sessions';

  useEffect(() => {
    fetchInitialData();
  }, [type]);

  const fetchInitialData = async () => {
    try {
      const [settingsRes, termsRes] = await Promise.all([
        axios.get('/settings'),
        axios.get('/settings/terms')
      ]);
      const currentTerm = settingsRes.data.currentTerm;
      setSelectedTerm(currentTerm);
      if (termsRes.data.success) setAvailableTerms(termsRes.data.terms);
      
      fetchSessions(currentTerm);
    } catch (err) {
      toast.error('ቅንብሮችን ማምጣት አልተቻለም');
    }
  };

  const fetchSessions = async (term) => {
    try {
      setLoading(true);
      const category = type === 'teacher' ? 'ተተኪ 1 የወሰዱ' : type === 'mezemran' ? 'መዘምራን 1 የወሰዱ' : 'ተተኪ 1';
      const { data } = await axios.get(`${endpoint}?category=${category}&term=${term}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(data);
    } catch (err) {
      toast.error('የታሪክ መረጃ መጫን አልተቻለም');
    } finally {
      setLoading(false);
    }
  };

  const handleTermChange = (term) => {
    setSelectedTerm(term);
    fetchSessions(term);
  };

  if (loading && !selectedSession) return <div className="loading-container">⏳ በመጫን ላይ...</div>;

  return (
    <div className="sub-history-page" style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="premium-header" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '30px', borderRadius: '15px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>📜</span> {type === 'teacher' ? 'የትምህርት' : type === 'mezemran' ? 'የመዘምራን' : 'የአመራር'} ክትትል የታሪክ መዝገብ
          </h1>
          <p style={{ opacity: 0.8, margin: '8px 0 0' }}>Comprehensive historical records and attendance performance logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
           <select 
             value={selectedTerm} 
             onChange={e => handleTermChange(e.target.value)}
             style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
           >
             {availableTerms.map(t => <option key={t} value={t} style={{ color: '#333' }}>{t}</option>)}
           </select>
           <button onClick={onBack} className="btn-back-modern">← Back</button>
        </div>
      </div>

      <div className="history-container shadow-sm" style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', border: '1px solid #f1f5f9' }}>
         {!selectedSession ? (
           <div className="sessions-list">
             <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                   <th style={{ padding: '15px 25px' }}>የክፍለ ጊዜው መጠሪያ (Session Title)</th>
                   <th style={{ padding: '15px' }}>ቀን (Date)</th>
                   <th style={{ padding: '15px' }}>የተገኘው ውጤት (Attendance Rate)</th>
                   <th style={{ padding: '15px', textAlign: 'right' }}>ድርጊት (Actions)</th>
                 </tr>
               </thead>
               <tbody>
                 {sessions.length === 0 ? (
                   <tr><td colSpan="4" style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>ምንም የታሪክ መዝገብ አልተገኘም (Empty history)</td></tr>
                 ) : (
                   sessions.map(s => {
                     const eth = greToEth(s.date);
                     const presentCount = s.attendance.filter(r => r.present).length;
                     const rate = Math.round((presentCount / s.attendance.length) * 100);
                     return (
                       <tr key={s._id} className="history-row">
                         <td style={{ padding: '15px 25px', fontWeight: 'bold', color: '#1e293b' }}>{s.title}</td>
                         <td style={{ padding: '15px' }}>
                            <div style={{ fontWeight: '500' }}>{eth.monthAmharic} {eth.day}, {eth.year}</div>
                            <small style={{ color: '#94a3b8' }}>{new Date(s.date).toLocaleDateString()}</small>
                         </td>
                         <td style={{ padding: '15px' }}>
                            <div style={{ width: '80%', background: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                               <div style={{ width: `${rate}%`, background: rate > 75 ? '#10b981' : rate > 40 ? '#f59e0b' : '#ef4444', height: '100%' }}></div>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{presentCount} / {s.attendance.length} ({rate}%)</span>
                         </td>
                         <td style={{ padding: '15px', textAlign: 'right' }}>
                            <button className="view-link-btn" onClick={() => setSelectedSession(s)}>🔎 በዝርዝር እይ (Detail)</button>
                         </td>
                       </tr>
                     );
                   })
                 )}
               </tbody>
             </table>
           </div>
         ) : (
           <div className="session-detail-view" style={{ animation: 'slideUp 0.3s ease' }}>
             <div className="detail-header" style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <button onClick={() => setSelectedSession(null)} className="btn-back-link">← Back</button>
                <div style={{ textAlign: 'right' }}>
                   <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>{selectedSession.title}</h3>
                   <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(selectedSession.date).toLocaleString()}</span>
                </div>
             </div>
             
             <div className="detail-body" style={{ padding: '30px' }}>
                <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                   <div className="stat-pill blue">
                      <span className="stat-label">ጠቅላላ (Total)</span>
                      <span className="stat-value">{selectedSession.attendance.length}</span>
                   </div>
                   <div className="stat-pill green">
                      <span className="stat-label">ተገኝተዋል (Present)</span>
                      <span className="stat-value">{selectedSession.attendance.filter(r => r.present).length}</span>
                   </div>
                   <div className="stat-pill red">
                      <span className="stat-label">አልተገኙም (Absent)</span>
                      <span className="stat-value">{selectedSession.attendance.filter(r => !r.present).length}</span>
                   </div>
                </div>

                <div className="attendance-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                   {selectedSession.attendance.map((record, idx) => (
                     <div key={idx} className={`mini-card ${record.present ? 'is-present' : 'is-absent'}`}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{record.teacher?.name || record.leader?.name || record.mezemran?.name || 'Unknown'}</div>
                        <div className={`status-badge ${record.present ? 'p' : 'a'}`}>{record.present ? '✅ ተገኝቷል' : '❌ አልተገኘም'}</div>
                     </div>
                   ))}
                </div>
             </div>
           </div>
         )}
      </div>

      <style>{`
        .btn-back-modern { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
        .btn-back-modern:hover { background: rgba(255,255,255,0.2); }
        .history-row { transition: background 0.2s; cursor: default; }
        .history-row:hover { background: #fdfdfd; box-shadow: inset 3px 0 0 #3b82f6; }
        .view-link-btn { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 6px; color: #1e293b; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
        .view-link-btn:hover { background: #e2e8f0; color: #3b82f6; }
        .btn-back-link { background: none; border: none; color: #3b82f6; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .stat-pill { padding: 20px; border-radius: 12px; text-align: center; display: flex; flex-direction: column; }
        .stat-pill.blue { background: #eff6ff; color: #1e40af; }
        .stat-pill.green { background: #ecfdf5; color: #065f46; }
        .stat-pill.red { background: #fef2f2; color: #991b1b; }
        .stat-label { font-size: 0.8rem; text-transform: uppercase; font-weight: 800; opacity: 0.7; }
        .stat-value { font-size: 2rem; font-weight: 900; margin-top: 5px; }
        .mini-card { background: white; border: 1px solid #f1f5f9; padding: 12px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .mini-card.is-absent { border-left: 4px solid #ef4444; background: #fff1f2; }
        .mini-card.is-present { border-left: 4px solid #10b981; }
        .status-badge { font-size: 0.75rem; margin-top: 5px; font-weight: 800; }
        .status-badge.p { color: #10b981; }
        .status-badge.a { color: #ef4444; }
        .loading-container { padding: 100px; text-align: center; font-size: 1.2rem; color: #64748b; }
        @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default SubstituteHistoryPage;

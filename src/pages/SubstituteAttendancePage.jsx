import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth } from '../utils/ethiopianDate';

const SubstituteAttendancePage = ({ token, user, type = 'teacher', onBack }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState({});
  const [sessionTitle, setSessionTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  const endpoint = type === 'teacher' ? '/substitute-teachers' : type === 'mezemran' ? '/mezemran' : '/substitute-leaders';
  const sessionEndpoint = `${endpoint}/sessions`;

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const settingsRes = await axios.get('/settings');
      const currentTerm = settingsRes.data.currentTerm;
      setSelectedTerm(currentTerm);

      const membersRes = await axios.get(endpoint, {
        params: { term: currentTerm },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(membersRes.data);
      
      // Initialize everyone as present by default
      const initial = {};
      membersRes.data.forEach(m => { initial[m._id] = true; });
      setAttendanceData(initial);

      // Default title
      const ethToday = greToEth(new Date());
      setSessionTitle(`${ethToday.monthAmharic} ${ethToday.day}/${ethToday.month}/${ethToday.year} - ${type === 'teacher' ? 'የትምህርት' : type === 'mezemran' ? 'የመዘምራን' : 'የአመራር'} ክትትል`);
    } catch (err) {
      toast.error('መረጃ ማምጣት አልተቻለም');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!sessionTitle) return toast.error('የክፍለ ጊዜውን መጠሪያ ያስገቡ');
    
    const records = Object.keys(attendanceData).map(id => ({
      [type === 'teacher' ? 'teacher' : type === 'mezemran' ? 'mezemran' : 'leader']: id,
      present: attendanceData[id]
    }));

    try {
      await axios.post(sessionEndpoint, {
        title: sessionTitle,
        category: type === 'teacher' ? 'ተተኪ 1 የወሰዱ' : type === 'mezemran' ? 'መዘምራን 1 የወሰዱ' : 'ተተኪ 1',
        attendance: records,
        term: selectedTerm
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('የክትትል መዝገብ በተሳካ ሁኔታ ተቀምጧል! ✅');
      onBack();
    } catch (err) {
      toast.error('መመዝገብ አልተሳካም');
    }
  };

  const filtered = members.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div className="loading-container">⏳ በመጫን ላይ...</div>;

  return (
    <div className="sub-attendance-page" style={{ animation: 'fadeIn 0.4s ease' }}>
      <div className="premium-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', padding: '30px', borderRadius: '15px', marginBottom: '25px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>📋</span> {type === 'teacher' ? 'የትምህርት' : type === 'mezemran' ? 'የመዘምራን' : 'የአመራር'} ክትትል መመዝገቢያ
            </h1>
            <p style={{ opacity: 0.8, margin: '8px 0 0' }}>Record attendance with ease. All records are secured and audited.</p>
          </div>
          <button onClick={onBack} className="btn-back-modern">← Back</button>
        </div>
      </div>

      <div className="attendance-controls shadow-sm" style={{ background: 'white', padding: '25px', borderRadius: '15px', marginBottom: '25px', border: '1px solid #f1f5f9' }}>
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label style={{ fontWeight: 'bold', color: '#475569', marginBottom: '8px', display: 'block' }}>ርዕስ (Session Title)</label>
            <input 
              className="premium-input" 
              value={sessionTitle} 
              onChange={e => setSessionTitle(e.target.value)} 
              placeholder="e.g. የሳምንቱ ቅዳሜ ትምህርት"
            />
          </div>
          <div className="form-group">
             <label style={{ fontWeight: 'bold', color: '#475569', marginBottom: '8px', display: 'block' }}>ፈልግ (Search Members)</label>
             <input 
               className="premium-input" 
               value={searchTerm} 
               onChange={e => setSearchTerm(e.target.value)} 
               placeholder="🔎 ስም ይፈልጉ..."
             />
          </div>
        </div>
      </div>

      <div className="attendance-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {filtered.map(m => (
          <div key={m._id} className={`att-card ${attendanceData[m._id] ? 'present' : 'absent'}`} onClick={() => setAttendanceData(p => ({ ...p, [m._id]: !p[m._id] }))}>
             <div className="att-status-indicator" style={{ background: attendanceData[m._id] ? '#10b981' : '#ef4444' }}></div>
             <div className="att-info">
                <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>{m.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{m.studentId} • {m.department}</div>
             </div>
             <div className="att-action">
                <span style={{ fontSize: '1.5rem' }}>{attendanceData[m._id] ? '✅' : '❌'}</span>
             </div>
          </div>
        ))}
      </div>

      <div className="save-bar shadow-lg">
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              ጠቅላላ፡ {members.length} | ተገኝተዋል፡ <span style={{ color: '#10b981' }}>{Object.values(attendanceData).filter(v => v).length}</span> | አልተገኙም፡ <span style={{ color: '#ef4444' }}>{Object.values(attendanceData).filter(v => !v).length}</span>
            </div>
            <button onClick={handleSave} className="save-btn-premium">💾 ክትትል መዝግብ (Save All Records)</button>
         </div>
      </div>

      <style>{`
        .btn-back-modern { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px 16px; borderRadius: 8px; cursor: pointer; transition: 0.2s; }
        .btn-back-modern:hover { background: rgba(255,255,255,0.2); }
        .premium-input { width: 100%; padding: 12px 15px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 1rem; transition: 0.2s; outline: none; }
        .premium-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        .att-card { background: white; border: 1px solid #f1f5f9; border-radius: 12px; padding: 15px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .att-card:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.05); }
        .att-card.present { border-left: 5px solid #10b981; }
        .att-card.absent { border-left: 5px solid #ef4444; background: #fff1f2; }
        .att-status-indicator { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
        .save-bar { position: fixed; bottom: 30px; right: 30px; background: white; width: auto; min-width: 500px; padding: 15px 30px; border-radius: 20px; border: 1px solid #e2e8f0; z-index: 1000; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
        .save-btn-premium { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 12px 30px; border-radius: 30px; font-weight: bold; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
        .save-btn-premium:hover { transform: scale(1.02); box-shadow: 0 6px 15px rgba(16, 185, 129, 0.3); }
        .loading-container { padding: 100px; text-align: center; font-size: 1.2rem; color: #64748b; }
      `}</style>
    </div>
  );
};

export default SubstituteAttendancePage;

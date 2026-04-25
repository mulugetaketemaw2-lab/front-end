import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const YearTransitionManager = ({ theme }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [terms, setTerms] = useState([]);
  const [filters, setFilters] = useState({
    term: '',
    batch: '',
    department: ''
  });
  const [targetBatch, setTargetBatch] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');

  const batches = ['Remedial', 'Fresh', '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'GC'];

  useEffect(() => {
    fetchTerms();
    fetchCurrentTerm();
  }, []);

  const fetchTerms = async () => {
    try {
      const res = await axios.get('/settings/terms');
      if (res.data.success) {
        setTerms(res.data.terms);
      }
    } catch (err) {
      console.error('Error fetching terms:', err);
    }
  };

  const fetchCurrentTerm = async () => {
    try {
      const res = await axios.get('/settings/public');
      setCurrentTerm(res.data.currentTerm);
    } catch (err) {
      console.error('Error fetching current term:', err);
    }
  };

  const fetchMembers = async () => {
    if (!filters.term) {
      toast.error('Please select a source term');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get('/members', { 
        params: { ...filters, fullList: 'true' } 
      });
      // Filter out members who are already in the current term (safety check)
      const list = res.data.filter(m => m.term !== currentTerm);
      setMembers(list);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Error fetching members');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === members.length && members.length > 0) setSelectedIds([]);
    else setSelectedIds(members.map(m => m._id));
  };

  const handleTransition = async () => {
    if (selectedIds.length === 0) return toast.error('No members selected');
    if (!targetBatch) return toast.error('Please select a target batch');

    if (!window.confirm(`Are you sure you want to transition ${selectedIds.length} members to ${currentTerm} (${targetBatch})?`)) return;

    setLoading(true);
    try {
      const res = await axios.post('/members/transition-batch', {
        memberIds: selectedIds,
        targetBatch
      });
      toast.success(res.data.message);
      fetchMembers(); // Refresh list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transition failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transition-manager-container" style={{ padding: '20px' }}>
      <div className="section-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '5px' }}>የአካዳሚክ ዓመት ሽግግር (Academic Year Transition)</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
           ያለፈው ዓመት አባላትን ወደ አዲሱ የ <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{currentTerm}</span> የሥራ ዘመን ያሻግሩ።
        </p>
      </div>

      {/* Filters Card */}
      <div className="filter-card" style={{ 
        background: 'var(--surface)', 
        padding: '20px', 
        borderRadius: '12px', 
        boxShadow: 'var(--shadow)',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '15px',
        alignItems: 'flex-end'
      }}>
        <div className="filter-group">
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>የድሮ ዓመት (Source Term)</label>
          <select 
            className="form-control"
            value={filters.term}
            onChange={(e) => setFilters({...filters, term: e.target.value})}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            <option value="">ይምረጡ</option>
            {terms.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px', color: 'var(--text-secondary)' }}>ባች (Old Batch)</label>
          <select 
            className="form-control"
            value={filters.batch}
            onChange={(e) => setFilters({...filters, batch: e.target.value})}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            <option value="">ሁሉም ባች</option>
            {batches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <button 
          onClick={fetchMembers}
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}
        >
          {loading ? 'በመፈለግ ላይ...' : 'አባላትን ፈልግ'}
        </button>
      </div>

      {members.length > 0 && (
        <div className="transition-actions" style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          padding: '20px', 
          borderRadius: '12px', 
          border: '1px solid rgba(59, 130, 246, 0.2)',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}>
          <div>
            <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{selectedIds.length}</span> አባላት ተመርጠዋል።
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: 'bold', color: 'var(--text)', fontSize: '0.9rem' }}>ወደ የትኛው ባች ይሸጋገሩ?</label>
              <select 
                className="form-control"
                value={targetBatch}
                onChange={(e) => setTargetBatch(e.target.value)}
                style={{ padding: '8px', borderRadius: '8px', border: '1px solid #3b82f6', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="">ይምረጡ (Target Batch)</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            
            <button 
              onClick={handleTransition}
              disabled={loading || selectedIds.length === 0 || !targetBatch}
              className="btn btn-success"
              style={{ padding: '10px 25px', borderRadius: '8px', fontWeight: 'bold', background: '#10b981', color: '#fff' }}
            >
              {loading ? 'በማሻገር ላይ...' : 'አሁን አሻግር (Transition Now)'}
            </button>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="table-responsive" style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '15px' }}>
                <input type="checkbox" checked={selectedIds.length === members.length && members.length > 0} onChange={handleSelectAll} />
              </th>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-secondary)' }}>ስም</th>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-secondary)' }}>መታወቂያ (ID)</th>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-secondary)' }}>ትምህርት ክፍል</th>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-secondary)' }}>ባች (Old)</th>
              <th style={{ padding: '15px', textAlign: 'left', color: 'var(--text-secondary)' }}>ዓመት (Old)</th>
            </tr>
          </thead>
          <tbody>
            {members.length > 0 ? (
              members.map(member => (
                <tr key={member._id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 15px' }}>
                    <input type="checkbox" checked={selectedIds.includes(member._id)} onChange={() => handleSelect(member._id)} />
                  </td>
                  <td style={{ padding: '12px 15px', fontWeight: '600', color: 'var(--text)' }}>
                    {member.firstName} {member.fatherName}
                  </td>
                  <td style={{ padding: '12px 15px', color: 'var(--text)' }}>{member.studentId}</td>
                  <td style={{ padding: '12px 15px', color: 'var(--text)' }}>{member.department}</td>
                  <td style={{ padding: '12px 15px', color: 'var(--text)' }}>
                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}>
                      {member.batch}
                    </span>
                  </td>
                  <td style={{ padding: '12px 15px', color: 'var(--text)' }}>{member.term}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {filters.term ? 'ምንም አባል አልተገኘም።' : 'እባክዎ አባላትን ለማግኘት ፊልተር ያድርጉ።'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default YearTransitionManager;

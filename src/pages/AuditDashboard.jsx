import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth, formatEthDate } from '../utils/ethiopianDate';

const AuditDashboard = ({ user, token }) => {
  const allDepartments = [
    "ዋና ሰብሳቢ", "ምክትል ሰብሳቢ", "ዋና ጸሀፊ", "ትምህርት ክፍል", "አባላት ጉዳይ ክፍል", 
    "መዝሙር ክፍል", "ባች ክፍል", "ሙያ ክፍል", "ልማት ክፍል", "ቋንቋ ክፍል", 
    "መረጃ ክፍል", "ሂሳብ ክፍል", "ኦዲት እና ቁጥጥር"
  ];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState('');
  const [availableTerms, setAvailableTerms] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [filterDept, setFilterDept] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  // Fetch terms
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const [settingsRes, termsRes] = await Promise.all([
          axios.get('/settings', config),
          axios.get('/settings/terms', config)
        ]);
        
        if (settingsRes.data?.currentTerm) setTerm(settingsRes.data.currentTerm);
        if (termsRes.data?.success) setAvailableTerms(termsRes.data.terms);
      } catch (err) {
        console.error('Error fetching audit settings:', err);
      }
    };
    
    if (token) fetchSettings();

    const handleClickOutside = (e) => {
      if (!e.target.closest('.custom-dropdown')) {
        setShowDeptDropdown(false);
        setShowTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all dashboard data
  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const config = { params: { term, mode: 'central' }, headers: { Authorization: `Bearer ${token}` } };
      const dashboardRes = await axios.get('/reports/dashboard', config);
      const financeRes = await axios.get('/finance/summary', config);
      const transRes = await axios.get('/finance', config);

      setData({
        general: dashboardRes.data.data,
        finance: financeRes.data.data
      });
      setTransactions(transRes.data.data || []);
    } catch (err) {
      console.error('Audit Fetch Error:', err);
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (term && token) fetchAuditData();
  }, [term, token]);

  const handleVerify = async (id) => {
    try {
      await axios.put(`/finance/${id}/verify`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('ዝውውሩ ተረጋግጧል! (Verified)');
      fetchAuditData();
    } catch (err) {
      toast.error('ማረጋገጥ አልተሳካም');
    }
  };

  const handleFlag = async (tx) => {
    const comment = window.prompt('ግርምቱን/ምክንያቱን ይጥቀሱ (Discrepancy Comment):', tx.auditComment || '');
    if (comment === null) return;
    try {
      await axios.put(`/finance/${tx._id}/flag`, { comment }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('ግርምቱ ተመዝግቧል (Flagged)');
      fetchAuditData();
    } catch (err) {
      toast.error('ማስመዝገብ አልተሳካም');
    }
  };

  // Calculate local stats for current view
  const getLocalAuditStats = () => {
    const stats = {
      overall: { income: 0, expense: 0 },
      filtered: { income: 0, expense: 0 },
      verified: 0
    };

    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      
      // All items in the ledger
      stats.overall[tx.type] += amt;

      // Items matching the current department filter
      if (filterDept === 'all' || tx.department === filterDept) {
        stats.filtered[tx.type] += amt;
        if (tx.isVerifiedByAudit) {
          stats.verified += (tx.type === 'income' ? amt : -amt);
        }
      }
    });

    return stats;
  };

  const localAuditStats = getLocalAuditStats();

  if (loading || !data) {
    return <div className="loading" style={{ padding: '50px', textAlign: 'center' }}>⏳ በመጫን ላይ (Loading comprehensive audit data)...</div>;
  }

  const { overview, membersByDepartment, membersByBatch } = data.general;
  const { finance } = data;

  return (
    <div className="audit-dashboard modern-container" style={{ animation: 'fadeIn 0.5s ease', padding: '20px' }}>
      {/* Header */}
      <div className="role-banner" style={{ background: 'linear-gradient(135deg, #1e293b, #334155, #0f172a)', color: 'white', padding: '30px', justifyItems: 'space-between', borderRadius: '15px', marginBottom: '25px', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ margin: 0, fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🔍</span> ኦዲት እና ቁጥጥር (Executive Audit Dashboard)
          </h1>
          <p style={{ opacity: 0.9, marginTop: '10px', maxWidth: '600px' }}>
            Comprehensive overview of all departmental activities, finances, and member statistics for transparency and accountability.
          </p>
        </div>
        
        <div style={{ position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
          <select 
            value={term} 
            onChange={e => setTerm(e.target.value)}
            style={{ background: 'transparent', color: 'white', fontWeight: 'bold', border: 'none', outline: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            {availableTerms.map(t => (
              <option key={t} value={t} style={{ color: '#333' }}>{t}</option>
            ))}
            {!availableTerms.includes(term) && <option value={term} style={{ color: '#333' }}>{term}</option>}
          </select>
        </div>
        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '150px', opacity: 0.05, pointerEvents: 'none' }}>⚖️</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        {/* Financial Audit Full Width */}
        <div className="card" style={{ padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>💰 የሂሳብ ኦዲት እና ቁጥጥር (Financial Transparency)</span>
            {filterDept !== 'all' && (
              <span style={{ fontSize: '0.9rem', color: '#1e40af', background: '#eff6ff', padding: '4px 12px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
                📍 {filterDept}
              </span>
            )}
          </h2>

          {/* Audit Verification Progress */}
          <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.85rem' }}>
              <span style={{ fontWeight: '600' }}>የማረጋገጫ ሂደት (Verification Progress):</span>
              <span>{transactions.filter(t => t.isVerifiedByAudit).length} / {transactions.length} ዝውውሮች ተረጋግጠዋል</span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${(transactions.filter(t => t.isVerifiedByAudit).length / (transactions.length || 1)) * 100}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #10b981, #059669)',
                  transition: 'width 0.5s ease'
                }} 
              />
            </div>
          </div>
          

          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
            {(() => {
              const isFiltered = filterDept !== 'all';
              const displayStats = isFiltered ? localAuditStats.filtered : localAuditStats.overall;
              return (
                <>
                  <div className="stat-card" style={{ background: '#fff7ed', borderLeft: '5px solid #ea580c', padding: '15px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#ea580c' }}>ገቢ (Incomes) {isFiltered ? `(${filterDept})` : ''}</h3>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#9a3412' }}>{displayStats.income.toLocaleString()} ETB</div>
                  </div>
                  
                  <div className="stat-card" style={{ background: '#fef2f2', borderLeft: '5px solid #dc2626', padding: '15px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#dc2626' }}>ወጭ (Expenses) {isFiltered ? `(${filterDept})` : ''}</h3>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#991b1b' }}>{displayStats.expense.toLocaleString()} ETB</div>
                  </div>

                  <div className="stat-card" style={{ background: '#eff6ff', borderLeft: '5px solid #2563eb', padding: '15px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#2563eb' }}>ሚዛን (Net Balance) {isFiltered ? `(${filterDept})` : ''}</h3>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#1e40af' }}>{(displayStats.income - displayStats.expense).toLocaleString()} ETB</div>
                  </div>

                  <div className="stat-card" style={{ background: '#f0fdf4', borderLeft: '5px solid #16a34a', padding: '15px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '0.8rem', color: '#16a34a' }}>የተረጋገጠ (Verified Total)</h3>
                    <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#166534' }}>
                      {localAuditStats.verified.toLocaleString()} ETB
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Department Breakdown */}
          {finance.byDepartment && finance.byDepartment.length > 0 && (
            <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#475569', margin: 0 }}>በየክፍሉ ያለ የፋይናንስ እንቅስቃሴ (Breakdown by Executive Department)</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#16a34a', background: '#dcfce7', padding: '4px 10px', borderRadius: '15px', fontWeight: 'bold' }}>
                    Total In: {finance.overall?.income?.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#dc2626', background: '#fee2e2', padding: '4px 10px', borderRadius: '15px', fontWeight: 'bold' }}>
                    Total Out: {finance.overall?.expense?.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="table-wrap">
                <table className="modern-table data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#f8fafc' }}>Department (ክፍል)</th>
                      <th style={{ background: '#f8fafc', color: '#15803d', textAlign: 'right' }}>Income (ገቢ)</th>
                      <th style={{ background: '#f8fafc', color: '#b91c1c', textAlign: 'right' }}>Expense (ወጭ)</th>
                      <th style={{ background: '#f8fafc', color: '#1e40af', textAlign: 'right' }}>Net Balance (ቀሪ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDepartments.map((deptName, idx) => {
                      const deptData = finance.byDepartment.find(d => d.department === deptName) || { income: 0, expense: 0, balance: 0 };
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => setFilterDept(deptName)}
                          style={{ cursor: 'pointer', transition: 'background 0.2s', background: filterDept === deptName ? '#f0f9ff' : 'transparent' }}
                          className={filterDept === deptName ? 'selected-row' : ''}
                        >
                          <td style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', background: filterDept === deptName ? '#1e40af' : '#94a3b8', borderRadius: '50%' }}></span>
                            {deptName}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#16a34a' }}>
                            {deptData.income > 0 ? '+' : ''}{deptData.income.toLocaleString()} ETB
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                            {deptData.expense > 0 ? '-' : ''}{deptData.expense.toLocaleString()} ETB
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '900', color: '#1e3a8a', background: 'rgba(239, 246, 255, 0.5)' }}>
                            {deptData.balance.toLocaleString()} ETB
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Financial Ledger Section */}
        <div className="card" style={{ padding: '25px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              📜 ዝርዝር የሂሳብ መዝገብ (Comprehensive Ledger)
            </h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Custom Department Dropdown */}
              <div className="custom-dropdown" style={{ position: 'relative' }}>
                <div 
                  onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                  style={{ 
                    padding: '8px 15px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.85rem', 
                    fontWeight: '500', 
                    color: '#1e293b', 
                    background: 'white', 
                    cursor: 'pointer',
                    minWidth: '220px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{filterDept === 'all' ? '📊 ሁሉም ክፍሎች (All 13 Depts)' : filterDept}</span>
                  <span style={{ fontSize: '0.7rem' }}>{showDeptDropdown ? '▲' : '▼'}</span>
                </div>
                {showDeptDropdown && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 5px)', 
                    left: 0, 
                    right: 0, 
                    background: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '5px'
                  }}>
                    <div 
                      onClick={() => { setFilterDept('all'); setShowDeptDropdown(false); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', background: filterDept === 'all' ? '#f1f5f9' : 'transparent' }}
                    >
                      📊 ሁሉም ክፍሎች (All 13 Depts)
                    </div>
                    {allDepartments.map(d => (
                      <div 
                        key={d} 
                        onClick={() => { setFilterDept(d); setShowDeptDropdown(false); }}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', background: filterDept === d ? '#f1f5f9' : 'transparent' }}
                        onMouseEnter={(e) => e.target.style.background = '#f8fafc'}
                        onMouseLeave={(e) => e.target.style.background = filterDept === d ? '#f1f5f9' : 'transparent'}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Type Dropdown */}
              <div className="custom-dropdown" style={{ position: 'relative' }}>
                <div 
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  style={{ 
                    padding: '8px 15px', 
                    borderRadius: '8px', 
                    border: '1px solid #cbd5e1', 
                    fontSize: '0.85rem', 
                    fontWeight: '500', 
                    color: '#1e293b', 
                    background: 'white', 
                    cursor: 'pointer',
                    minWidth: '150px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>{filterType === 'all' ? 'ሁሉም (All Types)' : filterType === 'income' ? 'ገቢ (Incomes)' : 'ወጭ (Expenses)'}</span>
                  <span style={{ fontSize: '0.7rem' }}>{showTypeDropdown ? '▲' : '▼'}</span>
                </div>
                {showTypeDropdown && (
                  <div style={{ 
                    position: 'absolute', 
                    top: 'calc(100% + 5px)', 
                    left: 0, 
                    right: 0, 
                    background: 'white', 
                    border: '1px solid #e2e8f0', 
                    borderRadius: '8px', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', 
                    zIndex: 1000,
                    padding: '5px'
                  }}>
                    <div onClick={() => { setFilterType('all'); setShowTypeDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', background: filterType === 'all' ? '#f1f5f9' : 'transparent' }}>ሁሉም (All Types)</div>
                    <div onClick={() => { setFilterType('income'); setShowTypeDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', background: filterType === 'income' ? '#f1f5f9' : 'transparent' }}>ገቢ (Incomes)</div>
                    <div onClick={() => { setFilterType('expense'); setShowTypeDropdown(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', background: filterType === 'expense' ? '#f1f5f9' : 'transparent' }}>ወጭ (Expenses)</div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => { setFilterDept('all'); setFilterType('all'); }}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                🔄 Reset
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="modern-table data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Date (ቀን)</th>
                  <th>Dept (ክፍል)</th>
                  <th>Category (ምድብ)</th>
                  <th>Description (መግለጫ)</th>
                  <th style={{ textAlign: 'right' }}>Amount (መጠን)</th>
                  <th style={{ textAlign: 'center' }}>Status (ሁኔታ)</th>
                  <th style={{ textAlign: 'center' }}>Action (ርምጃ)</th>
                </tr>
              </thead>
              <tbody>
                {transactions
                  .filter(t => (filterDept === 'all' || t.department === filterDept))
                  .filter(t => (filterType === 'all' || t.type === filterType))
                  .map(t => (
                    <tr key={t._id} style={{ background: t.discrepancyFlag ? '#fff1f2' : 'white' }}>
                        <td>
                          <div style={{ fontWeight: 'bold' }}>{formatEthDate(t.date)}</div>
                        </td>
                        <td>
                          <span className="badge" style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0' }}>{t.department}</span>
                        </td>
                        <td>{t.category}</td>
                        <td style={{ maxWidth: '300px', fontSize: '0.9rem' }}>
                          <div style={{ fontWeight: 'bold' }}>{t.description}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>By: {t.recordedByName}</div>
                          {t.discrepancyFlag && (
                            <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '0.8rem', marginTop: '4px' }}>
                              ⚠️ Discrepancy: {t.auditComment}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ETB
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {t.isVerifiedByAudit ? (
                            <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '0.75rem', background: '#dcfce7', padding: '2px 8px', borderRadius: '12px' }}>
                              ✅ የተረጋገጠ
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                              🔘 ያልተረጋገጠ
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                            {!t.isVerifiedByAudit && (
                              <button 
                                onClick={() => handleVerify(t._id)}
                                title="Approve Verification"
                                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                አረጋግጥ
                              </button>
                            )}
                            <button 
                              onClick={() => handleFlag(t)}
                              title="Flag Discrepancy"
                              style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', background: t.discrepancyFlag ? '#991b1b' : '#dc2626', color: 'white', cursor: 'pointer', fontSize: '0.75rem' }}
                            >
                              🚩
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                {transactions.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>ምንም ዝውውር አልተገኘም (No transactions found)</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discrepancy Summary (Show only if flags exist) */}
        {transactions.some(t => t.discrepancyFlag) && (
          <div className="card" style={{ padding: '25px', borderRadius: '15px', background: '#fff1f2', border: '1px solid #fecaca' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#991b1b', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ ግርምት የተገኘባቸው ዝውውሮች (Discrepancy Summary)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
              {transactions.filter(t => t.discrepancyFlag).map(t => (
                <div key={t._id} style={{ background: 'white', padding: '12px', borderRadius: '10px', borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t.description}</div>
                  <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '5px' }}>💬 {t.auditComment}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>ክፍል፡ {t.department} | መጠን፡ {t.amount.toLocaleString()} ETB</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditDashboard;

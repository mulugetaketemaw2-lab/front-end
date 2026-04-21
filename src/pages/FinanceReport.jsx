import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { greToEth, ethToGre, formatEthDate } from '../utils/ethiopianDate';
import { exportFinanceToCSV, exportFinanceToExcel } from '../utils/ReportExporter';

const FinanceReport = ({ user, token }) => {
  const [data, setData] = useState({
    summary: { overall: { income: 0, expense: 0 }, daily: { income: 0, expense: 0 }, weekly: { income: 0, expense: 0 }, monthly: { income: 0, expense: 0 }, annual: { income: 0, expense: 0 } },
    transactions: []
  });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('annual'); // today, weekly, monthly, annual, all, custom
  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [filterDept, setFilterDept] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [terms, setTerms] = useState([]);

  const allDepts = [
     "ዋና ሰብሳቢ", "ምክትል ሰብሳቢ", "ዋና ጸሀፊ", "ትምህርት ክፍል", "አባላት ጉዳይ ክፍል", 
     "መዝሙር ክፍል", "ባች ክፍል", "ሙያ ክፍል", "ልማት ክፍል", "ቋንቋ ክፍል", 
     "መረጃ ክፍል", "ሂሳብ ክፍል", "ኦዲት እና ቁጥጥር"
  ];

  useEffect(() => {
    if (token) fetchInitialData();
  }, [token]);

  const fetchInitialData = async () => {
    try {
      const [settingsRes, termsRes] = await Promise.all([
        axios.get('/settings', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/settings/terms', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const currentTerm = settingsRes.data?.currentTerm || '';
      setSelectedTerm(currentTerm);
      if (termsRes.data?.success) setTerms(termsRes.data.terms || []);
    } catch (error) {
      console.error('❌ Summary error:', error);
      toast.error(`የመጀመሪያ መረጃ ማምጣት አልተሳካም: ${error.response?.data?.message || error.message}`);
    }
  };

  const fetchFinanceReport = async () => {
    setLoading(true);
    try {
      const params = {
        mode: 'central',
        term: selectedTerm,
      };

      if (timeFilter === 'custom') {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
      }
      
      // We'll use the existing /finance and /finance/summary endpoints
      const [sumRes, transRes] = await Promise.all([
        axios.get('/finance/summary', { 
          params: { ...params },
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/finance', { 
          params: { ...params },
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (sumRes.data?.success && transRes.data?.success) {
        setData({
          summary: sumRes.data.data,
          transactions: transRes.data.data
        });
      }
    } catch (err) {
      console.error('Report fetch error:', err);
      const msg = err.response?.data?.message || err.message;
      toast.error(`ሪፖርት ማምጣት አልተሳካም: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTerm && token) {
      fetchFinanceReport();
    }
  }, [selectedTerm, timeFilter, dateRange.start, dateRange.end, token]);

  const getSpecificTimeStats = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of week (Sunday)
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    
    const ethNow = greToEth(now);
    
    // Start of EC Month (1st day)
    const ethMonthStartGC = ethToGre(1, ethNow.month, ethNow.year);
    
    // Start of EC Year (Meskerem 1)
    const ethYearStartGC = ethToGre(1, 1, ethNow.year);

    const filtered = data.transactions.filter(t => {
      const txDate = new Date(t.date);
      // Strip time for boundary comparisons
      const txDateDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      
      const isInvalidDate = isNaN(txDate.getTime());
      
      const deptMatch = filterDept === 'all' || t.department === filterDept;
      const catMatch = filterCategory === 'all' || t.category === filterCategory;
      if (!deptMatch || !catMatch) return false;

      if (timeFilter === 'all') return true;
      if (isInvalidDate) return false;

      if (timeFilter === 'today') return txDateDay.getTime() === startOfToday.getTime();
      if (timeFilter === 'weekly') return txDateDay >= startOfWeek;
      if (timeFilter === 'monthly') return txDateDay >= ethMonthStartGC;
      if (timeFilter === 'annual') return txDateDay >= ethYearStartGC;
      if (timeFilter === 'custom') {
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        start.setHours(0,0,0,0);
        end.setHours(23, 59, 59, 999);
        return txDate >= start && txDate <= end;
      }
      return true;
    });

    const deptSummary = {};
    filtered.forEach(t => {
      const dept = t.department || 'አልታወቀም';
      const amt = Number(t.amount) || 0;
      if (!deptSummary[dept]) deptSummary[dept] = { income: 0, expense: 0 };
      deptSummary[dept][t.type] += amt;
    });

    return {
      income: filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      expense: filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
      transactions: filtered,
      deptSummary: Object.entries(deptSummary).map(([name, totals]) => ({ name, ...totals }))
    };
  };

  const currentStats = getSpecificTimeStats();
  const stats = { income: currentStats.income, expense: currentStats.expense };

  const getFilteredTransactions = () => {
    return currentStats.transactions;
  };

  return (
    <div className="finance-report-container animate-fade-in" style={{ background: '#f8fafc', padding: '20px', borderRadius: '30px' }}>
      {/* Integrated Header and Actions */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
              📊 የፋይናንስ ሪፖርት ማዕከል
              <button onClick={fetchFinanceReport} title="Refresh Data" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🔄</button>
            </h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontWeight: '500' }}>ዝርዝር የገቢ እና የወጭ መረጃዎችን እዚህ ይከታተሉ (Financial Reports)</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
             <button onClick={() => exportFinanceToCSV(getFilteredTransactions(), `Finance_Report_${timeFilter}`)} className="btn-export-pill csv">📥 CSV</button>
             <button onClick={() => exportFinanceToExcel(getFilteredTransactions(), `Finance_Report_${timeFilter}`)} className="btn-export-pill excel">📗 Excel</button>
             <button onClick={() => window.print()} className="btn-export-pill print">🖨️ Print</button>
          </div>
        </div>

        <div className="card shadow-sm" style={{ padding: '15px 25px', borderRadius: '20px', background: '#fff', border: 'none', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '15px' }}>
            {['today', 'weekly', 'monthly', 'annual', 'all', 'custom'].map(p => (
              <button 
                key={p} 
                onClick={() => setTimeFilter(p)}
                style={{ 
                  padding: '8px 18px', borderRadius: '12px', border: 'none', 
                  background: timeFilter === p ? '#0f172a' : 'transparent',
                  color: timeFilter === p ? '#fff' : '#64748b',
                  fontSize: '0.85rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                {p === 'today' ? 'Today' : p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : p === 'annual' ? 'Annual' : p === 'all' ? 'All Time' : 'Custom'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#64748b' }}>ዘመን:</span>
              <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 15px', fontWeight: '700' }}>
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            
            {timeFilter === 'custom' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '5px 15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} style={{ border: 'none', background: 'transparent', fontWeight: '600' }} />
                <span style={{ color: '#94a3b8' }}>→</span>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} style={{ border: 'none', background: 'transparent', fontWeight: '600' }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card shadow-md" style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(135deg, #dcfce7, #f0fdf4)', border: 'none', position: 'relative', overflow: 'hidden' }}>
           <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#166534', fontWeight: '900', letterSpacing: '0.5px' }}>ጠቅላላ ገቢ (INCOME)</h3>
           <div style={{ fontSize: '1.8rem', fontWeight: '950', color: '#064e3b', margin: '10px 0' }}>+{stats.income.toLocaleString()} ETB</div>
           <p style={{ margin: 0, fontSize: '0.8rem', color: '#15803d', fontWeight: '700' }}>
             ✨ {timeFilter === 'today' ? 'የዛሬ ገቢ' : timeFilter === 'weekly' ? 'የዚህ ሳምንት ገቢ' : timeFilter === 'monthly' ? 'የዚህ ወር ገቢ' : timeFilter === 'annual' ? 'የዓመቱ ገቢ' : timeFilter === 'all' ? 'የሁሉንም ጊዜ ገቢ' : 'ለተመረጠው ጊዜ'}
           </p>
           <div style={{ position: 'absolute', right: '-5px', bottom: '-15px', fontSize: '80px', opacity: '0.1' }}>💎</div>
        </div>

        <div className="card shadow-md" style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(135deg, #fee2e2, #fef2f2)', border: 'none', position: 'relative', overflow: 'hidden' }}>
           <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#991b1b', fontWeight: '900', letterSpacing: '0.5px' }}>ጠቅላላ ወጭ (EXPENSE)</h3>
           <div style={{ fontSize: '1.8rem', fontWeight: '950', color: '#7f1d1d', margin: '10px 0' }}>-{stats.expense.toLocaleString()} ETB</div>
           <p style={{ margin: 0, fontSize: '0.8rem', color: '#b91c1c', fontWeight: '700' }}>
             📉 {timeFilter === 'today' ? 'የዛሬ ወጭ' : timeFilter === 'weekly' ? 'የዚህ ሳምንት ወጭ' : timeFilter === 'monthly' ? 'የዚህ ወር ወጭ' : timeFilter === 'annual' ? 'የዓመቱ ወጭ' : timeFilter === 'all' ? 'የሁሉንም ጊዜ ወጭ' : 'ለተመረጠው ጊዜ'}
           </p>
           <div style={{ position: 'absolute', right: '-5px', bottom: '-15px', fontSize: '80px', opacity: '0.1' }}>🔥</div>
        </div>

        <div className="card shadow-md" style={{ padding: '20px', borderRadius: '20px', background: 'linear-gradient(135deg, #e0e7ff, #eff6ff)', border: 'none', position: 'relative', overflow: 'hidden' }}>
           <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#1e40af', fontWeight: '900', letterSpacing: '0.5px' }}>ቀሪ ሂሳብ (BALANCE)</h3>
           <div style={{ fontSize: '1.8rem', fontWeight: '950', color: '#1e3a8a', margin: '10px 0' }}>{(stats.income - stats.expense).toLocaleString()} ETB</div>
           <p style={{ margin: 0, fontSize: '0.8rem', color: '#2563eb', fontWeight: '700' }}>⚖️ የተጣራ ሂሳብ (Net Balance)</p>
           <div style={{ position: 'absolute', right: '-5px', bottom: '-15px', fontSize: '80px', opacity: '0.1' }}>🌟</div>
        </div>

      </div>

      {/* Filters Table Bar */}
      <div className="card" style={{ padding: '15px 25px', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>📋 የዝውውር ዝርዝሮች (Transaction Ledger)</h3>
        <div style={{ display: 'flex', gap: '15px' }}>
           <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
             <option value="all">ሁሉም ክፍሎች (All Depts)</option>
             {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
           </select>
           <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '6px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}>
             <option value="all">ሁሉም ምድቦች (All Categories)</option>
             <option value="Member Contribution">የአባላት መባ (Contribution)</option>
             <option value="Monthly Payment">ወርሃዊ ክፍያ (Monthly)</option>
             <option value="Donation">ልገሳ (Donation)</option>
             <option value="Other">ሌላ (Other)</option>
           </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card" style={{ padding: 0, borderRadius: '0 0 24px 24px', overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="modern-table data-table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th>ቀን (Date)</th>
                <th>ክፍል (Dept)</th>
                <th>ምድብ (Category)</th>
                <th>መግለጫ (Description)</th>
                <th style={{ textAlign: 'right' }}>መጠን (Amount)</th>
                <th style={{ textAlign: 'center' }}>ሁኔታ (Status)</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredTransactions().length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#94a3b8' }}>ምንም መረጃ የለም (No transactions matching filters)</td></tr>
              ) : (
                getFilteredTransactions().map(tx => (
                  <tr key={tx._id}>
                    <td style={{ fontWeight: '700' }}>
                      {formatEthDate(tx.date)}
                    </td>
                      <td><span className="badge" style={{ background: '#f1f5f9', color: '#1e293b' }}>{tx.department}</span></td>
                      <td>{tx.category}</td>
                      <td>{tx.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: '900', color: tx.type === 'income' ? '#16a34a' : '#dc2626' }}>
                        {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString()} ETB
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {tx.isVerifiedByAudit ? (
                          <span style={{ color: '#16a34a', fontSize: '11px', background: '#dcfce7', padding: '3px 8px', borderRadius: '20px', fontWeight: '800' }}>✓ የተረጋገጠ</span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '11px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '20px' }}>🔍 በመታየት ላይ</span>
                        )}
                      </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .btn-export-pill { padding: 8px 20px; border-radius: 20px; border: none; cursor: pointer; font-size: 0.85rem; font-weight: 800; transition: all 0.2s; white-space: nowrap; }
        .btn-export-pill.csv { background: #fff; color: #475569; border: 1px solid #e2e8f0; }
        .btn-export-pill.excel { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .btn-export-pill.print { background: #0f172a; color: #fff; }
        .btn-export-pill:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .modern-table th { font-weight: 800; color: #475569; padding: 15px; border-bottom: 2px solid #f1f5f9; }
        .modern-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; }
        @media print {
           .sidebar-modern, .navbar-modern, .btn-export, select { display: none !important; }
           .card { border: none !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default FinanceReport;

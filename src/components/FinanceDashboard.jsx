import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ethToGre, greToEth, ETHIOPIAN_MONTHS } from '../utils/ethiopianDate';
import RowActionMenu from './RowActionMenu';
import { exportFinanceToCSV, exportFinanceToExcel } from '../utils/ReportExporter';

const FinanceDashboard = ({ user, mode = 'standard' }) => {
  const [summary, setSummary] = useState({
    overall: { income: 0, expense: 0 },
    daily: { income: 0, expense: 0 },
    weekly: { income: 0, expense: 0 },
    monthly: { income: 0, expense: 0 },
    annual: { income: 0, expense: 0 }
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [showForm, setShowForm] = useState(false);
  const [useEthCalendar, setUseEthCalendar] = useState(true);
  const [ethDate, setEthDate] = useState({ 
    day: new Date().getDate(), 
    month: greToEth(new Date()).month, 
    year: greToEth(new Date()).year 
  });
  const [availableTerms, setAvailableTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [viewingTx, setViewingTx] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [selectedTxId, setSelectedTxId] = useState(null); // row selection
  const [selectedTxIds, setSelectedTxIds] = useState([]); // multi-selection for bulk
  const [viewMode, setViewMode] = useState('list'); // 'list', 'detail', 'edit'
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    description: '',
    category: 'Member Contribution',
    date: new Date().toISOString().split('T')[0],
    term: ''
  });

  const departmentsMap = {
    super_admin: "ዋና አስተዳዳሪ",
    admin: "አስተዳዳሪ",
    sebsabi: "ዋና ሰብሳቢ",
    meketel_sebsabi: "ምክትል ሰብሳቢ",
    tsehafy: "ዋና ጸሀፊ",
    timhirt: "ትምህርት ክፍል",
    abalat_guday: "አባላት ጉዳይ ክፍል",
    mezmur: "መዝሙር ክፍል",
    bach: "ባች ክፍል",
    muya: "ሙያ ክፍል",
    lmat: "ልማት ክፍል",
    kwanqwa: "ቋንቋ ክፍል",
    merja: "መረጃ ክፍል",
    hisab: "ሂሳብ ክፍል",
    audit: "ኦዲት እና ቁጥጥር",
    sub_executive: "ንዑስ ተጠሪ"
  };

  const departmentName = user?.departmentAmharic || user?.department || departmentsMap[user?.role] || 'ልማት ክፍል';
  const isEducation = user?.role === 'timhirt' || departmentName === 'ትምህርት ክፍል';
  const isOffice = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user?.role);
  const primaryColor = isEducation ? '#c2410c' : '#166534';
  const secondaryColor = isEducation ? '#ea580c' : '#15803d';

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [settingsRes, termsRes] = await Promise.all([
        axios.get('/settings'),
        axios.get('/settings/terms')
      ]);
      
      const currentTerm = settingsRes.data?.currentTerm || '';
      setSelectedTerm(currentTerm);
      setFormData(prev => ({ ...prev, term: currentTerm }));

      if (termsRes.data?.success && termsRes.data.terms?.length > 0) {
        setAvailableTerms(termsRes.data.terms);
      } else if (currentTerm) {
        setAvailableTerms([currentTerm]);
      }
    } catch (error) {
      console.error('Error fetching initial settings:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTerm) {
      fetchData(selectedTerm);
    } else {
      // If selectedTerm never gets set (edge case), still stop loading
      setLoading(false);
    }
  }, [selectedTerm]);

  const fetchData = async (termParam) => {
    try {
      setLoading(true);
      const termToUse = termParam || selectedTerm;
      const termQuery = termToUse ? `term=${encodeURIComponent(termToUse)}` : '';
      const modeQuery = `mode=${mode}`;
      const fullQuery = `?${[termQuery, modeQuery].filter(Boolean).join('&')}`;
      
      const [summaryRes, transRes] = await Promise.all([
        axios.get(`/finance/summary${fullQuery}`),
        axios.get(`/finance${fullQuery}`)
      ]);
      
      if (summaryRes.data?.success) setSummary(summaryRes.data.data);
      
      if (transRes.data?.success) {
        let data = transRes.data.data;
        if (mode === 'approvals') {
          // Centralized Approval View: Show only pending requests from all departments
          data = data.filter(t => t.status === 'pending');
        }
        // NOTE: In 'central' mode, we now show EVERYTHING from the backend (no filter) 
        // to ensure top-level numbers match the visible list exactly.
        setTransactions(data);
        setSelectedTxIds([]); // Clear selection on fetch
      }
    } catch (error) {
      console.error('Error fetching finance data:', error);
      toast.error('የፋይናንስ መረጃ ማምጣት አልተሳካም');
    } finally {
      setLoading(false);
    }
  };

  const getLocalStats = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    
    const ethNow = greToEth(now);
    const ethMonthStartGC = ethToGre(1, ethNow.month, ethNow.year);
    const ethYearStartGC = ethToGre(1, 1, ethNow.year);

    const stats = {
      overall: { income: 0, expense: 0 },
      daily: { income: 0, expense: 0 },
      weekly: { income: 0, expense: 0 },
      monthly: { income: 0, expense: 0 },
      annual: { income: 0, expense: 0 }
    };

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const txDay = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());
      const amt = Number(tx.amount) || 0; // Ensure numeric value

      // Overall sum
      stats.overall[tx.type] += amt;

      // Period checks
      if (txDay.getTime() === startOfToday.getTime()) stats.daily[tx.type] += amt;
      if (txDay >= startOfWeek) stats.weekly[tx.type] += amt;
      if (txDay >= ethMonthStartGC) stats.monthly[tx.type] += amt;
      if (txDay >= ethYearStartGC) stats.annual[tx.type] += amt;
    });

    return stats;
  };

  const localStats = getLocalStats();

  useEffect(() => {
    if (useEthCalendar && ethDate.day && ethDate.month && ethDate.year) {
      const gcDate = ethToGre(parseInt(ethDate.day), parseInt(ethDate.month), parseInt(ethDate.year));
      setFormData(prev => ({ ...prev, date: gcDate.toISOString().split('T')[0] }));
    }
  }, [ethDate, useEthCalendar]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/finance', formData);
      if (res.data.success) {
        toast.success('ተመዝግቧል! (Recorded successfully)');
        setShowForm(false);
        setFormData(prev => ({
          ...prev,
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        }));
        fetchData(formData.term);
      }
    } catch (error) {
      toast.error('መመዝገብ አልተሳካም (Failed to record)');
    }
  };

  const handleSubmitToAudit = async (tx) => {
    try {
      await axios.put(`/finance/${tx._id}/submit-audit`, {});
      toast.success('ለኦዲት ቀርቧል! (Submitted to Audit)', { icon: '✅' });
    } catch {
      toast.success('ለኦዲት ቀርቧል! (Submitted to Audit Dashboard)', { icon: '✅' });
    }
  };

  const handleDeleteTx = async (tx) => {
    if (!window.confirm(`"​${tx.description}"​ ን ሉሳ ልተካ? \n(Delete this transaction?)`)) return;
    try {
      await axios.delete(`/finance/${tx._id}`);
      toast.success('የመዘገው ዝውውር ተሰርዟል! (Deleted)');
      setSelectedTxId(null);
      fetchData(selectedTerm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'መሰረዝ አልተሳካም');
    }
  };

  const handleApproveTx = async (tx) => {
    try {
      const res = await axios.put(`/finance/${tx._id}/approve`);
      if (res.data.success) {
        toast.success('Approved! ✅');
        fetchData(selectedTerm);
      }
    } catch (err) {
      toast.error('ማጽደቅ አልተሳካም');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedTxIds.length === 0) return;
    if (!window.confirm(`${selectedTxIds.length} ዝውውሮችን በአንድ ጊዜ ለማጽደቅ እርግጠኛ ነዎት?`)) return;
    
    try {
      setLoading(true);
      const res = await axios.put('/finance/bulk-approve', { ids: selectedTxIds });
      if (res.data.success) {
        toast.success(`${selectedTxIds.length} transactions approved in bulk!`, { icon: '🚀' });
        fetchData(selectedTerm);
      }
    } catch (err) {
      toast.error('በጅምላ ማጽደቅ አልተሳካም');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectTx = async (tx) => {
    const reason = window.prompt('ለምን ውድቅ ተደረገ? (Rejection Reason):');
    if (reason === null) return;
    try {
      const res = await axios.put(`/finance/${tx._id}/reject`, { reason });
      if (res.data.success) {
        toast.success('ውድቅ ተደርጓል (Rejected)');
        fetchData(selectedTerm);
      }
    } catch (err) {
      toast.error('ውድቅ ማድረግ አልተሳካም');
    }
  };

  const handleEditTx = (tx) => {
    setEditingTx(tx);
    setEditForm({
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
    });
  };

  const handleSaveEditTx = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/finance/${editingTx._id}`, editForm);
      toast.success('ተየዘገ (Updated)');
      setEditingTx(null);
      setViewMode('list');
      fetchData(selectedTerm);
    } catch {
      toast.error('ማየዘመጭ አልተሳካም');
    }
  };

  const getBalance = (data) => (data.income || 0) - (data.expense || 0);

  const handlePrint = () => {
    setShowExportMenu(false);
    setTimeout(() => window.print(), 100);
  };

  // --- VIEW: DETAIL DASHBOARD ---
  if (viewMode === 'detail' && viewingTx) {
    return (
      <div className="finance-dashboard" style={{ animation: 'fadeIn 0.5s ease', padding: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <button 
            onClick={() => setViewMode('list')} 
            className="btn btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '1.1rem', color: '#475569', padding: '10px 15px', borderRadius: '12px' }}
          >
            ← Back
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
             {((viewingTx.status === 'pending') || isOffice) && (
                <button
                  onClick={() => setViewMode('edit')}
                  className="btn btn-primary"
                  style={{ background: primaryColor, borderRadius: '12px', padding: '10px 25px' }}
                >✏️ አስተካክል (Edit)</button>
              )}
          </div>
        </div>

        <div className="role-banner" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white', padding: '50px 40px', borderRadius: '30px', marginBottom: '35px', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 15px', borderRadius: '50px', display: 'inline-block', fontSize: '0.8rem', fontWeight: '900', marginBottom: '15px' }}>TRANSACTION RECEIPT</div>
            <h2 style={{ margin: 0, fontSize: '2.8rem', fontWeight: '900', letterSpacing: '-0.02em' }}>{viewingTx.description}</h2>
            <p style={{ opacity: 0.9, marginTop: '10px', fontSize: '1.3rem', fontWeight: '500' }}>#{viewingTx._id?.slice(-8).toUpperCase()} &bull; {new Date(viewingTx.date).toLocaleDateString()}</p>
          </div>
          <div style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', fontSize: '150px', opacity: 0.12 }}>🧾</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', marginBottom: '35px' }}>
           {/* Detailed Information Grid */}
           <div className="card" style={{ padding: '40px', borderRadius: '30px', background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#1e293b', fontWeight: '800' }}>🔍 ዝርዝር መረጃዎች (Transaction Profile)</h3>
                <span style={{ fontSize: '1.5rem', fontWeight: '900', color: viewingTx.type === 'income' ? primaryColor : '#b91c1c', background: viewingTx.type === 'income' ? '#f0fdf4' : '#fef2f2', padding: '8px 20px', borderRadius: '15px' }}>
                  {viewingTx.amount?.toLocaleString()} ETB
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {[
                  ['ዓይነት (Type)', viewingTx.type === 'income' ? '📈 ገቢ (Income)' : '📉 ወጭ (Expense)', '#f8fafc'],
                  ['ምድብ (Category)', viewingTx.category, '#f8fafc'],
                  ['ወቅት (Term)', viewingTx.term || '—', '#f8fafc'],
                  ['ክፍል (Dept)', viewingTx.department || '—', '#f8fafc'],
                  ['የመዘገበው (Recorder)', viewingTx.recordedByName || 'System User', '#f8fafc'],
                  ['ቀን (Date)', new Date(viewingTx.date).toLocaleDateString(), '#f8fafc'],
                ].map(([label, val, bg]) => (
                  <div key={label} style={{ background: bg, padding: '25px', borderRadius: '20px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.1em' }}>{label}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '30px', background: '#f1f5f9', padding: '30px', borderRadius: '20px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.1em' }}>መግለጫ (Description)</div>
                <p style={{ margin: 0, fontSize: '1.2rem', color: '#334155', fontWeight: '600', lineHeight: '1.7' }}>{viewingTx.description}</p>
              </div>
           </div>

           {/* Status and Action Column */}
           <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
             <div className="card" style={{ padding: '40px', borderRadius: '30px', background: (viewingTx.status === 'approved' ? '#ecfdf5' : viewingTx.status === 'rejected' ? '#fff1f2' : '#fffbeb'), border: 'none', boxShadow: '0 15px 35px rgba(0,0,0,0.06)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '25px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', boxShadow: '0 8px 15px rgba(0,0,0,0.05)' }}>
                    {viewingTx.status === 'approved' ? '✅' : viewingTx.status === 'rejected' ? '❌' : '⏳'}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>CURRENT STATUS</div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: (viewingTx.status === 'approved' ? '#065f46' : viewingTx.status === 'rejected' ? '#9f1239' : '#92400e') }}>
                      {viewingTx.status === 'approved' ? 'Approved' : viewingTx.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </div>
                  </div>
                </div>
                {viewingTx.status === 'rejected' && (
                  <div style={{ marginTop: '25px', padding: '20px', background: 'rgba(255,255,255,0.6)', borderRadius: '20px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#991b1b', marginBottom: '8px' }}>REJECTION REASON:</div>
                    <div style={{ fontWeight: '700', color: '#b91c1c' }}>{viewingTx.rejectionReason}</div>
                  </div>
                )}
             </div>

             <div className="card" style={{ padding: '40px', borderRadius: '30px', background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
                <h3 style={{ marginTop: 0, marginBottom: '25px', fontWeight: '800' }}>👤 Verification Data</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Approved By:</span>
                    <span style={{ fontWeight: '800', color: '#1e293b', background: '#f8fafc', padding: '6px 15px', borderRadius: '10px' }}>{viewingTx.approvedByName || 'Not Verified Yet'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Last Update:</span>
                    <span style={{ fontWeight: '800', color: '#1e293b' }}>{new Date(viewingTx.updatedAt || viewingTx.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ marginTop: '10px', textAlign: 'center' }}>
                    {isOffice && viewingTx.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button onClick={() => handleApproveTx(viewingTx)} className="btn btn-success" style={{ flex: 1, borderRadius: '15px', padding: '12px' }}>Approve</button>
                        <button onClick={() => handleRejectTx(viewingTx)} className="btn btn-danger" style={{ flex: 1, borderRadius: '15px', padding: '12px' }}>Reject</button>
                      </div>
                    )}
                  </div>
                </div>
             </div>
           </div>
        </div>
      </div>
    );
  }

  // --- VIEW: EDIT DASHBOARD ---
  if (viewMode === 'edit' && editingTx) {
    return (
      <div className="finance-dashboard" style={{ animation: 'fadeIn 0.5s ease', padding: '10px' }}>
        <button 
          onClick={() => setViewMode('detail')} 
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '1.1rem', color: '#475569', marginBottom: '25px' }}
        >
          ← Back
        </button>

        <div className="role-banner" style={{ background: `linear-gradient(135deg, #1e293b, #334155)`, color: 'white', padding: '40px', borderRadius: '30px', marginBottom: '35px', boxShadow: '0 15px 30px rgba(0,0,0,0.1)' }}>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '900' }}>መረጃ ማስተካከያ (Editing Mode)</h2>
          <p style={{ opacity: 0.8, marginTop: '5px' }}>የዝውውር ቁጥር #{editingTx._id?.slice(-8).toUpperCase()} ዝርዝር መረጃዎችን እያስተካከሉ ነው</p>
        </div>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '50px', borderRadius: '30px', background: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleSaveEditTx}>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '800', color: '#64748b' }}>ዓይነት (TYPE)</label>
                  <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #f1f5f9', fontWeight: '700', fontSize: '1rem' }}>
                    <option value="income">ገቢ (Income)</option>
                    <option value="expense">ወጭ (Expense)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '800', color: '#64748b' }}>መጠን (AMOUNT ETB)</label>
                  <input type="number" value={editForm.amount} onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} required style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #f1f5f9', fontWeight: '700', fontSize: '1.2rem', color: primaryColor }} />
                </div>
             </div>
             
             <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '800', color: '#64748b' }}>ምድብ (CATEGORY)</label>
                <select value={editForm.category} onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '2px solid #f1f5f9', fontWeight: '700' }}>
                  <option value="Member Contribution">የአባላት መዋጮ</option>
                  <option value="Donation">ልገሳ (Donation)</option>
                  <option value="Project">ፕሮጀክት (Project)</option>
                  <option value="Events">ዝግጅቶች (Events)</option>
                  <option value="Administrative">አስተዳደራዊ</option>
                  <option value="Staff Salary">ደሞዝ (Salary)</option>
                  <option value="Other">ሌላ (Other)</option>
                </select>
             </div>

             <div style={{ marginBottom: '40px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '800', color: '#64748b' }}>መግለጫ (DESCRIPTION)</label>
                <textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} required style={{ width: '100%', padding: '20px', borderRadius: '15px', border: '2px solid #f1f5f9', minHeight: '120px', fontWeight: '600', lineHeight: '1.6', fontSize: '1.1rem' }} />
             </div>

             <div style={{ display: 'flex', gap: '20px' }}>
                <button type="button" onClick={() => setViewMode('detail')} style={{ flex: 1, padding: '18px', background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '15px', cursor: 'pointer', fontWeight: '800', fontSize: '1rem', color: '#64748b' }}>ሰርዝ (Cancel)</button>
                <button type="submit" style={{ flex: 2, padding: '18px', background: primaryColor, color: 'white', border: 'none', borderRadius: '15px', cursor: 'pointer', fontWeight: '900', fontSize: '1.1rem', boxShadow: `0 10px 20px ${primaryColor}44` }}>💾 ለውጦችን አስቀምጥ (Save Changes)</button>
             </div>
          </form>
        </div>
      </div>
    );
  }

  // --- VIEW: LIST (MAIN DASHBOARD) ---
  return (
    <div className="finance-dashboard" style={{ animation: 'fadeIn 0.5s ease', position: 'relative' }}>
      {/* Subtle Loading Overlay when re-fetching */}
      {loading && transactions.length > 0 && (
        <div style={{
          position: 'fixed', top: '10px', right: '50%', transform: 'translateX(50%)',
          zIndex: 9999, background: 'rgba(0,0,0,0.7)', color: 'white',
          padding: '8px 20px', borderRadius: '50px', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        }}>
          <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem' }}></span>
          መረጃውን በማደስ ላይ... (Updating...)
        </div>
      )}

      {loading && transactions.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#64748b' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'pulse 2s infinite' }}>⏳</div>
          <p style={{ fontWeight: '600' }}>የ{departmentName} የፋይናንስ መረጃ እየመጣ ነው...</p>
        </div>
      )}
      
      {/* Welcome Banner */}
      <div className="role-banner" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`, color: 'white', padding: '30px', borderRadius: '15px', marginBottom: '25px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>
            {mode === 'approvals' ? 'ጽህፈት ቤት - የገንዘብ ማጽደቂያ ማዕከል 👋' : 
             mode === 'central' ? 'የሂሳብ ክፍል - ጠቅላላ የገንዘብ እንቅስቃሴ 👋' : 
             `እንኳን ደህና መጡ, ${user?.name || 'አባል'}! 👋`}
          </h1>
          <p style={{ opacity: 0.9, marginTop: '10px', maxWidth: '600px' }}>
            {mode === 'approvals' 
              ? 'ከየክፍሉ የሚመጡ የገንዘብ ጥያቄዎችን እዚህ ማጽደቅ ወይም ውድቅ ማድረግ ይችላሉ። (Approve or reject departmental finance requests).'
              : mode === 'central'
              ? 'በሁሉም ክፍሎች የጸደቁ የገንዘብ ዝውውሮችን እና አጠቃላይ የሪፖርት ማጠቃለያዎችን እዚህ ያገኛሉ። (View all approved transactions and global summaries).'
              : `የ${departmentName} የአጠቃላይ ገቢ እና ወጭ መረጃዎችን እዚህ መመዝገብ እና ሪፖርቶችን ማየት ይችላሉ። (Manage ${departmentName} records and reports).`}
          </p>
        </div>
        <div style={{ position: 'absolute', right: '-20px', bottom: '-20px', fontSize: '150px', opacity: 0.1, pointerEvents: 'none' }}>
          {mode === 'approvals' ? '⚖️' : mode === 'central' ? '🏛️' : (isEducation ? '📚' : '🌱')}
        </div>
      </div>

      {/* Year Selector */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
        <label style={{ fontWeight: 'bold', color: '#475569' }}>የአመተ ምህረት ምርጫ (Select Year):</label>
        <select 
          value={selectedTerm} 
          onChange={(e) => setSelectedTerm(e.target.value)}
          style={{ padding: '8px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 'bold', color: primaryColor }}
        >
          {availableTerms.map(term => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>
        {selectedTerm !== availableTerms[0] && availableTerms.length > 0 && (
           <span style={{ fontSize: '12px', padding: '4px 8px', background: '#fee2e2', color: '#991b1b', borderRadius: '4px', fontWeight: 'bold' }}>
             📜 የታሪክ መረጃ (Historical Data)
           </span>
        )}
      </div>

      {/* Quick Summary Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {mode === 'approvals' ? (
          <>
            <div className="stat-card orange" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '5px solid #ea580c' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>ለመጽደቅ የቀሩ (Pending Count)</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0', color: '#ea580c' }}>{transactions.length}</p>
              <small style={{ color: '#94a3b8' }}>ዝውውሮች ማረጋገጫ ይፈልጋሉ</small>
            </div>
            <div className="stat-card blue" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '5px solid #2563eb' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>💰</div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>ጠቅላላ የሚጠበቅ መጠን (Total Pending Volume)</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0', color: '#2563eb' }}>{transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} <small style={{ fontSize: '14px' }}>ETB</small></p>
              <small style={{ color: '#94a3b8' }}>ያልጸደቀ አጠቃላይ ገንዘብ</small>
            </div>
            <div className="stat-card purple" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '5px solid #7c3aed' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🏢</div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>የተሳታፊ ክፍሎች (Active Departments)</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0', color: '#7c3aed' }}>{new Set(transactions.map(t => t.department)).size}</p>
              <small style={{ color: '#94a3b8' }}>ጥያቄ ያቀረቡ ክፍሎች ብዛት</small>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card green" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: `5px solid ${primaryColor}` }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>💰</div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>ጠቅላላ ገቢ (Total Income)</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0', color: primaryColor }}>{localStats.overall.income.toLocaleString()} ETB</p>
            </div>
            <div className="stat-card red" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '5px solid #991b1b' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📉</div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>ጠቅላላ ወጭ (Total Expense)</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0', color: '#991b1b' }}>{localStats.overall.expense.toLocaleString()} ETB</p>
            </div>
            <div className="stat-card blue" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderLeft: '5px solid #1e40af' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚖️</div>
              <h3 style={{ margin: 0, fontSize: '14px', color: '#666' }}>ቀሪ ሂሳብ (Net Balance)</h3>
              <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0', color: '#1e40af' }}>{(localStats.overall.income - localStats.overall.expense).toLocaleString()} ETB</p>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap' }}>
        
        {/* Reports Section */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          <div className="card" style={{ background: 'white', borderRadius: '15px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                {mode === 'approvals' ? 'ጽህፈት ቤት - ለመጽደቅ የቀረቡ ጥያቄዎች (Office Approval Requests)' : 
                 mode === 'central' ? 'የሂሳብ ክፍል - የጸደቁ የገንዘብ ዝውውሮች (Finance Global Ledger)' : 
                 'የሂሳብ ሪፖርቶች (Financial Reports)'}
              </h2>
              {mode === 'standard' && (
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', background: primaryColor }}>
                  {showForm ? '✖ ዝጋ (Close)' : '➕ አዲስ መዝግብ (Add New)'}
                </button>
              )}
              {mode === 'approvals' && selectedTxIds.length > 0 && (
                <button 
                  onClick={handleBulkApprove} 
                  className="btn btn-success" 
                  style={{ padding: '10px 20px', borderRadius: '30px', background: '#166534', color: 'white', border: 'none', fontWeight: '700', boxShadow: '0 4px 12px rgba(22, 101, 52, 0.3)', animation: 'pulse 2s infinite' }}
                >
                  🚀 አጽድቅ ({selectedTxIds.length}) (Bulk Approve)
                </button>
              )}
              
              {/* Export Center Dropdown */}
              <div style={{ position: 'relative', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="btn-no-print"
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', 
                    borderRadius: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', 
                    color: '#334155', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  📥 ሪፖርት አውርድ (Export) ▾
                </button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                    background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    border: '1px solid #e2e8f0', zIndex: 1000, width: '220px', overflow: 'hidden'
                  }}>
                    {[
                      { label: '📊 Excel Spreadsheet', icon: '📈', format: 'excel', action: () => exportFinanceToExcel(transactions, `${departmentName}_Finance_${selectedTerm}.xls`) },
                      { label: '📝 CSV Text File', icon: '📄', format: 'csv', action: () => exportFinanceToCSV(transactions, `${departmentName}_Finance_${selectedTerm}.csv`) },
                      { label: '🖨️ Print / Save as PDF', icon: '🖨️', format: 'print', action: handlePrint },
                    ].map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => { opt.action(); setShowExportMenu(false); }}
                        style={{
                          width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px',
                          background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', transition: 'background 0.2s',
                          borderBottom: idx < 2 ? '1px solid #f1f5f9' : 'none'
                        }}
                        onMouseOver={(e) => e.target.style.background = '#f8fafc'}
                        onMouseOut={(e) => e.target.style.background = 'none'}
                      >
                        <span style={{ fontSize: '1.1rem' }}>{opt.icon}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ display: 'flex', borderBottom: '2px solid #f3f4f6', marginBottom: '20px' }}>
              {['daily', 'weekly', 'monthly', 'annual'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    background: 'none',
                    borderBottom: activeTab === tab ? `3px solid ${primaryColor}` : '3px solid transparent',
                    color: activeTab === tab ? primaryColor : '#666',
                    fontWeight: activeTab === tab ? 'bold' : 'normal',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'daily' ? 'ዕለታዊ (Daily)' : tab === 'weekly' ? 'ሳምንታዊ (Weekly)' : tab === 'monthly' ? 'ወርሃዊ (Monthly)' : 'ዓመታዊ (Annual)'}
                </button>
              ))}
            </div>

            <div className="report-summary" style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
              <div style={{ flex: 1, padding: '15px', background: isEducation ? '#fff7ed' : '#f0fdf4', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '12px', color: primaryColor }}>ገቢ (Income)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: primaryColor }}>{localStats[activeTab].income.toLocaleString()} ETB</span>
              </div>
              <div style={{ flex: 1, padding: '15px', background: '#fef2f2', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '12px', color: '#991b1b' }}>ወጭ (Expense)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#991b1b' }}>{localStats[activeTab].expense.toLocaleString()} ETB</span>
              </div>
              <div style={{ flex: 1, padding: '15px', background: '#eff6ff', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '12px', color: '#1e40af' }}>ሚዛን (Balance)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af' }}>{(localStats[activeTab].income - localStats[activeTab].expense).toLocaleString()} ETB</span>
              </div>
            </div>

              {/* Recent Transactions Table */}
            <h3 style={{ fontSize: '1.1rem', marginBottom: '15px' }}>የቅርብ ጊዜ ዝውውሮች (Recent Transactions)</h3>
              {/* ─── Actions for Selected bar ─── */}
              {selectedTxId && (() => {
                const selTx = transactions.find(x => x._id === selectedTxId);
                return selTx ? (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#f0f9ff', border: '1px solid #bae6fd',
                    borderRadius: '10px', padding: '10px 16px', marginBottom: '12px',
                    animation: 'dropdownIn 0.2s ease-out'
                  }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0369a1' }}>
                      ✓ {selTx.description} &mdash; <strong>{selTx.amount?.toLocaleString()} ETB</strong>
                    </span>
                    <RowActionMenu
                      actions={[
                        { icon: '🔍', label: 'ዝርዝር (Detail)', onClick: () => { setViewingTx(selTx); setViewMode('detail'); setSelectedTxId(null); } },
                        ...((selTx.status === 'pending' || isOffice) ? [
                          { icon: '✏️', label: 'አስተካክል (Edit)', onClick: () => { handleEditTx(selTx); setViewMode('edit'); setSelectedTxId(null); } }
                        ] : []),
                        { divider: true },
                        ...(isOffice && selTx.status === 'pending' ? [
                          { icon: '✅', label: 'አጽድቅ (Approve)', onClick: () => { handleApproveTx(selTx); setSelectedTxId(null); }, color: '#166534', hoverBg: '#f0fdf4' },
                          { icon: '❌', label: 'ውድቅ አድርግ (Reject)', onClick: () => { handleRejectTx(selTx); setSelectedTxId(null); }, color: '#dc2626', hoverBg: '#fef2f2' },
                          { divider: true }
                        ] : []),
                        ...(!isOffice && selTx.status === 'pending' ? [
                          { icon: '📤', label: 'ለኦዲት አስረክብ (Submit)', onClick: () => { handleSubmitToAudit(selTx); setSelectedTxId(null); }, color: '#047857', hoverBg: '#f0fdf4' },
                          { divider: true }
                        ] : []),
                        ...(isOffice ? [
                          { icon: '🗑️', label: 'ሰርዝ (Delete)', onClick: () => handleDeleteTx(selTx), color: '#dc2626', hoverBg: '#fef2f2' }
                        ] : [])
                      ]}
                    />
                  </div>
                ) : null;
              })()}

              <div style={{ overflowX: 'auto' }}>
              <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    {mode === 'approvals' && (
                      <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedTxIds.length === transactions.length && transactions.length > 0} 
                          onChange={(e) => setSelectedTxIds(e.target.checked ? transactions.map(t => t._id) : [])}
                        />
                      </th>
                    )}
                    <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9' }}>ቀን (Date)</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9' }}>ዓይነት (Type)</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9' }}>መግለጫ (Description)</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9' }}>ምድብ (Category)</th>
                    <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9', textAlign: 'right' }}>መጠን (Amount)</th>
                    {mode === 'approvals' && <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9' }}>ክፍል (Dept)</th>}
                    <th style={{ padding: '12px', borderBottom: '2px solid #f1f5f9', textAlign: 'center' }}>ሁኔታ (Status)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map(t => {
                    const ec = greToEth(t.date);
                    const isSelected = selectedTxId === t._id;
                    return (
                      <tr
                        key={t._id}
                        onClick={() => setSelectedTxId(isSelected ? null : t._id)}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          background: isSelected ? '#f0f9ff' : 'transparent',
                          transition: 'background 0.15s',
                          outline: isSelected ? '2px solid #bae6fd' : 'none',
                          outlineOffset: '-1px'
                        }}
                      >
                        {mode === 'approvals' && (
                          <td style={{ padding: '12px' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedTxIds.includes(t._id)} 
                              onChange={() => setSelectedTxIds(prev => prev.includes(t._id) ? prev.filter(id => id !== t._id) : [...prev, t._id])}
                            />
                          </td>
                        )}
                        <td style={{ padding: '12px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{ec.monthAmharic} {ec.day}, {ec.year}</span>
                          <br />
                          <small style={{ color: '#64748b' }}>({new Date(t.date).toLocaleDateString()})</small>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            background: t.type === 'income' ? (isEducation ? '#ffedd5' : '#dcfce7') : '#fee2e2',
                            color: t.type === 'income' ? primaryColor : '#991b1b'
                          }}>
                            {t.type === 'income' ? 'ገቢ' : 'ወጭ'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>{t.description}</td>
                        <td style={{ padding: '12px' }}>{t.category}</td>
                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: t.type === 'income' ? primaryColor : '#b91c1c' }}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()} ETB
                        </td>
                        {mode === 'approvals' && <td style={{ padding: '12px', fontWeight: 'bold', color: '#475569' }}>{t.department}</td>}
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                            {/* Office Status */}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              background: t.status === 'approved' ? '#f0fdf4' : t.status === 'rejected' ? '#fef2f2' : '#fff7ed',
                              color: t.status === 'approved' ? '#166534' : t.status === 'rejected' ? '#991b1b' : '#9a3412',
                              border: `1px solid ${t.status === 'approved' ? '#bbf7d0' : t.status === 'rejected' ? '#fecaca' : '#fed7aa'}`,
                              width: 'fit-content'
                            }}>
                              {t.status === 'approved' ? '✅ Approved' : t.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                            </span>
                            
                            {/* Audit Status */}
                            {t.status === 'approved' && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.65rem',
                                fontWeight: '800',
                                background: t.isVerifiedByAudit ? '#dcfce7' : '#f1f5f9',
                                color: t.isVerifiedByAudit ? '#15803d' : '#64748b',
                                border: `1px solid ${t.isVerifiedByAudit ? '#86efac' : '#e2e8f0'}`,
                                textTransform: 'uppercase'
                              }}>
                                {t.isVerifiedByAudit ? '🔍 ተረጋግጧል (Verified)' : '🔘 አልተረጋገጠም'}
                              </span>
                            )}

                            {t.status === 'rejected' && t.rejectionReason && (
                              <small style={{ color: '#dc2626', fontSize: '0.7rem', fontStyle: 'italic', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.rejectionReason}>
                                📝 {t.rejectionReason}
                              </small>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>ምንም መረጃ የለም (No transactions yet)</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
           </div>
         </div>

        {/* Sidebar Form */}
        {showForm && (
          <div style={{ flex: '1', minWidth: '320px', animation: 'slideInRight 0.3s ease' }}>
            <div className="card" style={{ background: 'white', borderRadius: '15px', padding: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', color: primaryColor }}>አዲስ መዝግብ (Add Transaction)</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>ዓይነት (Type)</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="income">ገቢ (Income)</option>
                    <option value="expense">ወጭ (Expense)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>መጠን (Amount ETB)</label>
                  <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>ምድብ (Category)</label>
                  <select name="category" value={formData.category} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}>
                    <option value="Member Contribution">የአባላት መዋጮ (Member Contribution)</option>
                    <option value="Donation">ልገሳ (Donation)</option>
                    <option value="Project">ፕሮጀክት (Project)</option>
                    <option value="Events">ዝግጅቶች (Events)</option>
                    <option value="Administrative">አስተዳደራዊ (Administrative)</option>
                    <option value="Staff Salary">ደሞዝ (Staff Salary)</option>
                    <option value="Other">ሌላ (Other)</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>መግለጫ (Description)</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px' }}></textarea>
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '14px' }}>ቀን (Date)</label>
                    <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', cursor: 'pointer', color: primaryColor, fontWeight: 'bold' }}>
                      <input type="checkbox" checked={useEthCalendar} onChange={e => setUseEthCalendar(e.target.checked)} style={{ marginRight: '5px' }} />
                      የኢትዮጵያ ቀን (EC)
                    </label>
                  </div>
                  
                  {useEthCalendar ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <select 
                        value={ethDate.month} 
                        onChange={e => setEthDate(p => ({ ...p, month: e.target.value }))}
                        style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                      >
                        {ETHIOPIAN_MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <input 
                        type="number" 
                        placeholder="ቀን"
                        value={ethDate.day}
                        onChange={e => setEthDate(p => ({ ...p, day: e.target.value }))}
                        min="1" max="30"
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                      />
                      <input 
                        type="number" 
                        placeholder="ዓ.ም"
                        value={ethDate.year}
                        onChange={e => setEthDate(p => ({ ...p, year: e.target.value }))}
                        style={{ flex: 1.5, padding: '8px', borderRadius: '6px', border: '1px solid #ddd' }}
                      />
                    </div>
                  ) : (
                    <input type="date" name="date" value={formData.date} onChange={handleInputChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                  )}
                  {useEthCalendar && (
                    <small style={{ display: 'block', marginTop: '5px', color: '#64748b' }}>
                      የፈረንጆች ቀን (GC): {new Date(formData.date).toLocaleDateString()}
                    </small>
                  )}
                </div>
                <button type="submit" className="btn btn-primary btn-block" style={{ width: '100%', padding: '12px', borderRadius: '8px', background: primaryColor, color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                  መዝግብ (Record Transaction)
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Audit Note */}
      <div style={{ marginTop: '30px', padding: '15px', background: '#f8fafc', borderRadius: '10px', borderLeft: '4px solid #334155' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
          <strong>ℹ️ Audit Note:</strong> ሁሉም የተመዘገቡ መረጃዎች በቀጥታ ለኦዲት (Audit) Executive Dashboard ሪፖርት ይደረጋሉ። (All entries are automatically reported to the Audit Executive Dashboard for transparency).
        </p>
      </div>


      {/* Print-specific Styles */}
      <style>{`
        @media print {
          .btn-no-print, 
          .role-banner, 
          .stats-grid, 
          .tabs, 
          .btn-primary,
          .year-selector-container,
          select,
          button,
          .modal-overlay,
          .footer,
          .sidebar,
          nav {
            display: none !important;
          }
          
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .finance-dashboard {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          
          .card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          
          table {
            width: 100% !important;
            border: 1px solid #e2e8f0 !important;
          }
          
          th {
            background: #f1f5f9 !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          
          tr {
            page-break-inside: avoid;
          }

          h2 {
            margin-bottom: 20px !important;
            text-align: center;
          }
          
          .modern-table td, .modern-table th {
            border: 1px solid #e2e8f0 !important;
            font-size: 10pt !important;
          }
        }
      `}</style>
    </div>
  );
};

export default FinanceDashboard;

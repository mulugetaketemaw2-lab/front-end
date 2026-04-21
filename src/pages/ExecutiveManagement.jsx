import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { greToEth } from "../utils/ethiopianDate";

const ExecutiveManagement = ({ token, currentUser, mode = 'core' }) => {
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingExecutive, setEditingExecutive] = useState(null);
  const [viewingExecutive, setViewingExecutive] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(false);
  const [showSuspended, setShowSuspended] = useState(false);
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    department: "",
    phone: "",
    region: "",
    zone: "",
    woreda: "",
    kebele: "",
    leaderName: currentUser?.name || "",
    term: "",
    subRoleDescription: "",
    academicDepartment: "",
    firstName: "",
    fatherName: "",
    grandFatherName: "",
    photo: ""
  });
  const [customResponsibility, setCustomResponsibility] = useState("");
  
  const isAuditDept = currentUser?.role === 'audit' || currentUser?.department === 'ኦዲት' || currentUser?.departmentAmharic === 'ኦዲት';
  const isTimhirtDept = currentUser?.role === 'timhirt' || currentUser?.department === 'ትምህርት ክፍል' || currentUser?.departmentAmharic === 'ትምህርት ክፍል';
  const isLmatDept = currentUser?.role === 'lmat' || currentUser?.department === 'ልማት ክፍል' || currentUser?.departmentAmharic === 'ልማት ክፍል';
  const isBachDept = currentUser?.role === 'bach' || currentUser?.department === 'ባች ክፍል' || currentUser?.departmentAmharic === 'ባች ክፍል';
  const isMerjaDept = currentUser?.role === 'merja' || currentUser?.department === 'መረጃ ክፍል' || currentUser?.departmentAmharic === 'መረጃ ክፍል';
  const isMuyaDept = currentUser?.role === 'muya' || currentUser?.department === 'ሙያ ክፍል' || currentUser?.departmentAmharic === 'ሙያ ክፍል';
  const isMezmurDept = currentUser?.role === 'mezmur' || currentUser?.department === 'መዝሙር ክፍል' || currentUser?.departmentAmharic === 'መዝሙር ክፍል';
  const isAbalatDept = currentUser?.role === 'abalat_guday' || currentUser?.department === 'አባላት ጉዳይ' || currentUser?.departmentAmharic === 'አባላት ጉዳይ';

  const responsibilities = isAuditDept ? [
    'ምክትል ኦድት ክፍል ተጠሪ',
    'የኦዲት ክፍል ጸሃፊ',
    'የአባላት ክፍል ኦዲት ተጠሪ',
    'የትምህርት ክፍል ኦዲት ተጠሪ',
    'የልማት ክፍል ኦዲት ተጠሪ',
    'የባች ክፍል ኦዲት ተጠሪ',
    'የመረጃ ክፍል ኦዲት ተጠሪ',
    'የሙያ ክፍል ኦዲት ተጠሪ',
    'የቋንቋ ክፍል ኦዲት ተጠሪ',
    'የሂሳብ እና ንብረት ክፍል ኦዲት ተጠሪ',
    'ሌላ'
  ] : isTimhirtDept ? [
    'ምክትል ትምህርት ክፍል ተጠሪ',
    'ጸሃፊ',
    'የትምህርት ክፍል ኦዲት',
    'የአብነት ክፍል ተጠሪ',
    'የመምህር ምደባ ንዑስ ክፍል',
    'ሽያጭ ክፍል ንዑስ',
    'የሃዋርያዊ አገልግሎት ንዑስ ክፍል',
    'አስተባባሪ',
    'ሌላ'
  ] : isLmatDept ? [
    'ምክትል የልማት ክፍል ተጠሪ',
    'የልማት ክፍል ጸሃፊ',
    'የልማት ክፍል ኦዲት',
    'የልማት ዳቦ ክፍል ተጠሪ',
    'የልማት ነጠላ ክፍል ተጠሪ',
    'ሌላ'
  ] : isBachDept ? [
    'የባች ክፍል ምክትል ተጠሪ',
    'የባች ክፍል ጸሃፊ',
    'የባች ክፍል ምክክር ተጠሪ',
    'የባች ክፍል መርሃግብር ጥራት ተጠሪ',
    'የባች ክፍል ጽዋ ተጠሪ',
    'የባች ክፍል ኦዲት ተጠሪ',
    'ሌላ'
  ] : isMerjaDept ? [
    'የመረጃ ክፍል ምክትል ተጠሪ',
    'የመረጃ ክፍል ጸሃፊ',
    'የመረጃ ክፍል ኦድት ተጠሪ',
    'የመረጃ ክፍል እቅድ እና ክትትል ተጠሪ',
    'የመረጃ ክፍል መረጃ እና ማደራጃ ተጠሪ',
    'ሌላ'
  ] : isMuyaDept ? [
    'የሙያ ክፍል ምክትል ተጠሪ',
    'የሙያ ክፍል ጸሃፊ',
    'የሙያ ክፍል ኦዲት',
    'የሙያ ክፍል በጎ አድራጎት ተጠሪ',
    'የሙያ ክፍል ነጻ ሙያ ተጠሪ',
    'የሙያ ክፍል ቤተ መጽሃፍት ተጠሪ',
    'የሙያ ክፍል እደ ጥበብ ተጠሪ',
    'የሙያ ክፍል ቲቶሪያል ተጠሪ',
    'ሌላ'
  ] : isMezmurDept ? [
    'የመዝሙር ክፍል ምክትል ተጠሪ',
    'የመዝሙር ክፍል ጸሃፊ',
    'የመዝሙር ክፍል ኦዲት ተጠሪ',
    'የመዝሙር ክፍል ንኡስ ተጠሪ',
    'የመዝሙር ክፍል ኪነጥበብ ተጠሪ',
    'የመዝሙር ክፍል ስነ ስእል ተጠሪ',
    'የመዝሙር ክፍል አባላት በእህቶች ተጠሪ',
    'የመዝሙር ክፍል አባላት በወንድሞች ተጠሪ',
    'ሌላ'
  ] : isAbalatDept ? [
    'የአባላት ክፍል ምክትል ተጠሪ',
    'የአባላት ክፍል ጸሃፊ',
    'የአባላት ክፍል ኦድት ተጠሪ',
    'የአባላት ክፍል ክትትል ተጠሪ',
    'የአባላት ክፍል ምክክር ተጠሪ',
    'የአባላት ክፍል ንሰሃ እና ቅዱስ ቁርባን ተጠሪ',
    'ሌላ'
  ] : [
    'ምክትል ተጠሪ',
    'ጸሃፊ',
    'ክትትል ንዑስ ተጠሪ',
    'ንሰሃ እና ቅዱስ ቁርባን ንዑስ',
    'የአባላት ኦድት ንዑስ ተጠሪ',
    'ምክክር ንዑስ ተጠሪ',
    'ሌላ'
  ];

  const generatePassword = (length = 8) => {
    const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#!';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const generateUsername = (firstName = '', fatherName = '') => {
    const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
    return `${clean(firstName)}_${clean(fatherName)}${Math.floor(100 + Math.random() * 900)}`;
  };

  const executiveRolesAll = [
    { role: 'sebsabi', name: 'ሰብሳቢ' },
    { role: 'meketel_sebsabi', name: 'ምክትል ሰብሳቢ' },
    { role: 'tsehafy', name: 'ጸሀፊ' },
    { role: 'abalat_guday', name: 'አባላት ጉዳይ ተጠሪ' },
    { role: 'timhirt', name: 'ትምህርት ክፍል ተጠሪ' },
    { role: 'bach', name: 'ባች ክፍል ተጠሪ' },
    { role: 'mezmur', name: 'መዝሙር ክፍል ተጠሪ' },
    { role: 'muya', name: 'ሙያ ክፍል ተጠሪ' },
    { role: 'lmat', name: 'ልማት ክፍል ተጠሪ' },
    { role: 'audit', name: 'ኦዲት ክፍል ተጠሪ' },
    { role: 'merja', name: 'መረጃ ክፍል ተጠሪ' },
    { role: 'hisab', name: 'ሂሳብ ክፍል ተጠሪ' },
    { role: 'kwanqwa', name: 'ቋንቋ ክፍል ተጠሪ' },
    ...(currentUser?.role === 'super_admin' ? [{ role: 'admin', name: 'ሥርዓት አድሚን (System Admin)' }] : [])
  ];

  const subExecutiveRole = { role: 'sub_executive', name: 'ንኡስ ተጠሪ (Sub Executive)' };

  // Determine active roles based on mode
  const executiveRoles = mode === 'sub_exec' ? [subExecutiveRole] : executiveRolesAll;

  // App.js passes mode='sub_exec' for the Sub Executive page
  const isManagingSubExecs = mode === 'sub_exec' || !['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(currentUser?.role);

  const fetchTerms = async () => {
    try {
      const res = await axios.get("/settings/terms", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        setTerms(res.data.terms);
        if (res.data.terms.length > 0 && !selectedTerm) {
          setSelectedTerm(res.data.terms[0]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchExecutives = async () => {
    try {
      const url = selectedTerm ? `/auth/users?term=${selectedTerm}` : `/auth/users`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      const currentDept = currentUser.departmentAmharic || currentUser.department;
      let list = [];
      if (mode === 'sub_exec') {
        // Only show sub-executives. Admins see all sub-execs, others see only their own.
        if (['super_admin', 'admin'].includes(currentUser?.role)) {
          list = response.data.filter(user => user.role === 'sub_executive');
        } else {
          list = response.data.filter(user => user.role === 'sub_executive' && (user.departmentAmharic === currentDept || user.department === currentDept));
        }
      } else {
        // Core Executives mode (Admins see Executives, others see only their own sub-executives (handled by layout logic))
        if (!isManagingSubExecs) {
          list = response.data.filter(user => {
            const isExecRole = executiveRolesAll.some(r => r.role === user.role);
            const isAdminRole = user.role === 'admin';
            const isSuperAdminRole = user.role === 'super_admin';
            // Super Admin sees everything inclusive of Admins. Regular Admin doesn't see other Admins.
            if (currentUser?.role === 'super_admin') return isExecRole || isAdminRole || isSuperAdminRole;
            return isExecRole && !isAdminRole && !isSuperAdminRole;
          });

          // Sort to put Admins at the top
          list.sort((a, b) => {
            const rolesOrder = ['super_admin', 'admin'];
            const aIdx = rolesOrder.indexOf(a.role);
            const bIdx = rolesOrder.indexOf(b.role);
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
            if (aIdx !== -1) return -1;
            if (bIdx !== -1) return 1;
            return 0;
          });
        } else {
          list = response.data.filter(user => user.role === 'sub_executive' && (user.departmentAmharic === currentDept || user.department === currentDept));
        }
      }
      setExecutives(list);
    } catch (error) {
      console.error("Error fetching executives:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isManagingSubExecs) {
      setFormData(prev => ({ 
        ...prev, 
        role: "sub_executive", 
        department: currentUser?.departmentAmharic || currentUser?.department || "",
        leaderName: currentUser?.name || "",
        term: selectedTerm || currentUser?.term || ""
      }));
    } else {
      setFormData(prev => ({ ...prev, role: "", department: "", term: selectedTerm || "" }));
    }
    fetchExecutives();

    const handleClickOutside = (e) => {
      if (!e.target.closest('.exec-dropdown-container')) setActiveMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isManagingSubExecs, currentUser, mode, activeMenu, showSuspended, selectedTerm]);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    
    const amharicFields = ['firstName', 'fatherName', 'grandFatherName', 'region', 'zone', 'woreda'];
    if (amharicFields.includes(name)) {
      const amharicRegex = /^[\u1200-\u137F\s/]*$/;
      if (value !== '' && !amharicRegex.test(value)) return;
    }
    if (name === 'kebele') {
      if (value !== '' && !/^[\u1200-\u137F\s/0-9]*$/.test(value)) return;
    }
    if (name === 'phone') {
      if (value !== '' && !/^[0-9]*$/.test(value)) return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'role') {
      const selected = executiveRoles.find(r => r.role === value);
      if (selected) {
        setFormData(prev => ({ ...prev, department: selected.name }));
      }
    }

    if ((name === 'firstName' || name === 'fatherName') && !editingExecutive) {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        const username = generateUsername(updated.firstName || '', updated.fatherName || '');
        return { ...updated, email: prev._emailManuallyEdited ? prev.email : username };
      });
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (user) => {
    const nameParts = (user.name || "").trim().split(/\s+/);
    setEditingExecutive(user._id);
    setFormData({
      firstName: nameParts[0] || "",
      fatherName: nameParts[1] || "",
      grandFatherName: nameParts[2] || "",
      email: user.email || "",
      password: "", 
      role: user.role || "",
      department: user.department || "",
      phone: user.phone || "",
      region: user.region || "",
      zone: user.zone || "",
      woreda: user.woreda || "",
      kebele: user.kebele || "",
      leaderName: user.leaderName || currentUser?.name || "",
      term: user.term || "",
      subRoleDescription: responsibilities.includes(user.subRoleDescription) ? user.subRoleDescription : (user.subRoleDescription ? 'ሌላ' : ''),
      academicDepartment: user.academicDepartment || "",
      photo: user.photo || ""
    });
    if (user.subRoleDescription && !responsibilities.includes(user.subRoleDescription)) {
      setCustomResponsibility(user.subRoleDescription);
    } else {
      setCustomResponsibility("");
    }
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullName = `${formData.firstName} ${formData.fatherName} ${formData.grandFatherName}`.trim();
    
    try {
      if (editingExecutive) {
        const updateData = { 
          ...formData,
          name: fullName,
          subRoleDescription: formData.subRoleDescription === 'ሌላ' ? customResponsibility : formData.subRoleDescription
        };
        if (!updateData.password) delete updateData.password;

        await axios.put(`/auth/user/${editingExecutive}`, updateData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("አመራር በተሳካ ሁኔታ ተስተካክሏል (Executive updated)");
      } else {
        const finalData = { 
          ...formData,
          name: fullName,
          subRoleDescription: formData.subRoleDescription === 'ሌላ' ? customResponsibility : formData.subRoleDescription
        };
        await axios.post("/auth/register-user", finalData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success("አመራር በተሳካ ሁኔታ ተመዝግቧል (Executive added)");
      }
      resetForm();
      fetchExecutives();
    } catch (error) {
      console.error("Error saving executive:", error);
      toast.error(error.response?.data?.message || "ማስቀመጥ አልተሳካም (Save failed)");
    }
  };

  const resetForm = () => {
    setShowAddForm(false);
    setShowPassword(false);
    setEditingExecutive(null);
    setFormData({ 
      firstName: "", 
      fatherName: "", 
      grandFatherName: "", 
      email: "", 
      password: "", 
      role: isManagingSubExecs ? "sub_executive" : "", 
      department: isManagingSubExecs ? (currentUser?.departmentAmharic || currentUser?.department || "") : "", 
      phone: "", 
      region: "",
      zone: "",
      woreda: "",
      kebele: "",
      leaderName: currentUser?.name || "",
      term: selectedTerm || currentUser?.term || "",
      subRoleDescription: "",
      academicDepartment: "",
      photo: ""
    });
    setCustomResponsibility("");
  };

  const handleToggleStatus = async (id, statusParam) => {
    try {
      const currentStatus = statusParam === true;
      await axios.patch(`/auth/user/${id}/status`, { isActive: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`አካውንቱ ${!currentStatus ? 'ተከፍቷል' : 'ታግዷል'} (Status updated)`);
      fetchExecutives();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error(error.response?.data?.message || "ሁኔታውን መለወጥ አልተቻለም (Failed to toggle status)");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("እርግጠኛ ነዎት ይህን አመራር መሰረዝ ይፈልጋሉ? (Are you sure you want to delete this executive?)")) return;
    try {
      await axios.delete(`/auth/user/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("አመራር ተሰርዟል (Deleted successfully)");
      if (editingExecutive === id) resetForm();
      fetchExecutives();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error("መሰረዝ አልተሳካም (Deletion failed)");
    }
  };

  const handleResetPassword = async (user) => {
    const newPwd = window.prompt(`ለአመራር ${user.name} አዲስ የይለፍ ቃል ያስገቡ (Enter new password for ${user.name}):`);
    if (!newPwd) return;
    if (newPwd.length < 4) return toast.error("የይለፍ ቃል ቢያንስ 4 ቁምፊ መሆን አለበት (Min 4 characters)");

    try {
      await axios.post(`/auth/reset-password/${user._id}`, { newPassword: newPwd }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("የይለፍ ቃል በስኬት ተቀይሯል! (Password reset successfully)");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error(error.response?.data?.message || "መቀየር አልተቻለም (Reset failed)");
    }
  };

  if (loading) return (
    <div className="loading-state" style={{ marginTop: '50px' }}>
      <div className="spinner" style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
      <p>Loading Staff Data...</p>
    </div>
  );

  return (
    <div className="executive-mgmt" style={{ animation: 'fadeIn 0.3s ease' }}>
      
      <div className="role-banner banner-merja" data-symbol="👥" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #1e3a8a, #1e40af, #3b82f6)' }}>
        <div className="banner-icon">{!isManagingSubExecs ? '👔' : '👥'}</div>
        <div className="banner-text">
          <h2 className="banner-title">
            {!isManagingSubExecs 
              ? 'የሥራ አስፈጻሚዎች ማስተዳደሪያ (Manage Core Executives)' 
              : `የንኡስ ተጠሪዎች ማስተዳደሪያ (Manage Sub-Executives) ${['super_admin', 'admin'].includes(currentUser?.role) ? '' : '- ' + currentUser?.departmentAmharic}`
            }
          </h2>
          <p className="banner-subtitle">
            {!isManagingSubExecs 
              ? 'Register, replace, and manage fellowship executives and department leads.' 
              : 'Manage and organize departmental sub-executives (ንኡስ ተጠሪዎች).'}
          </p>
        </div>
        <div className="banner-stats">
          <div className="banner-stat">
            <span className="banner-stat-num">{executives.length}</span>
            <span className="banner-stat-lbl">Active Staff</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>{!isManagingSubExecs ? 'የሥራ አስፈጻሚዎች ዝርዝር (Executives List)' : 'የንኡስ ተጠሪዎች ዝርዝር (Sub-Executives List)'}</h3>
            <span className="badge badge-primary">{executives.length}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Term Selector */}
            <select
              className="form-control"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              style={{ padding: '6px 12px', height: '34px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', width: 'auto' }}
            >
              {terms.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', padding: '6px 12px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
              <span>Active</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', marginLeft: '10px' }}></span>
              <span>Inactive</span>
            </div>
            {selectedId && (() => {
              const sel = executives.find(u => u._id === selectedId);
              return (
                <div className="exec-dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setActiveMenu(m => !m)}
                    style={{ border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'center', fontWeight: '600' }}
                  >
                    <span>Actions for Selected</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#64748b' }} />
                    </div>
                  </button>
                  {activeMenu && sel && (
                    <div style={{ position: 'absolute', right: 0, top: '45px', background: '#fff', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '190px', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
                      <button onClick={() => { setViewingExecutive(sel); setActiveMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>📄 Detail</button>
                      <button onClick={() => { handleEditClick(sel); setActiveMenu(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>✏️ Edit Profile</button>
                      <button onClick={() => { handleResetPassword(sel); setActiveMenu(false); setSelectedId(null); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>🔑 Reset Password</button>
                      
                      {(sel._id !== (currentUser?.id || currentUser?._id)) && (
                        <>
                          <button onClick={() => { handleToggleStatus(sel._id, sel.isActive !== false); setActiveMenu(false); setSelectedId(null); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {sel.isActive !== false ? '🚫 Block' : '✅ Activate'}
                          </button>
                          <div style={{ height: '1px', background: '#f1f5f9' }} />
                          <button onClick={() => { handleDelete(sel._id); setActiveMenu(false); setSelectedId(null); }} style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>🗑️ Delete</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {!showAddForm && (
              <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
                {!isManagingSubExecs ? '➕ አዲስ ሥራ አስፈጻሚ (Add Executive)' : '➕ አዲስ ንኡስ ተጠሪ (Add Sub-Executive)'}
              </button>
            )}
          </div>
        </div>

        {showAddForm && (
          <div style={{ 
            background: '#ffffff', 
            padding: '30px', 
            borderRadius: '20px', 
            border: '1px solid #e2e8f0', 
            marginBottom: '30px', 
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
            maxWidth: '800px',
            margin: '0 auto 30px auto',
            animation: 'slideDown 0.4s ease-out',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button 
              onClick={() => { setShowAddForm(false); setEditingExecutive(null); }}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '18px',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              &times;
            </button>
            <div style={{ marginBottom: '25px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                {editingExecutive ? '✏️' : '✨'}
              </div>
              <div>
                <h4 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem', fontWeight: '700' }}>
                  {editingExecutive 
                    ? (isManagingSubExecs ? 'ሀላፊነት አስተካክል (Edit Staff)' : 'መረጃ አስተካክል (Edit Executive)') 
                    : (isManagingSubExecs ? 'አዲስ ንኡስ ተጠሪ መዝግብ (Register Staff)' : 'አዲስ ስራ አስፈጻሚ መዝግብ')}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {isManagingSubExecs 
                    ? <>Managing sub-executives for <strong>{formData.department}</strong>.</>
                    : <>Registering a member of the <strong>Core Executive Team</strong>.</>
                  }
                </p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="register-form">
              {/* Photo Upload Section */}
              <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {formData.photo ? (
                    <img src={formData.photo} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '32px' }}>👤</span>
                  )}
                  {formData.photo && (
                    <button 
                      type="button" 
                      onClick={() => setFormData(prev => ({ ...prev, photo: "" }))}
                      style={{ position: 'absolute', bottom: 0, right: 0, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                    >
                      &times;
                    </button>
                  )}
                </div>
                <label style={{ cursor: 'pointer', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'underline' }}>
                  {formData.photo ? 'Change Photo' : 'Upload Staff Photo (Optional)'}
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
                </label>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>ስም (First Name)</label>
                  <input className="form-control" type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required style={{ borderRadius: '10px' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>የአባት (Father)</label>
                  <input className="form-control" type="text" name="fatherName" value={formData.fatherName} onChange={handleInputChange} required style={{ borderRadius: '10px' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>የአያት (Grandfather)</label>
                  <input className="form-control" type="text" name="grandFatherName" value={formData.grandFatherName} onChange={handleInputChange} required style={{ borderRadius: '10px' }} />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>መለያ (Username)</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input className="form-control" type="text" name="email" value={formData.email} onChange={e => { if (/^[a-zA-Z0-9_\-./@]*$/.test(e.target.value)) setFormData(prev => ({ ...prev, email: e.target.value, _emailManuallyEdited: true })) }} required style={{ flex: 1, borderRadius: '10px' }} />
                    <button type="button" title="Regenerate" onClick={() => setFormData(prev => ({ ...prev, email: generateUsername(formData.firstName || '', formData.fatherName || ''), _emailManuallyEdited: false }))} style={{ width: '38px', height: '38px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔄</button>
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>ስልክ ቁጥር (Phone)</label>
                  <input className="form-control" type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="09..." style={{ borderRadius: '10px' }} />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>ትምህርት ክፍል (Academic Dept)</label>
                  <select className="form-control" name="academicDepartment" value={formData.academicDepartment} onChange={handleInputChange} required style={{ borderRadius: '10px' }}>
                    <option value="">ክፍል ይምረጡ</option>
                    <option value="Software engineering">Software engineering</option>
                    <option value="Computer science">Computer science</option>
                    <option value="information Technology">information Technology</option>
                    <option value="information system">information system</option>
                    <option value="electrical engineering">electrical engineering</option>
                    <option value="Mechatronics engineering">Mechatronics engineering</option>
                    <option value="Mechanical engineering">Mechanical engineering</option>
                    <option value="Civil engineering">Civil engineering</option>
                    <option value="Textile engineering">Textile engineering</option>
                    <option value="Water Resource and Irrigation engineering">Water Resource and Irrigation engineering</option>
                    <option value="Industrial engineering">Industrial engineering</option>
                    <option value="Cotem engineering">Cotem engineering</option>
                    <option value="Garment engineering">Garment engineering</option>
                    <option value="Leather engineering">Leather engineering</option>
                    <option value="Chemical engineering">Chemical engineering</option>
                    <option value="Food Engineering">Food Engineering</option>
                    <option value="Construction Technology and Management">Construction Technology and Management</option>
                    <option value="Hydraulics">Hydraulics</option>
                    <option value="Biomedical Engineering">Biomedical Engineering</option>
                    <option value="Fashion design">Fashion design</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Msc">Msc</option>
                    <option value="የለም/ሌላ">የለም/ሌላ</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #edf2f7', marginBottom: '20px' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ክልል (Region)</label>
                    <input className="form-control form-control-sm" type="text" name="region" value={formData.region} onChange={handleInputChange} style={{ borderRadius: '8px' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ዞን (Zone)</label>
                    <input className="form-control form-control-sm" type="text" name="zone" value={formData.zone} onChange={handleInputChange} style={{ borderRadius: '8px' }} />
                  </div>
                </div>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ወረዳ (Woreda)</label>
                    <input className="form-control form-control-sm" type="text" name="woreda" value={formData.woreda} onChange={handleInputChange} style={{ borderRadius: '8px' }} />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>ቀበሌ (Kebele)</label>
                    <input className="form-control form-control-sm" type="text" name="kebele" value={formData.kebele} onChange={handleInputChange} style={{ borderRadius: '8px' }} />
                  </div>
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>
                    {!isManagingSubExecs ? 'የሥራ አስፈጻሚው ሃላፊነት' : 'የንኡስ ተጠሪው ሃላፊነት (Sub-Role)'}
                  </label>
                  <select className="form-control" name="subRoleDescription" value={formData.subRoleDescription} onChange={handleInputChange} required style={{ borderRadius: '10px', borderColor: 'var(--primary-light)' }}>
                    <option value="">ሃላፊነት ይምረጡ</option>
                    {!isManagingSubExecs ? (
                      executiveRolesAll.map(r => <option key={r.role} value={r.name}>{r.name}</option>)
                    ) : (
                      responsibilities.map(r => <option key={r} value={r}>{r}</option>)
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>መዝጋቢ/ሀላፊ (Assigned By)</label>
                  <input className="form-control" type="text" value={formData.leaderName} readOnly style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#475569', borderRadius: '10px' }} />
                </div>
              </div>

              {formData.subRoleDescription === 'ሌላ' && (
                <div className="form-group animate-slide-down" style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', marginBottom: '6px', display: 'block' }}>ሌላ ተግባር/ሃላፊነት (Specify Responsibility)</label>
                  <input className="form-control" type="text" value={customResponsibility} onChange={e => setCustomResponsibility(e.target.value)} required placeholder="ተግባሩን እዚህ ይጻፉ..." style={{ borderRadius: '10px', border: '1px solid var(--primary-light)' }} />
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '25px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', marginBottom: '6px', display: 'block' }}>የይለፍ ቃል (Password)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="form-control" type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleInputChange} required={!editingExecutive} placeholder={editingExecutive ? "New password (optional)" : "Set password"} style={{ flex: 1, borderRadius: '10px' }} />
                  <button type="button" onClick={() => { const p = generatePassword(); setFormData(prev => ({ ...prev, password: p })); setShowPassword(true); }} style={{ padding: '0 15px', background: '#ecfdf5', color: '#059669', border: '1px solid #10b981', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>⚡ Auto</button>
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{ width: '42px', height: '42px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', fontSize: '18px' }}>{showPassword ? '🙈' : '👁️'}</button>
                </div>
                {showPassword && formData.password && <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', fontSize: '12px', color: '#92400e', fontWeight: '600', border: '1px solid #fde68a' }}>Generated: {formData.password}</div>}
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary btn-block" style={{ flex: 2, padding: '14px', borderRadius: '12px', fontWeight: '700', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                  {editingExecutive ? 'አስተካክል (Complete Update)' : 'መዝግብ (Register Staff)'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b' }}>ሰርዝ (Cancel)</button>
              </div>
            </form>
          </div>
        )}


        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ስም (Name)</th>
                <th>ሃላፊነት (Role)</th>
                <th>መለያ (Username)</th>
                <th>ስልክ (Phone)</th>
                <th>ዘመን (Term)</th>
                <th>ሁኔታ (Status)</th>
                <th>ድርጊት (Action)</th>
              </tr>
            </thead>
            <tbody>
              {executives.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>ምንም አመራር አልተገኘም (No staff found)</td></tr>
              ) : (
                executives.map(user => (
                    <tr
                      key={user._id}
                      onClick={() => setSelectedId(selectedId === user._id ? null : user._id)}
                      style={{ 
                        cursor: 'pointer', 
                        background: selectedId === user._id ? '#e0f2fe' : editingExecutive === user._id ? '#e0e7ff' : user.isActive === false ? '#f8fafc' : undefined, 
                        borderLeft: selectedId === user._id ? '4px solid #0369a1' : undefined,
                        opacity: user.isActive === false ? 0.75 : 1
                      }}
                    >
                    <td style={{ fontWeight: '600' }}>{user.name}</td>
                    <td><span className="badge badge-success">{user.department}</span></td>
                    <td>{user.email}</td>
                    <td>{user.phone || '—'}</td>
                    <td><span className="role-chip">{user.term}</span></td>
                    <td>
                      <span className={`status-pill ${user.isActive !== false ? 'active' : 'inactive'}`} style={{ fontSize: '0.7rem' }}>
                        {user.isActive !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      {user._id !== (currentUser?.id || currentUser?._id) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(user._id, user.isActive !== false); }}
                          className={`action-btn-pill ${user.isActive !== false ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '6px 12px', fontSize: '0.7rem', border: 'none', borderRadius: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                        >
                          {user.isActive !== false ? '🚫 Block' : '✅ Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {viewingExecutive && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '90%', maxWidth: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, color: 'var(--primary)' }}>📄 የአመራር ዝርዝር መረጃ (Executive Details)</h3>
              <button onClick={() => setViewingExecutive(null)} style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ width: '80px', height: '80px', background: '#e0e7ff', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', overflow: 'hidden' }}>
                  {viewingExecutive.photo ? (
                    <img src={viewingExecutive.photo} alt={viewingExecutive.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    viewingExecutive.name?.charAt(0) || '👤'
                  )}
                </div>
                <div>
                  <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem', color: '#1e293b' }}>{viewingExecutive.name}</h2>
                  <div style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' }}>@{viewingExecutive.email}</div>
                  <span className="badge badge-success">{viewingExecutive.department}</span>
                  <span className={`status-pill ${viewingExecutive.isActive !== false ? 'active' : 'inactive'}`} style={{ marginLeft: '10px' }}>
                    {viewingExecutive.isActive !== false ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569' }}>📞 አድራሻ እና ስልክ (Contact)</h4>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Phone:</strong> {viewingExecutive.phone || 'N/A'}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Region/Zone:</strong> {[viewingExecutive.region, viewingExecutive.zone].filter(Boolean).join(', ') || 'N/A'}</p>
                    <p style={{ margin: 0 }}><strong>Woreda/Kebele:</strong> {[viewingExecutive.woreda, viewingExecutive.kebele].filter(Boolean).join(', ') || 'N/A'}</p>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#475569' }}>📋 ተጨማሪ መረጃ (Additional Info)</h4>
                  <div style={{ fontSize: '0.85rem', color: '#334155' }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Term:</strong> {viewingExecutive.term || 'N/A'}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Academic:</strong> {viewingExecutive.academicDepartment || 'N/A'}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Assigned By:</strong> {viewingExecutive.leaderName || 'N/A'}</p>
                    <p style={{ margin: 0 }}><strong>Role:</strong> {viewingExecutive.role}</p>
                  </div>
                </div>
              </div>

              {viewingExecutive.subRoleDescription && (
                <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#166534' }}>ተግባር/ሃላፊነት (Role Description)</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#15803d', lineHeight: '1.5' }}>
                    {viewingExecutive.subRoleDescription}
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding: '20px 30px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', textAlign: 'right' }}>
              <button 
                onClick={() => setViewingExecutive(null)} 
                className="btn btn-primary"
                style={{ padding: '8px 24px', borderRadius: '8px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutiveManagement;

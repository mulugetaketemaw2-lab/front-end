import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import { greToEth } from "./utils/ethiopianDate";

// Missing components tracking// Views
import Dashboard from "./components/Dashboard";
import SystemSettings from "./pages/SystemSettings";
import ExecutiveManagement from "./pages/ExecutiveManagement.jsx";
import Members from "./components/Members";
import AllMembersList from "./components/AllMembersList";
import Attendance from "./components/Attendance";
import Subgroups from "./components/Subgroups";
import MerjaDashboard from "./pages/MerjaDashboard";
import DeptReport from "./pages/DeptReport";
import FinanceDashboard from "./components/FinanceDashboard";
import PendingApprovals from "./components/PendingApprovals";
import AuditDashboard from "./pages/AuditDashboard";
import BegenaMembers from "./components/BegenaMembers";
import SubstituteTeachers from "./components/SubstituteTeachers";
import SubstituteLeaders from "./components/SubstituteLeaders";
import SubstituteAttendancePage from "./pages/SubstituteAttendancePage";
import SubstituteHistoryPage from "./pages/SubstituteHistoryPage";
import Mezemran from "./components/Mezemran";
import Deacons from "./components/Deacons";
import CommunicationCenter from "./components/CommunicationCenter";
import AnnouncementsPage from "./components/AnnouncementsPage";
import MessagesPage from "./components/MessagesPage";
import MemberSelfRegistration from "./components/MemberSelfRegistration";
import YearTransitionManager from "./components/YearTransitionManager";
// MerjaDashboard could be imported but the file name mismatch can be tricky.
// We will stick to the basic ones first.

import logo from "./logo.png";
import "./App.css"; 

// Import login backgrounds
import bg1 from "./assets/bg1.png";
import bg3 from "./assets/bg3.png";
import bg4 from "./assets/bg4.png";
import bg8 from "./assets/bg8.png";

const backgrounds = [bg1, bg3, bg4, bg8];

// ─── Networking / API URL ────────────────────────────────────
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://localhost:5001/api";
  }
  return "/api";
};

axios.defaults.baseURL = getApiUrl();
console.log(`🌐 System API: ${axios.defaults.baseURL}`);

// ─── Set auth token immediately at startup (prevents 401 race condition) ──
const _savedToken = localStorage.getItem('token');
if (_savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${_savedToken}`;
}

// ─── Password / Username generators ──────────────────────────
const generatePassword = (length = 8) => {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#!';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
const generateUsername = (firstName = '', fatherName = '') => {
  // Try to clean name (keep only a-z0-9)
  const clean = s => s.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  let base1 = clean(firstName);
  let base2 = clean(fatherName);
  
  // If cleaning results in empty (e.g. Amharic names), use a fallback prefix
  if (!base1 && !base2) {
    return `user_${Math.floor(10000 + Math.random() * 90000)}`;
  }
  
  const prefix = base1 || 'u';
  const suffix = base2 || '';
  return `${prefix}${suffix ? '_' + suffix : ''}${Math.floor(10000 + Math.random() * 90000)}`;
};

// ─── Role Config ──────────────────────────────────────────────
const ROLE_CONFIG = {
  super_admin: { label: 'Super Admin', icon: '⭐', bannerClass: 'banner-super-admin', color: '#7c3aed' },
  admin: { label: 'System Admin', icon: '👑', bannerClass: 'banner-admin', color: '#4f46e5' },
  sebsabi: { label: 'Chairperson', icon: '🏛️', bannerClass: 'banner-sebsabi', color: '#334155' },
  meketel_sebsabi: { label: 'Vice Chairperson', icon: '🏛️', bannerClass: 'banner-meketel', color: '#1d4ed8' },
  tsehafy: { label: 'Secretary', icon: '📝', bannerClass: 'banner-tsehafy', color: '#3b82f6' },
  abalat_guday: { label: 'Member Affairs', icon: '👥', bannerClass: 'banner-abalat', color: '#047857' },
  merja: { label: 'Information Dept', icon: '📊', bannerClass: 'banner-merja', color: '#b45309' },
  timhirt: { label: 'Education Dept', icon: '📚', bannerClass: 'banner-timhirt', color: '#c2410c' },
  mezmur: { label: 'Music Dept', icon: '🎵', bannerClass: 'banner-mezmur', color: '#7c3aed' },
  bach: { label: 'Batch Dept', icon: '🎓', bannerClass: 'banner-bach', color: '#0891b2' },
  muya: { label: 'Skills Dept', icon: '💼', bannerClass: 'banner-muya', color: '#15803d' },
  lmat: { label: 'Development Dept', icon: '🌱', bannerClass: 'banner-lmat', color: '#166534' },
  kwanqwa: { label: 'Language Dept', icon: '🗣️', bannerClass: 'banner-kwanqwa', color: '#1e40af' },
  hisab: { label: 'Finance Dept', icon: '💰', bannerClass: 'banner-hisab', color: '#92400e' },
  audit: { label: 'Audit', icon: '🔍', bannerClass: 'banner-audit', color: '#374151' },
  member: { label: 'Member', icon: '👤', bannerClass: 'banner-member', color: '#475569' },
};

// ─── Notification Bell ────────────────────────────────────────
const NotificationBell = ({ token, onGoToApprovals }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifAvailable, setNotifAvailable] = useState(true);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!notifAvailable) return;
    try {
      const { data } = await axios.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread || 0);
    } catch (err) {
      if (err?.response?.status === 404) {
        setNotifAvailable(false);
      }
    }
  }, [token, notifAvailable]);

  useEffect(() => {
    if (!notifAvailable) return;
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await axios.put('/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 60000);
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="header-icon-btn"
        title="Notifications"
        onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
        style={{ position: 'relative' }}
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '2px', right: '2px',
            background: '#ef4444', color: '#fff',
            borderRadius: '50%', fontSize: '10px', fontWeight: '700',
            minWidth: '16px', height: '16px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            padding: '0 3px', pointerEvents: 'none'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: '340px', background: '#fff', borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 9999,
          border: '1px solid #e5e7eb', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderBottom: '1px solid #f1f5f9',
            background: '#f8fafc'
          }}>
            <span style={{ fontWeight: '700', fontSize: '15px' }}>🔔 Notifications</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  fontSize: '11px', background: 'none', border: 'none',
                  color: '#047857', cursor: 'pointer', fontWeight: '600'
                }}>Mark all read</button>
              )}
              {onGoToApprovals && (
                <button onClick={() => { setOpen(false); onGoToApprovals(); }} style={{
                  fontSize: '11px', background: '#dcfce7', border: 'none',
                  color: '#047857', cursor: 'pointer', fontWeight: '700',
                  padding: '3px 8px', borderRadius: '6px'
                }}>Go to Approvals ✅</button>
              )}
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n._id}
                  onClick={() => !n.read && markRead(n._id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    background: n.read ? '#fff' : '#f0fdf4',
                    cursor: n.read ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex', gap: '10px', alignItems: 'flex-start'
                  }}
                >
                  <span style={{ fontSize: '20px', marginTop: '2px' }}>
                    {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : '🔔'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: n.read ? '500' : '700', fontSize: '13px', color: '#1e293b' }}>
                      {n.title}
                      {!n.read && <span style={{ marginLeft: '6px', display: 'inline-block', width: '7px', height: '7px', background: '#22c55e', borderRadius: '50%' }} />}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', wordBreak: 'break-word' }}>{n.message}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{timeAgo(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Login Component ──────────────────────────────────────────
const Login = ({ onLogin, theme, toggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginRole, setLoginRole] = useState('Admin');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'reset'
  const [resetForm, setResetForm] = useState({ username: '', newPassword: '', confirmPassword: '' });
  const [resetLoading, setResetLoading] = useState(false);
  const [resetShowPwd, setResetShowPwd] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIndex(prev => (prev + 1) % backgrounds.length);
    }, 3500); 
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!loginRole) return toast.error('እባክዎ ሚናዎን ይምረጡ (Please select your role)');
    setLoading(true);
    try {
      const { data } = await axios.post('/auth/login', { username, password, roleType: loginRole });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Logged in successfully!');
      onLogin(data.token, data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid username or password');
    } finally { setLoading(false); }
  };

  const handleReset = async e => {
    e.preventDefault();
    if (resetForm.newPassword !== resetForm.confirmPassword) return toast.error('Passwords do not match');
    if (resetForm.newPassword.length < 4) return toast.error('Password must be at least 4 characters');
    setResetLoading(true);
    try {
      await axios.post('/auth/forgot-password', {
        username: resetForm.username,
        newPassword: resetForm.newPassword,
        confirmPassword: resetForm.confirmPassword
      });
      setResetDone(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally { setResetLoading(false); }
  };

  const backToLogin = () => {
    setMode('login');
    setResetForm({ username: '', newPassword: '', confirmPassword: '' });
    setResetDone(false);
  };

  if (mode === 'reset') {
    return (
      <div className="login-container">
        {backgrounds.map((bg, idx) => (
          <div 
            key={idx}
            className={`login-bg-layer ${idx === bgIndex ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.2)), url(${bg})` }}
          />
        ))}
        <div className="login-box">
          <div className="login-header">
            <img src={logo} alt="MK Logo" className="login-logo-img" />
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1e1b4b', marginBottom: '4px' }}>ወ/ዩ/ኮ/ካምፓስ</h1>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#4f46e5', marginTop: '0' }}>ግቢ ጉባኤ</h2>
          </div>

          {resetDone ? (
            <div style={{ textAlign: 'center', padding: '10px 0', animation: 'fadeIn 0.5s ease' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              <h3 style={{ color: '#10b981', marginBottom: '10px', fontSize: '1.25rem' }}>Password Reset!</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                Your password has been changed successfully.<br />You can now log in with your new credentials.
              </p>
              <button onClick={backToLogin} className="login-btn" style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg, #10b981, #059669)' }}>Back to Login</button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '25px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#1e293b' }}>Reset Password</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>Enter your credentials to set a new password</p>
              </div>

              <form onSubmit={handleReset} className="login-form">
                <div className="form-group">
                  <label>Username</label>
                  <div className="input-with-icon">
                    <span className="input-icon">👤</span>
                    <input 
                      type="text" 
                      value={resetForm.username} 
                      onChange={e => setResetForm(p => ({ ...p, username: e.target.value }))} 
                      placeholder="Enter your username" 
                      required 
                      disabled={resetLoading} 
                      autoFocus 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon">🔒</span>
                    <input 
                      type={resetShowPwd ? 'text' : 'password'} 
                      value={resetForm.newPassword} 
                      onChange={e => setResetForm(p => ({ ...p, newPassword: e.target.value }))} 
                      placeholder="Min 4 characters" 
                      required 
                      disabled={resetLoading} 
                    />
                    <button type="button" onClick={() => setResetShowPwd(p => !p)} className="toggle-pwd-btn">
                      {resetShowPwd ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Confirm Password</label>
                  <div className="input-with-icon">
                    <span className="input-icon">🔑</span>
                    <input 
                      type={resetShowPwd ? 'text' : 'password'} 
                      value={resetForm.confirmPassword} 
                      onChange={e => setResetForm(p => ({ ...p, confirmPassword: e.target.value }))} 
                      placeholder="Repeat new password" 
                      required 
                      disabled={resetLoading} 
                    />
                  </div>
                  {resetForm.confirmPassword && (
                    <div style={{ marginTop: '8px', textAlign: 'right' }}>
                      <span style={{ 
                        color: resetForm.newPassword === resetForm.confirmPassword ? '#10b981' : '#ef4444', 
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        background: resetForm.newPassword === resetForm.confirmPassword ? '#f0fdf4' : '#fef2f2',
                        borderRadius: '4px'
                      }}>
                        {resetForm.newPassword === resetForm.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </span>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={resetLoading || resetForm.newPassword !== resetForm.confirmPassword || resetForm.newPassword.length < 4} 
                  className="login-btn" 
                  style={{ marginBottom: '15px' }}
                >
                  {resetLoading ? '⏳ Resetting...' : 'Reset Password'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '15px 0' }}>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
                </div>

                <button 
                  type="button" 
                  onClick={backToLogin} 
                  className="dropdown-btn secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  ← Back to Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      {backgrounds.map((bg, idx) => (
        <div 
          key={idx}
          className={`login-bg-layer ${idx === bgIndex ? 'active' : ''}`}
          style={{ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.2)), url(${bg})` }}
        />
      ))}
      
      {/* Floating Theme Toggle */}
      <button 
        className="header-icon-btn floating-theme-btn" 
        title="Toggle System Color" 
        onClick={toggleTheme}
      >
        {theme === 'default' ? '🎨' : '🌈'}
      </button>
      <div className="login-box">
        <div className="login-header">
          <img src={logo} alt="MK Logo" className="login-logo-img" />
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1e1b4b', marginBottom: '4px' }}>ወ/ዩ/ኮ/ካምፓስ</h1>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#4f46e5', marginTop: '0' }}>ግቢ ጉባኤ</h2>
          <p className="login-subtitle">Sign in to access your dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <span className="input-icon">👤</span>
              <input 
                type="text" 
                value={username} 
                onChange={e => {
                  // Prevent Amharic characters
                  const cleanVal = e.target.value.replace(/[\u1200-\u137F]/g, '');
                  setUsername(cleanVal);
                }} 
                placeholder="Enter username" 
                required 
                disabled={loading} 
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <span className="input-icon">🔒</span>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required disabled={loading} />
              <button type="button" onClick={() => setShowPassword(p => !p)} className="toggle-pwd-btn">{showPassword ? '🙈' : '👁️'}</button>
            </div>
          </div>

          <div className="form-group">
            <label>Role</label>
            <div className="input-with-icon">
              <span className="input-icon"></span>
              <select
                value={loginRole}
                onChange={e => setLoginRole(e.target.value)}
                required
                disabled={loading}
                className="login-select"
              >
                <option value="Admin">Admin</option>
                <option value="Executive">Executive</option>
                <option value="Sub Executive">Sub Executive</option>
                <option value="Member">Member</option>
              </select>
            </div>
          </div>
          <div className="login-btn-wrapper">
            <button type="submit" disabled={loading} className="login-btn">{loading ? 'Authenticating...' : 'Secure Login'}</button>
          </div>

          <div className="login-btn-wrapper" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={() => setMode('reset')} className="forgot-pwd-btn">Forgot Password?</button>
          </div>
        </form>
        <div className="login-footer">
          <p>Are you a student? <button onClick={() => onLogin('register')} className="register-link-btn">Register Here</button></p>
        </div>
      </div>
    </div>
  );
};

// ─── Member Self Registration ─────────────────────────────────



const ProfileEditModal = ({ user, token, onClose, onUpdate }) => {
  const [form, setForm] = useState({ name: user.name || '', phone: user.phone || '', photo: user.photo || '' });
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) return toast.error('Photo must be less than 20MB');
      const reader = new FileReader();
      reader.onloadend = () => setForm(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setForm(prev => ({ ...prev, photo: '' }));
    toast.success('Photo removed locally. Save to confirm.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put('/auth/update-profile', form, { headers: { Authorization: `Bearer ${token}` } });
      onUpdate(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Profile updated successfully');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content right profile-edit-modal animate-slide-in-right" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Profile ማስተካከያ (Edit Profile)</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body profile-edit-form">
          <div className="photo-upload-section" style={{ position: 'relative', marginBottom: '15px' }}>
            <div className="profile-photo-preview" style={{ margin: '0 auto' }}>
              {form.photo ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={form.photo} alt="Profile" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' }} />
                  <button type="button" onClick={handleRemovePhoto} className="remove-photo-btn" style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', zIndex: 10 }}>🗑️</button>
                </div>
              ) : (
                <div className="photo-placeholder" style={{ width: '120px', height: '120px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '3rem', color: '#cbd5e1' }}>{form.name.charAt(0).toUpperCase()}</div>
              )}
              <div style={{ marginTop: '10px' }}>
                <label className="photo-upload-label" style={{ cursor: 'pointer', color: 'var(--primary)', fontWeight: '700', fontSize: '0.85rem', padding: '6px 12px', background: '#f0f9ff', borderRadius: '20px', border: '1px solid #bae6fd', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span>📸 Photo ቀይር (Change Photo)</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div className="form-group">
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'block' }}>Full Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={form.name} 
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                required 
                style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '0.95rem' }}
              />
            </div>

            <div className="form-group">
              <label style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px', display: 'block' }}>Phone Number</label>
              <input 
                type="tel" 
                className="form-control" 
                value={form.phone} 
                onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} 
                style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', border: '2px solid #f1f5f9', fontSize: '0.95rem' }}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '12px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, padding: '12px' }}>Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2, padding: '12px', fontSize: '1rem', fontWeight: '700' }}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Register Executive ───────────────────────────────────────
const RegisterExecutive = ({ token, currentUser }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: '', department: '', term: greToEth(new Date()).year.toString() });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    axios.get('/auth/departments').then(res => setDepartments(res.data.filter(d => d.level === 'executive' || d.level === 'department'))).catch(() => { });
    axios.get('/settings', { headers: { Authorization: `Bearer ${token}` } }).then(res => { if (res.data?.currentTerm) setFormData(prev => ({ ...prev, term: res.data.currentTerm })); }).catch(() => { });
  }, []);

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
    toast.success('Password generated — save it!', { duration: 4000 });
  };

  const handleNameChange = value => {
    setFormData(prev => ({ ...prev, name: value, email: prev._emailManuallyEdited ? prev.email : generateUsername(value.split(' ')[0] || '', value.split(' ')[1] || '') }));
  };

  const handleRoleChange = e => {
    const selectedRole = e.target.value;
    const dept = departments.find(d => d.role === selectedRole);
    setFormData(prev => ({ ...prev, role: selectedRole, department: dept ? dept.name : '' }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/auth/register-user', formData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('User registered successfully!');
      setFormData({ name: '', email: '', password: '', role: '', department: '', term: greToEth(new Date()).year.toString() });
      setShowPassword(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="register-executive-card">
      <h3>Register Executive / Department Lead</h3>
      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group-inline">
          <div className="form-group flex-1"><label>Full Name</label><input type="text" value={formData.name} onChange={e => handleNameChange(e.target.value)} required /></div>
          <div className="form-group flex-1">
            <label>Username <span style={{ color: '#6366f1', fontSize: '11px' }}>— auto-generated</span></label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="text" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value, _emailManuallyEdited: true }))} required style={{ flex: 1 }} />
              <button type="button" onClick={() => setFormData(prev => ({ ...prev, email: generateUsername(prev.name.split(' ')[0] || '', prev.name.split(' ')[1] || ''), _emailManuallyEdited: false }))} style={{ padding: '6px 10px', background: '#e0e7ff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🔄</button>
            </div>
          </div>
        </div>
        <div className="form-group-inline">
          <div className="form-group flex-1">
            <label>Password</label>
            <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required style={{ flex: 1 }} />
                <button type="button" onClick={handleGeneratePassword} style={{ padding: '6px 10px', background: '#d1fae5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>⚡ Generate</button>
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{ padding: '6px 8px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{showPassword ? '🙈' : '👁️'}</button>
              </div>
              {showPassword && formData.password && <div style={{ padding: '5px 10px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>📋 {formData.password}</div>}
            </div>
          </div>
          <div className="form-group flex-1">
            <label>Role</label>
            <select value={formData.role} onChange={handleRoleChange} required className="role-select">
              <option value="">Select Role</option>
              {isSuperAdmin && <option value="admin">System Administrator</option>}
              {departments.map(d => <option key={d.id} value={d.role}>{d.name} ({d.role})</option>)}
            </select>
          </div>
          <div className="form-group flex-1">
            <label>Term</label>
            <input type="text" value={formData.term} readOnly style={{ background: '#f3f4f6', cursor: 'not-allowed' }} />
          </div>
        </div>
        <button type="submit" disabled={loading} className="login-btn action-btn" style={{ marginTop: '15px', width: '100%' }}>
          {loading ? 'Registering...' : 'Register as ' + (formData.role || 'Executive')}
        </button>
      </form>
    </div>
  );
};

const RegisterSubExecutive = ({ token, currentUser }) => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'sub_executive',
    department: currentUser.department || '',
    phone: '', region: '', zone: '', woreda: '', kebele: '',
    leaderName: currentUser.name || '',
    subRoleDescription: '',
    term: currentUser.term || greToEth(new Date()).year.toString()
  });
  const [customResponsibility, setCustomResponsibility] = useState('');
  const responsibilities = [
    'ምክትል ተጠሪ',
    'ጸሃፊ',
    'ክትትል ንዑስ ተጠሪ',
    'ንሰሃ እና ቅዱስ ቁርባን ንዑስ',
    'የአባላት ኦድት ንዑስ ተጠሪ',
    'ምክክር ንዑስ ተጠሪ',
    'ሌላ'
  ];
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleNameChange = (val) => {
    const username = generateUsername(val.split(' ')[0] || '', val.split(' ')[1] || '');
    setFormData(prev => ({ ...prev, name: val, email: prev._emailManuallyEdited ? prev.email : username }));
  };

  const handleGeneratePassword = () => {
    const pwd = Math.random().toString(36).slice(-8).toUpperCase();
    setFormData(prev => ({ ...prev, password: pwd }));
    setShowPassword(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    const finalData = { 
      ...formData, 
      subRoleDescription: formData.subRoleDescription === 'ሌላ' ? customResponsibility : formData.subRoleDescription 
    };
    try {
      await axios.post('/auth/register-user', finalData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Sub-Executive (ንኡስ ተጠሪ) registered successfully!');
      setFormData({ name: '', email: '', password: '', role: 'sub_executive', department: currentUser.department || '', phone: '', term: currentUser.term || '', subRoleDescription: '' });
      setCustomResponsibility('');
      setShowPassword(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="register-executive-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: 'var(--primary)' }}>Register Sub-Executive (ንኡስ ተጠሪ)</h3>
        <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#666' }}>
          This sub-executive will manage <strong>{currentUser.department}</strong> along with you.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label>Full Name</label>
          <input className="form-control" type="text" value={formData.name} onChange={e => handleNameChange(e.target.value)} required placeholder="e.g., Abebe Kebede" />
        </div>
        <div className="form-group">
          <label>Username (used for login)</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input className="form-control" type="text" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value, _emailManuallyEdited: true }))} required style={{ flex: 1 }} />
            <button type="button" onClick={() => setFormData(prev => ({ ...prev, email: generateUsername(prev.name.split(' ')[0] || '', prev.name.split(' ')[1] || ''), _emailManuallyEdited: false }))} style={{ padding: '6px 10px', background: '#e0e7ff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>🔄</button>
          </div>
        </div>
        <div className="form-group">
          <label>Phone Number</label>
          <input className="form-control" type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="09..." />
        </div>
        <div className="form-group-inline">
          <div className="form-group flex-1">
            <label>Region</label>
            <input className="form-control" type="text" value={formData.region} onChange={e => setFormData({ ...formData, region: e.target.value })} placeholder="e.g. Amhara" />
          </div>
          <div className="form-group flex-1">
            <label>Zone</label>
            <input className="form-control" type="text" value={formData.zone} onChange={e => setFormData({ ...formData, zone: e.target.value })} placeholder="e.g. South Wollo" />
          </div>
        </div>
        <div className="form-group-inline">
          <div className="form-group flex-1">
            <label>Woreda</label>
            <input className="form-control" type="text" value={formData.woreda} onChange={e => setFormData({ ...formData, woreda: e.target.value })} placeholder="e.g. Dessie" />
          </div>
          <div className="form-group flex-1">
            <label>Kebele</label>
            <input className="form-control" type="text" value={formData.kebele} onChange={e => setFormData({ ...formData, kebele: e.target.value })} placeholder="01" />
          </div>
        </div>
        <div className="form-group">
          <label>Assigning Leader (Executive)</label>
          <input className="form-control" type="text" value={formData.leaderName} readOnly style={{ background: '#f8fafc' }} />
        </div>
        <div className="form-group">
          <label>ተግባር/ሃላፊነት (Responsibility) <span style={{color:'red'}}>*</span></label>
          <select 
            className="form-control" 
            value={formData.subRoleDescription} 
            onChange={e => setFormData({ ...formData, subRoleDescription: e.target.value })}
            required
          >
            <option value="">ተግባር/ሃላፊነት ይምረጡ (Select Responsibility)</option>
            {responsibilities.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {formData.subRoleDescription === 'ሌላ' && (
          <div className="form-group animate-slide-down">
            <label>ሌላ ተግባር/ሃላፊነት ይጥቀሱ (Specify Other Responsibility) <span style={{color:'red'}}>*</span></label>
            <input 
              className="form-control" 
              type="text" 
              value={customResponsibility} 
              onChange={e => setCustomResponsibility(e.target.value)} 
              required 
              placeholder="ተግባሩን እዚህ ይጻፉ..."
            />
          </div>
        )}
        <div className="form-group">
          <label>Password</label>
          <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input className="form-control" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required style={{ flex: 1 }} />
              <button type="button" onClick={handleGeneratePassword} style={{ padding: '6px 10px', background: '#d1fae5', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>⚡ Auto</button>
              <button type="button" onClick={() => setShowPassword(p => !p)} style={{ padding: '6px 8px', background: '#f3f4f6', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{showPassword ? '🙈' : '👁️'}</button>
            </div>
            {showPassword && formData.password && <div style={{ padding: '5px 10px', background: '#fef3c7', borderRadius: '6px', fontSize: '13px', fontWeight: '600', letterSpacing: '1px' }}>📋 {formData.password}</div>}
          </div>
        </div>
        <button type="submit" disabled={loading} className="login-btn" style={{ marginTop: '15px', width: '100%' }}>
          {loading ? 'Registering...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
};

// ─── Main App Component ───────────────────────────────────────
const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved && saved !== "register" ? JSON.parse(saved) : null;
  });
  // 'register' hack handled in Login component
  const [view, setView] = useState(() => {
    const path = window.location.pathname.substring(1);
    if (['profile', 'dashboard', 'pending', 'register-exec', 'register-sub-exec', 'members', 'attendance', 'subgroups', 'settings', 'exec-mgmt', 'reports', 'finance', 'finance-approvals', 'finance-central', 'audit', 'begena', 'substitute-teachers', 'substitute-leaders', 'sub-teachers-history', 'sub-teachers-attendance', 'sub-leaders-history', 'sub-leaders-attendance', 'transition'].includes(path)) {
      return path;
    }
    return 'dashboard';
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'default');
  const profileRef = useRef(null);

  // Apply theme globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'default' ? 'alt' : 'default');
  };

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileOpen]);

  // Sync view to URL and auto-close dropdowns/sidebar
  useEffect(() => {
    setIsProfileOpen(false);
    setShowMobileSidebar(false);
    window.history.pushState(null, '', `/${view}`);
  }, [view]);

  // Handle browser back button
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname.substring(1) || 'dashboard';
      setView(path);
      setShowMobileSidebar(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const Sidebar = ({ view, setView, user, isOpen, onClose }) => {
  const isStaff = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit', 'sub_executive'].includes(user?.role);
  if (!isStaff) return null;

  const navItems = [
    { id: 'dashboard', label: 'ዳሽቦርድ', icon: '🏠', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit', 'sub_executive', 'member'] },
    { id: 'exec-mgmt', label: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user?.role) ? 'ሥራ አስፈጻሚ' : 'ንዑስ ተጠሪ', icon: '👔', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'] },
    { id: 'register-sub-exec', label: 'ንዑስ ተጠሪ መዝግብ', icon: '👤', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'] },
    { id: 'members', label: 'አባላት', icon: '👥', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'] },
    { id: 'all-members', label: 'ጠቅላላ አባላት', icon: '🌐', roles: ['super_admin', 'admin', 'sebsabi', 'abalat_guday', 'merja'] },
    { id: 'finance', label: 'ፋይናንስ', icon: '💰', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'] },
    { id: 'finance-approvals', label: 'ፋይናንስ ማጽደቂያ', icon: '⚖️', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'] },
    { id: 'finance-central', label: 'ማዕከላዊ ፋይናንስ', icon: '🏛️', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'hisab'] },
    { id: 'audit', label: 'ኦዲት ማጠቃለያ', icon: '🔍', roles: ['audit', 'super_admin', 'admin'] },
    { id: 'pending', label: 'ማጽደቂያዎች', icon: '✅', roles: ['abalat_guday', 'super_admin', 'admin', 'merja'] },
    { id: 'transition', label: 'የዓመት ሽግግር', icon: '🔄', roles: ['abalat_guday', 'super_admin', 'admin'] },
    { id: 'substitute-teachers', label: 'ተተኪ መምህር', icon: '👨‍🏫', roles: ['timhirt', 'super_admin', 'admin'] },
    { id: 'deacons', label: 'ዲያቆናት', icon: '🕯️', roles: ['timhirt', 'super_admin', 'admin'] },
    { id: 'substitute-leaders', label: 'ተተኪ አመራር', icon: '👨‍💼', roles: ['abalat_guday', 'super_admin', 'admin'] },
    { id: 'mezemran', label: 'መዘምራን', icon: '🎤', roles: ['mezmur', 'super_admin', 'admin'] },
    { id: 'begena', label: 'የበገና አባላት', icon: '🎸', roles: ['mezmur', 'super_admin', 'admin'] },
    { id: 'reports', label: 'ሪፖርቶች', icon: '📄', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'merja', 'hisab', 'audit'] },
    { id: 'dept-report', label: 'ሪፖርት', icon: '📄', roles: ['timhirt', 'abalat_guday', 'mezmur', 'lmat', 'muya', 'kwanqwa', 'bach'] },
    { id: 'attendance', label: 'የአባላት መከታተያ', icon: '📝', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'] },
    { id: 'communication', label: 'ግንኙነት', icon: '📢', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit', 'sub_executive', 'member'] },
    { id: 'settings', label: 'ሲስተም ሴቲንግ', icon: '⚙️', roles: ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'] },
  ];

  return (
    <aside className={`sidebar-modern ${isOpen ? 'open' : ''}`}>
      <button className="mobile-sidebar-close" onClick={onClose}>&times;</button>
      <div className="sidebar-card">
        <h4 className="sidebar-title"><span>🧭</span> ዋና ዝርዝር</h4>
        <nav className="sidebar-nav">
          {navItems.filter(item => item.roles.includes(user?.role)).map(item => (
            <button 
              key={item.id}
              className={`sidebar-link ${view === item.id ? 'active' : ''}`} 
              onClick={() => { setView(item.id); onClose(); }}
            >
              <span className="sidebar-icon">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </div>
      
    </aside>
  );
};



  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const handleLogin = (newToken, newUser) => {
    if (newToken === 'register') {
      setUser('register');
      return;
    }
    setToken(newToken);
    setUser(newUser);

    // Redirect admins directly to dashboard
    const isStaff = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit', 'sub_executive'].includes(newUser?.role);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setView('profile');
    toast.success('Logged out successfully');
  };

  if (!token) {
    if (user === 'register') {
      return (
        <>
          <Toaster position="top-center" />
          <MemberSelfRegistration 
            onBack={() => setUser(null)} 
            generateUsername={generateUsername}
            generatePassword={generatePassword}
            theme={theme}
            toggleTheme={toggleTheme}
          />
        </>
      );
    }
    return (
      <>
        <Toaster position="top-center" />
        <Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} />
      </>
    );
  }

  return (
    <div className="app-layout">
      <Toaster position="top-center" />
      <nav className="navbar-modern">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="mobile-menu-btn" onClick={() => setShowMobileSidebar(!showMobileSidebar)}>
            {showMobileSidebar ? '✕' : '☰'}
          </button>
          <div className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logo} alt="Logo" style={{ width: '50px', height: '50px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          <h2 style={{ 
            background: 'linear-gradient(135deg, #fff 0%, #ffd700 50%, #ffa500 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: '900', 
            fontSize: '1.6rem', 
            letterSpacing: '1px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            ወ/ዩ/ኮ/ካምፓስ ግቢ ጉባኤ
          </h2>
        </div>
        </div>

        <div className="header-greeting-container">
          <span className="header-welcome-text">እንኳን ደህና መጡ፣ <strong>{user?.name || "ተጠቃሚ"}</strong>!</span>
        </div>

        <div className="header-utilities">
          {['abalat_guday', 'super_admin', 'admin'].includes(user?.role) && (
            <NotificationBell
              token={token}
              onGoToApprovals={() => setView('pending')}
            />
          )}

          <button 
            className="header-icon-btn theme-toggle-btn" 
            title="Toggle System Color (Theme)" 
            onClick={toggleTheme}
          >
            {theme === 'default' ? '🎨' : '🌈'}
          </button>
          
          <div ref={profileRef} className={`profile-section ${isProfileOpen ? 'active' : ''}`} onClick={() => setIsProfileOpen(!isProfileOpen)}>
            <div className="profile-avatar">
              {user?.photo ? (
                <img src={user.photo} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{user?.name?.split(' ')[0]}</span>

            <div className="profile-dropdown">
              <div className="dropdown-profile-header">
                <div className="dropdown-avatar-large">
                  {user?.photo ? (
                    <img src={user.photo} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    user?.name?.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="dropdown-user-meta">
                   <div className="dropdown-user-name">{user?.name}</div>
                   <div className="dropdown-user-email">@{user?.email}</div>
                </div>
              </div>
              
              <div className="dropdown-info-grid">
                <div className="dropdown-info-item">
                  <span className="info-label">🎭 Role</span>
                  <span className="info-value">{ROLE_CONFIG[user?.role]?.label || user?.role}</span>
                </div>
                <div className="dropdown-info-item">
                  <span className="info-label">🏛️ Dept</span>
                  <span className="info-value">{user?.department || '—'}</span>
                </div>
                <div className="dropdown-info-item">
                  <span className="info-label">📞 Phone</span>
                  <span className="info-value">{user?.phone || '—'}</span>
                </div>
                <div className="dropdown-info-item">
                  <span className="info-label">📅 Term</span>
                  <span className="info-value">{user?.term || '—'}</span>
                </div>
                <div className="dropdown-info-item">
                  <span className="info-label">🛡️ Status</span>
                  <span className={`info-value status-${user?.isActive !== false ? 'active' : 'inactive'}`}>
                    {user?.isActive !== false ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-footer-actions">
                <button className="dropdown-btn secondary" onClick={(e) => { e.stopPropagation(); setView('profile'); setIsProfileOpen(false); }}>
                  <i>✏️</i> Edit Profile
                </button>
                <button className="dropdown-btn danger" onClick={handleLogout}>
                  <i>🚪</i> Logout
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </nav>

      <div className="app-main-layout">
        {showMobileSidebar && <div className="sidebar-overlay" onClick={() => setShowMobileSidebar(false)}></div>}
        <Sidebar view={view} setView={setView} user={user} isOpen={showMobileSidebar} onClose={() => setShowMobileSidebar(false)} />
        <main className="content-body" style={{ paddingBottom: '100px', position: 'relative', minHeight: 'calc(100vh - 80px)' }}>
          {view === 'dashboard' && <Dashboard user={user} setView={setView} />}
          {view === 'communication' && <CommunicationCenter user={user} token={token} initialTab="announcements" />}
          {view === 'comm-messages' && <CommunicationCenter user={user} token={token} initialTab="messages" />}
          {view === 'profile' && (
            <ProfileEditModal 
              user={user} 
              token={token} 
              onClose={() => setView('dashboard')} 
              onUpdate={setUser} 
            />
          )}
          {view === 'reports' && <MerjaDashboard token={token} user={user} />}
          {view === 'dept-report' && <DeptReport token={token} user={user} />}
          {view === 'pending' && <PendingApprovals token={token} />}
          {view === 'members' && <Members token={token} user={user} />}
          {view === 'all-members' && <AllMembersList token={token} user={user} />}
          {view === 'attendance' && <Attendance token={token} currentUser={user} />}
          {view === 'finance' && <FinanceDashboard user={user} mode="standard" />}
          {view === 'finance-approvals' && <FinanceDashboard user={user} mode="approvals" />}
          {view === 'audit' && <AuditDashboard user={user} token={token} />}
          {view === 'finance-central' && <FinanceDashboard user={user} mode="central" />}
          { view === 'subgroups' && <Subgroups token={token} user={user} /> }
          { view === 'settings' && <SystemSettings user={user} /> }
          { view === 'transition' && <YearTransitionManager theme={theme} /> }
          {view === 'register-exec' && <RegisterExecutive token={token} currentUser={user} />}
          {view === 'register-sub-exec' && <ExecutiveManagement token={token} currentUser={user} mode="sub_exec" />}
          {view === 'exec-mgmt' && <ExecutiveManagement token={token} currentUser={user} mode="core" />}
          { view === 'begena' && <BegenaMembers token={token} />}
          { view === 'substitute-teachers' && <SubstituteTeachers token={token} setView={setView} />}
          { view === 'deacons' && <Deacons token={token} />}
          { view === 'substitute-leaders' && <SubstituteLeaders token={token} setView={setView} />}
          { view === 'mezemran' && <Mezemran token={token} setView={setView} />}
          { view === 'sub-teachers-history' && <SubstituteHistoryPage token={token} type="teacher" onBack={() => setView('substitute-teachers')} />}
          { view === 'sub-teachers-attendance' && <SubstituteAttendancePage token={token} user={user} type="teacher" onBack={() => setView('substitute-teachers')} />}
          { view === 'sub-leaders-history' && <SubstituteHistoryPage token={token} type="leader" onBack={() => setView('substitute-leaders')} />}
          { view === 'sub-leaders-attendance' && <SubstituteAttendancePage token={token} user={user} type="leader" onBack={() => setView('substitute-leaders')} />}
          { view === 'mezemran-history' && <SubstituteHistoryPage token={token} type="mezemran" onBack={() => setView('mezemran')} />}
          { view === 'mezemran-attendance' && <SubstituteAttendancePage token={token} user={user} type="mezemran" onBack={() => setView('mezemran')} />}

          {view === 'self-registration' && (
            <div className="card-modern" style={{ padding: '20px' }}>
              <button 
                className="btn btn-back-modern" 
                onClick={() => setView('dashboard')}
                style={{ marginBottom: '20px' }}
              >
                ← Back to Dashboard
              </button>
              <MemberSelfRegistration 
                onBack={() => setView('dashboard')} 
                generateUsername={generateUsername}
                generatePassword={generatePassword}
                theme={theme}
                toggleTheme={toggleTheme}
              />
            </div>
          )}

          <footer className="app-footer">
            <div className="dev-footer-content">
              <span className="dev-text">Designed by <strong style={{color: '#ffd700'}}>Mulugeta K.</strong></span>
              <span className="dev-separator">,</span>
              <span className="dev-tag">+251915942488</span>
              <span className="dev-separator">,</span>
              <span className="dev-tag">2018 E.C</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default App;

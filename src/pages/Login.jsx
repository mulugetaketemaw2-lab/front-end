import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// ─── tiny reusable input style ───────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '11px 14px', fontSize: '14px',
  border: '1.5px solid #d1d5db', borderRadius: '8px',
  outline: 'none', boxSizing: 'border-box', background: '#fff',
  transition: 'border-color .2s'
};
const btnPrimary = (disabled) => ({
  width: '100%', padding: '12px', fontSize: '15px', fontWeight: '700',
  background: disabled ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
  color: '#fff', border: 'none', borderRadius: '8px',
  cursor: disabled ? 'not-allowed' : 'pointer', marginTop: '6px',
  transition: 'opacity .2s'
});

// ─── Change-Password Modal ────────────────────────────────────────────────────
const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState({ cur: false, nw: false, cf: false });

  const handle = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggle = (k) => () => setShow(p => ({ ...p, [k]: !p[k] }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return toast.error('የይለፍ ቃሎቹ አይዛመዱም');
    }
    if (form.newPassword.length < 4) {
      return toast.error('አዲሱ የይለፍ ቃል ቢያንስ 4 ፊደላት ሊኖረው ይገባል');
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/auth/change-password`,
        { currentPassword: form.currentPassword, newPassword: form.newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('የይለፍ ቃል በተሳካ ሁኔታ ተቀይሯል');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'የይለፍ ቃል መቀየር አልተሳካም');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: '14px', padding: '36px 32px',
        width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,.2)'
      }}>
        <h2 style={{ margin: '0 0 6px', fontSize: '20px', color: '#1e1b4b' }}>የይለፍ ቃል ቀይር</h2>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#6b7280' }}>
          Change Password
        </p>
        <form onSubmit={submit}>
          {[
            { label: 'አሁን ያለው የይለፍ ቃል', key: 'currentPassword', showKey: 'cur' },
            { label: 'አዲስ የይለፍ ቃል', key: 'newPassword', showKey: 'nw' },
            { label: 'አዲሱን ያረጋግጡ', key: 'confirmPassword', showKey: 'cf' }
          ].map(({ label, key, showKey }) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                {label}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show[showKey] ? 'text' : 'password'}
                  value={form[key]}
                  onChange={handle(key)}
                  style={{ ...inputStyle, paddingRight: '42px' }}
                  required
                />
                <button type="button" onClick={toggle(showKey)} style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#6b7280'
                }}>
                  {show[showKey] ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '11px', borderRadius: '8px', border: '1.5px solid #d1d5db',
              background: '#fff', cursor: 'pointer', fontWeight: '600', color: '#374151'
            }}>
              ሰርዝ
            </button>
            <button type="submit" disabled={loading} style={{ ...btnPrimary(loading), flex: 1, marginTop: 0 }}>
              {loading ? 'በመቀየር...' : 'ቀይር'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Login Page ──────────────────────────────────────────────────────────
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // checking | connected | disconnected
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { checkBackend(); }, []);

  const checkBackend = async () => {
    setBackendStatus('checking');
    try {
      await axios.get(`${API}/api/health`, { timeout: 4000 });
      setBackendStatus('connected');
    } catch {
      setBackendStatus('disconnected');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (backendStatus !== 'connected') return toast.error('አገልጋዩ አልተገናኘም');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/login`, {
        email: username,
        username,
        password
      });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      toast.success('በስኬት ገብተዋል!');

      // Role-based redirect
      const roleRoutes = {
        admin: '/admin', super_admin: '/admin',
        sebsabi: '/dashboard', meketel_sebsabi: '/dashboard', tsehafy: '/dashboard',
        merja: '/merja'
      };
      navigate(roleRoutes[user.role] || '/dashboard');
    } catch (err) {
      if (!err.response) {
        toast.error('ከአገልጋዩ ጋር መገናኘት አልተቻለም');
      } else if (err.response.status === 401) {
        toast.error('የተጠቃሚ ስም ወይም የይለፍ ቃል ትክክል አይደለም');
      } else if (err.response.status === 403) {
        toast.error(err.response.data.message || 'መግባት አልተፈቀደም');
      } else {
        toast.error('ሎጊን አልተሳካም');
      }
    } finally {
      setLoading(false);
    }
  };

  const statusColor = { connected: '#22c55e', checking: '#f59e0b', disconnected: '#ef4444' };
  const statusLabel = { connected: 'አገልጋይ ተገናኝቷል', checking: 'በመገናኘት ላይ...', disconnected: 'አገልጋይ አልተገናኘም' };

  // Check if a user is already logged in (show change-password link)
  const loggedInUser = (() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } })();

  return (
    <>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}>
        <div style={{
          background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '420px',
          boxShadow: '0 25px 80px rgba(0,0,0,.35)', overflow: 'hidden'
        }}>
          {/* Header banner */}
          <div style={{
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            padding: '32px 32px 28px', textAlign: 'center', color: '#fff'
          }}>
            {/* Cross icon */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(255,255,255,.15)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '32px'
            }}>✝️</div>
            <div style={{ fontSize: '14px', letterSpacing: '1px', opacity: .9, marginBottom: '4px', fontWeight: '700' }}>
              ወ/ዩ/ኮ/ካምፓስ
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: '900', color: '#ffd700', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              ግቢ ጉባኤ
            </h1>
            <p style={{ margin: 0, fontSize: '13px', opacity: .75 }}>
              Campus Fellowship Management System
            </p>
          </div>

          {/* Form area */}
          <div style={{ padding: '32px' }}>
            {/* Backend status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '24px', padding: '10px 14px',
              background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb'
            }}>
              <div style={{
                width: '9px', height: '9px', borderRadius: '50%',
                background: statusColor[backendStatus],
                boxShadow: `0 0 6px ${statusColor[backendStatus]}`
              }} />
              <span style={{ fontSize: '13px', color: '#374151', flex: 1 }}>
                {statusLabel[backendStatus]}
              </span>
              {backendStatus === 'disconnected' && (
                <button onClick={checkBackend} style={{
                  fontSize: '12px', color: '#4f46e5', background: 'none',
                  border: 'none', cursor: 'pointer', fontWeight: '600'
                }}>
                  እንደገና ሞክር
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Username */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '7px' }}>
                  Username / Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="የተጠቃሚ ስም ያስገቡ"
                  style={inputStyle}
                  required
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Password / የይለፍ ቃል
                  </label>
                  {loggedInUser && (
                    <button type="button" onClick={() => setShowChangePassword(true)} style={{
                      fontSize: '12px', color: '#4f46e5', background: 'none',
                      border: 'none', cursor: 'pointer', fontWeight: '600'
                    }}>
                      ቀይር
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="የይለፍ ቃል ያስገቡ"
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '17px', color: '#9ca3af'
                  }}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading || backendStatus !== 'connected'} style={btnPrimary(loading || backendStatus !== 'connected')}>
                {loading ? '⏳ በመግባት ላይ...' : '🔐 ግባ  /  Login'}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '22px 0 18px' }}>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>ወይም</span>
              <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
            </div>

            {/* Change password standalone link */}
            <button
              type="button"
              onClick={() => {
                if (!loggedInUser) return toast.error('ለይለፍ ቃል ለመቀየር መጀመሪያ ይግቡ');
                setShowChangePassword(true);
              }}
              style={{
                width: '100%', padding: '11px', borderRadius: '8px',
                border: '1.5px solid #e0e7ff', background: '#eef2ff',
                color: '#4f46e5', fontWeight: '600', fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              🔑 የይለፍ ቃል ቀይር / Reset Password
            </button>

            {/* Troubleshoot hint when disconnected */}
            {backendStatus === 'disconnected' && (
              <div style={{
                marginTop: '18px', padding: '12px 14px', background: '#fef2f2',
                borderRadius: '8px', border: '1px solid #fecaca', fontSize: '12px', color: '#991b1b'
              }}>
                <strong>አገልጋዩን ለማስጀመር:</strong>
                <br />
                <code style={{ display: 'block', marginTop: '6px', background: '#fee2e2', padding: '4px 8px', borderRadius: '4px' }}>
                  cd gbi-backend &amp;&amp; node server.js
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;

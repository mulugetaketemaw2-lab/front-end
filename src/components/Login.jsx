import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";

const Login = ({ onLogin, setToken }) => {
  const [email, setEmail] = useState("admin@gbi.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const navigate = useNavigate();

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await axios.get('/health', { timeout: 5000 });
      if (response.data) {
        setBackendStatus('connected');
        toast.success('ከኋላ አገልጋይ ጋር ተገናኝቷል');
      }
    } catch (error) {
      setBackendStatus('disconnected');
      toast.error('ከኋላ አገልጋይ ጋር መገናኘት አልተቻለም');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('🔐 Login attempt:', { email });

      const response = await axios.post("/auth/login", {
        email,
        password
      });

      console.log('✅ Login response:', response.data);

      const { token, user } = response.data;

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Set default authorization header for future requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Call the appropriate callback
      if (onLogin && typeof onLogin === 'function') {
        onLogin(token, user);
      } else if (setToken && typeof setToken === 'function') {
        setToken(token, user);
      }

      toast.success("በስኬት ገብተዋል!");

      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);

    } catch (error) {
      console.error('❌ Login error:', error);

      if (error.code === 'ECONNABORTED') {
        toast.error('የጊዜ ገደብ አልፏል - እንደገና ይሞክሩ');
      } else if (!error.response) {
        toast.error('ከኋላ አገልጋይ ጋር መገናኘት አልተቻለም');
      } else if (error.response.status === 401) {
        toast.error('ኢሜይል ወይም የይለፍ ቃል ትክክል አይደለም');
      } else if (error.response.status === 400) {
        toast.error(error.response.data.message || 'የተሳሳተ መረጃ');
      } else {
        toast.error('የሎጊን ሂደት አልተሳካም');
      }
    } finally {
      setLoading(false);
    }
  };

  // Manual retry connection
  const retryConnection = () => {
    setBackendStatus('checking');
    checkBackendConnection();
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>ጉባኤ ስርዓት</h1>
        <h2>ጉባኤ ዩኒቨርሲቲ</h2>

        {/* Backend Status Indicator */}
        <div className="backend-status">
          <div className={`status-dot ${backendStatus}`}></div>
          <span>
            {backendStatus === 'connected' ? 'አገልጋይ ተገናኝቷል' :
              backendStatus === 'checking' ? 'በመገናኘት ላይ...' :
                'አገልጋይ አልተገናኘም'}
          </span>
          {backendStatus === 'disconnected' && (
            <button onClick={retryConnection} className="retry-btn">
              እንደገና ሞክር
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ኢሜይል</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ኢሜይል ያስገቡ"
              required
              disabled={loading || backendStatus !== 'connected'}
            />
          </div>

          <div className="form-group">
            <label>የይለፍ ቃል</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="የይለፍ ቃል ያስገቡ"
              required
              disabled={loading || backendStatus !== 'connected'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || backendStatus !== 'connected'}
            className="login-btn"
          >
            {loading ? "በመግባት ላይ..." :
              backendStatus !== 'connected' ? "እየጠበቀ ነው..." :
                "ግባ"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
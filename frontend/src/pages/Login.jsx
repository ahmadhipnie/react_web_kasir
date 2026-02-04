import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineUser, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { IoFastFoodOutline, IoReceiptOutline, IoStatsChartOutline, IoTimeOutline } from 'react-icons/io5';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message || 'Login failed');
    }
  };

  const features = [
    { icon: IoFastFoodOutline, text: 'Easily manage food menu' },
    { icon: IoReceiptOutline, text: 'Fast and accurate transactions' },
    { icon: IoStatsChartOutline, text: 'Real-time sales reports' },
    { icon: IoTimeOutline, text: 'Complete transaction history' },
  ];

  return (
    <div className="login-page">
      {/* Left Side - Branding */}
      <div className="login-left">
        <div className="login-brand">
          <div className="logo">🍔</div>
          <h1>FoodPOS</h1>
          <p>Modern Point of Sale System for Your Culinary Business</p>
        </div>

        <div className="login-features">
          {features.map((feature, index) => (
            <div key={index} className="login-feature">
              <div className="login-feature-icon">
                <feature.icon />
              </div>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right">
        <div className="login-form-container">
          <h2>Welcome! 👋</h2>
          <p>Please login to continue to dashboard</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div style={{
                padding: '0.875rem 1rem',
                background: 'var(--danger-50)',
                border: '1px solid var(--danger-200)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--danger-700)',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-group">
                <HiOutlineUser className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-group">
                <HiOutlineLockClosed className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ paddingRight: '3rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--gray-400)',
                    padding: '0.25rem'
                  }}
                >
                  {showPassword ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Login'}
            </button>
          </form>

          <p style={{ 
            marginTop: '2rem', 
            textAlign: 'center', 
            fontSize: '0.8125rem',
            color: 'var(--gray-400)'
          }}>
            © 2026 FoodPOS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

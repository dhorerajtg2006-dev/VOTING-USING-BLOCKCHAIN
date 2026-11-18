import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { authApi } from '../api/auth';
import './AuthPages.css';

const VoterSignupPage = () => {
  const [roomNumber, setRoomNumber] = useState('');
  const [voterId, setVoterId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res: any = await authApi.voterRegister({
        roomNumber: roomNumber.trim(),
        voterId: voterId.trim(),
        fullName: fullName.trim(),
        email: email.trim()
      });
      setSuccess(res.message || 'Registration successful.');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card animate-fade-up">
        <Link to="/voter/login" className="back-link"><ArrowLeft size={16} /> Back to voter login</Link>
        <h2 className="text-gradient" style={{ backgroundImage: 'var(--gradient-emerald)' }}>Voter Registration</h2>
        <p className="auth-desc">Enter your details to register for an election room.</p>

        {error && (
          <div className="error-box">
            <ShieldAlert size={18} />
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0.5rem auto' }} />
            <p style={{ color: '#10b981', fontWeight: 600 }}>{success}</p>
            <button
              className="btn btn-primary full-width mt-4"
              style={{ background: 'var(--gradient-emerald)' }}
              onClick={() => navigate('/voter/login')}
            >
              Go to Voter Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Room Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. VOTEX-2026"
                value={roomNumber}
                onChange={e => setRoomNumber(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Voter ID</label>
              <input
                type="text"
                className="form-input"
                value={voterId}
                onChange={e => setVoterId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary full-width mt-4"
              style={{ background: 'var(--gradient-emerald)' }}
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default VoterSignupPage;

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { admin } from '../../api'
import '../../styles/admin.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e) => {
    e?.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.')
      return
    }
    setError(''); setLoading(true)
    try {
      const data = await admin.login(username.trim(), password.trim())
      if (data && data.success === true) {
        navigate('/admin/dashboard', { replace: true })
      } else {
        setError(data?.message || 'Invalid username or password.')
      }
    } catch (err) {
      setError(err?.message || 'Invalid username or password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <img src="/org_logo.svg" alt="Organization Logo" />
        </div>
        <div className="admin-login-title">Organization Portal</div>
        <div className="admin-login-subtitle">Admin Panel — Secure Login</div>

        <form onSubmit={handleLogin}>
          <div className="admin-form-group">
            <label htmlFor="admin-username" className="admin-form-label">Username</label>
            <input
              id="admin-username"
              className="admin-form-control"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="admin-form-group" style={{ marginTop: 12 }}>
            <label htmlFor="admin-password" className="admin-form-label">Password</label>
            <input
              id="admin-password"
              className="admin-form-control"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          {error && (
            <div role="alert" style={{ background: 'rgba(242,101,34,0.06)', border: '1px solid rgba(242,101,34,0.2)', borderRadius: 'var(--radius-buttons)', padding: '9px 12px', fontSize: 13, color: 'var(--color-harvest-flame)', marginTop: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="bi bi-exclamation-circle" /> {error}
            </div>
          )}

          <button className="admin-login-btn" type="submit" disabled={loading} style={{ marginTop: 16 }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2" /> Logging in…</>
              : <><i className="bi bi-shield-lock me-2" />Sign In</>
            }
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-secondary)' }}>
          <i className="bi bi-lock" /> Authorized admins only
        </p>
      </div>
    </div>
  )
}

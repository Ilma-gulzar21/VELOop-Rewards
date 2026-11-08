import styles from './adminPage.module.css'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAdminAuth } from '../../context/AdminAuthContext'
import DemoCredentials from '../../components/DemoCredentials'
import './Admin.css'

const AdminLogin = () => {
  const navigate = useNavigate()
  const { login, loading } = useAdminAuth()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(formData.email.trim(), formData.password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Admin login failed. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${styles.page} admin-login-page`}>
      <div className="admin-login-card">

        <h2>VELOop Admin</h2>
        <p>Sign in to access the Admin Panel</p>

        <DemoCredentials
          role="admin"
          onUse={(creds) => setFormData({ email: creds.email, password: creds.password })}
        />

        <form onSubmit={handleSubmit}>

          <div className="admin-form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="Enter admin email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="admin-form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <div className="admin-error">{error}</div>
          )}

          <button type="submit" disabled={loading || submitting}>
            {submitting ? 'Logging in...' : 'Admin Login'}
          </button>

        </form>
      </div>
    </div>
  )
}

export default AdminLogin
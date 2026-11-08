import styles from '../../sharedPage.module.css'
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../../services/api'
import DemoCredentials from '../../components/DemoCredentials'

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Gift,
  Wallet
} from 'lucide-react'

import { motion } from 'framer-motion'
import './Authentication.css'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })

  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    })

    setErrors({
      ...errors,
      [name]: ''
    })

    setServerError('')
  }

  // Form Validation
  const validateForm = () => {
    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  // Login API
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setLoading(true)
      setServerError('')

     const response = await api.post(
  '/auth/login',{
          email: formData.email.trim(),
          password: formData.password
        }
      )

      if (response.data.success) {
        // Save authentication details
        sessionStorage.setItem('token', response.data.token)

        sessionStorage.setItem(
          'user',
          JSON.stringify(response.data.user)
        )

        // Update Navbar login status
        window.dispatchEvent(new Event('authChanged'))

        // Redirect to Dashboard
        navigate('/', {
          replace: true,
          state: {
            message: 'Login successful!'
          }
        })
      }

    } catch (error) {
      setServerError(
        error.response?.data?.message ||
        'Unable to login. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${styles.pageShell} auth-page`}>

      <motion.div
        className="auth-container"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >

        {/* Left Side */}

        <div className="auth-visual">

          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Gift size={24} />
            </div>

            <span>VELOop Rewards</span>
          </div>

          <div className="auth-visual-content">

            <span className="auth-tagline">
              REWARDS MADE SIMPLE
            </span>

            <h1>
              Your rewards.
              <br />
              Your <span>choice.</span>
            </h1>

            <p>
              Turn your earned VEs into exciting rewards.
              Manage your wallet and redeem with ease.
            </p>

            <div className="auth-feature">

              <div className="auth-feature-icon">
                <Wallet size={20} />
              </div>

              <div>
                <h4>Smart Reward Wallet</h4>
                <p>Keep track of your available VEs.</p>
              </div>

            </div>

            <div className="auth-feature">

              <div className="auth-feature-icon">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h4>Secure Redemptions</h4>
                <p>Designed for a safe redemption experience.</p>
              </div>

            </div>

          </div>

          <div className="auth-visual-footer">
            © 2026 VELOop Rewards. All rights reserved.
          </div>

        </div>

        {/* Right Side */}

        <div className="auth-form-section">

          <div className="auth-form-wrapper">

            <div className="auth-mobile-brand">
              <Gift size={25} />
              <span>VELOop Rewards</span>
            </div>

            <div className="auth-heading">

              <span className="auth-small-heading">
                WELCOME BACK
              </span>

              <h2>Sign in to your account</h2>

              <p>
                Enter your details to access your rewards dashboard.
              </p>

            </div>

            {/* Server Message */}

            {location.state?.message && (
              <div className="auth-success">
                {location.state.message}
              </div>
            )}

            {serverError && (
              <div className="auth-error">
                {serverError}
              </div>
            )}

            <DemoCredentials
              role="user"
              onUse={(creds) => setFormData(prev => ({ ...prev, email: creds.email, password: creds.password }))}
            />

            <form onSubmit={handleSubmit}>

              {/* Email */}

              <div className="auth-field">

                <label htmlFor="login-email">
                  Email Address
                </label>

                <div className="auth-input-wrapper">

                  <Mail size={19} />

                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                  />

                </div>

                {errors.email && (
                  <span className="auth-error">
                    {errors.email}
                  </span>
                )}

              </div>

              {/* Password */}

              <div className="auth-field">

                <label htmlFor="login-password">
                  Password
                </label>

                <div className="auth-input-wrapper">

                  <Lock size={19} />

                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

                {errors.password && (
                  <span className="auth-error">
                    {errors.password}
                  </span>
                )}

              </div>

              {/* Remember Me */}

              <div className="auth-options">

                <label className="remember-option">

                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />

                  <span>Remember me</span>

                </label>

                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    alert('Forgot password will be implemented later.')
                  }
                >
                  Forgot Password?
                </button>

              </div>

              {/* Submit Button */}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >

                {loading ? 'Signing In...' : 'Sign In'}

                {!loading && <ArrowRight size={19} />}

              </button>

            </form>

            <div className="auth-divider">
              <span>NEW TO VELOOP?</span>
            </div>

            <p className="auth-switch">
              Don't have an account?
              <Link to="/signup"> Create Account</Link>
            </p>

            <div className="auth-security-note">
              <ShieldCheck size={16} />
              Your account security matters to us.
            </div>

          </div>

        </div>

      </motion.div>

    </div>
  )
}

export default Login
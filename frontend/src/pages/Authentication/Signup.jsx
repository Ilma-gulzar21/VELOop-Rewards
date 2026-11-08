import styles from '../../sharedPage.module.css'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Gift,
  ShieldCheck
} from 'lucide-react'

import { motion } from 'framer-motion'
import './Authentication.css'

const Signup = () => {
  const navigate = useNavigate()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  })

  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  // Handle Input Changes
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

    setApiError('')
  }

  // Form Validation
  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must contain at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must contain at least 8 characters'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Please accept the terms and conditions'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  // Signup API
  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')

    if (!validateForm()) return

    try {
      setLoading(true)

     const response = await api.post(
  '/auth/signup',
  {
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }
      )

      if (response.data.success) {

        // Store authentication token
        sessionStorage.setItem('token', response.data.token)

        // Store logged-in user information
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
            message: 'Account created successfully!'
          }
        })
      }

    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Unable to create your account. Please try again.'

      setApiError(message)

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
              START YOUR REWARD JOURNEY
            </span>

            <h1>
              Earn more.
              <br />
              Redeem <span>better.</span>
            </h1>

            <p>
              Create your account and experience a simple
              and convenient way to redeem your earned rewards.
            </p>

            <div className="auth-highlight-box">

              <div className="auth-highlight-icon">
                <Gift size={25} />
              </div>

              <div>
                <h3>Your rewards await!</h3>
                <p>
                  One account. Multiple redemption possibilities.
                </p>
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
                CREATE YOUR ACCOUNT
              </span>

              <h2>Join VELOop Rewards</h2>

              <p>
                Enter your details to get started with your rewards journey.
              </p>

            </div>

            <form onSubmit={handleSubmit}>

              {/* Name */}

              <div className="auth-field">

                <label htmlFor="signup-name">
                  Full Name
                </label>

                <div className="auth-input-wrapper">
                  <User size={19} />

                  <input
                    id="signup-name"
                    type="text"
                    name="name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                {errors.name && (
                  <span className="auth-error">
                    {errors.name}
                  </span>
                )}

              </div>

              {/* Email */}

              <div className="auth-field">

                <label htmlFor="signup-email">
                  Email Address
                </label>

                <div className="auth-input-wrapper">
                  <Mail size={19} />

                  <input
                    id="signup-email"
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

                <label htmlFor="signup-password">
                  Password
                </label>

                <div className="auth-input-wrapper">
                  <Lock size={19} />

                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create a password"
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

              {/* Confirm Password */}

              <div className="auth-field">

                <label htmlFor="signup-confirm-password">
                  Confirm Password
                </label>

                <div className="auth-input-wrapper">
                  <Lock size={19} />

                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    aria-label={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>

                </div>

                {errors.confirmPassword && (
                  <span className="auth-error">
                    {errors.confirmPassword}
                  </span>
                )}

              </div>

              {/* Terms */}

              <div className="auth-terms">

                <label>
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                  />

                  <span>
                    I agree to the Terms and Conditions and Privacy Policy.
                  </span>
                </label>

                {errors.agreeTerms && (
                  <span className="auth-error">
                    {errors.agreeTerms}
                  </span>
                )}

              </div>

              {/* API Error */}

              {apiError && (
                <div
                  className="auth-error auth-api-error"
                  role="alert"
                >
                  {apiError}
                </div>
              )}

              {/* Submit */}

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={loading}
              >
                {loading ? 'Creating Account...' : 'Create Account'}

                {!loading && <ArrowRight size={19} />}
              </button>

            </form>

            <div className="auth-divider">
              <span>ALREADY REGISTERED?</span>
            </div>

            <p className="auth-switch">
              Already have an account?
              <Link to="/login"> Sign In</Link>
            </p>

            <div className="auth-security-note">
              <ShieldCheck size={16} />
              Your information is handled securely.
            </div>

          </div>

        </div>

      </motion.div>

    </div>
  )
}

export default Signup
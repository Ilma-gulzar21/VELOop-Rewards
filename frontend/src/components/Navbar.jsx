import styles from '../sharedPage.module.css'
import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'

import {
  Sun,
  Moon,
  Wallet,
  Menu,
  X,
  Gift,
  LayoutDashboard,
  History,
  LogOut,
  User
} from 'lucide-react'

import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

import './Navbar.css'

const Navbar = () => {
  const { theme, toggleTheme } = useTheme()

  const { user, loading, isAuthenticated, logout } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = useNavigate()

  const closeMenu = () => {
    setMobileOpen(false)
  }

  // Logout functionality
  const handleLogout = () => {
    logout()
    closeMenu()

    navigate('/login', {
      replace: true,
      state: {
        message: 'You have been logged out successfully.'
      }
    })
  }

  return (
    <header className={`${styles.componentShell} main-navbar`}>
      <div className="navbar-container">

        {/* Brand Logo */}
        <Link to="/" className="brand-logo" onClick={closeMenu}>
          <div className="brand-icon">
            <Gift size={23} />
          </div>

          <div className="brand-name">
            VELOop
            <span>REWARDS</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className={`nav-links ${mobileOpen ? 'mobile-active' : ''}`}>

          <NavLink to="/" end onClick={closeMenu}>
            <LayoutDashboard size={17} />
            Dashboard
          </NavLink>

          <NavLink to="/Payout?method=upi" onClick={closeMenu}>
            <Gift size={17} />
            Redeem Rewards
          </NavLink>

          <NavLink to="/history" onClick={closeMenu}>
            <History size={17} />
            History
          </NavLink>

          {/* Authentication Section */}
          {!loading && (
            !isAuthenticated ? (
              <>
                <Link
                  to="/login"
                  className="auth-login-button"
                  onClick={closeMenu}
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="auth-signup-button"
                  onClick={closeMenu}
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="navbar-user-section">

                <div className="navbar-user-info">
                  <User size={17} />
                  <span>{user?.name}</span>
                </div>

                <button
                  className="auth-logout-button"
                  onClick={handleLogout}
                >
                  <LogOut size={17} />
                  Logout
                </button>

              </div>
            )
          )}

          {/* Mobile Theme Button */}
          <button
            className="mobile-theme-button"
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}

            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>

        </nav>

        {/* Navbar Actions */}
        <div className="navbar-actions">

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
          </button>

          <Link to="/Payout?method=upi" className="wallet-button">
            <Wallet size={18} />
            <span>My Wallet</span>
          </Link>

          <button
            className="mobile-menu-button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X size={23} /> : <Menu size={23} />}
          </button>

        </div>

      </div>
    </header>
  )
}

export default Navbar
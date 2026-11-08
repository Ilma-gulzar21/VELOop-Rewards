import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback
} from 'react'

import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const clearUserSession = useCallback(() => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    setUser(null)
  }, [])

  const verifyUser = useCallback(async () => {
    const token = sessionStorage.getItem('token')

    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await api.get('/auth/me')
      const userData = response.data?.user

      if (!response.data?.success || !userData) {
        throw new Error('Invalid user session.')
      }

      setUser(userData)
      sessionStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      clearUserSession()
    } finally {
      setLoading(false)
    }
  }, [clearUserSession])

  useEffect(() => {
    verifyUser()

    const handleAuthChange = () => verifyUser()
    const handleAuthExpired = () => {
      clearUserSession()
      setLoading(false)
    }

    window.addEventListener('authChanged', handleAuthChange)
    window.addEventListener('userAuthExpired', handleAuthExpired)

    return () => {
      window.removeEventListener('authChanged', handleAuthChange)
      window.removeEventListener('userAuthExpired', handleAuthExpired)
    }
  }, [verifyUser, clearUserSession])

  const logout = () => {
    clearUserSession()
    window.dispatchEvent(new Event('authChanged'))
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user && sessionStorage.getItem('token')),
    logout,
    verifyUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}

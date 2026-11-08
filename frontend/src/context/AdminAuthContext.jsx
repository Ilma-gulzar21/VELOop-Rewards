import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback
} from 'react'

import { adminApi } from '../services/api'

const AdminAuthContext = createContext(null)

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  const clearAdminSession = useCallback(() => {
    sessionStorage.removeItem('adminToken')
    sessionStorage.removeItem('admin')
    setAdmin(null)
  }, [])

  const verifyAdmin = useCallback(async () => {
    const token = sessionStorage.getItem('adminToken')

    if (!token) {
      setAdmin(null)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await adminApi.get('/admin/profile')
      const adminData = response.data?.admin

      if (!response.data?.success || !adminData || adminData.role !== 'super_admin') {
        throw new Error('Super Admin access required.')
      }

      sessionStorage.setItem('admin', JSON.stringify(adminData))
      setAdmin(adminData)
    } catch (error) {
      clearAdminSession()
    } finally {
      setLoading(false)
    }
  }, [clearAdminSession])

  useEffect(() => {
    verifyAdmin()

    const handleAdminAuthExpired = () => {
      clearAdminSession()
      setLoading(false)
    }

    window.addEventListener('adminAuthExpired', handleAdminAuthExpired)
    return () => window.removeEventListener('adminAuthExpired', handleAdminAuthExpired)
  }, [verifyAdmin, clearAdminSession])

  const login = async (email, password) => {
    const response = await adminApi.post('/admin/login', { email, password })
    const { token, admin: adminData } = response.data || {}

    if (!token || !adminData || adminData.role !== 'super_admin') {
      throw new Error('Super Admin access required.')
    }

    sessionStorage.setItem('adminToken', token)
    sessionStorage.setItem('admin', JSON.stringify(adminData))
    setAdmin(adminData)
    return adminData
  }

  const logout = async () => {
    try {
      if (sessionStorage.getItem('adminToken')) {
        await adminApi.post('/admin/logout')
      }
    } catch (error) {
      console.error('Admin logout request failed:', error)
    } finally {
      clearAdminSession()
    }
  }

  const isAdminAuthenticated = Boolean(
    admin && sessionStorage.getItem('adminToken')
  )

  const value = useMemo(() => ({
    admin,
    loading,
    isAdminAuthenticated,
    login,
    logout,
    verifyAdmin
  }), [admin, loading, isAdminAuthenticated, verifyAdmin])

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  return context
}

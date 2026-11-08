import { Navigate, Outlet } from 'react-router-dom'

import { useAdminAuth } from '../context/AdminAuthContext'

const AdminProtectedRoute = () => {
  const {
    isAdminAuthenticated,
    loading
  } = useAdminAuth()

  // Wait until admin session verification completes
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <p>Verifying admin access...</p>
      </div>
    )
  }

  // Redirect unauthenticated users
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}

export default AdminProtectedRoute
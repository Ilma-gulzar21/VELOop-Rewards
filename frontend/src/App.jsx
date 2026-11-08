import { Routes, Route, Navigate, useLocation } from 'react-router-dom'

import Navbar from './components/Navbar'
import AdminLayout from './components/AdminLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminProtectedRoute from './components/AdminProtectedRoute'

import Dashboard from './pages/Dashboard/Dashboard'
import Payout from './pages/Payout/Payout'
import Login from './pages/Authentication/Login'
import Signup from './pages/Authentication/Signup'
import RedemptionHistory from './pages/RedemptionHistory/RedemptionHistory'
import RedemptionDetails from './pages/RedemptionHistory/RedemptionDetails'

import AdminLogin from './pages/Admin/AdminLogin'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminAuditLogs from './pages/Admin/AuditLogs'
import AdminUsers from './pages/Admin/AdminUsers'
import AdminTransactions from './pages/Admin/AdminTransactions'
import AdminPayoutManagement from './pages/Admin/AdminPayoutManagement'
import AdminRedemptions from './pages/Admin/AdminRedemptions'
import AdminSettings from './pages/Admin/AdminSettings'

function App() {
  const location = useLocation()
  const isAdminPath = location.pathname.startsWith('/admin')

  return (
    <>
      {!isAdminPath && <Navbar />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/Payout" element={<Payout />} />
          <Route path="/history" element={<RedemptionHistory />} />
          <Route path="/history/:redemptionId" element={<RedemptionDetails />} />
        </Route>

        <Route element={<AdminProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/transactions" element={<AdminTransactions />} />
            <Route path="/admin/payout-management" element={<AdminPayoutManagement />} />
            <Route path="/admin/redemptions" element={<AdminRedemptions />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App

import styles from '../sharedPage.module.css'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ReceiptText,
  CreditCard,
  Gift,
  ClipboardList,
  ShieldCheck,
  LogOut,
  Settings
} from 'lucide-react'
import { useAdminAuth } from '../context/AdminAuthContext'
import './AdminLayout.css'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/admin/redemptions', label: 'Redemptions', icon: Gift },
  { to: '/admin/payout-management', label: 'Payout Management', icon: CreditCard },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { to: '/admin/settings', label: 'Settings', icon: Settings }
]

const AdminLayout = () => {
  const { logout, admin } = useAdminAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
  <div className={`${styles.componentShell} admin-shell`}>
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-brand-icon"><ShieldCheck size={21} /></span>
        <span>VELOop <small>ADMIN CONSOLE</small></span>
      </div>

      <div className="admin-sidebar-label">WORKSPACE</div>
      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        {admin?.name && <span className="admin-sidebar-user">{admin.name}</span>}
        <button type="button" className="admin-sidebar-logout" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
        <span>Restricted access · Super Admin</span>
      </div>
    </aside>

    <div className="admin-shell-content">
      <div className="admin-shell-topbar">
        <span>VELOop Rewards Management</span>
        <span className="admin-shell-secure"><ShieldCheck size={15} /> Secure Admin Session</span>
      </div>
      <Outlet />
    </div>
  </div>
  )
}

export default AdminLayout

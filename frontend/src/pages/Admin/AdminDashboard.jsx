import styles from './adminPage.module.css'
import { useCallback, useEffect, useState } from 'react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, LogOut, Eye, X } from 'lucide-react'
import { adminApi } from '../../services/api'
import './Admin.css'

const AdminDashboard = () => {
const { admin, logout } = useAdminAuth()
const navigate = useNavigate()

const [redemptions, setRedemptions] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')
const [stats, setStats] = useState(null)
const [statsLoading, setStatsLoading] = useState(true)
const [statsError, setStatsError] = useState('')
const [statusFilter, setStatusFilter] = useState('ALL')
const [startDate, setStartDate] = useState('')
const [endDate, setEndDate] = useState('')

const [selectedRedemption, setSelectedRedemption] = useState(null)
const [detailsLoading, setDetailsLoading] = useState(false)
const [detailsError, setDetailsError] = useState('')

const [actionLoading, setActionLoading] = useState(false)
const [actionNote, setActionNote] = useState('')
const [providerReference, setProviderReference] = useState('')
const [actionError, setActionError] = useState('')
const [successMessage, setSuccessMessage] = useState('')

// Extract redemption list from API response
const getRedemptionList = (data) => {
if (Array.isArray(data?.redemptions)) {
return data.redemptions
}

if (Array.isArray(data?.data?.redemptions)) {
  return data.data.redemptions
}

if (Array.isArray(data?.data)) {
  return data.data
}

return []


}

// Extract one redemption from API response
const getRedemptionDetails = (data) => {
return (
data?.redemption ||
data?.data?.redemption ||
data?.data ||
null
)
}

// Fetch all redemption requests
const fetchRedemptions = useCallback(async () => {
try {
setLoading(true)
setError('')

  const response = await adminApi.get('/admin/redemptions', { params: { ...(startDate && { startDate }), ...(endDate && { endDate }) } })

  setRedemptions(getRedemptionList(response.data))
} catch (err) {
  console.error('Fetch redemptions error:', err)

  setError(
    err.response?.data?.message ||
    'Unable to fetch redemption requests.'
  )
} finally {
  setLoading(false)
}

}, [startDate, endDate])
// Fetch dashboard statistics from backend
const fetchDashboardStats = useCallback(async () => {
  try {
    setStatsLoading(true)
    setStatsError('')

    const response = await adminApi.get('/admin/dashboard/stats', { params: { ...(startDate && { startDate }), ...(endDate && { endDate }) } })

    if (!response.data?.stats) {
      throw new Error('Dashboard statistics not received.')
    }

    setStats(response.data.stats)

  } catch (err) {
    console.error('Dashboard stats error:', err)

    setStatsError(
      err.response?.data?.message ||
      err.message ||
      'Unable to fetch dashboard statistics.'
    )
  } finally {
    setStatsLoading(false)
  }
}, [startDate, endDate])
// Refresh dashboard data
const refreshDashboard = useCallback(async () => {
  await Promise.all([
    fetchRedemptions(),
    fetchDashboardStats()
  ])
}, [fetchRedemptions, fetchDashboardStats])

useEffect(() => {
  refreshDashboard()
}, [refreshDashboard])

useEffect(() => {
  if (!selectedRedemption && !detailsLoading && !detailsError) return
  const onKeyDown = event => { if (event.key === 'Escape') closeDetails() }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [selectedRedemption, detailsLoading, detailsError, actionLoading])
// Fetch individual redemption details
const handleViewDetails = async (id) => {
try {
setDetailsLoading(true)
setSelectedRedemption(null)
setDetailsError('')
setActionError('')
setActionNote('')
setProviderReference('')
setSuccessMessage('')

  const response = await adminApi.get(
    `/admin/redemptions/${id}`
  )

  const details = getRedemptionDetails(response.data)

  if (!details) {
    throw new Error('Redemption details were not returned by the server.')
  }

  setSelectedRedemption(details)
} catch (err) {
  console.error('Redemption details error:', err)

  setDetailsError(
    err.response?.data?.message ||
    err.message ||
    'Unable to fetch redemption details.'
  )
} finally {
  setDetailsLoading(false)
}

}

// Available status transitions
const transitions = {
PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
UNDER_REVIEW: ['APPROVED', 'REJECTED'],
APPROVED: ['COMPLETED', 'FAILED'],
COMPLETED: [],
REJECTED: [],
FAILED: []
}

const availableActions = selectedRedemption
? transitions[selectedRedemption.status] || []
: []

// Get action button label
const getActionLabel = (status) => {
switch (status) {
case 'UNDER_REVIEW':
return 'Move to Review'
  case 'APPROVED':
    return 'Approve'

  case 'REJECTED':
    return 'Reject'

  case 'COMPLETED':
    return 'Complete'

  case 'FAILED':
    return 'Mark Failed'

  default:
    return status
}

}

// Update redemption status
const handleStatusUpdate = async (status) => {
if (!selectedRedemption) return

if (status === 'COMPLETED' && !providerReference.trim()) { setActionError('Provider/payment reference is required to complete a redemption.'); return }

if (
  (status === 'REJECTED' || status === 'FAILED') &&
  !actionNote.trim()
) {
  setActionError(
    status === 'REJECTED'
      ? 'Please enter a rejection reason.'
      : 'Please enter a failure reason.'
  )
  return
}

try {
  setActionLoading(true)
  setActionError('')
  setSuccessMessage('')

  const redemptionId = selectedRedemption._id

  const response = await adminApi.patch(
    `/admin/redemptions/${redemptionId}/status`,
    {
      status,
      adminNote: actionNote.trim(),
      ...(status === 'COMPLETED' ? { providerReference: providerReference.trim() } : {})
    }
  )

  setSuccessMessage(
    response.data?.message || 'Status updated successfully.'
  )

  // Refresh redemption list
await refreshDashboard()

  // Fetch updated redemption details
  const detailsResponse = await adminApi.get(
    `/admin/redemptions/${redemptionId}`
  )

  const updatedDetails = getRedemptionDetails(
    detailsResponse.data
  )

  if (updatedDetails) {
    setSelectedRedemption(updatedDetails)
  }

  setActionNote('')
  setProviderReference('')
} catch (err) {
  console.error('Status update error:', err)

  setActionError(
    err.response?.data?.message ||
    'Unable to update redemption status.'
  )
} finally {
  setActionLoading(false)
}

}

// Close details modal
const closeDetails = () => {
if (actionLoading || detailsLoading) return

setSelectedRedemption(null)
setDetailsError('')
setActionNote('')
setProviderReference('')
setActionError('')
setSuccessMessage('')


}

// Admin logout
const handleLogout = async () => {
await logout()
navigate('/admin/login', { replace: true })
}
// Filter redemption requests
const filteredRedemptions =
statusFilter === 'ALL'
? redemptions
: redemptions.filter(
(item) => item.status === statusFilter
)

// Format date
const formatDate = (date) => {
if (!date) return 'N/A'

const parsedDate = new Date(date)

if (Number.isNaN(parsedDate.getTime())) {
  return 'N/A'
}

return parsedDate.toLocaleString('en-IN')


}

return ( <div className={`${styles.page} admin-dashboard`}>

  {/* Header */}
  <div className="admin-dashboard-header">

    <div>
      <h2>Admin Dashboard</h2>
      <p>Welcome, {admin?.name || 'Admin'}</p>
    </div>

    <div className="admin-header-actions">

      <button
        type="button"
        className="admin-view-btn"
        onClick={() => navigate('/admin/users')}
      >
        Users Management
      </button>

      <button
        type="button"
        className="admin-view-btn"
        onClick={() => navigate('/admin/audit-logs')}
      >
        Audit Logs
      </button>

      <button
        type="button"
        className="admin-view-btn"
        onClick={() => navigate('/admin/transactions')}
      >
        Transactions
      </button>

      <button
        type="button"
        className="admin-view-btn"
        onClick={() => navigate('/admin/payout-management')}
      >
        Payout Management
      </button>

      <button
        type="button"
        className="admin-refresh-btn"
   onClick={refreshDashboard}
disabled={loading || statsLoading}
      >
        <RefreshCw size={16} />
      {loading || statsLoading ? 'Refreshing...' : 'Refresh'}
      </button>

      <button
        type="button"
        className="admin-logout-btn"
        onClick={handleLogout}
      >
        <LogOut size={16} />
        Logout
      </button>

    </div>
  </div>

  {/* Statistics */}
<div className="admin-filters admin-dashboard-date-filters"><label>From <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label><label>To <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label><button type="button" className="admin-view-btn" onClick={() => { setStartDate(''); setEndDate('') }}>Clear dates</button></div>
<div className="admin-stats-grid">

  <div className="admin-stat-card">
    <h4>Total Redemptions</h4>
    <h2>{statsLoading ? '—' : (stats?.totalRedemptions ?? 0)}</h2>
  </div>

  <div className="admin-stat-card pending-card">
    <h4>Pending</h4>
    <h2>{statsLoading ? '—' : (stats?.pendingRedemptions ?? 0)}</h2>
  </div>

  <div className="admin-stat-card">
    <h4>Under Review</h4>
    <h2>{statsLoading ? '—' : (stats?.underReviewRedemptions ?? 0)}</h2>
  </div>

  <div className="admin-stat-card approved-card">
    <h4>Approved</h4>
    <h2>{statsLoading ? '—' : (stats?.approvedRedemptions ?? 0)}</h2>
  </div>

  <div className="admin-stat-card approved-card">
    <h4>Completed</h4>
    <h2>{statsLoading ? '—' : (stats?.completedRedemptions ?? 0)}</h2>
  </div>

  <div className="admin-stat-card rejected-card">
    <h4>Rejected</h4>
    <h2>{statsLoading ? '—' : (stats?.rejectedRedemptions ?? 0)}</h2>
  </div>

  <div className="admin-stat-card rejected-card">
    <h4>Failed</h4>
    <h2>{statsLoading ? '—' : (stats?.failedRedemptions ?? 0)}</h2>
  </div>
  <div className="admin-stat-card rejected-card">
    <h4>Cancelled</h4>
    <h2>{statsLoading ? '—' : (stats?.cancelledRedemptions ?? 0)}</h2>
  </div>

  <div className="admin-stat-card">
    <h4>VEs Currently Deducted</h4>
    <h2>
      {statsLoading
        ? '—'
        : Number(stats?.totalVEsRedeemed ?? 0).toLocaleString('en-IN')}
    </h2>
  </div>

  <div className="admin-stat-card">
    <h4>Completed Payout Value</h4>
    <h2>
      {statsLoading
        ? '—'
        : `₹${Number(stats?.totalPayoutValue ?? 0).toLocaleString('en-IN')}`}
    </h2>
  </div>

  <div className="admin-stat-card">
    <h4>Active Payout Methods</h4>
    <h2>{statsLoading ? '—' : (stats?.activePayoutMethods ?? 0)}</h2>
  </div>

  <div className="admin-stat-card">
    <h4>Active Reward Options</h4>
    <h2>{statsLoading ? '—' : (stats?.activeRewardOptions ?? 0)}</h2>
  </div>

</div>

{statsError && (
  <p className="admin-error">
    Dashboard statistics: {statsError}
  </p>
)}

  {/* Redemption Table */}
  <div className="admin-table-section">

    <div className="admin-table-header">

      <div>
        <h3>Redemption Requests</h3>
        <p>Manage user redemption requests</p>
      </div>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        aria-label="Filter redemption requests"
      >
        <option value="ALL">All Requests</option>
        <option value="PENDING">Pending</option>
        <option value="UNDER_REVIEW">Under Review</option>
        <option value="APPROVED">Approved</option>
        <option value="COMPLETED">Completed</option>
        <option value="REJECTED">Rejected</option>
        <option value="FAILED">Failed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

    </div>

    {loading ? (
      <p className="admin-message">
        Loading redemptions...
      </p>
    ) : error ? (
      <div>
        <p className="admin-error">{error}</p>

        <button
          type="button"
          className="admin-view-btn"
          onClick={fetchRedemptions}
        >
          Try Again
        </button>
      </div>
    ) : filteredRedemptions.length === 0 ? (
      <p className="admin-message">
        No redemption requests found.
      </p>
    ) : (

      <div className="admin-table-wrapper">

        <table className="admin-table">

          <thead>
            <tr>
              <th>Reference ID</th>
              <th>User</th>
              <th>Method</th>
              <th>Reward</th>
              <th>Required VEs</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>

            {filteredRedemptions.map((item) => (

              <tr key={item._id}>

                <td>{item.referenceId || 'N/A'}</td>

                <td>
                  <div>{item.user?.name || 'N/A'}</div>
                  <small>{item.user?.email || ''}</small>
                </td>

                <td>
                  {item.payoutMethod?.name ||
                    item.methodKey ||
                    'N/A'}
                </td>

                <td>₹{item.rewardValue ?? 0}</td>

                <td>{item.requiredVEs ?? 0}</td>

                <td>
                  <span
                    className={`admin-status ${String(
                      item.status || ''
                    ).toLowerCase()}`}
                  >
                    {item.status || 'N/A'}
                  </span>
                </td>

                <td>{formatDate(item.createdAt)}</td>

                <td>
                  <button
                    type="button"
                    className="admin-view-btn"
                    onClick={() => handleViewDetails(item._id)}
                  >
                    <Eye size={15} />
                    View
                  </button>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    )}

  </div>

  {/* Redemption Details Modal */}
  {(detailsLoading || selectedRedemption || detailsError) && (

    <div
      className="admin-modal-overlay"
      onClick={closeDetails}
    >

      <div
        className="admin-modal"
        role="dialog" aria-modal="true" aria-labelledby="dashboardRedemptionTitle"
        onClick={(e) => e.stopPropagation()}
      >

        <div className="admin-modal-header">

          <h3 id="dashboardRedemptionTitle">Redemption Details</h3>

          <button
            type="button"
            onClick={closeDetails}
            disabled={actionLoading || detailsLoading}
            aria-label="Close details"
          >
            <X size={22} />
          </button>

        </div>

        {detailsLoading ? (

          <p className="admin-message">
            Loading details...
          </p>

        ) : detailsError ? (

          <div>
            <p className="admin-error">{detailsError}</p>

            <button
              type="button"
              className="admin-view-btn"
              onClick={closeDetails}
            >
              Close
            </button>
          </div>

        ) : selectedRedemption && (

          <>

            <div className="admin-details-grid">

              <div>
                <label>Reference ID</label>
                <p>
                  {selectedRedemption.referenceId || 'N/A'}
                </p>
              </div>

              <div>
                <label>Status</label>
                <p>{selectedRedemption.status || 'N/A'}</p>
              </div>

              <div>
                <label>User Name</label>
                <p>
                  {selectedRedemption.user?.name || 'N/A'}
                </p>
              </div>

              <div>
                <label>Email</label>
                <p>
                  {selectedRedemption.user?.email || 'N/A'}
                </p>
              </div>

              <div>
                <label>Payout Method</label>
                <p>
                  {selectedRedemption.payoutMethod?.name ||
                    selectedRedemption.methodKey ||
                    'N/A'}
                </p>
              </div>

              <div>
                <label>Reward Amount</label>
                <p>₹{selectedRedemption.rewardValue ?? 0}</p>
              </div>

              <div>
                <label>Required VEs</label>
                <p>
                  {selectedRedemption.requiredVEs ?? 0}
                </p>
              </div>

              <div>
                <label>UPI ID</label>
                <p>
                  {selectedRedemption.payoutDetails?.upiId ||
                    'N/A'}
                </p>
              </div>

              <div>
                <label>Refunded</label>
                <p>
                  {selectedRedemption.refunded ? 'Yes' : 'No'}
                </p>
              </div>

              <div>
                <label>Created At</label>
                <p>
                  {formatDate(selectedRedemption.createdAt)}
                </p>
              </div>

            </div>

            {selectedRedemption.adminNote && (
              <div className="admin-existing-note">
                <label>Admin Note</label>
                <p>{selectedRedemption.adminNote}</p>
              </div>
            )}

            {/* Status Actions */}
            {availableActions.length > 0 && (

              <div className="admin-action-section">

                <label>Admin Note / Reason</label>

                {availableActions.includes('COMPLETED') && (
                  <div className="admin-form-group">
                    <label htmlFor="dashboardProviderReference">Provider / Payment Reference *</label>
                    <input id="dashboardProviderReference" value={providerReference} onChange={e => setProviderReference(e.target.value)} maxLength={120} placeholder="Enter provider transaction/reference ID" disabled={actionLoading} />
                  </div>
                )}

                <textarea
                  value={actionNote}
                  onChange={(e) => {
                    setActionNote(e.target.value)
                    setActionError('')
                  }}
                  placeholder="Enter an optional note, or a reason for rejection/failure..."
                  rows={3}
                  disabled={actionLoading}
                />

                <div className="admin-action-buttons">

                  {availableActions.map((status) => (

                    <button
                      type="button"
                      key={status}
                      className={
                        status === 'REJECTED' ||
                        status === 'FAILED'
                          ? 'admin-reject-btn'
                          : 'admin-approve-btn'
                      }
                      disabled={actionLoading}
                      onClick={() => handleStatusUpdate(status)}
                    >
                      {actionLoading
                        ? 'Processing...'
                        : getActionLabel(status)}
                    </button>

                  ))}

                </div>

              </div>

            )}

            {actionError && (
              <p className="admin-error">
                {actionError}
              </p>
            )}

            {successMessage && (
              <p className="admin-success">
                {successMessage}
              </p>
            )}

          </>

        )}

      </div>

    </div>

  )}

</div>

)
}

export default AdminDashboard

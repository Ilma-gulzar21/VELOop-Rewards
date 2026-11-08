import styles from './adminPage.module.css'
import { useCallback, useEffect, useState } from 'react'
import { Search, Eye, RefreshCw, X, AlertCircle } from 'lucide-react'
import { adminApi } from '../../services/api'
import './Admin.css'
import './AdminRedemptions.css'

const AdminRedemptions = () => {
  const [redemptions, setRedemptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [providerReference, setProviderReference] = useState('')

  const [selectedRedemption, setSelectedRedemption] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusRedemption, setStatusRedemption] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')

  const [successMessage, setSuccessMessage] = useState('')

  // Fetch all redemptions
  const fetchRedemptions = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

const response = await adminApi.get('/admin/redemptions', {
  params: {
    page: 1,
    limit: 50,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    search: searchTerm.trim() || undefined
  }
})

      const data = response.data

      const list =
        data.redemptions ||
        data.data?.redemptions ||
        data.data ||
        []

      setRedemptions(Array.isArray(list) ? list : [])

    } catch (err) {
      console.error('Fetch redemptions error:', err)

      setError(
        err.response?.data?.message ||
        'Unable to load redemptions. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm, startDate, endDate, sortBy, sortOrder])

  useEffect(() => {
    fetchRedemptions()
  }, [fetchRedemptions])

  useEffect(() => {
    if (!showStatusModal && !selectedRedemption && !detailsLoading && !detailsError) return
    const onKeyDown = event => { if (event.key === 'Escape') { if (showStatusModal) closeStatusModal(); else closeDetailsModal() } }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showStatusModal, selectedRedemption, detailsLoading, detailsError, updatingStatus])

  // View redemption details
  const handleViewDetails = async (redemptionId) => {
    try {
      setSelectedRedemption(null)
      setDetailsError('')
      setDetailsLoading(true)

      const response = await adminApi.get(
        `/admin/redemptions/${redemptionId}`
      )

      const details =
        response.data.redemption ||
        response.data.data?.redemption ||
        response.data.data ||
        response.data

      setSelectedRedemption(details)

    } catch (err) {
      console.error('Redemption details error:', err)

      setDetailsError(
        err.response?.data?.message ||
        'Unable to load redemption details.'
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  // Close details modal
  const closeDetailsModal = () => {
    if (detailsLoading) return

    setSelectedRedemption(null)
    setDetailsError('')
  }

  // Open status update modal
  const openStatusModal = (redemption) => {
    setStatusRedemption(redemption)
    setNewStatus('')
    setAdminNote('')
    setProviderReference('')
    setStatusError('')
    setShowStatusModal(true)
  }

  // Close status modal
  const closeStatusModal = () => {
    if (updatingStatus) return

    setShowStatusModal(false)
    setStatusRedemption(null)
    setNewStatus('')
    setAdminNote('')
    setProviderReference('')
    setStatusError('')
  }

  // Update redemption status
  const handleUpdateStatus = async (e) => {
    e.preventDefault()

    if (!statusRedemption || !newStatus) {
      setStatusError('Please select a status.')
      return
    }

    if (newStatus === 'COMPLETED' && !providerReference.trim()) {
      setStatusError('Provider/payment reference is required to complete a redemption.')
      return
    }

    if (
      (newStatus === 'REJECTED' || newStatus === 'FAILED') &&
      !adminNote.trim()
    ) {
      setStatusError(
        'Please provide a reason for rejection or failure.'
      )
      return
    }

    try {
      setUpdatingStatus(true)
      setStatusError('')
      setSuccessMessage('')

      await adminApi.patch(
        `/admin/redemptions/${statusRedemption._id}/status`,
        {
          status: newStatus,
          adminNote: adminNote.trim(),
          ...(newStatus === 'COMPLETED' ? { providerReference: providerReference.trim() } : {})
        }
      )

      // Close modal after successful update
      setShowStatusModal(false)
      setStatusRedemption(null)
      setNewStatus('')
      setAdminNote('')
      setProviderReference('')

      setSuccessMessage(
        'Redemption status updated successfully.'
      )

      await fetchRedemptions()

    } catch (err) {
      console.error('Update redemption status error:', err)

      setStatusError(
        err.response?.data?.message ||
        'Unable to update redemption status.'
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Available status transitions
  const getAvailableStatuses = (status) => {
    const normalizedStatus = String(status || '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')

    const transitions = {
      PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED'],
      APPROVED: ['COMPLETED', 'FAILED'],
      COMPLETED: [],
      REJECTED: [],
      FAILED: [],
      CANCELLED: []
    }

    return transitions[normalizedStatus] || []
  }

  // Status CSS class
  const getStatusClass = (status) => {
    return `status-${String(status || '').toLowerCase()}`
  }

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A'

    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  // Format values
  const formatValue = (value) => {
    if (value === undefined || value === null) {
      return 'N/A'
    }

    return value
  }

  // Get user name
  const getUserName = (redemption) => {
    return (
      redemption.user?.name ||
      redemption.user?.fullName ||
      redemption.userName ||
      'N/A'
    )
  }

  // Get user email
  const getUserEmail = (redemption) => {
    return (
      redemption.user?.email ||
      redemption.userEmail ||
      'N/A'
    )
  }

  // Get reward name
  const getRewardName = (redemption) => {
    return (
      redemption.rewardOption?.name ||
      redemption.rewardName ||
      redemption.payoutMethod?.name ||
      'N/A'
    )
  }

  // Get reference ID
  const getReference = (redemption) => {
    return (
      redemption.referenceId ||
      redemption.redemptionId ||
      redemption._id
    )
  }

  // Get available status options
  const getAvailableStatusOptions = () => {
    if (!statusRedemption) return []

    return getAvailableStatuses(statusRedemption.status)
  }

  return (
    <div className={`${styles.page} admin-redemptions-page`}>

      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1>Redemption Management</h1>
          <p>View and manage user redemption requests.</p>
        </div>

        <button
          type="button"
          className="admin-refresh-btn"
          onClick={fetchRedemptions}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="admin-success-message">
          {successMessage}

          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            aria-label="Close message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="admin-filters">

        <div className="admin-search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by user ID, name, email or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <label className="admin-filter-date">From <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label className="admin-filter-date">To <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
        <select aria-label="Sort redemptions" value={`${sortBy}:${sortOrder}`} onChange={e => { const [field, order] = e.target.value.split(':'); setSortBy(field); setSortOrder(order) }}>
          <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="rewardValue:desc">Highest reward</option><option value="requiredVEs:desc">Highest VEs</option><option value="status:asc">Status A–Z</option>
        </select>

      </div>

      {/* Error Message */}
      {error && (
        <div className="admin-error-message">
          <AlertCircle size={18} />

          <span>{error}</span>

          <button
            type="button"
            onClick={fetchRedemptions}
          >
            Retry
          </button>
        </div>
      )}

      {/* Redemption Table */}
      <div className="admin-table-container">

        {loading ? (
          <div className="admin-loading">
            <RefreshCw className="spin" size={24} />
            <p>Loading redemptions...</p>
          </div>

        ) : !error && redemptions.length === 0 ? (
          <div className="admin-empty-state">
            <p>No redemption requests found.</p>
          </div>

        ) : !error ? (

          <table className="admin-table">

            <thead>
              <tr>
                <th>Reference</th>
                <th>User</th>
                <th>Reward</th>
                <th>VEs</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {redemptions.map((redemption) => {

                const availableStatuses = getAvailableStatuses(
                  redemption.status
                )

                return (
                  <tr key={redemption._id}>

                    <td>
                      {getReference(redemption)}
                    </td>

                    <td>
                      <div>{getUserName(redemption)}</div>
                      <small>{getUserEmail(redemption)}</small>
                    </td>

                    <td>
                      {getRewardName(redemption)}
                    </td>

                    <td>
                      {formatValue(redemption.requiredVEs)}
                    </td>

                    <td>
                      <span
                        className={`admin-status-badge ${getStatusClass(
                          redemption.status
                        )}`}
                      >
                        {redemption.status}
                      </span>
                    </td>

                    <td>
                      {formatDate(redemption.createdAt)}
                    </td>

                    <td>
                      <div className="admin-action-buttons">

                        <button
                          type="button"
                          className="admin-view-btn"
                          onClick={() =>
                            handleViewDetails(redemption._id)
                          }
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>

                        {availableStatuses.length > 0 && (
                          <button
                            type="button"
                            className="admin-edit-btn"
                            onClick={() =>
                              openStatusModal(redemption)
                            }
                          >
                            Update Status
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>

          </table>

        ) : null}

      </div>

      {/* Redemption Details Modal */}
      {(selectedRedemption || detailsLoading || detailsError) &&
        !showStatusModal && (

          <div
            className="admin-modal-overlay"
            onClick={closeDetailsModal}
          >

            <div
              className="admin-modal"
              role="dialog" aria-modal="true" aria-labelledby="redemptionDetailsTitle"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="admin-modal-header">
                <h2 id="redemptionDetailsTitle">Redemption Details</h2>

                <button
                  type="button"
                  onClick={closeDetailsModal}
                  disabled={detailsLoading}
                  aria-label="Close redemption details"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="admin-modal-body">

                {detailsLoading ? (
                  <div className="admin-loading">
                    <RefreshCw className="spin" size={24} />
                    <p>Loading redemption details...</p>
                  </div>

                ) : detailsError ? (
                  <div className="admin-error-message">
                    <AlertCircle size={18} />
                    {detailsError}
                  </div>

                ) : selectedRedemption ? (

                  <div className="redemption-details-content">

                    <div className="detail-row">
                      <strong>Reference ID:</strong>
                      <span>{getReference(selectedRedemption)}</span>
                    </div>

                    <div className="detail-row">
                      <strong>User Name:</strong>
                      <span>{getUserName(selectedRedemption)}</span>
                    </div>

                    <div className="detail-row">
                      <strong>Email:</strong>
                      <span>{getUserEmail(selectedRedemption)}</span>
                    </div>

                    <div className="detail-row">
                      <strong>Reward:</strong>
                      <span>{getRewardName(selectedRedemption)}</span>
                    </div>

                    <div className="detail-row">
                      <strong>Required VEs:</strong>
                      <span>
                        {formatValue(selectedRedemption.requiredVEs)}
                      </span>
                    </div>

                    <div className="detail-row">
                      <strong>Reward Value:</strong>
                      <span>
                        {formatValue(selectedRedemption.rewardValue)}
                      </span>
                    </div>

                    <div className="detail-row">
                      <strong>Status:</strong>

                      <span
                        className={`admin-status-badge ${getStatusClass(
                          selectedRedemption.status
                        )}`}
                      >
                        {selectedRedemption.status}
                      </span>
                    </div>

                    <div className="detail-row">
                      <strong>Created At:</strong>
                      <span>
                        {formatDate(selectedRedemption.createdAt)}
                      </span>
                    </div>

                    <div className="detail-row">
                      <strong>Updated At:</strong>
                      <span>
                        {formatDate(selectedRedemption.updatedAt)}
                      </span>
                    </div>

                    {selectedRedemption.adminNote && (
                      <div className="detail-row">
                        <strong>Admin Note:</strong>
                        <span>{selectedRedemption.adminNote}</span>
                      </div>
                    )}

                    /* {selectedRedemption.rejectionReason && (
                      <div className="detail-row">
                        <strong>Rejection Reason:</strong>
                        <span>
                          {selectedRedemption.rejectionReason}
                        </span>
                      </div>
                    )} *

                    {selectedRedemption.refunded !== undefined && (
                      <div className="detail-row">
                        <strong>Refunded:</strong>
                        <span>
                          {selectedRedemption.refunded ? 'Yes' : 'No'}
                        </span>
                      </div>
                    )}

                  </div>

                ) : null}

              </div>
            </div>
          </div>
        )}

      {/* Update Status Modal */}
      {showStatusModal && statusRedemption && (

        <div
          className="admin-modal-overlay"
          onClick={closeStatusModal}
        >

          <div
            className="admin-modal"
            role="dialog" aria-modal="true" aria-labelledby="redemptionStatusTitle"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="admin-modal-header">
              <h2 id="redemptionStatusTitle">Update Redemption Status</h2>

              <button
                type="button"
                onClick={closeStatusModal}
                disabled={updatingStatus}
                aria-label="Close status modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>

              <div className="admin-modal-body">

                <p>
                  <strong>Reference:</strong>{' '}
                  {getReference(statusRedemption)}
                </p>

                <p>
                  <strong>Current Status:</strong>{' '}
                  {statusRedemption.status}
                </p>

                <div className="admin-form-group">

                  <label htmlFor="newRedemptionStatus">
                    New Status
                  </label>

                  <select
                    id="newRedemptionStatus"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    required
                    disabled={updatingStatus}
                  >
                    <option value="">Select Status</option>

                    {getAvailableStatusOptions().map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}

                  </select>

                </div>

                <div className="admin-form-group">

                  <label htmlFor="adminNote">
                    Admin Note / Reason
                  </label>

                  <textarea
                    id="adminNote"
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Enter note or reason..."
                    rows={4}
                    disabled={updatingStatus}
                  />

                </div>

                {newStatus === 'COMPLETED' && (
                  <div className="admin-form-group">
                    <label htmlFor="providerReference">Provider / Payment Reference *</label>
                    <input id="providerReference" value={providerReference} onChange={e => setProviderReference(e.target.value)} maxLength={120} required placeholder="Enter provider transaction/reference ID" disabled={updatingStatus} />
                  </div>
                )}

                {(newStatus === 'REJECTED' ||
                  newStatus === 'FAILED') && (

                  <p className="admin-warning-message">
                    A reason is required. The user's VEs will be
                    refunded according to the backend refund rules.
                  </p>
                )}

                {statusError && (
                  <div className="admin-error-message">
                    <AlertCircle size={18} />
                    {statusError}
                  </div>
                )}

              </div>

              <div className="admin-modal-footer">

                <button
                  type="button"
                  onClick={closeStatusModal}
                  disabled={updatingStatus}
                  className="admin-cancel-btn"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={updatingStatus || !newStatus}
                  className="admin-submit-btn"
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}

export default AdminRedemptions
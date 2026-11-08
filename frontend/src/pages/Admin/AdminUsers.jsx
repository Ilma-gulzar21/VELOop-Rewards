import styles from './adminPage.module.css'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Eye,
  X,
  PlusCircle,
  MinusCircle,
  UserX,
  UserCheck
} from 'lucide-react'
import { adminApi } from '../../services/api'
import './AdminUsers.css'

const AdminUsers = () => {
  const navigate = useNavigate()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0
  })

  const [selectedUser, setSelectedUser] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [statusLoadingId, setStatusLoadingId] = useState('')

  const updatePayoutRestriction = async () => {
    if (!selectedUser?._id) return
    const restricted = !selectedUser.payoutRestricted
    const reason = window.prompt(restricted ? 'Reason for restricting payout access (minimum 5 characters):' : 'Reason for restoring payout access (minimum 5 characters):')
    if (!reason || reason.trim().length < 5) return
    try {
      const response = await adminApi.patch(`/admin/users/${selectedUser._id}/payout-restriction`, { restricted, reason: reason.trim() })
      setSelectedUser(current => ({ ...current, ...response.data.user }))
      await fetchUsers(page, search)
    } catch (err) { window.alert(err.response?.data?.message || 'Unable to update payout restriction.') }
  }

  // Wallet states
  const [walletAction, setWalletAction] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState('')
  const [walletSuccess, setWalletSuccess] = useState('')

  // Fetch users
  const fetchUsers = useCallback(async (currentPage = 1, searchValue = '') => {
    try {
      setLoading(true)
      setError('')

      const response = await adminApi.get('/admin/users', {
        params: {
          page: currentPage,
          limit: 10,
          search: searchValue
        }
      })

      if (response.data.success) {
        setUsers(response.data.users || [])

        setPagination(
          response.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalUsers: 0
          }
        )
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to fetch users.'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(1, '')
  }, [fetchUsers])

  // Search users
  const handleSearch = (e) => {
    e.preventDefault()

    setPage(1)
    fetchUsers(1, search.trim())
  }

  // Pagination
  const handlePageChange = (newPage) => {
    if (
      newPage < 1 ||
      newPage > pagination.totalPages ||
      loading
    ) {
      return
    }

    setPage(newPage)
    fetchUsers(newPage, search.trim())
  }

  // Fetch individual user details
  const fetchUserDetails = async (userId) => {
    try {
      setDetailsLoading(true)
      setDetailsError('')

      const response = await adminApi.get(
        `/admin/users/${userId}`
      )

      if (response.data.success) {
        setSelectedUser(response.data.user)
      }
    } catch (err) {
      setDetailsError(
        err.response?.data?.message ||
        'Failed to fetch user details.'
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  // Suspend or restore a user account with a recorded reason.
  const handleUserStatusChange = async (user) => {
    const nextStatus = !user.isActive
    const actionLabel = nextStatus ? 'restore' : 'suspend'

    if (!window.confirm(`Are you sure you want to ${actionLabel} ${user.name}?`)) {
      return
    }

    const reason = window.prompt(`Enter the reason to ${actionLabel} this user (5-250 characters):`)
    if (reason === null) return
    if (reason.trim().length < 5 || reason.trim().length > 250) {
      window.alert('Reason must contain 5 to 250 characters.')
      return
    }

    try {
      setStatusLoadingId(user._id)
      const response = await adminApi.patch(`/admin/users/${user._id}/status`, {
        isActive: nextStatus,
        reason: reason.trim()
      })

      setUsers(current => current.map(item =>
        item._id === user._id ? { ...item, isActive: nextStatus } : item
      ))

      if (selectedUser?._id === user._id) {
        setSelectedUser(current => current ? { ...current, isActive: nextStatus } : current)
      }

      window.alert(response.data?.message || 'User status updated.')
    } catch (err) {
      window.alert(err.response?.data?.message || 'Unable to update user status.')
    } finally {
      setStatusLoadingId('')
    }
  }

  // Date format
  const formatDate = (date) => {
    if (!date) return 'N/A'

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  // Open wallet action form
  const openWalletAction = (action) => {
    setWalletAction(action)
    setAmount('')
    setDescription('')
    setWalletError('')
    setWalletSuccess('')
  }

  // Close wallet action form
  const closeWalletAction = () => {
    if (walletLoading) return

    setWalletAction('')
    setAmount('')
    setDescription('')
    setWalletError('')
    setWalletSuccess('')
  }

  // Close user details modal
const closeUserDetails = () => {
  if (walletLoading) return

  setWalletAction('')
  setAmount('')
  setDescription('')
  setWalletError('')
  setWalletSuccess('')
  setDetailsError('')
  setSelectedUser(null)
}

useEffect(() => {
  if (!selectedUser && !detailsLoading && !detailsError) return
  const onKeyDown = event => { if (event.key === 'Escape' && !walletLoading) closeUserDetails() }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [selectedUser, detailsLoading, detailsError, walletLoading])

  // Credit / Debit wallet
  const handleWalletTransaction = async (e) => {
    e.preventDefault()

    if (!selectedUser?._id) {
      setWalletError('User information is unavailable.')
      return
    }

    const numericAmount = Number(amount)

    if (
      !Number.isInteger(numericAmount) ||
      numericAmount <= 0 ||
      numericAmount > 1000000
    ) {
      setWalletError(
        'Enter a valid whole amount between 1 and 1000000.'
      )
      return
    }

    try {
      setWalletLoading(true)
      setWalletError('')
      setWalletSuccess('')

      const endpoint =
        walletAction === 'CREDIT'
          ? '/admin/wallet/credit'
          : '/admin/wallet/debit'

      const idempotencyKey =
        `admin-${walletAction.toLowerCase()}-${crypto.randomUUID()}`

      const response = await adminApi.post(endpoint, {
        userId: selectedUser._id,
        amount: numericAmount,
        description: description.trim(),
        idempotencyKey
      })

      setWalletSuccess(
        response.data.message ||
        `Wallet ${walletAction.toLowerCase()} successful.`
      )

      setAmount('')
      setDescription('')

      // Refresh user details
      await fetchUserDetails(selectedUser._id)

      // Refresh users list
      await fetchUsers(page, search.trim())

    } catch (err) {
      setWalletError(
        err.response?.data?.message ||
        'Wallet transaction failed.'
      )
    } finally {
      setWalletLoading(false)
    }
  }

  return (
    <div className={`${styles.page} admin-users-page`}>

      {/* Header */}
      <div className="admin-users-header">

        <div>
          <button
            className="admin-users-back"
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <h1>Users Management</h1>
          <p>View and manage registered users.</p>
        </div>

        <button
          className="admin-users-refresh"
          onClick={() => fetchUsers(page, search.trim())}
          disabled={loading}
        >
          <RefreshCw size={17} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>

      </div>

      {/* Error */}
      {error && (
        <div className="admin-users-error">
          {error}

          <button
            onClick={() => fetchUsers(page, search.trim())}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="admin-users-stats">

        <div className="admin-users-stat-card">
          <span>Total Users</span>
          <h2>{pagination.totalUsers}</h2>
        </div>

        <div className="admin-users-stat-card">
          <span>Users on This Page</span>
          <h2>{users.length}</h2>
        </div>

        <div className="admin-users-stat-card">
          <span>Current Page</span>
          <h2>
            {pagination.currentPage} / {pagination.totalPages}
          </h2>
        </div>

      </div>

      {/* Users Table */}
      <div className="admin-users-table-card">

        <form
          className="admin-users-search"
          onSubmit={handleSearch}
        >

          <div className="admin-users-search-input">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading}>
            Search
          </button>

        </form>

        {loading ? (
          <div className="admin-users-message">
            Loading users...
          </div>
        ) : error ? (
          <div className="admin-users-message">
            Unable to display users.
          </div>
        ) : users.length === 0 ? (
          <div className="admin-users-message">
            No users found.
          </div>
        ) : (

          <div className="admin-users-table-wrapper">

            <table className="admin-users-table">

              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Available VEs</th>
                  <th>Total Earned</th>
                  <th>Total Redeemed</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {users.map((user) => (

                  <tr key={user._id}>

                    <td>{user.name || 'N/A'}</td>

                    <td>{user.email || 'N/A'}</td>

                    <td>
                      {user.wallet?.availableBalance ?? 0}
                    </td>

                    <td>
                      {user.wallet?.totalEarned ?? 0}
                    </td>

                    <td>
                      {user.wallet?.totalRedeemed ?? 0}
                    </td>

                    <td>
                      <span
                        className={
                          user.isActive
                            ? 'admin-user-active'
                            : 'admin-user-inactive'
                        }
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td>{formatDate(user.createdAt)}</td>

                    <td>
                      <div className="admin-user-row-actions">
                        <button
                          className="admin-user-view-btn"
                          onClick={() => fetchUserDetails(user._id)}
                        >
                          <Eye size={16} />
                          View
                        </button>
                        <button
                          type="button"
                          className={`admin-user-status-btn ${user.isActive ? 'suspend' : 'restore'}`}
                          onClick={() => handleUserStatusChange(user)}
                          disabled={statusLoadingId === user._id}
                          title={user.isActive ? 'Suspend user' : 'Restore user'}
                        >
                          {user.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          {statusLoadingId === user._id ? 'Saving...' : user.isActive ? 'Suspend' : 'Restore'}
                        </button>
                      </div>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

        {/* Pagination */}
        <div className="admin-users-pagination">

          <span>
            Total users: {pagination.totalUsers}
          </span>

          <div>

            <button
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </button>

            <span>
              {pagination.currentPage} / {pagination.totalPages}
            </span>

            <button
              disabled={
                page >= pagination.totalPages || loading
              }
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </button>

          </div>

        </div>

      </div>

      {/* User Details Modal */}
      {(selectedUser || detailsLoading || detailsError) && (

        <div
  className="admin-user-modal-overlay"
  onClick={closeUserDetails}
>

<div
  className="admin-user-modal"
  role="dialog" aria-modal="true" aria-labelledby="adminUserDetailsTitle"
  onClick={(e) => e.stopPropagation()}
>
            <div className="admin-user-modal-header">

              <h2 id="adminUserDetailsTitle">User Details</h2>

<button
  type="button"
  onClick={closeUserDetails}
  disabled={walletLoading}
  aria-label="Close user details"
>
  <X size={21} />
</button>

            </div>

            {detailsLoading ? (

              <div className="admin-users-message">
                Loading user details...
              </div>

            ) : detailsError ? (

              <div className="admin-users-error">
                {detailsError}
              </div>

            ) : selectedUser && (

              <>

                {/* User Information */}
                <div className="admin-user-info">

                  <h3>{selectedUser.name || 'N/A'}</h3>

                  <p>{selectedUser.email || 'N/A'}</p>

                  <span
                    className={
                      selectedUser.isActive
                        ? 'admin-user-active'
                        : 'admin-user-inactive'
                    }
                  >
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>

                  <p>
                    Joined: {formatDate(selectedUser.createdAt)}
                  </p>

                </div>

                <div className="admin-user-payout-restriction">
                  <p><strong>Payout access:</strong> {selectedUser.payoutRestricted ? 'Restricted' : 'Allowed'}</p>
                  {selectedUser.payoutRestrictionReason && <small>{selectedUser.payoutRestrictionReason}</small>}
                  <button type="button" className="admin-view-btn" onClick={updatePayoutRestriction}>{selectedUser.payoutRestricted ? 'Restore Payout Access' : 'Restrict Payout Only'}</button>
                </div>

                {/* Wallet Summary */}
                <h3 className="admin-user-section-title">
                  Wallet Summary
                </h3>

                <div className="admin-user-wallet-grid">

                  <div>
                    <span>Available Balance</span>
                    <h3>
                      {selectedUser.wallet?.availableBalance ?? 0} VEs
                    </h3>
                  </div>

                  <div>
                    <span>Total Earned</span>
                    <h3>
                      {selectedUser.wallet?.totalEarned ?? 0} VEs
                    </h3>
                  </div>

                  <div>
                    <span>Total Redeemed</span>
                    <h3>
                      {selectedUser.wallet?.totalRedeemed ?? 0} VEs
                    </h3>
                  </div>

                </div>

                {/* Wallet Actions */}
                <h3 className="admin-user-section-title">
                  Wallet Management
                </h3>

                <div className="admin-wallet-action-buttons">

                  <button
                    className="admin-wallet-credit-btn"
                    onClick={() => openWalletAction('CREDIT')}
                    disabled={walletLoading}
                  >
                    <PlusCircle size={17} />
                    Credit VEs
                  </button>

                  <button
                    className="admin-wallet-debit-btn"
                    onClick={() => openWalletAction('DEBIT')}
                    disabled={walletLoading}
                  >
                    <MinusCircle size={17} />
                    Debit VEs
                  </button>

                </div>

                {/* Credit / Debit Form */}
                {walletAction && (

                  <form
                    className="admin-wallet-form"
                    onSubmit={handleWalletTransaction}
                  >

                    <h3>
                      {walletAction === 'CREDIT'
                        ? 'Credit User Wallet'
                        : 'Debit User Wallet'}
                    </h3>

                    <label>Amount (VEs)</label>

                    <input
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      required
                      disabled={walletLoading}
                    />

                    <label>Description (Optional)</label>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter transaction description..."
                      rows="3"
                      disabled={walletLoading}
                    />

                    {walletError && (
                      <p className="admin-wallet-error">
                        {walletError}
                      </p>
                    )}

                    {walletSuccess && (
                      <p className="admin-wallet-success">
                        {walletSuccess}
                      </p>
                    )}

                    <div className="admin-wallet-form-actions">

                      <button
                        type="button"
                        className="admin-wallet-cancel-btn"
                        onClick={closeWalletAction}
                        disabled={walletLoading}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className={
                          walletAction === 'CREDIT'
                            ? 'admin-wallet-credit-btn'
                            : 'admin-wallet-debit-btn'
                        }
                        disabled={walletLoading}
                      >
                        {walletLoading
                          ? 'Processing...'
                          : walletAction === 'CREDIT'
                            ? 'Confirm Credit'
                            : 'Confirm Debit'}
                      </button>

                    </div>

                  </form>

                )}

                {/* Recent Transactions */}
                <h3 className="admin-user-section-title">
                  Recent Transactions
                </h3>

                <h3 className="admin-user-section-title">Redemption History</h3>
                {selectedUser.redemptionHistory?.length ? (
                  <div className="admin-user-transaction-list">
                    {selectedUser.redemptionHistory.map(item => (
                      <div className="admin-user-transaction-item" key={item._id}>
                        <div><strong>{item.referenceId}</strong><small>{item.methodKey} · {formatDate(item.createdAt)}</small></div>
                        <div><strong>{item.requiredVEs} VEs</strong><small>{item.status}</small></div>
                      </div>
                    ))}
                  </div>
                ) : <p>No redemption history found.</p>}

                {selectedUser.recentTransactions?.length > 0 ? (

                  <div className="admin-user-transactions">

                    {selectedUser.recentTransactions.map((transaction) => (

                      <div
                        className="admin-user-transaction"
                        key={transaction._id}
                      >

                        <div>
                          <strong>{transaction.type}</strong>

                          <p>{transaction.description || 'N/A'}</p>

                          <small>
                            {formatDate(transaction.createdAt)}
                          </small>
                        </div>

                        <div>
                          <strong>{transaction.amount} VEs</strong>
                          <small>{transaction.status}</small>
                        </div>

                      </div>

                    ))}

                  </div>

                ) : (

                  <p className="admin-users-message">
                    No transactions found.
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

export default AdminUsers
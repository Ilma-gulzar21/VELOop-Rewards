import styles from './adminPage.module.css'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

import { adminApi } from '../../services/api'
import './AdminTransactions.css'

function AdminTransactions() {
  const navigate = useNavigate()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [page, setPage] = useState(1)

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTransactions: 0,
    limit: 10
  })

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await adminApi.get('/admin/transactions', {
        params: {
          page,
          limit: 10,
          ...(type && { type }),
          ...(status && { status }),
          ...(search.trim() && { search: search.trim() }),
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        }
      })

      setTransactions(response.data.transactions || [])

      setPagination(
        response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalTransactions: 0,
          limit: 10
        }
      )

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load transactions.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [page, type, status, search, startDate, endDate])

  const formatDate = (date) => {
    if (!date) return 'N/A'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return 'N/A'
    }

    return parsedDate.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const formatType = (value) => {
    return value?.replaceAll('_', ' ') || 'N/A'
  }

  const getAmountClass = (transactionType) => {
    if (
      ['ADMIN_CREDIT', 'EARN', 'REFUND'].includes(transactionType)
    ) {
      return 'transaction-positive'
    }

    return 'transaction-negative'
  }

  const getAmountSign = (transactionType) => {
    return ['ADMIN_CREDIT', 'EARN', 'REFUND'].includes(transactionType)
      ? '+'
      : '-'
  }

  const resetFilters = () => {
    setType('')
    setStatus('')
    setSearch('')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  return (
    <div className={`${styles.page} admin-transactions-page`}>

      {/* Header */}

      <div className="transactions-header">

        <div>
          <button
            type="button"
            className="transactions-back-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <h1>Transactions</h1>

          <p>
            View and monitor all wallet transactions.
          </p>
        </div>

        <button
          type="button"
          className="transactions-refresh-btn"
          onClick={fetchTransactions}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? 'transactions-spinning' : ''}
          />
          Refresh
        </button>

      </div>

      {/* Summary */}

      <div className="transactions-summary">

        <div className="transaction-summary-card">
          <span>Total Transactions</span>

          <h2>
            {pagination?.totalTransactions || 0}
          </h2>
        </div>

      </div>

      {/* Filters */}

      <div className="transactions-filters">

        <div className="transaction-filter-group">
          <label htmlFor="transactionSearch">Search</label>
          <input id="transactionSearch" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Reference, description, user ID, name or email" />
        </div>
        <div className="transaction-filter-group"><label htmlFor="transactionStartDate">From</label><input id="transactionStartDate" type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} /></div>
        <div className="transaction-filter-group"><label htmlFor="transactionEndDate">To</label><input id="transactionEndDate" type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} /></div>

        <div className="transaction-filter-group">

          <label>Transaction Type</label>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Types</option>
            <option value="EARN">Earn</option>
            <option value="REDEEM">Redeem</option>
            <option value="ADMIN_CREDIT">Admin Credit</option>
            <option value="ADMIN_DEBIT">Admin Debit</option>
            <option value="REFUND">Refund</option>
          </select>

        </div>

        <div className="transaction-filter-group">

          <label>Status</label>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="REVERSED">Reversed</option>
          </select>

        </div>

        <button
          type="button"
          className="transactions-reset-btn"
          onClick={resetFilters}
        >
          Reset Filters
        </button>

      </div>

      {/* Error */}

      {error && (
        <div className="transactions-error">
          {error}
        </div>
      )}

      {/* Transactions Table */}

      <div className="transactions-table-container">

        <table className="transactions-table">

          <thead>
            <tr>
              <th>User</th>
              <th>Transaction Type</th>
              <th>Amount</th>
              <th>Balance Before</th>
              <th>Balance After</th>
              <th>Status</th>
              <th>Performed By</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>

            {loading ? (

              <tr>
                <td colSpan="8" className="transactions-empty">
                  Loading transactions...
                </td>
              </tr>

            ) : transactions.length === 0 ? (

              <tr>
                <td colSpan="8" className="transactions-empty">
                  No transactions found.
                </td>
              </tr>

            ) : (

              transactions.map((transaction) => (

                <tr key={transaction._id}>

                  <td>
                    <div className="transaction-user">

                      <strong>
                        {transaction.user?.name || 'Unknown'}
                      </strong>

                      <small>
                        {transaction.user?.email || 'N/A'}
                      </small>

                    </div>
                  </td>

                  <td>
                    <span className="transaction-type">
                      {formatType(transaction.type)}
                    </span>
                  </td>

                  <td>
                    <strong className={getAmountClass(transaction.type)}>
                      {getAmountSign(transaction.type)}
                      {transaction.amount ?? 0} VEs
                    </strong>
                  </td>

                  <td>
                    {transaction.balanceBefore ?? 0} VEs
                  </td>

                  <td>
                    {transaction.balanceAfter ?? 0} VEs
                  </td>

                  <td>
                    <span
                      className={`transaction-status status-${String(
                        transaction.status || ''
                      ).toLowerCase()}`}
                    >
                      {transaction.status || 'N/A'}
                    </span>
                  </td>

                  <td>
                    <div className="transaction-user">

                      <strong>
                        {transaction.performedBy?.name || 'System'}
                      </strong>

                      <small>
                        {transaction.performedBy?.email || '-'}
                      </small>

                    </div>
                  </td>

                  <td>
                    {formatDate(transaction.createdAt)}
                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* Pagination */}

      <div className="transactions-pagination">

        <span>
          Page {pagination?.currentPage || 1} of{' '}
          {pagination?.totalPages || 1}
        </span>

        <div>

          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => prev - 1)}
          >
            <ChevronLeft size={18} />
            Previous
          </button>

          <button
            type="button"
            disabled={
              page >= (pagination?.totalPages || 1) || loading
            }
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
            <ChevronRight size={18} />
          </button>

        </div>

      </div>

    </div>
  )
}

export default AdminTransactions
import styles from '../../sharedPage.module.css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import {
History,
Clock3,
CheckCircle2,
XCircle,
Search,
Filter,
Gift,
CalendarDays,
RefreshCw,
FileClock,
ArrowRight,
ArrowUpRight,
ReceiptText
} from 'lucide-react'
import api from '../../services/api'
import './RedemptionHistory.css'

const statusOptions = [
'All Status',
'PENDING',
'UNDER_REVIEW',
'APPROVED',
'COMPLETED',
'REJECTED',
'FAILED',
'CANCELLED'
]

const methodOptions = [
'All Methods',
'upi',
'amazon',
'googlePlay'
]

const getStatusClass = status => {
return status?.toLowerCase().replaceAll('_', '-') || 'unknown'
}

const formatStatus = status => {
return status
?.replaceAll('_', ' ')
?.toLowerCase()
?.replace(/\b\w/g, letter => letter.toUpperCase()) || 'Unknown'
}

const formatMethod = method => {
const methods = {
upi: 'UPI Cash',
amazon: 'Amazon Gift Card',
googlePlay: 'Google Play'
}

return methods[method] || method
}

const formatDate = date => {
if (!date) return '--'

return new Date(date).toLocaleDateString('en-IN', {
day: '2-digit',
month: 'short',
year: 'numeric'
})
}

const RedemptionHistory = () => {
const navigate = useNavigate()

const [transactions, setTransactions] = useState([])
const [searchTerm, setSearchTerm] = useState('')
const [selectedStatus, setSelectedStatus] = useState('All Status')
const [selectedMethod, setSelectedMethod] = useState('All Methods')

const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

const [page, setPage] = useState(1)

const [pagination, setPagination] = useState({
currentPage: 1,
totalPages: 1,
totalRedemptions: 0
})

// Fetch Redemption History
const fetchHistory = async (pageNumber = 1) => {
try {
setLoading(true)
setError('')

  const response = await api.get(
    `/redemptions/my?page=${pageNumber}&limit=50`
  )

  if (response.data.success) {
    setTransactions(response.data.redemptions || [])

    setPagination(
      response.data.pagination || {
        currentPage: pageNumber,
        totalPages: 1,
        totalRedemptions: 0
      }
    )
  }

} catch (err) {
  console.error('Redemption history error:', err)

  setError(
    err.response?.data?.message ||
    'Unable to load redemption history.'
  )

} finally {
  setLoading(false)
}

}

useEffect(() => {
fetchHistory(page)
}, [page])

// Search and Filters
const filteredTransactions = useMemo(() => {
return transactions.filter(transaction => {

  const matchesSearch = (
    transaction.referenceId || ''
  ).toLowerCase().includes(searchTerm.toLowerCase())

  const matchesStatus =
    selectedStatus === 'All Status' ||
    transaction.status === selectedStatus

  const matchesMethod =
    selectedMethod === 'All Methods' ||
    transaction.methodKey === selectedMethod

  return matchesSearch && matchesStatus && matchesMethod
})

}, [transactions, searchTerm, selectedStatus, selectedMethod])

// Summary Counts
const totalRequests = pagination?.totalRedemptions || 0

const pendingCount = transactions.filter(transaction =>
['PENDING', 'UNDER_REVIEW', 'APPROVED'].includes(transaction.status)
).length

const completedCount = transactions.filter(
transaction => transaction.status === 'COMPLETED'
).length

const rejectedCount = transactions.filter(
transaction => ['REJECTED', 'FAILED', 'CANCELLED'].includes(transaction.status)
).length

const summaryCards = [
{
title: 'Total Requests',
value: totalRequests,
subtitle: 'All redemption requests',
icon: History,
color: 'blue'
},
{
title: 'Pending',
value: pendingCount,
subtitle: 'On current page',
icon: Clock3,
color: 'orange'
},
{
title: 'Completed',
value: completedCount,
subtitle: 'On current page',
icon: CheckCircle2,
color: 'green'
},
{
title: 'Rejected',
value: rejectedCount,
subtitle: 'On current page',
icon: XCircle,
color: 'red'
}
]

// Reset Filters
const resetFilters = () => {
setSearchTerm('')
setSelectedStatus('All Status')
setSelectedMethod('All Methods')
}

const hasFilters =
searchTerm !== '' ||
selectedStatus !== 'All Status' ||
selectedMethod !== 'All Methods'

return ( <main className={`${styles.pageShell} history-page`}>

  <div className="history-container">

    {/* HEADER */}

    <motion.section
      className="history-header"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >

      <div className="history-title-group">

        <div className="history-title-icon">
          <History size={25} />
        </div>

        <div>
          <span className="history-eyebrow">
            TRANSACTION MANAGEMENT
          </span>

          <h1>Redemption History</h1>

          <p>
            Track your reward requests and monitor their
            processing status in one place.
          </p>
        </div>

      </div>

      <button
        className="history-refresh-button"
        type="button"
        onClick={() => fetchHistory(page)}
        disabled={loading}
      >
        <RefreshCw size={17} />
        Refresh
      </button>

    </motion.section>

    {/* SUMMARY CARDS */}

    <section className="history-summary-grid">

      {summaryCards.map(card => {
        const Icon = card.icon

        return (
          <motion.div
            className="history-summary-card"
            key={card.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >

            <div className={`summary-icon ${card.color}`}>
              <Icon size={23} />
            </div>

            <div className="summary-content">
              <span>{card.title}</span>
              <h2>{loading ? '--' : card.value}</h2>
              <p>{card.subtitle}</p>
            </div>

          </motion.div>
        )
      })}

    </section>

    {/* MAIN PANEL */}

    <section className="history-main-panel">

      <div className="history-panel-header">

        <div>
          <span className="history-section-label">
            YOUR TRANSACTIONS
          </span>

          <h2>All Redemption Requests</h2>

          <p>
            View your previous redemption activity and request status.
          </p>
        </div>

        <div className="history-panel-icon">
          <ReceiptText size={24} />
        </div>

      </div>

      {/* FILTERS */}

      <div className="history-filter-section">

        <div className="history-search-box">
          <Search size={19} />

          <input
            type="search"
            placeholder="Search by reference ID..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            aria-label="Search by reference ID"
          />
        </div>

        <div className="history-filter-control">
          <Filter size={17} />

          <select
            value={selectedStatus}
            onChange={event => setSelectedStatus(event.target.value)}
            aria-label="Filter by status"
          >
            {statusOptions.map(status => (
              <option key={status} value={status}>
                {status === 'All Status' ? status : formatStatus(status)}
              </option>
            ))}
          </select>
        </div>

        <div className="history-filter-control">
          <Gift size={17} />

          <select
            value={selectedMethod}
            onChange={event => setSelectedMethod(event.target.value)}
            aria-label="Filter by payout method"
          >
            {methodOptions.map(method => (
              <option key={method} value={method}>
                {method === 'All Methods' ? method : formatMethod(method)}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="history-reset-button"
            onClick={resetFilters}
          >
            Reset
          </button>
        )}

      </div>

      {/* TABLE */}

      <div className="history-table-wrapper">

        <table className="history-table">

          <thead>
            <tr>
              <th>REFERENCE ID</th>
              <th>REWARD METHOD</th>
              <th>AMOUNT</th>
              <th>REQUIRED VEs</th>
              <th>REQUEST DATE</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>

          <tbody>

            {!loading && !error && filteredTransactions.map(transaction => (

              <tr key={transaction._id}>

                <td>
                  <strong>{transaction.referenceId}</strong>
                </td>

                <td>
                  {formatMethod(transaction.methodKey)}
                </td>

                <td>
                  {(transaction.currency || transaction.rewardOption?.currency) === 'INR' ? '₹' : `${transaction.currency || transaction.rewardOption?.currency || ''} `}{transaction.rewardValue}
                </td>

                <td>
                  {transaction.requiredVEs} VEs
                </td>

                <td>
                  {formatDate(transaction.createdAt)}
                </td>

                <td>
                  <span
                    className={`history-status ${getStatusClass(
                      transaction.status
                    )}`}
                  >
                    {formatStatus(transaction.status)}
                  </span>
                </td>

                <td>
                  <button
                    className="history-action-button"
                    type="button"
                    aria-label="View redemption details"
                    onClick={() => navigate(`/history/${transaction._id}`)}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

        {/* LOADING */}

        {loading && (
          <div className="history-empty-state">
            <RefreshCw size={30} />
            <h3>Loading your history...</h3>
            <p>Please wait while we fetch your redemption requests.</p>
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div className="history-empty-state">
            <XCircle size={35} />
            <h3>Unable to Load History</h3>
            <p>{error}</p>

            <button
              className="history-empty-button"
              onClick={() => fetchHistory(page)}
            >
              Try Again
              <ArrowRight size={17} />
            </button>
          </div>
        )}

        {/* EMPTY */}

        {!loading && !error && filteredTransactions.length === 0 && (
          <div className="history-empty-state">

            <div className="empty-history-illustration">

              <div className="empty-history-circle">
                <FileClock size={37} />
              </div>

              <div className="empty-floating-icon">
                <Gift size={20} />
              </div>

            </div>

            <h3>
              {hasFilters
                ? 'No Matching Transactions'
                : 'No Redemption History Yet'}
            </h3>

            <p>
              {hasFilters
                ? 'No requests match your selected filters. Try changing your search or filters.'
                : 'Your redemption requests will appear here once you submit your first request.'}
            </p>

            {hasFilters ? (

              <button
                type="button"
                className="history-empty-button"
                onClick={resetFilters}
              >
                Clear Filters
                <ArrowRight size={17} />
              </button>

            ) : (

              <button
                type="button"
                className="history-empty-button"
                onClick={() => navigate('/Payout?method=upi')}
              >
                Redeem Your First Reward
                <ArrowRight size={17} />
              </button>

            )}

          </div>
        )}

      </div>

      {/* PAGINATION */}

      <div className="history-table-footer">

        <span>
          Showing {filteredTransactions.length} of {totalRequests} requests
        </span>

        <div className="history-pagination">

          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage(previous => previous - 1)}
          >
            Previous
          </button>

          <span>{pagination.currentPage || page}</span>

          <button
            type="button"
            disabled={
              page >= (pagination.totalPages || 1) || loading
            }
            onClick={() => setPage(previous => previous + 1)}
          >
            Next
          </button>

        </div>

      </div>

    </section>

    {/* INFORMATION CARDS */}

    <section className="history-information-grid">

      <div className="history-info-card">

        <div className="history-info-icon blue">
          <CalendarDays size={22} />
        </div>

        <div>
          <h3>Track Every Request</h3>

          <p>
            Monitor the status and timeline of your redemption
            requests from one dashboard.
          </p>
        </div>

      </div>

      <div className="history-info-card">

        <div className="history-info-icon green">
          <CheckCircle2 size={22} />
        </div>

        <div>
          <h3>Secure Transaction Records</h3>

          <p>
            Your redemption history is linked to your account
            and accessible only to you.
          </p>
        </div>

      </div>

    </section>

    {/* FOOTER */}

    <footer className="history-footer">

      <div className="history-footer-brand">
        <Gift size={18} />
        <strong>VELOop Rewards</strong>
      </div>

      <p>Your rewards journey, all in one place.</p>

      <span>
        © {new Date().getFullYear()} VELOop Rewards
      </span>

    </footer>

  </div>

</main>


)
}

export default RedemptionHistory;

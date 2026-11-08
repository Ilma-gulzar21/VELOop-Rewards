import styles from './adminPage.module.css'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  RefreshCw,
  Search,
  ClipboardList,
  CheckCircle,
  XCircle,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  X,
  Calendar,
  User,
  FileText,
  Tag
} from 'lucide-react'

import { adminApi } from '../../services/api'

import './Admin.css'
import './AuditLogs.css'

const ITEMS_PER_PAGE = 10

const AuditLogs = () => {
  const navigate = useNavigate()

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [entityFilter, setEntityFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0, limit: ITEMS_PER_PAGE })

  // Selected log for details popup
  const [selectedLog, setSelectedLog] = useState(null)

  // Fetch audit logs using server-side search, filters and pagination.
  const fetchLogs = useCallback(async (page = currentPage) => {
    try {
      setLoading(true)
      setError('')

      const response = await adminApi.get('/admin/audit-logs', {
        params: {
          page,
          limit: ITEMS_PER_PAGE,
          search: search.trim() || undefined,
          action: actionFilter === 'ALL' ? undefined : actionFilter,
          entityType: entityFilter === 'ALL' ? undefined : entityFilter
        }
      })

      if (!response.data?.success) throw new Error('Unable to load audit logs.')

      setLogs(Array.isArray(response.data.logs) ? response.data.logs : [])
      setPagination(response.data.pagination || { currentPage: page, totalPages: 1, totalLogs: 0, limit: ITEMS_PER_PAGE })
    } catch (err) {
      console.error('Audit logs error:', err)
      setError(err.response?.data?.message || err.message || 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, actionFilter, entityFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => fetchLogs(currentPage), 250)
    return () => window.clearTimeout(timer)
  }, [fetchLogs, currentPage])

  const formatAction = (action = '') => {
    return String(action)
      .replace(/[_-]+/g, ' ')
      .trim()
  }

  // Statistics for the currently loaded page. Total log count is server supplied.
  const approvedCount = logs.filter(log =>
    String(log.action || '').toUpperCase().includes('APPROVED')
  ).length

  const rejectedCount = logs.filter(log =>
    String(log.action || '').toUpperCase().includes('REJECTED')
  ).length

  const walletCount = logs.filter(log => {
    const action = String(log.action || '').toUpperCase()
    return action.includes('CREDIT') || action.includes('DEBIT')
  }).length

  const actionOptions = [
    'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'WALLET_CREDIT', 'WALLET_DEBIT',
    'REDEMPTION_UNDER_REVIEW', 'REDEMPTION_APPROVED', 'REDEMPTION_REJECTED',
    'REDEMPTION_COMPLETED', 'REDEMPTION_FAILED', 'PAYOUT_METHOD_CREATED',
    'PAYOUT_METHOD_UPDATED', 'PAYOUT_METHOD_ENABLED', 'PAYOUT_METHOD_DISABLED',
    'REWARD_OPTION_CREATED', 'REWARD_OPTION_UPDATED', 'REWARD_OPTION_ENABLED',
    'REWARD_OPTION_DISABLED', 'USER_SUSPENDED', 'USER_RESTORED'
  ]

  const entityOptions = ['ADMIN', 'REDEMPTION', 'WALLET', 'PAYOUT_METHOD', 'REWARD_OPTION', 'USER', 'SETTING']
  const filteredLogs = logs
  const totalPages = Math.max(1, pagination.totalPages || 1)
  const paginatedLogs = logs

  useEffect(() => {
    setCurrentPage(1)
  }, [search, actionFilter, entityFilter])

  // Close popup with Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedLog(null)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const clearFilters = () => {
    setSearch('')
    setActionFilter('ALL')
    setEntityFilter('ALL')
    setCurrentPage(1)
  }

  const formatDate = (date) => {
    if (!date) return '-'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return '-'
    }

    return parsedDate.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  const getActionClass = (action = '') => {
    const value = String(action).toUpperCase()

    if (
      value.includes('APPROVED') ||
      value.includes('COMPLETED')
    ) {
      return 'audit-approved'
    }

    if (
      value.includes('REJECTED') ||
      value.includes('FAILED')
    ) {
      return 'audit-rejected'
    }

    if (value.includes('CREDIT')) {
      return 'audit-credit'
    }

    if (value.includes('DEBIT')) {
      return 'audit-debit'
    }

    return 'audit-default'
  }

  const formatMetadataValue = (value) => {
    if (value === null || value === undefined) {
      return '-'
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }

    return String(value)
  }

  return (
    <div className={`${styles.page} admin-dashboard audit-logs-page`}>

      {/* Header */}
      <div className="audit-header">
        <div>
          <div className="audit-heading">
            <ClipboardList size={27} />
            <h2>Audit Logs</h2>
          </div>

          <p>Track and monitor all administrative activities.</p>
        </div>

        <div className="audit-header-actions">

          <button
            className="audit-back-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>

          <button
            className="audit-refresh-btn"
            onClick={() => fetchLogs(currentPage)}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? 'audit-spin' : ''}
            />
            Refresh
          </button>

        </div>
      </div>

      {/* Statistics */}
      <div className="audit-stats-grid">

        <div className="audit-stat-card">
          <div className="audit-stat-icon total">
            <ClipboardList size={22} />
          </div>
          <div>
            <h3>{pagination.totalLogs}</h3>
            <p>Total Logs</p>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon approved">
            <CheckCircle size={22} />
          </div>
          <div>
            <h3>{approvedCount}</h3>
            <p>Approved (This Page)</p>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon rejected">
            <XCircle size={22} />
          </div>
          <div>
            <h3>{rejectedCount}</h3>
            <p>Rejected (This Page)</p>
          </div>
        </div>

        <div className="audit-stat-card">
          <div className="audit-stat-icon wallet">
            <Wallet size={22} />
          </div>
          <div>
            <h3>{walletCount}</h3>
            <p>Wallet (This Page)</p>
          </div>
        </div>

      </div>

      {/* Activity History */}
      <div className="audit-content">

        <div className="audit-content-header">
          <div>
            <h3>Activity History</h3>
            <p>Search and monitor administrative activities.</p>
          </div>

          <span className="audit-record-count">
            {pagination.totalLogs} Records
          </span>
        </div>

        {/* Search and Filters */}
        <div className="audit-filters">

          <div className="audit-search">
            <Search size={19} className="audit-search-icon" />

            <input
              type="search"
              placeholder="Search admin, action, description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />

            {search && (
              <button
                type="button"
                className="audit-clear-search"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="audit-filter-select">
            <Filter size={17} />

            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
            >
              <option value="ALL">All Actions</option>

              {actionOptions.map(action => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>
          </div>

          <div className="audit-filter-select">
            <Tag size={17} />

            <select
              value={entityFilter}
              onChange={e => setEntityFilter(e.target.value)}
            >
              <option value="ALL">All Entities</option>

              {entityOptions.map(entity => (
                <option key={entity} value={entity}>
                  {entity.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {(search || actionFilter !== 'ALL' || entityFilter !== 'ALL') && (
            <button
              className="audit-reset-btn"
              onClick={clearFilters}
            >
              <X size={16} />
              Clear Filters
            </button>
          )}

        </div>

        {!loading && !error && (
          <div className="audit-search-info">
            Showing <strong>{filteredLogs.length}</strong> records on this page · <strong>{pagination.totalLogs}</strong> matching in total
            {search && (
              <span>
                {' '}for "<strong>{search}</strong>"
              </span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="audit-state">
            <div className="audit-loader"></div>
            <p>Loading audit logs...</p>
          </div>
        ) : error ? (
          <div className="audit-state audit-error-state">
            <XCircle size={35} />
            <h3>Something went wrong</h3>
            <p>{error}</p>

            <button onClick={() => fetchLogs(currentPage)}>
              Try Again
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="audit-state">
            <ClipboardList size={40} />
            <h3>No Audit Logs Found</h3>
            <p>
              Try another search term or change the filters.
            </p>

            {(search || actionFilter !== 'ALL' || entityFilter !== 'ALL') && (
              <button
                className="audit-empty-clear"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="audit-table-wrapper">

              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>Entity</th>
                    <th>Date & Time</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedLogs.map(log => (
                    <tr key={log._id}>

                      <td>
                        <div className="audit-admin-info">
                          <strong>
                            {log.admin?.name || (log.actorEmail ? 'Login attempt' : 'Unknown')}
                          </strong>

                          <small>
                            {log.admin?.email || log.actorEmail || '-'}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`audit-action ${getActionClass(log.action)}`}
                        >
                          {formatAction(log.action || 'UNKNOWN')}
                        </span>
                      </td>

                      <td className="audit-description">
                        {log.description || '-'}
                      </td>

                      <td>
                        <span className="audit-entity">
                          {log.entityType || '-'}
                        </span>
                      </td>

                      <td className="audit-date">
                        {formatDate(log.createdAt)}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="audit-view-btn"
                          onClick={() => setSelectedLog(log)}
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

            {/* Pagination */}
            <div className="audit-pagination">

              <span>
                Showing{' '}
                {pagination.totalLogs === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}
                {' '}to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, pagination.totalLogs)}
                {' '}of {pagination.totalLogs} records
              </span>

              <div className="audit-pagination-buttons">

                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <span>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                  <ChevronRight size={18} />
                </button>

              </div>

            </div>
          </>
        )}

      </div>

      {/* Audit Log Details Popup */}
      {selectedLog && (
        <div
          className="audit-modal-overlay"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="audit-modal"
            onClick={e => e.stopPropagation()}
          >

            <div className="audit-modal-header">
              <div>
                <div className="audit-modal-title-icon">
                  <ClipboardList size={21} />
                </div>

                <div>
                  <h3>Audit Log Details</h3>
                  <p>Complete administrative activity information</p>
                </div>
              </div>

              <button
                type="button"
                className="audit-modal-close"
                onClick={() => setSelectedLog(null)}
                aria-label="Close details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="audit-modal-body">

              <div className="audit-detail-grid">

                <div className="audit-detail-item">
                  <span>
                    <User size={15} />
                    Admin Name
                  </span>
                  <strong>
                    {selectedLog.admin?.name || (selectedLog.actorEmail ? 'Login attempt' : 'Unknown')}
                  </strong>
                </div>

                <div className="audit-detail-item">
                  <span>
                    <User size={15} />
                    Admin Email
                  </span>
                  <strong>
                    {selectedLog.admin?.email || selectedLog.actorEmail || '-'}
                  </strong>
                </div>

                <div className="audit-detail-item">
                  <span>
                    <Tag size={15} />
                    Action
                  </span>

                  <strong>
                    <span
                      className={`audit-action ${getActionClass(selectedLog.action)}`}
                    >
                      {formatAction(selectedLog.action || 'UNKNOWN')}
                    </span>
                  </strong>
                </div>

                <div className="audit-detail-item">
                  <span>
                    <ClipboardList size={15} />
                    Entity Type
                  </span>
                  <strong>{selectedLog.entityType || '-'}</strong>
                </div>

                <div className="audit-detail-item audit-detail-full">
                  <span>
                    <FileText size={15} />
                    Description
                  </span>
                  <strong>
                    {selectedLog.description || '-'}
                  </strong>
                </div>

                <div className="audit-detail-item audit-detail-full">
                  <span>
                    <Calendar size={15} />
                    Date & Time
                  </span>
                  <strong>
                    {formatDate(selectedLog.createdAt)}
                  </strong>
                </div>

                <div className="audit-detail-item audit-detail-full">
                  <span>
                    <ClipboardList size={15} />
                    Entity ID
                  </span>
                  <strong className="audit-break-text">
                    {selectedLog.entityId || '-'}
                  </strong>
                </div>

              </div>

              <div className="audit-modal-metadata">
                <h4>Additional Metadata</h4>

                {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 ? (
                  <div className="audit-metadata-list">
                    {Object.entries(selectedLog.metadata).map(
                      ([key, value]) => (
                        <div
                          className="audit-metadata-item"
                          key={key}
                        >
                          <strong>{key}</strong>
                          <pre>
                            {formatMetadataValue(value)}
                          </pre>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <p className="audit-no-metadata">
                    No additional metadata available.
                  </p>
                )}
              </div>

            </div>

            <div className="audit-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default AuditLogs
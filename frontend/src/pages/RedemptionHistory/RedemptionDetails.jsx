import styles from '../../sharedPage.module.css'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  XCircle,
  Gift,
  ReceiptText,
  CalendarDays,
  Wallet,
  Mail,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'

import api from '../../services/api'
import './RedemptionDetails.css'

// ======================================
// FORMAT HELPERS
// ======================================

const formatStatus = status => {
  return (
    status
      ?.replaceAll('_', ' ')
      ?.toLowerCase()
      ?.replace(/\b\w/g, letter => letter.toUpperCase()) ||
    'Unknown'
  )
}

const formatDate = date => {
  if (!date) return '--'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return '--'

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMethod = method => {
  const methods = {
    upi: 'UPI Cash',
    amazon: 'Amazon Gift Card',
    googlePlay: 'Google Play Gift Card'
  }

  return methods[method] || method || 'Unknown'
}

const formatAmount = (amount, currency = 'INR') => {
  if (amount === undefined || amount === null) return '--'

  if (currency === 'INR') {
    return `₹${Number(amount).toLocaleString('en-IN')}`
  }

  return `${currency} ${Number(amount).toLocaleString('en-IN')}`
}

// ======================================
// REDEMPTION DETAILS COMPONENT
// ======================================

const RedemptionDetails = () => {
  const { redemptionId } = useParams()
  const navigate = useNavigate()

  const [redemption, setRedemption] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelMessage, setCancelMessage] = useState('')

  // ======================================
  // FETCH REDEMPTION DETAILS
  // ======================================

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const response = await api.get(
        `/redemptions/my/${redemptionId}`
      )

      if (
        response.data?.success &&
        response.data?.redemption
      ) {
        setRedemption(response.data.redemption)
      } else {
        setRedemption(null)
        setError('Redemption details not found.')
      }

    } catch (err) {
      console.error(
        'Redemption Details Error:',
        err.response?.data || err.message
      )

      setRedemption(null)

      setError(
        err.response?.data?.message ||
        'Unable to load redemption details. Please try again.'
      )

    } finally {
      setLoading(false)
    }
  }, [redemptionId])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  // ======================================
  // CANCEL PENDING REDEMPTION
  // ======================================

  const handleCancelRedemption = async () => {
    if (
      !redemption ||
      redemption.status?.toUpperCase() !== 'PENDING' ||
      cancelLoading
    ) {
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to cancel this redemption? Your VEs will be refunded to your wallet immediately.'
    )

    if (!confirmed) return

    try {
      setCancelLoading(true)
      setCancelMessage('')

      const response = await api.patch(
        `/redemptions/my/${redemption._id}/cancel`
      )

      setCancelMessage(
        response.data?.message ||
        'Redemption cancelled and VEs refunded successfully.'
      )

      // Fetch updated redemption details
      await fetchDetails()

    } catch (err) {
      console.error(
        'Redemption Cancellation Error:',
        err.response?.data || err.message
      )

      setCancelMessage(
        err.response?.data?.message ||
        'Unable to cancel this redemption. Please try again.'
      )

    } finally {
      setCancelLoading(false)
    }
  }

  // ======================================
  // STATUS HELPERS
  // ======================================

  const getStatusClass = status => {
    return status?.toLowerCase().replaceAll('_', '-') || 'unknown'
  }

  // ======================================
  // LOADING STATE
  // ======================================

  if (loading) {
    return (
      <main className={`${styles.pageShell} redemption-details-page`}>
        <div className="details-state">

          <RefreshCw
            size={35}
            className="details-spinner"
          />

          <h3>Loading Redemption Details</h3>

          <p>
            Please wait while we fetch your transaction.
          </p>

        </div>
      </main>
    )
  }

  // ======================================
  // ERROR STATE
  // ======================================

  if (error || !redemption) {
    return (
      <main className="redemption-details-page">

        <div className="details-state">

          <XCircle size={42} />

          <h3>Unable to Load Details</h3>

          <p>
            {error || 'Redemption request not found.'}
          </p>

          <button
            onClick={fetchDetails}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Try Again
          </button>

          <button
            onClick={() => navigate('/history')}
          >
            <ArrowLeft size={17} />
            Back to History
          </button>

        </div>

      </main>
    )
  }

  // ======================================
  // REDEMPTION DATA
  // ======================================

  const payoutDetails = redemption.payoutDetails || {}

  const currentStatus = redemption.status?.toUpperCase()

  const isCompleted = currentStatus === 'COMPLETED'

  const isCancelled = currentStatus === 'CANCELLED'

  const isRejected = currentStatus === 'REJECTED'

  const isFailed = currentStatus === 'FAILED'

  const isPending = currentStatus === 'PENDING'

  const isErrorStatus = [
    'REJECTED',
    'FAILED',
    'CANCELLED'
  ].includes(currentStatus)

  const payoutMethod =
    redemption.methodKey ||
    redemption.payoutMethod?.key ||
    redemption.rewardSnapshot?.methodKey

  const currency =
    redemption.currency ||
    redemption.rewardOption?.currency ||
    redemption.rewardSnapshot?.currency ||
    'INR'

  // ======================================
  // STATUS HISTORY
  // ======================================

  const statusHistory = redemption.statusHistory?.length
    ? redemption.statusHistory
    : [
        {
          status: 'PENDING',
          changedAt: redemption.createdAt,
          note: 'Your redemption request was submitted.'
        },
        ...(currentStatus !== 'PENDING'
          ? [
              {
                status: currentStatus,
                changedAt: redemption.updatedAt,
                note: redemption.adminNote || ''
              }
            ]
          : [])
      ]

  // ======================================
  // ADMIN NOTE HEADING
  // ======================================

  const getNoteHeading = () => {
    if (isCancelled) return 'Cancellation Note'
    if (isRejected) return 'Rejection Reason'
    if (isFailed) return 'Failure Reason'

    return 'Admin Note'
  }

  const adminNote = redemption.adminNote

  // ======================================
  // MAIN UI
  // ======================================

  return (
    <main className="redemption-details-page">

      <div className="redemption-details-container">

        {/* HEADER */}

        <motion.div
          className="details-header"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
        >

          <button
            className="details-back-button"
            onClick={() => navigate('/history')}
          >
            <ArrowLeft size={18} />
            Back to History
          </button>

          <button
            className="details-refresh-button"
            onClick={fetchDetails}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

        </motion.div>

        {/* MAIN STATUS CARD */}

        <motion.section
          className="details-status-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >

          <div className="details-status-icon">

            {isCompleted ? (
              <CheckCircle2 size={34} />
            ) : isErrorStatus ? (
              <XCircle size={34} />
            ) : (
              <Clock3 size={34} />
            )}

          </div>

          <span className="details-eyebrow">
            REDEMPTION REQUEST
          </span>

          <h1>
            {formatStatus(currentStatus)}
          </h1>

          <p>
            {isCompleted
              ? 'Your redemption request has been completed successfully.'
              : isCancelled
                ? 'You cancelled this pending request. The VEs have been returned to your wallet.'
                : isRejected
                  ? 'Your redemption request was rejected.'
                  : isFailed
                    ? 'Your redemption request could not be completed.'
                    : currentStatus === 'APPROVED'
                      ? 'Your redemption request has been approved.'
                      : currentStatus === 'UNDER_REVIEW'
                        ? 'Your redemption request is currently under review.'
                        : 'Your redemption request is being processed.'}
          </p>

          <div className="details-reference">

            <span>REFERENCE ID</span>

            <strong>
              {redemption.referenceId || '--'}
            </strong>

          </div>

          {/* CANCEL BUTTON */}

          {isPending && (
            <button
              type="button"
              className="details-cancel-button"
              onClick={handleCancelRedemption}
              disabled={cancelLoading}
            >
              {cancelLoading
                ? 'Cancelling...'
                : 'Cancel Request'}
            </button>
          )}

          {cancelMessage && (
            <p
              role="status"
              className="details-cancel-message"
            >
              {cancelMessage}
            </p>
          )}

          <span
            className={`details-status-badge ${getStatusClass(currentStatus)}`}
          >
            {formatStatus(currentStatus)}
          </span>

        </motion.section>

        {/* REDEMPTION INFORMATION */}

        <section className="details-content-grid">

          <div className="details-main-column">

            {/* REWARD INFORMATION */}

            <div className="details-card">

              <div className="details-card-heading">

                <div className="details-card-icon blue">
                  <Gift size={21} />
                </div>

                <div>
                  <h2>Reward Information</h2>
                  <p>Your selected reward details</p>
                </div>

              </div>

              <div className="details-info-grid">

                <div className="details-info-item">

                  <span>Reward Amount</span>

                  <strong>
                    {formatAmount(
                      redemption.rewardValue,
                      currency
                    )}
                  </strong>

                </div>

                <div className="details-info-item">

                  <span>Required VEs</span>

                  <strong>
                    {redemption.requiredVEs?.toLocaleString('en-IN') ?? '--'} VEs
                  </strong>

                </div>

                <div className="details-info-item">

                  <span>Payout Method</span>

                  <strong>
                    {formatMethod(
                      payoutMethod ||
                      redemption.payoutMethod?.name
                    )}
                  </strong>

                </div>

                <div className="details-info-item">

                  <span>Request Date</span>

                  <strong>
                    {formatDate(redemption.createdAt)}
                  </strong>

                </div>

              </div>

            </div>

            {/* PAYOUT DETAILS */}

            <div className="details-card">

              <div className="details-card-heading">

                <div className="details-card-icon purple">
                  <CreditCard size={21} />
                </div>

                <div>
                  <h2>Payout Information</h2>
                  <p>Destination details for your reward</p>
                </div>

              </div>

              <div className="details-payout-box">

                {payoutMethod === 'upi' ? (

                  <>
                    <div className="details-payout-icon">
                      <Wallet size={22} />
                    </div>

                    <div>

                      <span>UPI ID</span>

                      <strong>
                        {payoutDetails.upiId || '--'}
                      </strong>

                    </div>
                  </>

                ) : (

                  <>
                    <div className="details-payout-icon">
                      <Mail size={22} />
                    </div>

                    <div>

                      <span>Delivery Email</span>

                      <strong>
                        {payoutDetails.email || '--'}
                      </strong>

                    </div>
                  </>

                )}

              </div>

            </div>

            {/* STATUS HISTORY */}

            <div className="details-card">

              <div className="details-card-heading">

                <div className="details-card-icon green">
                  <ReceiptText size={21} />
                </div>

                <div>
                  <h2>Request Timeline</h2>
                  <p>Track your redemption progress</p>
                </div>

              </div>

              <div className="details-timeline">

                {statusHistory.map((item, index) => {

                  const itemStatus = item.status?.toUpperCase()

                  return (
                    <div
                      className="timeline-item"
                      key={item._id || `${itemStatus}-${index}`}
                    >

                      <div className="timeline-marker">

                        {itemStatus === 'COMPLETED' ? (
                          <CheckCircle2 size={17} />
                        ) : [
                            'REJECTED',
                            'FAILED',
                            'CANCELLED'
                          ].includes(itemStatus) ? (
                          <XCircle size={17} />
                        ) : (
                          <Clock3 size={17} />
                        )}

                      </div>

                      <div className="timeline-content">

                        <strong>
                          {formatStatus(itemStatus)}
                        </strong>

                        <span>
                          {formatDate(
                            item.changedAt ||
                            item.createdAt ||
                            item.updatedAt
                          )}
                        </span>

                        {item.note && (
                          <p>{item.note}</p>
                        )}

                      </div>

                    </div>
                  )
                })}

              </div>

            </div>

            {/* ADMIN NOTE */}

            {adminNote && (
              <div
                className={`details-note-card ${
                  isErrorStatus ? 'error' : ''
                }`}
              >

                <AlertCircle size={21} />

                <div>

                  <h3>
                    {getNoteHeading()}
                  </h3>

                  <p>{adminNote}</p>

                </div>

              </div>
            )}

          </div>

          {/* RIGHT SIDEBAR */}

          <aside className="details-sidebar">

            {/* REQUEST SUMMARY */}

            <div className="details-card">

              <div className="details-card-heading">

                <div className="details-card-icon orange">
                  <CalendarDays size={21} />
                </div>

                <div>
                  <h2>Request Summary</h2>
                  <p>Transaction overview</p>
                </div>

              </div>

              <div className="details-summary-list">

                <div>

                  <span>Reference ID</span>

                  <strong>
                    {redemption.referenceId || '--'}
                  </strong>

                </div>

                <div>

                  <span>Created On</span>

                  <strong>
                    {formatDate(redemption.createdAt)}
                  </strong>

                </div>

                <div>

                  <span>Last Updated</span>

                  <strong>
                    {formatDate(redemption.updatedAt)}
                  </strong>

                </div>

                {redemption.completedAt && (
                  <div>

                    <span>Completed On</span>

                    <strong>
                      {formatDate(redemption.completedAt)}
                    </strong>

                  </div>
                )}

                <div>

                  <span>Refund Status</span>

                  <strong>
                    {redemption.refunded
                      ? 'Refunded'
                      : 'Not Refunded'}
                  </strong>

                </div>

              </div>

            </div>

            {/* SECURITY CARD */}

            <div className="details-security-card">

              <ShieldCheck size={27} />

              <h3>Secure Transaction</h3>

              <p>
                Your redemption details are securely linked
                to your account and are accessible only to you.
              </p>

            </div>

            {/* HISTORY BUTTON */}

            <button
              className="details-history-button"
              onClick={() => navigate('/history')}
            >
              <ArrowLeft size={17} />
              View All Redemptions
            </button>

          </aside>

        </section>

        {/* FOOTER */}

        <footer className="details-footer">

          <Gift size={18} />

          <strong>VELOop Rewards</strong>

          <span>
            Your rewards journey, all in one place.
          </span>

        </footer>

      </div>

    </main>
  )
}

export default RedemptionDetails
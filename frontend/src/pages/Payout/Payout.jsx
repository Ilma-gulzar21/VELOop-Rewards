import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FaAmazon, FaGooglePlay } from 'react-icons/fa'
import {
  Smartphone,
  ShoppingBag,
  CreditCard,
  Wallet,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Info,
  Gift,
  LockKeyhole,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react'

import api from '../../services/api'
import styles from './payout.module.css'
import './Payout.css'

const methodIcons = {
  upi: Smartphone,
  amazon: FaAmazon,
  googlePlay: FaGooglePlay
}

const Payout = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [methods, setMethods] = useState([])
  const [wallet, setWallet] = useState(null)

  const [selectedMethod, setSelectedMethod] = useState(
    searchParams.get('method') || 'upi'
  )

  const [selectedReward, setSelectedReward] = useState('')
  const [payoutAddress, setPayoutAddress] = useState('')

  const [step, setStep] = useState(1)

  const [error, setError] = useState('')
  const [accepted, setAccepted] = useState(false)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [successData, setSuccessData] = useState(null)
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [payoutInfo, setPayoutInfo] = useState({ processingInstructions: '', userFacingMessage: '' })

  // Same key is reused when the same request is retried.
  const idempotencyKeyRef = useRef(null)

  const currentMethod = methods.find(
    method => method.key === selectedMethod
  )

  const currentReward = currentMethod?.rewardOptions?.find(
    option => option._id === selectedReward
  )

  const isUpi = selectedMethod === 'upi'

  const availableBalance = wallet?.availableBalance ?? 0
  const enabledMethodCount = methods.filter(method => method.isEnabled !== false).length

  // Ask the backend to calculate eligibility and the post-redemption balance.
  useEffect(() => {
    if (!selectedReward) {
      setQuote(null)
      setQuoteError('')
      setQuoteLoading(false)
      return undefined
    }

    let cancelled = false
    setQuote(null)
    setQuoteError('')
    setQuoteLoading(true)

    api.post('/redemptions/quote', { rewardOptionId: selectedReward })
      .then(response => {
        if (!cancelled) setQuote(response.data?.quote || null)
      })
      .catch(error => {
        if (!cancelled) {
          setQuoteError(
            error.response?.data?.message ||
            'Unable to verify reward eligibility. Please refresh and try again.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedReward])

  // Generate one key for one redemption attempt.
  const getIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current =
        globalThis.crypto?.randomUUID?.() ||
        `redemption-${Date.now()}-${Math.random().toString(36).slice(2)}`
    }

    return idempotencyKeyRef.current
  }

  useEffect(() => {
    if (step !== 2) return undefined
    const onKeyDown = event => { if (event.key === 'Escape' && !submitting) setStep(1) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [step, submitting])

  // LOAD WALLET AND PAYOUT METHODS
  const loadPayoutData = async () => {
    try {
      setLoading(true)
      setError('')

      const [walletResponse, methodsResponse, settingsResponse] = await Promise.all([
        api.get('/wallet'),
        api.get('/payouts/methods'),
        api.get('/payouts/settings').catch(() => ({ data: { settings: {} } }))
      ])

      if (!walletResponse.data?.success) {
        throw new Error(
          walletResponse.data?.message || 'Unable to load wallet.'
        )
      }

      if (!methodsResponse.data?.success) {
        throw new Error(
          methodsResponse.data?.message || 'Unable to load payout methods.'
        )
      }

      const walletData = walletResponse.data.wallet
      const methodsData = methodsResponse.data.methods || []

      setWallet(walletData)
      setMethods(methodsData)
      setPayoutInfo(settingsResponse.data?.settings || { processingInstructions: '', userFacingMessage: '' })

      const requestedMethod = searchParams.get('method')

      const validMethod = methodsData.find(
        method =>
          method.key === requestedMethod &&
          method.isEnabled !== false
      )

      const defaultMethod =
        validMethod ||
        methodsData.find(method => method.isEnabled !== false)

      if (defaultMethod) {
        setSelectedMethod(defaultMethod.key)
      } else {
        setSelectedMethod('')
      }

    } catch (err) {
      console.error('Payout loading error:', err)

      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to load payout information. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayoutData()
    // Initial page load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // KEEP METHOD IN URL
  useEffect(() => {
    if (selectedMethod) {
      setSearchParams(
        { method: selectedMethod },
        { replace: true }
      )
    }
  }, [selectedMethod, setSearchParams])

  // CHANGE PAYOUT METHOD
  const handleMethodChange = method => {
    if (method.isEnabled === false || submitting) return

    idempotencyKeyRef.current = null

    setSelectedMethod(method.key)
    setSelectedReward('')
    setQuote(null)
    setQuoteError('')
    setPayoutAddress('')
    setError('')
    setStep(1)
    setAccepted(false)
  }

  // FORM VALIDATION
  const validateForm = () => {
    setError('')

    if (!currentMethod || currentMethod.isEnabled === false) {
      setError('This payout method is currently unavailable.')
      return false
    }

    if (!currentReward || currentReward.isEnabled === false) {
      setError('Please select an available reward option.')
      return false
    }

    if (quoteLoading) {
      setError('Please wait while we verify your reward eligibility.')
      return false
    }

    if (quoteError || !quote) {
      setError(quoteError || 'Reward eligibility could not be verified. Please select the reward again.')
      return false
    }

    if (!quote.eligible || availableBalance < Number(quote.requiredVEs)) {
      setError('You do not have enough VEs for this reward.')
      return false
    }

    if (!payoutAddress.trim()) {
      setError(
        isUpi
          ? 'Please enter your UPI ID.'
          : 'Please enter your delivery email.'
      )
      return false
    }

    if (isUpi) {
      const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/

      if (!upiRegex.test(payoutAddress.trim())) {
        setError('Please enter a valid UPI ID, for example name@upi.')
        return false
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (!emailRegex.test(payoutAddress.trim())) {
        setError('Please enter a valid email address.')
        return false
      }
    }

    return true
  }

  // CONTINUE TO REVIEW
  const handleReview = event => {
    event.preventDefault()

    if (!validateForm()) return

    setError('')
    setAccepted(false)
    setStep(2)
  }

  // BACK TO EDIT DETAILS
  const handleBack = () => {
    if (submitting) return

    setStep(1)
    setError('')
    setAccepted(false)
  }

  // CONFIRM REDEMPTION
  const handleConfirm = async () => {
    if (submitting) return

    if (!accepted) {
      setError('Please confirm your payout details.')
      return
    }

    if (!currentReward) {
      setError('Please select a valid reward option.')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const idempotencyKey = getIdempotencyKey()

      const payload = {
        rewardOptionId: selectedReward,
        // Hint only: lets the server detect that the cost changed since this screen opened.
        expectedRequiredVEs: currentReward.requiredVEs,
        idempotencyKey,
        ...(isUpi
          ? { upiId: payoutAddress.trim() }
          : { email: payoutAddress.trim().toLowerCase() })
      }

      const response = await api.post('/redemptions', payload)

      if (!response.data?.success || !response.data?.redemption) {
        throw new Error(
          response.data?.message ||
          'Unable to submit your redemption request.'
        )
      }

      const redemption = response.data.redemption

      // Use backend redemption data as the source of truth.
      const serverPayoutDetails = redemption.payoutDetails || {}

      const submittedAddress = isUpi
        ? serverPayoutDetails.upiId || payoutAddress.trim()
        : serverPayoutDetails.email || payoutAddress.trim().toLowerCase()

      setSuccessData({
        ...redemption,
        referenceId: redemption.referenceId,
        createdAt: redemption.createdAt || new Date().toISOString(),
        rewardValue: redemption.rewardValue,
        currency: redemption.currency || currentReward.currency,
        requiredVEs: redemption.requiredVEs,
        methodName:
          redemption.payoutMethod?.name ||
          currentMethod?.name ||
          redemption.methodKey,
        payoutAddress: submittedAddress
      })

      // A successful redemption is a completed request.
      idempotencyKeyRef.current = null

      // Refresh wallet balance after successful redemption.
      try {
        const walletResponse = await api.get('/wallet')

        if (walletResponse.data?.success) {
          setWallet(walletResponse.data.wallet)
        }
      } catch (walletError) {
        console.error('Wallet refresh error:', walletError)
      }

    } catch (err) {
      console.error('Redemption submission error:', err)

      // The admin changed the requirement while the user was confirming:
      // reload live configuration and start a fresh logical request.
      if (err.response?.data?.code === 'CONFIG_CHANGED') {
        idempotencyKeyRef.current = null
        try { await loadPayoutData() } catch { /* error shown below */ }
      }

      // Do not clear the idempotency key otherwise.
      // Retrying the same request must reuse the same key.
      setError(
        err.response?.data?.message ||
        err.message ||
        'Unable to submit your redemption request. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // COPY REFERENCE ID
  const handleCopyReference = async () => {
    const referenceId = successData?.referenceId

    if (!referenceId) return

    try {
      await navigator.clipboard.writeText(referenceId)
    } catch (err) {
      console.error('Unable to copy reference ID:', err)
      setError('Unable to copy reference ID.')
    }
  }

  // OPEN REDEMPTION DETAILS
  const handleViewDetails = () => {
    const redemptionId = successData?._id

    if (redemptionId) {
      navigate(`/history/${redemptionId}`)
    } else {
      navigate('/history')
    }
  }

  // LOADING SCREEN
  if (loading) {
    return (
      <main className="payout-page">
        <div className="payout-container">
          <div className="payout-main-card text-center p-5">
            <RefreshCw className="mb-3" size={30} />

            <h3>Loading payout information...</h3>

            <p>
              Please wait while we fetch your wallet and rewards.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // SUCCESS SCREEN
  if (successData) {
    return (
      <main className="payout-page">
        <div className="payout-container">
          <motion.section
            className="payout-review-card text-center"
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="review-success-icon mx-auto mb-4">
              <CheckCircle2 size={38} />
            </div>

            <span className="payout-eyebrow">
              VELOOP REWARDS
            </span>

            <h2 className="mt-3">
              Redemption Submitted!
            </h2>

            <p className="mb-4">
              Your redemption request has been submitted successfully.
              You can track its progress from your redemption history.
            </p>

            <div className="review-details text-start">
              <div className="review-detail-row">
                <span>Reference ID</span>

                <strong className="d-flex align-items-center gap-2">
                  {successData.referenceId || 'Not available'}

                  {successData.referenceId && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={handleCopyReference}
                      title="Copy reference ID"
                    >
                      <Copy size={15} />
                    </button>
                  )}
                </strong>
              </div>

              <div className="review-detail-row">
                <span>Payout Method</span>
                <strong>{successData.methodName || 'Not available'}</strong>
              </div>

              <div className="review-detail-row">
                <span>Reward Value</span>

                <strong>
                  {successData.currency === 'INR' ? '₹' : ''}
                  {successData.rewardValue}
                </strong>
              </div>

              <div className="review-detail-row">
                <span>Required VEs</span>

                <strong>
                  {successData.requiredVEs} VEs
                </strong>
              </div>

              <div className="review-detail-row">
                <span>Request Status</span>

                <strong className="review-pending">
                  {successData.status || 'PENDING'}
                </strong>
              </div>

              <div className="review-detail-row">
                <span>Submitted To</span>

                <strong>
                  {successData.payoutAddress || 'Not available'}
                </strong>
              </div>

              <div className="review-detail-row">
                <span>Submitted At</span>
                <strong>{new Date(successData.createdAt).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="review-important-note mt-4">
              <Clock3 size={20} />

              <p>
                Your request is now in the redemption process.
                You can view its status and updates in the details section.
              </p>
            </div>

            <div className="review-actions mt-4">
              <button
                type="button"
                className="back-review-button"
                onClick={() => navigate('/history')}
              >
                View History
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="confirm-review-button"
                onClick={handleViewDetails}
              >
                View Redemption Details
                <ExternalLink size={18} />
              </button>
            </div>
          </motion.section>

          <div className="payout-footer-note">
            <ShieldCheck size={16} />

            VELOop Rewards — Secure and transparent redemption experience.
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={`payout-page ${styles.pageShell}`}>
      <div className="payout-container">
        {(payoutInfo.userFacingMessage || payoutInfo.processingInstructions) && (
          <div className={`payout-policy-notice ${styles.policyNotice}`} role="status">
            {payoutInfo.userFacingMessage && <p>{payoutInfo.userFacingMessage}</p>}
            {payoutInfo.processingInstructions && <small>{payoutInfo.processingInstructions}</small>}
          </div>
        )}

        {/* PAGE HEADING */}
        <motion.div
          className="payout-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="payout-heading-icon">
            <Gift size={24} />
          </div>

          <div>
            <span className="payout-eyebrow">
              VELOOP REWARDS
            </span>

            <h1>Redeem Your Rewards</h1>

            <p>
              Choose your preferred payout method and submit
              your redemption details.
            </p>
          </div>
        </motion.div>

        {/* WALLET SUMMARY */}
        <motion.section
          className="payout-wallet-banner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="wallet-banner-content">
            <div className="wallet-banner-icon">
              <Wallet size={26} />
            </div>

            <div>
              <span>AVAILABLE VE BALANCE</span>

              <h2>
                {availableBalance.toLocaleString('en-IN')}
                <small> VEs</small>
              </h2>

              <p>
                Your balance is securely loaded from your account.
              </p>
            </div>
          </div>

          <div className="wallet-banner-status">
            <ShieldCheck size={17} />
            Secure Wallet
          </div>

          <div className="wallet-banner-decoration">
            <Sparkles size={110} />
          </div>
        </motion.section>

        {/* ERROR MESSAGE */}
        {error && (
          <div className="payout-error mb-3">
            <AlertCircle size={17} />
            {error}
          </div>
        )}

        {/* PROGRESS */}
        <div className="payout-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <div className="progress-number">
              {step > 1 ? <CheckCircle2 size={18} /> : '01'}
            </div>

            <span>Select & Enter Details</span>
          </div>

          <div
            className={`progress-line ${step >= 2 ? 'completed' : ''}`}
          />

          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <div className="progress-number">02</div>

            <span>Review Request</span>
          </div>
        </div>

        {methods.length === 0 ? (
          <section className="payout-main-card text-center p-5">
            <AlertCircle size={30} className="mb-3" />

            <h3>No payout methods available</h3>

            <p>
              Please try again later or contact the support team.
            </p>

            <button
              type="button"
              className="review-request-button"
              onClick={loadPayoutData}
            >
              <RefreshCw size={18} />
              Retry
            </button>
          </section>
        ) : (
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="selection"
                className="payout-content-grid"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
              >
                {/* LEFT CARD */}
                <section className="payout-main-card">
                  <div className="payout-section-title">
                    <div>
                      <span>STEP 01</span>

                      <h2>Select Payout Method</h2>

                      <p>
                        Choose how you want to receive your reward.
                      </p>
                    </div>

                    <div className="section-title-icon">
                      <CreditCard size={22} />
                    </div>
                  </div>

                  {/* PAYOUT METHODS */}
                  <div className="payout-method-list">
                    {methods
                      .map((method, index) => {
                        const Icon = methodIcons[method.key] || Gift

                        return (
                          <motion.button
                            type="button"
                            key={method._id}
                            className={`payout-method-option ${
                              method.key === 'upi'
                                ? 'upi'
                                : method.key === 'amazon'
                                  ? 'amazon'
                                  : 'google'
                            } ${
                              selectedMethod === method.key ? 'selected' : ''
                            } ${method.isEnabled === false ? 'disabled' : ''}`}
                            onClick={() => handleMethodChange(method)}
                            disabled={method.isEnabled === false || submitting}
                            aria-disabled={method.isEnabled === false}
                            whileHover={{ y: method.isEnabled === false ? 0 : -3 }}
                            whileTap={{ scale: 0.98 }}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                          >
                            <div className="method-icon">
                              <Icon size={25} />
                            </div>

                            <div className="method-details">
                              <h3>{method.name}</h3>
                              <span>{method.isEnabled === false ? 'Temporarily unavailable' : method.description}</span>
                              {method.isEnabled === false && <small className="method-maintenance">{method.maintenanceMessage || 'Maintenance'}</small>}
                            </div>

                            <div className="method-radio">
                              {selectedMethod === method.key && (
                                <CheckCircle2 size={21} />
                              )}
                            </div>
                          </motion.button>
                        )
                      })}
                  </div>

                  {enabledMethodCount === 0 && (
                    <div className="payout-unavailable-notice" role="status">
                      <AlertCircle size={18} />
                      All payout methods are temporarily unavailable. Please check again later.
                    </div>
                  )}

                  {currentMethod && (
                    <div className="selected-method-info">
                      <div className="selected-method-icon">
                        <Info size={19} />
                      </div>

                      <div>
                        <strong>{currentMethod.name}</strong>
                        <p>{currentMethod.description}</p>
                      </div>
                    </div>
                  )}

                  {/* REDEMPTION FORM */}
                  <form
                    className="payout-form"
                    onSubmit={handleReview}
                  >
                    <div className="form-section-heading">
                      <h3>Select Your Reward</h3>
                      <span>Required fields *</span>
                    </div>

                    <div className="payout-input-group">
                      <label htmlFor="rewardOption">
                        Available Reward Options *
                      </label>

                      <select
                        id="rewardOption"
                        className="form-control"
                        value={selectedReward}
                        onChange={event => {
                          idempotencyKeyRef.current = null
                          setSelectedReward(event.target.value)
                          setError('')
                        }}
                        required
                      >
                        <option value="">
                          Select a reward
                        </option>

                        {currentMethod?.rewardOptions
                          ?.filter(option => option.isEnabled !== false)
                          .map(option => (
                            <option
                              key={option._id}
                              value={option._id}
                            >
                              {option.currency === 'INR' ? '₹' : ''}
                              {option.rewardValue} — {option.requiredVEs} VEs required
                            </option>
                          ))}
                      </select>

                      {currentMethod?.rewardOptions?.filter(
                        option => option.isEnabled !== false
                      ).length === 0 && (
                        <small>
                          No reward options are currently available.
                        </small>
                      )}
                    </div>

                    {currentReward && (
                      <div className="selected-method-info">
                        <Info size={19} />

                        <div>
                          <strong>
                            {currentReward.currency === 'INR' ? '₹' : ''}
                            {currentReward.rewardValue}
                          </strong>

                          <p>Required VEs: {quote?.requiredVEs ?? currentReward.requiredVEs}</p>
                          {quoteLoading ? (
                            <p>Checking eligibility...</p>
                          ) : quoteError ? (
                            <p className="payout-quote-error">{quoteError}</p>
                          ) : quote ? (
                            <>
                              <p className={quote.eligible ? 'payout-eligible' : 'payout-ineligible'}>
                                {quote.eligible ? 'You are eligible for this reward.' : (quote.ruleMessage || (quote.shortfall > 0 ? `You need ${quote.shortfall} more VEs.` : 'This reward is currently unavailable under the active redemption rules.'))}
                              </p>
                              {quote.eligible && <p>Balance after redemption: {quote.remainingVEs} VEs</p>}
                              {!quote.eligible && quote.shortfall > 0 && (
                                <div className="payout-almost-eligible" role="status">
                                  <strong>{quote.shortfall <= Math.max(100, quote.requiredVEs * 0.2) ? 'Almost eligible!' : 'Keep earning VEs'}</strong>
                                  <p>{quote.shortfall.toLocaleString('en-IN')} more VEs needed for this reward.</p>
                                  <div className="payout-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax={quote.requiredVEs} aria-valuenow={Math.min(quote.availableVEs, quote.requiredVEs)}><span style={{ width: `${Math.min(100, (quote.availableVEs / quote.requiredVEs) * 100)}%` }} /></div>
                                  <small>{Math.min(100, Math.round((quote.availableVEs / quote.requiredVEs) * 100))}% of required VEs collected</small>
                                  <button type="button" className="payout-start-earning" onClick={() => navigate('/')}>Start Earning</button>
                                </div>
                              )}
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}

                    <div className="payout-input-group">
                      <label htmlFor="payoutAddress">
                        {isUpi ? 'UPI ID' : 'Delivery Email'} *
                      </label>

                      <div className="payout-input-wrapper">
                        {isUpi ? (
                          <Smartphone
                            size={19}
                            className="input-icon"
                          />
                        ) : (
                          <CreditCard
                            size={19}
                            className="input-icon"
                          />
                        )}

                        <input
                          id="payoutAddress"
                          type={isUpi ? 'text' : 'email'}
                          placeholder={
                            isUpi ? 'example@upi' : 'example@email.com'
                          }
                          value={payoutAddress}
                          onChange={event => {
                            idempotencyKeyRef.current = null
                            setPayoutAddress(event.target.value)
                            setError('')
                          }}
                          required
                        />
                      </div>

                      <small>
                        {isUpi
                          ? 'Enter the UPI ID where you want to receive your reward.'
                          : 'Your gift card details will be delivered to this email.'}
                      </small>
                    </div>

                    <button
                      type="submit"
                      className="review-request-button"
                      disabled={
                        !currentMethod ||
                        !currentReward ||
                        currentMethod.isEnabled === false ||
                        quoteLoading ||
                        !quote ||
                        !quote.eligible ||
                        Boolean(quoteError)
                      }
                    >
                      Continue to Review
                      <ArrowRight size={19} />
                    </button>
                  </form>
                </section>

                {/* RIGHT SIDEBAR */}
                <aside className="payout-sidebar">
                  <div className="payout-info-card">
                    <div className="sidebar-card-heading">
                      <div className="sidebar-info-icon">
                        <ShieldCheck size={21} />
                      </div>

                      <h3>Redemption Information</h3>
                    </div>

                    <div className="info-item">
                      <span>Available Balance</span>
                      <strong>{availableBalance} VEs</strong>
                    </div>

                    <div className="info-item">
                      <span>Selected Reward</span>

                      <strong>
                        {currentReward
                          ? `${quote?.requiredVEs ?? currentReward.requiredVEs} VEs`
                          : '--'}
                      </strong>
                    </div>

                    <div className="info-divider" />

                    <div className="info-notice">
                      <Info size={19} />

                      <p>
                        All redemption requests are subject to
                        eligibility checks, account verification
                        and platform policies.
                      </p>
                    </div>
                  </div>

                  <div className="payout-security-card">
                    <div className="security-card-icon">
                      <LockKeyhole size={23} />
                    </div>

                    <h3>Your Details Stay Protected</h3>

                    <p>
                      Always verify your UPI ID or delivery email
                      before submitting a request.
                    </p>

                    <div className="security-feature">
                      <CheckCircle2 size={16} />
                      Secure request handling
                    </div>

                    <div className="security-feature">
                      <CheckCircle2 size={16} />
                      Backend eligibility checks
                    </div>
                  </div>

                  <div className="payout-help-card">
                    <Clock3 size={21} />

                    <div>
                      <strong>Need help?</strong>

                      <p>
                        Contact the support team for redemption-related queries.
                      </p>
                    </div>
                  </div>
                </aside>
              </motion.div>
            ) : (
              /* REVIEW SCREEN */
              <motion.section
                key="review"
                role="dialog" aria-modal="true" aria-labelledby="payoutReviewTitle"
                className="payout-review-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
              >
                <div className="review-header">
                  <div className="review-success-icon">
                    <CheckCircle2 size={29} />
                  </div>

                  <div>
                    <span>STEP 02</span>

                    <h2 id="payoutReviewTitle">Review Your Request</h2>

                    <p>
                      Please verify all the details before continuing.
                    </p>
                  </div>
                </div>

                <div className="review-details">
                  <div className="review-detail-row">
                    <span>Payout Method</span>
                    <strong>{currentMethod?.name}</strong>
                  </div>

                  <div className="review-detail-row">
                    <span>Reward Value</span>

                    <strong>
                      {currentReward?.currency === 'INR' ? '₹' : ''}
                      {currentReward?.rewardValue}
                    </strong>
                  </div>

                  <div className="review-detail-row">
                    <span>Required VEs</span>
                    <strong>{quote?.requiredVEs ?? currentReward?.requiredVEs} VEs</strong>
                  </div>

                  <div className="review-detail-row">
                    <span>Available Balance</span>
                    <strong>{availableBalance} VEs</strong>
                  </div>

                  <div className="review-detail-row">
                    <span>Balance After Redemption</span>
                    <strong>{quote?.remainingVEs ?? Math.max(0, availableBalance - (quote?.requiredVEs ?? currentReward?.requiredVEs ?? 0))} VEs</strong>
                  </div>

                  <div className="review-detail-row">
                    <span>{isUpi ? 'UPI ID' : 'Delivery Email'}</span>
                    <strong>{payoutAddress}</strong>
                  </div>

                  <div className="review-detail-row">
                    <span>Request Status</span>

                    <strong className="review-pending">
                      Pending Confirmation
                    </strong>
                  </div>
                </div>

                <div className="review-important-note">
                  <Info size={20} />

                  <p>
                    After confirmation, the backend will verify your
                    balance and eligibility. Your VEs will be deducted
                    only when the redemption request is successfully created.
                  </p>
                </div>

                <label className="review-terms">
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={event => setAccepted(event.target.checked)}
                  />

                  <span>
                    I confirm that my payout details are correct.
                  </span>
                </label>

                {error && (
                  <div className="payout-error">
                    <AlertCircle size={17} />
                    {error}
                  </div>
                )}

                <div className="review-actions">
                  <button
                    type="button"
                    className="back-review-button"
                    onClick={handleBack}
                    disabled={submitting}
                  >
                    <ArrowLeft size={18} />
                    Edit Details
                  </button>

                  <button
                    type="button"
                    className="confirm-review-button"
                    disabled={!accepted || submitting}
                    onClick={handleConfirm}
                  >
                    {submitting ? 'Submitting...' : 'Confirm Request'}

                    {!submitting && <ArrowRight size={18} />}
                  </button>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        )}

        <div className="payout-footer-note">
          <ShieldCheck size={16} />

          VELOop Rewards — Secure and transparent redemption experience.
        </div>
      </div>
    </main>
  )
}

export default Payout
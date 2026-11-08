import mongoose from 'mongoose'
import crypto from 'crypto'

import Redemption from '../models/Redemption.js'
import PayoutMethod from '../models/PayoutMethod.js'
import RewardOption from '../models/RewardOption.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import SystemSetting from '../models/SystemSetting.js'
import { encryptPayoutDetails, decryptPayoutDetails } from '../utils/payoutEncryption.js'
import User from '../models/User.js'
import createAuditLog from '../services/auditLogService.js'

// ======================================
// CREATE REDEMPTION REQUEST (USER)
// ======================================

export const createRedemption = async (req, res) => {
  let session

  try {
    // NOTE: userId, status, requiredVEs, balance etc. in the body are ignored on purpose.
    const { rewardOptionId, upiId, email, expectedRequiredVEs } = req.body ?? {}

    // Get idempotency key from header or body
    const idempotencyKey =
      req.get('Idempotency-Key') || req.body?.idempotencyKey

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key is required.'
      })
    }

    const requestKey = idempotencyKey.trim()

    if (requestKey.length < 8 || requestKey.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'Invalid idempotency key.'
      })
    }

    if (!rewardOptionId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a reward option.'
      })
    }

    if (typeof rewardOptionId !== 'string' || !mongoose.Types.ObjectId.isValid(rewardOptionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward option ID.'
      })
    }

    // Optional hint from the UI: the cost the user saw on screen. It is NEVER
    // used as the price; it only lets the server detect a changed requirement.
    if (
      expectedRequiredVEs !== undefined &&
      !(Number.isSafeInteger(expectedRequiredVEs) && expectedRequiredVEs > 0)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid expected requirement.' })
    }

    // Fingerprint of the logical request, so one key cannot be reused for a different request.
    const requestFingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify([
        rewardOptionId,
        typeof upiId === 'string' ? upiId.trim().toLowerCase() : null,
        typeof email === 'string' ? email.trim().toLowerCase() : null
      ]))
      .digest('hex')

    session = await mongoose.startSession()

    let result
    let alreadyExists = false

    await session.withTransaction(async () => {

      // Check duplicate request
      const existingRedemption = await Redemption.findOne({
        user: req.user.userId,
        idempotencyKey: requestKey
      }).select('+requestFingerprint').session(session)

      if (existingRedemption) {
        if (
          existingRedemption.requestFingerprint &&
          existingRedemption.requestFingerprint !== requestFingerprint
        ) {
          const error = new Error('This idempotency key was already used for a different redemption request.')
          error.statusCode = 409
          error.code = 'IDEMPOTENCY_KEY_REUSED'
          throw error
        }
        result = existingRedemption
        alreadyExists = true
        return
      }

      // Payout restriction is checked inside the transaction (no check-then-act gap).
      const payoutUser = await User.findById(req.user.userId)
        .select('payoutRestricted payoutRestrictionReason isActive')
        .session(session)
      if (!payoutUser || !payoutUser.isActive) {
        const error = new Error('User account not found or inactive.')
        error.statusCode = 403
        throw error
      }
      if (payoutUser.payoutRestricted) {
        const error = new Error(payoutUser.payoutRestrictionReason || 'Payout access is restricted for this account.')
        error.statusCode = 403
        throw error
      }

      // Fetch reward option inside transaction
      const rewardOption = await RewardOption.findOne({
        _id: rewardOptionId,
        isEnabled: true
      })
        .populate('payoutMethod')
        .session(session)

      if (!rewardOption || !rewardOption.payoutMethod) {
        const error = new Error('Selected reward is not available.')
        error.statusCode = 404
        throw error
      }

      const method = rewardOption.payoutMethod

      if (!method.isEnabled) {
        const error = new Error(
          'This payout method is currently unavailable.'
        )
        error.statusCode = 400
        throw error
      }

      // Validate payout details
      const payoutDetails = {}

      if (method.key === 'upi') {
        const validUpi = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/

        if (
          typeof upiId !== 'string' ||
          !validUpi.test(upiId.trim())
        ) {
          const error = new Error('Please enter a valid UPI ID.')
          error.statusCode = 400
          throw error
        }

        payoutDetails.upiId = upiId.trim()

      } else if (
        method.key === 'amazon' ||
        method.key === 'googlePlay'
      ) {
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

        if (
          typeof email !== 'string' ||
          !validEmail.test(email.trim())
        ) {
          const error = new Error(
            'Please enter a valid delivery email.'
          )
          error.statusCode = 400
          throw error
        }

        payoutDetails.email = email.trim().toLowerCase()

      } else {
        const error = new Error('Unsupported payout method.')
        error.statusCode = 400
        throw error
      }

      // Find user wallet
      const wallet = await Wallet.findOne({
        user: req.user.userId
      }).session(session)

      if (!wallet) {
        const error = new Error('Wallet not found.')
        error.statusCode = 404
        throw error
      }

      const requiredVEs = rewardOption.requiredVEs

      // Admin changed the cost after the user opened the confirmation screen.
      if (expectedRequiredVEs !== undefined && expectedRequiredVEs !== requiredVEs) {
        const error = new Error(`The requirement for this reward changed to ${requiredVEs.toLocaleString('en-IN')} VEs. Please review and confirm again.`)
        error.statusCode = 409
        error.code = 'CONFIG_CHANGED'
        error.details = { requiredVEs }
        throw error
      }

      const settings = await SystemSetting.findOne({ key: 'global' }).session(session)
      if (settings?.minRequiredVEs !== null && settings?.minRequiredVEs !== undefined && requiredVEs < settings.minRequiredVEs) {
        const error = new Error('This reward is below the currently configured minimum redemption requirement.')
        error.statusCode = 400
        throw error
      }
      if (settings?.maxRequiredVEs !== null && settings?.maxRequiredVEs !== undefined && requiredVEs > settings.maxRequiredVEs) {
        const error = new Error('This reward exceeds the currently configured maximum redemption requirement.')
        error.statusCode = 400
        throw error
      }
      if (settings?.maxRequestsPerDay) {
        const dayStart = new Date()
        dayStart.setUTCHours(0, 0, 0, 0)
        const requestsToday = await Redemption.countDocuments({ user: req.user.userId, createdAt: { $gte: dayStart } }).session(session)
        if (requestsToday >= settings.maxRequestsPerDay) {
          const error = new Error('You have reached the daily redemption request limit.')
          error.statusCode = 429
          throw error
        }
      }

      if (wallet.availableBalance < requiredVEs) {
        const error = new Error('Insufficient VE balance.')
        error.statusCode = 400
        throw error
      }

      const balanceBefore = wallet.availableBalance

      // Deduct VEs atomically
      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          _id: wallet._id,
          availableBalance: { $gte: requiredVEs }
        },
        {
          $inc: {
            availableBalance: -requiredVEs,
            totalRedeemed: requiredVEs
          }
        },
        {
          new: true,
          session
        }
      )

      if (!updatedWallet) {
        const error = new Error('Unable to update wallet balance.')
        error.statusCode = 400
        throw error
      }

      const referenceId =
        'VLR-' + crypto.randomBytes(6).toString('hex').toUpperCase()

      // Create redemption
      const [redemption] = await Redemption.create(
        [
          {
            referenceId,
            idempotencyKey: requestKey,
            requestFingerprint,
            user: req.user.userId,
            payoutMethod: method._id,
            rewardOption: rewardOption._id,
            methodKey: method.key,
            rewardValue: rewardOption.rewardValue,
            currency: rewardOption.currency || 'INR',
            requiredVEs,
            rewardSnapshot: {
              displayName: rewardOption.displayName || rewardOption.name || `${method.name} ₹${rewardOption.rewardValue}`,
              methodName: method.name,
              rewardValue: rewardOption.rewardValue,
              requiredVEs,
              currency: rewardOption.currency || 'INR',
              capturedAt: new Date()
            },
            payoutDetails: encryptPayoutDetails(payoutDetails),
            status: 'PENDING',

            statusHistory: [
              {
                status: 'PENDING',
                changedBy: req.user.userId,
                changedByModel: 'User'
              }
            ]
          }
        ],
        { session }
      )

      // Create and link the wallet debit transaction.
      const [walletTransaction] = await Transaction.create(
        [{
          user: req.user.userId,
          wallet: wallet._id,
          type: 'REDEEM',
          amount: requiredVEs,
          balanceBefore,
          balanceAfter: updatedWallet.availableBalance,
          status: 'COMPLETED',
          description: `Redemption request ${referenceId}`,
          referenceId,
          idempotencyKey: `redemption-${redemption._id}`
        }],
        { session }
      )

      redemption.walletTransactionId = walletTransaction._id
      await redemption.save({ session })

      result = redemption
    })

    if (result) { result.payoutDetails = undefined; result.requestFingerprint = undefined }
    return res.status(alreadyExists ? 200 : 201).json({
      success: true,
      message: alreadyExists
        ? 'This redemption request has already been submitted.'
        : 'Redemption request submitted successfully.',
      redemption: result
    })

  } catch (error) {
    console.error('Create Redemption Error:', error)

    // Handle duplicate idempotency key
    if (error.code === 11000) {
      try {
        const existing = await Redemption.findOne({
          user: req.user.userId,
          idempotencyKey:
            req.get('Idempotency-Key') || req.body?.idempotencyKey
        }).select('+requestFingerprint').lean()

        if (existing) {
          const { rewardOptionId: rid, upiId: u, email: e } = req.body ?? {}
          const fp = crypto.createHash('sha256').update(JSON.stringify([
            rid,
            typeof u === 'string' ? u.trim().toLowerCase() : null,
            typeof e === 'string' ? e.trim().toLowerCase() : null
          ])).digest('hex')

          if (existing.requestFingerprint && existing.requestFingerprint !== fp) {
            return res.status(409).json({
              success: false,
              code: 'IDEMPOTENCY_KEY_REUSED',
              message: 'This idempotency key was already used for a different redemption request.'
            })
          }

          delete existing.requestFingerprint
          delete existing.payoutDetails
          return res.status(200).json({
            success: true,
            message: 'This redemption request has already been submitted.',
            redemption: existing
          })
        }
      } catch (lookupError) {
        console.error('Duplicate lookup error:', lookupError)
      }

      return res.status(409).json({
        success: false,
        message: 'Duplicate redemption request.'
      })
    }

    const statusCode = [400, 403, 404, 409, 422, 429].includes(error.statusCode)
      ? error.statusCode
      : 500

    return res.status(statusCode).json({
      success: false,
      message: statusCode === 500
        ? 'Unable to create redemption request. Please try again later.'
        : error.message,
      ...(statusCode !== 500 && error.code ? { code: error.code } : {}),
      ...(statusCode !== 500 && error.details ? { details: error.details } : {})
    })

  } finally {
    if (session) {
      await session.endSession()
    }
  }
}


// ======================================
// GET MY REDEMPTION HISTORY (USER)
// ======================================

export const getMyRedemptions = async (req, res) => {
  try {
    const page = Math.max(
      1,
      parseInt(req.query.page, 10) || 1
    )

    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    )

    const skip = (page - 1) * limit

    const filter = {
      user: req.user.userId
    }

    const [redemptions, total] = await Promise.all([
      Redemption.find(filter)
        .populate('payoutMethod', 'name key')
        .populate('rewardOption', 'rewardValue requiredVEs currency')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Redemption.countDocuments(filter)
    ])

    return res.status(200).json({
      success: true,
      redemptions: redemptions.map(item => ({ ...item, payoutDetails: undefined })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRedemptions: total,
        limit
      }
    })

  } catch (error) {
    console.error('My Redemptions Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch redemption history.'
    })
  }
}


// ======================================
// GET SINGLE REDEMPTION (USER)
// ======================================

export const getMyRedemptionDetails = async (req, res) => {
  try {
    const { redemptionId } = req.params

    if (!mongoose.Types.ObjectId.isValid(redemptionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid redemption ID.'
      })
    }

    const redemption = await Redemption.findOne({
      _id: redemptionId,
      user: req.user.userId
    })
      .populate('payoutMethod', 'name key')
      .populate('rewardOption', 'rewardValue requiredVEs currency')
      .lean()

    if (!redemption) {
      return res.status(404).json({
        success: false,
        message: 'Redemption request not found.'
      })
    }

    redemption.payoutDetails = decryptPayoutDetails(redemption.payoutDetails || {})
    return res.status(200).json({
      success: true,
      redemption
    })

  } catch (error) {
    console.error('Redemption Details Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch redemption details.'
    })
  }
}


// USER CANCELLATION POLICY: only PENDING requests can be cancelled.
// Cancellation is not available after an admin starts review. Full VE refund is atomic.
export const cancelMyRedemption = async (req, res) => {
  let session
  try {
    const { redemptionId } = req.params
    if (!mongoose.Types.ObjectId.isValid(redemptionId)) return res.status(400).json({ success: false, message: 'Invalid redemption ID.' })
    session = await mongoose.startSession()
    let updated
    await session.withTransaction(async () => {
      const redemption = await Redemption.findOne({ _id: redemptionId, user: req.user.userId }).session(session)
      if (!redemption) { const error = new Error('Redemption request not found.'); error.statusCode = 404; throw error }
      if (redemption.status !== 'PENDING') { const error = new Error('Only pending redemption requests can be cancelled.'); error.statusCode = 409; throw error }
      if (redemption.refunded) { const error = new Error('This redemption has already been refunded.'); error.statusCode = 409; throw error }
      const wallet = await Wallet.findOne({ user: req.user.userId }).session(session)
      if (!wallet) { const error = new Error('Wallet not found.'); error.statusCode = 404; throw error }
      const before = wallet.availableBalance
      const after = await Wallet.findOneAndUpdate({ _id: wallet._id, totalRedeemed: { $gte: redemption.requiredVEs } }, { $inc: { availableBalance: redemption.requiredVEs, totalRedeemed: -redemption.requiredVEs } }, { new: true, session })
      if (!after) { const error = new Error('Wallet ledger does not contain enough redeemed VEs to issue this cancellation refund.'); error.statusCode = 409; throw error }
      const [refund] = await Transaction.create([{ user: req.user.userId, wallet: wallet._id, type: 'REFUND', amount: redemption.requiredVEs, balanceBefore: before, balanceAfter: after.availableBalance, status: 'COMPLETED', description: `User cancellation refund ${redemption.referenceId}`, referenceId: redemption.referenceId, idempotencyKey: `cancel-refund-${redemption._id}` }], { session })
      if (redemption.walletTransactionId) await Transaction.updateOne({ _id: redemption.walletTransactionId, status: 'COMPLETED' }, { $set: { status: 'REVERSED' } }, { session })
      redemption.status = 'CANCELLED'; redemption.refunded = true; redemption.refundTransactionId = refund._id
      redemption.statusHistory.push({ status: 'CANCELLED', note: 'Cancelled by user while pending; full VE refund issued.', changedBy: req.user.userId, changedByModel: 'User' })
      await redemption.save({ session })
      updated = redemption
    })
    return res.json({ success: true, message: 'Redemption cancelled and VEs refunded.', redemption: { _id: updated._id, referenceId: updated.referenceId, status: updated.status, refunded: updated.refunded, refundTransactionId: updated.refundTransactionId } })
  } catch (error) {
    const code = [400, 404, 409].includes(error.statusCode) ? error.statusCode : 500
    console.error('Cancel redemption error:', error.message)
    return res.status(code).json({ success: false, message: code === 500 ? 'Unable to cancel redemption.' : error.message })
  } finally { if (session) await session.endSession() }
}

// ======================================
// GET REDEMPTION QUOTE (USER)
// ======================================

export const getRedemptionQuote = async (req, res) => {
  try {
    const payoutUser = await (await import('../models/User.js')).default.findById(req.user.userId).select('payoutRestricted payoutRestrictionReason')
    if (payoutUser?.payoutRestricted) return res.status(403).json({ success: false, message: payoutUser.payoutRestrictionReason || 'Payout access is restricted for this account.' })
    const { rewardOptionId } = req.body ?? {}

    // Validate reward option ID
    if (!rewardOptionId || !mongoose.Types.ObjectId.isValid(rewardOptionId)) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid reward option.'
      })
    }

    // Fetch reward option and payout method
    const rewardOption = await RewardOption.findOne({
      _id: rewardOptionId,
      isEnabled: true
    }).populate('payoutMethod')

    if (!rewardOption || !rewardOption.payoutMethod) {
      return res.status(404).json({
        success: false,
        message: 'Selected reward option is unavailable.'
      })
    }

    const method = rewardOption.payoutMethod

    if (!method.isEnabled) {
      return res.status(400).json({
        success: false,
        message: 'This payout method is unavailable.'
      })
    }

    // Fetch logged-in user's wallet
    const wallet = await Wallet.findOne({
      user: req.user.userId
    }).lean()

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found.'
      })
    }

    // Calculate eligibility on backend
    const availableVEs = wallet.availableBalance
    const requiredVEs = rewardOption.requiredVEs
    const settings = await SystemSetting.findOne({ key: 'global' }).lean()
    const minRuleFailed = settings?.minRequiredVEs != null && requiredVEs < settings.minRequiredVEs
    const maxRuleFailed = settings?.maxRequiredVEs != null && requiredVEs > settings.maxRequiredVEs
    const dailyLimitReached = settings?.maxRequestsPerDay
      ? await Redemption.countDocuments({ user: req.user.userId, createdAt: { $gte: (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d })() } }) >= settings.maxRequestsPerDay
      : false
    const remainingVEs = availableVEs - requiredVEs
    const shortfall = Math.max(0, requiredVEs - availableVEs)

    return res.status(200).json({
      success: true,
      message: 'Redemption quote generated successfully.',
      quote: {
        payoutMethod: {
          key: method.key,
          name: method.name
        },
        rewardOptionId: rewardOption._id,
        rewardValue: rewardOption.rewardValue,
        currency: rewardOption.currency,
        availableVEs,
        requiredVEs,
        eligible: availableVEs >= requiredVEs && !minRuleFailed && !maxRuleFailed && !dailyLimitReached,
        ruleMessage: minRuleFailed ? 'Reward is below the configured minimum.' : maxRuleFailed ? 'Reward exceeds the configured maximum.' : dailyLimitReached ? 'Daily redemption request limit reached.' : null,
        remainingVEs: Math.max(0, remainingVEs),
        shortfall
      }
    })

  } catch (error) {
    console.error('Redemption Quote Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to generate redemption quote.'
    })
  }
}
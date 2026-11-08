import mongoose from 'mongoose'

import Redemption from '../models/Redemption.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import User from '../models/User.js'

import createAuditLog from '../services/auditLogService.js'
import { decryptPayoutDetails } from '../utils/payoutEncryption.js'

// Escape special regex characters
const escapeRegex = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
// ======================================
// MASK SENSITIVE PAYOUT INFORMATION
// ======================================

const maskEmail = (email) => {
  if (typeof email !== 'string') return email

  const [localPart, domain] = email.split('@')

  if (!localPart || !domain) return '****'

  return `${localPart[0]}****@${domain}`
}

const maskUpi = (upi) => {
  if (typeof upi !== 'string') return upi

  const [username, bank] = upi.split('@')

  if (!username || !bank) return '****'

  return `${username.slice(0, 2)}****@${bank}`
}

const maskAccountNumber = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return value
  }

  const account = String(value)

  return `****${account.slice(-4)}`
}

const maskPhone = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return value
  }

  const phone = String(value)

  return `****${phone.slice(-4)}`
}

// Recursively mask sensitive fields
const maskSensitiveFields = (data) => {
  if (Array.isArray(data)) {
    return data.map(maskSensitiveFields)
  }

  if (!data || typeof data !== 'object') {
    return data
  }

  // Preserve BSON identifiers and dates from lean MongoDB documents.
  if (data instanceof Date || data instanceof mongoose.Types.ObjectId) {
    return data
  }

  const maskedData = {}

  for (const [key, value] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase()

    if (
      normalizedKey.includes('upi') &&
      typeof value === 'string'
    ) {
      maskedData[key] = maskUpi(value)
    } else if (
      normalizedKey.includes('email') &&
      typeof value === 'string'
    ) {
      maskedData[key] = maskEmail(value)
    } else if (
      normalizedKey.includes('accountnumber') ||
      normalizedKey.includes('account_number')
    ) {
      maskedData[key] = maskAccountNumber(value)
    } else if (
      normalizedKey.includes('phone') ||
      normalizedKey.includes('mobile')
    ) {
      maskedData[key] = maskPhone(value)
    } else if (
      normalizedKey.includes('password') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('token')
    ) {
      maskedData[key] = '********'
    } else {
      maskedData[key] = maskSensitiveFields(value)
    }
  }

  return maskedData
}
// ======================================
// GET ALL REDEMPTIONS (ADMIN)
// ======================================

export const getAllRedemptions = async (req, res) => {
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

    const filter = {}

    // Status filter
    if (req.query.status) {
      const allowedStatuses = [
        'PENDING',
        'UNDER_REVIEW',
        'APPROVED',
        'COMPLETED',
        'REJECTED',
        'FAILED',
        'CANCELLED'
      ]

      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid redemption status.'
        })
      }

      filter.status = req.query.status
    }

    // Payout method filter
    if (req.query.method) {
      const allowedMethods = [
        'upi',
        'amazon',
        'googlePlay'
      ]

      if (!allowedMethods.includes(req.query.method)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payout method.'
        })
      }

      filter.methodKey = req.query.method
    }

    // Optional date range (inclusive start, exclusive next-day end).
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {}
      if (req.query.startDate) { const d = new Date(req.query.startDate); if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid startDate.' }); filter.createdAt.$gte = d }
      if (req.query.endDate) { const d = new Date(req.query.endDate); if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid endDate.' }); d.setHours(23,59,59,999); filter.createdAt.$lte = d }
      if (filter.createdAt.$gte && filter.createdAt.$lte && filter.createdAt.$gte > filter.createdAt.$lte) return res.status(400).json({ success: false, message: 'startDate must be on or before endDate.' })
    }

    // Search by reference ID, user ID, user name or email
    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim())
      const regex = new RegExp(search, 'i')

      const userOr = [{ name: regex }, { email: regex }]
      if (mongoose.Types.ObjectId.isValid(search)) userOr.push({ _id: search })
      const matchingUsers = await User.find({ $or: userOr })
        .select('_id')
        .lean()

      const userIds = matchingUsers.map(user => user._id)

      filter.$or = [
        { referenceId: regex },
        { user: { $in: userIds } }
      ]
    }

    const sortField = ['createdAt', 'updatedAt', 'rewardValue', 'requiredVEs', 'status'].includes(req.query.sortBy) ? req.query.sortBy : 'createdAt'
    const sortDirection = req.query.sortOrder === 'asc' ? 1 : -1

    const [redemptions, total] = await Promise.all([
      Redemption.find(filter)
        .populate('user', 'name email')
        .populate('payoutMethod', 'name key')
        .populate('rewardOption', 'rewardValue requiredVEs currency')
        .populate('processedBy', 'name email')
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),

      Redemption.countDocuments(filter)
    ])

return res.status(200).json({
  success: true,

  redemptions: redemptions.map(redemption =>
    maskSensitiveFields(redemption)
  ),

  pagination: {
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    totalRedemptions: total,
    limit
  }
})

  } catch (error) {
    console.error('Admin Redemptions Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch redemptions.'
    })
  }
}


// ======================================
// GET SINGLE REDEMPTION DETAILS (ADMIN)
// ======================================

export const getRedemptionDetails = async (req, res) => {
  try {
    const { redemptionId } = req.params

    if (!mongoose.Types.ObjectId.isValid(redemptionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid redemption ID.'
      })
    }

    const redemption = await Redemption.findById(redemptionId)
      .populate('user', 'name email')
      .populate('payoutMethod', 'name key description')
      .populate('rewardOption', 'rewardValue requiredVEs currency')
      .populate('processedBy', 'name email')
      .populate('walletTransactionId', 'type amount currency balanceBefore balanceAfter status createdAt')
      .populate('refundTransactionId', 'type amount currency balanceBefore balanceAfter status createdAt')

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


// ======================================
// UPDATE REDEMPTION STATUS (ADMIN)
// ======================================

export const updateRedemptionStatus = async (req, res) => {
  let session

  try {
    const { redemptionId } = req.params
    const { status, adminNote, providerReference } = req.body ?? {}

    const allowedStatuses = [
      'UNDER_REVIEW',
      'APPROVED',
      'COMPLETED',
      'REJECTED',
      'FAILED'
    ]

    if (!mongoose.Types.ObjectId.isValid(redemptionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid redemption ID.'
      })
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid redemption status.'
      })
    }

    if (
      adminNote !== undefined &&
      (typeof adminNote !== 'string' || adminNote.trim().length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Admin note must be a string of maximum 500 characters.'
      })
    }

    const note = adminNote?.trim() || ''

    if (status === 'COMPLETED' && (typeof providerReference !== 'string' || !providerReference.trim() || providerReference.trim().length > 120)) {
      return res.status(400).json({ success: false, message: 'A valid provider/payment reference (1–120 characters) is required to complete a redemption.' })
    }

    // Rejection and failure require a reason
    if (
      ['REJECTED', 'FAILED'].includes(status) &&
      !note
    ) {
      return res.status(400).json({
        success: false,
        message: 'A reason is required for rejecting or failing a redemption.'
      })
    }

    session = await mongoose.startSession()

    let updatedRedemption

    await session.withTransaction(async () => {

      const redemption = await Redemption.findById(
        redemptionId
      ).session(session)

      if (!redemption) {
        const error = new Error('Redemption request not found.')
        error.statusCode = 404
        throw error
      }

      const previousStatus = redemption.status

      // Allowed status transitions
      const transitions = {
        PENDING: [
          'UNDER_REVIEW',
          'APPROVED',
          'REJECTED'
        ],

        UNDER_REVIEW: [
          'APPROVED',
          'REJECTED'
        ],

        APPROVED: [
          'COMPLETED',
          'FAILED'
        ]
      }

      if (!transitions[previousStatus]?.includes(status)) {
        const error = new Error(
          `Cannot change status from ${previousStatus} to ${status}.`
        )

        error.statusCode = 400
        throw error
      }

      // ==================================
      // REFUND FOR REJECTED OR FAILED
      // ==================================

      if (['REJECTED', 'FAILED'].includes(status)) {

        if (redemption.refunded) {
          const error = new Error('VEs have already been refunded.')
          error.statusCode = 409
          throw error
        }

        const wallet = await Wallet.findOne({
          user: redemption.user
        }).session(session)

        if (!wallet) {
          const error = new Error('User wallet not found.')
          error.statusCode = 404
          throw error
        }

        const balanceBefore = wallet.availableBalance

        // Refund VEs atomically
        const updatedWallet = await Wallet.findOneAndUpdate(
          {
            _id: wallet._id,
            totalRedeemed: {
              $gte: redemption.requiredVEs
            }
          },
          {
            $inc: {
              availableBalance: redemption.requiredVEs,
              totalRedeemed: -redemption.requiredVEs
            }
          },
          {
            new: true,
            session
          }
        )

        if (!updatedWallet) {
          const error = new Error(
            'Unable to process refund. Please verify wallet balance records.'
          )

          error.statusCode = 409
          throw error
        }

        // Mark the original redemption debit as reversed for a consistent ledger.
        const originalTransaction = redemption.walletTransactionId
          ? await Transaction.findOne({
              _id: redemption.walletTransactionId,
              user: redemption.user,
              type: 'REDEEM'
            }).session(session)
          : await Transaction.findOne({
              user: redemption.user,
              referenceId: redemption.referenceId,
              type: 'REDEEM'
            }).session(session)

        if (originalTransaction && originalTransaction.status !== 'REVERSED') {
          originalTransaction.status = 'REVERSED'
          await originalTransaction.save({ session })
        }

        // Create a single, traceable refund transaction.
        const [refundTransaction] = await Transaction.create(
          [{
            user: redemption.user,
            wallet: wallet._id,
            type: 'REFUND',
            amount: redemption.requiredVEs,
            balanceBefore,
            balanceAfter: updatedWallet.availableBalance,
            status: 'COMPLETED',
            description: `Refund for redemption ${redemption.referenceId}`,
            referenceId: redemption.referenceId,
            idempotencyKey: `refund-${redemption._id}`,
            performedBy: req.admin._id
          }],
          { session }
        )

        redemption.refundTransactionId = refundTransaction._id
        redemption.refunded = true
      }

      // ==================================
      // UPDATE REDEMPTION STATUS
      // ==================================

      redemption.status = status
      redemption.adminNote = note
      redemption.processedBy = req.admin._id

      if (status === 'COMPLETED') {
        redemption.completedAt = new Date()
        redemption.providerReference = providerReference.trim()
      }

      redemption.statusHistory.push({
        status,
        note,
        changedBy: req.admin._id,
        changedByModel: 'Admin',
        changedAt: new Date()
      })

      await redemption.save({ session })

      // ==================================
      // CREATE AUDIT LOG
      // ==================================

      await createAuditLog({
        adminId: req.admin._id,

        action: `REDEMPTION_${status}`,

        entityType: 'REDEMPTION',

        entityId: redemption._id,

        description:
          `Admin changed redemption status from ${previousStatus} to ${status}.`,

        metadata: {
          referenceId: redemption.referenceId,
          previousStatus,
          newStatus: status,
          requiredVEs: redemption.requiredVEs,
          refunded: redemption.refunded,
          walletTransactionId: redemption.walletTransactionId,
          refundTransactionId: redemption.refundTransactionId,
          adminNote: note
        },

        req,
        session
      })

      updatedRedemption = redemption
    })

    return res.status(200).json({
      success: true,
      message: 'Redemption status updated successfully.',
      redemption: updatedRedemption
    })

  } catch (error) {
    console.error('Update Redemption Status Error:', error)

    const statusCode = [400, 404, 409, 422].includes(error.statusCode)
      ? error.statusCode
      : error.code === 11000
        ? 409
        : 500

    return res.status(statusCode).json({
      success: false,
      message: statusCode === 500
        ? 'Unable to update redemption status. Please try again later.'
        : error.message
    })

  } finally {
    if (session) {
      await session.endSession()
    }
  }
}
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

import Admin from '../models/Admin.js'
import User from '../models/User.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import Redemption from '../models/Redemption.js'
import PayoutMethod from '../models/PayoutMethod.js'
import RewardOption from '../models/RewardOption.js'
import { adjustWallet } from '../services/walletService.js'
import createAuditLog from '../services/auditLogService.js'


// ==========================================
// ADMIN LOGIN
// ==========================================

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body ?? {}

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      })
    }

    const admin = await Admin.findOne({
      email: email.trim().toLowerCase()
    }).select('+password')

    if (!admin || !admin.isActive) {
      await createAuditLog({ action: 'ADMIN_LOGIN_FAILED', entityType: 'ADMIN', description: 'Failed admin login attempt.', actorEmail: email.trim().toLowerCase(), metadata: { reason: admin ? 'INACTIVE_ADMIN' : 'UNKNOWN_ADMIN' }, req })
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials.'
      })
    }

    if (admin.lockUntil && admin.lockUntil <= new Date()) {
      admin.lockUntil = null
      admin.loginAttempts = 0
    }

    if (admin.lockUntil && admin.lockUntil > new Date()) {
      await createAuditLog({ adminId: admin._id, action: 'ADMIN_LOGIN_BLOCKED', entityType: 'ADMIN', entityId: admin._id, description: 'Admin login attempted while account was locked.', actorEmail: admin.email, req })
      return res.status(423).json({
        success: false,
        message: 'Admin login is temporarily locked. Please try again later.'
      })
    }

    const isPasswordCorrect = await admin.comparePassword(password)

    if (!isPasswordCorrect) {
      admin.loginAttempts = (admin.loginAttempts || 0) + 1

      if (admin.loginAttempts >= 5) {
        admin.loginAttempts = 0
        admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000)
      }

      await admin.save()
      await createAuditLog({ adminId: admin._id, action: 'ADMIN_LOGIN_FAILED', entityType: 'ADMIN', entityId: admin._id, description: 'Failed admin password verification.', actorEmail: admin.email, metadata: { loginAttempts: admin.loginAttempts, locked: Boolean(admin.lockUntil && admin.lockUntil > new Date()) }, req })

      return res.status(401).json({
        success: false,
        message: admin.lockUntil && admin.lockUntil > new Date()
          ? 'Too many failed attempts. Admin login is locked for 15 minutes.'
          : 'Invalid admin credentials.'
      })
    }

    admin.loginAttempts = 0
    admin.lockUntil = null
    await admin.save()

    const token = jwt.sign(
      {
        adminId: admin._id,
        role: admin.role,
        tokenVersion: admin.tokenVersion || 0
      },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '8h' }
    )

    await createAuditLog({
      adminId: admin._id,
      action: 'ADMIN_LOGIN',
      entityType: 'ADMIN',
      entityId: admin._id,
      description: 'Super Admin logged in successfully.',
      metadata: { email: admin.email },
      req
    })

    return res.status(200).json({
      success: true,
      message: 'Admin login successful.',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error('Admin Login Error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to login as admin.'
    })
  }
}


// ==========================================
// SERVER-SIDE ADMIN LOGOUT
// ==========================================
export const adminLogout = async (req, res) => {
  try {
    req.admin.tokenVersion = (req.admin.tokenVersion || 0) + 1
    await req.admin.save()

    await createAuditLog({
      adminId: req.admin._id,
      action: 'ADMIN_LOGOUT',
      entityType: 'ADMIN',
      entityId: req.admin._id,
      description: 'Super Admin logged out and invalidated the current token.',
      req
    })

    return res.status(200).json({ success: true, message: 'Admin logged out successfully.' })
  } catch (error) {
    console.error('Admin Logout Error:', error)
    return res.status(500).json({ success: false, message: 'Unable to complete admin logout.' })
  }
}


// ==========================================
// GET ADMIN PROFILE
// ==========================================

export const getAdminProfile = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role
      }
    })

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch admin profile.'
    })
  }
}


// ==========================================
// CREDIT USER WALLET
// ==========================================
export const creditUserWallet = async (req, res) => {
  try {
    const {
      userId,
      amount,
      description,
      idempotencyKey
    } = req.body ?? {}

    // Required fields validation
    if (!userId || amount === undefined || !idempotencyKey || !description) {
      return res.status(400).json({
        success: false,
        message: 'User ID, amount, reason and idempotency key are required.'
      })
    }

    // Amount validation: positive integer only
    if (
      typeof amount !== 'number' ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 1000000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive integer between 1 and 1000000.'
      })
    }

    // User ID validation
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      })
    }

    // Reason validation
    if (
      typeof description !== 'string' ||
      description.trim().length < 5 ||
      description.trim().length > 250
    ) {
      return res.status(400).json({
        success: false,
        message: 'Reason must contain 5 to 250 characters.'
      })
    }

    // Idempotency validation
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key must contain 8 to 100 characters.'
      })
    }

    const result = await adjustWallet({
      userId,
      amount,
      type: 'ADMIN_CREDIT',
      description: description.trim(),
      idempotencyKey: idempotencyKey.trim(),
      adminId: req.admin._id,
      req
    })

    return res.status(200).json({
      success: true,
      message: 'VEs credited successfully.',
      wallet: result.wallet,
      transaction: result.transaction
    })

  } catch (error) {
    console.error('Credit Wallet Error:', error)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This transaction has already been processed.'
      })
    }

    const statusCode = [400, 404, 409, 422].includes(error.statusCode)
      ? error.statusCode
      : 500

    return res.status(statusCode).json({
      success: false,
      message: statusCode === 500
        ? 'Unable to credit wallet. Please try again later.'
        : error.message
    })
  }
}
// ==========================================
// DEBIT USER WALLET
// ==========================================
export const debitUserWallet = async (req, res) => {
  try {
    const {
      userId,
      amount,
      description,
      idempotencyKey
    } = req.body ?? {}

    // Required fields validation
    if (!userId || amount === undefined || !idempotencyKey || !description) {
      return res.status(400).json({
        success: false,
        message: 'User ID, amount, reason and idempotency key are required.'
      })
    }

    // Amount validation: positive integer only
    if (
      typeof amount !== 'number' ||
      !Number.isSafeInteger(amount) ||
      amount <= 0 ||
      amount > 1000000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive integer between 1 and 1000000.'
      })
    }

    // User ID validation
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      })
    }

    // Reason validation
    if (
      typeof description !== 'string' ||
      description.trim().length < 5 ||
      description.trim().length > 250
    ) {
      return res.status(400).json({
        success: false,
        message: 'Reason must contain 5 to 250 characters.'
      })
    }

    // Idempotency validation
    if (
      typeof idempotencyKey !== 'string' ||
      idempotencyKey.trim().length < 8 ||
      idempotencyKey.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency key must contain 8 to 100 characters.'
      })
    }

    const result = await adjustWallet({
      userId,
      amount,
      type: 'ADMIN_DEBIT',
      description: description.trim(),
      idempotencyKey: idempotencyKey.trim(),
      adminId: req.admin._id,
      req
    })

    return res.status(200).json({
      success: true,
      message: 'VEs deducted successfully.',
      wallet: result.wallet,
      transaction: result.transaction
    })

  } catch (error) {
    console.error('Debit Wallet Error:', error)

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'This transaction has already been processed.'
      })
    }

    const statusCode = [400, 404, 409, 422].includes(error.statusCode)
      ? error.statusCode
      : 500

    return res.status(statusCode).json({
      success: false,
      message: statusCode === 500
        ? 'Unable to debit wallet. Please try again later.'
        : error.message
    })
  }
}
// ==========================================
// GET ALL USERS
// ==========================================

export const getAllUsers = async (req, res) => {
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

    const search = req.query.search?.trim() || ''
    const status = req.query.status

    const filter = {}

    // Search users by name or email
    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )

      filter.$or = [
        {
          name: {
            $regex: escapedSearch,
            $options: 'i'
          }
        },
        {
          email: {
            $regex: escapedSearch,
            $options: 'i'
          }
        }
      ]
    }

    // Filter active and inactive users
    if (status === 'active') {
      filter.isActive = true
    }

    if (status === 'inactive') {
      filter.isActive = false
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter)
    ])

    const userIds = users.map(user => user._id)

    const wallets = await Wallet.find({
      user: { $in: userIds }
    }).lean()

    const walletMap = new Map(
      wallets.map(wallet => [
        wallet.user.toString(),
        wallet
      ])
    )

    const formattedUsers = users.map(user => {
      const wallet = walletMap.get(user._id.toString())

      return {
        ...user,

        wallet: {
          availableBalance: wallet?.availableBalance || 0,
          totalEarned: wallet?.totalEarned || 0,
          totalRedeemed: wallet?.totalRedeemed || 0
        }
      }
    })


    
    res.status(200).json({
      success: true,
      users: formattedUsers,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit
      }
    })

  } catch (error) {
    console.error('Get Users Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch users.'
    })
  }
}


// ==========================================
// SUSPEND / RESTORE USER ACCESS
// ==========================================
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params
    const { isActive, reason } = req.body ?? {}

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' })
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be true or false.' })
    }

    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 250) {
      return res.status(400).json({ success: false, message: 'A reason of 5 to 250 characters is required.' })
    }

    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    const previousStatus = user.isActive
    if (previousStatus === isActive) {
      return res.status(200).json({
        success: true,
        message: `User is already ${isActive ? 'active' : 'suspended'}.`,
        user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive }
      })
    }

    user.isActive = isActive
    await user.save()

    await createAuditLog({
      adminId: req.admin._id,
      action: isActive ? 'USER_RESTORED' : 'USER_SUSPENDED',
      entityType: 'USER',
      entityId: user._id,
      description: isActive ? 'Admin restored user access.' : 'Admin suspended user access.',
      metadata: {
        previousIsActive: previousStatus,
        newIsActive: isActive,
        reason: reason.trim()
      },
      req
    })

    return res.status(200).json({
      success: true,
      message: isActive ? 'User access restored successfully.' : 'User suspended successfully.',
      user: { id: user._id, name: user.name, email: user.email, isActive: user.isActive }
    })
  } catch (error) {
    console.error('Update User Status Error:', error)
    return res.status(500).json({ success: false, message: 'Unable to update user status.' })
  }
}


// ==========================================
// GET SINGLE USER DETAILS
// ==========================================

export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.'
      })
    }

    const user = await User.findById(userId)
      .select('-password')
      .lean()

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      })
    }

    const redemptionPage = Math.max(1, parseInt(req.query.redemptionPage, 10) || 1)
    const redemptionLimit = Math.min(50, Math.max(1, parseInt(req.query.redemptionLimit, 10) || 10))
    const [wallet, transactions, redemptions, totalRedemptions] = await Promise.all([
      Wallet.findOne({ user: userId }).lean(),

      Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean(),
      Redemption.find({ user: userId }).select('-payoutDetails').sort({ createdAt: -1 }).skip((redemptionPage - 1) * redemptionLimit).limit(redemptionLimit).lean(),
      Redemption.countDocuments({ user: userId })
    ])

    res.status(200).json({
      success: true,

      user: {
        ...user,

        wallet: {
          availableBalance: wallet?.availableBalance || 0,
          totalEarned: wallet?.totalEarned || 0,
          totalRedeemed: wallet?.totalRedeemed || 0
        },

        recentTransactions: transactions,
        redemptionHistory: redemptions,
        redemptionPagination: { currentPage: redemptionPage, totalPages: Math.ceil(totalRedemptions / redemptionLimit), totalRedemptions, limit: redemptionLimit }
      }
    })

  } catch (error) {
    console.error('Get User Details Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch user details.'
    })
  }
}


// ==========================================
// RESTRICT / RESTORE PAYOUT ACCESS WITHOUT BLOCKING LOGIN
// ==========================================
export const updateUserPayoutRestriction = async (req, res) => {
  try {
    const { userId } = req.params
    const { restricted, reason } = req.body ?? {}
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, message: 'Invalid user ID.' })
    if (typeof restricted !== 'boolean') return res.status(400).json({ success: false, message: 'restricted must be true or false.' })
    if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 250) return res.status(400).json({ success: false, message: 'A reason of 5 to 250 characters is required.' })
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    const previous = user.payoutRestricted
    user.payoutRestricted = restricted
    user.payoutRestrictionReason = restricted ? reason.trim() : ''
    user.payoutRestrictedAt = restricted ? new Date() : null
    await user.save()
    await createAuditLog({ adminId: req.admin._id, action: restricted ? 'USER_PAYOUT_RESTRICTED' : 'USER_PAYOUT_RESTORED', entityType: 'USER', entityId: user._id, description: restricted ? 'Admin restricted payout access.' : 'Admin restored payout access.', metadata: { previous, restricted, reason: reason.trim() }, req })
    return res.json({ success: true, message: restricted ? 'Payout access restricted; login remains available.' : 'Payout access restored.', user: { id: user._id, payoutRestricted: user.payoutRestricted, payoutRestrictionReason: user.payoutRestrictionReason } })
  } catch (error) {
    console.error('Payout restriction error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to update payout restriction.' })
  }
}

// ==========================================
// GET ALL TRANSACTIONS
// ==========================================

export const getAllTransactions = async (req, res) => {
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

    const { type, status } = req.query
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escaped, 'i')
      const users = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').lean()
      const ids = users.map(user => user._id)
      const or = [{ referenceId: regex }, { description: regex }, { user: { $in: ids } }]
      if (mongoose.Types.ObjectId.isValid(search)) or.push({ user: new mongoose.Types.ObjectId(search) })
      filter.$or = or
    }
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {}
      if (req.query.startDate) { const d = new Date(req.query.startDate); if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid startDate.' }); filter.createdAt.$gte = d }
      if (req.query.endDate) { const d = new Date(req.query.endDate); if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid endDate.' }); d.setHours(23,59,59,999); filter.createdAt.$lte = d }
      if (filter.createdAt.$gte && filter.createdAt.$lte && filter.createdAt.$gte > filter.createdAt.$lte) return res.status(400).json({ success: false, message: 'startDate must be on or before endDate.' })
    }

    const allowedTypes = [
      'EARN',
      'REDEEM',
      'ADMIN_CREDIT',
      'ADMIN_DEBIT',
      'REFUND'
    ]

    const allowedStatuses = [
      'PENDING',
      'COMPLETED',
      'FAILED',
      'REVERSED'
    ]

    if (type) {
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type.'
        })
      }

      filter.type = type
    }

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction status.'
        })
      }

      filter.status = status
    }

    const [transactions, totalTransactions] = await Promise.all([
      Transaction.find(filter)
        .populate('user', 'name email')
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Transaction.countDocuments(filter)
    ])

    res.status(200).json({
      success: true,

      transactions,

      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalTransactions / limit),
        totalTransactions,
        limit
      }
    })

  } catch (error) {
    console.error('Get Transactions Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch transactions.'
    })
  }
}
// ==========================================
// GET ADMIN DASHBOARD STATISTICS
// ==========================================

export const getDashboardStats = async (req, res) => {
  try {
    const dateMatch = {}
    if (req.query.startDate) { const d = new Date(req.query.startDate); if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid startDate.' }); dateMatch.$gte = d }
    if (req.query.endDate) { const d = new Date(req.query.endDate); if (Number.isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid endDate.' }); d.setHours(23,59,59,999); dateMatch.$lte = d }
    if (dateMatch.$gte && dateMatch.$lte && dateMatch.$gte > dateMatch.$lte) return res.status(400).json({ success: false, message: 'startDate must be on or before endDate.' })
    const redemptionMatch = Object.keys(dateMatch).length ? { createdAt: dateMatch } : {}
    const statuses = [
      'PENDING',
      'UNDER_REVIEW',
      'APPROVED',
      'COMPLETED',
      'REJECTED',
      'FAILED',
      'CANCELLED'
    ]

    // Count all redemption statuses
    const statusCounts = await Redemption.aggregate([
      { $match: redemptionMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const statsByStatus = {}

    statuses.forEach(status => {
      statsByStatus[status] = 0
    })

    statusCounts.forEach(item => {
      statsByStatus[item._id] = item.count
    })

    // Calculate total VEs from non-refunded,
    // non-rejected and non-failed redemptions
    const veResult = await Redemption.aggregate([
      { $match: { ...redemptionMatch,

          refunded: false,
          status: {
            $nin: ['REJECTED', 'FAILED']
          }
        }
      },
      {
        $group: {
          _id: null,
          totalVEs: { $sum: '$requiredVEs' }
        }
      }
    ])

    // Calculate successfully completed payout value
    const payoutResult = await Redemption.aggregate([
      { $match: { ...redemptionMatch,
          status: 'COMPLETED',
          refunded: false
        }
      },
      {
        $group: {
          _id: null,
          totalPayoutValue: { $sum: '$rewardValue' }
        }
      }
    ])

    // Find active payout methods
    const activeMethods = await PayoutMethod.find({
      isEnabled: true
    }).select('_id')

    const activeMethodIds = activeMethods.map(
      method => method._id
    )

    // Count active reward options belonging to active methods
    const activeRewardOptions = await RewardOption.countDocuments({
      isEnabled: true,
      payoutMethod: {
        $in: activeMethodIds
      }
    })

    const [recentActivity, reservedResult, deductedResult] = await Promise.all([
      Redemption.find(redemptionMatch).select('referenceId status requiredVEs rewardValue currency methodKey createdAt user').populate('user', 'name email').sort({ createdAt: -1 }).limit(8).lean(),
      Redemption.aggregate([{ $match: { ...redemptionMatch, status: { $in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }, refunded: false } }, { $group: { _id: null, total: { $sum: '$requiredVEs' } } }]),
      Redemption.aggregate([{ $match: { ...redemptionMatch, status: 'COMPLETED', refunded: false } }, { $group: { _id: null, total: { $sum: '$requiredVEs' } } }])
    ])

    const totalRedemptions = statusCounts.reduce(
      (total, item) => total + item.count,
      0
    )

    const totalVEsRedeemed =
      veResult[0]?.totalVEs || 0

    const totalPayoutValue =
      payoutResult[0]?.totalPayoutValue || 0

    res.status(200).json({
      success: true,
      stats: {
        totalRedemptions,

        pendingRedemptions:
          statsByStatus.PENDING,

        underReviewRedemptions:
          statsByStatus.UNDER_REVIEW,

        approvedRedemptions:
          statsByStatus.APPROVED,

        completedRedemptions:
          statsByStatus.COMPLETED,

        rejectedRedemptions:
          statsByStatus.REJECTED,

        failedRedemptions:
          statsByStatus.FAILED,

        cancelledRedemptions:
          statsByStatus.CANCELLED,

        totalVEsRedeemed,
        totalVEsReserved: reservedResult[0]?.total || 0,
        totalVEsDeducted: deductedResult[0]?.total || 0,
        totalPayoutValue,
        recentActivity,

        activePayoutMethods:
          activeMethods.length,

        activeRewardOptions
      }
    })

  } catch (error) {
    console.error('Dashboard Stats Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch dashboard statistics.'
    })
  }
}
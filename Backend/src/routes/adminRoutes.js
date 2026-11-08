import express from 'express'

import protectAdmin from '../middleware/adminMiddleware.js'

import {
  adminLogin,
  adminLogout,
  getAdminProfile,
  creditUserWallet,
  debitUserWallet,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  getAllTransactions,
  getDashboardStats,
  updateUserPayoutRestriction
} from '../controllers/adminController.js'

const router = express.Router()

// ==========================================
// ADMIN LOGIN (Public Route)
// ==========================================

router.post('/login', adminLogin)

// ==========================================
// PROTECTED ADMIN ROUTES
// ==========================================

router.use(protectAdmin)

router.get('/profile', getAdminProfile)
router.post('/logout', adminLogout)

// Dashboard Statistics
router.get('/dashboard/stats', getDashboardStats)

// User Management
router.get('/users', getAllUsers)
router.get('/users/:userId', getUserDetails)
router.patch('/users/:userId/status', updateUserStatus)
router.patch('/users/:userId/payout-restriction', updateUserPayoutRestriction)

// Wallet Management
router.post('/wallet/credit', creditUserWallet)
router.post('/wallet/debit', debitUserWallet)

// Transaction Management
router.get('/transactions', getAllTransactions)

export default router
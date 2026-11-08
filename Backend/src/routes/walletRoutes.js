import express from 'express'

import protect from '../middleware/authMiddleware.js'

import {
  getMyWallet,
  getMyTransactions
} from '../controllers/walletController.js'

const router = express.Router()

// All wallet routes require login
router.use(protect)

// Get wallet details
router.get('/', getMyWallet)

// Get transaction history
router.get('/transactions', getMyTransactions)

export default router
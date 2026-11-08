import express from 'express'

import {
  getAvailablePayoutMethods,
  getAvailableRewardOptions
} from '../controllers/payoutController.js'

const router = express.Router()

// Get all available payout methods
router.get('/methods', getAvailablePayoutMethods)

// Get reward options for selected method
router.get('/options', getAvailableRewardOptions)

export default router
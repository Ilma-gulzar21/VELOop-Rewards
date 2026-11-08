import express from 'express'
import protect from '../middleware/authMiddleware.js'

import {
  createRedemption,
  getMyRedemptions,
  getMyRedemptionDetails,
  getRedemptionQuote,
  cancelMyRedemption
} from '../controllers/redemptionController.js'

const router = express.Router()

// Protect all redemption routes
router.use(protect)

// Get redemption quote
router.post('/quote', getRedemptionQuote)

// Create redemption request
router.post('/', createRedemption)

// Get user's redemption history
router.get('/my', getMyRedemptions)

// Get single redemption details
router.get('/my/:redemptionId', getMyRedemptionDetails)
router.patch('/my/:redemptionId/cancel', cancelMyRedemption)

export default router
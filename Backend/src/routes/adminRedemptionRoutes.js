import express from 'express'

import protectAdmin from '../middleware/adminMiddleware.js'

import {
  getAllRedemptions,
  getRedemptionDetails,
  updateRedemptionStatus
} from '../controllers/adminRedemptionController.js'

const router = express.Router()

// Protect all admin redemption routes
router.use(protectAdmin)

// Get all redemption requests with search and filters
router.get('/', getAllRedemptions)

// Get single redemption details
router.get('/:redemptionId', getRedemptionDetails)

// Update redemption status
router.patch('/:redemptionId/status', updateRedemptionStatus)

export default router
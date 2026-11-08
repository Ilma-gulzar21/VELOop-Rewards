import express from 'express'

import protectAdmin from '../middleware/adminMiddleware.js'

import {
  getAdminPayoutMethods,
  createPayoutMethod,
  updatePayoutMethod,
  getAdminRewardOptions,
  createRewardOption,
  updateRewardOption
} from '../controllers/payoutController.js'

const router = express.Router()

router.use(protectAdmin)

// Payout methods
router.get('/methods', getAdminPayoutMethods)
router.post('/methods', createPayoutMethod)
router.patch('/methods/:methodId', updatePayoutMethod)

// Reward options
router.get('/reward-options', getAdminRewardOptions)
router.post('/reward-options', createRewardOption)
router.patch('/reward-options/:optionId', updateRewardOption)

export default router
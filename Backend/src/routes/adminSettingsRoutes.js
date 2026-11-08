import express from 'express'
import protectAdmin from '../middleware/adminMiddleware.js'
import { getAdminSettings, updateAdminSettings } from '../controllers/adminSettingsController.js'
const router = express.Router()
router.use(protectAdmin)
router.get('/', getAdminSettings)
router.patch('/', updateAdminSettings)
export default router

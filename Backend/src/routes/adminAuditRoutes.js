import express from 'express'

import protectAdmin from '../middleware/adminMiddleware.js'

import {
  getAuditLogs
} from '../controllers/adminAuditController.js'

const router = express.Router()

// Protect all audit log routes

router.use(protectAdmin)

// Get all audit logs

router.get('/', getAuditLogs)

export default router
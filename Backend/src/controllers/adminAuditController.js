import mongoose from 'mongoose'

import AuditLog from '../models/AuditLog.js'
import Admin from '../models/Admin.js'

export const getAuditLogs = async (req, res) => {
  try {

    const {
      page = 1,
      limit = 10,
      action,
      entityType,
      adminId,
      search
    } = req.query

    const currentPage = Math.max(Number(page) || 1, 1)
    const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 50)

    const filter = {}

    if (action) {
      filter.action = action
    }

    if (entityType) {
      filter.entityType = entityType
    }

    if (adminId) {
      if (!mongoose.Types.ObjectId.isValid(adminId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid admin ID.'
        })
      }
      filter.admin = adminId
    }

    if (search && String(search).trim()) {
      const escapedSearch = String(search).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(escapedSearch, 'i')
      const matchingAdmins = await Admin.find({
        $or: [{ name: regex }, { email: regex }]
      }).select('_id').lean()

      filter.$or = [
        { action: regex },
        { description: regex },
        { actorEmail: regex },
        { entityType: regex },
        { admin: { $in: matchingAdmins.map(admin => admin._id) } }
      ]
    }

    const skip = (currentPage - 1) * pageLimit

    const [logs, totalLogs] = await Promise.all([

      AuditLog.find(filter)
        .populate('admin', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean(),

      AuditLog.countDocuments(filter)

    ])

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        currentPage,
        totalPages: Math.ceil(totalLogs / pageLimit),
        totalLogs,
        limit: pageLimit
      }
    })

  } catch (error) {

    console.error('Get Audit Logs Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch audit logs.'
    })
  }
}
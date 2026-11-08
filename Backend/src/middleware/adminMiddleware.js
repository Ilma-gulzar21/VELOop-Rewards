import jwt from 'jsonwebtoken'
import Admin from '../models/Admin.js'

const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    // Check admin token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required.'
      })
    }

    const token = authHeader.split(' ')[1]

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET
    )

    // Verify Super Admin role from token
    if (decoded.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin access denied.'
      })
    }

    // Find admin account
    const admin = await Admin.findById(decoded.adminId)

    // Check account existence and active status
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is inactive or does not exist.'
      })
    }

    // Reject tokens invalidated by a server-side logout.
    if ((decoded.tokenVersion ?? 0) !== (admin.tokenVersion ?? 0)) {
      return res.status(401).json({
        success: false,
        message: 'Admin session has expired. Please login again.'
      })
    }

    // Verify current database role
    if (admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Super Admin permission required.'
      })
    }

    // Attach admin to request
    req.admin = admin

    next()

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token.'
    })
  }
}

export default protectAdmin
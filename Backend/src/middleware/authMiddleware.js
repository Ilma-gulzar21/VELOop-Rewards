import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login first.'
      })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.userId).select('role isActive')

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account not found or inactive. Please login again.'
      })
    }

    if (user.role !== 'user' || decoded.role !== user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      })
    }

    req.user = {
      userId: user._id,
      role: user.role
    }

    next()

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    })
  }
}

export default protect
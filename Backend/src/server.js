import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

import connectDB from './config/db.js'

import authRoutes from './routes/authRoutes.js'
import walletRoutes from './routes/walletRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import payoutRoutes from './routes/payoutRoutes.js'
import adminPayoutRoutes from './routes/adminPayoutRoutes.js'
import redemptionRoutes from './routes/redemptionRoutes.js'
import adminRedemptionRoutes from './routes/adminRedemptionRoutes.js'
import adminAuditRoutes from './routes/adminAuditRoutes.js'
import adminSettingsRoutes from './routes/adminSettingsRoutes.js'
import publicSettingsRoutes from './routes/publicSettingsRoutes.js'

dotenv.config()

const app = express()

// Trust proxy in production deployment
if (process.env.NODE_ENV === 'production') {
app.set('trust proxy', 1)
}

// Security headers
app.use(helmet())

// CORS configuration

const allowedOrigins = [
  ...(process.env.CLIENT_ORIGIN || '').split(','),
  ...(process.env.FRONTEND_URL || '').split(','),
  'http://localhost:5173'
]
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean)

console.log('Allowed CORS Origins:', allowedOrigins)

const corsOptions = {
  origin: (origin, callback) => {

    // Allow requests without origin (Hoppscotch/server clients)
    if (!origin) {
      return callback(null, true)
    }

    const normalizedOrigin = origin.replace(/\/$/, '')

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true)
    }

    console.log('CORS blocked origin:', origin)

    return callback(null, false)
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))

// Limit request body size
app.use(express.json({ limit: '10kb' }))

// Rate limiter for user login
const userLoginLimiter = rateLimit({
windowMs: 15 * 60 * 1000,
limit: 10,
standardHeaders: 'draft-8',
legacyHeaders: false,
message: {
success: false,
message: 'Too many login attempts. Please try again after 15 minutes.'
}
})

// Rate limiter for user signup
const signupLimiter = rateLimit({
windowMs: 60 * 60 * 1000,
limit: 5,
standardHeaders: 'draft-8',
legacyHeaders: false,
message: {
success: false,
message: 'Too many signup attempts. Please try again later.'
}
})

// Rate limiter for admin login
const adminLoginLimiter = rateLimit({
windowMs: 15 * 60 * 1000,
limit: 20,
standardHeaders: 'draft-8',
legacyHeaders: false,
message: {
success: false,
message: 'Too many admin login attempts. Please try again after 15 minutes.'
}
})

// Additional protection for sensitive operations.
const redemptionCreateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.REDEMPTION_CREATE_LIMIT) || 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many redemption requests. Please try again later.' }
})

const redemptionQuoteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.REDEMPTION_QUOTE_LIMIT) || 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many quote requests. Please wait a moment.' }
})

const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many admin requests. Please try again later.' }
})

// Apply rate limiters before route handlers.
app.use('/api/auth/signup', signupLimiter)
app.use('/api/auth/login', userLoginLimiter)
app.use('/api/admin', adminApiLimiter)
app.use('/api/admin/login', adminLoginLimiter)
app.post('/api/redemptions/quote', redemptionQuoteLimiter)
app.post('/api/redemptions', redemptionCreateLimiter)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/payouts', payoutRoutes)
app.use('/api/admin/payouts', adminPayoutRoutes)
app.use('/api/redemptions', redemptionRoutes)
app.use('/api/admin/redemptions', adminRedemptionRoutes)
app.use('/api/admin/audit-logs', adminAuditRoutes)
app.use('/api/admin/settings', adminSettingsRoutes)
app.use('/api/payouts/settings', publicSettingsRoutes)

// Backend health check
app.get('/', (req, res) => {
res.status(200).json({
success: true,
message: 'VELOop Rewards Backend is running!'
})
})

// Health endpoint for deployment checks (no secrets, no DB details)
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', timestamp: new Date().toISOString() })
})

// Handle unknown routes
app.use((req, res) => {
res.status(404).json({
success: false,
message: `Route not found: ${req.method} ${req.originalUrl}`
})
})

// Global error handler
app.use((error, req, res, next) => {
console.error('Global Error:', error.message)

const statusCode = error.status || error.statusCode || 500

res.status(statusCode).json({
success: false,
message: statusCode >= 500
? 'Internal server error.'
: error.message || 'Request failed.'
})
})

// Start server after database connection
const startServer = async () => {
try {
const requiredEnvVariables = [
'MONGO_URI',
'JWT_SECRET',
'ADMIN_JWT_SECRET',
'PAYOUT_ENCRYPTION_KEY'
]

const missingVariables = requiredEnvVariables.filter(
  variable => !process.env[variable]
)

if (missingVariables.length > 0) {
  throw new Error(
    `Missing environment variables: ${missingVariables.join(', ')}`
  )
}

if (Buffer.from(process.env.PAYOUT_ENCRYPTION_KEY || '', 'base64').length !== 32) {
  throw new Error('PAYOUT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.')
}

await connectDB()

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`)
  console.log('Security middleware enabled.')
})

} catch (error) {
console.error('Server startup failed:', error.message)
process.exit(1)
}
}

startServer()

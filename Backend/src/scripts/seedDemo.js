// Resets and (re)creates NON-PRODUCTION demo data for evaluators.
// Safe by design: refuses to run unless DEMO_MODE=true, and touches only the
// demo accounts + demo reward options below. Never run against production data.
import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db.js'

import Admin from '../models/Admin.js'
import User from '../models/User.js'
import Wallet from '../models/Wallet.js'
import Redemption from '../models/Redemption.js'
import Transaction from '../models/Transaction.js'
import PayoutMethod from '../models/PayoutMethod.js'
import RewardOption from '../models/RewardOption.js'
import { ensureMethods, readJson } from './seedHelpers.js'

const env = (key, fallback) => (process.env[key] || fallback).trim()

// DEMO-ONLY credentials (also listed in docs/DEMO_ACCESS.md). Override with env vars.
const DEMO_ADMIN = {
  name: 'Demo Super Admin',
  email: env('DEMO_ADMIN_EMAIL', 'demo.admin@veloop.demo').toLowerCase(),
  password: env('DEMO_ADMIN_PASSWORD', 'DemoAdmin@2026')
}

const DEMO_USERS = [
  {
    name: 'Demo User',
    email: env('DEMO_USER_EMAIL', 'demo.user@veloop.demo').toLowerCase(),
    password: env('DEMO_USER_PASSWORD', 'DemoUser@2026'),
    balance: Number(process.env.DEMO_USER_BALANCE) || 15000
  },
  {
    name: 'Demo Low Balance User',
    email: env('DEMO_LOWBAL_EMAIL', 'demo.lowbalance@veloop.demo').toLowerCase(),
    password: env('DEMO_USER_PASSWORD', 'DemoUser@2026'),
    balance: 500
  }
]

const run = async () => {
  if (process.env.DEMO_MODE !== 'true') {
    console.error('Refusing to run: set DEMO_MODE=true to confirm this is a NON-production demo environment.')
    process.exitCode = 1
    return
  }

  try {
    await connectDB()
    console.log('\nResetting DEMO data...\n')

    // Admin: create or reset password / unlock
    let admin = await Admin.findOne({ email: DEMO_ADMIN.email }).select('+password')
    if (!admin) {
      admin = new Admin({ ...DEMO_ADMIN, role: 'super_admin' })
    } else {
      admin.password = DEMO_ADMIN.password
      admin.isActive = true
      admin.role = 'super_admin'
      admin.tokenVersion = (admin.tokenVersion || 0) + 1
    }
    admin.loginAttempts = 0
    admin.lockUntil = null
    await admin.save()
    console.log(`Demo admin ready: ${DEMO_ADMIN.email}`)

    // Methods + demo reward options (restored to demo values / enabled)
    await ensureMethods()
    await PayoutMethod.updateMany({}, { $set: { isEnabled: true } })

    const demo = await readJson('rewardOptions.demo.json')
    for (const opt of demo.options) {
      const method = await PayoutMethod.findOne({ key: opt.method })
      await RewardOption.findOneAndUpdate(
        { payoutMethod: method._id, rewardValue: opt.rewardValue },
        {
          $set: {
            requiredVEs: opt.requiredVEs,
            currency: 'INR',
            description: opt.description,
            sortOrder: opt.sortOrder,
            isEnabled: true
          }
        },
        { upsert: true }
      )
    }
    console.log(`Demo reward options ready (${demo.options.length}) — DEMO placeholder values, not verified production values.`)

    // Users: create/reset, wipe their redemption + ledger history, restore wallet
    for (const item of DEMO_USERS) {
      let user = await User.findOne({ email: item.email }).select('+password')
      if (!user) {
        user = new User({ name: item.name, email: item.email, password: item.password })
      } else {
        user.password = item.password
        user.isActive = true
      }
      user.payoutRestricted = false
      user.payoutRestrictionReason = ''
      user.payoutRestrictedAt = null
      await user.save()

      await Redemption.deleteMany({ user: user._id })
      await Transaction.deleteMany({ user: user._id })
      await Wallet.findOneAndUpdate(
        { user: user._id },
        { $set: { availableBalance: item.balance, totalEarned: item.balance, totalRedeemed: 0 } },
        { upsert: true }
      )
      console.log(`Demo user ready: ${item.email} (${item.balance} VEs)`)
    }

    console.log('\nDemo data reset complete.')
  } catch (error) {
    console.error('\nDemo seed error:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

run()

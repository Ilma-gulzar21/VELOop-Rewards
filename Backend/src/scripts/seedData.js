import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'

import connectDB from '../config/db.js'

import User from '../models/User.js'
import Wallet from '../models/Wallet.js'
import { ensureMethods, ensureRewardOptions, readJson } from './seedHelpers.js'

const seedData = async () => {
  try {
    await connectDB()

    console.log('\nStarting starter data initialization...\n')

    // 1. Payout methods
    await ensureMethods()

    // 2. Reward options. Values are NEVER invented here. They come only from:
    //    (a) seed/rewardOptions.verified.json with "confirmed": true, or
    //    (b) the legacy SEED_* variables (one option per method).
    let seededFromFile = false
    try {
      const verified = await readJson('rewardOptions.verified.json')
      if (verified.confirmed === true && Array.isArray(verified.options)) {
        await ensureRewardOptions(verified.options)
        seededFromFile = true
      } else {
        console.warn('rewardOptions.verified.json found but "confirmed" is not true. Skipped.')
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }

    const legacy = [
      { method: 'upi', rewardValue: process.env.SEED_UPI_REWARD_VALUE, requiredVEs: process.env.SEED_UPI_REQUIRED_VES },
      { method: 'amazon', rewardValue: process.env.SEED_AMAZON_REWARD_VALUE, requiredVEs: process.env.SEED_AMAZON_REQUIRED_VES },
      { method: 'googlePlay', rewardValue: process.env.SEED_GOOGLE_PLAY_REWARD_VALUE, requiredVEs: process.env.SEED_GOOGLE_PLAY_REQUIRED_VES }
    ].filter(item => item.rewardValue || item.requiredVEs)
    if (legacy.length) { await ensureRewardOptions(legacy); seededFromFile = true }

    if (!seededFromFile) {
      console.warn(
        '\n[!] No verified reward denominations were seeded. Users will see no reward options.\n' +
        '    Fill Backend/seed/rewardOptions.verified.json (see the .example file) with CONFIRMED values,\n' +
        '    or run `npm run seed:demo` for clearly-labelled DEMO values.\n'
      )
    }

    // 3. Optional demo user

    const {
      DEMO_USER_NAME,
      DEMO_USER_EMAIL,
      DEMO_USER_PASSWORD
    } = process.env

    if (DEMO_USER_EMAIL && DEMO_USER_PASSWORD) {
      const email = DEMO_USER_EMAIL.toLowerCase().trim()

      let user = await User.findOne({ email })

      if (!user) {
        user = await User.create({
          name: DEMO_USER_NAME || 'VELOop Demo User',
          email,
          password: DEMO_USER_PASSWORD
        })

        console.log('Demo user created successfully.')
      } else {
        console.log('Demo user already exists.')
      }

      // Create wallet with zero balance if it does not exist

      const existingWallet = await Wallet.findOne({
        user: user._id
      })

      if (!existingWallet) {
        await Wallet.create({
          user: user._id,
          availableBalance: 0,
          totalEarned: 0,
          totalRedeemed: 0
        })

        console.log('Demo user wallet created with zero balance.')
      } else {
        console.log('Demo user wallet already exists.')
      }

    } else {
      console.log(
        'Demo user skipped. Demo user environment variables are not configured.'
      )
    }

    console.log('\nStarter data initialization completed.')

  } catch (error) {
    console.error('\nStarter Data Seed Error:', error.message)
    process.exitCode = 1

  } finally {
    await mongoose.connection.close()
  }
}

seedData()
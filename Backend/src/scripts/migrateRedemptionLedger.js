import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Redemption from '../models/Redemption.js'
import RewardOption from '../models/RewardOption.js'
import Transaction from '../models/Transaction.js'

const migrateRedemptionLedger = async () => {
  let updatedCount = 0

  try {
    await connectDB()
    console.log('\nStarting redemption ledger migration...\n')

    for await (const redemption of Redemption.find().cursor()) {
      const updates = {}

      if (!redemption.currency) {
        const rewardOption = await RewardOption.findById(redemption.rewardOption)
          .select('currency')
          .lean()
        updates.currency = rewardOption?.currency || 'INR'
      }

      let originalTransaction = null
      if (!redemption.walletTransactionId || redemption.refunded) {
        originalTransaction = await Transaction.findOne({
          user: redemption.user,
          referenceId: redemption.referenceId,
          type: 'REDEEM'
        })
      }

      if (!redemption.walletTransactionId && originalTransaction) {
        updates.walletTransactionId = originalTransaction._id
      }

      if (redemption.refunded) {
        const refundTransaction = await Transaction.findOne({
          idempotencyKey: `refund-${redemption._id}`,
          type: 'REFUND'
        }).select('_id')

        if (!redemption.refundTransactionId && refundTransaction) {
          updates.refundTransactionId = refundTransaction._id
        }

        if (originalTransaction && originalTransaction.status !== 'REVERSED') {
          originalTransaction.status = 'REVERSED'
          await originalTransaction.save()
        }
      }

      if (Object.keys(updates).length > 0) {
        await Redemption.updateOne({ _id: redemption._id }, { $set: updates })
        updatedCount += 1
      }
    }

    const transactionBackfill = await Transaction.updateMany(
      { currency: { $exists: false } },
      { $set: { currency: 'VE' } }
    )

    console.log(`Redemption records updated: ${updatedCount}`)
    console.log(`Transaction currency values backfilled: ${transactionBackfill.modifiedCount}`)
    console.log('Redemption ledger migration completed.')
  } catch (error) {
    console.error('Redemption ledger migration failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

migrateRedemptionLedger()

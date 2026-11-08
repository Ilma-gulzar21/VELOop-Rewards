import dotenv from 'dotenv'
dotenv.config()
import connectDB from '../config/db.js'
import Redemption from '../models/Redemption.js'
import { encryptPayoutDetails, isEncryptedPayoutValue } from '../utils/payoutEncryption.js'

const run = async () => {
  if (!process.env.PAYOUT_ENCRYPTION_KEY) throw new Error('Set PAYOUT_ENCRYPTION_KEY before running this migration.')
  await connectDB()
  const cursor = Redemption.find({}).cursor()
  let encryptedCount = 0
  let snapshotCount = 0
  for await (const redemption of cursor) {
    let changed = false
    const details = redemption.payoutDetails?.toObject?.() || redemption.payoutDetails || {}
    const hasPlaintext = Object.values(details).some(value => typeof value === 'string' && value && !isEncryptedPayoutValue(value))
    if (hasPlaintext) {
      redemption.payoutDetails = encryptPayoutDetails(details)
      encryptedCount++
      changed = true
    }
    if (!redemption.rewardSnapshot || !redemption.rewardSnapshot.displayName) {
      redemption.rewardSnapshot = {
        displayName: `${redemption.methodKey || 'Reward'} ${redemption.currency || 'INR'} ${redemption.rewardValue}`,
        methodName: redemption.methodKey || 'Reward',
        rewardValue: redemption.rewardValue,
        requiredVEs: redemption.requiredVEs,
        currency: redemption.currency || 'INR',
        capturedAt: redemption.createdAt || new Date()
      }
      snapshotCount++
      changed = true
    }
    if (changed) await redemption.save()
  }
  console.log(`Migration complete. Encrypted payout records: ${encryptedCount}. Snapshot records backfilled: ${snapshotCount}.`)
  process.exit(0)
}

run().catch(error => { console.error('Migration failed:', error.message); process.exit(1) })

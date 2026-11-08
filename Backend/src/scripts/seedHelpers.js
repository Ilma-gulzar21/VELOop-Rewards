import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import path from 'path'

import PayoutMethod from '../models/PayoutMethod.js'
import RewardOption from '../models/RewardOption.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const seedDir = path.resolve(__dirname, '../../seed')

export const payoutMethods = [
  { key: 'upi', name: 'UPI Cash', description: 'Withdraw your rewards directly through UPI.', sortOrder: 1 },
  { key: 'amazon', name: 'Amazon Gift Card', description: 'Redeem your rewards for Amazon gift cards.', sortOrder: 2 },
  { key: 'googlePlay', name: 'Google Play Gift Card', description: 'Redeem your rewards for Google Play gift cards.', sortOrder: 3 }
]

export const readJson = async (file) => JSON.parse(await readFile(path.join(seedDir, file), 'utf8'))

export const ensureMethods = async () => {
  for (const method of payoutMethods) {
    const exists = await PayoutMethod.findOne({ key: method.key })
    if (exists) { console.log(`Payout method already exists: ${method.key}`); continue }
    await PayoutMethod.create(method)
    console.log(`Payout method created: ${method.key}`)
  }
}

// Idempotent: creates an option only if the same method + reward value does not already exist.
// Never overwrites existing (possibly admin-edited) options.
export const ensureRewardOptions = async (options) => {
  for (const opt of options) {
    const rewardValue = Number(opt.rewardValue)
    const requiredVEs = Number(opt.requiredVEs)
    if (!Number.isSafeInteger(rewardValue) || rewardValue <= 0 || !Number.isSafeInteger(requiredVEs) || requiredVEs <= 0) {
      throw new Error(`Invalid reward option for ${opt.method}: rewardValue and requiredVEs must be positive whole numbers.`)
    }
    const method = await PayoutMethod.findOne({ key: opt.method })
    if (!method) throw new Error(`Payout method missing: ${opt.method}`)

    const exists = await RewardOption.findOne({ payoutMethod: method._id, rewardValue })
    if (exists) { console.log(`Reward option exists: ${opt.method} ₹${rewardValue} (kept as is)`); continue }

    await RewardOption.create({
      payoutMethod: method._id,
      rewardValue,
      requiredVEs,
      currency: 'INR',
      description: opt.description || `Redeem ₹${rewardValue} through ${method.name}.`,
      sortOrder: Number(opt.sortOrder) || 0
    })
    console.log(`Reward option created: ${opt.method} ₹${rewardValue} / ${requiredVEs} VEs`)
  }
}

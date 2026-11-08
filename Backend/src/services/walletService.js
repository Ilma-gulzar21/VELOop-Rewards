import mongoose from 'mongoose'

import User from '../models/User.js'
import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'
import createAuditLog from './auditLogService.js'

export const adjustWallet = async ({
  userId,
  amount,
  type,
  description,
  idempotencyKey,
  adminId,
  req
}) => {

  const session = await mongoose.startSession()

  let result

  try {

    await session.withTransaction(async () => {

      // Prevent duplicate wallet operations
      const existingTransaction = await Transaction.findOne({
        idempotencyKey
      }).session(session)

      if (existingTransaction) {
        const error = new Error(
          'This transaction has already been processed.'
        )
        error.statusCode = 409
        throw error
      }

      // Check whether user exists
      const user = await User.findById(userId).session(session)

      if (!user) {
        const error = new Error('User not found.')
        error.statusCode = 404
        throw error
      }

      // Find or create wallet
      let wallet = await Wallet.findOne({
        user: userId
      }).session(session)

      if (!wallet) {
        const createdWallets = await Wallet.create(
          [{ user: userId }],
          { session }
        )

        wallet = createdWallets[0]
      }

      const balanceBefore = wallet.availableBalance

      // Prevent debit when balance is insufficient
      if (type === 'ADMIN_DEBIT' && balanceBefore < amount) {
        const error = new Error('Insufficient wallet balance.')
        error.statusCode = 400
        throw error
      }

      let update

      if (type === 'ADMIN_CREDIT') {

        update = await Wallet.findOneAndUpdate(
          { _id: wallet._id },
          {
            $inc: {
              availableBalance: amount,
              totalEarned: amount
            }
          },
          {
            new: true,
            session
          }
        )

      } else {

        update = await Wallet.findOneAndUpdate(
          {
            _id: wallet._id,
            availableBalance: { $gte: amount }
          },
          {
            $inc: {
              availableBalance: -amount
            }
          },
          {
            new: true,
            session
          }
        )

      }

      if (!update) {
        const error = new Error('Unable to update wallet balance.')
        error.statusCode = 400
        throw error
      }

      // Save transaction record
      const transactions = await Transaction.create(
        [
          {
            user: userId,
            wallet: wallet._id,
            type,
            amount,
            balanceBefore,
            balanceAfter: update.availableBalance,
            status: 'COMPLETED',
            description,
            idempotencyKey,
            performedBy: adminId
          }
        ],
        { session }
      )

      const transaction = transactions[0]

      // Save audit log in the same database transaction
      await createAuditLog({
        adminId,
        action: type === 'ADMIN_CREDIT'
          ? 'WALLET_CREDIT'
          : 'WALLET_DEBIT',
        entityType: 'WALLET',
        entityId: wallet._id,
        description: type === 'ADMIN_CREDIT'
          ? 'Admin credited user wallet.'
          : 'Admin debited user wallet.',
        metadata: {
          userId,
          amount,
          transactionId: transaction._id,
          transactionType: type,
          balanceBefore,
          balanceAfter: update.availableBalance
        },
        req,
        session
      })

      result = {
        wallet: update,
        transaction
      }

    })

    return result

  } finally {
    await session.endSession()
  }
}
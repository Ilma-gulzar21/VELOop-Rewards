import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true
    },

    type: {
      type: String,
      enum: [
        'EARN',
        'REDEEM',
        'ADMIN_CREDIT',
        'ADMIN_DEBIT',
        'REFUND'
      ],
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01
    },

    currency: {
      type: String,
      enum: ['VE'],
      default: 'VE'
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
      default: 'COMPLETED'
    },

    description: {
      type: String,
      trim: true,
      maxlength: 250
    },
performedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Admin'
},
    referenceId: {
      type: String,
      trim: true
    },

    idempotencyKey: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    }
  },
  {
    timestamps: true
  }
)

transactionSchema.index({ user: 1, createdAt: -1 })
transactionSchema.index({ referenceId: 1, type: 1 })

const Transaction = mongoose.model('Transaction', transactionSchema)

export default Transaction
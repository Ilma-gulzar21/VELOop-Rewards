import mongoose from 'mongoose'

const redemptionSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    // Prevent duplicate redemption requests
    idempotencyKey: {
      type: String,
      trim: true
    },

    // SHA-256 of the logical request (reward option + destination). Used to
    // reject re-use of an idempotency key with a different payload.
    requestFingerprint: {
      type: String,
      select: false
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    payoutMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayoutMethod',
      required: true
    },

    rewardOption: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RewardOption',
      required: true
    },

    methodKey: {
      type: String,
      enum: ['upi', 'amazon', 'googlePlay'],
      required: true
    },

    rewardValue: {
      type: Number,
      required: true,
      min: 0.01
    },

    // Currency snapshot: payout option edits must not rewrite old requests.
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },

    rewardSnapshot: {
      displayName: { type: String, trim: true, maxlength: 120 },
      methodName: { type: String, trim: true, maxlength: 80 },
      rewardValue: { type: Number, min: 0.01 },
      requiredVEs: { type: Number, min: 1 },
      currency: { type: String, trim: true, uppercase: true, maxlength: 8 },
      capturedAt: { type: Date, default: Date.now }
    },

    providerReference: { type: String, trim: true, maxlength: 120, default: null },

    requiredVEs: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Required VEs must be a whole number.'
      }
    },

    // Ledger references keep redemption debits and refunds traceable.
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null
    },

    refundTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null
    },

    payoutDetails: {
      upiId: {
        type: String,
        trim: true
      },

      email: {
        type: String,
        trim: true,
        lowercase: true
      }
    },

    status: {
      type: String,
      enum: [
        'PENDING',
        'UNDER_REVIEW',
        'APPROVED',
        'COMPLETED',
        'REJECTED',
        'FAILED',
        'CANCELLED'
      ],
      default: 'PENDING',
      index: true
    },

    adminNote: {
      type: String,
      trim: true,
      maxlength: 500
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },

    // Track whether VEs have been refunded
    refunded: {
      type: Boolean,
      default: false
    },

    // Store completion timestamp
    completedAt: {
      type: Date,
      default: null
    },

    // Track every status change
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            'PENDING',
            'UNDER_REVIEW',
            'APPROVED',
            'COMPLETED',
            'REJECTED',
            'FAILED',
            'CANCELLED'
          ],
          required: true
        },

        note: {
          type: String,
          trim: true,
          maxlength: 500
        },

        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'statusHistory.changedByModel'
        },

        changedByModel: {
          type: String,
          enum: ['User', 'Admin']
        },

        changedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
)

// User redemption history
redemptionSchema.index({
  user: 1,
  createdAt: -1
})

// Prevent duplicate requests using the same key
// for the same user
redemptionSchema.index(
  {
    user: 1,
    idempotencyKey: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: {
        $type: 'string'
      }
    }
  }
)

// Admin redemption filters
redemptionSchema.index({
  status: 1,
  createdAt: -1
})

redemptionSchema.index({
  methodKey: 1,
  status: 1
})

const Redemption = mongoose.model(
  'Redemption',
  redemptionSchema
)

export default Redemption
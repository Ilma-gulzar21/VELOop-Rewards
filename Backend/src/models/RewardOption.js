import mongoose from 'mongoose'

const rewardOptionSchema = new mongoose.Schema(
  {
    payoutMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayoutMethod',
      required: true,
      index: true
    },

    rewardValue: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Reward value must be a whole number.'
      }
    },

    requiredVEs: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isSafeInteger,
        message: 'Required VEs must be a whole number.'
      }
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 250
    },

    isEnabled: {
      type: Boolean,
      default: true
    },

    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

const RewardOption = mongoose.model(
  'RewardOption',
  rewardOptionSchema
)

export default RewardOption
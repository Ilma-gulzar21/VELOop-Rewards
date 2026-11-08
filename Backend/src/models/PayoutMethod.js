import mongoose from 'mongoose'

const payoutMethodSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ['upi', 'amazon', 'googlePlay'],
      required: true,
      unique: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300
    },

    maintenanceMessage: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
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

const PayoutMethod = mongoose.model(
  'PayoutMethod',
  payoutMethodSchema
)

export default PayoutMethod
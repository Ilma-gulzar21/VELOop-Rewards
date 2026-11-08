import mongoose from 'mongoose'

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    availableBalance: {
      type: Number,
      default: 0,
      min: 0
    },

    totalEarned: {
      type: Number,
      default: 0,
      min: 0
    },

    totalRedeemed: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
)

const Wallet = mongoose.model('Wallet', walletSchema)

export default Wallet
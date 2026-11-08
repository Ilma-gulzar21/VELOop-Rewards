import Wallet from '../models/Wallet.js'
import Transaction from '../models/Transaction.js'

// Get logged-in user's wallet
export const getMyWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { user: req.user.userId },
      {
        $setOnInsert: {
          user: req.user.userId
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    )

    res.status(200).json({
      success: true,
      message: 'Wallet fetched successfully',
      wallet: {
        availableBalance: wallet.availableBalance,
        totalEarned: wallet.totalEarned,
        totalRedeemed: wallet.totalRedeemed,
        updatedAt: wallet.updatedAt
      }
    })

  } catch (error) {
    console.error('Wallet Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch wallet details.'
    })
  }
}


// Get logged-in user's transaction history
export const getMyTransactions = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    )

    const skip = (page - 1) * limit

    const [transactions, total] = await Promise.all([
      Transaction.find({
        user: req.user.userId
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),

      Transaction.countDocuments({
        user: req.user.userId
      })
    ])

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
        limit
      }
    })

  } catch (error) {
    console.error('Transaction History Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch transaction history.'
    })
  }
}
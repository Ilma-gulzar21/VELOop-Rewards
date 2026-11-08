import styles from '../../sharedPage.module.css'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

import {
  ArrowRight,
  ArrowUpRight,
  Wallet,
  Gift,
  CheckCircle2,
  ShieldCheck,
  Zap,
  CreditCard,
  Smartphone,
  ShoppingBag,
  Sparkles,
  CircleHelp,
  History,
  TrendingUp,
  RefreshCw
} from 'lucide-react'

import { api } from '../../services/api'

import './Dashboard.css'

// Available rewards
const rewards = [
  {
    id: 1,
    name: 'UPI Cash',
    description: 'Redeem your eligible VEs directly to your UPI ID.',
    icon: Smartphone,
    label: 'CASH REWARD',
    color: 'upi',
    method: 'upi'
  },
  {
    id: 2,
    name: 'Amazon Gift Card',
    description: 'Enjoy shopping with your Amazon gift card.',
    icon: ShoppingBag,
    label: 'SHOPPING',
    color: 'amazon',
    method: 'amazon'
  },
  {
    id: 3,
    name: 'Google Play',
    description: 'Get Google Play gift cards for your favourite apps.',
    icon: CreditCard,
    label: 'DIGITAL REWARD',
    color: 'google',
    method: 'googlePlay'
  }
]

// Animation variants
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12
    }
  }
}

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 25
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: 'easeOut'
    }
  }
}

// Format VE values
const formatVE = (value) => {
  return Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2
  })
}

// Format transaction date
const formatDate = (date) => {
  if (!date) return 'Date unavailable'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

// Transaction title
const getTransactionTitle = (transaction) => {
  if (transaction.description) {
    return transaction.description
  }

  const titles = {
    EARN: 'VE Earned',
    REDEEM: 'Reward Redemption',
    ADMIN_CREDIT: 'Admin Credit',
    ADMIN_DEBIT: 'Admin Debit',
    REFUND: 'Refund'
  }

  return titles[transaction.type] || 'Wallet Transaction'
}

// Dashboard component
const Dashboard = () => {

  const [wallet, setWallet] = useState(null)

  const [transactions, setTransactions] = useState([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch dashboard data
  useEffect(() => {

    let isMounted = true

    const fetchDashboardData = async () => {

      try {

        setLoading(true)
        setError('')

        const token = sessionStorage.getItem('token')

        if (!token) {
          throw new Error('Please login to view your wallet.')
        }

        // Fetch wallet and transactions independently
        const results = await Promise.allSettled([

          api.get('/wallet'),

          api.get('/wallet/transactions?limit=3')

        ])

        if (!isMounted) return

        const [walletResult, transactionResult] = results

        let errorMessages = []

        // Wallet API response
        if (walletResult.status === 'fulfilled') {

          const walletData = walletResult.value.data

          if (walletData.success) {

            setWallet(walletData.wallet)

          } else {

            errorMessages.push(
              walletData.message || 'Unable to load wallet information.'
            )

          }

        } else {

          console.error(
            'Wallet API Error:',
            walletResult.reason
          )

          errorMessages.push(
            walletResult.reason.response?.data?.message ||
            'Unable to load wallet information.'
          )

        }

        // Transactions API response
        if (transactionResult.status === 'fulfilled') {

          const transactionData = transactionResult.value.data

          if (transactionData.success) {

            setTransactions(
              transactionData.transactions || []
            )

          } else {

            errorMessages.push(
              transactionData.message ||
              'Unable to load recent transactions.'
            )

          }

        } else {

          console.error(
            'Transactions API Error:',
            transactionResult.reason
          )

          errorMessages.push(
            transactionResult.reason.response?.data?.message ||
            'Unable to load recent transactions.'
          )

        }

        if (errorMessages.length > 0) {

          setError(errorMessages.join(' '))

        }

      } catch (err) {

        console.error('Dashboard API Error:', err)

        if (isMounted) {

          setError(
            err.response?.data?.message ||
            err.message ||
            'Unable to load dashboard information.'
          )

        }

      } finally {

        if (isMounted) {
          setLoading(false)
        }

      }

    }

    fetchDashboardData()

    return () => {
      isMounted = false
    }

  }, [refreshKey])

  // Dashboard statistics
  const stats = [

    {
      title: 'Available Balance',
      value: loading
        ? '...'
        : wallet
          ? formatVE(wallet.availableBalance)
          : '--',
      description: 'Your current VE balance',
      icon: Wallet,
      color: 'blue'
    },

    {
      title: 'Total Earned',
      value: loading
        ? '...'
        : wallet
          ? formatVE(wallet.totalEarned)
          : '--',
      description: 'Total VEs earned',
      icon: TrendingUp,
      color: 'purple'
    },

    {
      title: 'Total Redeemed',
      value: loading
        ? '...'
        : wallet
          ? formatVE(wallet.totalRedeemed)
          : '--',
      description: 'Total VEs redeemed',
      icon: Gift,
      color: 'orange'
    }

  ]

  return (

    <main className={`${styles.pageShell} dashboard-page`}>

      <div className="dashboard-wrapper">

        {/* HERO SECTION */}

        <motion.section
          className="welcome-hero"
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >

          <div className="hero-content">

            <div className="hero-badge">
              <Sparkles size={15} />
              YOUR REWARDS, YOUR WAY
            </div>

            <h1>
              Turn Your VEs Into
              <span> Exciting Rewards.</span>
            </h1>

            <p>
              Welcome to your VELOop Rewards dashboard.
              Explore available rewards, submit redemption requests
              and keep track of your rewards journey.
            </p>

            <div className="hero-buttons">

              <Link
                to="/Payout?method=upi"
                className="hero-primary-btn"
              >
                Explore Rewards
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/history"
                className="hero-secondary-btn"
              >
                View History
              </Link>

            </div>

            <div className="hero-trust">

              <span>
                <ShieldCheck size={16} />
                Secure Redemption
              </span>

              <span>
                <CheckCircle2 size={16} />
                Transparent Tracking
              </span>

            </div>

          </div>

          <div className="hero-visual">

            <div className="visual-glow"></div>

            <motion.div
              className="floating-reward-card reward-card-main"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >

              <div className="visual-card-top">

                <div className="visual-wallet-icon">
                  <Wallet size={24} />
                </div>

                <span>VELOOP WALLET</span>

              </div>

              <p>Your VE Balance</p>

              <h2>
                {loading
                  ? '...'
                  : wallet
                    ? formatVE(wallet.availableBalance)
                    : '--'
                }

                <small> VEs</small>
              </h2>

              <div className="visual-card-bottom">
                <span>Available Rewards</span>
                <Sparkles size={19} />
              </div>

            </motion.div>

            <motion.div
              className="floating-reward-card mini-reward-card"
              animate={{ y: [0, 9, 0] }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >

              <div className="mini-icon">
                <Gift size={20} />
              </div>

              <div>
                <strong>Redeem Rewards</strong>
                <span>Choose your reward</span>
              </div>

              <ArrowUpRight size={19} />

            </motion.div>

            <div className="hero-decoration decoration-one"></div>

            <div className="hero-decoration decoration-two"></div>

          </div>

        </motion.section>


        {/* API ERROR MESSAGE */}

        {error && (

          <div className="dashboard-error">

            <div>
              <strong>Dashboard Information</strong>
              <p>{error}</p>
            </div>

            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              aria-label="Retry loading dashboard"
              disabled={loading}
            >
              <RefreshCw size={17} />
              Retry
            </button>

          </div>

        )}


        {/* STATISTICS */}

        <motion.section
          className="stats-section"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >

          {stats.map((stat) => {

            const Icon = stat.icon

            return (

              <motion.div
                className="stat-card"
                key={stat.title}
                variants={itemVariants}
                whileHover={{ y: -6 }}
              >

                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={22} />
                </div>

                <div className="stat-info">

                  <p>{stat.title}</p>

                  <h3>{stat.value}</h3>

                  <span>{stat.description}</span>

                </div>

                <div className="stat-decoration">
                  <TrendingUp size={23} />
                </div>

              </motion.div>

            )

          })}

        </motion.section>


        {/* REWARD METHODS */}

        <section className="rewards-section">

          <div className="section-heading">

            <div>

              <span className="section-eyebrow">
                REDEEM YOUR REWARDS
              </span>

              <h2>Choose Your Reward</h2>

              <p>
                Select a payout method that works best for you.
              </p>

            </div>

            <Link
              to="/Payout?method=upi"
              className="view-all-link"
            >
              View All
              <ArrowRight size={17} />
            </Link>

          </div>

          <motion.div
            className="rewards-grid"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >

            {rewards.map((reward) => {

              const Icon = reward.icon

              return (

                <motion.div
                  className={`reward-card ${reward.color}`}
                  key={reward.id}
                  variants={itemVariants}
                  whileHover={{
                    y: -9,
                    transition: { duration: 0.25 }
                  }}
                >

                  <div className="reward-card-top">

                    <div className="reward-icon">
                      <Icon size={26} />
                    </div>

                    <span className="reward-label">
                      {reward.label}
                    </span>

                  </div>

                  <h3>{reward.name}</h3>

                  <p>{reward.description}</p>

                  <Link
                    to={`/Payout?method=${reward.method}`}
                    className="reward-action"
                  >
                    Redeem Now
                    <ArrowUpRight size={18} />
                  </Link>

                  <div className="reward-card-decoration">
                    <Icon size={90} />
                  </div>

                </motion.div>

              )

            })}

          </motion.div>

        </section>


        {/* BOTTOM SECTION */}

        <section className="bottom-grid">

          {/* RECENT ACTIVITY */}

          <div className="activity-panel">

            <div className="panel-heading">

              <div>
                <span className="section-eyebrow">
                  YOUR ACTIVITY
                </span>

                <h2>Recent Activity</h2>
              </div>

              <Link
                to="/history"
                className="activity-history-link"
              >
                View History
                <ArrowRight size={16} />
              </Link>

            </div>


            {/* LOADING STATE */}

            {loading ? (

              <div className="activity-loading">

                <div className="activity-spinner"></div>

                <p>Loading your activity...</p>

              </div>

            ) : transactions.length > 0 ? (

              /* TRANSACTION LIST */

              <div className="recent-transactions">

                {transactions.map((transaction) => (

                  <div
                    className="recent-transaction-item"
                    key={transaction._id}
                  >

                    <div className="transaction-icon">

                      {transaction.type === 'EARN' ||
                      transaction.type === 'ADMIN_CREDIT' ? (

                        <TrendingUp size={19} />

                      ) : (

                        <Gift size={19} />

                      )}

                    </div>

                    <div className="transaction-details">

                      <strong>
                        {getTransactionTitle(transaction)}
                      </strong>

                      <span>
                        {formatDate(transaction.createdAt)}
                      </span>

                    </div>

                    <div className="transaction-amount">

                      <strong>

                        {transaction.type === 'EARN' ||
                        transaction.type === 'ADMIN_CREDIT' ||
                        transaction.type === 'REFUND'
                          ? '+'
                          : '-'
                        }

                        {formatVE(transaction.amount)} VE

                      </strong>

                      <span
                        className={`transaction-status ${transaction.status?.toLowerCase()}`}
                      >
                        {transaction.status || 'UNKNOWN'}
                      </span>

                    </div>

                  </div>

                ))}

              </div>

            ) : (

              /* EMPTY STATE */

              <div className="empty-activity">

                <div className="empty-icon">
                  <History size={29} />
                </div>

                <h3>No activity yet</h3>

                <p>
                  Your redemption requests and transaction activity
                  will appear here once available.
                </p>

                <Link to="/Payout?method=upi">
                  Start Redeeming
                  <ArrowRight size={16} />
                </Link>

              </div>

            )}

          </div>


          {/* HELP PANEL */}

          <div className="help-panel">

            <div className="help-icon">
              <CircleHelp size={27} />
            </div>

            <span className="section-eyebrow">
              NEED ASSISTANCE?
            </span>

            <h2>We're here to help.</h2>

            <p>
              Have questions about your VE balance or redemption
              process? Explore the available information or contact
              the support team.
            </p>

            <div className="help-features">

              <span>
                <ShieldCheck size={16} />
                Secure process
              </span>

              <span>
                <Zap size={16} />
                Easy redemption
              </span>

            </div>

          </div>

        </section>


        {/* FOOTER */}

        <footer className="dashboard-footer">

          <div className="footer-brand">
            <Gift size={18} />
            <strong>VELOop Rewards</strong>
          </div>

          <p>Manage your rewards with confidence.</p>

          <span>
            © {new Date().getFullYear()} VELOop Rewards
          </span>

        </footer>

      </div>

    </main>

  )

}

export default Dashboard
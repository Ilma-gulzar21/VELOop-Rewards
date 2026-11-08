import styles from './adminPage.module.css'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Plus,
  Edit,
  RefreshCw,
  X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../services/api'
import './AdminPayoutManagement.css'

const initialMethodForm = {
  key: '',
  name: '',
  description: '',
  maintenanceMessage: '',
  sortOrder: 1
}

const initialRewardForm = {
  payoutMethod: '',
  rewardValue: '',
  requiredVEs: '',
  currency: 'INR',
  description: '',
  sortOrder: 1
}

function AdminPayoutManagement() {
  const navigate = useNavigate()

  const [methods, setMethods] = useState([])
  const [options, setOptions] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [activeTab, setActiveTab] = useState('methods')

  const [showMethodModal, setShowMethodModal] = useState(false)
  const [showRewardModal, setShowRewardModal] = useState(false)

  const [editingMethod, setEditingMethod] = useState(null)
  const [editingReward, setEditingReward] = useState(null)

  const [methodForm, setMethodForm] = useState(initialMethodForm)
  const [rewardForm, setRewardForm] = useState(initialRewardForm)

  // Fetch payout methods and reward options

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')

      const [methodResponse, rewardResponse] = await Promise.all([
        adminApi.get('/admin/payouts/methods'),
        adminApi.get('/admin/payouts/reward-options')
      ])

      setMethods(methodResponse.data.methods || [])
      setOptions(rewardResponse.data.options || [])

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load payout management data.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Success message

  const showMessage = (message) => {
    setSuccess(message)
    setError('')

    setTimeout(() => {
      setSuccess('')
    }, 3000)
  }

  // -------------------------------
  // PAYOUT METHOD FORM
  // -------------------------------

  const openAddMethod = () => {
    setEditingMethod(null)

    setMethodForm({
      ...initialMethodForm,
      sortOrder: methods.length + 1
    })

    setError('')
    setShowMethodModal(true)
  }

  const openEditMethod = (method) => {
    setEditingMethod(method)

    setMethodForm({
      key: method.key,
      name: method.name,
      description: method.description || '',
      maintenanceMessage: method.maintenanceMessage || '',
      sortOrder: method.sortOrder ?? 1
    })

    setError('')
    setShowMethodModal(true)
  }

  const closeMethodModal = () => {
    if (saving) return

    setShowMethodModal(false)
    setEditingMethod(null)
    setMethodForm(initialMethodForm)
  }

  const handleMethodSubmit = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')

      const payload = {
        name: methodForm.name.trim(),
        description: methodForm.description.trim(),
        maintenanceMessage: methodForm.maintenanceMessage.trim(),
        sortOrder: Number(methodForm.sortOrder)
      }

      if (editingMethod) {
        await adminApi.patch(
          `/admin/payouts/methods/${editingMethod._id}`,
          payload
        )

        showMessage('Payout method updated successfully.')
      } else {
        await adminApi.post('/admin/payouts/methods', {
          ...payload,
          key: methodForm.key
        })

        showMessage('Payout method created successfully.')
      }

      setShowMethodModal(false)
      setEditingMethod(null)
      setMethodForm(initialMethodForm)

      await fetchData()

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to save payout method.'
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleMethodStatus = async (method) => {
    const action = method.isEnabled ? 'disable' : 'enable'
    if (!window.confirm(`Are you sure you want to ${action} ${method.name}?`)) return
    const changeReason = window.prompt('Enter the reason for this change (5–250 characters):')
    if (!changeReason || changeReason.trim().length < 5 || changeReason.trim().length > 250) {
      setError('A valid change reason is required.')
      return
    }
    try {
      setError('')

      await adminApi.patch(
        `/admin/payouts/methods/${method._id}`,
        {
          isEnabled: !method.isEnabled,
          changeReason: changeReason.trim()
        }
      )

      showMessage(
        `Payout method ${method.isEnabled ? 'disabled' : 'enabled'} successfully.`
      )

      await fetchData()

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to update payout method.'
      )
    }
  }

  // -------------------------------
  // REWARD OPTION FORM
  // -------------------------------

  const openAddReward = () => {
    setEditingReward(null)

    setRewardForm({
      ...initialRewardForm,
      payoutMethod: methods.find(method => method.isEnabled)?._id || '',
      sortOrder: options.length + 1
    })

    setError('')
    setShowRewardModal(true)
  }

  const openEditReward = (option) => {
    setEditingReward(option)

    setRewardForm({
      payoutMethod: option.payoutMethod?._id || '',
      rewardValue: option.rewardValue,
      requiredVEs: option.requiredVEs,
      currency: option.currency || 'INR',
      description: option.description || '',
      sortOrder: option.sortOrder ?? 1
    })

    setError('')
    setShowRewardModal(true)
  }

  const closeRewardModal = () => {
    if (saving) return

    setShowRewardModal(false)
    setEditingReward(null)
    setRewardForm(initialRewardForm)
  }

  const handleRewardSubmit = async (e) => {
    e.preventDefault()

    try {
      setSaving(true)
      setError('')

      const payload = {
        rewardValue: Number(rewardForm.rewardValue),
        requiredVEs: Number(rewardForm.requiredVEs),
        currency: rewardForm.currency.trim(),
        description: rewardForm.description.trim(),
        sortOrder: Number(rewardForm.sortOrder)
      }

      if (
        !Number.isFinite(payload.rewardValue) ||
        payload.rewardValue <= 0 ||
        !Number.isFinite(payload.requiredVEs) ||
        payload.requiredVEs <= 0
      ) {
        setError('Enter valid reward value and required VEs.')
        return
      }

      if (editingReward) {
        const sensitiveChange =
          Number(rewardForm.requiredVEs) !== Number(editingReward.requiredVEs)
        if (sensitiveChange) {
          const changeReason = window.prompt('You are changing the required VEs. Enter a reason (5–250 characters):')
          if (!changeReason || changeReason.trim().length < 5 || changeReason.trim().length > 250) {
            setError('A valid change reason is required.')
            return
          }
          payload.changeReason = changeReason.trim()
        }
        await adminApi.patch(
          `/admin/payouts/reward-options/${editingReward._id}`,
          payload
        )

        showMessage('Reward option updated successfully.')

      } else {
        await adminApi.post(
          '/admin/payouts/reward-options',
          {
            ...payload,
            payoutMethod: rewardForm.payoutMethod
          }
        )

        showMessage('Reward option created successfully.')
      }

      setShowRewardModal(false)
      setEditingReward(null)
      setRewardForm(initialRewardForm)

      await fetchData()

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to save reward option.'
      )
    } finally {
      setSaving(false)
    }
  }

  const toggleRewardStatus = async (option) => {
    const action = option.isEnabled ? 'disable' : 'enable'
    if (!window.confirm(`Are you sure you want to ${action} this reward option?`)) return
    const changeReason = window.prompt('Enter the reason for this change (5–250 characters):')
    if (!changeReason || changeReason.trim().length < 5 || changeReason.trim().length > 250) {
      setError('A valid change reason is required.')
      return
    }
    try {
      setError('')

      await adminApi.patch(
        `/admin/payouts/reward-options/${option._id}`,
        {
          isEnabled: !option.isEnabled,
          changeReason: changeReason.trim()
        }
      )

      showMessage(
        `Reward option ${option.isEnabled ? 'disabled' : 'enabled'} successfully.`
      )

      await fetchData()

    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to update reward option.'
      )
    }
  }

  return (
    <div className={`${styles.page} admin-payout-page`}>

      {/* HEADER */}

      <div className="payout-management-header">

        <div>
          <button
            type="button"
            className="payout-back-btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>

          <h1>Payout Management</h1>

          <p>
            Manage payout methods and reward redemption options.
          </p>
        </div>

        <button
          type="button"
          className="payout-refresh-btn"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>

      </div>

      {/* MESSAGES */}

      {error && (
        <div className="payout-error-message">
          {error}

          <button
            type="button"
            onClick={() => setError('')}
            aria-label="Close error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="payout-success-message">
          {success}
        </div>
      )}

      {/* TABS */}

      <div className="payout-management-tabs">

        <button
          type="button"
          className={activeTab === 'methods' ? 'active' : ''}
          onClick={() => setActiveTab('methods')}
        >
          Payout Methods ({methods.length})
        </button>

        <button
          type="button"
          className={activeTab === 'rewards' ? 'active' : ''}
          onClick={() => setActiveTab('rewards')}
        >
          Reward Options ({options.length})
        </button>

      </div>

      {loading ? (

        <div className="payout-loading">
          Loading payout management...
        </div>

      ) : (

        <>

          {/* PAYOUT METHODS */}

          {activeTab === 'methods' && (

            <section className="payout-management-section">

              <div className="payout-section-heading">

                <div>
                  <h2>Payout Methods</h2>
                  <p>Manage available withdrawal methods.</p>
                </div>

                <button
                  type="button"
                  className="payout-add-btn"
                  onClick={openAddMethod}
                >
                  <Plus size={17} />
                  Add Method
                </button>

              </div>

              <div className="payout-method-grid">

                {methods.map((method) => (

                  <div
                    className="payout-method-card"
                    key={method._id}
                  >

                    <div className="payout-card-top">

                      <span className="payout-method-key">
                        {method.key}
                      </span>

                      <span
                        className={
                          method.isEnabled
                            ? 'payout-enabled'
                            : 'payout-disabled'
                        }
                      >
                        {method.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>

                    </div>

                    <h3>{method.name}</h3>

                    <p>
                      {method.description || 'No description available.'}
                    </p>

                    <div className="payout-card-footer">

                      <span>
                        Sort Order: {method.sortOrder}
                      </span>

                      <div className="payout-card-actions">

                        <button
                          type="button"
                          className="payout-edit-btn"
                          onClick={() => openEditMethod(method)}
                        >
                          <Edit size={15} />
                          Edit
                        </button>

                        <button
                          type="button"
                          className="payout-toggle-btn"
                          onClick={() => toggleMethodStatus(method)}
                        >
                          {method.isEnabled ? 'Disable' : 'Enable'}
                        </button>

                      </div>

                    </div>

                  </div>

                ))}

                {methods.length === 0 && (
                  <p>No payout methods available.</p>
                )}

              </div>

            </section>

          )}

          {/* REWARD OPTIONS */}

          {activeTab === 'rewards' && (

            <section className="payout-management-section">

              <div className="payout-section-heading">

                <div>
                  <h2>Reward Options</h2>
                  <p>Manage reward values and required VEs.</p>
                </div>

                <button
                  type="button"
                  className="payout-add-btn"
                  onClick={openAddReward}
                  disabled={!methods.some(method => method.isEnabled)}
                >
                  <Plus size={17} />
                  Add Reward
                </button>

              </div>

              <div className="reward-table-container">

                <table className="reward-options-table">

                  <thead>
                    <tr>
                      <th>Payout Method</th>
                      <th>Reward Value</th>
                      <th>Required VEs</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>

                    {options.map((option) => (

                      <tr key={option._id}>

                        <td>
                          <strong>
                            {option.payoutMethod?.name || 'Unknown'}
                          </strong>
                        </td>

                        <td>
                          {option.currency} {option.rewardValue}
                        </td>

                        <td>
                          {option.requiredVEs} VEs
                        </td>

                        <td>
                          {option.description || '-'}
                        </td>

                        <td>
                          <span
                            className={
                              option.isEnabled
                                ? 'payout-enabled'
                                : 'payout-disabled'
                            }
                          >
                            {option.isEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>

                        <td>

                          <div className="reward-actions">

                            <button
                              type="button"
                              className="payout-edit-btn"
                              onClick={() => openEditReward(option)}
                            >
                              <Edit size={14} />
                              Edit
                            </button>

                            <button
                              type="button"
                              className="payout-toggle-btn"
                              onClick={() => toggleRewardStatus(option)}
                            >
                              {option.isEnabled ? 'Disable' : 'Enable'}
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                    {options.length === 0 && (
                      <tr>
                        <td colSpan="6" className="reward-empty">
                          No reward options available.
                        </td>
                      </tr>
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          )}

        </>

      )}

      {/* PAYOUT METHOD MODAL */}

      {showMethodModal && (

        <div
          className="payout-modal-overlay"
          onClick={closeMethodModal}
        >

          <div
            className="payout-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="payout-modal-header">

              <h2>
                {editingMethod
                  ? 'Edit Payout Method'
                  : 'Add Payout Method'}
              </h2>

              <button
                type="button"
                onClick={closeMethodModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X />
              </button>

            </div>

            <form onSubmit={handleMethodSubmit}>

              {!editingMethod && (

                <div className="payout-form-group">

                  <label>Method Key *</label>

                  <select
                    value={methodForm.key}
                    onChange={(e) => setMethodForm({
                      ...methodForm,
                      key: e.target.value
                    })}
                    required
                  >
                    <option value="">Select Method</option>
                    <option value="upi">UPI</option>
                    <option value="amazon">Amazon</option>
                    <option value="googlePlay">Google Play</option>
                  </select>

                </div>

              )}

              <div className="payout-form-group">

                <label>Method Name *</label>

                <input
                  type="text"
                  value={methodForm.name}
                  onChange={(e) => setMethodForm({
                    ...methodForm,
                    name: e.target.value
                  })}
                  required
                />

              </div>

              <div className="payout-form-group">

                <label>Description</label>

                <textarea
                  value={methodForm.description}
                  onChange={(e) => setMethodForm({
                    ...methodForm,
                    description: e.target.value
                  })}
                />

              </div>

              <div className="payout-form-group">
                <label>Maintenance message (shown while disabled)</label>
                <textarea
                  maxLength={300}
                  rows={2}
                  value={methodForm.maintenanceMessage}
                  onChange={(e) => setMethodForm({ ...methodForm, maintenanceMessage: e.target.value })}
                  placeholder="Optional message displayed to users when this method is unavailable"
                />
              </div>

              <div className="payout-form-group">

                <label>Sort Order</label>

                <input
                  type="number"
                  min="0"
                  value={methodForm.sortOrder}
                  onChange={(e) => setMethodForm({
                    ...methodForm,
                    sortOrder: e.target.value
                  })}
                />

              </div>

              <div className="payout-modal-actions">

                <button
                  type="button"
                  className="payout-cancel-btn"
                  onClick={closeMethodModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payout-save-btn"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Method'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* REWARD OPTION MODAL */}

      {showRewardModal && (

        <div
          className="payout-modal-overlay"
          onClick={closeRewardModal}
        >

          <div
            className="payout-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="payout-modal-header">

              <h2>
                {editingReward
                  ? 'Edit Reward Option'
                  : 'Add Reward Option'}
              </h2>

              <button
                type="button"
                onClick={closeRewardModal}
                disabled={saving}
                aria-label="Close modal"
              >
                <X />
              </button>

            </div>

            <form onSubmit={handleRewardSubmit}>

              {!editingReward && (

                <div className="payout-form-group">

                  <label>Payout Method *</label>

                  <select
                    value={rewardForm.payoutMethod}
                    onChange={(e) => setRewardForm({
                      ...rewardForm,
                      payoutMethod: e.target.value
                    })}
                    required
                  >

                    <option value="">Select Method</option>

                    {methods
                      .filter(method => method.isEnabled)
                      .map((method) => (

                        <option
                          key={method._id}
                          value={method._id}
                        >
                          {method.name}
                        </option>

                      ))}

                  </select>

                </div>

              )}

              <div className="payout-form-group">

                <label>Reward Value *</label>

                <input
                  type="number"
                  min="1"
                  step="any"
                  value={rewardForm.rewardValue}
                  onChange={(e) => setRewardForm({
                    ...rewardForm,
                    rewardValue: e.target.value
                  })}
                  required
                />

              </div>

              <div className="payout-form-group">

                <label>Required VEs *</label>

                <input
                  type="number"
                  min="1"
                  step="any"
                  value={rewardForm.requiredVEs}
                  onChange={(e) => setRewardForm({
                    ...rewardForm,
                    requiredVEs: e.target.value
                  })}
                  required
                />

              </div>

              <div className="payout-form-group">

                <label>Currency</label>

                <input
                  type="text"
                  value={rewardForm.currency}
                  onChange={(e) => setRewardForm({
                    ...rewardForm,
                    currency: e.target.value
                  })}
                />

              </div>

              <div className="payout-form-group">

                <label>Description</label>

                <textarea
                  value={rewardForm.description}
                  onChange={(e) => setRewardForm({
                    ...rewardForm,
                    description: e.target.value
                  })}
                />

              </div>

              <div className="payout-form-group">

                <label>Sort Order</label>

                <input
                  type="number"
                  min="0"
                  value={rewardForm.sortOrder}
                  onChange={(e) => setRewardForm({
                    ...rewardForm,
                    sortOrder: e.target.value
                  })}
                />

              </div>

              <div className="payout-modal-actions">

                <button
                  type="button"
                  className="payout-cancel-btn"
                  onClick={closeRewardModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="payout-save-btn"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Reward'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  )
}

export default AdminPayoutManagement
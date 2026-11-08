import mongoose from 'mongoose'

import PayoutMethod from '../models/PayoutMethod.js'
import RewardOption from '../models/RewardOption.js'
import createAuditLog from '../services/auditLogService.js'
// ======================================
// GET AVAILABLE PAYOUT METHODS (USER)
// ======================================

export const getAvailablePayoutMethods = async (req, res) => {
  try {
    const methods = await PayoutMethod.find()
      .sort({ sortOrder: 1 })
      .lean()

    const enabledMethodIds = methods
      .filter(method => method.isEnabled)
      .map(method => method._id)

    const options = await RewardOption.find({
      payoutMethod: { $in: enabledMethodIds },
      isEnabled: true
    })
      .sort({ sortOrder: 1 })
      .lean()

    const result = methods.map(method => ({
      ...method,

      rewardOptions: options.filter(
        option =>
          option.payoutMethod.toString() === method._id.toString()
      )
    }))

    res.status(200).json({
      success: true,
      methods: result
    })

  } catch (error) {
    console.error('Get Payout Methods Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch payout methods.'
    })
  }
}


// ======================================
// GET ALL PAYOUT METHODS (ADMIN)
// ======================================

export const getAdminPayoutMethods = async (req, res) => {
  try {
    const methods = await PayoutMethod.find()
      .sort({ sortOrder: 1 })
      .lean()

    res.status(200).json({
      success: true,
      methods
    })

  } catch (error) {
    console.error('Admin Payout Methods Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch payout methods.'
    })
  }
}


// ======================================
// CREATE PAYOUT METHOD (ADMIN)
// ======================================

export const createPayoutMethod = async (req, res) => {
  try {
    const {
      key,
      name,
      description,
      maintenanceMessage,
      sortOrder
    } = req.body ?? {}

    if (typeof key !== 'string' || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Method key and name are required.'
      })
    }

    if (name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ success: false, message: 'Method name must contain 2 to 80 characters.' })
    }

    if (description !== undefined && (typeof description !== 'string' || description.trim().length > 300)) {
      return res.status(400).json({ success: false, message: 'Description must be a string of up to 300 characters.' })
    }
    if (maintenanceMessage !== undefined && (typeof maintenanceMessage !== 'string' || maintenanceMessage.trim().length > 300)) {
      return res.status(400).json({ success: false, message: 'Maintenance message must be a string of up to 300 characters.' })
    }

    if (sortOrder !== undefined && (!Number.isSafeInteger(Number(sortOrder)) || Number(sortOrder) < 0)) {
      return res.status(400).json({ success: false, message: 'Sort order must be a non-negative whole number.' })
    }

    const allowedKeys = ['upi', 'amazon', 'googlePlay']

    if (!allowedKeys.includes(key)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout method key.'
      })
    }

    // Check duplicate payout method
    const existing = await PayoutMethod.findOne({ key })

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This payout method already exists.'
      })
    }

    // First create payout method
    const method = await PayoutMethod.create({
      key,
      name: name.trim(),
      description: description?.trim(),
      maintenanceMessage: maintenanceMessage?.trim() || '',
      sortOrder: sortOrder === undefined ? 0 : Number(sortOrder)
    })

    // Then create audit log
    await createAuditLog({
      adminId: req.admin._id,
      action: 'PAYOUT_METHOD_CREATED',
      entityType: 'PAYOUT_METHOD',
      entityId: method._id,
      description: `Admin created payout method: ${method.name}.`,
      metadata: {
        key: method.key,
        name: method.name,
        isEnabled: method.isEnabled
      },
      req
    })

    return res.status(201).json({
      success: true,
      message: 'Payout method created successfully.',
      method
    })

  } catch (error) {
    console.error('Create Payout Method Error:', error)

    return res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000
        ? 'This payout method already exists.'
        : 'Unable to create payout method.'
    })
  }
}

// ======================================
// UPDATE PAYOUT METHOD (ADMIN)
// ======================================

export const updatePayoutMethod = async (req, res) => {
  try {
    const { methodId } = req.params
    const body = req.body ?? {}

    if (!mongoose.Types.ObjectId.isValid(methodId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout method ID.'
      })
    }

    const allowedFields = [
      'name',
      'description',
      'maintenanceMessage',
      'isEnabled',
      'sortOrder'
    ]

    const updates = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (updates.name !== undefined && (typeof updates.name !== 'string' || updates.name.trim().length < 2 || updates.name.trim().length > 80)) {
      return res.status(400).json({ success: false, message: 'Method name must contain 2 to 80 characters.' })
    }
    if (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.trim().length > 300)) {
      return res.status(400).json({ success: false, message: 'Description must be a string of up to 300 characters.' })
    }
    if (updates.maintenanceMessage !== undefined && (typeof updates.maintenanceMessage !== 'string' || updates.maintenanceMessage.trim().length > 300)) {
      return res.status(400).json({ success: false, message: 'Maintenance message must be a string of up to 300 characters.' })
    }
    if (updates.isEnabled !== undefined && typeof updates.isEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isEnabled must be true or false.' })
    }
    if (updates.sortOrder !== undefined && (!Number.isSafeInteger(Number(updates.sortOrder)) || Number(updates.sortOrder) < 0)) {
      return res.status(400).json({ success: false, message: 'Sort order must be a non-negative whole number.' })
    }
    if (updates.name !== undefined) updates.name = updates.name.trim()
    if (updates.description !== undefined) updates.description = updates.description.trim()
    if (updates.maintenanceMessage !== undefined) updates.maintenanceMessage = updates.maintenanceMessage.trim()
    if (updates.sortOrder !== undefined) updates.sortOrder = Number(updates.sortOrder)

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.'
      })
    }

    const existingMethod = await PayoutMethod.findById(methodId)
    if (!existingMethod) {
      return res.status(404).json({ success: false, message: 'Payout method not found.' })
    }
    const reason = typeof body.changeReason === 'string' ? body.changeReason.trim() : ''
    if (updates.isEnabled !== undefined && updates.isEnabled !== existingMethod.isEnabled && (reason.length < 5 || reason.length > 250)) {
      return res.status(400).json({ success: false, message: 'A change reason of 5 to 250 characters is required when enabling or disabling a payout method.' })
    }

    const oldConfig = {
      name: existingMethod.name,
      description: existingMethod.description,
      maintenanceMessage: existingMethod.maintenanceMessage,
      isEnabled: existingMethod.isEnabled,
      sortOrder: existingMethod.sortOrder
    }

    const method = await PayoutMethod.findByIdAndUpdate(
      methodId,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    )

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payout method not found.'
      })
    }
const action = updates.isEnabled !== undefined
  ? updates.isEnabled
    ? 'PAYOUT_METHOD_ENABLED'
    : 'PAYOUT_METHOD_DISABLED'
  : 'PAYOUT_METHOD_UPDATED'

await createAuditLog({
  adminId: req.admin._id,
  action,
  entityType: 'PAYOUT_METHOD',
  entityId: method._id,
  description: `Admin updated payout method: ${method.name}.`,
  metadata: {
    updatedFields: Object.keys(updates),
    oldConfig,
    newConfig: {
      name: method.name,
      description: method.description,
      maintenanceMessage: method.maintenanceMessage,
      isEnabled: method.isEnabled,
      sortOrder: method.sortOrder
    },
    reason
  },
  req
})
    res.status(200).json({
      success: true,
      message: 'Payout method updated successfully.',
      method
    })

  } catch (error) {
    console.error('Update Payout Method Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to update payout method.'
    })
  }
}


// ======================================
// GET REWARD OPTIONS (ADMIN)
// ======================================

export const getAdminRewardOptions = async (req, res) => {
  try {
    const options = await RewardOption.find()
      .populate('payoutMethod', 'key name')
      .sort({ sortOrder: 1 })
      .lean()

    res.status(200).json({
      success: true,
      options
    })

  } catch (error) {
    console.error('Get Reward Options Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to fetch reward options.'
    })
  }
}


// ======================================
// CREATE REWARD OPTION (ADMIN)
// ======================================

export const createRewardOption = async (req, res) => {
  try {
    const {
      payoutMethod,
      rewardValue,
      requiredVEs,
      currency,
      description,
      sortOrder
    } = req.body ?? {}

    if (
      !payoutMethod ||
      rewardValue === undefined ||
      requiredVEs === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Payout method, reward value and required VEs are required.'
      })
    }

    if (!mongoose.Types.ObjectId.isValid(payoutMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payout method ID.'
      })
    }

    const value = Number(rewardValue)
    const ves = Number(requiredVEs)

    if (currency !== undefined && (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency.trim()))) {
      return res.status(400).json({ success: false, message: 'Currency must be a valid 3-letter code.' })
    }
    if (description !== undefined && (typeof description !== 'string' || description.trim().length > 250)) {
      return res.status(400).json({ success: false, message: 'Description must be a string of up to 250 characters.' })
    }
    if (sortOrder !== undefined && (!Number.isSafeInteger(Number(sortOrder)) || Number(sortOrder) < 0)) {
      return res.status(400).json({ success: false, message: 'Sort order must be a non-negative whole number.' })
    }

    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      !Number.isSafeInteger(ves) ||
      ves <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Reward value and required VEs must be positive whole numbers.'
      })
    }

    const method = await PayoutMethod.findById(payoutMethod)

    if (!method) {
      return res.status(404).json({
        success: false,
        message: 'Payout method not found.'
      })
    }

    const duplicateOption = await RewardOption.findOne({
      payoutMethod,
      rewardValue: value,
      requiredVEs: ves
    })

    if (duplicateOption) {
      return res.status(409).json({ success: false, message: 'This reward option already exists for the selected payout method.' })
    }

    const option = await RewardOption.create({
      payoutMethod,
      rewardValue: value,
      requiredVEs: ves,
      currency: currency ? currency.trim().toUpperCase() : 'INR',
      description: description?.trim(),
      sortOrder: sortOrder === undefined ? 0 : Number(sortOrder)
    })
await createAuditLog({
  adminId: req.admin._id,
  action: 'REWARD_OPTION_CREATED',
  entityType: 'REWARD_OPTION',
  entityId: option._id,
  description: 'Admin created a new reward option.',
  metadata: {
    payoutMethod: option.payoutMethod,
    rewardValue: option.rewardValue,
    requiredVEs: option.requiredVEs,
    currency: option.currency
  },
  req
})
    res.status(201).json({
      success: true,
      message: 'Reward option created successfully.',
      option
    })

  } catch (error) {
    console.error('Create Reward Option Error:', error)

    res.status(error.code === 11000 ? 409 : 500).json({
      success: false,
      message: error.code === 11000
        ? 'This reward option already exists.'
        : 'Unable to create reward option.'
    })
  }
}


// ======================================
// UPDATE REWARD OPTION (ADMIN)
// ======================================

export const updateRewardOption = async (req, res) => {
  try {
    const { optionId } = req.params
    const body = req.body ?? {}

    if (!mongoose.Types.ObjectId.isValid(optionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reward option ID.'
      })
    }

    const allowedFields = [
      'rewardValue',
      'requiredVEs',
      'currency',
      'description',
      'isEnabled',
      'sortOrder'
    ]

    const updates = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (updates.rewardValue !== undefined && (!Number.isSafeInteger(Number(updates.rewardValue)) || Number(updates.rewardValue) <= 0)) {
      return res.status(400).json({ success: false, message: 'Reward value must be a positive whole number.' })
    }
    if (updates.requiredVEs !== undefined && (!Number.isSafeInteger(Number(updates.requiredVEs)) || Number(updates.requiredVEs) <= 0)) {
      return res.status(400).json({ success: false, message: 'Required VEs must be a positive whole number.' })
    }
    if (updates.currency !== undefined && (typeof updates.currency !== 'string' || !/^[A-Za-z]{3}$/.test(updates.currency.trim()))) {
      return res.status(400).json({ success: false, message: 'Currency must be a valid 3-letter code.' })
    }
    if (updates.description !== undefined && (typeof updates.description !== 'string' || updates.description.trim().length > 250)) {
      return res.status(400).json({ success: false, message: 'Description must be a string of up to 250 characters.' })
    }
    if (updates.isEnabled !== undefined && typeof updates.isEnabled !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isEnabled must be true or false.' })
    }
    if (updates.sortOrder !== undefined && (!Number.isSafeInteger(Number(updates.sortOrder)) || Number(updates.sortOrder) < 0)) {
      return res.status(400).json({ success: false, message: 'Sort order must be a non-negative whole number.' })
    }
    if (updates.rewardValue !== undefined) updates.rewardValue = Number(updates.rewardValue)
    if (updates.requiredVEs !== undefined) updates.requiredVEs = Number(updates.requiredVEs)
    if (updates.currency !== undefined) updates.currency = updates.currency.trim().toUpperCase()
    if (updates.description !== undefined) updates.description = updates.description.trim()
    if (updates.sortOrder !== undefined) updates.sortOrder = Number(updates.sortOrder)

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.'
      })
    }

    const existingOption = await RewardOption.findById(optionId)
    if (!existingOption) {
      return res.status(404).json({ success: false, message: 'Reward option not found.' })
    }

    const nextRewardValue = updates.rewardValue ?? existingOption.rewardValue
    const nextRequiredVEs = updates.requiredVEs ?? existingOption.requiredVEs
    const duplicateOption = await RewardOption.findOne({
      _id: { $ne: optionId },
      payoutMethod: existingOption.payoutMethod,
      rewardValue: nextRewardValue,
      requiredVEs: nextRequiredVEs
    })

    if (duplicateOption) {
      return res.status(409).json({ success: false, message: 'This reward option already exists for the selected payout method.' })
    }

    const reason = typeof body.changeReason === 'string' ? body.changeReason.trim() : ''
    const changesSensitiveConfig =
      (updates.requiredVEs !== undefined && updates.requiredVEs !== existingOption.requiredVEs) ||
      (updates.isEnabled !== undefined && updates.isEnabled !== existingOption.isEnabled)
    if (changesSensitiveConfig && (reason.length < 5 || reason.length > 250)) {
      return res.status(400).json({ success: false, message: 'A change reason of 5 to 250 characters is required when changing VE requirements or reward availability.' })
    }

    const oldConfig = {
      rewardValue: existingOption.rewardValue,
      requiredVEs: existingOption.requiredVEs,
      currency: existingOption.currency,
      description: existingOption.description,
      isEnabled: existingOption.isEnabled,
      sortOrder: existingOption.sortOrder
    }

    const option = await RewardOption.findByIdAndUpdate(
      optionId,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    )

    if (!option) {
      return res.status(404).json({
        success: false,
        message: 'Reward option not found.'
      })
    }

const action = updates.isEnabled !== undefined
  ? updates.isEnabled
    ? 'REWARD_OPTION_ENABLED'
    : 'REWARD_OPTION_DISABLED'
  : 'REWARD_OPTION_UPDATED'

await createAuditLog({
  adminId: req.admin._id,
  action,
  entityType: 'REWARD_OPTION',
  entityId: option._id,
  description: 'Admin updated a reward option.',
  metadata: {
    updatedFields: Object.keys(updates),
    oldConfig,
    newConfig: {
      rewardValue: option.rewardValue,
      requiredVEs: option.requiredVEs,
      currency: option.currency,
      description: option.description,
      isEnabled: option.isEnabled,
      sortOrder: option.sortOrder
    },
    reason
  },
  req
})
    res.status(200).json({
      success: true,
      message: 'Reward option updated successfully.',
      option
    })

  } catch (error) {
    console.error('Update Reward Option Error:', error)

    res.status(500).json({
      success: false,
      message: 'Unable to update reward option.'
    })
  }
}
// ======================================
// GET REWARD OPTIONS (USER)
// ======================================

export const getAvailableRewardOptions = async (req, res) => {
  try {
    const { method } = req.query

    const allowedMethods = ['upi', 'amazon', 'googlePlay']

    if (!method || !allowedMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid payout method.'
      })
    }

    // Find active payout method
    const payoutMethod = await PayoutMethod.findOne({
      key: method,
      isEnabled: true
    })

    if (!payoutMethod) {
      return res.status(404).json({
        success: false,
        message: 'Payout method is unavailable.'
      })
    }

    // Fetch active reward options
    const options = await RewardOption.find({
      payoutMethod: payoutMethod._id,
      isEnabled: true
    })
      .sort({ sortOrder: 1 })
      .lean()

    return res.status(200).json({
      success: true,
      method: payoutMethod,
      options
    })

  } catch (error) {
    console.error('Get Reward Options Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to fetch reward options.'
    })
  }
}
import SystemSetting from '../models/SystemSetting.js'
import createAuditLog from '../services/auditLogService.js'

const defaults = {
  key: 'global', minRequiredVEs: null, maxRequiredVEs: null,
  maxRequestsPerDay: null, processingInstructions: '', userFacingMessage: ''
}

const getOrCreateSettings = async () => {
  return SystemSetting.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: defaults },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  )
}

export const getAdminSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings()
    return res.json({ success: true, settings })
  } catch (error) {
    console.error('Get admin settings error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to load system settings.' })
  }
}

export const getPublicSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings()
    return res.json({
      success: true,
      settings: {
        processingInstructions: settings.processingInstructions,
        userFacingMessage: settings.userFacingMessage
      }
    })
  } catch (error) {
    console.error('Get public settings error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to load payout information.' })
  }
}

export const updateAdminSettings = async (req, res) => {
  try {
    const body = req.body ?? {}
    const allowed = ['minRequiredVEs', 'maxRequiredVEs', 'maxRequestsPerDay', 'processingInstructions', 'userFacingMessage']
    const updates = {}
    for (const key of allowed) {
      if (body[key] === undefined) continue
      if (['minRequiredVEs', 'maxRequiredVEs', 'maxRequestsPerDay'].includes(key)) {
        if (body[key] === null || body[key] === '') updates[key] = null
        else if (!Number.isSafeInteger(Number(body[key])) || Number(body[key]) < 1) {
          return res.status(400).json({ success: false, message: `${key} must be a positive whole number or empty.` })
        } else updates[key] = Number(body[key])
      } else {
        const max = key === 'processingInstructions' ? 1000 : 300
        if (typeof body[key] !== 'string' || body[key].trim().length > max) {
          return res.status(400).json({ success: false, message: `${key} must be text of up to ${max} characters.` })
        }
        updates[key] = body[key].trim()
      }
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ success: false, message: 'Provide at least one setting to update.' })
    }
    const reason = typeof body.changeReason === 'string' ? body.changeReason.trim() : ''
    if (reason.length < 5 || reason.length > 250) {
      return res.status(400).json({ success: false, message: 'A change reason of 5 to 250 characters is required.' })
    }
    const current = await getOrCreateSettings()
    const min = updates.minRequiredVEs !== undefined ? updates.minRequiredVEs : current.minRequiredVEs
    const max = updates.maxRequiredVEs !== undefined ? updates.maxRequiredVEs : current.maxRequiredVEs
    if (min !== null && max !== null && min > max) {
      return res.status(400).json({ success: false, message: 'Minimum required VEs cannot exceed maximum required VEs.' })
    }
    const oldConfig = Object.fromEntries(allowed.map(key => [key, current[key]]))
    Object.assign(current, updates)
    await current.save()
    const newConfig = Object.fromEntries(allowed.map(key => [key, current[key]]))
    await createAuditLog({
      adminId: req.admin._id, action: 'SYSTEM_SETTINGS_UPDATED', entityType: 'SETTING', entityId: current._id,
      description: 'Administrator updated global payout settings.',
      metadata: { oldConfig, newConfig, reason }, req
    })
    return res.json({ success: true, message: 'System settings updated successfully.', settings: current })
  } catch (error) {
    console.error('Update admin settings error:', error.message)
    return res.status(500).json({ success: false, message: 'Unable to update system settings.' })
  }
}

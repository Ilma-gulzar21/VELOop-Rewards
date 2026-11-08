import mongoose from 'mongoose'

const systemSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global' },
  minRequiredVEs: { type: Number, default: null, min: 1 },
  maxRequiredVEs: { type: Number, default: null, min: 1 },
  maxRequestsPerDay: { type: Number, default: null, min: 1 },
  processingInstructions: { type: String, default: '', trim: true, maxlength: 1000 },
  userFacingMessage: { type: String, default: '', trim: true, maxlength: 300 }
}, { timestamps: true })

export default mongoose.model('SystemSetting', systemSettingSchema)

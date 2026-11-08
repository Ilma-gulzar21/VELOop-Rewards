import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: false,
      default: null,
      index: true
    },

    actorEmail: { type: String, trim: true, lowercase: true },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    entityType: {
      type: String,
      required: true,
      enum: [
        'REDEMPTION',
        'WALLET',
        'PAYOUT_METHOD',
        'REWARD_OPTION',
        'USER',
        'SETTING',
        'ADMIN'
      ],
      index: true
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    ipAddress: {
      type: String,
      trim: true
    },

    userAgent: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
)

auditLogSchema.index({ createdAt: -1 })
auditLogSchema.index({ admin: 1, createdAt: -1 })
auditLogSchema.index({ entityType: 1, entityId: 1 })

const AuditLog = mongoose.model('AuditLog', auditLogSchema)

export default AuditLog
import AuditLog from '../models/AuditLog.js'

const createAuditLog = async ({
  adminId = null,
  actorEmail,
  action,
  entityType,
  entityId = null,
  description,
  metadata = {},
  req,
  session
}) => {

  const auditLog = new AuditLog({
    admin: adminId,
    actorEmail,
    action,
    entityType,
    entityId,
    description,
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent')
  })

  if (session) {
    await auditLog.save({ session })
  } else {
    await auditLog.save()
  }

  return auditLog
}

export default createAuditLog
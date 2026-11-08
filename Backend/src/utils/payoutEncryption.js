import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

const getKey = () => {
  const encoded = process.env.PAYOUT_ENCRYPTION_KEY
  if (!encoded) throw new Error('PAYOUT_ENCRYPTION_KEY is required to store or read payout details.')
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== 32) throw new Error('PAYOUT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.')
  return key
}

export const isEncryptedPayoutValue = value => typeof value === 'string' && value.startsWith('enc:v1:')

export const encryptPayoutValue = value => {
  if (!value) return value
  if (isEncryptedPayoutValue(value)) return value
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
}

export const decryptPayoutValue = value => {
  if (!value || !isEncryptedPayoutValue(value)) return value
  const [, version, ivPart, tagPart, dataPart] = value.split(':')
  if (version !== 'v1' || !ivPart || !tagPart || !dataPart) throw new Error('Invalid encrypted payout detail format.')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivPart, 'base64'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8')
}

export const encryptPayoutDetails = details => Object.fromEntries(
  Object.entries(details?.toObject?.() || details || {}).map(([key, value]) => [key, encryptPayoutValue(value)])
)

export const decryptPayoutDetails = details => Object.fromEntries(
  Object.entries(details?.toObject?.() || details || {}).map(([key, value]) => [key, decryptPayoutValue(value)])
)

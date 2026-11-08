import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Admin from '../models/Admin.js'

const updateAdminPassword = async () => {
  try {
    const email = (
      process.env.ADMIN_SEED_EMAIL ||
      process.env.ADMIN_EMAIL ||
      ''
    ).trim().toLowerCase()

    const newPassword =
      process.env.ADMIN_SEED_PASSWORD ||
      process.env.ADMIN_PASSWORD

    if (!email || !newPassword) {
      throw new Error('Admin email or password missing in .env')
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    await connectDB()

    const admin = await Admin.findOne({ email }).select('+password')

    if (!admin) {
      throw new Error('Admin account not found')
    }

    admin.password = newPassword
    admin.tokenVersion += 1

    await admin.save()

    console.log('Admin password updated successfully.')
  } catch (error) {
    console.error('Password Update Error:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

updateAdminPassword()
import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Admin from '../models/Admin.js'

const seedAdmin = async () => {
  try {
    const adminEmail = (
      process.env.ADMIN_SEED_EMAIL ||
      process.env.ADMIN_EMAIL ||
      ''
    ).trim().toLowerCase()

    const adminPassword =
      process.env.ADMIN_SEED_PASSWORD ||
      process.env.ADMIN_PASSWORD

    const adminName =
      process.env.ADMIN_SEED_NAME ||
      process.env.ADMIN_NAME ||
      'VELOop Super Admin'

    if (!adminEmail || !adminPassword) {
      throw new Error(
        'ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required in .env'
      )
    }

    await connectDB()

    const existingAdmin = await Admin.collection.findOne({
      email: adminEmail
    })

    if (existingAdmin) {
      await Admin.collection.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            role: 'super_admin'
          }
        }
      )

      console.log('Existing Admin account verified as Super Admin.')
      return
    }

    await Admin.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'super_admin'
    })

    console.log('Super Admin account created successfully.')
  } catch (error) {
    console.error('Admin Seed Error:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

seedAdmin()
import dotenv from 'dotenv'
dotenv.config()

import mongoose from 'mongoose'
import connectDB from '../config/db.js'
import Admin from '../models/Admin.js'

const migrateAdminRole = async () => {
  try {
    await connectDB()

    console.log('\nStarting Admin Role Migration...\n')

    const result = await Admin.collection.updateMany(
      { role: 'admin' },
      {
        $set: {
          role: 'super_admin'
        }
      }
    )

    console.log(`Matched Admin Accounts: ${result.matchedCount}`)
    console.log(`Updated Admin Accounts: ${result.modifiedCount}`)

    console.log('\nAdmin Role Migration Completed.')
  } catch (error) {
    console.error('Admin Role Migration Error:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

migrateAdminRole()
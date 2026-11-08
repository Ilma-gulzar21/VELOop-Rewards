import User from '../models/User.js'
import Wallet from '../models/Wallet.js'

import jwt from 'jsonwebtoken'

import {
  signupSchema,
  loginSchema
} from '../validators/authValidator.js'


// ===============================
// USER SIGNUP
// ===============================

export const signup = async (req, res) => {
  try {

    // Validate incoming data
    const validation = signupSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0].message
      })
    }

    const { name, email, password } = validation.data

    // Check existing account
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      })
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password
    })

    // Automatically create user's wallet
    try {

      await Wallet.findOneAndUpdate(
        { user: user._id },
        {
          $setOnInsert: {
            user: user._id
          }
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }
      )

    } catch (walletError) {

      // Remove newly created user if wallet creation fails
      await User.deleteOne({ _id: user._id })

      throw walletError
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    )

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      })
    }

    console.error('Signup Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Something went wrong during signup'
    })
  }
}


// ===============================
// USER LOGIN
// ===============================

export const login = async (req, res) => {
  try {

    // Validate login data
    const validation = loginSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.error.issues[0].message
      })
    }

    const { email, password } = validation.data

    // Find user and include password
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive'
      })
    }

    // Compare password
    const isPasswordCorrect = await user.comparePassword(password)

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    )

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {

    console.error('Login Error:', error)

    return res.status(500).json({
      success: false,
      message: 'Something went wrong during login'
    })
  }
}


// ===============================
// GET LOGGED-IN USER PROFILE
// ===============================

export const getMe = async (req, res) => {
  try {

    const user = await User.findById(req.user.userId)

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User account not found or inactive.'
      })
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Unable to fetch user profile.'
    })
  }
}
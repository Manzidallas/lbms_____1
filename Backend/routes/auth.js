const express = require('express')
const User = require('../models/User')

const router = express.Router()

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }
}

function displayNameFromEmail(email) {
  const local = String(email || '').split('@')[0] || 'member'
  const spaced = local.replace(/[._-]+/g, ' ').trim()
  if (!spaced) return 'Member'
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase())
}

router.post('/signup', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email)
    let name = String(req.body?.name || '').trim()
    if (!name && email) name = displayNameFromEmail(email)
    const password = String(req.body?.password || '')

    if (!name) return res.status(400).json({ message: 'Name is required' })
    if (!email) return res.status(400).json({ message: 'Email is required' })
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Invalid email' })
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(409).json({ message: 'Email already in use' })

    const user = await User.createWithPassword({ name, email, password })

    req.session.userId = String(user._id)

    res.status(201).json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const password = String(req.body?.password || '')

    if (!email) return res.status(400).json({ message: 'Email is required' })
    if (!password) return res.status(400).json({ message: 'Password is required' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })

    const ok = user.verifyPassword(password)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })

    req.session.userId = String(user._id)

    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

router.post('/logout', async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) return next(err)
      res.clearCookie('lbms.sid')
      res.json({ ok: true })
    })
  } catch (err) {
    next(err)
  }
})

router.get('/me', async (req, res, next) => {
  try {
    const userId = req.session.userId
    if (!userId) return res.status(401).json({ message: 'Not authenticated' })

    const user = await User.findById(userId)
    if (!user) return res.status(401).json({ message: 'Not authenticated' })

    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

module.exports = router

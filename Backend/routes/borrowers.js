const express = require('express')
const mongoose = require('mongoose')
const Borrower = require('../models/Borrower')
const BorrowerHistory = require('../models/BorrowerHistory')
const Loan = require('../models/Loan')
const Book = require('../models/Book')

const router = express.Router()

function parsePositiveInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  if (i <= 0) return fallback
  return i
}

function normalizeString(v) {
  const s = String(v ?? '').trim()
  return s.length ? s : null
}

function normalizeEmail(v) {
  const s = String(v ?? '').trim().toLowerCase()
  return s.length ? s : null
}

async function resolveBookFromCopyId(copy_id) {
  const copy = normalizeString(copy_id)
  if (!copy) return null
  if (mongoose.Types.ObjectId.isValid(copy)) {
    return Book.findById(copy)
  }
  return Book.findOne({ isbn: copy })
}

function publicBorrower(b) {
  return b.toJSON()
}

function publicHistory(item) {
  return item.toJSON()
}

async function logHistory({ borrowerId, action, message, meta }) {
  try {
    await BorrowerHistory.create({
      borrower_id: borrowerId ?? null,
      action,
      message,
      meta: meta ?? null,
    })
  } catch {
  }
}

async function generateMembershipId() {
  for (let i = 0; i < 5; i++) {
    const num = Math.floor(Math.random() * 100000)
    const membership_id = `LIB-${String(num).padStart(5, '0')}`
    const exists = await Borrower.exists({ membership_id })
    if (!exists) return membership_id
  }

  const count = await Borrower.countDocuments({})
  return `LIB-${String(count + 1).padStart(5, '0')}`
}

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query?.q ?? '').trim()
    const status = normalizeString(req.query?.status)

    const page = parsePositiveInt(req.query?.page, 1)
    const limit = parsePositiveInt(req.query?.limit, 20)
    const skip = (page - 1) * limit

    const filter = {}

    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      filter.status = status
    }

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp(safe, 'i')
      filter.$or = [
        { first_name: rx },
        { last_name: rx },
        { email: rx },
        { phone: rx },
        { membership_id: rx },
      ]
    }

    const [items, total] = await Promise.all([
      Borrower.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Borrower.countDocuments(filter),
    ])

    res.json({
      items: items.map(publicBorrower),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/history', async (req, res, next) => {
  try {
    const borrower_id = normalizeString(req.query?.borrower_id)
    const action = normalizeString(req.query?.action)
    const limit = parsePositiveInt(req.query?.limit, 20)
    const page = parsePositiveInt(req.query?.page, 1)

    const filter = {}
    if (borrower_id) filter.borrower_id = borrower_id
    if (action) filter.action = action

    const total = await BorrowerHistory.countDocuments(filter)
    const items = await BorrowerHistory.find(filter)
      .populate('borrower_id')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    res.json({
      items: items.map(publicHistory),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/loans', async (req, res, next) => {
  try {
    const borrowerId = req.params.id
    if (!borrowerId) return res.status(400).json({ message: 'Borrower ID required' })

    const borrower = await Borrower.findById(borrowerId)
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' })

    const loans = await Loan.find({ borrower_id: borrowerId, return_date: null }).sort({ due_date: 1 })

    const items = await Promise.all(
      loans.map(async (loan) => {
        const book = await resolveBookFromCopyId(loan.copy_id)
        return {
          ...loan.toJSON(),
          book: book ? book.toJSON() : null,
        }
      })
    )

    res.json({ items })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/loans/all', async (req, res, next) => {
  try {
    const borrowerId = req.params.id
    if (!borrowerId) return res.status(400).json({ message: 'Borrower ID required' })

    const borrower = await Borrower.findById(borrowerId)
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' })

    const loans = await Loan.find({ borrower_id: borrowerId }).sort({ createdAt: -1 })

    const items = await Promise.all(
      loans.map(async (loan) => {
        const book = await resolveBookFromCopyId(loan.copy_id)
        return {
          ...loan.toJSON(),
          book: book ? book.toJSON() : null,
        }
      })
    )

    res.json({ items })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const borrower = await Borrower.findById(id)
    if (!borrower) return res.status(404).json({ message: 'Borrower not found' })
    res.json({ borrower: publicBorrower(borrower) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const first_name = normalizeString(req.body?.first_name)
    const last_name = normalizeString(req.body?.last_name)
    const email = normalizeEmail(req.body?.email)
    const phone = normalizeString(req.body?.phone)
    const gender = normalizeString(req.body?.gender)
    const address = normalizeString(req.body?.address)

    if (!first_name) return res.status(400).json({ message: 'first_name is required' })
    if (!last_name) return res.status(400).json({ message: 'last_name is required' })
    if (!email) return res.status(400).json({ message: 'email is required' })
    if (!phone) return res.status(400).json({ message: 'phone is required' })

    const membership_id = await generateMembershipId()

    const created = await Borrower.create({
      first_name,
      last_name,
      email,
      phone,
      membership_id,
      ...(gender ? { gender } : {}),
      ...(address ? { address } : {}),
      status: 'active',
    })

    await logHistory({
      borrowerId: created._id,
      action: 'create',
      message: 'Borrower created',
      meta: { membership_id: created.membership_id },
    })

    res.status(201).json({ borrower: publicBorrower(created) })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Borrower with this email or membership id already exists' })
    }
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()

    const existing = await Borrower.findById(id)
    if (!existing) return res.status(404).json({ message: 'Borrower not found' })

    const update = {}

    if (req.body?.first_name !== undefined) update.first_name = normalizeString(req.body?.first_name)
    if (req.body?.last_name !== undefined) update.last_name = normalizeString(req.body?.last_name)
    if (req.body?.email !== undefined) update.email = normalizeEmail(req.body?.email)
    if (req.body?.phone !== undefined) update.phone = normalizeString(req.body?.phone)
    if (req.body?.gender !== undefined) update.gender = normalizeString(req.body?.gender)
    if (req.body?.address !== undefined) update.address = normalizeString(req.body?.address)
    if (req.body?.status !== undefined) update.status = normalizeString(req.body?.status)

    const updated = await Borrower.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ message: 'Borrower not found' })

    await logHistory({
      borrowerId: updated._id,
      action: 'update',
      message: 'Borrower updated',
      meta: { before: existing.toJSON(), after: updated.toJSON() },
    })

    res.json({ borrower: publicBorrower(updated) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    if (err && err.code === 11000) return res.status(409).json({ message: 'Borrower with this email already exists' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const deleted = await Borrower.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: 'Borrower not found' })

    await logHistory({
      borrowerId: deleted._id,
      action: 'delete',
      message: 'Borrower deleted',
      meta: { borrower: deleted.toJSON() },
    })
    res.json({ ok: true })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

module.exports = router

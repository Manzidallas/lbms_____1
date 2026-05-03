const express = require('express')
const Loan = require('../models/Loan')
const mongoose = require('mongoose')
const Book = require('../models/Book')
const Borrower = require('../models/Borrower')
const LoanHistory = require('../models/LoanHistory')

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

function toDateOrNull(v) {
  if (v === null) return null
  if (v === undefined) return undefined
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return undefined
  return d
}

function publicLoan(loan) {
  return loan.toJSON()
}

function normalizeIsbn(v) {
  const raw = String(v ?? '').trim()
  if (!raw) return null
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase()
}

function publicBook(book) {
  return book ? book.toJSON() : null
}

async function attachBooksToHistory(items) {
  const list = Array.isArray(items) ? items : [items]
  const ids = []
  const isbns = []

  for (const h of list) {
    const copy = normalizeString(h?.copy_id)
    if (!copy) continue
    if (mongoose.Types.ObjectId.isValid(copy)) ids.push(copy)
    else {
      const isbn = normalizeIsbn(copy)
      if (isbn) isbns.push(isbn)
    }
  }

  const books = await Book.find({
    $or: [
      ...(ids.length ? [{ _id: { $in: ids } }] : []),
      ...(isbns.length ? [{ isbn: { $in: isbns } }] : []),
    ],
  })

  const byId = new Map(books.map((b) => [String(b._id), b]))
  const byIsbn = new Map(books.map((b) => [String(b.isbn), b]))

  return list.map((h) => {
    const json = h.toJSON()
    const copy = normalizeString(h?.copy_id)
    let book = null
    if (copy) {
      if (mongoose.Types.ObjectId.isValid(copy)) book = byId.get(copy) ?? null
      else {
        const isbn = normalizeIsbn(copy)
        if (isbn) book = byIsbn.get(isbn) ?? null
      }
    }
    return { ...json, book: publicBook(book) }
  })
}

async function resolveBookFromCopyId(copy_id) {
  const copy = normalizeString(copy_id)
  if (!copy) return null

  if (mongoose.Types.ObjectId.isValid(copy)) {
    return Book.findById(copy)
  }

  const isbn = normalizeIsbn(copy)
  if (!isbn) return null
  return Book.findOne({ isbn })
}

router.get('/history', async (req, res, next) => {
  try {
    const borrower_id = normalizeString(req.query?.borrower_id)
    const action = normalizeString(req.query?.action)

    const page = parsePositiveInt(req.query?.page, 1)
    const limit = parsePositiveInt(req.query?.limit, 50)
    const skip = (page - 1) * limit

    const filter = {}
    if (borrower_id) filter.borrower_id = borrower_id
    if (action && ['borrow', 'return'].includes(action)) filter.action = action

    const [items, total] = await Promise.all([
      LoanHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('loan_id')
        .populate('borrower_id'),
      LoanHistory.countDocuments(filter),
    ])

    const merged = await attachBooksToHistory(items)

    res.json({
      items: merged,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
})

async function decrementCopiesForCopyId(copy_id) {
  const copy = normalizeString(copy_id)
  if (!copy) return null

  if (mongoose.Types.ObjectId.isValid(copy)) {
    return Book.findOneAndUpdate(
      { _id: copy, copies: { $gt: 0 } },
      { $inc: { copies: -1 } },
      { new: true }
    )
  }

  const isbn = normalizeIsbn(copy)
  if (!isbn) return null
  return Book.findOneAndUpdate(
    { isbn, copies: { $gt: 0 } },
    { $inc: { copies: -1 } },
    { new: true }
  )
}

async function incrementCopiesForCopyId(copy_id) {
  const copy = normalizeString(copy_id)
  if (!copy) return null

  if (mongoose.Types.ObjectId.isValid(copy)) {
    return Book.findOneAndUpdate(
      { _id: copy },
      { $inc: { copies: 1 } },
      { new: true }
    )
  }

  const isbn = normalizeIsbn(copy)
  if (!isbn) return null
  return Book.findOneAndUpdate(
    { isbn },
    { $inc: { copies: 1 } },
    { new: true }
  )
}

async function logLoanHistory({ loanId, borrowerId, copyId, action, message, meta }) {
  try {
    await LoanHistory.create({
      loan_id: loanId ?? null,
      borrower_id: borrowerId ?? null,
      copy_id: copyId ?? null,
      action,
      message,
      meta: meta ?? null,
    })
  } catch {
  }
}

async function attachBooks(loans) {
  const list = Array.isArray(loans) ? loans : [loans]
  const ids = []
  const isbns = []

  for (const l of list) {
    const copy = normalizeString(l?.copy_id)
    if (!copy) continue
    if (mongoose.Types.ObjectId.isValid(copy)) {
      ids.push(copy)
    } else {
      const isbn = normalizeIsbn(copy)
      if (isbn) isbns.push(isbn)
    }
  }

  const books = await Book.find({
    $or: [
      ...(ids.length ? [{ _id: { $in: ids } }] : []),
      ...(isbns.length ? [{ isbn: { $in: isbns } }] : []),
    ],
  })

  const byId = new Map(books.map((b) => [String(b._id), b]))
  const byIsbn = new Map(books.map((b) => [String(b.isbn), b]))

  return list.map((l) => {
    const json = publicLoan(l)
    const copy = normalizeString(l?.copy_id)
    let book = null
    if (copy) {
      if (mongoose.Types.ObjectId.isValid(copy)) {
        book = byId.get(copy) ?? null
      } else {
        const isbn = normalizeIsbn(copy)
        if (isbn) book = byIsbn.get(isbn) ?? null
      }
    }
    return { ...json, book: publicBook(book) }
  })
}

router.get('/', async (req, res, next) => {
  try {
    const borrower_id = normalizeString(req.query?.borrower_id)
    const copy_id = normalizeString(req.query?.copy_id)
    const status = normalizeString(req.query?.status)

    const page = parsePositiveInt(req.query?.page, 1)
    const limit = parsePositiveInt(req.query?.limit, 20)
    const skip = (page - 1) * limit

    const filter = {}

    if (borrower_id) filter.borrower_id = borrower_id
    if (copy_id) filter.copy_id = copy_id

    if (status === 'active') filter.return_date = null
    if (status === 'returned') filter.return_date = { $ne: null }
    if (status === 'overdue') {
      filter.return_date = null
      filter.due_date = { $lt: new Date() }
    }

    const [items, total] = await Promise.all([
      Loan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('borrower_id'),
      Loan.countDocuments(filter),
    ])

    const merged = await attachBooks(items)

    res.json({
      items: merged,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const loan = await Loan.findById(id).populate('borrower_id')
    if (!loan) return res.status(404).json({ message: 'Loan not found' })
    const [merged] = await attachBooks(loan)
    res.json({ loan: merged })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const copy_id = normalizeString(req.body?.copy_id)
    const borrower_id = normalizeString(req.body?.borrower_id)
    const borrow_date = toDateOrNull(req.body?.borrow_date)
    const due_date = toDateOrNull(req.body?.due_date)
    const return_date = toDateOrNull(req.body?.return_date)

    if (!copy_id) return res.status(400).json({ message: 'copy_id is required' })
    if (!borrower_id) return res.status(400).json({ message: 'borrower_id is required' })
    if (!borrow_date) return res.status(400).json({ message: 'borrow_date is required' })
    if (!due_date) return res.status(400).json({ message: 'due_date is required' })

    const borrowerExists = await Borrower.exists({ _id: borrower_id })
    if (!borrowerExists) return res.status(400).json({ message: 'Borrower not found' })

    const book = await resolveBookFromCopyId(copy_id)
    if (!book) return res.status(400).json({ message: 'Book not found' })

    const decremented = await decrementCopiesForCopyId(copy_id)
    if (!decremented) return res.status(409).json({ message: 'No available copies for this book' })

    const created = await Loan.create({
      copy_id,
      borrower_id,
      borrow_date,
      due_date,
      return_date: return_date === undefined ? null : return_date,
    })

    await logLoanHistory({
      loanId: created._id,
      borrowerId: borrower_id,
      copyId: copy_id,
      action: 'borrow',
      message: 'Book borrowed',
      meta: { borrow_date, due_date },
    })

    const populated = await Loan.findById(created._id).populate('borrower_id')
    const [merged] = await attachBooks(populated ?? created)
    res.status(201).json({ loan: merged })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()

    const existing = await Loan.findById(id)
    if (!existing) return res.status(404).json({ message: 'Loan not found' })

    const update = {}

    if (req.body?.copy_id !== undefined) update.copy_id = normalizeString(req.body?.copy_id)
    if (req.body?.borrower_id !== undefined) update.borrower_id = normalizeString(req.body?.borrower_id)
    if (req.body?.borrow_date !== undefined) update.borrow_date = toDateOrNull(req.body?.borrow_date)
    if (req.body?.due_date !== undefined) update.due_date = toDateOrNull(req.body?.due_date)
    if (req.body?.return_date !== undefined) update.return_date = toDateOrNull(req.body?.return_date)

    const updated = await Loan.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate('borrower_id')
    if (!updated) return res.status(404).json({ message: 'Loan not found' })

    const wasReturned = existing.return_date != null
    const nowReturned = updated.return_date != null
    if (!wasReturned && nowReturned) {
      await incrementCopiesForCopyId(updated.copy_id)
      await logLoanHistory({
        loanId: updated._id,
        borrowerId: updated.borrower_id,
        copyId: updated.copy_id,
        action: 'return',
        message: 'Book returned',
        meta: { return_date: updated.return_date },
      })
    }

    const [merged] = await attachBooks(updated)
    res.json({ loan: merged })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const deleted = await Loan.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: 'Loan not found' })
    res.json({ ok: true })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

module.exports = router

const express = require('express')
const mongoose = require('mongoose')

const Collection = require('../models/Collection')
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

function publicCollection(c) {
  return c.toJSON()
}

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query?.q ?? '').trim()
    const includeBooks = String(req.query?.includeBooks ?? '').trim().toLowerCase() === 'true'

    const page = parsePositiveInt(req.query?.page, 1)
    const limit = parsePositiveInt(req.query?.limit, 20)
    const skip = (page - 1) * limit

    const filter = {}

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp(safe, 'i')
      filter.$or = [{ name: rx }, { description: rx }]
    }

    const query = Collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    if (includeBooks) query.populate('books')

    const [items, total] = await Promise.all([
      query,
      Collection.countDocuments(filter),
    ])

    res.json({
      items: items.map(publicCollection),
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
    const includeBooks = String(req.query?.includeBooks ?? '').trim().toLowerCase() === 'true'

    const query = Collection.findById(id)
    if (includeBooks) query.populate('books')

    const collection = await query
    if (!collection) return res.status(404).json({ message: 'Collection not found' })

    res.json({ collection: publicCollection(collection) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const name = normalizeString(req.body?.name)
    const description = normalizeString(req.body?.description)

    if (!name) return res.status(400).json({ message: 'name is required' })

    let books = []
    if (req.body?.books !== undefined) {
      if (!Array.isArray(req.body.books)) {
        return res.status(400).json({ message: 'books must be an array of book ids' })
      }

      const ids = req.body.books.map((x) => String(x).trim()).filter(Boolean)
      const validIds = ids.filter((x) => mongoose.Types.ObjectId.isValid(x))

      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: 'books must be an array of valid book ids' })
      }

      const existing = await Book.find({ _id: { $in: validIds } }).select({ _id: 1 })
      const existingSet = new Set(existing.map((b) => String(b._id)))
      const missing = validIds.filter((x) => !existingSet.has(x))
      if (missing.length) {
        return res.status(400).json({ message: 'Some books do not exist', missing })
      }

      books = validIds
    }

    const created = await Collection.create({
      name,
      description,
      books,
    })

    const populated = await Collection.findById(created._id).populate('books')

    res.status(201).json({ collection: publicCollection(populated ?? created) })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Collection with this name already exists' })
    }
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()

    const update = {}

    if (req.body?.name !== undefined) update.name = normalizeString(req.body?.name)
    if (req.body?.description !== undefined) update.description = normalizeString(req.body?.description)

    if (req.body?.books !== undefined) {
      if (!Array.isArray(req.body.books)) {
        return res.status(400).json({ message: 'books must be an array of book ids' })
      }

      const ids = req.body.books.map((x) => String(x).trim()).filter(Boolean)
      const validIds = ids.filter((x) => mongoose.Types.ObjectId.isValid(x))

      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: 'books must be an array of valid book ids' })
      }

      const existing = await Book.find({ _id: { $in: validIds } }).select({ _id: 1 })
      const existingSet = new Set(existing.map((b) => String(b._id)))
      const missing = validIds.filter((x) => !existingSet.has(x))
      if (missing.length) {
        return res.status(400).json({ message: 'Some books do not exist', missing })
      }

      update.books = validIds
    }

    const updated = await Collection.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ message: 'Collection not found' })

    const populated = await Collection.findById(updated._id).populate('books')

    res.json({ collection: publicCollection(populated ?? updated) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    if (err && err.code === 11000) return res.status(409).json({ message: 'Collection with this name already exists' })
    next(err)
  }
})

router.post('/:id/books', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const bookId = normalizeString(req.body?.book_id)

    if (!bookId) return res.status(400).json({ message: 'book_id is required' })
    if (!mongoose.Types.ObjectId.isValid(bookId)) return res.status(400).json({ message: 'Invalid book_id' })

    const bookExists = await Book.exists({ _id: bookId })
    if (!bookExists) return res.status(400).json({ message: 'Book not found' })

    const updated = await Collection.findByIdAndUpdate(
      id,
      { $addToSet: { books: bookId } },
      { new: true, runValidators: true }
    )

    if (!updated) return res.status(404).json({ message: 'Collection not found' })

    const populated = await Collection.findById(updated._id).populate('books')
    res.json({ collection: publicCollection(populated ?? updated) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

router.delete('/:id/books/:bookId', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const bookId = String(req.params?.bookId || '').trim()

    if (!mongoose.Types.ObjectId.isValid(bookId)) return res.status(400).json({ message: 'Invalid bookId' })

    const updated = await Collection.findByIdAndUpdate(
      id,
      { $pull: { books: bookId } },
      { new: true, runValidators: true }
    )

    if (!updated) return res.status(404).json({ message: 'Collection not found' })

    const populated = await Collection.findById(updated._id).populate('books')
    res.json({ collection: publicCollection(populated ?? updated) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const deleted = await Collection.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: 'Collection not found' })
    res.json({ ok: true })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

module.exports = router

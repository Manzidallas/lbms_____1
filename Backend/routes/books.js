const express = require('express')
const Book = require('../models/Book')
const BookHistory = require('../models/BookHistory')

const router = express.Router()

function parsePositiveInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  if (i <= 0) return fallback
  return i
}

function parseNonNegativeInt(value, fallback) {
  if (value === undefined) return fallback
  if (value === null) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  if (i < 0) return fallback
  return i
}

function normalizeString(v) {
  const s = String(v ?? '').trim()
  return s.length ? s : null
}

function normalizeIsbn(v) {
  const raw = String(v ?? '').trim()
  if (!raw) return null
  // keep digits and X, and allow dashes/spaces in input
  return raw.replace(/[^0-9Xx]/g, '').toUpperCase()
}

function normalizeStringArray(v) {
  if (!v) return []
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  return [String(v).trim()].filter(Boolean)
}

function publicBook(book) {
  return book.toJSON()
}

function publicHistory(item) {
  return item.toJSON()
}

async function logHistory({ bookId, action, message, meta }) {
  try {
    await BookHistory.create({
      book_id: bookId ?? null,
      action,
      message,
      meta: meta ?? null,
    })
  } catch {
  }
}

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query?.q ?? '').trim()
    const isbn = normalizeIsbn(req.query?.isbn)
    const source = normalizeString(req.query?.source)
    const genre = normalizeString(req.query?.genre)
    const author = normalizeString(req.query?.author)
    const subject = normalizeString(req.query?.subject)
    const publisher = normalizeString(req.query?.publisher)
    const language = normalizeString(req.query?.language)

    const page = parsePositiveInt(req.query?.page, 1)
    const limit = parsePositiveInt(req.query?.limit, 20)
    const skip = (page - 1) * limit

    const filter = {}

    if (isbn) filter.isbn = isbn
    if (source && ['manual', 'openlibrary'].includes(source)) filter.source = source
    if (genre) filter.genre = new RegExp(genre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (language) filter.language = new RegExp(language.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (publisher) filter.publisher = new RegExp(publisher.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (author) filter.authors = new RegExp(author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (subject) filter.subjects = new RegExp(subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const rx = new RegExp(safe, 'i')
      filter.$or = [
        { title: rx },
        { subtitle: rx },
        { authors: rx },
        { isbn: rx },
        { publisher: rx },
        { subjects: rx },
        { description: rx },
        { openlibrary_id: rx },
      ]
    }

    const [items, total] = await Promise.all([
      Book.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Book.countDocuments(filter),
    ])

    res.json({
      items: items.map(publicBook),
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
    const book_id = String(req.query?.book_id ?? '').trim()
    const action = normalizeString(req.query?.action)

    const page = parsePositiveInt(req.query?.page, 1)
    const limit = parsePositiveInt(req.query?.limit, 50)
    const skip = (page - 1) * limit

    const filter = {}
    if (book_id) filter.book_id = book_id
    if (action && ['create', 'update', 'delete'].includes(action)) filter.action = action

    const [items, total] = await Promise.all([
      BookHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('book_id'),
      BookHistory.countDocuments(filter),
    ])

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

router.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const book = await Book.findById(id)
    if (!book) return res.status(404).json({ message: 'Book not found' })
    res.json({ book: publicBook(book) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

router.post('/manual', async (req, res, next) => {
  try {
    const isbn = normalizeIsbn(req.body?.isbn)
    const title = normalizeString(req.body?.title)

    if (!isbn) return res.status(400).json({ message: 'isbn is required' })
    if (!title) return res.status(400).json({ message: 'title is required' })

    const payload = {
      isbn,
      title,
      subtitle: normalizeString(req.body?.subtitle),
      authors: normalizeStringArray(req.body?.authors),
      genre: normalizeString(req.body?.genre),
      publisher: normalizeString(req.body?.publisher),
      publish_year: req.body?.publish_year != null ? Number(req.body.publish_year) : null,
      pages: req.body?.pages != null ? Number(req.body.pages) : null,
      copies: parseNonNegativeInt(req.body?.copies, 1),
      language: normalizeString(req.body?.language),
      description: normalizeString(req.body?.description),
      subjects: normalizeStringArray(req.body?.subjects),
      cover_url: normalizeString(req.body?.cover_url),
      openlibrary_id: normalizeString(req.body?.openlibrary_id),
      source: 'manual',
    }

    const created = await Book.create(payload)
    await logHistory({
      bookId: created._id,
      action: 'create',
      message: `New Book added: ${created.title}`,
      meta: { source: 'manual' },
    })
    res.status(201).json({ book: publicBook(created) })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ message: 'Book with this ISBN already exists' })
    }
    next(err)
  }
})

router.post('/openlibrary', async (req, res, next) => {
  try {
    const isbn = normalizeIsbn(req.body?.isbn)
    const title = normalizeString(req.body?.title)

    if (!isbn) return res.status(400).json({ message: 'isbn is required' })
    if (!title) return res.status(400).json({ message: 'title is required' })

    const payload = {
      isbn,
      title,
      subtitle: normalizeString(req.body?.subtitle),
      authors: normalizeStringArray(req.body?.authors),
      genre: normalizeString(req.body?.genre),
      publisher: normalizeString(req.body?.publisher),
      publish_year: req.body?.publish_year != null ? Number(req.body.publish_year) : null,
      pages: req.body?.pages != null ? Number(req.body.pages) : null,
      copies: parseNonNegativeInt(req.body?.copies, 1),
      language: normalizeString(req.body?.language),
      description: normalizeString(req.body?.description),
      subjects: normalizeStringArray(req.body?.subjects),
      cover_url: normalizeString(req.body?.cover_url),
      openlibrary_id: normalizeString(req.body?.openlibrary_id),
      source: 'openlibrary',
    }

    // Upsert so repeated fetches update the same book record.
    const book = await Book.findOneAndUpdate(
      { isbn },
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    )

    await logHistory({
      bookId: book._id,
      action: 'create',
      message: `New Book added: ${book.title}`,
      meta: { source: 'openlibrary', upsert: true },
    })

    res.status(201).json({ book: publicBook(book) })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()

    const update = {}

    if (req.body?.isbn !== undefined) update.isbn = normalizeIsbn(req.body?.isbn)
    if (req.body?.title !== undefined) update.title = normalizeString(req.body?.title)
    if (req.body?.subtitle !== undefined) update.subtitle = normalizeString(req.body?.subtitle)
    if (req.body?.authors !== undefined) update.authors = normalizeStringArray(req.body?.authors)
    if (req.body?.genre !== undefined) update.genre = normalizeString(req.body?.genre)
    if (req.body?.publisher !== undefined) update.publisher = normalizeString(req.body?.publisher)
    if (req.body?.publish_year !== undefined) update.publish_year = req.body?.publish_year != null ? Number(req.body.publish_year) : null
    if (req.body?.pages !== undefined) update.pages = req.body?.pages != null ? Number(req.body.pages) : null
    if (req.body?.copies !== undefined) update.copies = parseNonNegativeInt(req.body?.copies, 1)
    if (req.body?.language !== undefined) update.language = normalizeString(req.body?.language)
    if (req.body?.description !== undefined) update.description = normalizeString(req.body?.description)
    if (req.body?.subjects !== undefined) update.subjects = normalizeStringArray(req.body?.subjects)
    if (req.body?.cover_url !== undefined) update.cover_url = normalizeString(req.body?.cover_url)
    if (req.body?.openlibrary_id !== undefined) update.openlibrary_id = normalizeString(req.body?.openlibrary_id)
    if (req.body?.source !== undefined) update.source = normalizeString(req.body?.source)

    const updated = await Book.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true })
    if (!updated) return res.status(404).json({ message: 'Book not found' })

    await logHistory({
      bookId: updated._id,
      action: 'update',
      message: `Book updated: ${updated.title}`,
      meta: { fields: Object.keys(update) },
    })

    res.json({ book: publicBook(updated) })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    if (err && err.code === 11000) return res.status(409).json({ message: 'Book with this ISBN already exists' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params?.id || '').trim()
    const deleted = await Book.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: 'Book not found' })

    await logHistory({
      bookId: deleted._id,
      action: 'delete',
      message: `Book deleted: ${deleted.title}`,
      meta: { isbn: deleted.isbn },
    })
    res.json({ ok: true })
  } catch (err) {
    if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid id' })
    next(err)
  }
})

module.exports = router

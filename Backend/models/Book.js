const mongoose = require('mongoose')

const bookSchema = new mongoose.Schema(
  {
    isbn: { type: String, required: true, trim: true, unique: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: null, trim: true },
    authors: { type: [String], default: [] },
    genre: { type: String, default: null, trim: true },
    publisher: { type: String, default: null, trim: true },
    publish_year: { type: Number, default: null },
    pages: { type: Number, default: null },
    copies: { type: Number, default: 1, min: 0 },
    language: { type: String, default: null, trim: true },
    description: { type: String, default: null },
    subjects: { type: [String], default: [] },
    cover_url: { type: String, default: null, trim: true },
    openlibrary_id: { type: String, default: null, trim: true },
    source: { type: String, enum: ['manual', 'openlibrary'], required: true },
  },
  { timestamps: true }
)

bookSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    // keep a simple id field in API responses
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('Book', bookSchema)

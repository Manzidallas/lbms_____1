const mongoose = require('mongoose')

const bookHistorySchema = new mongoose.Schema(
  {
    book_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', default: null },
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

bookHistorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('BookHistory', bookHistorySchema)

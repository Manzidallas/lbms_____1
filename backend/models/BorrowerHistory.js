const mongoose = require('mongoose')

const borrowerHistorySchema = new mongoose.Schema(
  {
    borrower_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Borrower', default: null },
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

borrowerHistorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('BorrowerHistory', borrowerHistorySchema)

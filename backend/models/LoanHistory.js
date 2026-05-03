const mongoose = require('mongoose')

const loanHistorySchema = new mongoose.Schema(
  {
    loan_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', default: null },
    borrower_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Borrower', default: null },
    copy_id: { type: String, default: null, trim: true },
    action: {
      type: String,
      enum: ['borrow', 'return'],
      required: true,
    },
    message: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

loanHistorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('LoanHistory', loanHistorySchema)

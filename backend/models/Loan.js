const mongoose = require('mongoose')

const loanSchema = new mongoose.Schema(
  {
    copy_id: { type: String, required: true, trim: true },
    borrower_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Borrower', required: true },
    borrow_date: { type: Date, required: true },
    due_date: { type: Date, required: true },
    return_date: { type: Date, default: null },
  },
  { timestamps: true }
)

loanSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('Loan', loanSchema)

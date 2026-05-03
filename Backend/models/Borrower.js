const mongoose = require('mongoose')

const borrowerSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    membership_id: { type: String, required: true, trim: true, unique: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: false },
    address: { type: String, default: null, trim: true },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  },
  { timestamps: true }
)

borrowerSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('Borrower', borrowerSchema)

const mongoose = require('mongoose')

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: null, trim: true },
    books: { type: [mongoose.Schema.Types.ObjectId], ref: 'Book', default: [] },
  },
  { timestamps: true }
)

collectionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_, ret) => {
    ret.id = String(ret._id)
    delete ret._id
    return ret
  },
})

module.exports = mongoose.model('Collection', collectionSchema)

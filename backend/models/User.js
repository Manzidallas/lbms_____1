const mongoose = require('mongoose')
const crypto = require('crypto')

function hashPassword(password, salt) {
  // pbkdf2Sync(password, salt, iterations, keylen, digest)
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512')
  return hash.toString('hex')
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, default: 'user' },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
  },
  { timestamps: true }
)

userSchema.methods.verifyPassword = function verifyPassword(password) {
  const computed = hashPassword(password, this.passwordSalt)
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(this.passwordHash, 'hex'))
}

userSchema.statics.createWithPassword = async function createWithPassword({ name, email, password, role }) {
  const salt = crypto.randomBytes(16).toString('hex')
  const passwordHash = hashPassword(password, salt)

  const user = await this.create({
    name,
    email,
    role: role || 'user',
    passwordHash,
    passwordSalt: salt,
  })

  return user
}

module.exports = mongoose.model('User', userSchema)

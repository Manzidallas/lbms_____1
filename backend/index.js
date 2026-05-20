const dns = require('dns')
const express = require('express')
const mongoose = require('mongoose')
require('dotenv').config()

// Node on Windows often gets querySrv ECONNREFUSED for mongodb+srv while nslookup works.
// Override via NODE_DNS_SERVERS=8.8.8.8,1.1.1.1 or set SKIP_WIN_MONGO_DNS_FIX=1 to disable.
const skipDnsFix = process.env.SKIP_WIN_MONGO_DNS_FIX === '1'
const customServers = process.env.NODE_DNS_SERVERS
if (customServers) {
  dns.setServers(
    customServers.split(',').map((s) => s.trim()).filter(Boolean)
  )
} else if (
  process.platform === 'win32' &&
  process.env.NODE_ENV !== 'production' &&
  !skipDnsFix
) {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
}
const session = require('express-session')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const booksRoutes = require('./routes/books')
const borrowersRoutes = require('./routes/borrowers')
const loansRoutes = require('./routes/loans')
const collectionsRoutes = require('./routes/collections')
const statsRoutes = require('./routes/stats')

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI
const SESSION_SECRET = process.env.SESSION_SECRET
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
const allowedOrigins = [
  'http://localhost:5173',
  'https://librarymgtsystem.vercel.app',
  FRONTEND_ORIGIN
]

const app = express()

app.use(
  cors({
    origin: function(origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    credentials: true,
  })
)

app.use(express.json())

app.use(
  session({
    name: 'lbms.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
)

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/api/books', booksRoutes)
app.use('/api/borrowers', borrowersRoutes)
app.use('/api/loans', loansRoutes)
app.use('/api/collections', collectionsRoutes)
app.use('/api/stats', statsRoutes)

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err)
  res.status(500).json({ message: 'Internal server error' })
})

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Connected to MongoDB')
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

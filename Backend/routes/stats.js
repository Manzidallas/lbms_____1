const express = require('express')
const Book = require('../models/Book')
const Borrower = require('../models/Borrower')
const Loan = require('../models/Loan')
const LoanHistory = require('../models/LoanHistory')

const router = express.Router()

router.get('/', async (req, res, next) => {
  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const [
      totalBooks,
      activeBorrowers,
      booksBorrowedToday,
      pendingReturns,
    ] = await Promise.all([
      Book.countDocuments(),
      Borrower.countDocuments({ status: 'active' }),
      LoanHistory.countDocuments({
        action: 'borrow',
        createdAt: { $gte: startOfDay },
      }),
      Loan.countDocuments({ return_date: null }),
    ])

    res.json({
      totalBooks,
      activeBorrowers,
      booksBorrowedToday,
      pendingReturns,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router

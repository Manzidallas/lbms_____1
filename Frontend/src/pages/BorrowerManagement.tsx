import { useState, useEffect } from "react"
import { Search01Icon, Add01Icon, Edit02Icon, Delete01Icon, User03Icon, Calendar01Icon, Mail02Icon, AiPhone01Icon, BookOpen01Icon } from "hugeicons-react"
import { api } from '../lib/api'

interface Borrower {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  membership_id: string
  gender?: 'male' | 'female' | 'other'
  address?: string | null
  status: 'active' | 'inactive' | 'suspended'
  createdAt?: string
}

type Book = {
  id: string
  isbn: string
  title: string
  authors: string[]
}

type BorrowersListResponse = {
  items: Borrower[]
  page: number
  limit: number
  total: number
  totalPages: number
}

interface BorrowingHistory {
  id: string
  bookTitle: string
  bookId: string
  borrowDate: string
  dueDate: string
  returnDate: string | null
  status: 'borrowed' | 'returned' | 'overdue'
}

type LoanItem = {
  id: string
  copy_id: string
  borrower_id: Borrower | string
  borrow_date: string
  due_date: string
  return_date: string | null
  book: Book | null
}

type LoansListResponse = {
  items: LoanItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

const BorrowerManagement = () => {
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null)
  const [borrowingHistory, setBorrowingHistory] = useState<BorrowingHistory[]>([])
  const [borrowerActiveLoans, setBorrowerActiveLoans] = useState<any[]>([])
  const [borrowerLoansLoading, setBorrowerLoansLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'members' | 'loans'>('members')

  const [loadingBorrowers, setLoadingBorrowers] = useState(false)
  const [borrowersError, setBorrowersError] = useState<string | null>(null)

  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [registerForm, setRegisterForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
  })

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: '',
    status: 'active' as Borrower['status'],
    address: '',
  })

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingBorrower, setDeletingBorrower] = useState<Borrower | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [loans, setLoans] = useState<LoanItem[]>([])
  const [loadingLoans, setLoadingLoans] = useState(false)
  const [loansError, setLoansError] = useState<string | null>(null)

  const fetchBorrowers = async (q: string) => {
    try {
      setLoadingBorrowers(true)
      setBorrowersError(null)
      const { data } = await api.get<BorrowersListResponse>('/api/borrowers', {
        params: q.trim() ? { q: q.trim(), limit: 100 } : { limit: 100 },
      })
      setBorrowers(data.items ?? [])
    } catch {
      setBorrowersError('Failed to load members')
      setBorrowers([])
    } finally {
      setLoadingBorrowers(false)
    }
  }

  const openEditBorrower = (b: Borrower) => {
    setEditError(null)
    setEditingBorrower(b)
    setEditForm({
      first_name: b.first_name ?? '',
      last_name: b.last_name ?? '',
      email: b.email ?? '',
      phone: b.phone ?? '',
      gender: b.gender ?? '',
      status: b.status ?? 'active',
      address: (b.address ?? '') as string,
    })
    setShowEditModal(true)
  }

  const saveBorrowerEdits = async () => {
    if (!editingBorrower) return
    try {
      setEditSaving(true)
      setEditError(null)
      await api.patch(`/api/borrowers/${editingBorrower.id}`, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        gender: editForm.gender || undefined,
        status: editForm.status,
        address: editForm.address || undefined,
      })
      setShowEditModal(false)
      setEditingBorrower(null)
      fetchBorrowers(searchTerm)
    } catch (e: any) {
      setEditError(e?.response?.data?.message || 'Failed to update borrower')
    } finally {
      setEditSaving(false)
    }
  }

  const openDeleteBorrower = (b: Borrower) => {
    setDeleteError(null)
    setDeletingBorrower(b)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteBorrower = async () => {
    if (!deletingBorrower) return
    try {
      setDeleteSaving(true)
      setDeleteError(null)
      await api.delete(`/api/borrowers/${deletingBorrower.id}`)
      setShowDeleteConfirm(false)
      setDeletingBorrower(null)
      fetchBorrowers(searchTerm)
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || 'Failed to delete borrower')
    } finally {
      setDeleteSaving(false)
    }
  }

  const fetchLoans = async () => {
    try {
      setLoadingLoans(true)
      setLoansError(null)
      const { data } = await api.get<LoansListResponse>('/api/loans', {
        params: { limit: 100 },
      })
      setLoans(data.items ?? [])
    } catch {
      setLoansError('Failed to load loans')
      setLoans([])
    } finally {
      setLoadingLoans(false)
    }
  }

  const fetchBorrowerActiveLoans = async (borrowerId: string) => {
    try {
      setBorrowerLoansLoading(true)
      const { data } = await api.get(`/api/borrowers/${borrowerId}/loans`)
      setBorrowerActiveLoans(data.items ?? [])
    } catch {
      setBorrowerActiveLoans([])
    } finally {
      setBorrowerLoansLoading(false)
    }
  }

  const fetchBorrowerAllLoans = async (borrowerId: string) => {
    try {
      const { data } = await api.get(`/api/borrowers/${borrowerId}/loans/all`)
      return (data.items ?? []) as LoanItem[]
    } catch {
      return [] as LoanItem[]
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBorrowers(searchTerm)
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  useEffect(() => {
    fetchBorrowers('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'loans') {
      fetchLoans()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (!selectedBorrower) {
      setBorrowingHistory([])
      setBorrowerActiveLoans([])
      return
    }

    const run = async () => {
      const all = await fetchBorrowerAllLoans(selectedBorrower.id)

      const mapped: BorrowingHistory[] = all.map((l) => {
        const isReturned = Boolean(l.return_date)
        const isOverdue = !isReturned && new Date(l.due_date).getTime() < Date.now()
        const status: BorrowingHistory['status'] = isReturned ? 'returned' : isOverdue ? 'overdue' : 'borrowed'

        return {
          id: l.id,
          bookTitle: l.book?.title ?? 'Unknown book',
          bookId: l.book?.isbn ?? l.copy_id,
          borrowDate: String(l.borrow_date).slice(0, 10),
          dueDate: String(l.due_date).slice(0, 10),
          returnDate: l.return_date ? String(l.return_date).slice(0, 10) : null,
          status,
        }
      })

      setBorrowingHistory(mapped)
      fetchBorrowerActiveLoans(selectedBorrower.id)
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBorrower])

  const filteredBorrowers = borrowers

  const registerMember = async () => {
    try {
      setSaving(true)
      setSaveError(null)

      const payload = {
        first_name: registerForm.first_name,
        last_name: registerForm.last_name,
        email: registerForm.email,
        phone: registerForm.phone,
        gender: registerForm.gender || undefined,
      }

      await api.post('/api/borrowers', payload)
      setShowRegisterModal(false)
      setRegisterForm({ first_name: '', last_name: '', email: '', phone: '', gender: '' })
      fetchBorrowers(searchTerm)
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to register member')
    } finally {
      setSaving(false)
    }
  }

  const returnBook = async (loanId: string) => {
    try {
      await api.patch(`/api/loans/${loanId}`, { return_date: new Date().toISOString() })
      if (selectedBorrower) {
        fetchBorrowerActiveLoans(selectedBorrower.id)
        const all = await fetchBorrowerAllLoans(selectedBorrower.id)
        const mapped: BorrowingHistory[] = all.map((l) => {
          const isReturned = Boolean(l.return_date)
          const isOverdue = !isReturned && new Date(l.due_date).getTime() < Date.now()
          const status: BorrowingHistory['status'] = isReturned ? 'returned' : isOverdue ? 'overdue' : 'borrowed'
          return {
            id: l.id,
            bookTitle: l.book?.title ?? 'Unknown book',
            bookId: l.book?.isbn ?? l.copy_id,
            borrowDate: String(l.borrow_date).slice(0, 10),
            dueDate: String(l.due_date).slice(0, 10),
            returnDate: l.return_date ? String(l.return_date).slice(0, 10) : null,
            status,
          }
        })
        setBorrowingHistory(mapped)
      }
    } catch {
      // Optionally show error
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHistoryStatusColor = (status: string) => {
    switch (status) {
      case 'returned': return 'bg-green-100 text-green-800'
      case 'borrowed': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const loanStatus = (l: LoanItem) => {
    const isReturned = Boolean(l.return_date)
    const isOverdue = !isReturned && new Date(l.due_date).getTime() < Date.now()
    return isReturned ? 'returned' : isOverdue ? 'overdue' : 'borrowed'
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Borrower Management</h1>
        <p className="text-sm text-gray-600 mt-1">Track and manage library members</p>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search01Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search borrowers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSaveError(null)
              setRegisterForm({ first_name: '', last_name: '', email: '', phone: '', gender: '' })
              setShowRegisterModal(true)
            }}
            className="h-12 px-5 rounded-xl bg-black text-white text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <Add01Icon size={18} />
            Add Borrower
          </button>
        </div>
        <div className="flex gap-2">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Borrowers</p>
            <p className="text-2xl font-bold w-[200px]">{borrowers.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Active Now</p>
            <p className="text-2xl font-bold w-[200px] text-black">
              {borrowers.filter((b) => b.status === 'active').length}
            </p>
          </div>
        </div>
      </div>

      <div className="p-2 bg-gray-100 rounded-xl space-x-2 inline-flex items-center w-fit">
        <div
          className={`p-2 rounded-lg border w-24 flex items-center justify-center text-sm cursor-pointer ${
            activeTab === 'members' ? 'bg-white' : 'bg-gray-100'
          }`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </div>
        <div
          className={`p-2 rounded-lg border w-30 flex items-center justify-center text-sm cursor-pointer ${
            activeTab === 'loans' ? 'bg-white' : 'bg-gray-100'
          }`}
          onClick={() => setActiveTab('loans')}
        >
          Loan Records
        </div>
      </div>

      {/* Borrowers List */}
      {activeTab === 'members' ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Members</h2>
          </div>
          {loadingBorrowers ? (
            <div className="p-6 text-sm text-gray-600">Loading members...</div>
          ) : null}
          {borrowersError ? (
            <div className="p-6 text-sm text-red-600">{borrowersError}</div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membership ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBorrowers.map((borrower) => (
                  <tr key={borrower.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => setSelectedBorrower(borrower)}>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User03Icon size={20} className="text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{borrower.first_name} {borrower.last_name}</div>
                          {borrower.createdAt ? (
                            <div className="text-sm text-gray-500">Registered {borrower.createdAt.slice(0, 10)}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{borrower.email}</div>
                      <div className="text-sm text-gray-500">{borrower.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{borrower.membership_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(borrower.status)}`}>
                        {borrower.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditBorrower(borrower)
                        }}
                        className="text-gray-600 hover:text-gray-900 mr-3"
                      >
                        <Edit02Icon size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteBorrower(borrower)
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Delete01Icon size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Loan Records</h2>
          </div>
          <div className="p-6">
            {loadingLoans ? (
              <div className="text-sm text-gray-600">Loading loans...</div>
            ) : null}
            {loansError ? (
              <div className="text-sm text-red-600">{loansError}</div>
            ) : null}
            {!loadingLoans && !loansError ? (
              <div className="space-y-4">
                {loans.map((l) => {
                  const borrowerName =
                    l.borrower_id && typeof l.borrower_id === 'object'
                      ? `${(l.borrower_id as Borrower).first_name} ${(l.borrower_id as Borrower).last_name}`
                      : 'Unknown borrower'
                  const status = loanStatus(l)
                  const bookTitle = l.book?.title ?? 'Unknown book'
                  const bookId = l.book?.isbn ?? l.copy_id

                  return (
                    <div key={l.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                          <BookOpen01Icon size={20} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{bookTitle}</p>
                          <p className="text-sm text-gray-600 mt-0.5">{borrowerName}</p>
                          <p className="text-sm text-gray-500">{bookId}</p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-gray-500">Borrowed: {String(l.borrow_date).slice(0, 10)}</span>
                            <span className="text-xs text-gray-500">Due: {String(l.due_date).slice(0, 10)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getHistoryStatusColor(status)}`}>
                          {status}
                        </span>
                        {l.return_date ? (
                          <p className="text-xs text-gray-500 mt-1">Returned: {String(l.return_date).slice(0, 10)}</p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
                {loans.length === 0 ? (
                  <div className="text-sm text-gray-600">No loan records yet.</div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Borrower Details & History */}
      {selectedBorrower && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setSelectedBorrower(null)
          }}
        >
          <div className="w-full max-w-5xl rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Borrower Details</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setSelectedBorrower(null)}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 max-h-[80vh] overflow-y-auto">
              <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrower Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <User03Icon size={40} className="text-gray-500" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedBorrower.first_name} {selectedBorrower.last_name}</p>
                    <span className={`inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedBorrower.status)}`}>
                      {selectedBorrower.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail02Icon size={16} />
                      {selectedBorrower.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <AiPhone01Icon size={16} />
                      {selectedBorrower.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar01Icon size={16} />
                      Membership ID {selectedBorrower.membership_id}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Borrowing History</h3>
                </div>
                <div className="p-6">
                  {borrowerLoansLoading ? (
                    <div className="text-sm text-gray-600">Loading active loans...</div>
                  ) : borrowerActiveLoans.length > 0 ? (
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Active Loans</h4>
                      <div className="space-y-3">
                        {borrowerActiveLoans.map((loan) => (
                          <div key={loan.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center">
                                <BookOpen01Icon size={18} className="text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{loan.book?.title ?? 'Unknown book'}</p>
                                <p className="text-xs text-gray-500">{loan.book?.isbn ?? loan.copy_id}</p>
                                <p className="text-xs text-gray-500 mt-1">Due: {String(loan.due_date).slice(0, 10)}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => returnBook(loan.id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition"
                            >
                              Return Book
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">All History</h4>
                    <div className="space-y-4">
                      {borrowingHistory.map((history) => (
                        <div key={history.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center">
                              <BookOpen01Icon size={20} className="text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{history.bookTitle}</p>
                              <p className="text-sm text-gray-500">{history.bookId}</p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-gray-500">
                                  Borrowed: {history.borrowDate}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Due: {history.dueDate}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getHistoryStatusColor(history.status)}`}>
                              {history.status}
                            </span>
                            {history.returnDate && (
                              <p className="text-xs text-gray-500 mt-1">Returned: {history.returnDate}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRegisterModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setShowRegisterModal(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Register Member</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowRegisterModal(false)}
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {saveError ? <div className="mb-3 text-sm text-red-600">{saveError}</div> : null}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={registerForm.first_name}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, first_name: e.target.value }))}
                    placeholder="First name"
                    className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                  />
                  <input
                    value={registerForm.last_name}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, last_name: e.target.value }))}
                    placeholder="Last name"
                    className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
                <input
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <select
                  value={registerForm.gender}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="">Select gender (optional)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="h-10 px-4 rounded-lg border border-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={registerMember}
                  className="h-10 px-4 rounded-lg bg-black text-white text-sm"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showEditModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setShowEditModal(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Edit Borrower</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {editError ? <div className="mb-3 text-sm text-red-600">{editError}</div> : null}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editForm.first_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, first_name: e.target.value }))}
                    placeholder="First name"
                    className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                  />
                  <input
                    value={editForm.last_name}
                    onChange={(e) => setEditForm((p) => ({ ...p, last_name: e.target.value }))}
                    placeholder="Last name"
                    className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
                <input
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Phone"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Address"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="">Select gender (optional)</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as Borrower['status'] }))}
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="h-10 px-4 rounded-lg border border-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={saveBorrowerEdits}
                  className="h-10 px-4 rounded-lg bg-black text-white text-sm"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setShowDeleteConfirm(false)
          }}
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Delete Borrower</h3>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowDeleteConfirm(false)}
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {deleteError ? <div className="mb-3 text-sm text-red-600">{deleteError}</div> : null}
              <p className="text-sm text-gray-700">
                Are you sure you want to delete{' '}
                <span className="font-semibold">
                  {deletingBorrower ? `${deletingBorrower.first_name} ${deletingBorrower.last_name}` : 'this borrower'}
                </span>
                ?
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-10 px-4 rounded-lg border border-gray-200 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteSaving}
                  onClick={confirmDeleteBorrower}
                  className="h-10 px-4 rounded-lg bg-red-600 text-white text-sm"
                >
                  {deleteSaving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default BorrowerManagement

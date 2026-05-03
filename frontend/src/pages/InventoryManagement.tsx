import axios from 'axios'
import { useEffect, useMemo, useRef, useState } from "react"
import { Search01Icon, Add01Icon, Edit02Icon, Delete01Icon, BookOpen01Icon, Calendar01Icon, Tag01Icon, Package01Icon } from "hugeicons-react"
import { LIBRARY_GENRES } from '../constants/genres'
import { api } from '../lib/api'

interface Book {
  id: string
  isbn: string
  title: string
  subtitle: string | null
  authors: string[]
  genre: string | null
  publisher: string | null
  publish_year: number | null
  pages: number | null
  copies: number
  language: string | null
  description: string | null
  subjects: string[]
  cover_url: string | null
  openlibrary_id: string | null
  source: 'manual' | 'openlibrary'
  createdAt?: string
}

type BooksListResponse = {
  items: Book[]
  page: number
  limit: number
  total: number
  totalPages: number
}

type OpenLibrarySearchDoc = {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  isbn?: string[]
  publisher?: string[]
  language?: string[]
  subject?: string[]
  number_of_pages_median?: number
}

type OpenLibrarySearchResponse = {
  docs: OpenLibrarySearchDoc[]
}

type OpenLibraryEditionsResponse = {
  entries?: Array<{
    isbn_13?: string[]
    isbn_10?: string[]
  }>
}

type BookHistoryItem = {
  id: string
  book_id: Book | string | null
  action: 'create' | 'update' | 'delete'
  message: string
  meta?: any
  createdAt?: string
}

type BookHistoryListResponse = {
  items: BookHistoryItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

type LoanHistoryItem = {
  id: string
  loan_id: any
  borrower_id: any
  copy_id: string | null
  action: 'borrow' | 'return'
  message: string
  meta?: any
  book?: Book | null
  createdAt?: string
}

type LoanHistoryListResponse = {
  items: LoanHistoryItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

type Collection = {
  id: string
  name: string
  description: string | null
  books: Array<Book | string>
  createdAt?: string
}

type CollectionsListResponse = {
  items: Collection[]
  page: number
  limit: number
  total: number
  totalPages: number
}

const emptyBookForm = {
  isbn: '',
  title: '',
  subtitle: '',
  authors: '',
  genre: '',
  publisher: '',
  publish_year: '',
  pages: '',
  copies: '1',
  language: '',
  description: '',
  subjects: '',
  cover_url: '',
  openlibrary_id: '',
}

const InventoryManagement = () => {
  const [books, setBooks] = useState<Book[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  const [activeTab, setActiveTab] = useState<'books' | 'collections' | 'history'>('books')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showFetchModal, setShowFetchModal] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const addMenuRef = useRef<HTMLDivElement | null>(null)

  const [loadingBooks, setLoadingBooks] = useState(false)
  const [booksError, setBooksError] = useState<string | null>(null)

  const [manualForm, setManualForm] = useState({ ...emptyBookForm })
  const [editForm, setEditForm] = useState({ ...emptyBookForm })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [olQuery, setOlQuery] = useState('')
  const [olLoading, setOlLoading] = useState(false)
  const [olResults, setOlResults] = useState<OpenLibrarySearchDoc[]>([])
  const [olSelected, setOlSelected] = useState<OpenLibrarySearchDoc | null>(null)
  const [olCopies, setOlCopies] = useState('1')
  const [olGenre, setOlGenre] = useState('')
  const [olResolvedIsbn, setOlResolvedIsbn] = useState<string | null>(null)
  const [olIsbnLoading, setOlIsbnLoading] = useState(false)

  const [historyItems, setHistoryItems] = useState<BookHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const [loanHistoryItems, setLoanHistoryItems] = useState<LoanHistoryItem[]>([])

  const [collections, setCollections] = useState<Collection[]>([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsError, setCollectionsError] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)

  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false)
  const [collectionForm, setCollectionForm] = useState({ name: '', description: '' })
  const [selectedBookToAdd, setSelectedBookToAdd] = useState('')

  const fetchBooks = async (q: string) => {
    try {
      setLoadingBooks(true)
      setBooksError(null)
      const { data } = await api.get<BooksListResponse>('/api/books', {
        params: q.trim() ? { q: q.trim(), limit: 100 } : { limit: 100 },
      })
      setBooks(data.items ?? [])
    } catch {
      setBooksError('Failed to load books')
      setBooks([])
    } finally {
      setLoadingBooks(false)
    }
  }

  const fetchCollections = async () => {
    try {
      setCollectionsLoading(true)
      setCollectionsError(null)
      const { data } = await api.get<CollectionsListResponse>('/api/collections', {
        params: { limit: 100, includeBooks: true },
      })
      setCollections(data.items ?? [])
    } catch {
      setCollectionsError('Failed to load collections')
      setCollections([])
    } finally {
      setCollectionsLoading(false)
    }
  }

  const createCollection = async () => {
    try {
      setSaving(true)
      setSaveError(null)

      const payload = {
        name: collectionForm.name,
        description: collectionForm.description || null,
      }

      await api.post('/api/collections', payload)
      setShowCreateCollectionModal(false)
      setCollectionForm({ name: '', description: '' })
      fetchCollections()
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to create collection')
    } finally {
      setSaving(false)
    }
  }

  const addBookToCollection = async (collectionId: string, bookId: string) => {
    try {
      setSaving(true)
      setSaveError(null)
      const { data } = await api.post(`/api/collections/${collectionId}/books`, { book_id: bookId })
      const updated = data?.collection as Collection | undefined
      if (updated) {
        setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setSelectedCollection((prev) => (prev?.id === updated.id ? updated : prev))
      } else {
        fetchCollections()
      }
      setSelectedBookToAdd('')
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to add book to collection')
    } finally {
      setSaving(false)
    }
  }

  const removeBookFromCollection = async (collectionId: string, bookId: string) => {
    try {
      setSaving(true)
      setSaveError(null)
      const { data } = await api.delete(`/api/collections/${collectionId}/books/${bookId}`)
      const updated = data?.collection as Collection | undefined
      if (updated) {
        setCollections((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        setSelectedCollection((prev) => (prev?.id === updated.id ? updated : prev))
      } else {
        fetchCollections()
      }
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to remove book from collection')
    } finally {
      setSaving(false)
    }
  }

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true)
      setHistoryError(null)
      const [booksRes, loansRes] = await Promise.all([
        api.get<BookHistoryListResponse>('/api/books/history', { params: { limit: 100 } }),
        api.get<LoanHistoryListResponse>('/api/loans/history', { params: { limit: 100 } }),
      ])

      setHistoryItems(booksRes.data.items ?? [])
      setLoanHistoryItems(loansRes.data.items ?? [])
    } catch {
      setHistoryError('Failed to load history')
      setHistoryItems([])
      setLoanHistoryItems([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBooks(searchTerm)
    }, 250)

    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  useEffect(() => {
    fetchBooks('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
    if (activeTab === 'collections') {
      fetchCollections()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      const el = addMenuRef.current
      if (!el) return
      if (!el.contains(e.target as Node)) {
        setShowAddMenu(false)
      }
    }

    if (showAddMenu) {
      document.addEventListener('mousedown', onMouseDown)
    }

    return () => {
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [showAddMenu])

  const filteredBooks = books

  const totalTitles = filteredBooks.length
  const totalCopies = useMemo(
    () => filteredBooks.reduce((sum, b) => sum + (Number.isFinite(b.copies) ? b.copies : 0), 0),
    [filteredBooks]
  )

  const openManualAdd = () => {
    setSaveError(null)
    setManualForm({ ...emptyBookForm })
    setShowAddModal(true)
  }

  const openEdit = (book: Book) => {
    setSaveError(null)
    setSelectedBook(book)
    setEditForm({
      isbn: book.isbn ?? '',
      title: book.title ?? '',
      subtitle: book.subtitle ?? '',
      authors: (book.authors ?? []).join(', '),
      genre: book.genre ?? '',
      publisher: book.publisher ?? '',
      publish_year: book.publish_year != null ? String(book.publish_year) : '',
      pages: book.pages != null ? String(book.pages) : '',
      copies: book.copies != null ? String(book.copies) : '1',
      language: book.language ?? '',
      description: book.description ?? '',
      subjects: (book.subjects ?? []).join(', '),
      cover_url: book.cover_url ?? '',
      openlibrary_id: book.openlibrary_id ?? '',
    })
    setShowEditModal(true)
  }

  const deleteBook = async (book: Book) => {
    const ok = window.confirm('Delete this book?')
    if (!ok) return
    try {
      await api.delete(`/api/books/${book.id}`)
      fetchBooks(searchTerm)
    } catch {
      window.alert('Failed to delete book')
    }
  }

  const submitManual = async () => {
    try {
      setSaving(true)
      setSaveError(null)

      const payload = {
        isbn: manualForm.isbn,
        title: manualForm.title,
        subtitle: manualForm.subtitle || null,
        authors: manualForm.authors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        genre: manualForm.genre || null,
        publisher: manualForm.publisher || null,
        publish_year: manualForm.publish_year ? Number(manualForm.publish_year) : null,
        pages: manualForm.pages ? Number(manualForm.pages) : null,
        copies: manualForm.copies ? Number(manualForm.copies) : 1,
        language: manualForm.language || null,
        description: manualForm.description || null,
        subjects: manualForm.subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        cover_url: manualForm.cover_url || null,
        openlibrary_id: manualForm.openlibrary_id || null,
      }

      await api.post('/api/books/manual', payload)
      setShowAddModal(false)
      fetchBooks(searchTerm)
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to add book')
    } finally {
      setSaving(false)
    }
  }

  const submitEdit = async () => {
    if (!selectedBook) return
    try {
      setSaving(true)
      setSaveError(null)

      const payload = {
        isbn: editForm.isbn,
        title: editForm.title,
        subtitle: editForm.subtitle || null,
        authors: editForm.authors
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        genre: editForm.genre || null,
        publisher: editForm.publisher || null,
        publish_year: editForm.publish_year ? Number(editForm.publish_year) : null,
        pages: editForm.pages ? Number(editForm.pages) : null,
        copies: editForm.copies ? Number(editForm.copies) : 1,
        language: editForm.language || null,
        description: editForm.description || null,
        subjects: editForm.subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        cover_url: editForm.cover_url || null,
        openlibrary_id: editForm.openlibrary_id || null,
      }

      await api.patch(`/api/books/${selectedBook.id}`, payload)
      setShowEditModal(false)
      fetchBooks(searchTerm)
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to update book')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!showFetchModal) return
      const q = olQuery.trim()
      if (!q) {
        setOlResults([])
        return
      }

      try {
        setOlLoading(true)
        const { data } = await axios.get<OpenLibrarySearchResponse>(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=10`,
        )
        if (!cancelled) setOlResults(data.docs ?? [])
      } catch {
        if (!cancelled) setOlResults([])
      } finally {
        if (!cancelled) setOlLoading(false)
      }
    }

    const t = setTimeout(run, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [olQuery, showFetchModal])

  const openFetch = () => {
    setSaveError(null)
    setOlQuery('')
    setOlResults([])
    setOlSelected(null)
    setOlCopies('1')
    setOlGenre('')
    setOlResolvedIsbn(null)
    setOlIsbnLoading(false)
    setShowFetchModal(true)
  }

  const pickOlIsbn = (doc: OpenLibrarySearchDoc) => {
    const list = doc.isbn ?? []
    const clean = list
      .map((x) => String(x).trim())
      .filter(Boolean)
    const isbn13 = clean.find((x) => x.length === 13)
    return isbn13 ?? clean[0] ?? null
  }

  const resolveIsbnFromEditions = async (doc: OpenLibrarySearchDoc) => {
    const path = String(doc.key || '').trim()
    if (!path.startsWith('/works/')) return null

    try {
      setOlIsbnLoading(true)
      setOlResolvedIsbn(null)
      setSaveError(null)

      const { data } = await axios.get<OpenLibraryEditionsResponse>(
        `https://openlibrary.org${path}/editions.json?limit=50`,
      )

      const entries = data?.entries ?? []
      for (const e of entries) {
        const isbn13 = (e?.isbn_13 ?? []).map(String).map((s) => s.trim()).filter(Boolean)
        if (isbn13.length) return isbn13[0]
      }

      for (const e of entries) {
        const isbn10 = (e?.isbn_10 ?? []).map(String).map((s) => s.trim()).filter(Boolean)
        if (isbn10.length) return isbn10[0]
      }

      return null
    } catch {
      return null
    } finally {
      setOlIsbnLoading(false)
    }
  }

  const submitOpenLibrary = async () => {
    if (!olSelected) return

    const isbn = pickOlIsbn(olSelected) ?? olResolvedIsbn
    if (!isbn) {
      setSaveError('Selected book has no ISBN available from OpenLibrary.')
      return
    }

    try {
      setSaving(true)
      setSaveError(null)

      const coverUrl = olSelected.cover_i
        ? `https://covers.openlibrary.org/b/id/${olSelected.cover_i}-L.jpg`
        : null

      const payload = {
        isbn,
        title: olSelected.title,
        subtitle: null,
        authors: olSelected.author_name ?? [],
        genre: olGenre || null,
        publisher: (olSelected.publisher ?? [])[0] ?? null,
        publish_year: olSelected.first_publish_year ?? null,
        pages: olSelected.number_of_pages_median ?? null,
        language: (olSelected.language ?? [])[0] ?? null,
        description: null,
        subjects: (olSelected.subject ?? []).slice(0, 20),
        cover_url: coverUrl,
        openlibrary_id: olSelected.key,
        copies: olCopies ? Number(olCopies) : 1,
      }

      await api.post('/api/books/openlibrary', payload)
      setShowFetchModal(false)
      fetchBooks(searchTerm)
    } catch (e: any) {
      setSaveError(e?.response?.data?.message || 'Failed to add book from OpenLibrary')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-black">Inventory Management</h1>
        <p className="text-sm text-gray-600 mt-1">Manage and track library books</p>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search01Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search books..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div ref={addMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowAddMenu((v) => !v)}
              className="h-12 px-5 rounded-xl bg-black text-white text-sm font-medium flex items-center gap-2 hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <Add01Icon size={18} />
              Add Book
              <span className="ml-1 text-xs">▾</span>
            </button>

            {showAddMenu && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-10">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-50"
                  onClick={() => {
                    setShowAddMenu(false)
                    openManualAdd()
                  }}
                >
                  Add manually
                </button>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 text-sm text-gray-900 hover:bg-gray-50"
                  onClick={() => {
                    setShowAddMenu(false)
                    openFetch()
                  }}
                >
                  FetchData
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Books</p>
            <p className="text-2xl font-bold text-gray-900">{totalTitles}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Total Copies</p>
            <p className="text-2xl font-bold text-gray-900">{totalCopies}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">Manual</p>
            <p className="text-2xl font-bold text-gray-900">
              {books.filter((b) => b.source === 'manual').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">OpenLibrary</p>
            <p className="text-2xl font-bold text-gray-900">
              {books.filter((b) => b.source === 'openlibrary').length}
            </p>
          </div>
        </div>
      </div>

      <div className="p-2 bg-gray-100 rounded-xl space-x-2 inline-flex items-center w-fit">
        <div
          className={`p-2 rounded-lg border w-20 flex items-center justify-center text-sm cursor-pointer ${
            activeTab === 'books' ? 'bg-white' : 'bg-gray-100'
          }`}
          onClick={() => setActiveTab('books')}
        >
          Books
        </div>
        <div
          className={`p-2 rounded-lg border w-22 flex items-center justify-center text-sm cursor-pointer ${
            activeTab === 'collections' ? 'bg-white' : 'bg-gray-100'
          }`}
          onClick={() => setActiveTab('collections')}
        >
          Collections
        </div>
        <div
          className={`p-2 rounded-lg border w-20 flex items-center justify-center text-sm cursor-pointer ${
            activeTab === 'history' ? 'bg-white' : 'bg-gray-100'
          }`}
          onClick={() => setActiveTab('history')}
        >
          History
        </div>
      </div>

      {/* Books List */}
      {activeTab === 'history' ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">History</h2>
            <button
              type="button"
              className="h-9 px-3 rounded-lg border border-gray-200 text-sm"
              onClick={fetchHistory}
              disabled={historyLoading}
            >
              Refresh
            </button>
          </div>
          {historyLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading history...</div>
          ) : null}
          {historyError ? (
            <div className="p-6 text-sm text-red-600">{historyError}</div>
          ) : null}
          {!historyLoading && !historyError ? (
            <div className="divide-y divide-gray-100">
              {[...historyItems.map((h) => ({ kind: 'book' as const, createdAt: h.createdAt ?? '', item: h })),
                ...loanHistoryItems.map((h) => ({ kind: 'loan' as const, createdAt: h.createdAt ?? '', item: h })),
              ]
                .sort((a, b) => {
                  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
                  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
                  return tb - ta
                })
                .map((row) => {
                  if (row.kind === 'book') {
                    const h = row.item as BookHistoryItem
                    const bookTitle =
                      h.book_id && typeof h.book_id === 'object' ? (h.book_id as Book).title : null
                    return (
                      <div key={`book-${h.id}`} className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{h.message}</p>
                            {bookTitle ? <p className="text-xs text-gray-600 mt-1">{bookTitle}</p> : null}
                          </div>
                          <div className="text-xs text-gray-500 whitespace-nowrap">
                            {h.createdAt ? h.createdAt.slice(0, 19).replace('T', ' ') : ''}
                          </div>
                        </div>
                      </div>
                    )
                  }

                  const h = row.item as LoanHistoryItem
                  const borrowerName =
                    h.borrower_id && typeof h.borrower_id === 'object'
                      ? `${h.borrower_id.first_name ?? ''} ${h.borrower_id.last_name ?? ''}`.trim()
                      : null
                  const bookTitle = h.book?.title ?? null
                  const label = h.action === 'borrow' ? 'Loan' : 'Return'

                  return (
                    <div key={`loan-${h.id}`} className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{label}: {h.message}</p>
                          {bookTitle ? <p className="text-xs text-gray-600 mt-1">{bookTitle}</p> : null}
                          {borrowerName ? <p className="text-xs text-gray-600 mt-1">{borrowerName}</p> : null}
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {h.createdAt ? h.createdAt.slice(0, 19).replace('T', ' ') : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}

              {historyItems.length === 0 && loanHistoryItems.length === 0 ? (
                <div className="p-6 text-sm text-gray-600">No history yet.</div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : activeTab === 'books' ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Books Inventory</h2>
          </div>
          {loadingBooks ? (
            <div className="p-6 text-sm text-gray-600">Loading books...</div>
          ) : null}
          {booksError ? (
            <div className="p-6 text-sm text-red-600">{booksError}</div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Publisher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copies</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBooks.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-6 py-4 whitespace-nowrap" onClick={() => setSelectedBook(book)}>
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <BookOpen01Icon size={20} className="text-gray-500" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{book.title}</div>
                          {book.createdAt ? (
                            <div className="text-sm text-gray-500">Added {book.createdAt.slice(0, 10)}</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{(book.authors ?? []).join(', ')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.isbn}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.publisher ?? '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        {book.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{book.copies}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => openEdit(book)}
                        className="text-gray-600 hover:text-gray-900 mr-3"
                      >
                        <Edit02Icon size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBook(book)}
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
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Collections</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-9 px-3 rounded-lg border border-gray-200 text-sm"
                  onClick={fetchCollections}
                  disabled={collectionsLoading}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  className="h-9 px-3 rounded-lg bg-black text-white text-sm"
                  onClick={() => {
                    setSaveError(null)
                    setCollectionForm({ name: '', description: '' })
                    setShowCreateCollectionModal(true)
                  }}
                >
                  Create Collection
                </button>
              </div>
            </div>
          </div>
          {collectionsLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading collections...</div>
          ) : null}
          {collectionsError ? (
            <div className="p-6 text-sm text-red-600">{collectionsError}</div>
          ) : null}
          {saveError ? (
            <div className="p-6 pt-0 text-sm text-red-600">{saveError}</div>
          ) : null}

          {!collectionsLoading && !collectionsError ? (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="space-y-2">
                  {collections.map((c) => {
                    const count = (c.books ?? []).length
                    const active = selectedCollection?.id === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left p-4 rounded-xl border transition ${
                          active ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          setSelectedCollection(c)
                          setSelectedBookToAdd('')
                          setSaveError(null)
                        }}
                      >
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{c.description ?? 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-2">{count} book{count === 1 ? '' : 's'}</p>
                      </button>
                    )
                  })}
                  {collections.length === 0 ? (
                    <div className="text-sm text-gray-600">No collections yet. Create one to get started.</div>
                  ) : null}
                </div>
              </div>

              <div className="lg:col-span-2">
                {!selectedCollection ? (
                  <div className="text-sm text-gray-600">Select a collection to manage its books.</div>
                ) : (
                  <div className="rounded-xl border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{selectedCollection.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{selectedCollection.description ?? 'No description'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedBookToAdd}
                          onChange={(e) => setSelectedBookToAdd(e.target.value)}
                          className="h-9 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                        >
                          <option value="">Select book...</option>
                          {books.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedBookToAdd || saving}
                          onClick={() => addBookToCollection(selectedCollection.id, selectedBookToAdd)}
                          className="h-9 px-3 rounded-lg bg-black text-white text-sm disabled:opacity-50"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {(selectedCollection.books ?? []).map((bk) => {
                        const book = bk && typeof bk === 'object' ? (bk as Book) : null
                        const bookId = book?.id ?? String(bk)
                        const title = book?.title ?? 'Unknown book'
                        const isbn = book?.isbn ?? ''

                        return (
                          <div key={bookId} className="p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
                              {isbn ? <p className="text-xs text-gray-600 mt-1">ISBN: {isbn}</p> : null}
                            </div>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => removeBookFromCollection(selectedCollection.id, bookId)}
                              className="h-9 px-3 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          </div>
                        )
                      })}
                      {(selectedCollection.books ?? []).length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">No books in this collection yet.</div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Book Details */}
      {selectedBook && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Book Details</h2>
            <button
              onClick={() => setSelectedBook(null)}
              className="text-gray-400 hover:text-gray-600"
            >
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">{selectedBook.title}</h3>
              <p className="text-sm text-gray-600 mb-4">by {(selectedBook.authors ?? []).join(', ')}</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag01Icon size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">ISBN: {selectedBook.isbn}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package01Icon size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Publisher: {selectedBook.publisher ?? '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar01Icon size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-600">Source: {selectedBook.source}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Copy Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Copies:</span>
                  <span className="font-medium">{selectedBook.copies}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Book</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {saveError ? (
              <div className="mb-3 text-sm text-red-600">{saveError}</div>
            ) : null}

            <div className="space-y-3">
              <input
                value={manualForm.isbn}
                onChange={(e) => setManualForm((p) => ({ ...p, isbn: e.target.value }))}
                placeholder="ISBN"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={manualForm.title}
                onChange={(e) => setManualForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={manualForm.subtitle}
                onChange={(e) => setManualForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="Subtitle"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={manualForm.authors}
                onChange={(e) => setManualForm((p) => ({ ...p, authors: e.target.value }))}
                placeholder="Authors (comma separated)"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <select
                value={manualForm.genre}
                onChange={(e) => setManualForm((p) => ({ ...p, genre: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="">Select genre...</option>
                {LIBRARY_GENRES.filter((g) => g !== 'All').map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                value={manualForm.publisher}
                onChange={(e) => setManualForm((p) => ({ ...p, publisher: e.target.value }))}
                placeholder="Publisher"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  value={manualForm.publish_year}
                  onChange={(e) => setManualForm((p) => ({ ...p, publish_year: e.target.value }))}
                  placeholder="Year"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={manualForm.pages}
                  onChange={(e) => setManualForm((p) => ({ ...p, pages: e.target.value }))}
                  placeholder="Pages"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={manualForm.copies}
                  onChange={(e) => setManualForm((p) => ({ ...p, copies: e.target.value }))}
                  placeholder="Copies"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>

              <input
                value={manualForm.language}
                onChange={(e) => setManualForm((p) => ({ ...p, language: e.target.value }))}
                placeholder="Language"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={manualForm.cover_url}
                onChange={(e) => setManualForm((p) => ({ ...p, cover_url: e.target.value }))}
                placeholder="Cover URL"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={manualForm.openlibrary_id}
                onChange={(e) => setManualForm((p) => ({ ...p, openlibrary_id: e.target.value }))}
                placeholder="OpenLibrary ID"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={manualForm.subjects}
                onChange={(e) => setManualForm((p) => ({ ...p, subjects: e.target.value }))}
                placeholder="Subjects (comma separated)"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <textarea
                value={manualForm.description}
                onChange={(e) => setManualForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="w-full min-h-20 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="h-10 px-4 rounded-lg border border-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={submitManual}
                className="h-10 px-4 rounded-lg bg-black text-white text-sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Book</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {saveError ? (
              <div className="mb-3 text-sm text-red-600">{saveError}</div>
            ) : null}

            <div className="space-y-3">
              <input
                value={editForm.isbn}
                onChange={(e) => setEditForm((p) => ({ ...p, isbn: e.target.value }))}
                placeholder="ISBN"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={editForm.subtitle}
                onChange={(e) => setEditForm((p) => ({ ...p, subtitle: e.target.value }))}
                placeholder="Subtitle"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={editForm.authors}
                onChange={(e) => setEditForm((p) => ({ ...p, authors: e.target.value }))}
                placeholder="Authors (comma separated)"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <select
                value={editForm.genre}
                onChange={(e) => setEditForm((p) => ({ ...p, genre: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm bg-white"
              >
                <option value="">Select genre...</option>
                {LIBRARY_GENRES.filter((g) => g !== 'All').map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <input
                value={editForm.publisher}
                onChange={(e) => setEditForm((p) => ({ ...p, publisher: e.target.value }))}
                placeholder="Publisher"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  value={editForm.publish_year}
                  onChange={(e) => setEditForm((p) => ({ ...p, publish_year: e.target.value }))}
                  placeholder="Year"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={editForm.pages}
                  onChange={(e) => setEditForm((p) => ({ ...p, pages: e.target.value }))}
                  placeholder="Pages"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
                <input
                  value={editForm.copies}
                  onChange={(e) => setEditForm((p) => ({ ...p, copies: e.target.value }))}
                  placeholder="Copies"
                  className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>

              <input
                value={editForm.language}
                onChange={(e) => setEditForm((p) => ({ ...p, language: e.target.value }))}
                placeholder="Language"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={editForm.cover_url}
                onChange={(e) => setEditForm((p) => ({ ...p, cover_url: e.target.value }))}
                placeholder="Cover URL"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={editForm.openlibrary_id}
                onChange={(e) => setEditForm((p) => ({ ...p, openlibrary_id: e.target.value }))}
                placeholder="OpenLibrary ID"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <input
                value={editForm.subjects}
                onChange={(e) => setEditForm((p) => ({ ...p, subjects: e.target.value }))}
                placeholder="Subjects (comma separated)"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description"
                className="w-full min-h-20 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
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
                disabled={saving}
                onClick={submitEdit}
                className="h-10 px-4 rounded-lg bg-black text-white text-sm"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showFetchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Fetch Book Data</h2>
              <button
                onClick={() => setShowFetchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {saveError ? (
              <div className="mb-3 text-sm text-red-600">{saveError}</div>
            ) : null}

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search01Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  value={olQuery}
                  onChange={(e) => setOlQuery(e.target.value)}
                  placeholder="Search OpenLibrary..."
                  className="w-full h-11 pl-11 pr-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>
            </div>

            <div className="mt-4">
              {olSelected ? (
                <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-900">{olSelected.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{(olSelected.author_name ?? []).slice(0, 3).join(', ')}</p>
                  <p className="text-xs text-gray-500 mt-1">{olSelected.first_publish_year ?? 'Year unknown'}</p>

                  {!pickOlIsbn(olSelected) ? (
                    <div className="mt-3">
                      {olIsbnLoading ? (
                        <p className="text-xs text-gray-600">Fetching ISBN from OpenLibrary editions...</p>
                      ) : olResolvedIsbn ? (
                        <p className="text-xs text-gray-600">Resolved ISBN: {olResolvedIsbn}</p>
                      ) : (
                        <p className="text-xs text-gray-600">No ISBN found for this result.</p>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Copies:</span>
                      <input
                        value={olCopies}
                        onChange={(e) => setOlCopies(e.target.value)}
                        className="h-10 w-24 px-3 rounded-lg border border-gray-200 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Genre:</span>
                      <select
                        value={olGenre}
                        onChange={(e) => setOlGenre(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-gray-200 text-sm bg-white"
                      >
                        <option value="">Select...</option>
                        {LIBRARY_GENRES.filter((g) => g !== 'All').map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setOlSelected(null)}
                        className="h-10 px-4 rounded-lg border border-gray-200 text-sm"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={saving || olIsbnLoading}
                        onClick={submitOpenLibrary}
                        className="h-10 px-4 rounded-lg bg-black text-white text-sm"
                      >
                        {saving ? 'Saving...' : 'Add Book'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : olLoading ? (
                <div className="text-sm text-gray-600">Searching...</div>
              ) : olQuery.trim() ? (
                <div className="max-h-[45vh] overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-xl">
                  {olResults.map((doc) => (
                    <button
                      type="button"
                      key={doc.key}
                      className="w-full text-left p-3 hover:bg-gray-50"
                      onClick={() => {
                        setOlSelected(doc)
                        setOlResolvedIsbn(null)
                        const direct = pickOlIsbn(doc)
                        if (!direct) {
                          resolveIsbnFromEditions(doc).then((resolved) => {
                            setOlResolvedIsbn(resolved)
                            if (!resolved) {
                              setSaveError('Selected book has no ISBN available from OpenLibrary.')
                            }
                          })
                        }
                      }}
                    >
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{doc.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {(doc.author_name ?? []).slice(0, 3).join(', ') || 'Unknown author'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{doc.first_publish_year ?? 'Year unknown'}</p>
                    </button>
                  ))}
                  {olResults.length === 0 ? (
                    <div className="p-3 text-sm text-gray-600">No results</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-gray-600">Type to search for a book.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateCollectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create Collection</h2>
              <button
                onClick={() => setShowCreateCollectionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {saveError ? (
              <div className="mb-3 text-sm text-red-600">{saveError}</div>
            ) : null}

            <div className="space-y-3">
              <input
                value={collectionForm.name}
                onChange={(e) => setCollectionForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Collection name"
                className="w-full h-11 px-3 rounded-lg border border-gray-200 text-sm"
              />
              <textarea
                value={collectionForm.description}
                onChange={(e) => setCollectionForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description (optional)"
                className="w-full min-h-20 px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateCollectionModal(false)}
                className="h-10 px-4 rounded-lg border border-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={createCollection}
                className="h-10 px-4 rounded-lg bg-black text-white text-sm"
              >
                {saving ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement

import axios from 'axios'
import { ArrowRight01Icon, Layout01Icon, Search01Icon, Add01Icon } from 'hugeicons-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import 'react-lazy-load-image-component/src/effects/blur.css'
import { LIBRARY_GENRES } from '../constants/genres'

const popularIsbns = ['9780857197689', '9781847941831','9781612680019', '9780062457714', '1929194013']

type OpenLibraryIsbnResponse = {
  title?: string
  publish_date?: string
  number_of_pages?: number
  publishers?: string[]
  authors?: Array<{ key: string }>
}

type OpenLibraryAuthorResponse = {
  name?: string
}

type PopularBook = {
  isbn: string
  title: string
  authors: string[]
  publishDate: string | null
  pages: number | null
  publishers: string[]
  coverUrl: string | null
}

type BookCategory = {
  name: string
  title: string
  coverUrl: string
}

type DbBook = {
  id: string
  isbn: string
  title: string
  authors: string[]
  genre: string | null
  cover_url: string | null
}

type DbBooksListResponse = {
  items: DbBook[]
  page: number
  limit: number
  total: number
  totalPages: number
}

type Borrower = {
  id: string
  first_name: string
  last_name: string
  membership_id: string
  email: string
}

type BorrowersListResponse = {
  items: Borrower[]
  page: number
  limit: number
  total: number
  totalPages: number
}

const api = axios.create({
  baseURL: 'http://localhost:5000',
})

const BookCatalog = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const [popular, setPopular] = useState<PopularBook[]>([])
  const [loadingPopular, setLoadingPopular] = useState(false)
  const urlQuery = params.get('q') ?? ''
  const urlGenre = params.get('genre') ?? 'All'
  const [searchQuery, setSearchQuery] = useState(urlQuery)
  const [selectedGenre, setSelectedGenre] = useState(urlGenre)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<DbBook[]>([])

  const [borrowModalOpen, setBorrowModalOpen] = useState(false)
  const [borrowBook, setBorrowBook] = useState<DbBook | null>(null)
  const [borrowerQuery, setBorrowerQuery] = useState('')
  const [borrowers, setBorrowers] = useState<Borrower[]>([])
  const [borrowersLoading, setBorrowersLoading] = useState(false)
  const [selectedBorrowerId, setSelectedBorrowerId] = useState('')
  const [borrowDate, setBorrowDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })
  const [borrowing, setBorrowing] = useState(false)
  const [borrowError, setBorrowError] = useState<string | null>(null)

  const isSearchRoute = location.pathname.startsWith('/books/search')
  const trimmedQuery = useMemo(() => searchQuery.trim(), [searchQuery])
  const isSearching = isSearchRoute || Boolean(trimmedQuery)

  const bookCategories: BookCategory[] = [
    {
      name: 'history',
      title: 'History',
      coverUrl:
      'https://www.publishersweekly.com/cover/9780393059748',
    },
    {
      name: 'self-improvement',
      title: 'Self-Improvement',
      coverUrl:
      'https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1620206225i/39330937.jpg',
    },
    {
      name: 'money-investing',
      title: 'Money / Investing',
      coverUrl:
        'https://lh3.googleusercontent.com/boyMq552w0yHYxxLiMbSD6rl-F88lqabf8w_rArtRiw-nMQPmmeWnIEcR8aa3FsEZR7XiIg7YI2IdKxR6Qs3q_D9QdiK7ffFVVZrlyvalCsn1Nu7',
    },
    {
      name: 'business',
      title: 'Business',
      coverUrl:
      'https://hbr.org/resources/images/products/11323_500.png',
    },
    {
      name: 'romance',
      title: 'Romance',
      coverUrl:
      'https://covers.openlibrary.org/b/id/540723-M.jpg',
    },
    {
      name: 'kids',
      title: 'Kids',
      coverUrl:
        'https://covers.openlibrary.org/b/id/426382-M.jpg',
    },
  ]
  
  useEffect(() => {
    let cancelled = false
    
    const fetchPopular = async () => {
      try {
        setLoadingPopular(true)
        const results = await Promise.all(
          popularIsbns.map(async (isbn) => {
            try {
              const { data } = await axios.get<OpenLibraryIsbnResponse>(
                `https://openlibrary.org/isbn/${isbn}.json`,
              )

              const authorNames = await Promise.all(
                (data.authors ?? []).map(async (a) => {
                  try {
                    const { data: author } = await axios.get<OpenLibraryAuthorResponse>(
                      `https://openlibrary.org${a.key}.json`,
                    )
                    return author.name ?? null
                  } catch {
                    return null
                  }
                }),
              )

              return {
                isbn,
                title: data.title ?? 'Untitled',
                authors: authorNames.filter((n): n is string => Boolean(n)),
                publishDate: data.publish_date ?? null,
                pages: data.number_of_pages ?? null,
                publishers: data.publishers ?? [],
                coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
              } satisfies PopularBook
            } catch {
              return {
                isbn,
                title: 'Untitled',
                authors: [],
                publishDate: null,
                pages: null,
                publishers: [],
                coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
              } satisfies PopularBook
            }
          }),
        )

        if (!cancelled) {
          setPopular(results)
        }
      } catch {
        if (!cancelled) {
          setPopular([])
        }
      } finally {
        if (!cancelled) {
          setLoadingPopular(false)
        }
      }
    }

    fetchPopular()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSearchQuery(urlQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery])

  useEffect(() => {
    setSelectedGenre(urlGenre)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlGenre])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const effectiveGenre = selectedGenre && selectedGenre !== 'All' ? selectedGenre : null

      if (!isSearchRoute || (!trimmedQuery && !effectiveGenre)) {
        setSearchResults([])
        return
      }

      try {
        setSearchLoading(true)
        const { data } = await api.get<DbBooksListResponse>('/api/books', {
          params: {
            ...(trimmedQuery ? { q: trimmedQuery } : {}),
            ...(effectiveGenre ? { genre: effectiveGenre } : {}),
            limit: 24,
          },
        })
        if (!cancelled) setSearchResults(data.items ?? [])
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }

    const t = setTimeout(run, 300)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [isSearchRoute, trimmedQuery, selectedGenre])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!borrowModalOpen) return
      try {
        setBorrowersLoading(true)
        const q = borrowerQuery.trim()
        const { data } = await api.get<BorrowersListResponse>('/api/borrowers', {
          params: q ? { q, limit: 50 } : { limit: 50 },
        })
        if (!cancelled) setBorrowers(data.items ?? [])
      } catch {
        if (!cancelled) setBorrowers([])
      } finally {
        if (!cancelled) setBorrowersLoading(false)
      }
    }

    const t = setTimeout(run, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [borrowModalOpen, borrowerQuery])

  const openBorrowModal = (book: DbBook) => {
    setBorrowError(null)
    setBorrowBook(book)
    setBorrowModalOpen(true)
    setBorrowerQuery('')
    setBorrowers([])
    setSelectedBorrowerId('')
    setBorrowDate(new Date().toISOString().slice(0, 10))
    const d = new Date()
    d.setDate(d.getDate() + 14)
    setDueDate(d.toISOString().slice(0, 10))
  }

  const submitBorrow = async () => {
    if (!borrowBook) return
    if (!selectedBorrowerId) {
      setBorrowError('Please select a member')
      return
    }
    try {
      setBorrowing(true)
      setBorrowError(null)

      await api.post('/api/loans', {
        copy_id: borrowBook.id,
        borrower_id: selectedBorrowerId,
        borrow_date: borrowDate,
        due_date: dueDate,
      })

      setBorrowModalOpen(false)
      setBorrowBook(null)
    } catch (e: any) {
      setBorrowError(e?.response?.data?.message || 'Failed to create loan')
    } finally {
      setBorrowing(false)
    }
  }

  const updateSearch = (nextValue: string) => {
    setSearchQuery(nextValue)
    const nextTrimmed = nextValue.trim()
    const genre = selectedGenre && selectedGenre !== 'All' ? selectedGenre : ''

    if (!nextTrimmed) {
      const nextParams = new URLSearchParams(params)
      nextParams.delete('q')
      if (genre) nextParams.set('genre', genre)
      else nextParams.delete('genre')
      setParams(nextParams, { replace: true })
      navigate('/books', { replace: true })
      return
    }

    const nextParams = new URLSearchParams(params)
    nextParams.set('q', nextTrimmed)
    if (genre) nextParams.set('genre', genre)
    else nextParams.delete('genre')
    setParams(nextParams, { replace: true })
    if (!isSearchRoute) {
      navigate(`/books/search?${nextParams.toString()}`, { replace: true })
    }
  }

  return (
    <div className="">
      <div className="bg-yellow-100 rounded-bl-[90px] w-full relative px-7 p-3 h-[53vh]">
        <h1 className="text-3xl font-bold my-4">Discover</h1>
        <div className="flex items-center bg-white w-[534px] px-1 rounded-lg">
          <select
            name="category"
            id="category"
            value={selectedGenre}
            onChange={(e) => {
              const nextGenre = e.target.value
              setSelectedGenre(nextGenre)

              const q = searchQuery.trim()
              const effectiveGenre = nextGenre && nextGenre !== 'All' ? nextGenre : ''
              const next = new URLSearchParams()
              if (q) next.set('q', q)
              if (effectiveGenre) next.set('genre', effectiveGenre)
              setParams(next, { replace: true })
            }}
            className="h-full py-4 px-1 outline-none border-r border-gray-100"
          >
            {LIBRARY_GENRES.map((g) => (
              <option key={g} value={g}>
                {g === 'All' ? 'All Genres' : g}
              </option>
            ))}
          </select>
          
          <div className="flex items-center px-4 h-full">
            <Search01Icon/>
            <input 
              type="text" 
              placeholder="Search books..." 
              value={searchQuery}
              onChange={(e) => updateSearch(e.target.value)}
              onFocus={() => {
                if (!isSearchRoute) navigate('/books/search', { replace: true })
              }}
              className="p-4 outline-none" 
            />
            <button
              type="button"
              onClick={() => {
                const q = searchQuery.trim()
                const genre = selectedGenre && selectedGenre !== 'All' ? selectedGenre : ''
                const next = new URLSearchParams()
                if (q) next.set('q', q)
                if (genre) next.set('genre', genre)
                navigate(next.toString() ? `/books/search?${next.toString()}` : '/books/search')
              }}
              className="bg-black p-3 text-sm text-white rounded-xl font-light w-[110px]"
            >
              Search
            </button>
          </div> 
        </div>
        
        <div>
          <div className="mt-10 flex justify-between items-center">
            <h1 className="text-lg font-medium">Book Recommendations</h1>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg cursor-pointer">
              <p>View all</p>
              <ArrowRight01Icon />
            </div>
          </div>
        </div>
        
        <div className="mt-5">
          {isSearching ? (
            <div className="bg-white/70 border border-black/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  {trimmedQuery ? `Results for "${trimmedQuery}"` : 'Start typing to search'}
                </p>
                <button
                  type="button"
                  className="text-sm text-gray-700 hover:text-gray-900"
                  onClick={() => updateSearch('')}
                >
                  Clear
                </button>
              </div>

              <div className="mt-4">
                {searchLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 flex gap-4">
                        <div className="w-16 h-24 bg-gray-200 rounded" />
                        <div className="flex-1">
                          <div className="h-4 w-3/4 bg-gray-200 rounded" />
                          <div className="mt-2 h-3 w-1/2 bg-gray-200 rounded" />
                          <div className="mt-4 h-3 w-1/3 bg-gray-200 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : trimmedQuery ? (
                  searchResults.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchResults.map((doc) => (
                        <div key={doc.id} className="rounded-xl border border-gray-200 bg-white p-4 flex gap-4 relative">
                          <button
                            type="button"
                            onClick={() => openBorrowModal(doc)}
                            className="absolute right-3 top-3 h-9 w-9 rounded-full bg-black text-white flex items-center justify-center shadow hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black/30"
                            aria-label="Borrow book"
                          >
                            <Add01Icon size={18} />
                          </button>
                          <div className="w-16 h-24 bg-gray-100 rounded overflow-hidden shrink-0">
                            {doc.cover_url ? (
                              <LazyLoadImage
                                src={doc.cover_url}
                                alt={doc.title}
                                className="w-full h-full object-cover"
                                effect="blur"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-2">{doc.title}</p>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              {(doc.authors ?? []).slice(0, 2).join(', ') || 'Unknown author'}
                            </p>
                            {doc.genre ? <p className="text-xs text-gray-500 mt-2">{doc.genre}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No results found.</div>
                  )
                ) : (
                  <div className="text-sm text-gray-600">Start typing to search.</div>
                )}
              </div>
            </div>
          ) : loadingPopular ? (
            <div className="flex gap-8 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="w-48 shrink-0 animate-pulse">
                  <div className="w-50 h-[260px] overflow-hidden bg-white border border-black/10">
                    <div className="h-full w-full bg-gray-200" />
                  </div>
                  <div className="mt-2 h-4 w-40 bg-gray-200 rounded" />
                  <div className="mt-2 h-3 w-28 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-8 overflow-x-auto pb-2">
              {popular.map((book) => (
                <div key={book.isbn} className="w-48 shrink-0">
                  <div className="w-50 h-[260px] overflow-hidden bg-white border border-black/10">
                    {book.coverUrl ? (
                      <LazyLoadImage
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                        effect="blur"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                        No cover
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900 line-clamp-2">{book.title}</p>
                  {book.authors.length > 0 && (
                    <p className="text-xs text-gray-600 line-clamp-1">{book.authors.join(', ')}</p>
                  )}
                  {/* <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    {book.publishDate && <p>Published: {book.publishDate}</p>}
                    {book.pages && <p>Pages: {book.pages}</p>}
                    {book.publishers.length > 0 && <p className="line-clamp-1">{book.publishers.join(', ')}</p>}
                    <p>ISBN: {book.isbn}</p>
                  </div> */}
                </div>
              ))}
            </div>
          )}

          {!isSearching && (
            <>
              <div className="py-10">
                <div className="flex justify-between items-center mb-20">
                  <p className="text-lg font-medium mb-4">Book Categories</p>
                  <div className="bg-gray-100 rounded-xl p-2">
                    <Layout01Icon size={17} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {bookCategories.map((category) => (
                    <Link
                      key={category.name}
                      to="/books"
                      className="relative block w-40 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
                      aria-label={`Browse ${category.title}`}
                    >
                      <LazyLoadImage
                        src={category.coverUrl}
                        alt={category.title}
                        effect="blur"
                        wrapperClassName="absolute bottom-9 right-[-40px] -translate-x-1/2 w-20 "
                        className="w-full h-full object-contain"
                      />
                      <div className="bg-gray-200 h-[70px] w-full rounded-t-xl" />
                      <div className="bg-white py-2">
                        <p className="text-center block text-sm font-light px-2 line-clamp-1">{category.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pb-10">
                <div className="flex justify-between items-center">
                  <h1 className="text-lg font-medium">Most Popular</h1>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg cursor-pointer">
                    <p>View all</p>
                    <ArrowRight01Icon />
                  </div>
                </div>

                <div className="mt-5">
                  {loadingPopular ? (
                    <div className="flex gap-8 overflow-x-auto pb-2">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className="w-48 shrink-0 animate-pulse">
                          <div className="w-50 h-[260px] overflow-hidden bg-white border border-black/10">
                            <div className="h-full w-full bg-gray-200" />
                          </div>
                          <div className="mt-2 h-4 w-40 bg-gray-200 rounded" />
                          <div className="mt-2 h-3 w-28 bg-gray-200 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-8 overflow-x-auto pb-2">
                      {popular.map((book) => (
                        <div key={book.isbn} className="w-48 shrink-0">
                          <div className="w-50 h-[260px] overflow-hidden bg-white border border-black/10">
                            {book.coverUrl ? (
                              <LazyLoadImage
                                src={book.coverUrl}
                                alt={book.title}
                                className="w-full h-full object-cover"
                                effect="blur"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">
                                No cover
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-medium text-gray-900 line-clamp-2">{book.title}</p>
                          {book.authors.length > 0 && (
                            <p className="text-xs text-gray-600 line-clamp-1">{book.authors.join(', ')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {borrowModalOpen && borrowBook ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-gray-600">Borrow book</p>
                <h2 className="text-lg font-semibold text-gray-900 truncate">{borrowBook.title}</h2>
                <p className="text-xs text-gray-500 mt-1">ISBN: {borrowBook.isbn}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBorrowModalOpen(false)
                  setBorrowBook(null)
                }}
                className="h-9 w-9 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              {borrowError ? <div className="text-sm text-red-600">{borrowError}</div> : null}

              <div>
                <label className="block text-sm font-medium text-gray-900">Member</label>
                <input
                  value={borrowerQuery}
                  onChange={(e) => setBorrowerQuery(e.target.value)}
                  placeholder="Search member (name, email, membership id...)"
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-black/40 focus:ring-2 focus:ring-black/10"
                />
                <select
                  value={selectedBorrowerId}
                  onChange={(e) => setSelectedBorrowerId(e.target.value)}
                  className="mt-2 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm bg-white"
                >
                  <option value="">Select a member...</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.first_name} {b.last_name} ({b.membership_id})
                    </option>
                  ))}
                </select>
                {borrowersLoading ? <div className="mt-2 text-xs text-gray-500">Loading members...</div> : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900">Borrow date</label>
                  <input
                    type="date"
                    value={borrowDate}
                    onChange={(e) => setBorrowDate(e.target.value)}
                    className="mt-2 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900">Due date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-2 w-full h-11 px-3 rounded-xl border border-gray-200 text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-200 flex items-center justify-end gap-2 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setBorrowModalOpen(false)
                  setBorrowBook(null)
                }}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={borrowing}
                onClick={submitBorrow}
                className="h-10 px-4 rounded-xl bg-black text-white text-sm disabled:opacity-60"
              >
                {borrowing ? 'Borrowing...' : 'Confirm Borrow'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default BookCatalog

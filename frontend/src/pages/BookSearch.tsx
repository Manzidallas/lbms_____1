import axios from 'axios'
import { ArrowLeft01Icon, Search01Icon } from 'hugeicons-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LazyLoadImage } from 'react-lazy-load-image-component'
import 'react-lazy-load-image-component/src/effects/blur.css'

type OpenLibrarySearchDoc = {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  edition_count?: number
}

type OpenLibrarySearchResponse = {
  docs: OpenLibrarySearchDoc[]
}

const BookSearch = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const initialQuery = params.get('q') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<OpenLibrarySearchDoc[]>([])

  const trimmedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(params)
      if (trimmedQuery) {
        next.set('q', trimmedQuery)
      } else {
        next.delete('q')
      }
      setParams(next, { replace: true })
    }, 250)

    return () => clearTimeout(timeout)
  }, [trimmedQuery, params, setParams])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!trimmedQuery) {
        setResults([])
        return
      }

      try {
        setLoading(true)
        const { data } = await axios.get<OpenLibrarySearchResponse>(
          `https://openlibrary.org/search.json?q=${encodeURIComponent(trimmedQuery)}&limit=24`,
        )

        if (!cancelled) setResults(data.docs ?? [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [trimmedQuery])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft01Icon size={18} />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-sm text-gray-600 mt-1">Find books by title or author</p>
      </div>

      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 h-12">
        <Search01Icon size={18} className="text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search books..."
          className="w-full h-full outline-none text-sm"
        />
      </div>

      <div>
        {loading ? (
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
          results.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((doc) => {
                const coverUrl = doc.cover_i
                  ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                  : null

                return (
                  <div key={doc.key} className="rounded-xl border border-gray-200 bg-white p-4 flex gap-4">
                    <div className="w-16 h-24 bg-gray-100 rounded overflow-hidden shrink-0">
                      {coverUrl ? (
                        <LazyLoadImage
                          src={coverUrl}
                          alt={doc.title}
                          className="w-full h-full object-cover"
                          effect="blur"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{doc.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {(doc.author_name ?? []).slice(0, 2).join(', ') || 'Unknown author'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {doc.first_publish_year ? `First published ${doc.first_publish_year}` : 'Year unknown'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-600">No results found.</div>
          )
        ) : (
          <div className="text-sm text-gray-600">Start typing to search.</div>
        )}
      </div>
    </div>
  )
}

export default BookSearch

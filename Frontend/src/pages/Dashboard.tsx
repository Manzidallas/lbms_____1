import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Book02Icon,
  BookOpen01Icon,
  Clock01Icon,
  UserCircleIcon,
} from 'hugeicons-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
})

type PopularBookRow = {
  book: {
    id: string
    title: string
    authors?: string[]
    cover_url?: string | null
  }
  borrowCount: number
}

type PopularBooksResponse = {
  items: PopularBookRow[]
}

type BookHistoryItem = {
  id: string
  book_id: any
  action: 'create' | 'update' | 'delete'
  message: string
  createdAt?: string
}

type BookHistoryListResponse = {
  items: BookHistoryItem[]
}

type LoanHistoryItem = {
  id: string
  borrower_id: any
  action: 'borrow' | 'return'
  message: string
  book?: { title?: string } | null
  createdAt?: string
}

type LoanHistoryListResponse = {
  items: LoanHistoryItem[]
}

type BorrowerHistoryItem = {
  id: string
  borrower_id: any
  action: 'create' | 'update' | 'delete'
  message: string
  createdAt?: string
}

type BorrowerHistoryListResponse = {
  items: BorrowerHistoryItem[]
}

type RecentActivityItem = {
  id: string
  text: string
  time: string
  icon: ReactNode
}

type StatsResponse = {
  totalBooks: number
  activeBorrowers: number
  booksBorrowedToday: number
  pendingReturns: number
}

function relativeTimeLabel(dateString: string | undefined) {
  if (!dateString) return ''
  const t = new Date(dateString).getTime()
  if (!Number.isFinite(t)) return ''
  const diffMs = Date.now() - t
  const diffSec = Math.max(0, Math.floor(diffMs / 1000))
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hours ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} days ago`
}

const StatCard = ({
  icon,
  iconBgClassName,
  trend,
  metricLabel,
  metricValue,
}: {
  icon: ReactNode
  iconBgClassName: string
  trend?: {
    text: string
    direction: 'up' | 'down'
    toneClassName: string
  }
  metricLabel: string
  metricValue: string
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${iconBgClassName}`}>{icon}</div>

        {trend ? (
          <div
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${trend.toneClassName}`}
          >
            {trend.direction === 'up' ? <ArrowUp01Icon size={14} /> : <ArrowDown01Icon size={14} />}
            <span>{trend.text}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-sm text-gray-600">{metricLabel}</p>
        <p className="text-2xl font-semibold text-gray-900">{metricValue}</p>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const [popularBooks, setPopularBooks] = useState<PopularBookRow[]>([])
  const [popularLoading, setPopularLoading] = useState(false)
  const [popularError, setPopularError] = useState<string | null>(null)

  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])
  const [recentLoading, setRecentLoading] = useState(false)
  const [recentError, setRecentError] = useState<string | null>(null)

  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  useEffect(() => {
    const loadRecent = async () => {
      try {
        setRecentLoading(true)
        setRecentError(null)
        const [booksRes, loansRes, borrowersRes] = await Promise.all([
          api.get<BookHistoryListResponse>('/api/books/history', { params: { limit: 20 } }),
          api.get<LoanHistoryListResponse>('/api/loans/history', { params: { limit: 20 } }),
          api.get<BorrowerHistoryListResponse>('/api/borrowers/history', { params: { limit: 20 } }),
        ])

        const bookRows = (booksRes.data.items ?? []).map((h) => ({
          kind: 'book' as const,
          createdAt: h.createdAt ?? '',
          item: h,
        }))
        const loanRows = (loansRes.data.items ?? []).map((h) => ({
          kind: 'loan' as const,
          createdAt: h.createdAt ?? '',
          item: h,
        }))

        const borrowerRows = (borrowersRes.data.items ?? []).map((h) => ({
          kind: 'borrower' as const,
          createdAt: h.createdAt ?? '',
          item: h,
        }))

        const merged = [...bookRows, ...loanRows, ...borrowerRows]
          .sort((a, b) => {
            const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return tb - ta
          })
          .slice(0, 5)
          .map((row) => {
            if (row.kind === 'loan') {
              const h = row.item as LoanHistoryItem
              const title = h.book?.title ? `"${h.book.title}"` : 'a book'
              const verb = h.action === 'borrow' ? 'was borrowed' : 'was returned'
              return {
                id: `loan-${h.id}`,
                text: `Book ${title} ${verb}`,
                time: relativeTimeLabel(h.createdAt),
                icon: <BookOpen01Icon size={18} />,
              }
            }

            if (row.kind === 'borrower') {
              const h = row.item as BorrowerHistoryItem
              const name =
                h.borrower_id && typeof h.borrower_id === 'object'
                  ? `${h.borrower_id.first_name ?? ''} ${h.borrower_id.last_name ?? ''}`.trim()
                  : ''
              const suffix = name ? `: ${name}` : ''
              return {
                id: `borrower-${h.id}`,
                text: `${h.message}${suffix}`,
                time: relativeTimeLabel(h.createdAt),
                icon: <UserCircleIcon size={18} />,
              }
            }

            const h = row.item as BookHistoryItem
            const title =
              h.book_id && typeof h.book_id === 'object' && h.book_id.title ? `"${h.book_id.title}"` : null
            const suffix = title ? `: ${title}` : ''
            return {
              id: `book-${h.id}`,
              text: `${h.message}${suffix}`,
              time: relativeTimeLabel(h.createdAt),
              icon: <Book02Icon size={18} />,
            }
          })

        setRecentActivity(merged)
      } catch (e: any) {
        setRecentError(e?.response?.data?.message || 'Failed to load recent activity')
        setRecentActivity([])
      } finally {
        setRecentLoading(false)
      }
    }

    loadRecent()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setStatsLoading(true)
        setStatsError(null)
        const { data } = await api.get<StatsResponse>('/api/stats')
        setStats(data)
      } catch (e: any) {
        setStatsError(e?.response?.data?.message || 'Failed to load stats')
        setStats(null)
      } finally {
        setStatsLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setPopularLoading(true)
        setPopularError(null)
        const { data } = await api.get<PopularBooksResponse>('/api/books/popular', {
          params: { limit: 5 },
        })
        setPopularBooks(data.items ?? [])
      } catch (e: any) {
        setPopularError(e?.response?.data?.message || 'Failed to load popular books')
        setPopularBooks([])
      } finally {
        setPopularLoading(false)
      }
    }

    load()
  }, [])

  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-md font-light text-gray-600 mt-2">Welcome Back! Administrator</p>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Book02Icon size={22} />}
          iconBgClassName="bg-blue-100"
          trend={{ text: '+12%', direction: 'up', toneClassName: 'bg-green-100 text-green-800' }}
          metricLabel="Total Books"
          metricValue={statsLoading ? '...' : statsError ? 'Error' : stats?.totalBooks?.toString() ?? '0'}
        />

        <StatCard
          icon={<UserCircleIcon size={22} />}
          iconBgClassName="bg-purple-100"
          trend={{ text: '+8%', direction: 'up', toneClassName: 'bg-green-100 text-green-800' }}
          metricLabel="Active Borrowers"
          metricValue={statsLoading ? '...' : statsError ? 'Error' : stats?.activeBorrowers?.toString() ?? '0'}
        />

        <StatCard
          icon={<BookOpen01Icon size={22} />}
          iconBgClassName="bg-green-100"
          trend={{ text: '+25%', direction: 'up', toneClassName: 'bg-green-100 text-green-800' }}
          metricLabel="Books Borrowed Today"
          metricValue={statsLoading ? '...' : statsError ? 'Error' : stats?.booksBorrowedToday?.toString() ?? '0'}
        />

        <StatCard
          icon={<Clock01Icon size={22} />}
          iconBgClassName="bg-orange-100"
          trend={{
            text: '23 Overdue',
            direction: 'down',
            toneClassName: 'bg-red-100 text-red-800',
          }}
          metricLabel="Pending Returns"
          metricValue={statsLoading ? '...' : statsError ? 'Error' : stats?.pendingReturns?.toString() ?? '0'}
        />
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recentLoading ? <div className="text-sm text-gray-600">Loading activity...</div> : null}
            {recentError ? <div className="text-sm text-red-600">{recentError}</div> : null}
            {!recentLoading && !recentError ? (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="rounded-lg bg-blue-100 text-blue-700 p-2">{item.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.text}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.time}</p>
                  </div>
                </div>
              ))
            ) : null}

            {!recentLoading && !recentError && recentActivity.length === 0 ? (
              <div className="text-sm text-gray-600">No activity yet.</div>
            ) : null}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className=" items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900">Popular Books</h2>
            </div>
          </div>

          <div className="mt-4 space-y-5 relative">
            {popularLoading ? (
              <div className="text-sm text-gray-600">Loading popular books...</div>
            ) : null}
            {popularError ? <div className="text-sm text-red-600">{popularError}</div> : null}
            {!popularLoading && !popularError ? (
              popularBooks.map((row, idx) => {
                const author = (row.book?.authors ?? []).slice(0, 2).join(', ')
                return (
                  <div
                    key={row.book.id}
                    className="flex items-center gap-3 border border-gray-200 bg-gray-50 p-3 pl-12 relative"
                  >
                    <div
                      className="text-8xl font-bold absolute left-[-17px] top-[80px] -translate-y-1/2 text-transparent pointer-events-none z-0 leading-none"
                      style={{ WebkitTextStroke: '1px rgb(0 0 0)' }}
                    >
                      {idx + 1}
                    </div>
                    <div className="absolute z-20 left-3 w-[45px] h-16 rounded bg-white border border-gray-200 overflow-hidden">
                      {row.book.cover_url ? (
                        <img
                          src={row.book.cover_url}
                          alt={row.book.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                          No cover
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 relative z-10 ml-4 ">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{row.book.title}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                        {author || 'Unknown author'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Borrowed {row.borrowCount} times</p>
                    </div>
                  </div>
                )
              })
            ) : null}

            {!popularLoading && !popularError && popularBooks.length === 0 ? (
              <div className="text-sm text-gray-600">No borrow history yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard;

import { useState, useEffect } from "react"
import { Search01Icon, BookOpen01Icon, User03Icon, Analytics01Icon, ArrowDown02Icon, ArrowUp01Icon, FilterIcon } from "hugeicons-react"

interface AnalyticsData {
  totalBooks: number
  totalBorrowers: number
  activeBorrowings: number
  overdueBooks: number
  monthlyBorrowings: number[]
  popularCategories: { name: string; count: number }[]
  recentActivity: { id: string; type: string; description: string; time: string }[]
}

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Mock analytics data
    const mockData: AnalyticsData = {
      totalBooks: 1247,
      totalBorrowers: 523,
      activeBorrowings: 187,
      overdueBooks: 23,
      monthlyBorrowings: [145, 162, 178, 195, 187, 203, 218, 195, 182, 174, 189, 203],
      popularCategories: [
        { name: 'Fiction', count: 423 },
        { name: 'Non-Fiction', count: 312 },
        { name: 'Science', count: 198 },
        { name: 'History', count: 156 },
        { name: 'Technology', count: 158 }
      ],
      recentActivity: [
        { id: '1', type: 'borrow', description: 'John Doe borrowed "The Great Gatsby"', time: '2 hours ago' },
        { id: '2', type: 'return', description: 'Jane Smith returned "1984"', time: '3 hours ago' },
        { id: '3', type: 'new', description: 'New borrower registered: Mike Johnson', time: '5 hours ago' },
        { id: '4', type: 'overdue', description: '3 books are now overdue', time: '6 hours ago' },
        { id: '5', type: 'borrow', description: 'Sarah Wilson borrowed "To Kill a Mockingbird"', time: '8 hours ago' }
      ]
    }
    setAnalyticsData(mockData)
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'borrow': return <BookOpen01Icon size={16} className="text-blue-500" />
      case 'return': return <BookOpen01Icon size={16} className="text-green-500" />
      case 'new': return <User03Icon size={16} className="text-purple-500" />
      case 'overdue': return <Analytics01Icon size={16} className="text-red-500" />
      default: return <BookOpen01Icon size={16} className="text-gray-500" />
    }
  }

  if (!analyticsData) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-black">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">Library performance insights and statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search analytics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['week', 'month', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                  timeRange === range
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BookOpen01Icon size={24} className="text-blue-600" />
            </div>
            <div className="flex items-center text-green-600 text-sm">
              <ArrowUp01Icon size={16} />
              <span className="ml-1">+12%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{analyticsData.totalBooks.toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mt-1">Total Books</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <User03Icon size={24} className="text-purple-600" />
            </div>
            <div className="flex items-center text-green-600 text-sm">
              <ArrowUp01Icon size={16} />
              <span className="ml-1">+8%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{analyticsData.totalBorrowers.toLocaleString()}</h3>
          <p className="text-sm text-gray-600 mt-1">Total Borrowers</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BookOpen01Icon size={24} className="text-green-600" />
            </div>
            <div className="flex items-center text-red-600 text-sm">
              <ArrowDown02Icon size={16} />
              <span className="ml-1">-3%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{analyticsData.activeBorrowings}</h3>
          <p className="text-sm text-gray-600 mt-1">Active Borrowings</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <ArrowUp01Icon size={24} className="text-red-600" />
            </div>
            <div className="flex items-center text-red-600 text-sm">
              <ArrowUp01Icon size={16} />
              <span className="ml-1">+5%</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{analyticsData.overdueBooks}</h3>
          <p className="text-sm text-gray-600 mt-1">Overdue Books</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Borrowings Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Borrowings</h2>
            <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <FilterIcon size={16} />
              Filter
            </button>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {analyticsData.monthlyBorrowings.map((value, index) => {
              const maxValue = Math.max(...analyticsData.monthlyBorrowings)
              const height = (value / maxValue) * 100
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center">
                    <span className="text-xs text-gray-600 mb-1">{value}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t-md transition-all hover:bg-blue-600"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{months[index]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Popular Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Popular Categories</h2>
          <div className="space-y-4">
            {analyticsData.popularCategories.map((category, index) => {
              const maxCount = Math.max(...analyticsData.popularCategories.map(c => c.count))
              const width = (category.count / maxCount) * 100
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                    <span className="text-sm text-gray-600">{category.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {analyticsData.recentActivity.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Analytics

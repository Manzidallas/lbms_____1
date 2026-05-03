import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import BookCatalog from './pages/BookCatalog'
import BorrowerManagement from './pages/BorrowerManagement'
import InventoryManagement from './pages/InventoryManagement'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600">
        Loading session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

function AppContent() {
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen">
      {!isLoginPage && (
        <Sidebar collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
      )}
      <main
        className={`min-h-screen transition-[padding-left] duration-300 ease-in-out ${
          isLoginPage ? '' : sidebarCollapsed ? 'pl-[100px]' : 'pl-80'
        }`}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books"
            element={
              <ProtectedRoute>
                <BookCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/books/search"
            element={
              <ProtectedRoute>
                <BookCatalog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/borrowers"
            element={
              <ProtectedRoute>
                <BorrowerManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </Router>
  )
}

export default App

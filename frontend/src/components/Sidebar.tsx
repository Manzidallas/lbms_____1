import {
  Analytics02Icon,
  Bookshelf01Icon,
  DashboardSquare01Icon,
  Logout03Icon,
  Recycle03Icon,
  Search01Icon,
  SidebarLeft01Icon,
  StoreManagement01Icon,
} from 'hugeicons-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type SidebarProps = {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

const Sidebar = ({ collapsed: collapsedProp, onCollapsedChange }: SidebarProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsedInternal, setCollapsedInternal] = useState(false)
  const collapsed = collapsedProp ?? collapsedInternal
  const setCollapsed = (next: boolean | ((prev: boolean) => boolean)) => {
    const computed = typeof next === 'function' ? next(collapsed) : next
    if (collapsedProp === undefined) {
      setCollapsedInternal(computed)
    }
    onCollapsedChange?.(computed)
  }
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <DashboardSquare01Icon/> },
    { path: '/books', label: 'Book Catalog', icon: <Bookshelf01Icon/> },
    { path: '/borrowers', label: 'Borrower Management', icon: <Recycle03Icon/> },
    { path: '/inventory', label: 'Inventory', icon: <StoreManagement01Icon/> },
    { path: '/analytics', label: 'Analytics', icon: <Analytics02Icon/>, disabled: true },
  ]

  return (
    <div
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-slate-700/10 bg-white py-6 overflow-x-hidden transition-[width] duration-300 ease-in-out ${
        collapsed ? 'w-[100px] px-2' : 'w-80 px-6'
      }`}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={`flex relative ${collapsed ? 'justify-center' : 'justify-between'} items-center mb-4 mt-2 transition-[transform, opacity] duration-300 ease-in-out ${
        collapsed ? 'opacity-100' : 'opacity-100'
      }`}>
        <h2
          className={`text-md font-light text-black transition-opacity duration-300 ${
            !collapsed ? 'opacity-100' : 'opacity-0 hidden pointer-events-none'
          }`}
          style={{ transform: collapsed ? 'translateX(0)' : 'translateX(0%)' }}
        >
          LBMS
        </h2>
        <button
          type='button'
          onClick={() => setCollapsed((v) => !v)}
          className='shrink-0 rounded-lg p-1 text-gray-700 transition hover:bg-gray-100'
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <SidebarLeft01Icon />
        </button>
      </div>
      
      <div className='bg-gray-200 rounded-xl py-2 px-2 flex items-center gap-2 mb-4'>
        <div className='bg-white p-2 rounded-xl'>
          <Search01Icon size={20} />
        </div>
        {!collapsed && (
          <input type="text" placeholder='Search.....' className='bg-transparent outline-none' />
        )}
      </div>

      <nav>
        <p className={`mb-4 text-sm text-gray-800 font-semibold ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>Navigation</p>
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              {item.disabled ? (
                <div
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-4 text-md transition text-gray-400 cursor-not-allowed ${
                    collapsed ? 'justify-center px-6 py-2' : ''
                  }`}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center text-gray-400">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <div className="flex items-center gap-2">
                      <span className="whitespace-nowrap">{item.label}</span>
                      <div className="bg-black text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                        Coming soon
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-4 text-md transition ${
                    location.pathname === item.path
                      ? 'bg-gray-300 text-black'
                      : 'text-gray-500 hover:bg-gray-300 hover:text-white'
                  } ${
                    collapsed ? 'justify-center px-6 py-2' : ''
                  }`}
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center ${
                      location.pathname === item.path
                        ? 'text-black '
                        : 'text-gray-500 group-hover:text-white'
                    }`}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className='whitespace-nowrap'>{item.label}</span>}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
      </div>

      <div className="mt-auto shrink-0 border-t border-gray-200 pt-4">
        {!collapsed && user ? (
          <p className="mb-3 truncate px-1 text-xs text-gray-500" title={user.email}>
            {user.email}
          </p>
        ) : null}
        <button
          type="button"
          onClick={async () => {
            await logout()
            navigate('/login', { replace: true })
          }}
          className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-md font-medium text-white transition bg-black hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 ${
            collapsed ? 'justify-center px-3 py-3' : ''
          }`}
        >
          <span className="inline-flex h-5 w-5 items-center justify-center text-white">
            <Logout03Icon />
          </span>
          {!collapsed && <span className="whitespace-nowrap">Log out</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar

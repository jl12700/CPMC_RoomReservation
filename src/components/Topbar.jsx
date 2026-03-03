// Topbar.jsx
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { Calendar, LogOut } from 'lucide-react'

export function Topbar() {
  const [now, setNow] = useState(new Date())
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const { user, signOut } = useAuth()

  
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

 
  const getInitials = () => {
    if (!user?.email) return 'U'
    const localPart = user.email.split('@')[0]
    const parts = localPart.split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return localPart.substring(0, 2).toUpperCase()
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setDropdownOpen(false)
    }
  }

  const formattedDate = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })


  const formattedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <header className="sticky top-0 z-10 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
     
      <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
        <div className="p-1.5 bg-blue-100 rounded-md">
          <Calendar className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-blue-600">Today</span>
          <span className="text-xs font-semibold text-gray-800">
            {formattedDate} • {formattedTime}
          </span>
        </div>
      </div>

      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 border border-transparent hover:border-gray-200 focus:outline-none"
          aria-label="User menu"
          aria-expanded={dropdownOpen}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md text-sm">
            {getInitials()}
          </div>
          <div className="cursor-pointer hidden md:block text-left">
            <div className="text-sm font-semibold text-gray-900 leading-tight">
              {user?.email?.split('@')[0] || 'User'}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[160px]">
              {user?.email}
            </div>
          </div>
          <svg
            className={`cursor-pointer w-4 h-4 text-gray-400 transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>


        {dropdownOpen && (
          <div className="cursor-pointer absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1 animate-fade-in z-50">
            <button
              onClick={handleLogout}
              className="cursor-pointer w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </header>
  )
}
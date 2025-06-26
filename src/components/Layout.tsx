import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  Home, 
  MessageCircle, 
  BookOpen, 
  FileText, 
  BarChart3, 
  LogOut,
  Brain
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'TutorBot', href: '/tutor', icon: MessageCircle },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Tests', href: '/tests', icon: FileText },
    { name: 'Performance', href: '/performance', icon: BarChart3 },
    { name: 'Study', href: '/study', icon: BookOpen },
    { name: 'PDFs', href: '/pdfs', icon: FileText },
  ]

  if (!user) {
    return <div className="min-h-screen">{children}</div>
  }

  return (
    <div className="min-h-screen flex bg-white text-black">
      {/* Side Panel Navigation */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-full w-64 glass z-50 shadow-xl border-r border-gray-200 animate-fade-in">
        <div className="flex items-center gap-3 px-8 py-8">
          <Brain className="h-8 w-8 text-black" />
          <span className="text-2xl font-bold text-black tracking-tight">AIVerse LMS</span>
        </div>
        <nav className="flex-1 flex flex-col gap-1 px-4 mt-4">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-5 py-3 rounded-xl font-medium transition-all duration-200 text-base mb-1 hover:bg-white/40 hover:shadow-md ${
                  isActive ? 'bg-white/60 shadow text-black font-bold' : 'text-gray-700'
                }`}
              >
                <item.icon className="h-5 w-5 text-black" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto px-8 pb-8 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-black text-lg font-semibold">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-black font-medium truncate">{user.email}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center px-4 py-2 text-sm text-black hover:bg-white/40 rounded-lg transition-colors border border-gray-200"
          >
            <LogOut className="h-4 w-4 mr-2 text-black" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Topbar Navigation */}
      <aside className="md:hidden w-full glass flex flex-row items-center justify-between px-4 py-3 sticky top-0 z-40 shadow-xl border-b border-gray-200 animate-fade-in">
        <div className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-black" />
          <span className="text-xl font-bold text-black tracking-tight">AIVerse LMS</span>
        </div>
        <nav className="flex gap-1">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition-all duration-200 text-sm hover:bg-white/40 ${
                  isActive ? 'bg-white/60 shadow text-black font-bold' : 'text-gray-700'
                }`}
              >
                <item.icon className="h-5 w-5 text-black" />
              </Link>
            )
          })}
        </nav>
        <button
          onClick={handleSignOut}
          className="flex items-center px-3 py-2 text-sm text-black hover:bg-white/40 rounded-lg transition-colors border border-gray-200"
        >
          <LogOut className="h-4 w-4 mr-2 text-black" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:pl-64 min-h-screen flex flex-col">
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-md p-6 md:p-10 min-h-[70vh]">
            {children}
          </div>
        </div>
        {/* Footer */}
        <footer className="w-full bg-white border-t border-gray-200 py-4 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 text-gray-500 text-sm">
            <div>&copy; {new Date().getFullYear()} AIVerse LMS. All rights reserved.</div>
            <div className="flex gap-4 mt-2 md:mt-0">
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="hover:text-black">GitHub</a>
              <a href="#" className="hover:text-black">Contact</a>
              <a href="#" className="hover:text-black">Privacy Policy</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
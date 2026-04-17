import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStudentStore } from '../../stores/studentStore'
import { useConfigStore } from '../../stores/configStore'

export function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const currentStudent = useStudentStore((s) => s.currentStudent)
  const clearCurrentStudent = useStudentStore((s) => s.clearCurrentStudent)
  const isAdmin = useConfigStore((s) => s.isAdminLoggedIn)
  const logoutAdmin = useConfigStore((s) => s.logoutAdmin)

  const isHome = location.pathname === '/'

  const handleBack = () => {
    if (location.pathname.startsWith('/admin') && location.pathname !== '/admin/login') {
      logoutAdmin()
      navigate('/')
    } else if (location.pathname === '/practice' || location.pathname === '/practice/result') {
      navigate('/dashboard')
    } else if (location.pathname === '/quiz' || location.pathname === '/quiz/result') {
      navigate('/dashboard')
    } else if (location.pathname === '/dashboard') {
      clearCurrentStudent()
      navigate('/')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {!isHome && (
            <button
              onClick={handleBack}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1
            className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate('/')}
          >
            GROWND English
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentStudent && (
            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
              {currentStudent.studentName} ({currentStudent.studentCode}번)
            </span>
          )}
          {isAdmin && (
            <span className="text-sm text-white bg-indigo-600 px-3 py-1.5 rounded-full">
              관리자
            </span>
          )}
        </div>
      </header>
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}

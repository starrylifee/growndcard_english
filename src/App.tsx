import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Home } from './components/auth/Home'
import { AdminLogin } from './components/auth/AdminLogin'
import { StudentSelect } from './components/auth/StudentSelect'
import { StudentDashboard } from './components/student/StudentDashboard'
import { PracticeSession } from './components/practice/PracticeSession'
import { PracticeResult } from './components/practice/PracticeResult'
import { QuizSession } from './components/quiz/QuizSession'
import { QuizResult } from './components/quiz/QuizResult'
import { AdminPanel } from './components/admin/AdminPanel'
import { usePointQueueProcessor } from './hooks/usePointQueue'

export default function App() {
  usePointQueueProcessor()

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/students" element={<StudentSelect />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route path="/practice/result" element={<PracticeResult />} />
        <Route path="/quiz" element={<QuizSession />} />
        <Route path="/quiz/result" element={<QuizResult />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

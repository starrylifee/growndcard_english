import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore } from '../../stores/configStore'

export function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const loginAdmin = useConfigStore((s) => s.loginAdmin)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loginAdmin(password)) {
      navigate('/admin')
    } else {
      setError('비밀번호가 올바르지 않습니다.')
      setPassword('')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800">관리자 로그인</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none transition-colors text-lg"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-lg"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  )
}

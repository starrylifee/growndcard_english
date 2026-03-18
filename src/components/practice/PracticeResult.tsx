import { useNavigate } from 'react-router-dom'

export function PracticeResult() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <p className="text-gray-500">결과 페이지는 연습 세션 내에서 표시됩니다.</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold"
      >
        대시보드로
      </button>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useConfigStore } from '../../stores/configStore'
import { useStudentStore } from '../../stores/studentStore'

export function Home() {
  const navigate = useNavigate()
  const hasApiKey = useConfigStore((s) => !!s.config.growndApiKey)
  const students = useStudentStore((s) => s.students)

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center">
        <div className="text-6xl mb-4">📚</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">GROWND English</h2>
        <p className="text-gray-500">영어 단어 학습 & 퀴즈</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <button
          onClick={() => navigate('/students')}
          disabled={!hasApiKey || students.length === 0}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">👩‍🎓</span>
            <span>학생 입장</span>
          </div>
          {(!hasApiKey || students.length === 0) && (
            <p className="text-xs mt-1 opacity-80">관리자 설정이 필요합니다</p>
          )}
        </button>

        <button
          onClick={() => navigate('/admin/login')}
          className="w-full py-4 px-6 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl text-lg font-semibold hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">⚙️</span>
            <span>관리자</span>
          </div>
        </button>
      </div>

      {!hasApiKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-sm text-center">
          <p className="text-amber-800 text-sm">
            처음 사용하시나요? <strong>관리자</strong>로 로그인하여 API 키와 클래스 설정을 먼저 완료해 주세요.
          </p>
        </div>
      )}
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useStudentStore } from '../../stores/studentStore'
import { useProgressStore } from '../../stores/progressStore'
import { useStudentConfig } from '../../hooks/useStudentConfig'
import { getGradeWords, getGradeLabel } from '../../data/words'
import { getSetCount } from '../../utils/wordSets'
import { useEffect } from 'react'

export function StudentDashboard() {
  const navigate = useNavigate()
  const student = useStudentStore((s) => s.currentStudent)
  const { effectiveGrade, customSets } = useStudentConfig()
  const progress = useProgressStore((s) =>
    student ? s.progressMap[student.studentCode] : undefined
  )

  useEffect(() => {
    if (!student) navigate('/')
  }, [student, navigate])

  if (!student || !progress) return null

  const gradeWords = getGradeWords(effectiveGrade, customSets)
  const totalSets = gradeWords ? getSetCount(gradeWords.words) : 20
  const currentRound = progress.currentRound
  const progressPercent = Math.round((currentRound / totalSets) * 100)

  const todayStr = new Date().toISOString().split('T')[0]
  const practicedToday = progress.practiceLog.some((log) => log.date.startsWith(todayStr))

  const recentQuizzes = progress.quizHistory.slice(-3).reverse()

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-4xl">👤</div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{student.studentName}</h2>
            <p className="text-gray-500 text-sm">
              {student.studentCode}번 · {getGradeLabel(effectiveGrade, customSets)}
              {progress.assignedGrade && (
                <span className="ml-1 text-indigo-500">(맞춤)</span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">진도: {currentRound} / {totalSets} 세트</span>
            <span className="font-semibold text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/practice')}
          className="bg-white rounded-2xl shadow-sm p-6 text-center hover:shadow-md hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent hover:border-emerald-300"
        >
          <div className="text-4xl mb-2">📝</div>
          <h3 className="font-bold text-gray-800 text-lg">연습</h3>
          <p className="text-sm text-gray-500 mt-1">매일 단어 연습</p>
          {practicedToday ? (
            <span className="inline-block mt-2 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
              오늘 완료
            </span>
          ) : (
            <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
              아직 미완료
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/quiz')}
          className="bg-white rounded-2xl shadow-sm p-6 text-center hover:shadow-md hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent hover:border-indigo-300"
        >
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="font-bold text-gray-800 text-lg">퀴즈</h3>
          <p className="text-sm text-gray-500 mt-1">{currentRound}회차 도전</p>
          <span className="inline-block mt-2 text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full">
            {currentRound * 10}개 단어 범위
          </span>
        </button>
      </div>

      {progress.wrongWords.length > 0 && (
        <div className="bg-red-50 rounded-2xl p-4">
          <h3 className="font-semibold text-red-700 mb-1">오답 단어 {progress.wrongWords.length}개</h3>
          <p className="text-sm text-red-600">연습 모드에서 오답 단어를 복습할 수 있습니다.</p>
        </div>
      )}

      {recentQuizzes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-3">최근 퀴즈 기록</h3>
          <div className="flex flex-col gap-2">
            {recentQuizzes.map((q, i) => (
              <div key={i} className="flex justify-between items-center bg-gray-50 rounded-xl p-3">
                <div>
                  <span className="font-semibold text-gray-700">{q.round}회차</span>
                  <span className="text-gray-400 text-sm ml-2">
                    {new Date(q.date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${q.passed ? 'text-emerald-600' : 'text-red-500'}`}>
                    {q.score}/{q.total}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      q.passed
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {q.passed ? '통과' : '실패'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

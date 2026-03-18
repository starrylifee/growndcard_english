import { useNavigate } from 'react-router-dom'
import { useStudentStore } from '../../stores/studentStore'
import { useProgressStore } from '../../stores/progressStore'

export function StudentSelect() {
  const navigate = useNavigate()
  const students = useStudentStore((s) => s.students)
  const selectStudent = useStudentStore((s) => s.selectStudent)
  const initProgress = useProgressStore((s) => s.initProgress)

  const handleSelect = (code: number, name: string) => {
    selectStudent(code)
    initProgress(code, name)
    navigate('/dashboard')
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">😢</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">등록된 학생이 없습니다</h2>
        <p className="text-gray-500 mb-4">관리자가 먼저 학생 정보를 불러와야 합니다.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          돌아가기
        </button>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">학생을 선택하세요</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {students
          .sort((a, b) => a.studentCode - b.studentCode)
          .map((student) => (
            <button
              key={student.studentCode}
              onClick={() => handleSelect(student.studentCode, student.studentName)}
              className="flex flex-col items-center gap-1 p-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-400 hover:shadow-md transition-all active:scale-95"
            >
              <span className="text-3xl">
                {student.avatar ? (
                  <img src={student.avatar} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  '👤'
                )}
              </span>
              <span className="font-bold text-indigo-600 text-lg">{student.studentCode}</span>
              <span className="text-sm text-gray-600 truncate w-full text-center">
                {student.studentName}
              </span>
            </button>
          ))}
      </div>
    </div>
  )
}

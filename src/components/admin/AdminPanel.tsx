import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConfigStore } from '../../stores/configStore'
import { useStudentStore } from '../../stores/studentStore'
import { useProgressStore } from '../../stores/progressStore'
import { usePointQueueStore } from '../../stores/pointQueueStore'
import { useCustomWordsStore } from '../../stores/customWordsStore'
import { fetchAllStudents, awardPoints } from '../../services/growndApi'
import { allGrades, getAllWordSources } from '../../data/words'
import type { QuizFormat, BonusTier, PointQueueItem, CustomWordSet, Word, AppConfig, PointConfig, StudentInfo, StudentProgress } from '../../types'

type Tab = 'api' | 'points' | 'students' | 'custom' | 'data' | 'queue'

export function AdminPanel() {
  const navigate = useNavigate()
  const { config, setConfig, setPointConfig, isAdminLoggedIn } = useConfigStore()
  const { students, setStudents } = useStudentStore()
  const { progressMap, importProgress, clearAll: clearProgress, setStudentGrade, setStudentQuizFormat, initProgress } = useProgressStore()
  const pointQueue = usePointQueueStore()
  const customWords = useCustomWordsStore()

  const [tab, setTab] = useState<Tab>('api')
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 })
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isAdminLoggedIn) navigate('/admin/login')
  }, [isAdminLoggedIn, navigate])

  const showMessage = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleFetchStudents = async () => {
    if (!config.growndApiKey || !config.growndClassId) {
      showMessage('API 키와 클래스 ID를 먼저 설정해 주세요.')
      return
    }
    setLoading(true)
    try {
      const result = await fetchAllStudents(
        config.growndClassId,
        config.growndApiKey,
        config.studentCodeRange.start,
        config.studentCodeRange.end,
        (current, total) => setLoadProgress({ current, total })
      )
      const studentInfos = result.map((s) => ({
        studentCode: s!.studentCode,
        studentName: s!.studentName,
        avatar: s!.avatar,
        totalPoints: s!.points?.totalPoints,
        currentLevel: s!.points?.currentLevel,
        levelName: s!.points?.levelName,
      }))
      setStudents(studentInfos)
      showMessage(`${studentInfos.length}명의 학생 정보를 불러왔습니다.`)
    } catch {
      showMessage('학생 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
      setLoadProgress({ current: 0, total: 0 })
    }
  }

  const handleProcessQueue = async () => {
    const pending = pointQueue.getPending()
    if (pending.length === 0) {
      showMessage('전송할 포인트가 없습니다.')
      return
    }
    setLoading(true)
    let success = 0
    let failed = 0

    for (const item of pending) {
      pointQueue.updateStatus(item.id, 'sending')
      try {
        const result = await awardPoints({
          classId: config.growndClassId,
          studentCode: item.studentCode,
          apiKey: config.growndApiKey,
          type: item.type,
          points: item.points,
          description: item.description,
        })
        if (result.success) {
          pointQueue.updateStatus(item.id, 'sent')
          success++
        } else {
          pointQueue.updateStatus(item.id, 'failed')
          pointQueue.incrementRetry(item.id)
          failed++
        }
      } catch {
        pointQueue.updateStatus(item.id, 'failed')
        pointQueue.incrementRetry(item.id)
        failed++
      }
      await new Promise((r) => setTimeout(r, 300))
    }

    setLoading(false)
    showMessage(`전송 완료: 성공 ${success}건, 실패 ${failed}건`)
  }

  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    showMessage(`${filename} 다운로드 완료`)
  }

  const handleExportData = (type: 'config' | 'configFull' | 'progress' | 'all' | 'customSets') => {
    if (type === 'config') {
      const { growndApiKey, geminiApiKey, ...safeConfig } = config
      void growndApiKey; void geminiApiKey
      downloadJson(safeConfig, 'grownd-quiz-config.json')
    } else if (type === 'configFull') {
      downloadJson(config, 'grownd-quiz-config-full.json')
    } else if (type === 'progress') {
      downloadJson(progressMap, 'grownd-quiz-progress.json')
    } else if (type === 'customSets') {
      downloadJson(customWords.sets, 'grownd-quiz-custom-sets.json')
    } else if (type === 'all') {
      downloadJson(
        { config, progress: progressMap, students, customSets: customWords.sets },
        'grownd-quiz-all-data.json'
      )
    }
  }

  const uploadJson = (callback: (data: Record<string, unknown>) => void) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        callback(data)
      } catch {
        showMessage('파일을 읽는데 실패했습니다.')
      }
    }
    input.click()
  }

  const handleImportData = (type: 'config' | 'progress' | 'all' | 'customSets') => {
    uploadJson((data) => {
      if (type === 'config') {
        setConfig(data as Partial<AppConfig>)
        showMessage('설정을 가져왔습니다. (API키, 학년, 포인트 설정 등)')
      } else if (type === 'progress') {
        importProgress(data as unknown as Record<number, StudentProgress>)
        showMessage('진도 데이터를 가져왔습니다.')
      } else if (type === 'customSets') {
        if (Array.isArray(data)) {
          customWords.importSets(data)
          showMessage(`커스텀 세트 ${data.length}개를 가져왔습니다.`)
        } else {
          showMessage('잘못된 커스텀 세트 파일입니다.')
        }
      } else if (type === 'all') {
        if (data.config) setConfig(data.config as Partial<AppConfig>)
        if (data.progress) importProgress(data.progress as unknown as Record<number, StudentProgress>)
        if (data.students) setStudents(data.students as Parameters<typeof setStudents>[0])
        if (data.customSets) customWords.importSets(data.customSets as Parameters<typeof customWords.importSets>[0])
        showMessage('전체 데이터를 가져왔습니다.')
      }
    })
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'api', label: 'API 설정', icon: '🔑' },
    { id: 'points', label: '포인트', icon: '⭐' },
    { id: 'students', label: '학생', icon: '👩‍🎓' },
    { id: 'custom', label: '커스텀 세트', icon: '📝' },
    { id: 'queue', label: '포인트 큐', icon: '📤' },
    { id: 'data', label: '데이터', icon: '💾' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg animate-bounce">
          {message}
        </div>
      )}

      <h2 className="text-2xl font-bold text-gray-800">관리자 패널</h2>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {tab === 'api' && <ApiSettings config={config} setConfig={setConfig} />}
        {tab === 'points' && (
          <PointSettings config={config} setPointConfig={setPointConfig} />
        )}
        {tab === 'students' && (
          <StudentManagement
            students={students}
            progressMap={progressMap}
            loading={loading}
            loadProgress={loadProgress}
            onFetch={handleFetchStudents}
            defaultGrade={config.selectedGrade}
            customSets={customWords.sets}
            onSetStudentGrade={setStudentGrade}
            onSetStudentQuizFormat={setStudentQuizFormat}
            onInitProgress={initProgress}
          />
        )}
        {tab === 'custom' && (
          <CustomSetsManagement
            sets={customWords.sets}
            onAddSet={customWords.addSet}
            onUpdateSet={customWords.updateSet}
            onDeleteSet={customWords.deleteSet}
            onAddWord={customWords.addWord}
            onAddWords={customWords.addWords}
            onUpdateWord={customWords.updateWord}
            onDeleteWord={customWords.deleteWord}
            onExport={() => handleExportData('customSets')}
            onImport={() => handleImportData('customSets')}
          />
        )}
        {tab === 'queue' && (
          <PointQueuePanel
            queue={pointQueue.queue}
            loading={loading}
            onProcess={handleProcessQueue}
            onClearSent={pointQueue.clearSent}
            onClearAll={pointQueue.clearAll}
          />
        )}
        {tab === 'data' && (
          <DataManagement
            onExport={handleExportData}
            onImport={handleImportData}
            onClearProgress={() => {
              clearProgress()
              showMessage('진도 데이터를 초기화했습니다.')
            }}
          />
        )}
      </div>
    </div>
  )
}

function ApiSettings({
  config,
  setConfig,
}: {
  config: AppConfig
  setConfig: (c: Partial<AppConfig>) => void
}) {
  const customSets = useCustomWordsStore((s) => s.sets)
  const wordSources = getAllWordSources(customSets)

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-bold text-gray-800 text-lg">API 설정</h3>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">GROWND API 키</label>
        <input
          type="password"
          value={config.growndApiKey}
          onChange={(e) => setConfig({ growndApiKey: e.target.value })}
          placeholder="sk_live_..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">GROWND 클래스 ID</label>
        <input
          type="text"
          value={config.growndClassId}
          onChange={(e) => setConfig({ growndClassId: e.target.value })}
          placeholder="NP0hetJ3wyQKFtRnFeftmPiy8Dl2_2"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Gemini API 키 (OCR용)</label>
        <input
          type="password"
          value={config.geminiApiKey}
          onChange={(e) => setConfig({ geminiApiKey: e.target.value })}
          placeholder="AIzaSy..."
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
        />
        <p className="text-xs text-gray-400 mt-1">터치펜 쓰기 모드에서 필기 인식에 사용됩니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">학생 시작 번호</label>
          <input
            type="number"
            value={config.studentCodeRange.start}
            onChange={(e) =>
              setConfig({
                studentCodeRange: { ...config.studentCodeRange, start: Number(e.target.value) },
              })
            }
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">학생 끝 번호</label>
          <input
            type="number"
            value={config.studentCodeRange.end}
            onChange={(e) =>
              setConfig({
                studentCodeRange: { ...config.studentCodeRange, end: Number(e.target.value) },
              })
            }
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">학년 선택 (기본값)</label>
        <select
          value={config.selectedGrade}
          onChange={(e) => setConfig({ selectedGrade: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
        >
          <optgroup label="기본 학년">
            {allGrades.map((g) => (
              <option key={g.grade} value={g.grade}>
                {g.gradeLabel} ({g.words.length}단어)
              </option>
            ))}
          </optgroup>
          {customSets.length > 0 && (
            <optgroup label="커스텀 세트">
              {wordSources
                .filter((s) => s.grade.startsWith('custom_'))
                .map((s) => (
                  <option key={s.grade} value={s.grade}>
                    {s.gradeLabel} ({s.words.length}단어)
                  </option>
                ))}
            </optgroup>
          )}
        </select>
      </div>
    </div>
  )
}

function PointSettings({
  config,
  setPointConfig,
}: {
  config: AppConfig
  setPointConfig: (c: Partial<PointConfig>) => void
}) {
  const pc = config.pointConfig

  const updateQuiz = (field: string, value: number) => {
    setPointConfig({ quiz: { ...pc.quiz, [field]: value } })
  }

  const updateTier = (index: number, field: keyof BonusTier, value: number) => {
    const tiers = [...pc.quiz.bonusTiers]
    tiers[index] = { ...tiers[index], [field]: value }
    setPointConfig({ quiz: { ...pc.quiz, bonusTiers: tiers } })
  }

  const addTier = () => {
    setPointConfig({
      quiz: {
        ...pc.quiz,
        bonusTiers: [...pc.quiz.bonusTiers, { score: pc.quiz.totalQuestions, bonusPoints: 1 }],
      },
    })
  }

  const removeTier = (index: number) => {
    const tiers = pc.quiz.bonusTiers.filter((_: BonusTier, i: number) => i !== index)
    setPointConfig({ quiz: { ...pc.quiz, bonusTiers: tiers } })
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-bold text-gray-800 text-lg">포인트 설정</h3>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">퀴즈 형식</label>
        <div className="grid grid-cols-3 gap-2">
          {(['typing', 'ocr', 'multipleChoice'] as QuizFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setPointConfig({ quizFormat: f })}
              className={`py-3 rounded-xl text-sm font-semibold transition-colors ${
                pc.quizFormat === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'typing' ? '타이핑' : f === 'ocr' ? 'OCR 쓰기' : '객관식'}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-700 mb-3">연습 포인트</h4>
        <div>
          <label className="block text-sm text-gray-500 mb-1">연습 완료 시 포인트</label>
          <input
            type="number"
            value={pc.practice.completionPoints}
            onChange={(e) =>
              setPointConfig({ practice: { completionPoints: Number(e.target.value) } })
            }
            min={0}
            step={0.5}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-gray-700 mb-3">퀴즈 포인트</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">총 문제 수</label>
            <input
              type="number"
              value={pc.quiz.totalQuestions}
              onChange={(e) => updateQuiz('totalQuestions', Number(e.target.value))}
              min={5}
              max={50}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">통과 기준</label>
            <input
              type="number"
              value={pc.quiz.passThreshold}
              onChange={(e) => updateQuiz('passThreshold', Number(e.target.value))}
              min={1}
              max={pc.quiz.totalQuestions}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">기본 포인트</label>
            <input
              type="number"
              value={pc.quiz.basePoints}
              onChange={(e) => updateQuiz('basePoints', Number(e.target.value))}
              min={0}
              step={0.5}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">회차 배율</label>
            <input
              type="number"
              value={pc.quiz.roundMultiplier}
              onChange={(e) => updateQuiz('roundMultiplier', Number(e.target.value))}
              min={0}
              step={0.1}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">회차 x 배율 만큼 추가 포인트</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-semibold text-gray-700">보너스 티어</h4>
          <button
            onClick={addTier}
            className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
          >
            + 추가
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {pc.quiz.bonusTiers.map((tier: BonusTier, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                value={tier.score}
                onChange={(e) => updateTier(i, 'score', Number(e.target.value))}
                className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-indigo-400 focus:outline-none"
              />
              <span className="text-gray-500 text-sm">개 이상 →</span>
              <input
                type="number"
                value={tier.bonusPoints}
                onChange={(e) => updateTier(i, 'bonusPoints', Number(e.target.value))}
                step={0.5}
                className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center focus:border-indigo-400 focus:outline-none"
              />
              <span className="text-gray-500 text-sm">점 추가</span>
              <button
                onClick={() => removeTier(i)}
                className="text-red-400 hover:text-red-600 ml-auto"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StudentManagement({
  students,
  progressMap,
  loading,
  loadProgress,
  onFetch,
  defaultGrade,
  customSets,
  onSetStudentGrade,
  onSetStudentQuizFormat,
  onInitProgress,
}: {
  students: StudentInfo[]
  progressMap: Record<number, StudentProgress>
  loading: boolean
  loadProgress: { current: number; total: number }
  onFetch: () => void
  defaultGrade: string
  customSets: CustomWordSet[]
  onSetStudentGrade: (studentCode: number, grade: string) => void
  onSetStudentQuizFormat: (studentCode: number, format: string | undefined) => void
  onInitProgress: (studentCode: number, studentName: string) => void
}) {
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null)
  const wordSources = getAllWordSources(customSets)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-lg">학생 관리</h3>
        <button
          onClick={onFetch}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading
            ? `불러오는 중... (${loadProgress.current}/${loadProgress.total})`
            : '학생 불러오기'}
        </button>
      </div>

      {students.length === 0 ? (
        <p className="text-gray-400 text-center py-8">
          학생 정보가 없습니다. "학생 불러오기"를 클릭하세요.
        </p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[32rem] overflow-y-auto">
          {students
            .sort((a, b) => a.studentCode - b.studentCode)
            .map((s) => {
              let prog = progressMap[s.studentCode]
              const isExpanded = expandedStudent === s.studentCode
              const studentGrade = prog?.assignedGrade || defaultGrade
              const studentFormat = prog?.assignedQuizFormat || ''

              return (
                <div key={s.studentCode} className="bg-gray-50 rounded-xl overflow-hidden">
                  <button
                    onClick={() => {
                      if (!prog) onInitProgress(s.studentCode, s.studentName)
                      prog = progressMap[s.studentCode]
                      setExpandedStudent(isExpanded ? null : s.studentCode)
                    }}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-indigo-600 w-8 text-center">
                        {s.studentCode}
                      </span>
                      <span className="font-semibold text-gray-700">{s.studentName}</span>
                      {prog?.assignedGrade && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {wordSources.find((g) => g.grade === prog!.assignedGrade)?.gradeLabel || prog.assignedGrade}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {prog && (
                        <span className="text-gray-500">
                          {prog.currentRound}회차
                        </span>
                      )}
                      {s.totalPoints !== undefined && (
                        <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                          {s.totalPoints}pt
                        </span>
                      )}
                      <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-gray-200 flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          난이도 (학년)
                        </label>
                        <select
                          value={studentGrade}
                          onChange={(e) => {
                            if (!prog) onInitProgress(s.studentCode, s.studentName)
                            onSetStudentGrade(s.studentCode, e.target.value)
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                        >
                          <option value="">기본값 ({wordSources.find((g) => g.grade === defaultGrade)?.gradeLabel})</option>
                          <optgroup label="기본 학년">
                            {allGrades.map((g) => (
                              <option key={g.grade} value={g.grade}>
                                {g.gradeLabel} ({g.words.length}단어)
                              </option>
                            ))}
                          </optgroup>
                          {customSets.length > 0 && (
                            <optgroup label="커스텀 세트">
                              {customSets.map((cs) => (
                                <option key={cs.id} value={cs.id}>
                                  {cs.name} ({cs.words.length}단어)
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          퀴즈 형식
                        </label>
                        <select
                          value={studentFormat}
                          onChange={(e) => {
                            if (!prog) onInitProgress(s.studentCode, s.studentName)
                            onSetStudentQuizFormat(
                              s.studentCode,
                              e.target.value || undefined
                            )
                          }}
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                        >
                          <option value="">기본값 (전체 설정 따름)</option>
                          <option value="typing">타이핑</option>
                          <option value="ocr">OCR 쓰기</option>
                          <option value="multipleChoice">객관식</option>
                        </select>
                      </div>
                      {prog && (
                        <div className="text-xs text-gray-400">
                          퀴즈 {prog.quizHistory.length}회 · 연습 {prog.practiceLog.length}회 · 오답 {prog.wrongWords.length}개
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

function PointQueuePanel({
  queue,
  loading,
  onProcess,
  onClearSent,
  onClearAll,
}: {
  queue: PointQueueItem[]
  loading: boolean
  onProcess: () => void
  onClearSent: () => void
  onClearAll: () => void
}) {
  const pending = queue.filter((q) => q.status === 'pending' || q.status === 'failed')
  const sent = queue.filter((q) => q.status === 'sent')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-lg">포인트 전송 큐</h3>
        <div className="flex gap-2">
          <button
            onClick={onProcess}
            disabled={loading || pending.length === 0}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? '전송 중...' : `전송하기 (${pending.length}건)`}
          </button>
        </div>
      </div>

      <div className="flex gap-3 text-center">
        <div className="flex-1 bg-amber-50 rounded-xl p-3">
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
          <p className="text-xs text-amber-500">대기</p>
        </div>
        <div className="flex-1 bg-emerald-50 rounded-xl p-3">
          <p className="text-2xl font-bold text-emerald-600">{sent.length}</p>
          <p className="text-xs text-emerald-500">완료</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-xl p-3">
          <p className="text-2xl font-bold text-gray-600">{queue.length}</p>
          <p className="text-xs text-gray-500">전체</p>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {queue
            .slice()
            .reverse()
            .map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3 text-sm">
                <div>
                  <span className="font-semibold">{item.studentCode}번</span>
                  <span className="text-gray-500 ml-2">{item.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-600">+{item.points}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.status === 'failed'
                        ? 'bg-red-100 text-red-600'
                        : item.status === 'sending'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.status === 'sent' ? '완료' : item.status === 'failed' ? '실패' : item.status === 'sending' ? '전송중' : '대기'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="flex gap-2 border-t pt-3">
        <button
          onClick={onClearSent}
          className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm hover:bg-gray-200 transition-colors"
        >
          완료 항목 삭제
        </button>
        <button
          onClick={onClearAll}
          className="flex-1 py-2 bg-red-50 text-red-600 rounded-xl text-sm hover:bg-red-100 transition-colors"
        >
          전체 삭제
        </button>
      </div>
    </div>
  )
}

function DataManagement({
  onExport,
  onImport,
  onClearProgress,
}: {
  onExport: (type: 'config' | 'configFull' | 'progress' | 'all' | 'customSets') => void
  onImport: (type: 'config' | 'progress' | 'all' | 'customSets') => void
  onClearProgress: () => void
}) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-lg">데이터 관리</h3>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
        >
          {showGuide ? '가이드 닫기' : '가이드 보기'}
        </button>
      </div>

      {showGuide && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-gray-700 flex flex-col gap-3">
          <h4 className="font-bold text-amber-800">데이터 관리 가이드</h4>

          <div>
            <p className="font-semibold text-gray-800 mb-1">내보내기 (Export) - JSON 파일로 다운로드</p>
            <ul className="flex flex-col gap-1.5 ml-3">
              <li><span className="font-semibold text-blue-700">설정 (API키 제외)</span> — 학년, 포인트 설정, 학생번호 범위 등. API키는 빠짐 (공유용)</li>
              <li><span className="font-semibold text-blue-700">설정 (API키 포함)</span> — 위 내용 + GROWND/Gemini API키 포함 (다른 기기 이전용)</li>
              <li><span className="font-semibold text-green-700">진도</span> — 학생별 퀴즈 기록, 연습 기록, 현재 회차, 오답 단어, 맞춤 설정</li>
              <li><span className="font-semibold text-purple-700">커스텀 세트</span> — 관리자가 만든 커스텀 단어/문장 세트</li>
              <li><span className="font-semibold text-indigo-700">전체 (API키 포함)</span> — 위 모든 데이터를 하나의 파일로 (백업/이전용)</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-800 mb-1">가져오기 (Import) - JSON 파일 업로드</p>
            <ul className="flex flex-col gap-1.5 ml-3">
              <li><span className="font-semibold text-blue-700">설정 가져오기</span> — 기존 설정을 덮어쓰기 (API키, 학년, 포인트 모두 적용)</li>
              <li><span className="font-semibold text-green-700">진도 가져오기</span> — 학생 진도를 덮어쓰기 (같은 학생번호면 대체됨)</li>
              <li><span className="font-semibold text-purple-700">커스텀 세트 가져오기</span> — 같은 ID면 대체, 새 ID면 추가</li>
              <li><span className="font-semibold text-indigo-700">전체 가져오기</span> — "전체 내보내기" 파일을 통째로 복원</li>
            </ul>
          </div>

          <div className="bg-amber-100 rounded-lg p-2 text-xs text-amber-800">
            <p className="font-bold mb-1">사용 시나리오</p>
            <p>• <b>다른 기기에서 동일 설정 사용</b>: "설정 (API키 포함)" 내보내기 → 다른 기기에서 "설정 가져오기"</p>
            <p>• <b>전체 백업/복원</b>: "전체 내보내기" → 다른 기기에서 "전체 가져오기"</p>
            <p>• <b>커스텀 세트 공유</b>: "커스텀 세트 내보내기" → 다른 곳에서 "커스텀 세트 가져오기"</p>
            <p>• <b>설정만 공유 (API키 비공개)</b>: "설정 (API키 제외)" 내보내기</p>
          </div>
        </div>
      )}

      <div>
        <h4 className="font-semibold text-gray-700 mb-2">내보내기 (Export)</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onExport('config')}
            className="py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            📋 설정 (API키 제외)
          </button>
          <button
            onClick={() => onExport('configFull')}
            className="py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors border border-blue-200"
          >
            🔑 설정 (API키 포함)
          </button>
          <button
            onClick={() => onExport('progress')}
            className="py-3 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors"
          >
            📊 진도 내보내기
          </button>
          <button
            onClick={() => onExport('customSets')}
            className="py-3 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors"
          >
            📝 커스텀 세트 내보내기
          </button>
          <button
            onClick={() => onExport('all')}
            className="py-3 col-span-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors border border-indigo-200"
          >
            💾 전체 데이터 내보내기 (API키 포함)
          </button>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-700 mb-2">가져오기 (Import)</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onImport('config')}
            className="py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors"
          >
            📋 설정 가져오기
          </button>
          <button
            onClick={() => onImport('progress')}
            className="py-3 bg-green-50 text-green-700 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors"
          >
            📊 진도 가져오기
          </button>
          <button
            onClick={() => onImport('customSets')}
            className="py-3 bg-purple-50 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100 transition-colors"
          >
            📝 커스텀 세트 가져오기
          </button>
          <button
            onClick={() => onImport('all')}
            className="py-3 col-span-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
          >
            💾 전체 데이터 가져오기
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold text-red-600 mb-2">위험 영역</h4>
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">정말 초기화하시겠습니까?</span>
            <button
              onClick={() => {
                onClearProgress()
                setConfirmClear(false)
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold"
            >
              확인
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            className="py-3 w-full bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
          >
            🗑️ 진도 데이터 초기화
          </button>
        )}
      </div>
    </div>
  )
}

function CustomSetsManagement({
  sets,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onAddWord,
  onAddWords,
  onUpdateWord,
  onDeleteWord,
  onExport,
  onImport,
}: {
  sets: CustomWordSet[]
  onAddSet: (name: string, description?: string) => string
  onUpdateSet: (id: string, data: Partial<Pick<CustomWordSet, 'name' | 'description'>>) => void
  onDeleteSet: (id: string) => void
  onAddWord: (setId: string, word: Omit<Word, 'id'>) => void
  onAddWords: (setId: string, words: Omit<Word, 'id'>[]) => void
  onUpdateWord: (setId: string, wordId: number, data: Partial<Omit<Word, 'id'>>) => void
  onDeleteWord: (setId: string, wordId: number) => void
  onExport: () => void
  onImport: () => void
}) {
  const [editingSetId, setEditingSetId] = useState<string | null>(null)
  const [newSetName, setNewSetName] = useState('')
  const [newSetDesc, setNewSetDesc] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [bulkInput, setBulkInput] = useState('')
  const [showBulkInput, setShowBulkInput] = useState<string | null>(null)
  const [newWordEn, setNewWordEn] = useState('')
  const [newWordKo, setNewWordKo] = useState('')
  const [editingWord, setEditingWord] = useState<{ setId: string; wordId: number } | null>(null)
  const [editWordEn, setEditWordEn] = useState('')
  const [editWordKo, setEditWordKo] = useState('')
  const [confirmDeleteSet, setConfirmDeleteSet] = useState<string | null>(null)
  const [editSetMeta, setEditSetMeta] = useState<{ id: string; name: string; desc: string } | null>(null)
  const bulkInputRef = useRef<HTMLTextAreaElement>(null)

  const handleCreateSet = () => {
    if (!newSetName.trim()) return
    const id = onAddSet(newSetName.trim(), newSetDesc.trim() || undefined)
    setNewSetName('')
    setNewSetDesc('')
    setShowCreateForm(false)
    setEditingSetId(id)
  }

  const handleAddSingleWord = (setId: string) => {
    if (!newWordEn.trim() || !newWordKo.trim()) return
    onAddWord(setId, { english: newWordEn.trim(), korean: newWordKo.trim() })
    setNewWordEn('')
    setNewWordKo('')
  }

  const handleBulkAdd = (setId: string) => {
    if (!bulkInput.trim()) return
    const lines = bulkInput.trim().split('\n').filter((l) => l.trim())
    const words: Omit<Word, 'id'>[] = []

    for (const line of lines) {
      const parts = line.split(/[,\t|]/).map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        words.push({ english: parts[0], korean: parts[1] })
      }
    }

    if (words.length > 0) {
      onAddWords(setId, words)
      setBulkInput('')
      setShowBulkInput(null)
    }
  }

  const startEditWord = (setId: string, word: Word) => {
    setEditingWord({ setId, wordId: word.id })
    setEditWordEn(word.english)
    setEditWordKo(word.korean)
  }

  const saveEditWord = () => {
    if (!editingWord || !editWordEn.trim() || !editWordKo.trim()) return
    onUpdateWord(editingWord.setId, editingWord.wordId, {
      english: editWordEn.trim(),
      korean: editWordKo.trim(),
    })
    setEditingWord(null)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-gray-800 text-lg">커스텀 세트 관리</h3>
        <div className="flex gap-2">
          <button
            onClick={onImport}
            className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors"
          >
            가져오기
          </button>
          <button
            onClick={onExport}
            disabled={sets.length === 0}
            className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors disabled:opacity-50"
          >
            내보내기
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
          >
            + 새 세트
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        단어, 문장, 표현 등을 자유롭게 세트로 만들어 학생에게 할당할 수 있습니다.
        세트당 10개 단위로 회차가 나뉩니다.
      </p>

      {showCreateForm && (
        <div className="bg-indigo-50 rounded-xl p-4 flex flex-col gap-3">
          <h4 className="font-semibold text-indigo-800">새 세트 만들기</h4>
          <input
            type="text"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            placeholder="세트 이름 (예: 여행 영어, 과학 용어...)"
            className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
            autoFocus
          />
          <input
            type="text"
            value={newSetDesc}
            onChange={(e) => setNewSetDesc(e.target.value)}
            placeholder="설명 (선택)"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateSet}
              disabled={!newSetName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              생성
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false)
                setNewSetName('')
                setNewSetDesc('')
              }}
              className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {sets.length === 0 && !showCreateForm && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p>아직 커스텀 세트가 없습니다.</p>
          <p className="text-sm mt-1">"+ 새 세트" 버튼으로 만들어 보세요.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sets.map((set) => {
          const isEditing = editingSetId === set.id
          const isBulk = showBulkInput === set.id
          const isConfirmDelete = confirmDeleteSet === set.id

          return (
            <div key={set.id} className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                onClick={() => setEditingSetId(isEditing ? null : set.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
              >
                <div className="text-left">
                  <h4 className="font-bold text-gray-800">{set.name}</h4>
                  {set.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{set.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {set.words.length}단어
                  </span>
                  <span className="text-xs text-gray-400">
                    {Math.ceil(set.words.length / 10)}세트
                  </span>
                  <span className={`text-gray-400 transition-transform ${isEditing ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {isEditing && (
                <div className="px-4 pb-4 border-t border-gray-200 flex flex-col gap-3 pt-3">
                  {editSetMeta?.id === set.id ? (
                    <div className="flex flex-col gap-2 bg-blue-50 rounded-lg p-3">
                      <input
                        type="text"
                        value={editSetMeta.name}
                        onChange={(e) => setEditSetMeta({ ...editSetMeta, name: e.target.value })}
                        placeholder="세트 이름"
                        className="px-3 py-1.5 border border-blue-300 rounded text-sm focus:outline-none"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editSetMeta.desc}
                        onChange={(e) => setEditSetMeta({ ...editSetMeta, desc: e.target.value })}
                        placeholder="설명 (선택)"
                        className="px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            onUpdateSet(set.id, {
                              name: editSetMeta.name.trim(),
                              description: editSetMeta.desc.trim() || undefined,
                            })
                            setEditSetMeta(null)
                          }}
                          disabled={!editSetMeta.name.trim()}
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold disabled:opacity-50"
                        >
                          저장
                        </button>
                        <button
                          onClick={() => setEditSetMeta(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setEditSetMeta({ id: set.id, name: set.name, desc: set.description || '' })
                      }
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors"
                    >
                      이름 수정
                    </button>
                    <button
                      onClick={() => {
                        setShowBulkInput(isBulk ? null : set.id)
                      }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                    >
                      {isBulk ? '개별 입력' : '일괄 입력'}
                    </button>
                    {isConfirmDelete ? (
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-red-600">삭제?</span>
                        <button
                          onClick={() => {
                            onDeleteSet(set.id)
                            setConfirmDeleteSet(null)
                            setEditingSetId(null)
                          }}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs font-semibold"
                        >
                          확인
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSet(null)}
                          className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteSet(set.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors ml-auto"
                      >
                        세트 삭제
                      </button>
                    )}
                  </div>

                  {isBulk ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-500">
                        한 줄에 하나씩, 영어와 한글을 쉼표(,) 탭 또는 |(파이프)로 구분하여 입력하세요.
                      </p>
                      <textarea
                        ref={bulkInputRef}
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        placeholder={"apple, 사과\nbanana, 바나나\nI love you, 나는 너를 사랑해\nHow are you?, 잘 지내?"}
                        rows={8}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-mono focus:border-indigo-400 focus:outline-none resize-y"
                      />
                      <button
                        onClick={() => handleBulkAdd(set.id)}
                        disabled={!bulkInput.trim()}
                        className="py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        일괄 추가
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newWordEn}
                        onChange={(e) => setNewWordEn(e.target.value)}
                        placeholder="영어"
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSingleWord(set.id)
                        }}
                      />
                      <input
                        type="text"
                        value={newWordKo}
                        onChange={(e) => setNewWordKo(e.target.value)}
                        placeholder="한글 뜻"
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSingleWord(set.id)
                        }}
                      />
                      <button
                        onClick={() => handleAddSingleWord(set.id)}
                        disabled={!newWordEn.trim() || !newWordKo.trim()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                      >
                        추가
                      </button>
                    </div>
                  )}

                  {set.words.length > 0 && (
                    <div className="max-h-80 overflow-y-auto flex flex-col gap-1">
                      {set.words.map((word, idx) => {
                        const isEditingThis =
                          editingWord?.setId === set.id && editingWord?.wordId === word.id

                        return (
                          <div
                            key={word.id}
                            className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 group"
                          >
                            <span className="text-xs text-gray-400 w-6 text-right shrink-0">
                              {idx + 1}
                            </span>
                            {isEditingThis ? (
                              <>
                                <input
                                  type="text"
                                  value={editWordEn}
                                  onChange={(e) => setEditWordEn(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditWord()
                                    if (e.key === 'Escape') setEditingWord(null)
                                  }}
                                />
                                <input
                                  type="text"
                                  value={editWordKo}
                                  onChange={(e) => setEditWordKo(e.target.value)}
                                  className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm focus:outline-none"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEditWord()
                                    if (e.key === 'Escape') setEditingWord(null)
                                  }}
                                />
                                <button
                                  onClick={saveEditWord}
                                  className="text-indigo-600 text-xs font-semibold hover:text-indigo-800"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => setEditingWord(null)}
                                  className="text-gray-400 text-xs hover:text-gray-600"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 font-semibold text-sm text-gray-800">
                                  {word.english}
                                </span>
                                <span className="flex-1 text-sm text-gray-500">
                                  {word.korean}
                                </span>
                                <button
                                  onClick={() => startEditWord(set.id, word)}
                                  className="text-gray-300 hover:text-indigo-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() => onDeleteWord(set.id, word.id)}
                                  className="text-gray-300 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  삭제
                                </button>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {set.words.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">
                      아직 단어가 없습니다. 위에서 단어를 추가하세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

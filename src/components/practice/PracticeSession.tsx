import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentStore } from '../../stores/studentStore'
import { useConfigStore } from '../../stores/configStore'
import { useProgressStore } from '../../stores/progressStore'
import { usePointQueueStore } from '../../stores/pointQueueStore'
import { useStudentConfig } from '../../hooks/useStudentConfig'
import { getGradeWords } from '../../data/words'
import { getWordsForRound } from '../../utils/wordSets'
import { checkAnswer, calculatePracticePoints } from '../../utils/scoring'
import { speak } from '../../services/tts'
import { recognizeHandwriting } from '../../services/geminiApi'
import { HandwritingCanvas } from '../handwriting/HandwritingCanvas'
import { playCorrectSound, playWrongSound } from '../../utils/sounds'
import type { Word, PracticeMode } from '../../types'

type PracticeStep = 'select' | 'session' | 'done'

export function PracticeSession() {
  const navigate = useNavigate()
  const student = useStudentStore((s) => s.currentStudent)
  const config = useConfigStore((s) => s.config)
  const progress = useProgressStore((s) =>
    student ? s.progressMap[student.studentCode] : undefined
  )
  const addPracticeLog = useProgressStore((s) => s.addPracticeLog)
  const addWrongWords = useProgressStore((s) => s.addWrongWords)
  const removeWrongWord = useProgressStore((s) => s.removeWrongWord)
  const enqueue = usePointQueueStore((s) => s.enqueue)
  const { effectiveGrade, customSets } = useStudentConfig()

  const [step, setStep] = useState<PracticeStep>('select')
  const [mode, setMode] = useState<PracticeMode>('meaning-typing')
  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

  useEffect(() => {
    if (!student) navigate('/')
  }, [student, navigate])

  const startPractice = useCallback((selectedMode: PracticeMode) => {
    if (!progress) return
    setMode(selectedMode)

    const gradeWords = getGradeWords(effectiveGrade, customSets)
    if (!gradeWords) return

    const roundWords = getWordsForRound(gradeWords.words, progress.currentRound)
    const shuffled = [...roundWords].sort(() => Math.random() - 0.5).slice(0, 10)
    setWords(shuffled)
    setCurrentIndex(0)
    setCorrectCount(0)
    setStep('session')
  }, [progress, effectiveGrade, customSets])

  const currentWord = words[currentIndex]

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentWord || !student) return
      const correct = checkAnswer(answer, currentWord.english)
      setIsCorrect(correct)
      setUserAnswer(answer)
      setShowResult(true)

      if (correct) {
        setCorrectCount((c) => c + 1)
        removeWrongWord(student.studentCode, currentWord.id)
        playCorrectSound()
      } else {
        addWrongWords(student.studentCode, [currentWord.id])
        playWrongSound()
      }
    },
    [currentWord, student, addWrongWords, removeWrongWord]
  )

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAnswer(userAnswer)
  }

  const handleCanvasSubmit = async (imageBase64: string) => {
    if (!config.geminiApiKey) {
      setOcrError('Gemini API 키가 설정되지 않았습니다.')
      return
    }
    setOcrLoading(true)
    setOcrError('')
    try {
      const recognized = await recognizeHandwriting(imageBase64, config.geminiApiKey)
      setUserAnswer(recognized)
      handleAnswer(recognized)
    } catch {
      setOcrError('인식에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setOcrLoading(false)
    }
  }

  const nextWord = () => {
    setShowResult(false)
    setUserAnswer('')
    setOcrError('')

    if (currentIndex + 1 >= words.length) {
      if (student) {
        const pts = calculatePracticePoints(config.pointConfig)
        addPracticeLog(student.studentCode, {
          date: new Date().toISOString(),
          mode,
          wordsStudied: words.length,
          correctCount,
          totalCount: words.length,
          pointsAwarded: pts,
        })
        if (pts > 0 && config.growndApiKey) {
          enqueue({
            studentCode: student.studentCode,
            points: pts,
            type: 'reward',
            description: `영어 연습 완료 (${correctCount}/${words.length})`,
          })
        }
      }
      setStep('done')
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const playWord = useCallback(() => {
    if (currentWord) speak(currentWord.english)
  }, [currentWord])

  useEffect(() => {
    if (step === 'session' && currentWord && (mode === 'listen-typing' || mode === 'listen-writing')) {
      const timer = setTimeout(() => playWord(), 300)
      return () => clearTimeout(timer)
    }
  }, [step, currentIndex, currentWord, mode, playWord])

  if (!student || !progress) return null

  if (step === 'select') {
    const isOcrAvailable = !!config.geminiApiKey
    return (
      <div className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-gray-800 text-center">연습 모드 선택</h2>
        <p className="text-gray-500 text-center">현재 {progress.currentRound}회차 범위의 단어를 연습합니다.</p>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => startPractice('meaning-typing')}
            className="p-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-emerald-300 hover:shadow-md transition-all text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📖</span>
              <div>
                <h3 className="font-bold text-gray-800">뜻 보고 타이핑</h3>
                <p className="text-sm text-gray-500">한글 뜻을 보고 영어 단어를 입력</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => startPractice('listen-typing')}
            className="p-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-blue-300 hover:shadow-md transition-all text-left active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎧</span>
              <div>
                <h3 className="font-bold text-gray-800">듣고 타이핑</h3>
                <p className="text-sm text-gray-500">발음을 듣고 영어 단어를 입력</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => startPractice('meaning-writing')}
            disabled={!isOcrAvailable}
            className="p-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-purple-300 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">✍️</span>
              <div>
                <h3 className="font-bold text-gray-800">뜻 보고 쓰기</h3>
                <p className="text-sm text-gray-500">한글 뜻을 보고 터치펜으로 쓰기</p>
                {!isOcrAvailable && (
                  <p className="text-xs text-red-500 mt-1">Gemini API 키 필요</p>
                )}
              </div>
            </div>
          </button>

          <button
            onClick={() => startPractice('listen-writing')}
            disabled={!isOcrAvailable}
            className="p-5 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-orange-300 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎤</span>
              <div>
                <h3 className="font-bold text-gray-800">듣고 쓰기</h3>
                <p className="text-sm text-gray-500">발음을 듣고 터치펜으로 쓰기</p>
                {!isOcrAvailable && (
                  <p className="text-xs text-red-500 mt-1">Gemini API 키 필요</p>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    const pts = calculatePracticePoints(config.pointConfig)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-6xl">{correctCount === words.length ? '🎉' : '💪'}</div>
        <h2 className="text-2xl font-bold text-gray-800">연습 완료!</h2>
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm text-center">
          <p className="text-4xl font-bold text-indigo-600 mb-2">
            {correctCount} / {words.length}
          </p>
          <p className="text-gray-500">정답률 {Math.round((correctCount / words.length) * 100)}%</p>
          {pts > 0 && (
            <p className="text-emerald-600 font-semibold mt-2">+{pts} 포인트 획득!</p>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          돌아가기
        </button>
      </div>
    )
  }

  if (!currentWord) return null
  const isListenMode = mode === 'listen-typing' || mode === 'listen-writing'
  const isWritingMode = mode === 'meaning-writing' || mode === 'listen-writing'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {words.length}
        </span>
        <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-indigo-600">{correctCount}점</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        {isListenMode ? (
          <div>
            <button
              onClick={playWord}
              className="text-6xl mb-4 hover:scale-110 transition-transform active:scale-95"
            >
              🔊
            </button>
            <p className="text-gray-500">클릭하여 다시 듣기</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-sm mb-2">이 단어의 영어는?</p>
            <p className="text-3xl font-bold text-gray-800">{currentWord.korean}</p>
          </div>
        )}
      </div>

      {showResult ? (
        <div className={`rounded-2xl p-6 text-center ${isCorrect ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <div className="text-4xl mb-2">{isCorrect ? '⭕' : '❌'}</div>
          <p className={`text-xl font-bold ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
            {isCorrect ? '정답!' : '오답'}
          </p>
          {!isCorrect && (
            <div className="mt-3">
              <p className="text-sm text-gray-500">내 답: <span className="font-semibold">{userAnswer}</span></p>
              <p className="text-lg font-bold text-gray-800 mt-1">
                정답: <span className="text-indigo-600">{currentWord.english}</span>
              </p>
              <p className="text-sm text-gray-500 mt-1">{currentWord.korean}</p>
            </div>
          )}
          {isCorrect && (
            <p className="text-lg font-bold text-emerald-700 mt-1">{currentWord.english}</p>
          )}
          <button
            onClick={nextWord}
            className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            {currentIndex + 1 >= words.length ? '결과 보기' : '다음'}
          </button>
        </div>
      ) : isWritingMode ? (
        <div>
          <HandwritingCanvas onSubmit={handleCanvasSubmit} disabled={ocrLoading} />
          {ocrLoading && (
            <p className="text-center text-indigo-600 mt-2 animate-pulse">인식 중...</p>
          )}
          {ocrError && (
            <p className="text-center text-red-500 mt-2">{ocrError}</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleTypingSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="영어 단어를 입력하세요"
            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-xl text-center focus:border-indigo-400 focus:outline-none transition-colors"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!userAnswer.trim()}
            className="py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            확인
          </button>
        </form>
      )}
    </div>
  )
}

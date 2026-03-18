import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudentStore } from '../../stores/studentStore'
import { useConfigStore } from '../../stores/configStore'
import { useProgressStore } from '../../stores/progressStore'
import { usePointQueueStore } from '../../stores/pointQueueStore'
import { useStudentConfig } from '../../hooks/useStudentConfig'
import { getGradeWords } from '../../data/words'
import { getWordsForRound, pickRandomWords, generateMultipleChoices } from '../../utils/wordSets'
import { checkAnswer, calculateQuizPoints } from '../../utils/scoring'
import { speak } from '../../services/tts'
import { recognizeHandwriting } from '../../services/geminiApi'
import { HandwritingCanvas } from '../handwriting/HandwritingCanvas'
import { playCorrectSound, playWrongSound } from '../../utils/sounds'
import type { Word, QuizFormat } from '../../types'

type QuizStep = 'intro' | 'session' | 'result'

interface AnswerRecord {
  wordId: number
  correct: boolean
  userAnswer: string
}

export function QuizSession() {
  const navigate = useNavigate()
  const student = useStudentStore((s) => s.currentStudent)
  const config = useConfigStore((s) => s.config)
  const progress = useProgressStore((s) =>
    student ? s.progressMap[student.studentCode] : undefined
  )
  const addQuizRecord = useProgressStore((s) => s.addQuizRecord)
  const advanceRound = useProgressStore((s) => s.advanceRound)
  const addWrongWords = useProgressStore((s) => s.addWrongWords)
  const removeWrongWord = useProgressStore((s) => s.removeWrongWord)
  const enqueue = usePointQueueStore((s) => s.enqueue)
  const { effectiveGrade, effectiveQuizFormat, customSets } = useStudentConfig()

  const [step, setStep] = useState<QuizStep>('intro')
  const [quizWords, setQuizWords] = useState<Word[]>([])
  const [allRoundWords, setAllRoundWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [choices, setChoices] = useState<string[]>([])
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

  const format: QuizFormat = effectiveQuizFormat
  const totalQ = config.pointConfig.quiz.totalQuestions

  useEffect(() => {
    if (!student) navigate('/')
  }, [student, navigate])

  const startQuiz = useCallback(() => {
    if (!progress) return
    const gradeWords = getGradeWords(effectiveGrade, customSets)
    if (!gradeWords) return

    const roundWords = getWordsForRound(gradeWords.words, progress.currentRound)
    setAllRoundWords(roundWords)
    const selected = pickRandomWords(roundWords, totalQ)
    setQuizWords(selected)
    setCurrentIndex(0)
    setAnswers([])
    setStep('session')
  }, [progress, effectiveGrade, totalQ, customSets])

  const currentWord = quizWords[currentIndex]

  useEffect(() => {
    if (step === 'session' && currentWord && format === 'multipleChoice') {
      setChoices(generateMultipleChoices(currentWord, allRoundWords, 4))
    }
  }, [step, currentIndex, currentWord, format, allRoundWords])

  const handleAnswer = useCallback(
    (answer: string) => {
      if (!currentWord || !student) return
      const correct = checkAnswer(answer, currentWord.english)
      setIsCorrect(correct)
      setUserAnswer(answer)
      setShowResult(true)
      setAnswers((prev) => [...prev, { wordId: currentWord.id, correct, userAnswer: answer }])

      if (correct) {
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

  const handleChoiceSelect = (choice: string) => {
    if (!currentWord) return
    const correct = choice === currentWord.korean
    setIsCorrect(correct)
    setUserAnswer(choice)
    setShowResult(true)
    setAnswers((prev) => [
      ...prev,
      { wordId: currentWord.id, correct, userAnswer: choice },
    ])

    if (correct && student) {
      removeWrongWord(student.studentCode, currentWord.id)
      playCorrectSound()
    } else if (!correct && student) {
      addWrongWords(student.studentCode, [currentWord.id])
      playWrongSound()
    }
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

    if (currentIndex + 1 >= quizWords.length) {
      finishQuiz()
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const finishQuiz = () => {
    if (!student || !progress) return
    const score = answers.length > 0
      ? answers.filter((a) => a.correct).length
      : 0
    const total = quizWords.length
    const { totalPoints, passed } = calculateQuizPoints(
      score,
      progress.currentRound,
      config.pointConfig
    )

    addQuizRecord(student.studentCode, {
      round: progress.currentRound,
      date: new Date().toISOString(),
      score,
      total,
      passed,
      pointsAwarded: totalPoints,
      answers,
    })

    if (passed) {
      advanceRound(student.studentCode)
      if (totalPoints > 0 && config.growndApiKey) {
        enqueue({
          studentCode: student.studentCode,
          points: totalPoints,
          type: 'reward',
          description: `퀴즈 ${progress.currentRound}회차 통과 (${score}/${total})`,
        })
      }
    }

    setStep('result')
  }

  const playWord = useCallback(() => {
    if (currentWord) speak(currentWord.english)
  }, [currentWord])

  if (!student || !progress) return null

  if (step === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-6xl">🏆</div>
        <h2 className="text-2xl font-bold text-gray-800">{progress.currentRound}회차 퀴즈</h2>
        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
          <div className="flex flex-col gap-3 text-center">
            <div className="flex justify-between">
              <span className="text-gray-500">범위</span>
              <span className="font-semibold">세트 1~{progress.currentRound} ({progress.currentRound * 10}단어)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">문제 수</span>
              <span className="font-semibold">{totalQ}문제</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">통과 기준</span>
              <span className="font-semibold">{config.pointConfig.quiz.passThreshold}개 이상</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">형식</span>
              <span className="font-semibold">
                {format === 'typing' ? '타이핑' : format === 'ocr' ? '쓰기' : '객관식'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">기본 포인트</span>
              <span className="font-semibold text-indigo-600">{config.pointConfig.quiz.basePoints}점</span>
            </div>
          </div>
        </div>
        <button
          onClick={startQuiz}
          className="px-12 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl text-lg font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all active:scale-95"
        >
          퀴즈 시작!
        </button>
      </div>
    )
  }

  if (step === 'result') {
    const score = answers.filter((a) => a.correct).length
    const total = quizWords.length
    const didPass = score >= config.pointConfig.quiz.passThreshold
    const { totalPoints, basePoints, bonusPoints } = calculateQuizPoints(
      score,
      progress.currentRound - (didPass ? 1 : 0),
      config.pointConfig
    )

    return (
      <div className="flex flex-col items-center gap-6">
        <div className="text-6xl">{didPass ? '🎉' : '😢'}</div>
        <h2 className="text-2xl font-bold text-gray-800">
          {didPass ? '축하합니다! 통과!' : '아쉽네요...'}
        </h2>

        <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm text-center">
          <p className="text-5xl font-bold text-indigo-600 mb-2">
            {score} / {total}
          </p>
          {didPass && totalPoints > 0 && (
            <div className="mt-3 bg-emerald-50 rounded-xl p-3">
              <p className="text-emerald-700 font-semibold text-lg">+{totalPoints} 포인트!</p>
              <p className="text-sm text-emerald-600">
                기본 {basePoints} + 보너스 {bonusPoints}
              </p>
            </div>
          )}
          {!didPass && (
            <p className="text-gray-500 mt-2">
              {config.pointConfig.quiz.passThreshold}개 이상 맞춰야 통과입니다.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 w-full max-w-sm">
          <h3 className="font-bold text-gray-700 mb-3">문제별 결과</h3>
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
            {answers.map((a, i) => {
              const word = quizWords[i]
              return (
                <div
                  key={i}
                  className={`flex justify-between items-center p-2 rounded-lg ${
                    a.correct ? 'bg-emerald-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{a.correct ? '⭕' : '❌'}</span>
                    <span className="font-semibold text-sm">{word?.english}</span>
                    <span className="text-xs text-gray-500">({word?.korean})</span>
                  </div>
                  {!a.correct && (
                    <span className="text-xs text-red-500">{a.userAnswer}</span>
                  )}
                </div>
              )
            })}
          </div>
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
  const isMultipleChoice = format === 'multipleChoice'
  const isOcr = format === 'ocr'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {currentIndex + 1} / {quizWords.length}
        </span>
        <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / quizWords.length) * 100}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-purple-600">
          {answers.filter((a) => a.correct).length}점
        </span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        {isMultipleChoice ? (
          <div>
            <p className="text-gray-500 text-sm mb-2">이 단어의 뜻은?</p>
            <p className="text-3xl font-bold text-gray-800">{currentWord.english}</p>
            <button
              onClick={playWord}
              className="mt-2 text-2xl hover:scale-110 transition-transform"
            >
              🔊
            </button>
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
            <div className="mt-2">
              <p className="text-lg font-bold text-gray-800">
                정답: <span className="text-indigo-600">{isMultipleChoice ? currentWord.korean : currentWord.english}</span>
              </p>
            </div>
          )}
          <button
            onClick={nextWord}
            className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            {currentIndex + 1 >= quizWords.length ? '결과 보기' : '다음'}
          </button>
        </div>
      ) : isMultipleChoice ? (
        <div className="grid grid-cols-1 gap-3">
          {choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoiceSelect(choice)}
              className="p-4 bg-white border-2 border-gray-200 rounded-xl text-lg font-semibold hover:border-indigo-400 hover:bg-indigo-50 transition-all active:scale-[0.98]"
            >
              {choice}
            </button>
          ))}
        </div>
      ) : isOcr ? (
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
            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-xl text-center focus:border-purple-400 focus:outline-none transition-colors"
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!userAnswer.trim()}
            className="py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            확인
          </button>
        </form>
      )}
    </div>
  )
}

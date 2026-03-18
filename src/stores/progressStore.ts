import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudentProgress, QuizRecord, PracticeLog } from '../types'

interface ProgressState {
  progressMap: Record<number, StudentProgress>
  getProgress: (studentCode: number) => StudentProgress | undefined
  initProgress: (studentCode: number, studentName: string) => void
  setStudentGrade: (studentCode: number, grade: string) => void
  setStudentQuizFormat: (studentCode: number, format: string | undefined) => void
  addQuizRecord: (studentCode: number, record: QuizRecord) => void
  addPracticeLog: (studentCode: number, log: PracticeLog) => void
  advanceRound: (studentCode: number) => void
  addWrongWords: (studentCode: number, wordIds: number[]) => void
  removeWrongWord: (studentCode: number, wordId: number) => void
  importProgress: (data: Record<number, StudentProgress>) => void
  clearAll: () => void
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progressMap: {},

      getProgress: (studentCode) => get().progressMap[studentCode],

      initProgress: (studentCode, studentName) => {
        if (get().progressMap[studentCode]) return
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: {
              studentCode,
              studentName,
              currentRound: 1,
              quizHistory: [],
              practiceLog: [],
              wrongWords: [],
            },
          },
        })
      },

      setStudentGrade: (studentCode, grade) => {
        const current = get().progressMap[studentCode]
        if (!current) return
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: { ...current, assignedGrade: grade },
          },
        })
      },

      setStudentQuizFormat: (studentCode, format) => {
        const current = get().progressMap[studentCode]
        if (!current) return
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: {
              ...current,
              assignedQuizFormat: format as StudentProgress['assignedQuizFormat'],
            },
          },
        })
      },

      addQuizRecord: (studentCode, record) => {
        const current = get().progressMap[studentCode]
        if (!current) return
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: {
              ...current,
              quizHistory: [...current.quizHistory, record],
            },
          },
        })
      },

      addPracticeLog: (studentCode, log) => {
        const current = get().progressMap[studentCode]
        if (!current) return
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: {
              ...current,
              practiceLog: [...current.practiceLog, log],
            },
          },
        })
      },

      advanceRound: (studentCode) => {
        const current = get().progressMap[studentCode]
        if (!current) return
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: {
              ...current,
              currentRound: Math.min(current.currentRound + 1, 20),
            },
          },
        })
      },

      addWrongWords: (studentCode, wordIds) => {
        const current = get().progressMap[studentCode]
        if (!current) return
        const newWrong = [...new Set([...current.wrongWords, ...wordIds])]
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: { ...current, wrongWords: newWrong },
          },
        })
      },

      removeWrongWord: (studentCode, wordId) => {
        const current = get().progressMap[studentCode]
        if (!current) return
        set({
          progressMap: {
            ...get().progressMap,
            [studentCode]: {
              ...current,
              wrongWords: current.wrongWords.filter((id) => id !== wordId),
            },
          },
        })
      },

      importProgress: (data) => set({ progressMap: data }),

      clearAll: () => set({ progressMap: {} }),
    }),
    { name: 'grownd-quiz-progress' }
  )
)

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppConfig, PointConfig, QuizFormat, TtsConfig } from '../types'

const defaultPointConfig: PointConfig = {
  practice: { completionPoints: 1 },
  quiz: {
    passThreshold: 7,
    totalQuestions: 10,
    basePoints: 5,
    bonusTiers: [
      { score: 8, bonusPoints: 1 },
      { score: 9, bonusPoints: 2 },
      { score: 10, bonusPoints: 3 },
    ],
    roundMultiplier: 0.5,
  },
  quizFormat: 'typing' as QuizFormat,
}

interface ConfigState {
  config: AppConfig
  isAdminLoggedIn: boolean
  setConfig: (config: Partial<AppConfig>) => void
  setPointConfig: (pointConfig: Partial<PointConfig>) => void
  loginAdmin: (password: string) => boolean
  logoutAdmin: () => void
  resetConfig: () => void
}

const defaultTtsConfig: TtsConfig = {
  wordRate: 0.8,
  sentenceRate: 0.85,
}

const defaultConfig: AppConfig = {
  growndApiKey: '',
  growndClassId: '',
  geminiApiKey: '',
  studentCodeRange: { start: 1, end: 30 },
  selectedGrade: 'elementary3',
  pointConfig: defaultPointConfig,
  ttsConfig: defaultTtsConfig,
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: defaultConfig,
      isAdminLoggedIn: false,

      setConfig: (partial) =>
        set({ config: { ...get().config, ...partial } }),

      setPointConfig: (partial) =>
        set({
          config: {
            ...get().config,
            pointConfig: { ...get().config.pointConfig, ...partial },
          },
        }),

      loginAdmin: (password: string) => {
        if (password === 'asdqwe123') {
          set({ isAdminLoggedIn: true })
          return true
        }
        return false
      },

      logoutAdmin: () => set({ isAdminLoggedIn: false }),

      resetConfig: () => set({ config: defaultConfig, isAdminLoggedIn: false }),
    }),
    {
      name: 'grownd-quiz-config',
      partialize: (state) => ({ config: state.config }),
    }
  )
)

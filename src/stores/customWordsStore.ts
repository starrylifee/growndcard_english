import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CustomWordSet, Word } from '../types'

let idCounter = 0

interface CustomWordsState {
  sets: CustomWordSet[]
  addSet: (name: string, description?: string) => string
  updateSet: (id: string, data: Partial<Pick<CustomWordSet, 'name' | 'description'>>) => void
  deleteSet: (id: string) => void
  addWord: (setId: string, word: Omit<Word, 'id'>) => void
  addWords: (setId: string, words: Omit<Word, 'id'>[]) => void
  updateWord: (setId: string, wordId: number, data: Partial<Omit<Word, 'id'>>) => void
  deleteWord: (setId: string, wordId: number) => void
  reorderWords: (setId: string, words: Word[]) => void
  importSets: (sets: CustomWordSet[]) => void
  clearAll: () => void
}

function nextWordId(words: Word[]): number {
  if (words.length === 0) return 1
  return Math.max(...words.map((w) => w.id)) + 1
}

export const useCustomWordsStore = create<CustomWordsState>()(
  persist(
    (set, get) => ({
      sets: [],

      addSet: (name, description) => {
        const id = `custom_${Date.now()}_${idCounter++}`
        const now = new Date().toISOString()
        set({
          sets: [
            ...get().sets,
            { id, name, description, words: [], createdAt: now, updatedAt: now },
          ],
        })
        return id
      },

      updateSet: (id, data) =>
        set({
          sets: get().sets.map((s) =>
            s.id === id
              ? { ...s, ...data, updatedAt: new Date().toISOString() }
              : s
          ),
        }),

      deleteSet: (id) =>
        set({ sets: get().sets.filter((s) => s.id !== id) }),

      addWord: (setId, word) =>
        set({
          sets: get().sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  words: [...s.words, { ...word, id: nextWordId(s.words) }],
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }),

      addWords: (setId, words) =>
        set({
          sets: get().sets.map((s) => {
            if (s.id !== setId) return s
            let nextId = nextWordId(s.words)
            const newWords = words.map((w) => ({ ...w, id: nextId++ }))
            return {
              ...s,
              words: [...s.words, ...newWords],
              updatedAt: new Date().toISOString(),
            }
          }),
        }),

      updateWord: (setId, wordId, data) =>
        set({
          sets: get().sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  words: s.words.map((w) =>
                    w.id === wordId ? { ...w, ...data } : w
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }),

      deleteWord: (setId, wordId) =>
        set({
          sets: get().sets.map((s) =>
            s.id === setId
              ? {
                  ...s,
                  words: s.words.filter((w) => w.id !== wordId),
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }),

      reorderWords: (setId, words) =>
        set({
          sets: get().sets.map((s) =>
            s.id === setId
              ? { ...s, words, updatedAt: new Date().toISOString() }
              : s
          ),
        }),

      importSets: (newSets) => {
        const existing = get().sets
        const merged = [...existing]
        for (const ns of newSets) {
          const idx = merged.findIndex((s) => s.id === ns.id)
          if (idx >= 0) {
            merged[idx] = ns
          } else {
            merged.push(ns)
          }
        }
        set({ sets: merged })
      },

      clearAll: () => set({ sets: [] }),
    }),
    { name: 'grownd-quiz-custom-words' }
  )
)

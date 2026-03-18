import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PointQueueItem } from '../types'

interface PointQueueState {
  queue: PointQueueItem[]
  enqueue: (item: Omit<PointQueueItem, 'id' | 'createdAt' | 'retryCount' | 'status'>) => void
  updateStatus: (id: string, status: PointQueueItem['status']) => void
  incrementRetry: (id: string) => void
  removeItem: (id: string) => void
  getPending: () => PointQueueItem[]
  clearSent: () => void
  clearAll: () => void
}

let counter = 0

export const usePointQueueStore = create<PointQueueState>()(
  persist(
    (set, get) => ({
      queue: [],

      enqueue: (item) => {
        const newItem: PointQueueItem = {
          ...item,
          id: `pq_${Date.now()}_${counter++}`,
          createdAt: new Date().toISOString(),
          retryCount: 0,
          status: 'pending',
        }
        set({ queue: [...get().queue, newItem] })
      },

      updateStatus: (id, status) =>
        set({
          queue: get().queue.map((item) =>
            item.id === id ? { ...item, status } : item
          ),
        }),

      incrementRetry: (id) =>
        set({
          queue: get().queue.map((item) =>
            item.id === id ? { ...item, retryCount: item.retryCount + 1 } : item
          ),
        }),

      removeItem: (id) =>
        set({ queue: get().queue.filter((item) => item.id !== id) }),

      getPending: () =>
        get().queue.filter((item) => item.status === 'pending' || item.status === 'failed'),

      clearSent: () =>
        set({ queue: get().queue.filter((item) => item.status !== 'sent') }),

      clearAll: () => set({ queue: [] }),
    }),
    { name: 'grownd-quiz-point-queue' }
  )
)

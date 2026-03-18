import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StudentInfo } from '../types'

interface StudentState {
  students: StudentInfo[]
  currentStudent: StudentInfo | null
  setStudents: (students: StudentInfo[]) => void
  addStudent: (student: StudentInfo) => void
  selectStudent: (studentCode: number) => void
  clearCurrentStudent: () => void
  clearAll: () => void
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      students: [],
      currentStudent: null,

      setStudents: (students) => set({ students }),

      addStudent: (student) => {
        const existing = get().students
        const idx = existing.findIndex((s) => s.studentCode === student.studentCode)
        if (idx >= 0) {
          const updated = [...existing]
          updated[idx] = student
          set({ students: updated })
        } else {
          set({ students: [...existing, student] })
        }
      },

      selectStudent: (studentCode) => {
        const student = get().students.find((s) => s.studentCode === studentCode)
        if (student) set({ currentStudent: student })
      },

      clearCurrentStudent: () => set({ currentStudent: null }),

      clearAll: () => set({ students: [], currentStudent: null }),
    }),
    { name: 'grownd-quiz-students' }
  )
)

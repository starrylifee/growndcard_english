import { useConfigStore } from '../stores/configStore'
import { useProgressStore } from '../stores/progressStore'
import { useStudentStore } from '../stores/studentStore'
import { useCustomWordsStore } from '../stores/customWordsStore'
import type { QuizFormat, CustomWordSet } from '../types'

export function useStudentConfig() {
  const config = useConfigStore((s) => s.config)
  const student = useStudentStore((s) => s.currentStudent)
  const progress = useProgressStore((s) =>
    student ? s.progressMap[student.studentCode] : undefined
  )
  const customSets: CustomWordSet[] = useCustomWordsStore((s) => s.sets)

  const effectiveGrade = progress?.assignedGrade || config.selectedGrade
  const effectiveQuizFormat: QuizFormat =
    progress?.assignedQuizFormat || config.pointConfig.quizFormat

  return { effectiveGrade, effectiveQuizFormat, customSets }
}

import type { GradeWords, CustomWordSet } from '../../types'
import { elementary1Words } from './elementary1'
import { elementary2Words } from './elementary2'
import { elementary3Words } from './elementary3'
import { elementary4Words } from './elementary4'
import { elementary5Words } from './elementary5'
import { elementary6Words } from './elementary6'
import { middle1Words } from './middle1'
import { middle2Words } from './middle2'
import { middle3Words } from './middle3'

export const allGrades: GradeWords[] = [
  { grade: 'elementary1', gradeLabel: '초1', words: elementary1Words },
  { grade: 'elementary2', gradeLabel: '초2', words: elementary2Words },
  { grade: 'elementary3', gradeLabel: '초3', words: elementary3Words },
  { grade: 'elementary4', gradeLabel: '초4', words: elementary4Words },
  { grade: 'elementary5', gradeLabel: '초5', words: elementary5Words },
  { grade: 'elementary6', gradeLabel: '초6', words: elementary6Words },
  { grade: 'middle1', gradeLabel: '중1', words: middle1Words },
  { grade: 'middle2', gradeLabel: '중2', words: middle2Words },
  { grade: 'middle3', gradeLabel: '중3', words: middle3Words },
]

export function getGradeWords(
  grade: string,
  customSets?: CustomWordSet[]
): GradeWords | undefined {
  const builtIn = allGrades.find((g) => g.grade === grade)
  if (builtIn) return builtIn

  if (customSets) {
    const custom = customSets.find((s) => s.id === grade)
    if (custom) {
      return { grade: custom.id, gradeLabel: custom.name, words: custom.words }
    }
  }

  return undefined
}

export function getGradeLabel(
  grade: string,
  customSets?: CustomWordSet[]
): string {
  const builtIn = allGrades.find((g) => g.grade === grade)
  if (builtIn) return builtIn.gradeLabel

  if (customSets) {
    const custom = customSets.find((s) => s.id === grade)
    if (custom) return custom.name
  }

  return grade
}

export function getAllWordSources(customSets: CustomWordSet[]): GradeWords[] {
  const customs: GradeWords[] = customSets.map((s) => ({
    grade: s.id,
    gradeLabel: s.name,
    words: s.words,
  }))
  return [...allGrades, ...customs]
}

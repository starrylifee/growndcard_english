import type { PointConfig } from '../types'

export function calculateQuizPoints(
  score: number,
  round: number,
  config: PointConfig
): { basePoints: number; bonusPoints: number; totalPoints: number; passed: boolean } {
  const passed = score >= config.quiz.passThreshold
  if (!passed) return { basePoints: 0, bonusPoints: 0, totalPoints: 0, passed }

  const basePoints = config.quiz.basePoints
  const roundBonus = Math.floor((round - 1) * config.quiz.roundMultiplier)

  let bonusPoints = 0
  for (const tier of config.quiz.bonusTiers) {
    if (score >= tier.score) {
      bonusPoints = Math.max(bonusPoints, tier.bonusPoints)
    }
  }

  const totalPoints = basePoints + bonusPoints + roundBonus
  return { basePoints, bonusPoints, totalPoints, passed }
}

export function calculatePracticePoints(config: PointConfig): number {
  return config.practice.completionPoints
}

/**
 * Strips punctuation and extra whitespace, lowercases.
 * Focus is on spelling — periods, commas, apostrophes in contractions are kept,
 * but standalone punctuation is removed.
 */
export function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"""''`~@#$%^&*()[\]{}<>/\\|_+=]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const normalUser = normalizeAnswer(userAnswer)
  const normalCorrect = normalizeAnswer(correctAnswer)

  if (normalUser === normalCorrect) return true

  // Allow missing/extra hyphens: "ice cream" == "ice-cream"
  const dehyphenUser = normalUser.replace(/-/g, ' ').replace(/\s+/g, ' ')
  const dehyphenCorrect = normalCorrect.replace(/-/g, ' ').replace(/\s+/g, ' ')
  if (dehyphenUser === dehyphenCorrect) return true

  return false
}

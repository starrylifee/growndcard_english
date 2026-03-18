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

export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  return normalizeAnswer(userAnswer) === normalizeAnswer(correctAnswer)
}

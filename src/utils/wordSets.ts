import type { Word } from '../types'

const SET_SIZE = 10

export function getSetCount(words: Word[]): number {
  return Math.ceil(words.length / SET_SIZE)
}

export function getSet(words: Word[], setIndex: number): Word[] {
  const start = setIndex * SET_SIZE
  return words.slice(start, start + SET_SIZE)
}

export function getWordsForRound(words: Word[], round: number): Word[] {
  return words.slice(0, round * SET_SIZE)
}

export function pickRandomWords(words: Word[], count: number): Word[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export function generateMultipleChoices(
  correctWord: Word,
  allWords: Word[],
  count: number = 4
): string[] {
  const others = allWords
    .filter((w) => w.id !== correctWord.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, count - 1)
    .map((w) => w.korean)

  const choices = [...others, correctWord.korean].sort(() => Math.random() - 0.5)
  return choices
}

const ANIMAL_EMOJIS = [
  '🐶','🐱','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
  '🐷','🐸','🐵','🐔','🐧','🐦','🦆','🦅','🦉','🐴',
  '🦄','🐝','🐛','🦋','🐌','🐞','🐢','🐍','🦎','🐙',
]

export function getAnimalEmoji(code: number): string {
  return ANIMAL_EMOJIS[(code - 1) % ANIMAL_EMOJIS.length]
}

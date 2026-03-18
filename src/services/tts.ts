let englishVoice: SpeechSynthesisVoice | null = null

function getEnglishVoice(): SpeechSynthesisVoice | null {
  if (englishVoice) return englishVoice
  const voices = speechSynthesis.getVoices()
  englishVoice =
    voices.find((v) => v.lang === 'en-US' && v.localService) ??
    voices.find((v) => v.lang.startsWith('en-US')) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  return englishVoice
}

if (typeof window !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => {
    englishVoice = null
    getEnglishVoice()
  }
}

export function speak(
  text: string,
  rate: number = 0.9
): Promise<void> {
  return new Promise((resolve, reject) => {
    speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = rate
    const voice = getEnglishVoice()
    if (voice) utterance.voice = voice
    utterance.onend = () => resolve()
    utterance.onerror = (e) => reject(e)
    speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking() {
  speechSynthesis.cancel()
}

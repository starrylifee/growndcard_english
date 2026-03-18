export async function recognizeHandwriting(
  imageBase64: string,
  apiKey: string
): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  const prompt = [
    'This image contains handwritten English text (could be a single word, a phrase, or a full sentence).',
    'The text may span multiple lines because the writing area is limited — treat all lines as one continuous text.',
    'Read the handwritten text and return ONLY the text itself.',
    'Rules:',
    '- Combine all lines into a single line of text.',
    '- Keep the original spelling exactly as written.',
    '- Do NOT add any explanation, commentary, or extra punctuation.',
    '- If a dot on the letter "i" or "j" is missing or unclear, still recognize it as "i" or "j".',
    '- Return your best guess if parts are unclear.',
  ].join('\n')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
        },
      }),
    }
  )

  const data = await response.json()

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text.trim()
  }

  throw new Error('Failed to recognize handwriting')
}

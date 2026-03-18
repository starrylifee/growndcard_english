export async function recognizeHandwriting(
  imageBase64: string,
  apiKey: string
): Promise<string> {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'This image contains a single handwritten English word. Read the word and return ONLY the word itself, nothing else. If you cannot read it clearly, return your best guess. Do not add any explanation or punctuation.',
              },
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
          maxOutputTokens: 50,
        },
      }),
    }
  )

  const data = await response.json()

  if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text.trim().toLowerCase()
  }

  throw new Error('Failed to recognize handwriting')
}

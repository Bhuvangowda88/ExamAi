import { GoogleGenerativeAI } from '@google/generative-ai'
import type { LLMProvider } from '../types'

const DEFAULT_MODEL = 'gemini-2.5-flash'

export const geminiProvider: LLMProvider = {
  id: 'gemini',
  label: 'Gemini',
  defaultModel: DEFAULT_MODEL,
  async *generateStream({ prompt, model, apiKey, signal, imageBase64, imageMimeType }) {
    if (!apiKey) throw new Error('Gemini API key required')

    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = model?.trim() || DEFAULT_MODEL
    const genModel = genAI.getGenerativeModel({ model: modelName })
    const stream = imageBase64
      ? await genModel.generateContentStream({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: imageBase64, mimeType: imageMimeType || 'image/png' } }
            ]
          }
        ]
      })
      : await genModel.generateContentStream(prompt)

    for await (const chunk of stream.stream) {
      if (signal?.aborted) return

      const text = chunk.text()
      if (text) {
        yield { text }
      }
    }
  }
}

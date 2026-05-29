import type { LLMProvider } from '../types'
import { readErrorBody, streamSseData } from '../streamUtils'

const DEFAULT_MODEL = 'gpt-4o'

export const openaiProvider: LLMProvider = {
  id: 'openai',
  label: 'OpenAI',
  defaultModel: DEFAULT_MODEL,
  async *generateStream({ prompt, model, apiKey, signal, imageBase64, imageMimeType }) {
    if (!apiKey) throw new Error('OpenAI API key required')

    const content = imageBase64
      ? [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: { url: `data:${imageMimeType || 'image/png'};base64,${imageBase64}` }
        }
      ]
      : prompt

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model?.trim() || DEFAULT_MODEL,
        stream: true,
        messages: [{ role: 'user', content }]
      })
    })

    if (!response.ok) {
      const detail = await readErrorBody(response)
      throw new Error(`OpenAI error ${response.status}: ${detail || response.statusText}`)
    }

    for await (const data of streamSseData(response, signal)) {
      let parsed: any
      try {
        parsed = JSON.parse(data)
      } catch {
        continue
      }

      const text = parsed?.choices?.[0]?.delta?.content
      if (text) {
        yield { text }
      }
    }
  }
}

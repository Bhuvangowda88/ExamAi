import type { LLMProvider } from '../types'
import { readErrorBody, streamSseData } from '../streamUtils'

const DEFAULT_MODEL = 'claude-3-5-sonnet-20240620'

export const anthropicProvider: LLMProvider = {
  id: 'anthropic',
  label: 'Anthropic',
  defaultModel: DEFAULT_MODEL,
  async *generateStream({ prompt, model, apiKey, signal, imageBase64, imageMimeType }) {
    if (!apiKey) throw new Error('Anthropic API key required')

    const content = imageBase64
      ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageMimeType || 'image/png',
            data: imageBase64
          }
        },
        { type: 'text', text: prompt }
      ]
      : prompt

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: model?.trim() || DEFAULT_MODEL,
        max_tokens: 1024,
        stream: true,
        messages: [{ role: 'user', content }]
      })
    })

    if (!response.ok) {
      const detail = await readErrorBody(response)
      throw new Error(`Anthropic error ${response.status}: ${detail || response.statusText}`)
    }

    for await (const data of streamSseData(response, signal)) {
      let parsed: any
      try {
        parsed = JSON.parse(data)
      } catch {
        continue
      }

      if (parsed?.type === 'content_block_delta') {
        const text = parsed?.delta?.text
        if (text) {
          yield { text }
        }
      }
    }
  }
}

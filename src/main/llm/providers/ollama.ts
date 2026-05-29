import type { LLMProvider } from '../types'
import { readErrorBody, streamJsonLines } from '../streamUtils'

const DEFAULT_MODEL = 'llama3'
const DEFAULT_BASE_URL = 'http://localhost:11434'

export const ollamaProvider: LLMProvider = {
  id: 'ollama',
  label: 'Ollama',
  defaultModel: DEFAULT_MODEL,
  async *generateStream({ prompt, model, baseUrl, signal }) {
    const resolvedBaseUrl = baseUrl?.trim() || process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL

    const response = await fetch(`${resolvedBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model?.trim() || DEFAULT_MODEL,
        prompt,
        stream: true
      })
    })

    if (!response.ok) {
      const detail = await readErrorBody(response)
      throw new Error(`Ollama error ${response.status}: ${detail || response.statusText}`)
    }

    for await (const data of streamJsonLines(response, signal)) {
      if (data?.response) {
        yield { text: data.response }
      }
      if (data?.done) return
    }
  }
}

import { buildPrompt } from './promptBuilder'
import type { GenerationOptions } from './types'
import { getProvider } from './providerRegistry'

interface GeneratePayload {
  transcript: string
  apiKey?: string
  requestId: string
  options: GenerationOptions
  promptOverride?: string
  imageBase64?: string
  imageMimeType?: string
}

interface ActiveRequest {
  cancelled: boolean
  controller: AbortController
}

export class LLMService {
  private activeRequests = new Map<string, ActiveRequest>()

  async generate(payload: GeneratePayload, onChunk?: (text: string) => void): Promise<string> {
    const { transcript, apiKey, requestId, options } = payload

    if (!transcript.trim()) throw new Error('No transcript')
    if (!requestId) throw new Error('Missing request id')

    const resolvedOptions: GenerationOptions = {
      format: options?.format || 'direct',
      tone: options?.tone || 'professional',
      length: options?.length || 'medium',
      followUps: Boolean(options?.followUps),
      mode: options?.mode,
      model: options?.model,
      profile: options?.profile,
      provider: options?.provider,
      providerConfig: options?.providerConfig
    }

    const provider = getProvider(resolvedOptions.provider)
    const modelName = resolvedOptions.model?.trim() || provider.defaultModel
    const prompt = payload.promptOverride?.trim() || buildPrompt(transcript, resolvedOptions)
    const imageBase64 = payload.imageBase64
    const imageMimeType = payload.imageMimeType

    const controller = new AbortController()
    this.activeRequests.set(requestId, { cancelled: false, controller })

    let fullText = ''

    try {
      for await (const chunk of provider.generateStream({
        prompt,
        model: modelName,
        apiKey,
        baseUrl: resolvedOptions.providerConfig?.baseUrl,
        signal: controller.signal,
        imageBase64,
        imageMimeType
      })) {
        const text = chunk.text
        if (!text) continue

        const requestState = this.activeRequests.get(requestId)
        if (!requestState || requestState.cancelled) break

        fullText += text
        onChunk?.(text)
      }

      if (this.activeRequests.get(requestId)?.cancelled && !fullText.trim()) {
        throw new Error('Generation canceled')
      }

      return fullText.trim()
    } finally {
      this.activeRequests.delete(requestId)
    }
  }

  cancel(requestId: string): void {
    if (!requestId) return
    const state = this.activeRequests.get(requestId)
    if (!state) return

    state.cancelled = true
    state.controller.abort()
  }
}

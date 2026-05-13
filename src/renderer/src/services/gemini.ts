import type { GenerationOptions } from '../types'

interface GenerateRequest {
  transcript: string
  apiKey: string
  requestId: string
  options: GenerationOptions
  onChunk?: (text: string) => void
}

export async function generateAnswer({ transcript, apiKey, requestId, options, onChunk }: GenerateRequest): Promise<string> {
  if (!apiKey) throw new Error('API key required')
  if (!transcript.trim()) throw new Error('No transcript')

  if (!window.electronAPI?.generateAnswer) {
    throw new Error('Gemini bridge unavailable - restart the app')
  }

  let unsubscribe: (() => void) | null = null
  try {
    if (onChunk && window.electronAPI?.onGeminiChunk) {
      unsubscribe = window.electronAPI.onGeminiChunk((payload) => {
        if (payload.requestId === requestId) onChunk(payload.text)
      })
    }

    const result = await window.electronAPI.generateAnswer({ transcript, apiKey, requestId, options })

    if (!result) throw new Error('Empty response from Gemini')
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Gemini IPC call failed:', msg)
    throw new Error(`Gemini generation failed: ${msg}`)
  } finally {
    if (unsubscribe) unsubscribe()
  }
}

export async function cancelGeneration(requestId: string): Promise<void> {
  if (!requestId) return
  await window.electronAPI?.cancelGeneration?.(requestId)
}

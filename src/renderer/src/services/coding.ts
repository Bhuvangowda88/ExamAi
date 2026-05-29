import type { GenerationOptions } from '../types'

interface GenerateCodingRequest {
  sourceText?: string
  imageBase64?: string
  imageMimeType?: string
  apiKey: string
  requestId: string
  options: GenerationOptions
  onChunk?: (text: string) => void
}

export async function generateCodingHints({ sourceText, imageBase64, imageMimeType, apiKey, requestId, options, onChunk }: GenerateCodingRequest): Promise<string> {
  if (!apiKey) throw new Error('API key required')
  if (!sourceText?.trim() && !imageBase64) throw new Error('No OCR text or image')

  if (!window.electronAPI?.generateCoding) {
    throw new Error('Coding bridge unavailable - restart the app')
  }

  let unsubscribe: (() => void) | null = null
  try {
    if (onChunk && window.electronAPI?.onCodingChunk) {
      unsubscribe = window.electronAPI.onCodingChunk((payload) => {
        if (payload.requestId === requestId) onChunk(payload.text)
      })
    }

    const result = await window.electronAPI.generateCoding({ sourceText, imageBase64, imageMimeType, apiKey, requestId, options })

    if (!result) throw new Error('Empty response from LLM')
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Coding IPC call failed:', msg)
    throw new Error(`Coding generation failed: ${msg}`)
  } finally {
    if (unsubscribe) unsubscribe()
  }
}

export async function cancelCoding(requestId: string): Promise<void> {
  if (!requestId) return
  await window.electronAPI?.cancelCoding?.(requestId)
}

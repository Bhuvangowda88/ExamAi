import type { GenerationOptions, HistoryItem } from '../types'

interface GenerateSummaryRequest {
  history: HistoryItem[]
  apiKey: string
  requestId: string
  options: GenerationOptions
  onChunk?: (text: string) => void
}

export async function generateSessionSummary({ history, apiKey, requestId, options, onChunk }: GenerateSummaryRequest): Promise<string> {
  if (!apiKey) throw new Error('API key required')
  if (!history.length) throw new Error('No history to summarize')

  if (!window.electronAPI?.generateSessionSummary) {
    throw new Error('Session summary bridge unavailable - restart the app')
  }

  let unsubscribe: (() => void) | null = null
  try {
    if (onChunk && window.electronAPI?.onSessionSummaryChunk) {
      unsubscribe = window.electronAPI.onSessionSummaryChunk((payload) => {
        if (payload.requestId === requestId) onChunk(payload.text)
      })
    }

    const transcript = history.map((item) => ({
      question: item.question,
      answer: item.answer
    }))

    const result = await window.electronAPI.generateSessionSummary({ history: transcript, apiKey, requestId, options })

    if (!result) throw new Error('Empty response from LLM')
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Session summary IPC call failed:', msg)
    throw new Error(`Session summary failed: ${msg}`)
  } finally {
    if (unsubscribe) unsubscribe()
  }
}

export async function cancelSessionSummary(requestId: string): Promise<void> {
  if (!requestId) return
  await window.electronAPI?.cancelSessionSummary?.(requestId)
}

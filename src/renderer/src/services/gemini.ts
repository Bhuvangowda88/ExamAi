export async function generateAnswer(transcript: string, apiKey: string): Promise<string> {
  if (!apiKey) throw new Error('API key required')
  if (!transcript.trim()) throw new Error('No transcript')

  if (!window.electronAPI?.generateAnswer) {
    throw new Error('Gemini bridge unavailable - restart the app')
  }

  try {
    const result = await window.electronAPI.generateAnswer(transcript, apiKey)
    if (!result) throw new Error('Empty response from Gemini')
    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Gemini IPC call failed:', msg)
    throw new Error(`Gemini generation failed: ${msg}`)
  }
}

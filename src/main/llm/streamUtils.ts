export async function* streamTextLines(response: Response, signal?: AbortSignal): AsyncIterable<string> {
  if (!response.body) return

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    if (signal?.aborted) return

    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''

    for (const line of lines) {
      yield line
    }
  }

  if (buffer) {
    yield buffer
  }
}

export async function* streamSseData(response: Response, signal?: AbortSignal): AsyncIterable<string> {
  for await (const line of streamTextLines(response, signal)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) continue

    const data = trimmed.slice(5).trim()
    if (!data) continue
    if (data === '[DONE]') return

    yield data
  }
}

export async function* streamJsonLines(response: Response, signal?: AbortSignal): AsyncIterable<any> {
  for await (const line of streamTextLines(response, signal)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    try {
      yield JSON.parse(trimmed)
    } catch {
      // Ignore partial lines.
    }
  }
}

export async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

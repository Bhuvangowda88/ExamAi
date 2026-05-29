import { parentPort } from 'worker_threads'
import { createWorker, type Worker as TesseractWorker } from 'tesseract.js'

if (!parentPort) {
  throw new Error('screenOcrWorker must be run as a worker thread')
}

interface OcrPayload {
  requestId: string
  image: Buffer
  lang?: string
  sourceId?: string
}

let worker: TesseractWorker | null = null
let currentLang = ''
let busy = false

function send(type: 'result' | 'status' | 'error', payload: any): void {
  parentPort?.postMessage({ type, payload })
}

async function ensureWorker(lang: string): Promise<TesseractWorker> {
  if (!worker) {
    worker = await createWorker({ logger: () => {} })
    await worker.load()
  }

  if (currentLang !== lang) {
    await worker.loadLanguage(lang)
    await worker.initialize(lang)
    currentLang = lang
  }

  return worker
}

async function runOcr(payload: OcrPayload): Promise<void> {
  if (busy) return

  const lang = payload.lang?.trim() || 'eng'
  busy = true

  try {
    const ocrWorker = await ensureWorker(lang)
    const { data } = await ocrWorker.recognize(payload.image)

    send('result', {
      requestId: payload.requestId,
      timestamp: Date.now(),
      text: data.text || '',
      confidence: data.confidence,
      sourceId: payload.sourceId
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    send('error', { message })
  } finally {
    busy = false
  }
}

async function stopWorker(): Promise<void> {
  if (!worker) return

  try {
    await worker.terminate()
  } catch {
    // Ignore termination failures.
  }

  worker = null
  currentLang = ''
}

parentPort.on('message', (message: { type: string; payload?: OcrPayload }) => {
  if (message.type === 'ocr' && message.payload) {
    runOcr(message.payload)
    return
  }

  if (message.type === 'stop') {
    stopWorker().catch(() => {})
  }
})

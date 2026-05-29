import { desktopCapturer } from 'electron'
import type { DesktopCapturerSource } from 'electron'
import { EventEmitter } from 'events'
import { Worker } from 'worker_threads'
import { join } from 'path'
import type { ScreenOcrFrame, ScreenOcrResult, ScreenOcrStartOptions, ScreenOcrStatus } from './types'

const DEFAULT_INTERVAL_MS = 1200
const DEFAULT_MAX_WIDTH = 1280
const DEFAULT_MAX_HEIGHT = 720
const DEFAULT_LANG = 'eng'

type WorkerMessage =
  | { type: 'result'; payload: ScreenOcrResult }
  | { type: 'status'; payload: ScreenOcrStatus }
  | { type: 'error'; payload: { message: string } }

export class ScreenOcrService extends EventEmitter {
  private worker: Worker | null = null
  private timer: NodeJS.Timeout | null = null
  private status: ScreenOcrStatus = { state: 'idle' }
  private options: ScreenOcrStartOptions | null = null
  private inFlight = false

  async start(options: ScreenOcrStartOptions): Promise<ScreenOcrStatus> {
    if (!options?.requestId) throw new Error('Screen OCR requestId is required')

    await this.stop()

    const normalized: ScreenOcrStartOptions = {
      ...options,
      intervalMs: options.intervalMs ?? DEFAULT_INTERVAL_MS,
      maxWidth: options.maxWidth ?? DEFAULT_MAX_WIDTH,
      maxHeight: options.maxHeight ?? DEFAULT_MAX_HEIGHT,
      lang: options.lang ?? DEFAULT_LANG
    }

    this.options = normalized

    const workerPath = join(__dirname, 'workers/screenOcrWorker.js')
    const worker = new Worker(workerPath, { stdout: false, stderr: false })
    this.worker = worker
    this.attachWorker(worker)

    this.updateStatus({
      state: 'starting',
      requestId: normalized.requestId,
      intervalMs: normalized.intervalMs,
      sourceId: normalized.sourceId
    })

    this.timer = setInterval(() => {
      this.captureAndSend().catch(() => {})
    }, normalized.intervalMs)

    await this.captureAndSend()

    return this.status
  }

  async stop(): Promise<ScreenOcrStatus> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    if (this.worker) {
      const worker = this.worker
      this.worker = null
      worker.postMessage({ type: 'stop' })
      await worker.terminate()
    }

    this.options = null
    this.inFlight = false
    this.updateStatus({ state: 'stopped' })

    return this.status
  }

  getStatus(): ScreenOcrStatus {
    return this.status
  }

  async dispose(): Promise<void> {
    await this.stop()
  }

  private attachWorker(worker: Worker): void {
    worker.on('message', (message: WorkerMessage) => {
      if (message.type === 'result') {
        this.inFlight = false
        this.emit('result', message.payload)
        return
      }

      if (message.type === 'status') {
        this.updateStatus(message.payload)
        return
      }

      if (message.type === 'error') {
        this.inFlight = false
        this.updateStatus({ state: 'error', message: message.payload.message })
      }
    })

    worker.on('error', (error) => {
      this.inFlight = false
      this.updateStatus({ state: 'error', message: error.message })
    })

    worker.on('exit', (code) => {
      this.inFlight = false
      if (this.status.state === 'running' || this.status.state === 'starting') {
        this.updateStatus({
          state: 'stopped',
          message: `OCR worker exited with code ${code ?? 'unknown'}`
        })
      }
    })
  }

  private async captureAndSend(): Promise<void> {
    if (!this.worker || !this.options || this.inFlight) return

    const options = this.options

    try {
      const captureTypes: Array<'window' | 'screen'> = options.sourceId?.startsWith('window:')
        ? ['window', 'screen']
        : ['screen']

      const sources = await desktopCapturer.getSources({
        types: captureTypes,
        thumbnailSize: {
          width: options.maxWidth ?? DEFAULT_MAX_WIDTH,
          height: options.maxHeight ?? DEFAULT_MAX_HEIGHT
        },
        fetchWindowIcons: false
      })

      if (!sources.length) return

      const source = pickBestSource(sources, options.sourceId)
      if (!source || source.thumbnail.isEmpty()) return

      const image = source.thumbnail.toPNG()
      const frame: ScreenOcrFrame = {
        requestId: options.requestId,
        timestamp: Date.now(),
        image: image.toString('base64'),
        mimeType: 'image/png',
        sourceId: source.id
      }

      this.emit('frame', frame)

      this.inFlight = true
      this.updateStatus({
        state: 'running',
        requestId: options.requestId,
        lastRunAt: Date.now(),
        sourceId: source.id
      })

      this.worker.postMessage({
        type: 'ocr',
        payload: {
          requestId: options.requestId,
          image,
          lang: options.lang ?? DEFAULT_LANG,
          sourceId: source.id
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.inFlight = false
      this.updateStatus({ state: 'error', message })
    }
  }

  private updateStatus(status: ScreenOcrStatus): void {
    this.status = { ...this.status, ...status }
    this.emit('status', this.status)
  }
}

function pickBestSource(sources: DesktopCapturerSource[], preferredId?: string): DesktopCapturerSource | null {
  if (preferredId) {
    const match = sources.find((source) => source.id === preferredId)
    if (match) return match
  }

  const screens = sources
    .filter((source) => source.id.startsWith('screen:'))
    .filter((source) => !source.thumbnail.isEmpty())
  if (screens.length) return pickLargest(screens)

  const windows = sources.filter((source) => source.id.startsWith('window:'))
  const filtered = windows.filter((source) => !isOwnWindow(source.name))
  const windowCandidates = filtered.length ? filtered : windows
  const windowVisible = windowCandidates.filter((source) => !source.thumbnail.isEmpty())

  if (windowVisible.length) {
    return pickLargest(windowVisible)
  }

  const anyVisible = sources.find((source) => !source.thumbnail.isEmpty())
  return anyVisible || sources[0] || null
}

function pickLargest(sources: DesktopCapturerSource[]): DesktopCapturerSource {
  return sources.reduce((best, current) => {
    const bestSize = best.thumbnail.getSize()
    const currentSize = current.thumbnail.getSize()
    const bestArea = bestSize.width * bestSize.height
    const currentArea = currentSize.width * currentSize.height
    return currentArea > bestArea ? current : best
  }, sources[0])
}

function isOwnWindow(name: string): boolean {
  const lowered = name.toLowerCase()
  return lowered.includes('interview assistant') || lowered.includes('copilot')
}

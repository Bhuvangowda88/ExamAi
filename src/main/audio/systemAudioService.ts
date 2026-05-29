import { EventEmitter } from 'events'
import { Worker } from 'worker_threads'
import { join } from 'path'
import type { SystemAudioChunk, SystemAudioStartOptions, SystemAudioStatus } from './types'

type WorkerMessage =
  | { type: 'chunk'; payload: SystemAudioChunk }
  | { type: 'status'; payload: SystemAudioStatus }
  | { type: 'error'; payload: { message: string } }

export class SystemAudioService extends EventEmitter {
  private worker: Worker | null = null
  private status: SystemAudioStatus = { state: 'idle' }

  async start(options: SystemAudioStartOptions): Promise<SystemAudioStatus> {
    if (!options?.requestId) throw new Error('System audio requestId is required')

    const normalizedOptions: SystemAudioStartOptions = {
      ...options,
      source: options.source || 'mixed'
    }

    if (this.worker) {
      await this.stop()
    }

    const workerPath = join(__dirname, 'workers/systemAudioWorker.js')
    const worker = new Worker(workerPath, { stdout: false, stderr: false })
    this.worker = worker
    this.attachWorker(worker)

    this.updateStatus({
      state: 'starting',
      requestId: normalizedOptions.requestId,
      source: normalizedOptions.source
    })

    worker.postMessage({ type: 'start', payload: normalizedOptions })

    return this.status
  }

  async stop(): Promise<SystemAudioStatus> {
    if (!this.worker) {
      this.updateStatus({ state: 'stopped' })
      return this.status
    }

    const worker = this.worker
    this.worker = null

    worker.postMessage({ type: 'stop' })
    await worker.terminate()

    this.updateStatus({ state: 'stopped' })

    return this.status
  }

  getStatus(): SystemAudioStatus {
    return this.status
  }

  async dispose(): Promise<void> {
    await this.stop()
  }

  private attachWorker(worker: Worker): void {
    worker.on('message', (message: WorkerMessage) => {
      if (message.type === 'chunk') {
        this.emit('chunk', message.payload)
        return
      }

      if (message.type === 'status') {
        this.updateStatus(message.payload)
        return
      }

      if (message.type === 'error') {
        this.updateStatus({ state: 'error', message: message.payload.message })
      }
    })

    worker.on('error', (error) => {
      this.updateStatus({ state: 'error', message: error.message })
    })

    worker.on('exit', (code) => {
      if (this.status.state === 'running' || this.status.state === 'starting') {
        this.updateStatus({
          state: 'stopped',
          message: `Audio worker exited with code ${code ?? 'unknown'}`
        })
      }
    })
  }

  private updateStatus(status: SystemAudioStatus): void {
    this.status = { ...this.status, ...status }
    this.emit('status', this.status)
  }
}

import { parentPort } from 'worker_threads'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { buildFfmpegArgs, resolveFfmpegPath } from '../audio/ffmpegArgs'
import type { SystemAudioStartOptions } from '../audio/types'

if (!parentPort) {
  throw new Error('systemAudioWorker must be run as a worker thread')
}

let ffmpeg: ChildProcessWithoutNullStreams | null = null
let buffer = Buffer.alloc(0)
let currentRequestId = ''
let currentSampleRate = 16000
let currentChannels = 1
let currentChunkBytes = 0
let startedAt = 0
let runningNotified = false

function send(type: 'chunk' | 'status' | 'error', payload: any): void {
  parentPort?.postMessage({ type, payload })
}

function stopCapture(): void {
  if (ffmpeg) {
    try {
      ffmpeg.kill('SIGKILL')
    } catch {
      // Ignore if process already closed.
    }
  }
  ffmpeg = null
  buffer = Buffer.alloc(0)
  currentRequestId = ''
  currentChunkBytes = 0
  runningNotified = false
}

function startCapture(options: SystemAudioStartOptions): void {
  stopCapture()

  try {
    const { args, sampleRate, channels, chunkMs } = buildFfmpegArgs(options)
    const ffmpegPath = resolveFfmpegPath(options)

    currentRequestId = options.requestId
    currentSampleRate = sampleRate
    currentChannels = channels
    currentChunkBytes = Math.max(1, Math.floor(sampleRate * channels * 2 * (chunkMs / 1000)))
    startedAt = Date.now()
    runningNotified = false

    send('status', {
      state: 'starting',
      requestId: currentRequestId,
      sampleRate: currentSampleRate,
      channels: currentChannels,
      source: options.source,
      startedAt
    })

    ffmpeg = spawn(ffmpegPath, args, { windowsHide: true })

    ffmpeg.stdout.on('data', (data: Buffer) => {
      if (!runningNotified) {
        send('status', {
          state: 'running',
          requestId: currentRequestId,
          sampleRate: currentSampleRate,
          channels: currentChannels,
          source: options.source,
          startedAt
        })
        runningNotified = true
      }

      buffer = Buffer.concat([buffer, data])

      while (buffer.length >= currentChunkBytes) {
        const chunk = buffer.subarray(0, currentChunkBytes)
        buffer = buffer.subarray(currentChunkBytes)

        send('chunk', {
          requestId: currentRequestId,
          timestamp: Date.now(),
          sampleRate: currentSampleRate,
          channels: currentChannels,
          pcm: chunk
        })
      }
    })

    ffmpeg.stderr.on('data', (data: Buffer) => {
      const text = data.toString().trim()
      if (text) {
        send('status', {
          state: 'running',
          requestId: currentRequestId,
          message: text
        })
      }
    })

    ffmpeg.on('error', (error) => {
      send('error', { message: error.message })
    })

    ffmpeg.on('exit', (code) => {
      send('status', {
        state: 'stopped',
        requestId: currentRequestId,
        message: `ffmpeg exited with code ${code ?? 'unknown'}`
      })
      stopCapture()
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    send('error', { message })
    send('status', { state: 'error', requestId: options.requestId, message })
  }
}

parentPort.on('message', (message: { type: string; payload?: SystemAudioStartOptions }) => {
  if (message.type === 'start' && message.payload) {
    startCapture(message.payload)
    return
  }

  if (message.type === 'stop') {
    const requestId = currentRequestId
    stopCapture()
    send('status', { state: 'stopped', requestId })
  }
})

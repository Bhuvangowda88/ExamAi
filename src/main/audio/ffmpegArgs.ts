import type { SystemAudioStartOptions } from './types'

const DEFAULT_SAMPLE_RATE = 16000
const DEFAULT_CHANNELS = 1
const DEFAULT_CHUNK_MS = 100

function wrapDeviceName(name: string): string {
  const trimmed = name.trim()
  const escaped = trimmed.replace(/"/g, '\\"')
  if (escaped.includes(' ')) {
    return `"${escaped}"`
  }
  return escaped
}

function dshowDeviceArg(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return 'audio=default'
  if (trimmed.startsWith('audio=')) return trimmed
  return `audio=${wrapDeviceName(trimmed)}`
}

export function resolveFfmpegPath(options: SystemAudioStartOptions): string {
  return options.ffmpegPath?.trim() || process.env.FFMPEG_PATH || 'ffmpeg'
}

export function buildFfmpegArgs(options: SystemAudioStartOptions): {
  args: string[]
  sampleRate: number
  channels: number
  chunkMs: number
} {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE
  const channels = options.channels ?? DEFAULT_CHANNELS
  const chunkMs = options.chunkMs ?? DEFAULT_CHUNK_MS
  const source = options.source || 'mixed'

  const args: string[] = ['-hide_banner', '-loglevel', 'error']

  if (process.platform === 'win32') {
    const micDevice = options.micDevice?.trim() || 'default'
    const loopbackDevice = options.loopbackDevice?.trim() || 'default'

    if (source === 'mixed') {
      args.push('-thread_queue_size', '512', '-f', 'dshow', '-i', dshowDeviceArg(micDevice))
      args.push('-thread_queue_size', '512', '-f', 'dshow', '-i', dshowDeviceArg(loopbackDevice))
      args.push('-filter_complex', '[0:a][1:a]amix=inputs=2:duration=longest:dropout_transition=2[mix]')
      args.push('-map', '[mix]')
    } else if (source === 'loopback') {
      args.push('-thread_queue_size', '512', '-f', 'dshow', '-i', dshowDeviceArg(loopbackDevice))
    } else {
      args.push('-thread_queue_size', '512', '-f', 'dshow', '-i', dshowDeviceArg(micDevice))
    }
  } else {
    throw new Error('System audio capture is only configured for Windows right now.')
  }

  args.push('-acodec', 'pcm_s16le', '-f', 's16le', '-ac', String(channels), '-ar', String(sampleRate), '-')

  return { args, sampleRate, channels, chunkMs }
}

export type SystemAudioSource = 'mic' | 'loopback' | 'mixed'
export type SystemAudioState = 'idle' | 'starting' | 'running' | 'stopped' | 'error'

export interface SystemAudioStartOptions {
  requestId: string
  source: SystemAudioSource
  sampleRate?: number
  channels?: number
  chunkMs?: number
  ffmpegPath?: string
  micDevice?: string
  loopbackDevice?: string
}

export interface SystemAudioStatus {
  state: SystemAudioState
  message?: string
  requestId?: string
  startedAt?: number
  sampleRate?: number
  channels?: number
  source?: SystemAudioSource
}

export interface SystemAudioChunk {
  requestId: string
  timestamp: number
  sampleRate: number
  channels: number
  pcm: Buffer
}

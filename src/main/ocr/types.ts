export type ScreenOcrState = 'idle' | 'starting' | 'running' | 'stopped' | 'error'

export interface ScreenOcrStartOptions {
  requestId: string
  intervalMs?: number
  sourceId?: string
  lang?: string
  maxWidth?: number
  maxHeight?: number
}

export interface ScreenOcrStatus {
  state: ScreenOcrState
  message?: string
  requestId?: string
  lastRunAt?: number
  intervalMs?: number
  sourceId?: string
}

export interface ScreenOcrResult {
  requestId: string
  timestamp: number
  text: string
  confidence?: number
  sourceId?: string
}

export interface ScreenOcrFrame {
  requestId: string
  timestamp: number
  image: string
  mimeType?: string
  sourceId?: string
}

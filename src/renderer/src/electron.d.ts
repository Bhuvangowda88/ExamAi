import type { LLMProviderId } from './types'

export interface ElectronAPI {
  minimize: () => Promise<void>
  close: () => Promise<void>
  togglePin: () => Promise<boolean>
  setOpacity: (opacity: number) => Promise<void>
  getApiKey: () => Promise<string>
  setApiKey: (apiKey: string) => Promise<boolean>
  getApiKeyStorageInfo: () => Promise<{ secureAvailable: boolean; secureUsed: boolean }>
  getProviderKey: (provider: LLMProviderId) => Promise<string>
  setProviderKey: (provider: LLMProviderId, apiKey: string) => Promise<boolean>
  getProviderKeyInfo: (provider: LLMProviderId) => Promise<{ secureAvailable: boolean; secureUsed: boolean }>
  getActiveProvider: () => Promise<LLMProviderId>
  setActiveProvider: (provider: LLMProviderId) => Promise<boolean>
  generateAnswer: (payload: {
    transcript: string
    apiKey: string
    requestId: string
    options: Record<string, unknown>
  }) => Promise<string>
  cancelGeneration: (requestId: string) => Promise<void>
  onGeminiChunk: (callback: (payload: { requestId: string; text: string }) => void) => () => void
  generateCoding: (payload: {
    sourceText?: string
    imageBase64?: string
    imageMimeType?: string
    apiKey: string
    requestId: string
    options: Record<string, unknown>
  }) => Promise<string>
  cancelCoding: (requestId: string) => Promise<void>
  onCodingChunk: (callback: (payload: { requestId: string; text: string }) => void) => () => void
  onToggleRecording: (callback: () => void) => () => void
  startSystemAudio: (options: {
    requestId: string
    source: 'mic' | 'loopback' | 'mixed'
    sampleRate?: number
    channels?: number
    chunkMs?: number
  }) => Promise<{ state: string; message?: string }>
  stopSystemAudio: () => Promise<{ state: string; message?: string }>
  getSystemAudioStatus: () => Promise<{ state: string; message?: string }>
  onSystemAudioChunk: (callback: (payload: {
    requestId: string
    timestamp: number
    sampleRate: number
    channels: number
    pcm: Uint8Array
  }) => void) => () => void
  onSystemAudioStatus: (callback: (payload: { state: string; message?: string }) => void) => () => void
  startScreenOcr: (options: {
    requestId: string
    intervalMs?: number
    maxWidth?: number
    maxHeight?: number
  }) => Promise<{ state: string; message?: string }>
  stopScreenOcr: () => Promise<{ state: string; message?: string }>
  getScreenOcrStatus: () => Promise<{ state: string; message?: string }>
  onScreenOcrResult: (callback: (payload: {
    requestId: string
    timestamp: number
    text: string
    confidence?: number
  }) => void) => () => void
  onScreenOcrFrame: (callback: (payload: {
    requestId: string
    timestamp: number
    image: string
    mimeType?: string
  }) => void) => () => void
  onScreenOcrStatus: (callback: (payload: { state: string; message?: string }) => void) => () => void
  getMeetingStatus: () => Promise<{ active: boolean; provider?: string; detectedAt: number }>
  onMeetingStatus: (callback: (payload: { active: boolean; provider?: string; detectedAt: number }) => void) => () => void
  generateSessionSummary: (payload: {
    history: Array<{ question: string; answer: string }>
    apiKey: string
    requestId: string
    options: Record<string, unknown>
  }) => Promise<string>
  cancelSessionSummary: (requestId: string) => Promise<void>
  onSessionSummaryChunk: (callback: (payload: { requestId: string; text: string }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}

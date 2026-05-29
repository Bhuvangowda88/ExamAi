export type AnswerFormat = 'direct' | 'star' | 'bullets'
export type AnswerTone = 'professional' | 'friendly' | 'technical'
export type AnswerLength = 'short' | 'medium' | 'long'
export type LLMProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama'
export type InterviewMode = 'behavioral' | 'coding'

export type ProviderKeyMap = Partial<Record<LLMProviderId, string>>
export type ProviderKeyInfoMap = Partial<Record<LLMProviderId, ApiKeyStorageInfo>>

export interface AnswerSettings {
  format: AnswerFormat
  tone: AnswerTone
  length: AnswerLength
  followUps: boolean
  autoGenerate: boolean
  model: string
  provider: LLMProviderId
}

export interface ProfileContext {
  resume: string
  jobDescription: string
  companyNotes: string
}

export interface HistoryItem {
  id: string
  question: string
  answer: string
  createdAt: number
}

export interface ApiKeyStorageInfo {
  secureAvailable: boolean
  secureUsed: boolean
}

export interface ScreenOcrStatus {
  state: 'idle' | 'starting' | 'running' | 'stopped' | 'error'
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

export type SystemAudioState = 'idle' | 'starting' | 'running' | 'stopped' | 'error'
export type SystemAudioSource = 'mic' | 'loopback' | 'mixed'

export interface SystemAudioStatus {
  state: SystemAudioState
  message?: string
  requestId?: string
  startedAt?: number
  sampleRate?: number
  channels?: number
  source?: SystemAudioSource
}

export type MeetingProvider = 'zoom' | 'teams' | 'meet'

export interface MeetingStatus {
  active: boolean
  provider?: MeetingProvider
  title?: string
  detectedAt: number
}

export interface GenerationOptions {
  format: AnswerFormat
  tone: AnswerTone
  length: AnswerLength
  followUps: boolean
  mode?: InterviewMode
  model?: string
  profile?: ProfileContext
  provider?: LLMProviderId
  providerConfig?: {
    baseUrl?: string
  }
}

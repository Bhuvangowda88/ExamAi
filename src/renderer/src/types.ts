export type AnswerFormat = 'direct' | 'star' | 'bullets'
export type AnswerTone = 'professional' | 'friendly' | 'technical'
export type AnswerLength = 'short' | 'medium' | 'long'

export interface AnswerSettings {
  format: AnswerFormat
  tone: AnswerTone
  length: AnswerLength
  followUps: boolean
  autoGenerate: boolean
  model: string
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

export interface GenerationOptions {
  format: AnswerFormat
  tone: AnswerTone
  length: AnswerLength
  followUps: boolean
  model?: string
  profile?: ProfileContext
}

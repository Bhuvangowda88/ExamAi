export type AnswerFormat = 'direct' | 'star' | 'bullets'
export type AnswerTone = 'professional' | 'friendly' | 'technical'
export type AnswerLength = 'short' | 'medium' | 'long'
export type InterviewMode = 'behavioral' | 'coding'

export type LLMProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama'

export interface ProfileContext {
  resume?: string
  jobDescription?: string
  companyNotes?: string
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

export interface LLMChunk {
  text: string
}

export interface LLMGenerateParams {
  prompt: string
  model?: string
  apiKey?: string
  baseUrl?: string
  signal?: AbortSignal
  imageBase64?: string
  imageMimeType?: string
}

export interface LLMProvider {
  id: LLMProviderId
  label: string
  defaultModel: string
  generateStream(params: LLMGenerateParams): AsyncIterable<LLMChunk>
}

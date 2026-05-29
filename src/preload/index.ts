import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  close: () => ipcRenderer.invoke('window-close'),
  togglePin: () => ipcRenderer.invoke('window-toggle-pin'),
  setOpacity: (opacity: number) => ipcRenderer.invoke('set-opacity', opacity),
  getApiKey: () => ipcRenderer.invoke('api-key-get'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('api-key-set', apiKey),
  getApiKeyStorageInfo: () => ipcRenderer.invoke('api-key-info'),
  getProviderKey: (provider: 'gemini' | 'openai' | 'anthropic' | 'ollama') => ipcRenderer.invoke('provider-key-get', provider),
  setProviderKey: (provider: 'gemini' | 'openai' | 'anthropic' | 'ollama', apiKey: string) => ipcRenderer.invoke('provider-key-set', provider, apiKey),
  getProviderKeyInfo: (provider: 'gemini' | 'openai' | 'anthropic' | 'ollama') => ipcRenderer.invoke('provider-key-info', provider),
  getActiveProvider: () => ipcRenderer.invoke('provider-active-get'),
  setActiveProvider: (provider: 'gemini' | 'openai' | 'anthropic' | 'ollama') => ipcRenderer.invoke('provider-active-set', provider),
  generateAnswer: (payload: {
    transcript: string
    apiKey: string
    requestId: string
    options: {
      format: 'direct' | 'star' | 'bullets'
      tone: 'professional' | 'friendly' | 'technical'
      length: 'short' | 'medium' | 'long'
      followUps: boolean
      model?: string
      provider?: 'gemini' | 'openai' | 'anthropic' | 'ollama'
      providerConfig?: {
        baseUrl?: string
      }
      profile?: {
        resume?: string
        jobDescription?: string
        companyNotes?: string
      }
    }
  }) => ipcRenderer.invoke('llm-generate', payload),
  cancelGeneration: (requestId: string) => ipcRenderer.invoke('llm-cancel', requestId),
  onGeminiChunk: (callback: (payload: { requestId: string; text: string }) => void) => {
    const handler = (_: any, payload: { requestId: string; text: string }) => callback(payload)
    ipcRenderer.on('llm-chunk', handler)
    return () => {
      ipcRenderer.removeListener('llm-chunk', handler)
    }
  },
  onLLMChunk: (callback: (payload: { requestId: string; text: string }) => void) => {
    const handler = (_: any, payload: { requestId: string; text: string }) => callback(payload)
    ipcRenderer.on('llm-chunk', handler)
    return () => {
      ipcRenderer.removeListener('llm-chunk', handler)
    }
  },
  getLLMProviders: () => ipcRenderer.invoke('llm-providers'),
  generateCoding: (payload: {
    sourceText?: string
    imageBase64?: string
    imageMimeType?: string
    apiKey: string
    requestId: string
    options: {
      format: 'direct' | 'star' | 'bullets'
      tone: 'professional' | 'friendly' | 'technical'
      length: 'short' | 'medium' | 'long'
      followUps: boolean
      model?: string
      provider?: 'gemini' | 'openai' | 'anthropic' | 'ollama'
      providerConfig?: {
        baseUrl?: string
      }
      profile?: {
        resume?: string
        jobDescription?: string
        companyNotes?: string
      }
    }
  }) => ipcRenderer.invoke('coding-generate', payload),
  cancelCoding: (requestId: string) => ipcRenderer.invoke('coding-cancel', requestId),
  onCodingChunk: (callback: (payload: { requestId: string; text: string }) => void) => {
    const handler = (_: any, payload: { requestId: string; text: string }) => callback(payload)
    ipcRenderer.on('coding-chunk', handler)
    return () => {
      ipcRenderer.removeListener('coding-chunk', handler)
    }
  },
  onToggleRecording: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('toggle-recording', handler)
    return () => {
      ipcRenderer.removeListener('toggle-recording', handler)
    }
  },
  startSystemAudio: (options: {
    requestId: string
    source: 'mic' | 'loopback' | 'mixed'
    sampleRate?: number
    channels?: number
    chunkMs?: number
    ffmpegPath?: string
    micDevice?: string
    loopbackDevice?: string
  }) => ipcRenderer.invoke('system-audio-start', options),
  stopSystemAudio: () => ipcRenderer.invoke('system-audio-stop'),
  getSystemAudioStatus: () => ipcRenderer.invoke('system-audio-status'),
  onSystemAudioChunk: (callback: (payload: { requestId: string; timestamp: number; sampleRate: number; channels: number; pcm: Uint8Array }) => void) => {
    const handler = (_: any, payload: { requestId: string; timestamp: number; sampleRate: number; channels: number; pcm: Uint8Array }) => callback(payload)
    ipcRenderer.on('system-audio-chunk', handler)
    return () => {
      ipcRenderer.removeListener('system-audio-chunk', handler)
    }
  },
  onSystemAudioStatus: (callback: (payload: { state: string; message?: string; requestId?: string }) => void) => {
    const handler = (_: any, payload: { state: string; message?: string; requestId?: string }) => callback(payload)
    ipcRenderer.on('system-audio-status', handler)
    return () => {
      ipcRenderer.removeListener('system-audio-status', handler)
    }
  },
  startScreenOcr: (options: {
    requestId: string
    intervalMs?: number
    sourceId?: string
    lang?: string
    maxWidth?: number
    maxHeight?: number
  }) => ipcRenderer.invoke('screen-ocr-start', options),
  stopScreenOcr: () => ipcRenderer.invoke('screen-ocr-stop'),
  getScreenOcrStatus: () => ipcRenderer.invoke('screen-ocr-status'),
  onScreenOcrResult: (callback: (payload: { requestId: string; timestamp: number; text: string; confidence?: number; sourceId?: string }) => void) => {
    const handler = (_: any, payload: { requestId: string; timestamp: number; text: string; confidence?: number; sourceId?: string }) => callback(payload)
    ipcRenderer.on('screen-ocr-result', handler)
    return () => {
      ipcRenderer.removeListener('screen-ocr-result', handler)
    }
  },
  onScreenOcrFrame: (callback: (payload: { requestId: string; timestamp: number; image: string; mimeType?: string; sourceId?: string }) => void) => {
    const handler = (_: any, payload: { requestId: string; timestamp: number; image: string; mimeType?: string; sourceId?: string }) => callback(payload)
    ipcRenderer.on('screen-ocr-frame', handler)
    return () => {
      ipcRenderer.removeListener('screen-ocr-frame', handler)
    }
  },
  onScreenOcrStatus: (callback: (payload: { state: string; message?: string; requestId?: string }) => void) => {
    const handler = (_: any, payload: { state: string; message?: string; requestId?: string }) => callback(payload)
    ipcRenderer.on('screen-ocr-status', handler)
    return () => {
      ipcRenderer.removeListener('screen-ocr-status', handler)
    }
  },
  getMeetingStatus: () => ipcRenderer.invoke('meeting-status-get'),
  onMeetingStatus: (callback: (payload: { active: boolean; provider?: 'zoom' | 'teams' | 'meet'; title?: string; detectedAt: number }) => void) => {
    const handler = (_: any, payload: { active: boolean; provider?: 'zoom' | 'teams' | 'meet'; title?: string; detectedAt: number }) => callback(payload)
    ipcRenderer.on('meeting-status', handler)
    return () => {
      ipcRenderer.removeListener('meeting-status', handler)
    }
  },
  generateSessionSummary: (payload: {
    history: Array<{ question: string; answer: string }>
    apiKey: string
    requestId: string
    options: {
      format: 'direct' | 'star' | 'bullets'
      tone: 'professional' | 'friendly' | 'technical'
      length: 'short' | 'medium' | 'long'
      followUps: boolean
      model?: string
      provider?: 'gemini' | 'openai' | 'anthropic' | 'ollama'
      providerConfig?: {
        baseUrl?: string
      }
      profile?: {
        resume?: string
        jobDescription?: string
        companyNotes?: string
      }
    }
  }) => ipcRenderer.invoke('session-summary-generate', payload),
  cancelSessionSummary: (requestId: string) => ipcRenderer.invoke('session-summary-cancel', requestId),
  onSessionSummaryChunk: (callback: (payload: { requestId: string; text: string }) => void) => {
    const handler = (_: any, payload: { requestId: string; text: string }) => callback(payload)
    ipcRenderer.on('session-summary-chunk', handler)
    return () => {
      ipcRenderer.removeListener('session-summary-chunk', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}

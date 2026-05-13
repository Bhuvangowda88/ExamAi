import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  close: () => ipcRenderer.invoke('window-close'),
  togglePin: () => ipcRenderer.invoke('window-toggle-pin'),
  setOpacity: (opacity: number) => ipcRenderer.invoke('set-opacity', opacity),
  getApiKey: () => ipcRenderer.invoke('api-key-get'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('api-key-set', apiKey),
  getApiKeyStorageInfo: () => ipcRenderer.invoke('api-key-info'),
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
      profile?: {
        resume?: string
        jobDescription?: string
        companyNotes?: string
      }
    }
  }) => ipcRenderer.invoke('gemini-generate', payload),
  cancelGeneration: (requestId: string) => ipcRenderer.invoke('gemini-cancel', requestId),
  onGeminiChunk: (callback: (payload: { requestId: string; text: string }) => void) => {
    const handler = (_: any, payload: { requestId: string; text: string }) => callback(payload)
    ipcRenderer.on('gemini-chunk', handler)
    return () => {
      ipcRenderer.removeListener('gemini-chunk', handler)
    }
  },
  onToggleRecording: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('toggle-recording', handler)
    return () => {
      ipcRenderer.removeListener('toggle-recording', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

declare global {
  interface Window {
    electronAPI: typeof electronAPI
  }
}

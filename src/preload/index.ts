import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  minimize: () => ipcRenderer.invoke('window-minimize'),
  close: () => ipcRenderer.invoke('window-close'),
  togglePin: () => ipcRenderer.invoke('window-toggle-pin'),
  setOpacity: (opacity: number) => ipcRenderer.invoke('set-opacity', opacity),
  generateAnswer: (transcript: string, apiKey: string) => ipcRenderer.invoke('gemini-generate', transcript, apiKey),
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

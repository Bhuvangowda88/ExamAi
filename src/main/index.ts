import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, systemPreferences, safeStorage } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { SystemAudioService } from './audio/systemAudioService'
import type { SystemAudioStartOptions } from './audio/types'
import { ScreenOcrService } from './ocr/screenOcrService'
import type { ScreenOcrStartOptions } from './ocr/types'
import { LLMService } from './llm/llmService'
import type { GenerationOptions, LLMProviderId } from './llm/types'
import { listProviders } from './llm/providerRegistry'
import { buildCodingPrompt, buildSessionSummaryPrompt } from './llm/promptBuilder'
import { MeetingDetectionService } from './meeting/meetingDetectionService'

interface AppSettings {
  apiKey?: string
  apiKeyEncrypted?: boolean
  apiKeys?: Partial<Record<LLMProviderId, string>>
  apiKeysEncrypted?: Partial<Record<LLMProviderId, boolean>>
  activeProvider?: LLMProviderId
}

const SETTINGS_FILE_NAME = 'settings.json'
const llmService = new LLMService()
const systemAudioService = new SystemAudioService()
const screenOcrService = new ScreenOcrService()
const meetingDetectionService = new MeetingDetectionService()

const cacheRoot = join(app.getPath('userData'), 'cache')
try {
  if (!existsSync(cacheRoot)) {
    mkdirSync(cacheRoot, { recursive: true })
  }
  app.setPath('cache', cacheRoot)
  app.commandLine.appendSwitch('disk-cache-dir', cacheRoot)
  app.commandLine.appendSwitch('media-cache-dir', join(cacheRoot, 'media'))
} catch {
  // If cache setup fails, Electron will fall back to defaults.
}

if (process.platform === 'win32') {
  const existing = app.commandLine.getSwitchValue('disable-features')
  const next = existing ? `${existing},WindowsGraphicsCapture` : 'WindowsGraphicsCapture'
  app.commandLine.appendSwitch('disable-features', next)
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE_NAME)
}

function readSettings(): AppSettings {
  const settingsPath = getSettingsPath()
  if (!existsSync(settingsPath)) return {}
  try {
    const raw = readFileSync(settingsPath, 'utf-8')
    const settings = JSON.parse(raw) as AppSettings
    let changed = false

    if (settings.apiKey && !settings.apiKeys?.gemini) {
      settings.apiKeys = { ...settings.apiKeys, gemini: settings.apiKey }
      settings.apiKeysEncrypted = { ...settings.apiKeysEncrypted, gemini: settings.apiKeyEncrypted }
      changed = true
    }

    if (changed) {
      writeSettings(settings)
    }

    return settings
  } catch {
    return {}
  }
}

function writeSettings(settings: AppSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2))
}

function encryptApiKey(apiKey: string): { value: string; encrypted: boolean } {
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(apiKey).toString('base64')
    return { value: encrypted, encrypted: true }
  }
  return { value: apiKey, encrypted: false }
}

function decryptApiKey(value: string, encrypted?: boolean): string {
  if (!value) return ''
  if (encrypted) {
    if (!safeStorage.isEncryptionAvailable()) return ''
    try {
      return safeStorage.decryptString(Buffer.from(value, 'base64'))
    } catch {
      return ''
    }
  }
  return value
}

function resolveProviderKey(settings: AppSettings, provider: LLMProviderId): { value: string; encrypted?: boolean } {
  const value = settings.apiKeys?.[provider]
    ?? (provider === 'gemini' ? settings.apiKey : undefined)
    ?? ''
  const encrypted = settings.apiKeysEncrypted?.[provider]
    ?? (provider === 'gemini' ? settings.apiKeyEncrypted : undefined)

  return { value, encrypted }
}

function getProviderKey(provider: LLMProviderId): string {
  const settings = readSettings()
  const { value, encrypted } = resolveProviderKey(settings, provider)
  return decryptApiKey(value, encrypted)
}

function getProviderKeyInfo(provider: LLMProviderId): { secureAvailable: boolean; secureUsed: boolean } {
  const settings = readSettings()
  const { value, encrypted } = resolveProviderKey(settings, provider)
  return {
    secureAvailable: safeStorage.isEncryptionAvailable(),
    secureUsed: Boolean(value && encrypted)
  }
}

function setProviderKey(provider: LLMProviderId, apiKey: string): boolean {
  const settings = readSettings()
  settings.apiKeys = { ...settings.apiKeys }
  settings.apiKeysEncrypted = { ...settings.apiKeysEncrypted }

  if (!apiKey) {
    settings.apiKeys[provider] = ''
    settings.apiKeysEncrypted[provider] = false
  } else {
    const encrypted = encryptApiKey(apiKey)
    settings.apiKeys[provider] = encrypted.value
    settings.apiKeysEncrypted[provider] = encrypted.encrypted
  }

  if (provider === 'gemini') {
    settings.apiKey = settings.apiKeys[provider]
    settings.apiKeyEncrypted = settings.apiKeysEncrypted[provider]
  }

  writeSettings(settings)
  return true
}

function getActiveProvider(): LLMProviderId {
  const settings = readSettings()
  return settings.activeProvider || 'gemini'
}

function setActiveProvider(provider: LLMProviderId): boolean {
  const settings = readSettings()
  settings.activeProvider = provider
  writeSettings(settings)
  return true
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isVisible = true
let isHardHidden = false
let lastOpacity = 1

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 650,
    minWidth: 350,
    minHeight: 400,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'Interview Assistant',
    x: 50,
    y: 50
  })

  // CRITICAL: Hide window from screen sharing/recording
  mainWindow.setContentProtection(true)

  // Ensure the window is not shown in taskbar/dock lists
  mainWindow.setSkipTaskbar(true)

  // Visible on all workspaces (macOS)
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // Load the app
  const devServerUrl = process.env.ELECTRON_RENDERER_URL
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.on('focus', () => {
    mainWindow?.setContentProtection(true)
  })
}

function createTray(): void {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABhSURBVDiNY2AYBYMXMDIwMDD8//+fkYGBgeH/////GRkZGRgZGJj+///PwMjIyMDAwMDE8P//fwYGBgYGRgYGBob///8zMjEwMDAxMjIwMDIyMjAwMjIyMDIxMjAwMAxeAABzGRQKAB/NkgAAAABJRU5ErkJggg=='
  )

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show/Hide', click: () => toggleVisibility() },
    { label: 'Always on Top', type: 'checkbox', checked: true, click: (menuItem) => mainWindow?.setAlwaysOnTop(menuItem.checked) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setToolTip('Interview Assistant')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => toggleVisibility())
}

function toggleVisibility(): void {
  if (!mainWindow) return
  if (isHardHidden) {
    mainWindow.setIgnoreMouseEvents(false)
    mainWindow.setOpacity(lastOpacity || 1)
    isHardHidden = false
  }
  if (isVisible) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
  isVisible = !isVisible
}

function toggleHardHide(): void {
  if (!mainWindow) return

  if (!isHardHidden) {
    lastOpacity = mainWindow.getOpacity()
    mainWindow.setOpacity(0)
    mainWindow.setIgnoreMouseEvents(true, { forward: true })
    isHardHidden = true
    isVisible = false
    return
  }

  mainWindow.setIgnoreMouseEvents(false)
  mainWindow.setOpacity(lastOpacity || 1)
  isHardHidden = false
  isVisible = true
}

function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+Shift+H', () => toggleVisibility())
  globalShortcut.register('CommandOrControl+Shift+R', () => mainWindow?.webContents.send('toggle-recording'))
  globalShortcut.register('CommandOrControl+Shift+Escape', () => toggleHardHide())
}

// IPC Handlers
ipcMain.handle('window-minimize', () => mainWindow?.minimize())
ipcMain.handle('window-close', () => {
  if (mainWindow) {
    mainWindow.setIgnoreMouseEvents(false)
    mainWindow.setOpacity(lastOpacity || 1)
  }
  isHardHidden = false
  mainWindow?.hide()
  isVisible = false
})
ipcMain.handle('window-toggle-pin', () => {
  if (mainWindow) {
    const isPinned = mainWindow.isAlwaysOnTop()
    mainWindow.setAlwaysOnTop(!isPinned)
    return !isPinned
  }
  return false
})
ipcMain.handle('set-opacity', (_, opacity: number) => mainWindow?.setOpacity(opacity))
ipcMain.handle('api-key-info', () => getProviderKeyInfo('gemini'))

ipcMain.handle('api-key-get', () => getProviderKey('gemini'))

ipcMain.handle('api-key-set', (_, apiKey: string) => setProviderKey('gemini', apiKey))

ipcMain.handle('provider-key-info', (_, provider: LLMProviderId) => getProviderKeyInfo(provider))

ipcMain.handle('provider-key-get', (_, provider: LLMProviderId) => getProviderKey(provider))

ipcMain.handle('provider-key-set', (_, provider: LLMProviderId, apiKey: string) => setProviderKey(provider, apiKey))

ipcMain.handle('provider-active-get', () => getActiveProvider())

ipcMain.handle('provider-active-set', (_, provider: LLMProviderId) => setActiveProvider(provider))

ipcMain.handle('gemini-cancel', (_, requestId: string) => {
  if (!requestId) return
  llmService.cancel(requestId)
})

ipcMain.handle('gemini-generate', async (event, payload: { transcript: string; apiKey: string; requestId: string; options: GenerationOptions }) => {
  const { transcript, apiKey, requestId, options } = payload
  try {
    return await llmService.generate({ transcript, apiKey, requestId, options }, (text) => {
      event.sender.send('gemini-chunk', { requestId, text })
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('LLM Error:', msg)
    throw error
  }
})

ipcMain.handle('llm-cancel', (_, requestId: string) => {
  if (!requestId) return
  llmService.cancel(requestId)
})

ipcMain.handle('llm-generate', async (event, payload: { transcript: string; apiKey?: string; requestId: string; options: GenerationOptions }) => {
  const { transcript, apiKey, requestId, options } = payload
  const provider = options?.provider || getActiveProvider()
  const resolvedKey = apiKey?.trim() || getProviderKey(provider)
  return await llmService.generate({ transcript, apiKey: resolvedKey, requestId, options }, (text) => {
    event.sender.send('llm-chunk', { requestId, text })
  })
})

ipcMain.handle('llm-providers', () => listProviders())

ipcMain.handle('coding-cancel', (_, requestId: string) => {
  if (!requestId) return
  llmService.cancel(requestId)
})

ipcMain.handle('coding-generate', async (event, payload: { sourceText?: string; imageBase64?: string; imageMimeType?: string; apiKey?: string; requestId: string; options: GenerationOptions }) => {
  const { sourceText, imageBase64, imageMimeType, apiKey, requestId, options } = payload
  const hasText = Boolean(sourceText?.trim())
  const hasImage = Boolean(imageBase64)
  if (!hasText && !hasImage) throw new Error('No OCR text or image')

  const promptOverride = buildCodingPrompt(sourceText?.trim() || '', hasImage)
  const provider = options?.provider || getActiveProvider()
  const resolvedKey = apiKey?.trim() || getProviderKey(provider)

  return await llmService.generate({
    transcript: hasText ? sourceText as string : 'Screen capture',
    apiKey: resolvedKey,
    requestId,
    options,
    promptOverride,
    imageBase64: hasImage ? imageBase64 : undefined,
    imageMimeType
  }, (text) => {
    event.sender.send('coding-chunk', { requestId, text })
  })
})

ipcMain.handle('session-summary-cancel', (_, requestId: string) => {
  if (!requestId) return
  llmService.cancel(requestId)
})

ipcMain.handle('session-summary-generate', async (event, payload: { history: Array<{ question: string; answer: string }>; apiKey?: string; requestId: string; options: GenerationOptions }) => {
  const { history, apiKey, requestId, options } = payload
  if (!Array.isArray(history) || history.length === 0) throw new Error('No history to summarize')

  const promptOverride = buildSessionSummaryPrompt(history, options.profile)
  const provider = options?.provider || getActiveProvider()
  const resolvedKey = apiKey?.trim() || getProviderKey(provider)

  return await llmService.generate({
    transcript: 'Session summary',
    apiKey: resolvedKey,
    requestId,
    options,
    promptOverride
  }, (text) => {
    event.sender.send('session-summary-chunk', { requestId, text })
  })
})

ipcMain.handle('system-audio-start', async (_, options: SystemAudioStartOptions) => {
  return await systemAudioService.start(options)
})

ipcMain.handle('system-audio-stop', async () => {
  return await systemAudioService.stop()
})

ipcMain.handle('system-audio-status', () => systemAudioService.getStatus())

ipcMain.handle('screen-ocr-start', async (_, options: ScreenOcrStartOptions) => {
  return await screenOcrService.start(options)
})

ipcMain.handle('screen-ocr-stop', async () => {
  return await screenOcrService.stop()
})

ipcMain.handle('screen-ocr-status', () => screenOcrService.getStatus())

ipcMain.handle('meeting-status-get', () => meetingDetectionService.getStatus())

app.whenReady().then(() => {
  // Request microphone permission on macOS
  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('microphone').catch(() => {})
    app.dock?.hide()
  }
  
  createWindow()
  createTray()
  registerShortcuts()

  systemAudioService.on('chunk', (payload) => {
    mainWindow?.webContents.send('system-audio-chunk', payload)
  })

  systemAudioService.on('status', (payload) => {
    mainWindow?.webContents.send('system-audio-status', payload)
  })

  screenOcrService.on('result', (payload) => {
    mainWindow?.webContents.send('screen-ocr-result', payload)
  })

  screenOcrService.on('frame', (payload) => {
    mainWindow?.webContents.send('screen-ocr-frame', payload)
  })

  screenOcrService.on('status', (payload) => {
    mainWindow?.webContents.send('screen-ocr-status', payload)
  })

  meetingDetectionService.on('status', (payload) => {
    mainWindow?.webContents.send('meeting-status', payload)
  })

  meetingDetectionService.start()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  systemAudioService.dispose().catch(() => {})
  screenOcrService.dispose().catch(() => {})
  meetingDetectionService.stop()
})

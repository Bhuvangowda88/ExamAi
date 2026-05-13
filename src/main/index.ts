import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, systemPreferences, safeStorage } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { GoogleGenerativeAI } from '@google/generative-ai'

type AnswerFormat = 'direct' | 'star' | 'bullets'
type AnswerTone = 'professional' | 'friendly' | 'technical'
type AnswerLength = 'short' | 'medium' | 'long'

interface GenerationOptions {
  format: AnswerFormat
  tone: AnswerTone
  length: AnswerLength
  followUps: boolean
  model?: string
  profile?: {
    resume?: string
    jobDescription?: string
    companyNotes?: string
  }
}

interface AppSettings {
  apiKey?: string
  apiKeyEncrypted?: boolean
}

const DEFAULT_MODEL = 'gemini-2.5-flash'
const SETTINGS_FILE_NAME = 'settings.json'
const activeRequests = new Map<string, { cancelled: boolean }>()

const LENGTH_GUIDES: Record<AnswerLength, string> = {
  short: '80-120 words',
  medium: '140-200 words',
  long: '220-300 words'
}

const TONE_GUIDES: Record<AnswerTone, string> = {
  professional: 'professional and confident',
  friendly: 'friendly and conversational',
  technical: 'technical and precise'
}

const FORMAT_GUIDES: Record<AnswerFormat, string> = {
  direct: 'Write a concise paragraph.',
  star: 'Use STAR format with labeled sections: Situation, Task, Action, Result.',
  bullets: 'Use 4-6 bullet points.'
}

function getSettingsPath(): string {
  return join(app.getPath('userData'), SETTINGS_FILE_NAME)
}

function readSettings(): AppSettings {
  const settingsPath = getSettingsPath()
  if (!existsSync(settingsPath)) return {}
  try {
    const raw = readFileSync(settingsPath, 'utf-8')
    return JSON.parse(raw) as AppSettings
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

function buildPrompt(transcript: string, options: GenerationOptions): string {
  const formatGuide = FORMAT_GUIDES[options.format] || FORMAT_GUIDES.direct
  const toneGuide = TONE_GUIDES[options.tone] || TONE_GUIDES.professional
  const lengthGuide = LENGTH_GUIDES[options.length] || LENGTH_GUIDES.medium

  const contextBlocks: string[] = []
  const resume = options.profile?.resume?.trim()
  const jobDescription = options.profile?.jobDescription?.trim()
  const companyNotes = options.profile?.companyNotes?.trim()

  if (resume) contextBlocks.push(`Resume:\n${resume}`)
  if (jobDescription) contextBlocks.push(`Job description:\n${jobDescription}`)
  if (companyNotes) contextBlocks.push(`Company notes:\n${companyNotes}`)

  const contextSection = contextBlocks.length
    ? `Candidate context (use only if relevant; do not invent details):\n${contextBlocks.join('\n\n')}`
    : ''

  const followUps = options.followUps
    ? 'After the answer, add 2 follow-up questions under the heading "Follow-up questions:" with bullet points.'
    : ''

  return [
    `You are an interview assistant. Provide a ${toneGuide} answer to the interview question.`,
    `Length: ${lengthGuide}.`,
    `Format: ${formatGuide}`,
    'If the question is behavioral, include a concrete example.',
    'Avoid meta-commentary and do not mention that you are an AI.',
    followUps,
    contextSection,
    `Interview question: "${transcript}"`,
    'Answer:'
  ].filter(Boolean).join('\n\n')
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isVisible = true

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 650,
    minWidth: 350,
    minHeight: 400,
    frame: false,
    transparent: true,
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
  if (isVisible) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
  isVisible = !isVisible
}

function registerShortcuts(): void {
  globalShortcut.register('CommandOrControl+Shift+H', () => toggleVisibility())
  globalShortcut.register('CommandOrControl+Shift+R', () => mainWindow?.webContents.send('toggle-recording'))
  globalShortcut.register('CommandOrControl+Shift+Escape', () => {
    if (mainWindow && isVisible) {
      mainWindow.hide()
      isVisible = false
    }
  })
}

// IPC Handlers
ipcMain.handle('window-minimize', () => mainWindow?.minimize())
ipcMain.handle('window-close', () => { mainWindow?.hide(); isVisible = false })
ipcMain.handle('window-toggle-pin', () => {
  if (mainWindow) {
    const isPinned = mainWindow.isAlwaysOnTop()
    mainWindow.setAlwaysOnTop(!isPinned)
    return !isPinned
  }
  return false
})
ipcMain.handle('set-opacity', (_, opacity: number) => mainWindow?.setOpacity(opacity))
ipcMain.handle('api-key-info', () => {
  const settings = readSettings()
  return {
    secureAvailable: safeStorage.isEncryptionAvailable(),
    secureUsed: Boolean(settings.apiKey && settings.apiKeyEncrypted)
  }
})

ipcMain.handle('api-key-get', () => {
  const settings = readSettings()
  if (!settings.apiKey) return ''
  return decryptApiKey(settings.apiKey, settings.apiKeyEncrypted)
})

ipcMain.handle('api-key-set', (_, apiKey: string) => {
  const settings = readSettings()
  if (!apiKey) {
    settings.apiKey = ''
    settings.apiKeyEncrypted = false
    writeSettings(settings)
    return true
  }

  const encrypted = encryptApiKey(apiKey)
  settings.apiKey = encrypted.value
  settings.apiKeyEncrypted = encrypted.encrypted
  writeSettings(settings)
  return true
})

ipcMain.handle('gemini-cancel', (_, requestId: string) => {
  if (!requestId) return
  const state = activeRequests.get(requestId)
  if (state) state.cancelled = true
})

ipcMain.handle('gemini-generate', async (event, payload: { transcript: string; apiKey: string; requestId: string; options: GenerationOptions }) => {
  const { transcript, apiKey, requestId, options } = payload
  if (!apiKey) throw new Error('API key required')
  if (!transcript.trim()) throw new Error('No transcript')
  if (!requestId) throw new Error('Missing request id')

  const resolvedOptions: GenerationOptions = {
    format: options?.format || 'direct',
    tone: options?.tone || 'professional',
    length: options?.length || 'medium',
    followUps: Boolean(options?.followUps),
    model: options?.model,
    profile: options?.profile
  }

  const requestState = { cancelled: false }
  activeRequests.set(requestId, requestState)

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const modelName = resolvedOptions.model?.trim() || DEFAULT_MODEL
    const model = genAI.getGenerativeModel({ model: modelName })
    const prompt = buildPrompt(transcript, resolvedOptions)
    const stream = await model.generateContentStream(prompt)

    let fullText = ''
    for await (const chunk of stream.stream) {
      if (requestState.cancelled) break
      const text = chunk.text()
      if (text) {
        fullText += text
        event.sender.send('gemini-chunk', { requestId, text })
      }
    }

    if (requestState.cancelled && !fullText.trim()) {
      throw new Error('Generation canceled')
    }

    return fullText.trim()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Gemini API Error:', msg)
    throw error
  } finally {
    activeRequests.delete(requestId)
  }
})

app.whenReady().then(() => {
  // Request microphone permission on macOS
  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('microphone').catch(() => {})
  }
  
  createWindow()
  createTray()
  registerShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

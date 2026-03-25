import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, systemPreferences } from 'electron'
import { join } from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = `You are an interview assistant. Generate a strong, professional answer to the interview question.

Guidelines:
- Provide clear, confident answers
- Use STAR method for behavioral questions
- Keep responses under 200 words
- Be specific with examples
- Generate the answer directly - no meta-commentary

Interview question:`

const GEMINI_MODEL = 'gemini-2.5-flash'

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
    title: 'Quick Notes',
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

  tray.setToolTip('Quick Notes')
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
ipcMain.handle('gemini-generate', async (_, transcript: string, apiKey: string) => {
  if (!apiKey) throw new Error('API key required')
  if (!transcript.trim()) throw new Error('No transcript')

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n"${transcript}"\n\nAnswer:`)
    const response = await result.response
    return response.text().trim()
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('Not Found') || msg.includes('not found for API version') || msg.includes('models/')) {
      throw new Error(`Gemini model unavailable: ${GEMINI_MODEL}`)
    }
    throw error
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

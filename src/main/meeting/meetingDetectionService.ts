import { EventEmitter } from 'events'
import { exec } from 'child_process'
import { promisify } from 'util'
import type { MeetingProvider, MeetingStatus } from './types'

const execAsync = promisify(exec)
const DEFAULT_INTERVAL_MS = 5000
const DEFAULT_BUFFER_LIMIT = 1024 * 1024

interface ProcessWindowInfo {
  ProcessName?: string
  MainWindowTitle?: string
}

export class MeetingDetectionService extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private status: MeetingStatus = { active: false, detectedAt: 0 }

  start(intervalMs: number = DEFAULT_INTERVAL_MS): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.poll().catch(() => {})
    }, intervalMs)
    this.poll().catch(() => {})
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  getStatus(): MeetingStatus {
    return this.status
  }

  private async poll(): Promise<void> {
    const next = await detectMeeting()
    if (!next) {
      if (this.status.active) {
        this.update({ active: false, detectedAt: Date.now() })
      }
      return
    }

    if (!isSameStatus(this.status, next)) {
      this.update(next)
    }
  }

  private update(next: MeetingStatus): void {
    this.status = next
    this.emit('status', this.status)
  }
}

function isSameStatus(a: MeetingStatus, b: MeetingStatus): boolean {
  return a.active === b.active
    && a.provider === b.provider
    && (a.title || '') === (b.title || '')
}

async function detectMeeting(): Promise<MeetingStatus | null> {
  try {
    if (process.platform === 'win32') {
      return await detectMeetingWindows()
    }
    if (process.platform === 'darwin') {
      return await detectMeetingMac()
    }
    return await detectMeetingLinux()
  } catch {
    return null
  }
}

async function detectMeetingWindows(): Promise<MeetingStatus | null> {
  const script = 'Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json -Depth 2'
  const stdout = await runPowerShell(script)
  if (!stdout) return null

  let data: ProcessWindowInfo[] = []
  try {
    const parsed = JSON.parse(stdout)
    data = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return null
  }

  const match = findMeetingFromWindows(data)
  if (!match) return null

  return {
    active: true,
    provider: match.provider,
    title: match.title,
    detectedAt: Date.now()
  }
}

async function detectMeetingMac(): Promise<MeetingStatus | null> {
  const stdout = await execSafe('ps -A -o comm')
  const haystack = stdout.toLowerCase()

  if (haystack.includes('zoom.us') || haystack.includes('zoom')) {
    return { active: true, provider: 'zoom', detectedAt: Date.now() }
  }

  if (haystack.includes('teams') || haystack.includes('microsoft teams')) {
    return { active: true, provider: 'teams', detectedAt: Date.now() }
  }

  return null
}

async function detectMeetingLinux(): Promise<MeetingStatus | null> {
  const stdout = await execSafe('ps -A -o comm')
  const haystack = stdout.toLowerCase()

  if (haystack.includes('zoom')) {
    return { active: true, provider: 'zoom', detectedAt: Date.now() }
  }

  if (haystack.includes('teams') || haystack.includes('microsoft teams')) {
    return { active: true, provider: 'teams', detectedAt: Date.now() }
  }

  return null
}

function findMeetingFromWindows(data: ProcessWindowInfo[]): { provider: MeetingProvider; title: string } | null {
  const entries = data
    .map((item) => ({
      name: (item.ProcessName || '').toLowerCase(),
      title: (item.MainWindowTitle || '').toLowerCase(),
      rawTitle: item.MainWindowTitle || ''
    }))
    .filter((item) => item.title)

  const zoom = entries.find((item) => item.name.includes('zoom') || item.title.includes('zoom meeting') || item.title.includes('zoom webinar'))
  if (zoom) return { provider: 'zoom', title: zoom.rawTitle }

  const teams = entries.find((item) => item.name.includes('teams') || item.title.includes('microsoft teams') || item.title.includes('teams meeting'))
  if (teams) return { provider: 'teams', title: teams.rawTitle }

  const meet = entries.find((item) => item.title.includes('google meet') || item.title.includes('meet.google.com') || item.title.includes(' - meet'))
  if (meet) return { provider: 'meet', title: meet.rawTitle }

  return null
}

async function runPowerShell(script: string): Promise<string> {
  const escaped = script.replace(/"/g, '\\"')
  const command = `powershell -NoProfile -Command "${escaped}"`
  const { stdout } = await execAsync(command, { windowsHide: true, maxBuffer: DEFAULT_BUFFER_LIMIT })
  return stdout.trim()
}

async function execSafe(command: string): Promise<string> {
  try {
    const { stdout } = await execAsync(command, { maxBuffer: DEFAULT_BUFFER_LIMIT })
    return stdout.trim()
  } catch {
    return ''
  }
}

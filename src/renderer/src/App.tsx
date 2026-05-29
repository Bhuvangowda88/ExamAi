import { useState, useEffect, useCallback, useRef } from 'react'
import { TitleBar } from './components/TitleBar'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { ControlBar } from './components/ControlBar'
import { SettingsPanel } from './components/SettingsPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { CodingPanel } from './components/CodingPanel'
import { SummaryPanel } from './components/SummaryPanel'
import { MeetingToast } from './components/MeetingToast'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { generateAnswer, cancelGeneration } from './services/gemini'
import { generateCodingHints, cancelCoding } from './services/coding'
import { generateSessionSummary, cancelSessionSummary } from './services/sessionSummary'
import type {
  AnswerSettings,
  ProfileContext,
  HistoryItem,
  GenerationOptions,
  ScreenOcrResult,
  ScreenOcrStatus,
  ScreenOcrFrame,
  ProviderKeyMap,
  ProviderKeyInfoMap,
  LLMProviderId,
  InterviewMode,
  SystemAudioStatus,
  MeetingStatus
} from './types'

const envApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || ''

const SETTINGS_KEY = 'answer_settings_v1'
const PROFILE_KEY = 'profile_context_v1'
const HISTORY_KEY = 'qa_history_v1'
const MAX_HISTORY = 40

const DEFAULT_SETTINGS: AnswerSettings = {
  format: 'direct',
  tone: 'professional',
  length: 'medium',
  followUps: false,
  autoGenerate: true,
  model: 'gemini-2.5-flash',
  provider: 'gemini'
}

const DEFAULT_PROFILE: ProfileContext = {
  resume: '',
  jobDescription: '',
  companyNotes: ''
}

type PanelView = 'main' | 'settings' | 'history' | 'summary'

const PROVIDER_LABELS: Record<LLMProviderId, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
  anthropic: 'Claude',
  ollama: 'Ollama'
}

const PROVIDER_IDS: LLMProviderId[] = ['gemini', 'openai', 'anthropic']

const PROVIDER_DEFAULT_MODELS: Record<LLMProviderId, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20240620',
  ollama: 'llama3'
}

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function saveJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const VAD_ENERGY_THRESHOLD = 0.02
const VAD_SILENCE_MS = 1200
const VAD_BUFFER_SIZE = 6

function computeRms(pcm: Uint8Array): number {
  if (!pcm?.length) return 0
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let sum = 0
  let count = 0
  for (let i = 0; i + 1 < pcm.byteLength; i += 2) {
    const sample = view.getInt16(i, true) / 32768
    sum += sample * sample
    count += 1
  }
  return count ? Math.sqrt(sum / count) : 0
}

function App() {
  const [activePanel, setActivePanel] = useState<PanelView>('main')
  const [isGenerating, setIsGenerating] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [providerKeys, setProviderKeys] = useState<ProviderKeyMap>({
    gemini: envApiKey,
    openai: '',
    anthropic: ''
  })
  const [providerKeyInfo, setProviderKeyInfo] = useState<ProviderKeyInfoMap>({})
  const [isPinned, setIsPinned] = useState(true)
  const [activeMode, setActiveMode] = useState<InterviewMode>('behavioral')
  const [opacity, setOpacity] = useState(0.92)
  const [manualInputOpen, setManualInputOpen] = useState(false)
  const [screenOcrEnabled, setScreenOcrEnabled] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [ocrStatus, setOcrStatus] = useState<ScreenOcrStatus>({ state: 'idle' })
  const [systemAudioStatus, setSystemAudioStatus] = useState<SystemAudioStatus>({ state: 'idle' })
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>({ active: false, detectedAt: 0 })
  const [meetingToast, setMeetingToast] = useState('')
  const [codingSuggestion, setCodingSuggestion] = useState('')
  const [isCodingGenerating, setIsCodingGenerating] = useState(false)
  const [sessionSummary, setSessionSummary] = useState('')
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false)
  const [answerSettings, setAnswerSettings] = useState<AnswerSettings>(() => {
    const stored = loadJson<Partial<AnswerSettings>>(SETTINGS_KEY) || {}
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      model: stored.model?.trim() || DEFAULT_SETTINGS.model,
      provider: stored.provider || DEFAULT_SETTINGS.provider
    }
  })
  const [profileContext, setProfileContext] = useState<ProfileContext>(() => {
    return loadJson<ProfileContext>(PROFILE_KEY) || DEFAULT_PROFILE
  })
  const [history, setHistory] = useState<HistoryItem[]>(() => loadJson<HistoryItem[]>(HISTORY_KEY) || [])
  const currentRequestId = useRef<string | null>(null)
  const cancelledRequests = useRef(new Set<string>())
  const lastManualGenerateAt = useRef(0)
  const codingRequestId = useRef<string | null>(null)
  const lastOcrTextRef = useRef('')
  const lastCodingRequestAt = useRef(0)
  const codingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const screenOcrRequestId = useRef<string | null>(null)
  const systemAudioRequestId = useRef<string | null>(null)
  const summaryRequestId = useRef<string | null>(null)
  const latestFrameRef = useRef<ScreenOcrFrame | null>(null)
  const lastFrameTimestampRef = useRef(0)
  const vadEnergyBufferRef = useRef<number[]>([])
  const lastSpeechAtRef = useRef(0)
  const hasSpeechRef = useRef(false)
  const lastAutoGenerateAtRef = useRef(0)
  const transcriptRef = useRef('')
  const lastAutoTranscriptRef = useRef('')
  const autoGenerateRef = useRef(answerSettings.autoGenerate)
  const activeModeRef = useRef<InterviewMode>(activeMode)
  const interimTranscriptRef = useRef('')
  const generateResponseRef = useRef<() => void>(() => {})
  const isGeneratingRef = useRef(false)
  const suggestionRef = useRef('')
  const meetingToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoStartRef = useRef(false)

  const { startListening, stopListening, isSupported, error: speechError, isListening } = useSpeechRecognition({
    onResult: (text, isFinal) => {
      if (isFinal) {
        setTranscript(prev => prev + (prev ? ' ' : '') + text)
        setInterimTranscript('')
      } else {
        setInterimTranscript(text)
      }
    }
  })

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    interimTranscriptRef.current = interimTranscript
  }, [interimTranscript])

  useEffect(() => {
    autoGenerateRef.current = answerSettings.autoGenerate
  }, [answerSettings.autoGenerate])

  useEffect(() => {
    activeModeRef.current = activeMode
  }, [activeMode])

  useEffect(() => {
    isGeneratingRef.current = isGenerating
  }, [isGenerating])

  useEffect(() => {
    suggestionRef.current = suggestion
  }, [suggestion])

  useEffect(() => {
    let isMounted = true
    const loadProviderData = async () => {
      const nextKeys: ProviderKeyMap = { gemini: envApiKey, openai: '', anthropic: '' }
      const nextInfo: ProviderKeyInfoMap = {}

      for (const provider of PROVIDER_IDS) {
        let storedKey = await window.electronAPI?.getProviderKey?.(provider)

        if (provider === 'gemini') {
          const legacyKey = localStorage.getItem('gemini_api_key')
          if (!storedKey && legacyKey) {
            await window.electronAPI?.setProviderKey?.(provider, legacyKey)
            localStorage.removeItem('gemini_api_key')
            storedKey = legacyKey
          }
        }

        if (storedKey) {
          nextKeys[provider] = storedKey
        }

        const info = await window.electronAPI?.getProviderKeyInfo?.(provider)
        if (info) {
          nextInfo[provider] = info
        }
      }

      const storedProvider = await window.electronAPI?.getActiveProvider?.()

      if (!isMounted) return

      setProviderKeys(nextKeys)
      setProviderKeyInfo(nextInfo)

      if (storedProvider) {
        setAnswerSettings((prev) => ({ ...prev, provider: storedProvider }))
      }
    }

    loadProviderData()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    saveJson(SETTINGS_KEY, answerSettings)
  }, [answerSettings])

  useEffect(() => {
    saveJson(PROFILE_KEY, profileContext)
  }, [profileContext])

  useEffect(() => {
    saveJson(HISTORY_KEY, history)
  }, [history])

  useEffect(() => {
    window.electronAPI?.setOpacity?.(opacity)
  }, [opacity])

  useEffect(() => {
    const cleanupResult = window.electronAPI?.onScreenOcrResult?.((payload: ScreenOcrResult) => {
      const nextText = payload.text?.trim() || ''
      if (!nextText) return
      setOcrText(nextText.slice(0, 4000))
    })

    const cleanupFrame = window.electronAPI?.onScreenOcrFrame?.((payload: ScreenOcrFrame) => {
      latestFrameRef.current = payload
    })

    const cleanupStatus = window.electronAPI?.onScreenOcrStatus?.((payload: ScreenOcrStatus) => {
      setOcrStatus(payload)
    })

    return () => {
      cleanupResult?.()
      cleanupFrame?.()
      cleanupStatus?.()
    }
  }, [])

  useEffect(() => {
    if (activeMode !== 'coding' || !screenOcrEnabled) {
      window.electronAPI?.stopScreenOcr?.()
      return
    }

    const requestId = createId()
    screenOcrRequestId.current = requestId
    window.electronAPI?.startScreenOcr?.({
      requestId,
      intervalMs: 1100,
      maxWidth: 1280,
      maxHeight: 720
    })

    return () => {
      if (screenOcrRequestId.current === requestId) {
        screenOcrRequestId.current = null
      }
      window.electronAPI?.stopScreenOcr?.()
    }
  }, [activeMode, screenOcrEnabled])

  useEffect(() => {
    const cleanupStatus = window.electronAPI?.onSystemAudioStatus?.((payload: SystemAudioStatus) => {
      setSystemAudioStatus(payload)
    })

    window.electronAPI?.getSystemAudioStatus?.().then((payload: SystemAudioStatus) => {
      if (payload) setSystemAudioStatus(payload)
    }).catch(() => {})

    const cleanupChunk = window.electronAPI?.onSystemAudioChunk?.((payload) => {
      if (systemAudioRequestId.current && payload.requestId !== systemAudioRequestId.current) return
      if (!autoGenerateRef.current) return
      if (activeModeRef.current !== 'behavioral') return
      if (isGeneratingRef.current) return

      const rms = computeRms(payload.pcm)
      const buffer = vadEnergyBufferRef.current
      buffer.push(rms)
      if (buffer.length > VAD_BUFFER_SIZE) buffer.shift()

      const avgEnergy = buffer.reduce((sum, value) => sum + value, 0) / buffer.length
      const now = Date.now()

      if (avgEnergy >= VAD_ENERGY_THRESHOLD) {
        lastSpeechAtRef.current = now
        hasSpeechRef.current = true
        return
      }

      if (!hasSpeechRef.current) return
      if (now - lastSpeechAtRef.current < VAD_SILENCE_MS) return

      hasSpeechRef.current = false

      const transcriptText = transcriptRef.current.trim()
      if (!transcriptText) return
      if (interimTranscriptRef.current.trim()) return
      if (transcriptText === lastAutoTranscriptRef.current) return
      if (now - lastAutoGenerateAtRef.current < 1500) return

      lastAutoGenerateAtRef.current = now
      lastAutoTranscriptRef.current = transcriptText
      generateResponseRef.current?.()
    })

    return () => {
      cleanupStatus?.()
      cleanupChunk?.()
    }
  }, [])

  useEffect(() => {
    if (systemAudioStatus.state !== 'running') {
      vadEnergyBufferRef.current = []
      hasSpeechRef.current = false
    }
    if (systemAudioStatus.state === 'error' && systemAudioStatus.message) {
      console.warn('System audio:', systemAudioStatus.message)
    }
  }, [systemAudioStatus])

  useEffect(() => {
    const cleanup = window.electronAPI?.onMeetingStatus?.((payload: MeetingStatus) => {
      setMeetingStatus(payload)
    })

    window.electronAPI?.getMeetingStatus?.().then((payload: MeetingStatus) => {
      if (payload) setMeetingStatus(payload)
    }).catch(() => {})

    return () => cleanup?.()
  }, [])

  useEffect(() => {
    if (!meetingStatus.active || !meetingStatus.provider) return

    const labels: Record<string, string> = {
      zoom: 'Zoom meeting detected',
      teams: 'Teams meeting detected',
      meet: 'Google Meet detected'
    }

    setMeetingToast(labels[meetingStatus.provider] || 'Meeting detected')

    if (meetingToastTimerRef.current) {
      clearTimeout(meetingToastTimerRef.current)
    }

    meetingToastTimerRef.current = setTimeout(() => {
      setMeetingToast('')
      meetingToastTimerRef.current = null
    }, 6000)
    return () => {
      if (meetingToastTimerRef.current) {
        clearTimeout(meetingToastTimerRef.current)
        meetingToastTimerRef.current = null
      }
    }
  }, [meetingStatus])

  const addHistory = useCallback((question: string, answer: string) => {
    const trimmedAnswer = answer.trim()
    if (!trimmedAnswer) return

    setHistory(prev => {
      const exists = prev.some(item => item.question === question && item.answer === trimmedAnswer)
      if (exists) return prev
      const next = [{ id: createId(), question, answer: trimmedAnswer, createdAt: Date.now() }, ...prev]
      return next.slice(0, MAX_HISTORY)
    })
  }, [])

  const generateResponse = useCallback(async () => {
    const question = transcript.trim()
    if (!question) {
      setSuggestion('Please enter or speak a question first.')
      return
    }
    const provider = answerSettings.provider || 'gemini'
    const apiKey = providerKeys[provider] || (provider === 'gemini' ? envApiKey : '')
    if (!apiKey) {
      setSuggestion(`API key not set for ${PROVIDER_LABELS[provider]}. Open Settings and add your key.`)
      return
    }
    
    const requestId = createId()
    currentRequestId.current = requestId
    cancelledRequests.current.delete(requestId)
    setIsGenerating(true)
    setSuggestion('')

    try {
      const options: GenerationOptions = {
        format: activeMode === 'behavioral' ? 'direct' : answerSettings.format,
        tone: answerSettings.tone,
        length: activeMode === 'behavioral' ? 'short' : answerSettings.length,
        followUps: answerSettings.followUps,
        mode: activeMode,
        model: answerSettings.model?.trim() || undefined,
        profile: profileContext,
        provider
      }

      const answer = await generateAnswer({
        transcript: question,
        apiKey,
        requestId,
        options,
        onChunk: (text) => {
          if (currentRequestId.current !== requestId) return
          if (cancelledRequests.current.has(requestId)) return
          setSuggestion(prev => prev + text)
        }
      })

      if (cancelledRequests.current.has(requestId)) return
      setSuggestion(answer)
      lastAutoTranscriptRef.current = question
      addHistory(question, answer)
    } catch (err) {
      console.error('Failed to generate answer:', err)
      const message = err instanceof Error ? err.message : String(err)
      const lower = message.toLowerCase()

      if (lower.includes('canceled') || lower.includes('cancelled')) {
        setSuggestion(prev => prev || 'Generation canceled.')
        return
      }

      if (lower.includes('bridge') || lower.includes('unavailable')) {
        setSuggestion('App bridge error. Please restart the application.')
      } else if (lower.includes('model') || lower.includes('not found') || lower.includes('unsupported')) {
        setSuggestion('Model configuration error. Verify the selected provider and model name.')
      } else if (lower.includes('network') || lower.includes('fetch') || lower.includes('eai_again')) {
        setSuggestion('Network error: check your internet connection and try again.')
      } else if (lower.includes('api key') || lower.includes('permission') || lower.includes('unauthorized') || lower.includes('invalid')) {
        setSuggestion('Invalid or restricted API key. Open Settings and verify your provider key is valid.')
      } else if (lower.includes('empty')) {
        setSuggestion('Gemini returned an empty response. Try again.')
      } else {
        setSuggestion(`Generation error: ${message}`)
      }
    } finally {
      if (currentRequestId.current === requestId) {
        setIsGenerating(false)
      }
      cancelledRequests.current.delete(requestId)
    }
  }, [transcript, answerSettings, profileContext, providerKeys, activeMode, addHistory])

  useEffect(() => {
    generateResponseRef.current = generateResponse
  }, [generateResponse])

  const startSystemAudioCapture = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.startSystemAudio) return false
    const requestId = createId()
    systemAudioRequestId.current = requestId
    try {
      await window.electronAPI.startSystemAudio({
        requestId,
        source: 'mixed',
        sampleRate: 16000,
        channels: 1,
        chunkMs: 100
      })
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('System audio unavailable, using speech recognition only:', message)
      systemAudioRequestId.current = null
      setSystemAudioStatus({ state: 'idle', message })
      return false
    }
  }, [])

  const stopSystemAudioCapture = useCallback(async () => {
    systemAudioRequestId.current = null
    await window.electronAPI?.stopSystemAudio?.()
  }, [])

  const generateCodingResponse = useCallback(async (sourceText: string, imageBase64?: string, imageMimeType?: string) => {
    if (!sourceText.trim() && !imageBase64) return
    const provider = answerSettings.provider || 'gemini'
    const apiKey = providerKeys[provider] || (provider === 'gemini' ? envApiKey : '')
    if (!apiKey) {
      setCodingSuggestion(`API key not set for ${PROVIDER_LABELS[provider]}. Open Settings and add your key.`)
      return
    }

    const requestId = createId()
    codingRequestId.current = requestId
    setIsCodingGenerating(true)
    setCodingSuggestion('')

    try {
      const options: GenerationOptions = {
        format: 'bullets',
        tone: 'technical',
        length: 'short',
        followUps: false,
        mode: 'coding',
        model: answerSettings.model?.trim() || undefined,
        provider
      }

      const answer = await generateCodingHints({
        sourceText,
        imageBase64,
        imageMimeType,
        apiKey,
        requestId,
        options,
        onChunk: (text) => {
          if (codingRequestId.current !== requestId) return
          setCodingSuggestion(prev => prev + text)
        }
      })

      if (codingRequestId.current !== requestId) return
      setCodingSuggestion(answer)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setCodingSuggestion(`Coding analysis error: ${message}`)
    } finally {
      if (codingRequestId.current === requestId) {
        setIsCodingGenerating(false)
      }
    }
  }, [answerSettings.provider, answerSettings.model, providerKeys])

  useEffect(() => {
    if (activeMode !== 'coding' || !screenOcrEnabled) return
    const frame = latestFrameRef.current
    const frameTimestamp = frame?.timestamp || 0
    const hasNewText = Boolean(ocrText && ocrText !== lastOcrTextRef.current)
    const hasNewFrame = Boolean(frameTimestamp && frameTimestamp !== lastFrameTimestampRef.current)

    if (!hasNewText && !hasNewFrame) return

    const now = Date.now()
    if (now - lastCodingRequestAt.current < 3500) return

    if (hasNewText) {
      lastOcrTextRef.current = ocrText
    }
    if (hasNewFrame) {
      lastFrameTimestampRef.current = frameTimestamp
    }
    lastCodingRequestAt.current = now

    if (codingDebounceRef.current) {
      clearTimeout(codingDebounceRef.current)
    }

    codingDebounceRef.current = setTimeout(() => {
      generateCodingResponse(ocrText, frame?.image, frame?.mimeType)
    }, 900)

    return () => {
      if (codingDebounceRef.current) {
        clearTimeout(codingDebounceRef.current)
        codingDebounceRef.current = null
      }
    }
  }, [activeMode, screenOcrEnabled, ocrText, generateCodingResponse])

  useEffect(() => {
    // Only auto-generate after speech completes (when interimTranscript is empty and transcript changed)
    if (activePanel !== 'main') return
    if (!answerSettings.autoGenerate) return
    if (activeMode !== 'behavioral') return
    if (systemAudioStatus.state === 'running' || systemAudioStatus.state === 'starting') return
    if (!transcript || interimTranscript) return
    if (isGenerating) return
    if (transcript.trim() === lastAutoTranscriptRef.current) return
    if (Date.now() - lastManualGenerateAt.current < 2500) return
    const timer = setTimeout(() => generateResponse(), 2000)
    return () => clearTimeout(timer)
  }, [transcript, interimTranscript, generateResponse, answerSettings.autoGenerate, activePanel, activeMode, systemAudioStatus.state, isGenerating])

  const toggleRecording = useCallback(() => {
    const isAudioRunning = systemAudioStatus.state === 'running' || systemAudioStatus.state === 'starting'
    if (isListening || isAudioRunning) {
      stopListening()
      stopSystemAudioCapture()
    } else {
      startListening()
      void startSystemAudioCapture()
    }
  }, [isListening, startListening, stopListening, startSystemAudioCapture, stopSystemAudioCapture, systemAudioStatus.state])

  useEffect(() => {
    const cleanup = window.electronAPI?.onToggleRecording?.(() => toggleRecording())
    return () => {
      cleanup?.()
    }
  }, [toggleRecording])

  useEffect(() => {
    if (!answerSettings.autoGenerate) return
    if (!isSupported) return
    if (autoStartRef.current) return
    autoStartRef.current = true
    startListening()
    void startSystemAudioCapture()
  }, [answerSettings.autoGenerate, isSupported, startListening, startSystemAudioCapture])

  useEffect(() => {
    return () => {
      stopListening()
      stopSystemAudioCapture()
    }
  }, [stopListening, stopSystemAudioCapture])

  const handleSaveSettings = async (payload: { providerKeys: ProviderKeyMap; answerSettings: AnswerSettings; profileContext: ProfileContext }) => {
    const providerChanged = payload.answerSettings.provider !== answerSettings.provider
    const nextSettings: AnswerSettings = { ...payload.answerSettings }
    if (providerChanged) {
      const previousDefault = PROVIDER_DEFAULT_MODELS[answerSettings.provider] || ''
      const currentModel = answerSettings.model?.trim() || ''
      if (!currentModel || currentModel === previousDefault) {
        nextSettings.model = PROVIDER_DEFAULT_MODELS[nextSettings.provider] || ''
      }
    }

    setProviderKeys(payload.providerKeys)
    setAnswerSettings(nextSettings)
    setProfileContext(payload.profileContext)

    for (const provider of PROVIDER_IDS) {
      await window.electronAPI?.setProviderKey?.(provider, payload.providerKeys[provider] || '')
    }

    if (nextSettings.provider) {
      await window.electronAPI?.setActiveProvider?.(nextSettings.provider)
    }

    const nextInfo: ProviderKeyInfoMap = {}
    for (const provider of PROVIDER_IDS) {
      const info = await window.electronAPI?.getProviderKeyInfo?.(provider)
      if (info) nextInfo[provider] = info
    }
    setProviderKeyInfo(nextInfo)

    setActivePanel('main')
  }

  const handleTogglePin = async () => {
    const newPinState = await window.electronAPI?.togglePin?.()
    setIsPinned(newPinState ?? !isPinned)
  }

  const handleClear = () => {
    setTranscript('')
    setInterimTranscript('')
    setSuggestion('')
    setOcrText('')
    setCodingSuggestion('')
    lastAutoTranscriptRef.current = ''
    lastOcrTextRef.current = ''
    lastFrameTimestampRef.current = 0
    hasSpeechRef.current = false
    vadEnergyBufferRef.current = []
  }

  const handleManualGenerate = useCallback(() => {
    lastManualGenerateAt.current = Date.now()
    generateResponse()
  }, [generateResponse])

  const handleCancel = useCallback(() => {
    const requestId = currentRequestId.current
    if (!requestId) return
    cancelledRequests.current.add(requestId)
    cancelGeneration(requestId)
    setIsGenerating(false)
  }, [])

  const handleSummaryCancel = useCallback(() => {
    const requestId = summaryRequestId.current
    if (!requestId) return
    summaryRequestId.current = null
    void cancelSessionSummary(requestId)
    setIsSummaryGenerating(false)
  }, [])

  const handleEndSession = useCallback(async () => {
    if (!history.length) {
      setSessionSummary('No history captured yet. Generate a few answers first.')
      setActivePanel('summary')
      return
    }

    const provider = answerSettings.provider || 'gemini'
    const apiKey = providerKeys[provider] || (provider === 'gemini' ? envApiKey : '')
    if (!apiKey) {
      setSessionSummary(`API key not set for ${PROVIDER_LABELS[provider]}. Open Settings and add your key.`)
      setActivePanel('summary')
      return
    }

    if (summaryRequestId.current) {
      void cancelSessionSummary(summaryRequestId.current)
    }

    const requestId = createId()
    summaryRequestId.current = requestId
    setIsSummaryGenerating(true)
    setSessionSummary('')
    setActivePanel('summary')

    try {
      const options: GenerationOptions = {
        format: 'bullets',
        tone: 'professional',
        length: 'medium',
        followUps: false,
        model: answerSettings.model?.trim() || undefined,
        provider,
        profile: profileContext
      }

      const summary = await generateSessionSummary({
        history,
        apiKey,
        requestId,
        options,
        onChunk: (text) => {
          if (summaryRequestId.current !== requestId) return
          setSessionSummary((prev) => prev + text)
        }
      })

      if (summaryRequestId.current !== requestId) return
      setSessionSummary(summary)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSessionSummary(`Session summary error: ${message}`)
    } finally {
      if (summaryRequestId.current === requestId) {
        setIsSummaryGenerating(false)
      }
    }
  }, [history, answerSettings, providerKeys, profileContext])

  const handleCodingCancel = useCallback(() => {
    const requestId = codingRequestId.current
    if (!requestId) return
    cancelCoding(requestId)
    setIsCodingGenerating(false)
  }, [])

  const handleHistoryUse = (item: HistoryItem) => {
    setTranscript(item.question)
    setInterimTranscript('')
    setSuggestion(item.answer)
    setActivePanel('main')
  }

  const handleHistoryDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id))
  }

  const handleHistoryClear = () => {
    setHistory([])
  }

  const toggleSettings = () => {
    setManualInputOpen(false)
    setActivePanel(prev => (prev === 'settings' ? 'main' : 'settings'))
  }

  const toggleHistory = () => {
    setManualInputOpen(false)
    setActivePanel(prev => (prev === 'history' ? 'main' : 'history'))
  }

  const activeProvider = answerSettings.provider || 'gemini'
  const activeProviderLabel = PROVIDER_LABELS[activeProvider]
  const activeModelLabel = answerSettings.model?.trim()
    ? `${activeProviderLabel} ${answerSettings.model.trim()}`
    : activeProviderLabel
  const screenCaptureActive = screenOcrEnabled && (ocrStatus.state === 'running' || ocrStatus.state === 'starting')
  const micActive = isListening || systemAudioStatus.state === 'running' || systemAudioStatus.state === 'starting'
  const hasApiKey = Boolean(providerKeys[activeProvider] || (activeProvider === 'gemini' && envApiKey))
  const isStreaming = isSummaryGenerating || (activeMode === 'coding' ? isCodingGenerating : isGenerating)
  const ocrStatusMessage = screenOcrEnabled
    ? (ocrStatus.state === 'error'
      ? `OCR error: ${ocrStatus.message || 'Unknown error'}`
      : ocrStatus.state === 'starting'
        ? 'OCR starting...'
        : ocrStatus.state === 'running'
          ? 'OCR running'
          : ocrStatus.state === 'stopped'
            ? 'OCR stopped'
            : 'OCR idle')
    : undefined
  const shellClassName = [
    'h-screen flex flex-col rounded-2xl hud-shell',
    micActive ? 'hud-shell--listening' : '',
    isStreaming ? 'hud-shell--streaming' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={shellClassName}>
      <MeetingToast message={meetingToast} />
      <TitleBar
        isMicActive={micActive}
        isScreenCaptureActive={screenCaptureActive}
        isStreaming={isStreaming}
        activeModelLabel={activeModelLabel}
        hasApiKey={hasApiKey}
        onToggleRecording={toggleRecording}
        onSettings={toggleSettings}
        onHistory={toggleHistory}
      />

      <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden px-3 pt-3 gap-3">
        {activePanel === 'settings' ? (
          <div className="hud-card flex flex-col flex-1 min-h-0 p-4 overflow-hidden">
            <SettingsPanel
              providerKeys={providerKeys}
              providerKeyInfo={providerKeyInfo}
              answerSettings={answerSettings}
              profileContext={profileContext}
              onSave={handleSaveSettings}
              onClose={() => setActivePanel('main')}
            />
          </div>
        ) : activePanel === 'history' ? (
          <div className="hud-card flex flex-col flex-1 min-h-0 p-4 overflow-hidden">
            <HistoryPanel
              items={history}
              onUse={handleHistoryUse}
              onDelete={handleHistoryDelete}
              onClear={handleHistoryClear}
              onClose={() => setActivePanel('main')}
            />
          </div>
        ) : activePanel === 'summary' ? (
          <div className="hud-card flex flex-col flex-1 min-h-0 p-4 overflow-hidden">
            <SummaryPanel
              summary={sessionSummary}
              isGenerating={isSummaryGenerating}
              onCancel={handleSummaryCancel}
              onClose={() => setActivePanel('main')}
            />
          </div>
        ) : (
          <div className="hud-card flex-1 min-h-0 p-4 flex flex-col gap-4">
            {activeMode === 'coding' ? (
              <CodingPanel
                isScanning={screenOcrEnabled}
                onToggleScan={() => setScreenOcrEnabled((prev) => !prev)}
                ocrText={ocrText}
                hintText={codingSuggestion}
                isGenerating={isCodingGenerating}
                statusMessage={ocrStatusMessage}
              />
            ) : (
              <div className="flex flex-col gap-4 flex-1 min-h-0">
                <div className="shrink-0">
                  <TranscriptPanel
                    transcript={transcript}
                    interimTranscript={interimTranscript}
                    isEditMode={manualInputOpen}
                    onEditModeChange={setManualInputOpen}
                    onTranscriptChange={setTranscript}
                    onGenerate={handleManualGenerate}
                    isGenerating={isGenerating}
                  />
                </div>

                <div className="border-t border-slate-700/50 pt-4 flex-1 min-h-0 flex flex-col">
                  <SuggestionPanel suggestion={suggestion} isGenerating={isGenerating} />
                </div>

                {speechError && <div className="text-xs text-red-300">{speechError}</div>}
                {!isSupported && <div className="text-xs text-amber-300">Speech recognition not supported</div>}
              </div>
            )}
          </div>
        )}
      </div>

      <ControlBar
        opacity={opacity}
        onOpacityChange={setOpacity}
        isPinned={isPinned}
        onTogglePin={handleTogglePin}
        mode={activeMode}
        onModeChange={(mode) => {
          setActiveMode(mode)
          if (mode === 'coding') {
            setScreenOcrEnabled(true)
          } else {
            setScreenOcrEnabled(false)
            handleCodingCancel()
          }
        }}
        onManualInput={() => setManualInputOpen((prev) => !prev)}
        isManualInputOpen={manualInputOpen}
        onClear={handleClear}
        onRegenerate={handleManualGenerate}
        onCancel={activeMode === 'coding' ? handleCodingCancel : handleCancel}
        isGenerating={activeMode === 'coding' ? isCodingGenerating : isGenerating}
        onEndSession={handleEndSession}
        isSummaryGenerating={isSummaryGenerating}
      />
    </div>
  )
}

export default App

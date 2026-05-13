import { useState, useEffect, useCallback, useRef } from 'react'
import { TitleBar } from './components/TitleBar'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { ControlBar } from './components/ControlBar'
import { SettingsPanel } from './components/SettingsPanel'
import { HistoryPanel } from './components/HistoryPanel'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { generateAnswer, cancelGeneration } from './services/gemini'
import type { AnswerSettings, ProfileContext, HistoryItem, ApiKeyStorageInfo, GenerationOptions } from './types'

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
  model: 'gemini-2.5-flash'
}

const DEFAULT_PROFILE: ProfileContext = {
  resume: '',
  jobDescription: '',
  companyNotes: ''
}

type PanelView = 'main' | 'settings' | 'history'

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

function App() {
  const [activePanel, setActivePanel] = useState<PanelView>('main')
  const [isGenerating, setIsGenerating] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [apiKey, setApiKey] = useState(envApiKey)
  const [storageInfo, setStorageInfo] = useState<ApiKeyStorageInfo>({ secureAvailable: false, secureUsed: false })
  const [isPinned, setIsPinned] = useState(true)
  const [answerSettings, setAnswerSettings] = useState<AnswerSettings>(() => {
    const stored = loadJson<Partial<AnswerSettings>>(SETTINGS_KEY) || {}
    return { ...DEFAULT_SETTINGS, ...stored, model: stored.model?.trim() || DEFAULT_SETTINGS.model }
  })
  const [profileContext, setProfileContext] = useState<ProfileContext>(() => {
    return loadJson<ProfileContext>(PROFILE_KEY) || DEFAULT_PROFILE
  })
  const [history, setHistory] = useState<HistoryItem[]>(() => loadJson<HistoryItem[]>(HISTORY_KEY) || [])
  const currentRequestId = useRef<string | null>(null)
  const cancelledRequests = useRef(new Set<string>())
  const lastManualGenerateAt = useRef(0)

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
    let isMounted = true
    const loadApiKey = async () => {
      let storedKey = await window.electronAPI?.getApiKey?.()
      const legacyKey = localStorage.getItem('gemini_api_key')
      if (!storedKey && legacyKey) {
        await window.electronAPI?.setApiKey?.(legacyKey)
        localStorage.removeItem('gemini_api_key')
        storedKey = legacyKey
      }
      const info = await window.electronAPI?.getApiKeyStorageInfo?.()
      if (!isMounted) return
      setApiKey(storedKey || envApiKey)
      if (info) setStorageInfo(info)
    }
    loadApiKey()
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
    if (!apiKey) {
      setSuggestion('API key not set. Open Settings and add your Gemini API key.')
      return
    }
    
    const requestId = createId()
    currentRequestId.current = requestId
    cancelledRequests.current.delete(requestId)
    setIsGenerating(true)
    setSuggestion('')

    try {
      const options: GenerationOptions = {
        format: answerSettings.format,
        tone: answerSettings.tone,
        length: answerSettings.length,
        followUps: answerSettings.followUps,
        model: answerSettings.model?.trim() || undefined,
        profile: profileContext
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
        setSuggestion('Gemini model configuration error. Please restart the app and try again.')
      } else if (lower.includes('network') || lower.includes('fetch') || lower.includes('eai_again')) {
        setSuggestion('Network error: check your internet connection and try again.')
      } else if (lower.includes('api key') || lower.includes('permission') || lower.includes('unauthorized') || lower.includes('invalid')) {
        setSuggestion('Invalid or restricted API key. Open Settings and verify your Gemini API key is valid.')
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
  }, [transcript, apiKey, answerSettings, profileContext, addHistory])

  useEffect(() => {
    // Only auto-generate after speech completes (when interimTranscript is empty and transcript changed)
    if (activePanel !== 'main') return
    if (!answerSettings.autoGenerate) return
    if (!transcript || interimTranscript) return
    if (Date.now() - lastManualGenerateAt.current < 2500) return
    const timer = setTimeout(() => generateResponse(), 2000)
    return () => clearTimeout(timer)
  }, [transcript, interimTranscript, generateResponse, answerSettings.autoGenerate, activePanel])

  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  useEffect(() => {
    const cleanup = window.electronAPI?.onToggleRecording?.(() => toggleRecording())
    return () => {
      cleanup?.()
    }
  }, [toggleRecording])

  const handleSaveSettings = async (payload: { apiKey: string; answerSettings: AnswerSettings; profileContext: ProfileContext }) => {
    setApiKey(payload.apiKey)
    setAnswerSettings(payload.answerSettings)
    setProfileContext(payload.profileContext)
    await window.electronAPI?.setApiKey?.(payload.apiKey)
    const info = await window.electronAPI?.getApiKeyStorageInfo?.()
    if (info) setStorageInfo(info)
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
    setActivePanel(prev => (prev === 'settings' ? 'main' : 'settings'))
  }

  const toggleHistory = () => {
    setActivePanel(prev => (prev === 'history' ? 'main' : 'history'))
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900/95 backdrop-blur-md rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl">
      <TitleBar isPinned={isPinned} onTogglePin={handleTogglePin} />

      <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
        <div className="flex items-center gap-2 text-xs">
          {isListening ? (
            <>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400">Listening...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-gray-500 rounded-full" />
              <span className="text-gray-400">Ready</span>
            </>
          )}
          {!apiKey && <span className="ml-auto text-yellow-400">Set API key in settings</span>}
        </div>

        {activePanel === 'settings' ? (
          <SettingsPanel
            apiKey={apiKey}
            answerSettings={answerSettings}
            profileContext={profileContext}
            storageInfo={storageInfo}
            onSave={handleSaveSettings}
            onClose={() => setActivePanel('main')}
          />
        ) : activePanel === 'history' ? (
          <HistoryPanel
            items={history}
            onUse={handleHistoryUse}
            onDelete={handleHistoryDelete}
            onClear={handleHistoryClear}
            onClose={() => setActivePanel('main')}
          />
        ) : (
          <>
            <TranscriptPanel 
              transcript={transcript} 
              interimTranscript={interimTranscript}
              onTranscriptChange={setTranscript}
              onGenerate={handleManualGenerate}
              isGenerating={isGenerating}
            />
            <SuggestionPanel suggestion={suggestion} isGenerating={isGenerating} />
          </>
        )}

        {speechError && <div className="text-xs text-red-400 px-2">{speechError}</div>}
        {!isSupported && <div className="text-xs text-yellow-400 px-2">Speech recognition not supported</div>}
      </div>

      <ControlBar
        isRecording={isListening}
        onToggleRecording={toggleRecording}
        onSettings={toggleSettings}
        onHistory={toggleHistory}
        onClear={handleClear}
        onRegenerate={handleManualGenerate}
        onCancel={handleCancel}
        isGenerating={isGenerating}
        isHistoryOpen={activePanel === 'history'}
      />
    </div>
  )
}

export default App

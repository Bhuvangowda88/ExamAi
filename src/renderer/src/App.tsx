import { useState, useEffect, useCallback } from 'react'
import { TitleBar } from './components/TitleBar'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SuggestionPanel } from './components/SuggestionPanel'
import { ControlBar } from './components/ControlBar'
import { SettingsPanel } from './components/SettingsPanel'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { generateAnswer } from './services/gemini'

const envApiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || ''

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || envApiKey)
  const [isPinned, setIsPinned] = useState(true)

  const { startListening, stopListening, isSupported, error: speechError } = useSpeechRecognition({
    onResult: (text, isFinal) => {
      if (isFinal) {
        setTranscript(prev => prev + (prev ? ' ' : '') + text)
        setInterimTranscript('')
      } else {
        setInterimTranscript(text)
      }
    }
  })

  const generateResponse = useCallback(async () => {
    if (!transcript.trim()) {
      setSuggestion('Please enter or speak a question first.')
      return
    }
    if (!apiKey) {
      setSuggestion('API key not set. Open Settings and add your Gemini API key.')
      return
    }
    
    setIsGenerating(true)
    try {
      const answer = await generateAnswer(transcript, apiKey)
      setSuggestion(answer)
    } catch (err) {
      console.error('Failed to generate answer:', err)
      const message = err instanceof Error ? err.message : String(err)
      const lower = message.toLowerCase()

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
      setIsGenerating(false)
    }
  }, [transcript, apiKey])

  useEffect(() => {
    // Only auto-generate after speech completes (when interimTranscript is empty and transcript changed)
    if (!transcript || interimTranscript) return
    const timer = setTimeout(() => generateResponse(), 2000)
    return () => clearTimeout(timer)
  }, [transcript, interimTranscript, generateResponse])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopListening()
      setIsRecording(false)
    } else {
      startListening()
      setIsRecording(true)
    }
  }, [isRecording, startListening, stopListening])

  useEffect(() => {
    const cleanup = window.electronAPI?.onToggleRecording?.(() => toggleRecording())
    return () => {
      cleanup?.()
    }
  }, [toggleRecording])

  const handleSaveApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem('gemini_api_key', key)
    setShowSettings(false)
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

  return (
    <div className="h-screen flex flex-col bg-gray-900/95 backdrop-blur-md rounded-xl overflow-hidden border border-gray-700/50 shadow-2xl">
      <TitleBar isPinned={isPinned} onTogglePin={handleTogglePin} />

      <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
        <div className="flex items-center gap-2 text-xs">
          {isRecording ? (
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

        {showSettings ? (
          <SettingsPanel apiKey={apiKey} onSave={handleSaveApiKey} onClose={() => setShowSettings(false)} />
        ) : (
          <>
            <TranscriptPanel 
              transcript={transcript} 
              interimTranscript={interimTranscript}
              onTranscriptChange={setTranscript}
              onGenerate={generateResponse}
              isGenerating={isGenerating}
            />
            <SuggestionPanel suggestion={suggestion} isGenerating={isGenerating} />
          </>
        )}

        {speechError && <div className="text-xs text-red-400 px-2">{speechError}</div>}
        {!isSupported && <div className="text-xs text-yellow-400 px-2">Speech recognition not supported</div>}
      </div>

      <ControlBar
        isRecording={isRecording}
        onToggleRecording={toggleRecording}
        onSettings={() => setShowSettings(!showSettings)}
        onClear={handleClear}
        onRegenerate={generateResponse}
        isGenerating={isGenerating}
      />
    </div>
  )
}

export default App

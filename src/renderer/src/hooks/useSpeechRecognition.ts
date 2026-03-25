import { useCallback, useRef, useState } from 'react'

interface UseSpeechRecognitionOptions {
  onResult: (text: string, isFinal: boolean) => void
  language?: string
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent {
  error: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function useSpeechRecognition({ onResult, language = 'en-US' }: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shouldRestart = useRef(false)

  const SpeechRecognitionAPI = typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null
  const isSupported = Boolean(SpeechRecognitionAPI)

  const startListening = useCallback(() => {
    if (!isSupported || !SpeechRecognitionAPI) {
      setError('Speech recognition not supported')
      return
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }
      if (final) onResult(final, true)
      if (interim) onResult(interim, false)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return

      if (event.error === 'network') {
        setError('Speech recognition network error. Check internet and allow microphone access in macOS Privacy settings.')
      } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access denied. Enable it in macOS System Settings > Privacy & Security > Microphone.')
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
    }

    recognition.onend = () => {
      if (shouldRestart.current) {
        try { recognition.start() } catch {}
      } else {
        setIsListening(false)
      }
    }

    recognitionRef.current = recognition
    shouldRestart.current = true
    setIsListening(true)
    setError(null)

    try {
      recognition.start()
    } catch {
      setError('Failed to start speech recognition')
    }
  }, [isSupported, SpeechRecognitionAPI, language, onResult])

  const stopListening = useCallback(() => {
    shouldRestart.current = false
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  return { isListening, isSupported, error, startListening, stopListening }
}

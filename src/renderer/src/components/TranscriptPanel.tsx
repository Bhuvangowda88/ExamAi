import { useState } from 'react'

interface TranscriptPanelProps {
  transcript: string
  interimTranscript: string
  onTranscriptChange?: (text: string) => void
  onGenerate?: () => void
  isGenerating?: boolean
}

export function TranscriptPanel({ transcript, interimTranscript, onTranscriptChange, onGenerate, isGenerating }: TranscriptPanelProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [editText, setEditText] = useState(transcript)

  const handleSwitchMode = () => {
    if (isEditMode) {
      onTranscriptChange?.(editText)
    } else {
      setEditText(transcript)
    }
    setIsEditMode(!isEditMode)
  }

  return (
    <div className="flex-1 min-h-[100px] max-h-[180px] overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-400">Question {isEditMode ? '(Edit)' : ''}</span>
        <button
          onClick={handleSwitchMode}
          className="ml-auto text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300"
        >
          {isEditMode ? 'Done' : 'Type'}
        </button>
      </div>
      {isEditMode ? (
        <div className="flex flex-col gap-2 flex-1">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Type your interview question here..."
            className="flex-1 w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <button
            onClick={() => {
              onTranscriptChange?.(editText)
              setTimeout(() => onGenerate?.(), 0)
            }}
            disabled={!editText.trim() || isGenerating}
            className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {isGenerating ? 'Generating...' : 'Generate Answer'}
          </button>
        </div>
      ) : (
        <div className="h-[calc(100%-24px)] overflow-y-auto bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
          {transcript || interimTranscript ? (
            <p className="text-sm text-gray-200 leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="text-gray-400 italic"> {interimTranscript}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Click "Start" to speak or "Type" to enter text...
            </p>
          )}
        </div>
      )}
    </div>
  )
}

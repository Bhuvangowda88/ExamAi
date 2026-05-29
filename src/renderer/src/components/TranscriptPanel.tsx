import { useEffect, useState } from 'react'

interface TranscriptPanelProps {
  transcript: string
  interimTranscript: string
  isEditMode?: boolean
  onEditModeChange?: (value: boolean) => void
  onTranscriptChange?: (text: string) => void
  onGenerate?: () => void
  isGenerating?: boolean
}

export function TranscriptPanel({
  transcript,
  interimTranscript,
  isEditMode,
  onEditModeChange,
  onTranscriptChange,
  onGenerate,
  isGenerating
}: TranscriptPanelProps) {
  const [localEditMode, setLocalEditMode] = useState(false)
  const [editText, setEditText] = useState(transcript)

  const editMode = isEditMode ?? localEditMode

  const setEditMode = (next: boolean) => {
    onEditModeChange?.(next)
    if (!onEditModeChange) {
      setLocalEditMode(next)
    }
  }

  useEffect(() => {
    if (!editMode) {
      setEditText(transcript)
    }
  }, [editMode, transcript])

  const handleConfirm = () => {
    onTranscriptChange?.(editText)
    setEditMode(false)
    setTimeout(() => onGenerate?.(), 0)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
        <span>Incoming question</span>
        {editMode && (
          <button
            onClick={() => setEditMode(false)}
            className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {editMode ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder="Type or paste the question..."
            className="min-h-[90px] w-full rounded-xl bg-slate-900/60 border border-slate-700/60 p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 resize-none"
          />
          <button
            onClick={handleConfirm}
            disabled={!editText.trim() || isGenerating}
            className="w-full py-2 rounded-xl bg-emerald-500/80 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wide disabled:opacity-50 transition-colors"
          >
            {isGenerating ? 'Streaming...' : 'Send to Copilot'}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-950/50 border border-slate-700/40 p-3 min-h-[80px]">
          {transcript || interimTranscript ? (
            <p className="text-sm text-slate-200 leading-relaxed stream-in">
              {transcript}
              {interimTranscript && (
                <span className="text-slate-400 italic"> {interimTranscript}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-500 italic">
              Listening for the next question...
            </p>
          )}
        </div>
      )}
    </div>
  )
}

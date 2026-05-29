import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface SuggestionPanelProps {
  suggestion: string
  isGenerating: boolean
}

export function SuggestionPanel({ suggestion, isGenerating }: SuggestionPanelProps) {
  const [copied, setCopied] = useState(false)

  const normalizeLine = (line: string) => line.replace(/^[-•\s]+/, '').trim()

  const lines = suggestion
    ? suggestion.split(/\n+/).map(normalizeLine).filter(Boolean)
    : []

  const bulletItems = lines.length ? lines : suggestion ? [suggestion.trim()] : []

  const handleCopy = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-slate-500">
        <span>Copilot stream</span>
        {suggestion && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-[10px] rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-slate-950/50 border border-slate-700/40 p-4">
        {isGenerating && !suggestion && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span>Streaming response...</span>
          </div>
        )}

        {bulletItems.length > 0 ? (
          <ul className="space-y-3">
            {bulletItems.map((line, idx) => (
              <li key={`${line}-${idx}`} className="flex gap-3 text-sm text-slate-100 leading-relaxed stream-in">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-300/80" />
                <span className="flex-1 whitespace-pre-wrap">{line}</span>
              </li>
            ))}
          </ul>
        ) : !isGenerating ? (
          <p className="text-sm text-slate-500 italic">
            Awaiting the next response...
          </p>
        ) : null}
      </div>
    </div>
  )
}

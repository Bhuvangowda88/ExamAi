import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface SuggestionPanelProps {
  suggestion: string
  isGenerating: boolean
}

export function SuggestionPanel({ suggestion, isGenerating }: SuggestionPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (suggestion) {
      navigator.clipboard.writeText(suggestion)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="flex-1 min-h-[120px] overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">Suggested Answer</span>
        {suggestion && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      <div className="h-[calc(100%-24px)] overflow-y-auto bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Generating response...</span>
          </div>
        ) : suggestion ? (
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{suggestion}</p>
        ) : (
          <p className="text-sm text-gray-500 italic">
            AI-generated answer suggestions will appear here...
          </p>
        )}
      </div>
    </div>
  )
}

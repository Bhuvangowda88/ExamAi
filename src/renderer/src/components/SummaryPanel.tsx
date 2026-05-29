import { Copy, FileText, Square, X } from 'lucide-react'

interface SummaryPanelProps {
  summary: string
  isGenerating: boolean
  onCancel?: () => void
  onClose: () => void
}

export function SummaryPanel({ summary, isGenerating, onCancel, onClose }: SummaryPanelProps) {
  const handleCopy = () => {
    if (summary) navigator.clipboard.writeText(summary)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-emerald-300" />
          <h2 className="text-sm font-medium text-slate-200">Post-interview summary</h2>
        </div>
        <div className="flex items-center gap-1">
          {isGenerating && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
              title="Stop summary"
              aria-label="Stop summary"
            >
              <Square size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
            title="Close summary"
            aria-label="Close summary"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl bg-slate-950/50 border border-slate-700/40 p-4">
        {isGenerating && !summary ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Generating summary...</span>
          </div>
        ) : summary ? (
          <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans">{summary}</pre>
        ) : (
          <p className="text-sm text-slate-500 italic">No summary generated yet.</p>
        )}
      </div>

      <button
        onClick={handleCopy}
        disabled={!summary}
        className="mt-4 w-full py-2 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-2">
          <Copy size={14} />
          Copy summary
        </span>
      </button>
    </div>
  )
}

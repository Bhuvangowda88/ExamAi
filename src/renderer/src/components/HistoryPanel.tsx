import { X, Copy, Trash2, CornerDownLeft } from 'lucide-react'
import type { HistoryItem } from '../types'

interface HistoryPanelProps {
  items: HistoryItem[]
  onUse: (item: HistoryItem) => void
  onDelete: (id: string) => void
  onClear: () => void
  onClose: () => void
}

function formatTimestamp(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return ''
  }
}

export function HistoryPanel({ items, onUse, onDelete, onClear, onClose }: HistoryPanelProps) {
  const handleCopy = (text: string) => {
    if (text) navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-200">History</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
          title="Close history"
          aria-label="Close history"
        >
          <X size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          No answers yet. Generate one to start building history.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {items.map((item) => (
            <div key={item.id} className="bg-gray-800/50 border border-gray-700/40 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{formatTimestamp(item.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUse(item)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-700/60 hover:bg-gray-700 text-gray-200"
                    title="Use this question and answer"
                  >
                    <CornerDownLeft size={12} />
                    Use
                  </button>
                  <button
                    onClick={() => handleCopy(item.answer)}
                    className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
                    title="Copy answer"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-400 mb-2">Question</div>
              <p className="text-sm text-gray-200 whitespace-pre-wrap mb-3">
                {item.question}
              </p>
              <div className="text-xs text-gray-400 mb-2">Answer</div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <button
          onClick={onClear}
          className="mt-4 w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
        >
          Clear History
        </button>
      )}
    </div>
  )
}

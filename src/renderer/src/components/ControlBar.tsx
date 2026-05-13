import { Mic, MicOff, Settings, Trash2, RefreshCw, History, Square } from 'lucide-react'

interface ControlBarProps {
  isRecording: boolean
  onToggleRecording: () => void
  onSettings: () => void
  onHistory: () => void
  onClear: () => void
  onRegenerate: () => void
  onCancel: () => void
  isGenerating: boolean
  isHistoryOpen: boolean
}

export function ControlBar({
  isRecording,
  onToggleRecording,
  onSettings,
  onHistory,
  onClear,
  onRegenerate,
  onCancel,
  isGenerating,
  isHistoryOpen
}: ControlBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-t border-gray-700/50">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleRecording}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? <><MicOff size={16} /><span>Stop</span></> : <><Mic size={16} /><span>Start</span></>}
        </button>

        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
          title="Regenerate answer"
        >
          <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
        </button>

        {isGenerating && (
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
            title="Stop generation"
          >
            <Square size={14} />
          </button>
        )}

        <button
          onClick={onClear}
          className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
          title="Clear"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 hidden sm:inline">Ctrl+Shift+R</span>
        <button
          onClick={onHistory}
          className={`p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors ${isHistoryOpen ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
          title="History"
        >
          <History size={16} />
        </button>
        <button
          onClick={onSettings}
          className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </div>
  )
}

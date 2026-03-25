import { Minus, X, Pin, PinOff } from 'lucide-react'

interface TitleBarProps {
  isPinned: boolean
  onTogglePin: () => void
}

export function TitleBar({ isPinned, onTogglePin }: TitleBarProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-800/80 border-b border-gray-700/50 app-drag">
      <span className="text-sm font-medium text-gray-300">Quick Notes</span>
      <div className="flex items-center gap-1 app-no-drag">
        <button
          onClick={onTogglePin}
          className={`p-1.5 rounded hover:bg-gray-700/50 transition-colors ${isPinned ? 'text-blue-400' : 'text-gray-400'}`}
          title={isPinned ? 'Unpin window' : 'Pin window'}
        >
          {isPinned ? <Pin size={14} /> : <PinOff size={14} />}
        </button>
        <button
          onClick={() => window.electronAPI?.minimize?.()}
          className="p-1.5 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.electronAPI?.close?.()}
          className="p-1.5 rounded hover:bg-red-500/80 text-gray-400 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

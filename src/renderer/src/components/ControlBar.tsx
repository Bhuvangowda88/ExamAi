import { Pin, PinOff, Sliders, Keyboard, RefreshCw, Trash2, Square, FileText } from 'lucide-react'

interface ControlBarProps {
  opacity: number
  onOpacityChange: (value: number) => void
  isPinned: boolean
  onTogglePin: () => void
  mode: 'behavioral' | 'coding'
  onModeChange: (mode: 'behavioral' | 'coding') => void
  onManualInput: () => void
  isManualInputOpen: boolean
  onClear: () => void
  onRegenerate: () => void
  onCancel: () => void
  isGenerating: boolean
  onEndSession: () => void
  isSummaryGenerating: boolean
}

export function ControlBar({
  opacity,
  onOpacityChange,
  isPinned,
  onTogglePin,
  mode,
  onModeChange,
  onManualInput,
  isManualInputOpen,
  onClear,
  onRegenerate,
  onCancel,
  isGenerating,
  onEndSession,
  isSummaryGenerating
}: ControlBarProps) {
  return (
    <div className="px-3 pb-3">
      <div className="hud-card flex flex-wrap items-center gap-2 px-3 py-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <Sliders size={12} className="text-slate-400" />
          <span className="text-slate-400">Opacity</span>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            aria-label="Opacity"
            title="Opacity"
            className="w-24 accent-emerald-400"
          />
        </div>

        <button
          onClick={onTogglePin}
          className={`hud-pill flex items-center gap-1 px-2 py-1 transition-colors ${
            isPinned ? 'text-emerald-200 border-emerald-400/50' : 'text-slate-300'
          }`}
          title={isPinned ? 'Unpin window' : 'Pin window'}
        >
          {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
          <span>{isPinned ? 'Pinned' : 'Pin'}</span>
        </button>

        <div className="flex items-center rounded-full bg-slate-900/50 p-0.5 border border-slate-700/60">
          <button
            onClick={() => onModeChange('behavioral')}
            className={`px-2 py-1 rounded-full transition-colors ${
              mode === 'behavioral' ? 'bg-emerald-400/20 text-emerald-200' : 'text-slate-400'
            }`}
          >
            Behavioral
          </button>
          <button
            onClick={() => onModeChange('coding')}
            className={`px-2 py-1 rounded-full transition-colors ${
              mode === 'coding' ? 'bg-violet-400/20 text-violet-200' : 'text-slate-400'
            }`}
          >
            Coding
          </button>
        </div>

        <button
          onClick={onManualInput}
          className={`hud-pill flex items-center gap-1 px-2 py-1 transition-colors ${
            isManualInputOpen ? 'text-violet-200 border-violet-400/50' : 'text-slate-300'
          }`}
          title="Manual input"
        >
          <Keyboard size={12} />
          <span>{isManualInputOpen ? 'Typing' : 'Manual'}</span>
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onEndSession}
            disabled={isSummaryGenerating}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="End session & summarize"
          >
            <FileText size={14} className={isSummaryGenerating ? 'animate-pulse' : ''} />
          </button>

          <button
            onClick={onRegenerate}
            disabled={isGenerating}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Regenerate answer"
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
          </button>

          {isGenerating && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Stop generation"
            >
              <Square size={12} />
            </button>
          )}

          <button
            onClick={onClear}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Clear"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

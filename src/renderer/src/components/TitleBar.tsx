import { Mic, MicOff, Monitor, Cpu, Settings, History, X } from 'lucide-react'

interface TitleBarProps {
  isMicActive: boolean
  isScreenCaptureActive: boolean
  isStreaming: boolean
  activeModelLabel: string
  hasApiKey: boolean
  onToggleRecording: () => void
  onSettings: () => void
  onHistory: () => void
}

export function TitleBar({
  isMicActive,
  isScreenCaptureActive,
  isStreaming,
  activeModelLabel,
  hasApiKey,
  onToggleRecording,
  onSettings,
  onHistory
}: TitleBarProps) {
  return (
    <div className="hud-header flex items-center justify-between px-3 py-2 app-drag relative z-10">
      <div className="flex items-center gap-3 text-[11px]">
        <div className="flex items-center gap-2">
          <span className={`hud-dot ${isMicActive ? 'hud-dot--emerald' : 'hud-dot--muted'}`} />
          <span className="uppercase tracking-[0.3em] text-slate-400">Copilot</span>
        </div>
        <div className="hud-pill flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-300">
          <Monitor size={12} className={isScreenCaptureActive ? 'text-emerald-300' : 'text-slate-400'} />
          <span>{isScreenCaptureActive ? 'Screen On' : 'Screen Idle'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 app-no-drag">
        <button
          onClick={onToggleRecording}
          className={`hud-pill flex items-center gap-1 px-2 py-0.5 text-[10px] transition-colors ${
            isMicActive ? 'text-emerald-200 border-emerald-400/40' : 'text-slate-300'
          }`}
          title={isMicActive ? 'Stop listening' : 'Start listening'}
        >
          {isMicActive ? <MicOff size={12} /> : <Mic size={12} />}
          <span>{isMicActive ? 'Mic Live' : 'Mic Idle'}</span>
        </button>

        <div className={`hud-pill flex items-center gap-1 px-2 py-0.5 text-[10px] ${
          isStreaming ? 'text-violet-200 border-violet-400/50' : 'text-slate-300'
        }`}>
          <Cpu size={12} className={isStreaming ? 'text-violet-300' : 'text-slate-400'} />
          <span>{activeModelLabel || 'Gemini'}</span>
        </div>

        {!hasApiKey && (
          <div className="hud-pill px-2 py-0.5 text-[10px] text-amber-300 border-amber-400/40">
            Key needed
          </div>
        )}

        <button
          onClick={onHistory}
          className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title="History"
        >
          <History size={14} />
        </button>
        <button
          onClick={onSettings}
          className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title="Settings"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={() => window.electronAPI?.close?.()}
          className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Hide window"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

import { Scan, Activity } from 'lucide-react'

interface CodingPanelProps {
  isScanning: boolean
  onToggleScan: () => void
  ocrText: string
  hintText: string
  isGenerating: boolean
  statusMessage?: string
}

export function CodingPanel({
  isScanning,
  onToggleScan,
  ocrText,
  hintText,
  isGenerating,
  statusMessage
}: CodingPanelProps) {
  const normalizeLine = (line: string) => line.replace(/^[-•\s]+/, '').trim()
  const lines = hintText
    ? hintText.split(/\n+/).map(normalizeLine).filter(Boolean)
    : []

  const bulletItems = lines.length ? lines : hintText ? [hintText.trim()] : []

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
          <span>Technical mode</span>
          {statusMessage && (
            <span className="text-[10px] text-slate-400 normal-case tracking-normal">{statusMessage}</span>
          )}
        </div>
        <button
          onClick={onToggleScan}
          className={`hud-pill flex items-center gap-1 px-2 py-1 text-[11px] transition-colors ${
            isScanning ? 'text-emerald-200 border-emerald-400/50' : 'text-slate-300'
          }`}
        >
          <Scan size={12} />
          <span>{isScanning ? 'Scan On' : 'Scan Screen'}</span>
        </button>
      </div>

      <div className="grid gap-3 flex-1 min-h-0">
        <div className="rounded-xl bg-slate-950/50 border border-slate-700/40 p-3 min-h-0 flex flex-col">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500 mb-2">
            <span>Screen OCR</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {ocrText ? (
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap stream-in">
                {ocrText}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">No OCR text captured yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-slate-950/50 border border-slate-700/40 p-3 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
              <span>Copilot hints</span>
            </div>
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-violet-300">
                <Activity size={12} className="animate-pulse" />
                <span>Analyzing...</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {bulletItems.length > 0 ? (
              <ul className="space-y-3">
                {bulletItems.map((line, idx) => (
                  <li key={`${line}-${idx}`} className="flex gap-3 text-sm text-slate-100 leading-relaxed stream-in">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-violet-300/80" />
                    <span className="flex-1 whitespace-pre-wrap">{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Enable scan to generate coding guidance and complexity notes.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

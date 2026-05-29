import { Video } from 'lucide-react'

interface MeetingToastProps {
  message: string
}

export function MeetingToast({ message }: MeetingToastProps) {
  if (!message) return null

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 app-no-drag">
      <div className="hud-pill flex items-center gap-2 px-3 py-2 text-xs text-emerald-200 border-emerald-400/40 bg-emerald-500/10">
        <Video size={14} className="text-emerald-300" />
        <span>{message}</span>
      </div>
    </div>
  )
}

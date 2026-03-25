import { useState } from 'react'
import { X, ExternalLink, Key } from 'lucide-react'

interface SettingsPanelProps {
  apiKey: string
  onSave: (key: string) => void
  onClose: () => void
}

export function SettingsPanel({ apiKey, onSave, onClose }: SettingsPanelProps) {
  const [key, setKey] = useState(apiKey)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(key)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-200">Settings</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-2">Google Gemini API Key</label>
          <div className="relative">
            <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Enter your API key..."
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <a
            href="https://makersuite.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300"
          >
            <span>Get free API key</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400">
          <p className="font-medium text-gray-300 mb-2">Keyboard Shortcuts:</p>
          <ul className="space-y-1">
            <li><kbd className="px-1 bg-gray-700 rounded">Ctrl+Shift+R</kbd> Toggle recording</li>
            <li><kbd className="px-1 bg-gray-700 rounded">Ctrl+Shift+H</kbd> Show/hide window</li>
            <li><kbd className="px-1 bg-gray-700 rounded">Ctrl+Shift+Esc</kbd> Quick hide</li>
          </ul>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-300">
          <p className="font-medium mb-1">Stealth Mode Active</p>
          <p className="text-green-300/80">
            This window is HIDDEN from screen sharing on Meet, Teams, and Zoom.
          </p>
        </div>

        <button
          type="submit"
          className="mt-auto w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </form>
    </div>
  )
}

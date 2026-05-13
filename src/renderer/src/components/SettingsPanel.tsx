import { useEffect, useState } from 'react'
import { X, ExternalLink, Key } from 'lucide-react'
import type { AnswerSettings, ProfileContext, ApiKeyStorageInfo } from '../types'

interface SettingsPanelProps {
  apiKey: string
  answerSettings: AnswerSettings
  profileContext: ProfileContext
  storageInfo: ApiKeyStorageInfo
  onSave: (payload: { apiKey: string; answerSettings: AnswerSettings; profileContext: ProfileContext }) => void
  onClose: () => void
}

export function SettingsPanel({ apiKey, answerSettings, profileContext, storageInfo, onSave, onClose }: SettingsPanelProps) {
  const [key, setKey] = useState(apiKey)
  const [localSettings, setLocalSettings] = useState(answerSettings)
  const [profile, setProfile] = useState(profileContext)

  useEffect(() => {
    setKey(apiKey)
  }, [apiKey])

  useEffect(() => {
    setLocalSettings(answerSettings)
  }, [answerSettings])

  useEffect(() => {
    setProfile(profileContext)
  }, [profileContext])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ apiKey: key, answerSettings: localSettings, profileContext: profile })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-200">Settings</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700/50 text-gray-400 hover:text-gray-200"
          title="Close settings"
          aria-label="Close settings"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1">
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
          <div className="mt-2 text-xs text-gray-500">
            {storageInfo.secureAvailable ? (
              storageInfo.secureUsed ? 'Stored securely in your OS keychain.' : 'Secure storage available. Save to store it securely.'
            ) : (
              'Secure storage not available on this system.'
            )}
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

        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 space-y-3">
          <p className="font-medium text-gray-300">Answer Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span>Format</span>
              <select
                value={localSettings.format}
                onChange={(e) => setLocalSettings({ ...localSettings, format: e.target.value as AnswerSettings['format'] })}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200"
              >
                <option value="direct">Direct</option>
                <option value="star">STAR</option>
                <option value="bullets">Bullets</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Tone</span>
              <select
                value={localSettings.tone}
                onChange={(e) => setLocalSettings({ ...localSettings, tone: e.target.value as AnswerSettings['tone'] })}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Length</span>
              <select
                value={localSettings.length}
                onChange={(e) => setLocalSettings({ ...localSettings, length: e.target.value as AnswerSettings['length'] })}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Model</span>
              <input
                value={localSettings.model}
                onChange={(e) => setLocalSettings({ ...localSettings, model: e.target.value })}
                placeholder="gemini-2.5-flash"
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200"
              />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.followUps}
              onChange={(e) => setLocalSettings({ ...localSettings, followUps: e.target.checked })}
            />
            <span>Add follow-up questions</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localSettings.autoGenerate}
              onChange={(e) => setLocalSettings({ ...localSettings, autoGenerate: e.target.checked })}
            />
            <span>Auto-generate after speech</span>
          </label>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-400 space-y-3">
          <p className="font-medium text-gray-300">Profile Context (Optional)</p>
          <label className="flex flex-col gap-1">
            <span>Resume Highlights</span>
            <textarea
              value={profile.resume}
              onChange={(e) => setProfile({ ...profile, resume: e.target.value })}
              placeholder="Key projects, metrics, skills..."
              className="min-h-[70px] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 resize-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Job Description</span>
            <textarea
              value={profile.jobDescription}
              onChange={(e) => setProfile({ ...profile, jobDescription: e.target.value })}
              placeholder="Paste role requirements..."
              className="min-h-[70px] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 resize-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Company Notes</span>
            <textarea
              value={profile.companyNotes}
              onChange={(e) => setProfile({ ...profile, companyNotes: e.target.value })}
              placeholder="Mission, products, interview tips..."
              className="min-h-[60px] bg-gray-900 border border-gray-700 rounded px-2 py-1 text-gray-200 resize-none"
            />
          </label>
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
          <p className="font-medium mb-1">Stealth Mode</p>
          <p className="text-green-300/80">
            Content protection is enabled. Some screen sharing apps may still show the window.
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

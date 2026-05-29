import { useEffect, useState } from 'react'
import { X, ExternalLink, Key } from 'lucide-react'
import type { AnswerSettings, ProfileContext, ProviderKeyInfoMap, ProviderKeyMap, LLMProviderId } from '../types'

interface SettingsPanelProps {
  providerKeys: ProviderKeyMap
  providerKeyInfo: ProviderKeyInfoMap
  answerSettings: AnswerSettings
  profileContext: ProfileContext
  onSave: (payload: { providerKeys: ProviderKeyMap; answerSettings: AnswerSettings; profileContext: ProfileContext }) => void
  onClose: () => void
}

const providerOptions: Array<{ id: LLMProviderId; label: string; link: string; defaultModel: string }> = [
  { id: 'gemini', label: 'Google Gemini', link: 'https://aistudio.google.com/apikey', defaultModel: 'gemini-2.5-flash' },
  { id: 'openai', label: 'OpenAI', link: 'https://platform.openai.com/api-keys', defaultModel: 'gpt-4o' },
  { id: 'anthropic', label: 'Anthropic Claude', link: 'https://console.anthropic.com/settings/keys', defaultModel: 'claude-3-5-sonnet-20240620' }
]

export function SettingsPanel({ providerKeys, providerKeyInfo, answerSettings, profileContext, onSave, onClose }: SettingsPanelProps) {
  const [keys, setKeys] = useState<ProviderKeyMap>(providerKeys)
  const [localSettings, setLocalSettings] = useState(answerSettings)
  const [profile, setProfile] = useState(profileContext)

  useEffect(() => {
    setKeys(providerKeys)
  }, [providerKeys])

  useEffect(() => {
    const normalizedProvider = providerOptions.some((provider) => provider.id === answerSettings.provider)
      ? answerSettings.provider
      : 'gemini'
    setLocalSettings({
      ...answerSettings,
      provider: normalizedProvider
    })
  }, [answerSettings])

  useEffect(() => {
    setProfile(profileContext)
  }, [profileContext])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ providerKeys: keys, answerSettings: localSettings, profileContext: profile })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-slate-200">Settings</h2>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200"
          title="Close settings"
          aria-label="Close settings"
        >
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-1">
        <div className="bg-slate-900/40 rounded-lg p-3 text-xs text-slate-400 space-y-3 border border-slate-700/40">
          <p className="font-medium text-slate-200">API Keys</p>
          <p className="text-slate-500">
            Keys are stored locally using secure storage when available.
          </p>
          {providerOptions.map((provider) => {
            const info = providerKeyInfo?.[provider.id]
            return (
              <div key={provider.id} className="space-y-2">
                <label className="block text-xs font-medium text-slate-400">{provider.label} API Key</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={keys[provider.id] || ''}
                    onChange={(e) => setKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))}
                    placeholder={`Enter your ${provider.label} key...`}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400/60"
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {info?.secureAvailable
                      ? (info?.secureUsed ? 'Stored securely in your OS keychain.' : 'Secure storage available. Save to store it securely.')
                      : 'Secure storage not available on this system.'}
                  </span>
                  <a
                    href={provider.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200"
                  >
                    <span>Get key</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-slate-900/40 rounded-lg p-3 text-xs text-slate-400 space-y-3 border border-slate-700/40">
          <p className="font-medium text-slate-200">Answer Settings</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span>Provider</span>
              <select
                value={localSettings.provider}
                onChange={(e) => {
                  const provider = e.target.value as LLMProviderId
                  const option = providerOptions.find((item) => item.id === provider)
                  setLocalSettings({
                    ...localSettings,
                    provider,
                    model: option?.defaultModel || localSettings.model
                  })
                }}
                className="bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100"
              >
                {providerOptions.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Format</span>
              <select
                value={localSettings.format}
                onChange={(e) => setLocalSettings({ ...localSettings, format: e.target.value as AnswerSettings['format'] })}
                className="bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100"
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
                className="bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100"
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
                className="bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100"
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
                placeholder={providerOptions.find((p) => p.id === localSettings.provider)?.defaultModel || 'model-id'}
                className="bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100"
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

        <div className="bg-slate-900/40 rounded-lg p-3 text-xs text-slate-400 space-y-3 border border-slate-700/40">
          <p className="font-medium text-slate-200">Profile Context (Optional)</p>
          <label className="flex flex-col gap-1">
            <span>Resume Highlights</span>
            <textarea
              value={profile.resume}
              onChange={(e) => setProfile({ ...profile, resume: e.target.value })}
              placeholder="Key projects, metrics, skills..."
              className="min-h-[70px] bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100 resize-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Job Description</span>
            <textarea
              value={profile.jobDescription}
              onChange={(e) => setProfile({ ...profile, jobDescription: e.target.value })}
              placeholder="Paste role requirements..."
              className="min-h-[70px] bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100 resize-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Company Notes</span>
            <textarea
              value={profile.companyNotes}
              onChange={(e) => setProfile({ ...profile, companyNotes: e.target.value })}
              placeholder="Mission, products, interview tips..."
              className="min-h-[60px] bg-slate-950/60 border border-slate-700/60 rounded px-2 py-1 text-slate-100 resize-none"
            />
          </label>
        </div>

        <div className="bg-slate-900/40 rounded-lg p-3 text-xs text-slate-400 border border-slate-700/40">
          <p className="font-medium text-slate-200 mb-2">Keyboard Shortcuts:</p>
          <ul className="space-y-1">
            <li><kbd className="px-1 bg-gray-700 rounded">Ctrl+Shift+R</kbd> Toggle recording</li>
            <li><kbd className="px-1 bg-gray-700 rounded">Ctrl+Shift+H</kbd> Show/hide window</li>
            <li><kbd className="px-1 bg-gray-700 rounded">Ctrl+Shift+Esc</kbd> Quick hide</li>
          </ul>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs text-emerald-200">
          <p className="font-medium mb-1">Stealth Mode</p>
          <p className="text-emerald-200/80">
            Content protection is enabled. Some screen sharing apps may still show the window.
          </p>
        </div>

        <button
          type="submit"
          className="mt-auto w-full py-2 bg-emerald-500/80 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </form>
    </div>
  )
}

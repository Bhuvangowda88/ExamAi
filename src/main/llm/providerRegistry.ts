import type { LLMProvider, LLMProviderId } from './types'
import { geminiProvider } from './providers/gemini'
import { openaiProvider } from './providers/openai'
import { anthropicProvider } from './providers/anthropic'
import { ollamaProvider } from './providers/ollama'

const providers = new Map<LLMProviderId, LLMProvider>([
  [geminiProvider.id, geminiProvider],
  [openaiProvider.id, openaiProvider],
  [anthropicProvider.id, anthropicProvider],
  [ollamaProvider.id, ollamaProvider]
])

export function getProvider(id?: LLMProviderId): LLMProvider {
  if (id && providers.has(id)) {
    return providers.get(id) as LLMProvider
  }
  return geminiProvider
}

export function listProviders(): Array<{ id: LLMProviderId; label: string; defaultModel: string }> {
  return Array.from(providers.values()).map((provider) => ({
    id: provider.id,
    label: provider.label,
    defaultModel: provider.defaultModel
  }))
}

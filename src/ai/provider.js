/**
 * provider.js — optional LLM providers for the grounded advisor.
 *
 * The offline provider is the default and never touches the network. The
 * fake provider is deterministic and used by tests. Ollama and
 * OpenAI-compatible providers are user-configured and optional.
 */

import { adviseOffline, validateSuggestion } from './offline.js';
import { buildAdvisorPrompt, PROMPT_VERSION } from './prompt.js';
import { AdvisorCache, cacheKey } from './cache.js';

export const PROVIDERS = [
  { id: 'offline', name: 'Offline rules', network: false },
  { id: 'fake', name: 'Fake (deterministic)', network: false },
  { id: 'ollama', name: 'Ollama (local)', network: true },
  { id: 'openai-compatible', name: 'OpenAI-compatible', network: true },
];

export function createProvider(config = {}) {
  switch (config.id) {
    case 'fake':
      return fakeProvider();
    case 'ollama':
      return ollamaProvider(config);
    case 'openai-compatible':
      return openAiCompatibleProvider(config);
    case 'offline':
    default:
      return offlineProvider();
  }
}

function offlineProvider() {
  return {
    id: 'offline',
    network: false,
    async analyse(input) {
      return adviseOffline(input);
    },
  };
}

function fakeProvider() {
  return {
    id: 'fake',
    network: false,
    async analyse(input) {
      return adviseOffline(input);
    },
  };
}

function ollamaProvider({ endpoint = 'http://localhost:11434', model = 'llama3.2' } = {}) {
  return {
    id: 'ollama',
    network: true,
    async analyse(input, { image = null } = {}) {
      const prompt = buildAdvisorPrompt(input, { image });
      const response = await fetch(`${endpoint.replace(/\/$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          format: 'json',
          messages: prompt.messages,
        }),
      });
      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
      const data = await response.json();
      return data.message?.content ?? data.response ?? '';
    },
  };
}

function openAiCompatibleProvider({ endpoint, apiKey = '', model = 'gpt-4o-mini' } = {}) {
  return {
    id: 'openai-compatible',
    network: true,
    async analyse(input, { image = null } = {}) {
      if (!endpoint) throw new Error('OpenAI-compatible endpoint is required');
      const prompt = buildAdvisorPrompt(input, { image });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: prompt.messages,
        }),
      });
      if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    },
  };
}

/**
 * Parse a model response into an AdvisorResponse and validate every
 * suggestion against the live document.
 */
export function parseAdvisorResponse(raw, document) {
  let data = raw;
  if (typeof raw === 'string') {
    const text = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      data = JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) data = JSON.parse(text.slice(start, end + 1));
      else throw new Error('Provider returned non-JSON content');
    }
  }
  if (!data || typeof data !== 'object') throw new Error('Provider returned an invalid response');
  const suggestions = [];
  let clamped = 0;
  let rejected = 0;
  for (const suggestion of Array.isArray(data.suggestions) ? data.suggestions : []) {
    const validated = validateSuggestion(document, suggestion);
    if (!validated.ok) {
      rejected += 1;
      continue;
    }
    if (validated.suggestion.clamped) clamped += 1;
    suggestions.push(validated.suggestion);
    if (suggestions.length >= 5) break;
  }
  const caveats = Array.isArray(data.caveats)
    ? data.caveats.filter((item) => typeof item === 'string').slice(0, 10)
    : [];
  if (clamped) caveats.push(`${clamped} suggestion(s) clamped to the allowed range.`);
  if (rejected) caveats.push(`${rejected} suggestion(s) rejected by schema/path validation.`);
  return {
    version: 1,
    summary: typeof data.summary === 'string' ? data.summary.slice(0, 2000) : 'Model analysis',
    changes: Array.isArray(data.changes)
      ? data.changes
        .filter((change) => change && typeof change.path === 'string')
        .slice(0, 20)
      : [],
    suggestions,
    caveats,
  };
}

/**
 * Run a provider with cache and validation. Returns offline data when the
 * provider fails, so the UI always has a deterministic fallback.
 */
export async function runAdvisor(provider, input, { document, cache = null, image = null } = {}) {
  if (!provider || provider.id === 'offline') return adviseOffline(input);
  const key = cacheKey(input, provider, PROMPT_VERSION);
  if (cache) {
    const cached = cache.get(key);
    if (cached) return { ...cached, fromCache: true };
  }
  try {
    const raw = await provider.analyse(input, { image });
    const parsed = parseAdvisorResponse(raw, document);
    if (cache) cache.set(key, parsed);
    return parsed;
  } catch (error) {
    const fallback = adviseOffline(input);
    fallback.caveats = [...(fallback.caveats ?? []), `Provider failed: ${error.message}`];
    fallback.providerError = error.message;
    return fallback;
  }
}

/**
 * Automatic analysis policy: never during playback and never when disabled.
 * Network providers are only reachable after the user explicitly selects one.
 */
export function shouldAutoAnalyze({ playing = false, auto = true, provider = null } = {}) {
  if (playing) return false;
  if (!auto) return false;
  return Boolean(provider);
}

export { AdvisorCache, cacheKey, PROMPT_VERSION };

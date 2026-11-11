/**
 * provider.js — optional LLM providers for the grounded advisor.
 *
 * The offline provider is the default and never touches the network. The
 * fake provider is deterministic and used by tests. Ollama and
 * OpenAI-compatible providers are user-configured and optional.
 */

import { adviseOffline, validateSuggestion } from './offline.ts';
import type { AdvisorResponse } from './offline.ts';
import type { DocumentShape } from '../core/documentTypes.ts';

type Rec = Record<string, unknown>;
export interface ProviderConfig { id?: string; endpoint?: string; apiKey?: string; model?: string; [key: string]: unknown }
export interface AdvisorProvider {
  id: string;
  network: boolean;
  analyse(input: Rec, options?: { image?: string | null }): Promise<unknown>;
}
export interface RunAdvisorOptions { document: DocumentShape; cache?: { get(key: string): AdvisorResponse | null; set(key: string, value: AdvisorResponse): void } | null; image?: string | null }
export interface RunAdvisorResult extends AdvisorResponse { fromCache?: boolean; providerError?: string }
import { buildAdvisorPrompt, PROMPT_VERSION } from './prompt.ts';
import { AdvisorCache, cacheKey } from './cache.ts';

export const PROVIDERS = [
  { id: 'offline', name: 'Offline rules', network: false },
  { id: 'fake', name: 'Fake (deterministic)', network: false },
  { id: 'ollama', name: 'Ollama (local)', network: true },
  { id: 'openai-compatible', name: 'OpenAI-compatible', network: true },
];

export function createProvider(config: ProviderConfig = {}): AdvisorProvider {
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

function offlineProvider(): AdvisorProvider {
  return {
    id: 'offline',
    network: false,
    async analyse(input) {
      return adviseOffline(input);
    },
  };
}

function fakeProvider(): AdvisorProvider {
  return {
    id: 'fake',
    network: false,
    async analyse(input) {
      return adviseOffline(input);
    },
  };
}

function ollamaProvider({ endpoint = 'http://localhost:11434', model = 'llama3.2' }: ProviderConfig = {}): AdvisorProvider {
  return {
    id: 'ollama',
    network: true,
    async analyse(input: Rec, { image = null }: { image?: string | null } = {}): Promise<unknown> {
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

function openAiCompatibleProvider({ endpoint, apiKey = '', model = 'gpt-4o-mini' }: ProviderConfig = {}): AdvisorProvider {
  return {
    id: 'openai-compatible',
    network: true,
    async analyse(input: Rec, { image = null }: { image?: string | null } = {}): Promise<unknown> {
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
export function parseAdvisorResponse(raw: unknown, document: DocumentShape): AdvisorResponse {
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
  const payload = data as Rec;
  const suggestions: Rec[] = [];
  let clamped = 0;
  let rejected = 0;
  for (const suggestion of Array.isArray(payload.suggestions) ? payload.suggestions as Rec[] : []) {
    const validated = validateSuggestion(document, suggestion);
    if (!validated.ok) {
      rejected += 1;
      continue;
    }
    if (validated.suggestion.clamped) clamped += 1;
    suggestions.push(validated.suggestion);
    if (suggestions.length >= 5) break;
  }
  const caveats = Array.isArray(payload.caveats)
    ? (payload.caveats as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, 10)
    : [];
  if (clamped) caveats.push(`${clamped} suggestion(s) clamped to the allowed range.`);
  if (rejected) caveats.push(`${rejected} suggestion(s) rejected by schema/path validation.`);
  return {
    version: 1,
    summary: typeof payload.summary === 'string' ? payload.summary.slice(0, 2000) : 'Model analysis',
    changes: Array.isArray(payload.changes)
      ? (payload.changes as unknown[])
        .filter((change): change is Rec => Boolean(change && typeof change === 'object' && typeof (change as Rec).path === 'string'))
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
export async function runAdvisor(provider: AdvisorProvider | null | undefined, input: Rec, { document, cache = null, image = null }: RunAdvisorOptions): Promise<RunAdvisorResult> {
  if (!provider || provider.id === 'offline') return adviseOffline(input);
  const key = cacheKey(input, provider as unknown as Rec, PROMPT_VERSION);
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
    const message = error instanceof Error ? error.message : String(error);
    fallback.caveats = [...(fallback.caveats ?? []), `Provider failed: ${message}`];
    fallback.providerError = message;
    return fallback;
  }
}

/**
 * Automatic analysis policy: never during playback and never when disabled.
 * Network providers are only reachable after the user explicitly selects one.
 */
export function shouldAutoAnalyze({ playing = false, auto = true, provider = null }: { playing?: boolean; auto?: boolean; provider: AdvisorProvider | null } = { provider: null }): boolean {
  if (playing) return false;
  if (!auto) return false;
  return Boolean(provider);
}

export { AdvisorCache, cacheKey, PROMPT_VERSION };

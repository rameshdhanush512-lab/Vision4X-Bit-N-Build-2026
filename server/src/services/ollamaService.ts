// ─────────────────────────────────────────────────────────────────────────────
// PRIVEX — Ollama LLM Service
// Wraps the local Ollama HTTP API.
// Falls back gracefully if Ollama is not running — agents use deterministic
// logic so the app never crashes without a model.
// ─────────────────────────────────────────────────────────────────────────────

import { logger } from '../utils/logger';

const OLLAMA_BASE  = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL    || 'llama3.2';
const TIMEOUT_MS   = 30_000;

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
}

export interface LLMResult {
  text: string;
  usedLLM: boolean;
}

/**
 * Call the local Ollama model.
 * Returns { text, usedLLM: true } on success.
 * Returns { text: fallback, usedLLM: false } if Ollama is unavailable or times out.
 */
export async function callOllama(
  prompt: string,
  fallback: string,
  systemPrompt?: string
): Promise<LLMResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const body = {
      model: OLLAMA_MODEL,
      prompt,
      system: systemPrompt
        ?? 'You are PRIVEX, an expert privacy and data protection assistant. Be concise, professional, and plain-language.',
      stream: false,
      options: { temperature: 0.3, num_predict: 512 },
    };

    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      logger.warn(`Ollama HTTP ${res.status} — using deterministic fallback`);
      return { text: fallback, usedLLM: false };
    }

    const data = (await res.json()) as OllamaResponse;
    const text = data.response?.trim();

    if (!text) {
      return { text: fallback, usedLLM: false };
    }

    logger.debug('Ollama responded', { model: OLLAMA_MODEL, chars: text.length });
    return { text, usedLLM: true };
  } catch (err: any) {
    const reason = err.name === 'AbortError' ? 'timeout' : 'unavailable';
    logger.warn(`Ollama ${reason} — using deterministic fallback`);
    return { text: fallback, usedLLM: false };
  }
}

/**
 * Check if Ollama is running and whether the configured model is pulled.
 */
export async function checkOllamaHealth(): Promise<{
  running: boolean;
  model: string;
  modelAvailable: boolean;
}> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return { running: false, model: OLLAMA_MODEL, modelAvailable: false };

    const data = (await res.json()) as { models: Array<{ name: string }> };
    const modelAvailable = (data.models ?? []).some((m) => m.name.startsWith(OLLAMA_MODEL));

    return { running: true, model: OLLAMA_MODEL, modelAvailable };
  } catch {
    return { running: false, model: OLLAMA_MODEL, modelAvailable: false };
  }
}

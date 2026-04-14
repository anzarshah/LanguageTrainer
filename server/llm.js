import Anthropic from '@anthropic-ai/sdk';
import { cache } from './cache.js';

// Cost per token (Sonnet 4.6 pricing approximate)
const COST_PER_INPUT_TOKEN = 0.000003;   // $3 per 1M input tokens
const COST_PER_OUTPUT_TOKEN = 0.000015;  // $15 per 1M output tokens

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT = 120000; // 2 minutes
const MAX_RETRIES = 2;

let clientCache = {};

function getClient(apiKey) {
  if (!clientCache[apiKey]) {
    clientCache[apiKey] = new Anthropic({ apiKey });
  }
  return clientCache[apiKey];
}

function estimateCost(inputTokens, outputTokens) {
  return (inputTokens * COST_PER_INPUT_TOKEN) + (outputTokens * COST_PER_OUTPUT_TOKEN);
}

/**
 * Main LLM call function with caching, retry, timeout, and tracking.
 *
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.model
 * @param {string} opts.system - system prompt
 * @param {string} opts.prompt - user message (single string)
 * @param {Array} opts.messages - full messages array (overrides prompt)
 * @param {Object} opts.params - additional params (max_tokens, temperature, etc.)
 * @param {boolean} opts.forceRefresh - bypass cache
 * @param {number} opts.ttlSeconds - cache TTL
 * @returns {Object} { content, cacheHit, latencyMs, inputTokens, outputTokens, estimatedCost, cacheKey }
 */
export async function llmCall(opts) {
  const {
    apiKey,
    model = DEFAULT_MODEL,
    system = '',
    prompt = '',
    messages = null,
    params = {},
    forceRefresh = false,
    ttlSeconds = null,
  } = opts;

  // Build cache input from the effective request
  const effectivePrompt = messages
    ? JSON.stringify(messages)
    : prompt;

  const cacheInput = { model, system, prompt: effectivePrompt, params };
  const cacheKey = cache.makeKey(cacheInput);

  // Check cache (unless force refresh)
  if (!forceRefresh) {
    const cached = cache.get(cacheInput);
    if (cached) {
      cache.logRequest({
        model,
        cacheKey,
        cacheHit: true,
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
      });
      return {
        content: cached.response,
        cacheHit: true,
        latencyMs: 0,
        inputTokens: cached.input_tokens,
        outputTokens: cached.output_tokens,
        estimatedCost: 0, // no cost on cache hit
        cacheKey,
      };
    }
  }

  // Build API messages
  const apiMessages = messages || [{ role: 'user', content: prompt }];

  const client = getClient(apiKey);
  const maxTokens = params.max_tokens || DEFAULT_MAX_TOKENS;

  let lastError = null;
  const startTime = Date.now();

  // Retry loop
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: system || undefined,
        messages: apiMessages,
        temperature: params.temperature,
      });

      clearTimeout(timeout);

      const latencyMs = Date.now() - startTime;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const cost = estimateCost(inputTokens, outputTokens);
      const content = response.content[0].text;

      // Store in cache
      cache.set(cacheInput, {
        response: content,
        inputTokens,
        outputTokens,
        estimatedCost: cost,
        latencyMs,
        ttlSeconds,
      });

      // Log request
      cache.logRequest({
        model,
        cacheKey,
        cacheHit: false,
        latencyMs,
        inputTokens,
        outputTokens,
        estimatedCost: cost,
      });

      return {
        content,
        cacheHit: false,
        latencyMs,
        inputTokens,
        outputTokens,
        estimatedCost: cost,
        cacheKey,
      };
    } catch (err) {
      lastError = err;
      // Don't retry on auth errors or invalid requests
      if (err.status === 401 || err.status === 400) break;
      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('LLM call failed after retries');
}

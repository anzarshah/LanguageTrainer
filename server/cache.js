import crypto from 'crypto';
import db from './db.js';

/**
 * Generate a deterministic cache key from normalized request input.
 * Same effective request → same key, regardless of whitespace or key ordering.
 */
function makeCacheKey({ model, system, prompt, params }) {
  const normalized = JSON.stringify({
    model: model || '',
    system: (system || '').trim(),
    prompt: (prompt || '').trim(),
    params: params || {},
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

const stmtGet = db.prepare(`
  SELECT * FROM llm_cache WHERE cache_key = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
`);

const stmtSet = db.prepare(`
  INSERT OR REPLACE INTO llm_cache (cache_key, model, system_prompt, user_prompt, params, response, input_tokens, output_tokens, estimated_cost, latency_ms, expires_at, hit_count)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
`);

const stmtHit = db.prepare(`UPDATE llm_cache SET hit_count = hit_count + 1 WHERE cache_key = ?`);

const stmtLogRequest = db.prepare(`
  INSERT INTO llm_requests (cache_key, model, cache_hit, latency_ms, input_tokens, output_tokens, estimated_cost)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const stmtAllCached = db.prepare(`
  SELECT id, cache_key, model, system_prompt, user_prompt, response, input_tokens, output_tokens, estimated_cost, latency_ms, created_at, hit_count
  FROM llm_cache ORDER BY created_at DESC LIMIT 100
`);

const stmtStats = db.prepare(`
  SELECT
    COUNT(*) as total_requests,
    SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) as cache_hits,
    SUM(CASE WHEN cache_hit = 0 THEN 1 ELSE 0 END) as cache_misses,
    SUM(estimated_cost) as total_cost,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    AVG(latency_ms) as avg_latency_ms
  FROM llm_requests
`);

const stmtRecentRequests = db.prepare(`
  SELECT * FROM llm_requests ORDER BY created_at DESC LIMIT 50
`);

export const cache = {
  /**
   * Look up a cached response. Returns null on miss.
   */
  get(requestInput) {
    const key = makeCacheKey(requestInput);
    const row = stmtGet.get(key);
    if (row) {
      stmtHit.run(key);
      return { ...row, cacheHit: true };
    }
    return null;
  },

  /**
   * Store a response in the cache.
   */
  set(requestInput, { response, inputTokens, outputTokens, estimatedCost, latencyMs, ttlSeconds }) {
    const key = makeCacheKey(requestInput);
    const expiresAt = ttlSeconds
      ? new Date(Date.now() + ttlSeconds * 1000).toISOString()
      : null;

    stmtSet.run(
      key,
      requestInput.model || '',
      (requestInput.system || '').trim(),
      (requestInput.prompt || '').trim(),
      JSON.stringify(requestInput.params || {}),
      response,
      inputTokens || 0,
      outputTokens || 0,
      estimatedCost || 0,
      latencyMs || 0,
      expiresAt
    );
    return key;
  },

  /**
   * Log a request (hit or miss) for tracking.
   */
  logRequest({ model, cacheKey, cacheHit, latencyMs, inputTokens, outputTokens, estimatedCost }) {
    stmtLogRequest.run(
      cacheKey || '',
      model || '',
      cacheHit ? 1 : 0,
      latencyMs || 0,
      inputTokens || 0,
      outputTokens || 0,
      estimatedCost || 0
    );
  },

  /** Get all cached entries */
  getAllCached() {
    return stmtAllCached.all();
  },

  /** Get aggregate stats */
  getStats() {
    return stmtStats.get();
  },

  /** Get recent request history */
  getRecentRequests() {
    return stmtRecentRequests.all();
  },

  /** Generate cache key without querying */
  makeKey(requestInput) {
    return makeCacheKey(requestInput);
  },
};

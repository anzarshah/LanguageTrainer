import { supabase } from '../lib/supabase';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

// Get auth headers if Supabase is configured
async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
}

export async function validateKey(apiKey) {
  const res = await fetch(`${API_BASE}/validate-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return res.json();
}

// Encrypt and store API key server-side (requires auth)
export async function encryptAndStoreKey(apiKey) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/encrypt-key`, {
    method: 'POST', headers,
    body: JSON.stringify({ apiKey }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to encrypt key');
  }
  return res.json();
}

export async function generateContent(apiKey, language, contentType, forceRefresh = false) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/generate-content`, {
    method: 'POST', headers,
    body: JSON.stringify({ apiKey, language, contentType, forceRefresh }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate content');
  }
  return res.json();
}

export async function chat(apiKey, messages, system, forceRefresh = false) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST', headers,
    body: JSON.stringify({ apiKey, messages, system, forceRefresh }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Chat request failed');
  }
  return res.json();
}

export async function generateBatch(apiKey, language, contentTypes, forceRefresh = false) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/generate-batch`, {
    method: 'POST', headers,
    body: JSON.stringify({ apiKey, language, contentTypes, forceRefresh }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Batch generation failed');
  }
  return res.json();
}

export async function getCacheStats() {
  const res = await fetch(`${API_BASE}/cache/stats`);
  return res.json();
}

export async function getCacheEntries() {
  const res = await fetch(`${API_BASE}/cache/entries`);
  return res.json();
}

export async function getCacheRequests() {
  const res = await fetch(`${API_BASE}/cache/requests`);
  return res.json();
}

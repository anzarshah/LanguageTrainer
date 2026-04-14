import { supabaseAdmin } from './supabase.js';

/**
 * Express middleware: verifies Supabase JWT from Authorization header.
 * Sets req.userId on success, returns 401 on failure.
 * If Supabase is not configured, passes through (local-only mode).
 */
export async function requireAuth(req, res, next) {
  // If Supabase isn't configured, allow passthrough (local dev without auth)
  if (!supabaseAdmin) {
    req.userId = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = user.id;
    req.supabaseToken = token;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
}

/**
 * Optional auth — doesn't reject if no token, but sets req.userId if present.
 * Used for endpoints that work with or without auth (backwards compat).
 */
export async function optionalAuth(req, res, next) {
  if (!supabaseAdmin) {
    req.userId = null;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.userId = null;
    return next();
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    req.userId = user?.id || null;
    req.supabaseToken = token;
  } catch {
    req.userId = null;
  }
  next();
}

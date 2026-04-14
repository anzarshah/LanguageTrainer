import { useState } from 'react';
import { validateKey, encryptAndStoreKey } from '../utils/api';
import { getConfig, setConfig } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

export default function ApiKeyPrompt({ onKeySet, onCancel }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await validateKey(apiKey.trim());
      if (!result.valid) {
        setError('Invalid API key: ' + (result.error || 'Check your key.'));
        setLoading(false);
        return;
      }

      // Save to localStorage config
      const config = getConfig();
      setConfig({ ...config, apiKey: apiKey.trim() });

      // Encrypt and store server-side if logged in
      if (user) {
        try {
          await encryptAndStoreKey(apiKey.trim());
        } catch {
          // Server-side storage is best-effort
        }
      }

      onKeySet(apiKey.trim());
    } catch (err) {
      setError('Connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 440, margin: '0 auto', padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(26,61,43,0.08)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', fontSize: 24,
      }}>
        🔑
      </div>

      <h2 style={{
        fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700,
        color: 'var(--text)', marginBottom: 8,
      }}>
        API Key Required
      </h2>

      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
        This feature uses Claude AI and needs your Anthropic API key.
        You can also set this later in your Profile.
      </p>

      {error && (
        <div style={{
          background: 'rgba(179,58,42,0.08)', color: '#B33A2A',
          padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <label style={{
          display: 'block', fontSize: 13, fontWeight: 600,
          color: 'var(--text)', marginBottom: 6,
        }}>
          Anthropic API Key
        </label>
        <input
          type="password"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          style={{
            width: '100%', padding: '10px 14px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            background: 'var(--surface)', color: 'var(--text)',
            fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--text-hint)', marginTop: 6 }}>
          Get your key at{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
            style={{ color: 'var(--primary)' }}>
            console.anthropic.com
          </a>
          . Your key is sent only to Anthropic.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={loading || !apiKey.trim()}
          style={{ padding: '10px 24px', fontSize: 14 }}
        >
          {loading ? 'Validating...' : 'Save & Continue'}
        </button>
        <button
          className="btn btn-outline"
          onClick={onCancel}
          disabled={loading}
          style={{ padding: '10px 24px', fontSize: 14 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

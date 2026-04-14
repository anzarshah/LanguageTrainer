import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getConfig, setConfig } from '../utils/storage';
import { validateKey, encryptAndStoreKey } from '../utils/api';

const LANGUAGES = [
  { name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}' },
  { name: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
  { name: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}' },
  { name: 'Arabic', flag: '\u{1F1F8}\u{1F1E6}' },
  { name: 'Italian', flag: '\u{1F1EE}\u{1F1F9}' },
  { name: 'Mandarin Chinese', flag: '\u{1F1E8}\u{1F1F3}' },
  { name: 'Portuguese', flag: '\u{1F1E7}\u{1F1F7}' },
  { name: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
  { name: 'Hindi', flag: '\u{1F1EE}\u{1F1F3}' },
  { name: 'Korean', flag: '\u{1F1F0}\u{1F1F7}' },
  { name: 'Turkish', flag: '\u{1F1F9}\u{1F1F7}' },
  { name: 'Persian', flag: '\u{1F1EE}\u{1F1F7}' },
  { name: 'Swahili', flag: '\u{1F1F0}\u{1F1EA}' },
];

export default function Profile({ onSignOut }) {
  const { user, profile, isConfigured } = useAuth();
  const config = getConfig();

  const [editingKey, setEditingKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [keySuccess, setKeySuccess] = useState('');

  const langFlag = LANGUAGES.find(l => l.name === config.language)?.flag || '';
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const hasKey = !!config.apiKey;

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setKeyError('Please enter your API key.');
      return;
    }

    setKeyLoading(true);
    setKeyError('');
    setKeySuccess('');

    try {
      const result = await validateKey(apiKey.trim());
      if (!result.valid) {
        setKeyError('Invalid API key: ' + (result.error || 'Check your key.'));
        setKeyLoading(false);
        return;
      }

      setConfig({ ...config, apiKey: apiKey.trim() });

      if (user) {
        try {
          await encryptAndStoreKey(apiKey.trim());
        } catch {}
      }

      setKeySuccess('API key saved successfully.');
      setEditingKey(false);
      setApiKey('');
    } catch (err) {
      setKeyError('Connection error: ' + err.message);
    } finally {
      setKeyLoading(false);
    }
  };

  const handleRemoveKey = () => {
    setConfig({ ...config, apiKey: '' });
    setKeySuccess('API key removed.');
    setEditingKey(false);
    setApiKey('');
  };

  const sectionStyle = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '20px 24px', marginBottom: 16,
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-hint)', marginBottom: 4,
  };

  const valueStyle = {
    fontSize: 16, color: 'var(--text)', fontWeight: 500,
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <h1 style={{
        fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700,
        color: 'var(--text)', marginBottom: 24,
      }}>
        Profile
      </h1>

      {/* User Info */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-heading)',
          }}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={valueStyle}>{displayName}</div>
            {user?.email && (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <div style={labelStyle}>Learning</div>
          <div style={valueStyle}>
            {langFlag} {config.language || 'Not selected'}
          </div>
          {config.goals && config.goals.length > 0 && (
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {config.goals.map(g => (
                <span key={g} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(26,61,43,0.08)', color: 'var(--primary)',
                  fontWeight: 500,
                }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Key */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Anthropic API Key</div>

        {keySuccess && (
          <div style={{
            background: 'rgba(46,125,82,0.08)', color: '#2E7D52',
            padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12,
          }}>
            {keySuccess}
          </div>
        )}

        {keyError && (
          <div style={{
            background: 'rgba(179,58,42,0.08)', color: '#B33A2A',
            padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12,
          }}>
            {keyError}
          </div>
        )}

        {!editingKey ? (
          <div>
            <div style={{ ...valueStyle, marginBottom: 8 }}>
              {hasKey ? (
                <span style={{ fontFamily: 'monospace', fontSize: 14 }}>
                  sk-ant-...{config.apiKey.slice(-4)}
                </span>
              ) : (
                <span style={{ color: 'var(--text-hint)', fontStyle: 'italic' }}>
                  Not set — needed for AI conversation, journal feedback, and speaking practice
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-outline"
                onClick={() => { setEditingKey(true); setKeyError(''); setKeySuccess(''); }}
                style={{ fontSize: 13, padding: '6px 16px' }}
              >
                {hasKey ? 'Update Key' : 'Set API Key'}
              </button>
              {hasKey && (
                <button
                  className="btn btn-outline"
                  onClick={handleRemoveKey}
                  style={{ fontSize: 13, padding: '6px 16px', color: '#B33A2A', borderColor: '#B33A2A' }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              style={{
                width: '100%', padding: '10px 14px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                background: 'var(--bg)', color: 'var(--text)',
                fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
                boxSizing: 'border-box', marginBottom: 8,
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-hint)', marginBottom: 10 }}>
              Get your key at{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
                style={{ color: 'var(--primary)' }}>
                console.anthropic.com
              </a>
              . Your key is sent only to Anthropic.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={handleSaveKey}
                disabled={keyLoading || !apiKey.trim()}
                style={{ fontSize: 13, padding: '8px 20px' }}
              >
                {keyLoading ? 'Validating...' : 'Save'}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => { setEditingKey(false); setApiKey(''); setKeyError(''); }}
                disabled={keyLoading}
                style={{ fontSize: 13, padding: '8px 20px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sign Out */}
      {isConfigured && user && (
        <button
          className="btn btn-outline"
          onClick={onSignOut}
          style={{
            width: '100%', padding: '12px', fontSize: 14,
            color: '#B33A2A', borderColor: '#B33A2A',
          }}
        >
          Sign Out
        </button>
      )}
    </div>
  );
}

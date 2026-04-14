import { useState } from 'react';
import { validateKey } from '../utils/api';
import { setConfig } from '../utils/storage';
import { hasPrebuiltData, PREBUILT_LANGUAGES } from '../data/index';

const LANGUAGES = [
  { name: 'Spanish', flag: '\u{1F1EA}\u{1F1F8}', script: 'Espa\u00f1ol' },
  { name: 'French', flag: '\u{1F1EB}\u{1F1F7}', script: 'Fran\u00e7ais' },
  { name: 'Japanese', flag: '\u{1F1EF}\u{1F1F5}', script: '\u65E5\u672C\u8A9E' },
  { name: 'Arabic', flag: '\u{1F1F8}\u{1F1E6}', script: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { name: 'Italian', flag: '\u{1F1EE}\u{1F1F9}', script: 'Italiano' },
  { name: 'Mandarin Chinese', flag: '\u{1F1E8}\u{1F1F3}', script: '\u4E2D\u6587' },
  { name: 'Portuguese', flag: '\u{1F1E7}\u{1F1F7}', script: 'Portugu\u00eas' },
  { name: 'German', flag: '\u{1F1E9}\u{1F1EA}', script: 'Deutsch' },
  { name: 'Hindi', flag: '\u{1F1EE}\u{1F1F3}', script: '\u0939\u093F\u0928\u094D\u0926\u0940' },
  { name: 'Korean', flag: '\u{1F1F0}\u{1F1F7}', script: '\uD55C\uAD6D\uC5B4' },
  { name: 'Turkish', flag: '\u{1F1F9}\u{1F1F7}', script: 'T\u00fcrk\u00e7e' },
  { name: 'Persian', flag: '\u{1F1EE}\u{1F1F7}', script: '\u0641\u0627\u0631\u0633\u06CC' },
  { name: 'Swahili', flag: '\u{1F1F0}\u{1F1EA}', script: 'Kiswahili' },
];

const GOALS = ['travel', 'business', 'family roots', 'culture & film', 'relocating', 'just curious'];

export default function Onboarding({ onComplete }) {
  const [selected, setSelected] = useState('');
  const [customLang, setCustomLang] = useState('');
  const [goals, setGoals] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const toggleGoal = (g) => {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const targetLanguage = showCustom ? customLang : selected;
  const isPrebuilt = hasPrebuiltData(targetLanguage);
  const needsApiKey = !isPrebuilt || apiKey.trim().length > 0;

  const handleSubmit = async () => {
    if (!targetLanguage.trim()) {
      setError('Please select a language.');
      return;
    }

    // For non-prebuilt languages, API key is required
    if (!isPrebuilt && !apiKey.trim()) {
      setError('This language needs an API key to generate content. Enter your Anthropic API key.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validate API key only if one was provided
      if (apiKey.trim()) {
        const result = await validateKey(apiKey.trim());
        if (!result.valid) {
          setError('Invalid API key: ' + (result.error || 'Check your key.'));
          setLoading(false);
          return;
        }
      }

      const config = {
        apiKey: apiKey.trim(),
        language: targetLanguage.trim(),
        goals,
        setupComplete: true,
        setupDate: new Date().toISOString(),
      };
      setConfig(config);
      onComplete(config);
    } catch (err) {
      // If API validation fails but language is prebuilt, allow continuing without key
      if (isPrebuilt && !apiKey.trim()) {
        const config = {
          apiKey: '',
          language: targetLanguage.trim(),
          goals,
          setupComplete: true,
          setupDate: new Date().toISOString(),
        };
        setConfig(config);
        onComplete(config);
      } else {
        setError('Connection error: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = targetLanguage.trim() && (isPrebuilt || apiKey.trim());

  return (
    <div className="onboarding">
      <h1 className="onboarding-title">which language calls to you?</h1>
      <p className="onboarding-sub">Pick your target language and begin the 48-hour sprint</p>

      {error && <div className="error-msg" style={{ maxWidth: 440, width: '100%' }}>{error}</div>}

      {/* Language grid */}
      <div className="lang-grid">
        {LANGUAGES.map((lang) => {
          const prebuilt = hasPrebuiltData(lang.name);
          return (
            <div
              key={lang.name}
              className={`lang-card ${selected === lang.name ? 'selected' : ''}`}
              onClick={() => { setSelected(lang.name); setShowCustom(false); }}
            >
              <div className="flag">{lang.flag}</div>
              <div className="name">{lang.name}</div>
              <div className="script">{lang.script}</div>
              {prebuilt && (
                <div style={{
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: '#2E7D52',
                  marginTop: 4,
                }}>
                  ready to go
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Other language option */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        {!showCustom ? (
          <button
            className="pill"
            onClick={() => { setShowCustom(true); setSelected(''); }}
            style={{ fontSize: 13 }}
          >
            Other language...
          </button>
        ) : (
          <div style={{ maxWidth: 300, margin: '0 auto' }}>
            <input
              type="text"
              placeholder="Type your language (e.g., Vietnamese, Welsh...)"
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
            />
            <button
              className="pill"
              onClick={() => { setShowCustom(false); setCustomLang(''); }}
              style={{ marginTop: 8, fontSize: 12 }}
            >
              Back to grid
            </button>
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="goal-section">
        <div className="goal-label">what's your motivation?</div>
        <div className="goal-pills">
          {GOALS.map((g) => (
            <button
              key={g}
              className={`pill ${goals.includes(g) ? 'selected' : ''}`}
              onClick={() => toggleGoal(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* API Key */}
      <div className="api-section">
        <div className="input-group">
          <label>
            Anthropic API Key
            {isPrebuilt && (
              <span style={{ fontWeight: 400, color: 'var(--text-hint)', fontSize: 12, marginLeft: 8 }}>
                optional for {targetLanguage} — needed for speaking & journal
              </span>
            )}
          </label>
          <input
            type="password"
            placeholder={isPrebuilt ? 'sk-ant-... (optional for core content)' : 'sk-ant-... (required)'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="input-hint">
            {isPrebuilt ? (
              <>
                {targetLanguage} has pre-built content (300 words, sentences, roadmap). API key unlocks AI conversation, journal feedback, and speaking practice.
                {' '}
              </>
            ) : (
              <>Required to generate content. </>
            )}
            Get your key at{' '}
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
              console.anthropic.com
            </a>
            . Stays local — never sent to any server except Anthropic.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-full">
        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          style={{ padding: '14px 20px', fontSize: 16 }}
        >
          {loading ? 'Validating...' : 'begin the 48-hour sprint'}
        </button>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', maxWidth: 400 }}>
        Built on Comprehensible Input, Spaced Repetition, and Output Forcing.
        <br />
        Powered by Claude AI. {PREBUILT_LANGUAGES.length} languages with built-in content.
      </p>
    </div>
  );
}

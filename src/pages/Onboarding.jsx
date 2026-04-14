import { useState } from 'react';
import { setConfig } from '../utils/storage';
import { updateProfile } from '../utils/db';

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
  const [goals, setGoals] = useState([]);
  const [error, setError] = useState('');

  const toggleGoal = (g) => {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const handleSubmit = async () => {
    if (!selected.trim()) {
      setError('Please select a language.');
      return;
    }

    const config = {
      apiKey: '',
      language: selected.trim(),
      goals,
      setupComplete: true,
      setupDate: new Date().toISOString(),
    };
    setConfig(config);

    // Persist to Supabase so session survives logout/login
    try {
      await updateProfile({
        language: config.language,
        goals: config.goals,
        setupComplete: true,
        setupDate: config.setupDate,
      });
    } catch {
      // Supabase sync is best-effort; localStorage is primary
    }

    onComplete(config);
  };

  const canSubmit = selected.trim();

  return (
    <div className="onboarding">
      <h1 className="onboarding-title">which language calls to you?</h1>
      <p className="onboarding-sub">Pick your target language and begin the 48-hour sprint</p>

      {error && <div className="error-msg" style={{ maxWidth: 440, width: '100%' }}>{error}</div>}

      {/* Language grid */}
      <div className="lang-grid">
        {LANGUAGES.map((lang) => (
          <div
            key={lang.name}
            className={`lang-card ${selected === lang.name ? 'selected' : ''}`}
            onClick={() => setSelected(lang.name)}
          >
            <div className="flag">{lang.flag}</div>
            <div className="name">{lang.name}</div>
            <div className="script">{lang.script}</div>
          </div>
        ))}
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

      {/* CTA */}
      <div className="cta-full">
        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ padding: '14px 20px', fontSize: 16 }}
        >
          begin the 48-hour sprint
        </button>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', maxWidth: 400 }}>
        Built on Comprehensible Input, Spaced Repetition, and Output Forcing.
        <br />
        Powered by Claude AI. 13 languages with built-in content.
      </p>
    </div>
  );
}

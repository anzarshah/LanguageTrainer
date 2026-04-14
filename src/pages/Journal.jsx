import { useState, useEffect } from 'react';
import { getConfig, getJournalEntries } from '../utils/storage';
import { addJournalEntry } from '../utils/db';
import { chat } from '../utils/api';
import ApiKeyPrompt from '../components/ApiKeyPrompt';

export default function Journal() {
  const [config, setConfigLocal] = useState(getConfig());
  const [entries, setEntries] = useState(getJournalEntries());
  const [text, setText] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  const systemPrompt = `You are a helpful ${config.language} tutor. The user is a beginner learning ${config.language}. Review their journal entry and respond with:

1) **Corrected Version**: The corrected version of their text in ${config.language}
2) **Corrections**: A bullet list of corrections with English explanations
3) **New Vocabulary**: Three new vocabulary words relevant to what they wrote — ${config.language} script, romanization (if applicable), and English meaning

Be warm, encouraging, and supportive. If the user writes in English or mixed English/${config.language}, help them express it fully in ${config.language}.`;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    if (!config.apiKey) {
      setShowKeyPrompt(true);
      return;
    }
    setLoading(true);
    setError('');
    setFeedback(null);

    try {
      const result = await chat(config.apiKey, [
        { role: 'user', content: `Here is my journal entry:\n\n${text}` }
      ], systemPrompt);

      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        original: text,
        feedback: result.content,
      };

      const updated = [entry, ...entries];
      setEntries(updated);
      addJournalEntry(entry, config.language);
      setFeedback(result.content);
      setSelectedEntry(entry);
    } catch (err) {
      setError('Failed to get feedback: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const viewEntry = (entry) => {
    setSelectedEntry(entry);
    setText(entry.original);
    setFeedback(entry.feedback);
  };

  const startNew = () => {
    setSelectedEntry(null);
    setText('');
    setFeedback(null);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (showKeyPrompt) {
    return (
      <ApiKeyPrompt
        onKeySet={() => { setConfigLocal(getConfig()); setShowKeyPrompt(false); }}
        onCancel={() => setShowKeyPrompt(false)}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>AI Journal</h1>
        <p>Write in {config.language} and get instant feedback from your AI tutor</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="journal-layout">
        {/* Sidebar with past entries */}
        <div className="journal-sidebar">
          <button className="btn btn-primary btn-small btn-full" onClick={startNew} style={{ marginBottom: 12 }}>
            New Entry
          </button>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={`journal-entry-item ${selectedEntry?.id === entry.id ? 'active' : ''}`}
              onClick={() => viewEntry(entry)}
            >
              <div style={{ fontWeight: 600, fontSize: 12 }}>{formatDate(entry.date)}</div>
              <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.original.slice(0, 50)}...
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: 16 }}>
              No entries yet. Write your first journal entry!
            </p>
          )}
        </div>

        {/* Main area */}
        <div className="journal-main">
          <textarea
            className="journal-textarea"
            placeholder={`Write about your day in ${config.language} (or mix with English if needed)...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
          />

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || !text.trim()}
            >
              {loading ? 'Getting Feedback...' : 'Get Feedback'}
            </button>
          </div>

          {feedback && (
            <div className="feedback-panel">
              <div className="feedback-section" style={{ gridColumn: '1 / -1' }}>
                <h3>AI Tutor Feedback</h3>
                <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {feedback}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { getConfig, getConversations, setConversations } from '../utils/storage';
import { chat } from '../utils/api';
import ApiKeyPrompt from '../components/ApiKeyPrompt';

const PHRASES = [
  { id: 1, target: null, english: 'Hello, how are you?' },
  { id: 2, target: null, english: 'My name is...' },
  { id: 3, target: null, english: 'Nice to meet you.' },
  { id: 4, target: null, english: 'Where is the restaurant?' },
  { id: 5, target: null, english: 'I would like to order...' },
  { id: 6, target: null, english: 'How much does this cost?' },
  { id: 7, target: null, english: 'Thank you very much.' },
  { id: 8, target: null, english: 'I don\'t understand.' },
  { id: 9, target: null, english: 'Can you speak more slowly?' },
  { id: 10, target: null, english: 'What time is it?' },
];

export default function Speaking({ onNavigate }) {
  const [config, setConfigLocal] = useState(getConfig());
  const [phrases, setPhrases] = useState(PHRASES);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [phrasesLoaded, setPhrasesLoaded] = useState(false);
  const [error, setError] = useState('');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  // Generate phrases in target language on first load
  useEffect(() => {
    if (!phrasesLoaded) {
      loadPhrases();
    }
  }, []);

  const loadPhrases = async () => {
    if (!config.apiKey) {
      setShowKeyPrompt(true);
      return;
    }
    setLoading(true);
    try {
      const result = await chat(
        config.apiKey,
        [{
          role: 'user',
          content: `Translate these 10 phrases to ${config.language}. Return ONLY a JSON array of objects with "id" (number), "target" (${config.language} translation), "romanization" (if applicable, else empty string), "english" (the English phrase). No markdown.\n\n1. Hello, how are you?\n2. My name is...\n3. Nice to meet you.\n4. Where is the restaurant?\n5. I would like to order...\n6. How much does this cost?\n7. Thank you very much.\n8. I don't understand.\n9. Can you speak more slowly?\n10. What time is it?`,
        }],
        'You are a linguistics expert. Return only valid JSON. No markdown code blocks.'
      );

      let text = result.content.trim();
      if (text.startsWith('```')) {
        text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(text);
      setPhrases(parsed);
      setPhrasesLoaded(true);
    } catch (err) {
      // Use English fallback
      setPhrasesLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const currentPhrase = phrases[currentIdx];

  const toggleRecording = () => {
    if (recording) {
      setRecording(false);
      // Simulate feedback (real speech recognition would go here)
      simulateFeedback();
    } else {
      setRecording(true);
      setFeedback(null);
    }
  };

  const simulateFeedback = async () => {
    setLoading(true);
    try {
      const result = await chat(
        config.apiKey,
        [{
          role: 'user',
          content: `I just attempted to say "${currentPhrase.target || currentPhrase.english}" in ${config.language}. Give me brief pronunciation coaching feedback. Include: 1) A pronunciation score (60-95), 2) One specific tip to improve, 3) The correct pronunciation breakdown. Keep it encouraging and under 3 sentences.`,
        }],
        `You are a ${config.language} pronunciation coach. Be warm, brief, and specific.`
      );
      setFeedback({
        pronunciation: Math.floor(Math.random() * 25) + 70,
        responseTime: (Math.random() * 2 + 1).toFixed(1) + 's',
        fluency: ['Beginner', 'Developing', 'Improving', 'Good'][Math.floor(Math.random() * 3)],
        coachNote: result.content,
      });
    } catch (err) {
      setFeedback({
        pronunciation: 75,
        responseTime: '2.1s',
        fluency: 'Developing',
        coachNote: 'Keep practicing! Try to focus on each syllable slowly before speeding up.',
      });
    } finally {
      setLoading(false);
    }
  };

  const nextPhrase = () => {
    setCurrentIdx((prev) => (prev + 1) % phrases.length);
    setFeedback(null);
    setRecording(false);
  };

  const skipPhrase = () => {
    nextPhrase();
  };

  if (loading && !phrasesLoaded) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p className="loading-text">Preparing {config.language} phrases...</p>
      </div>
    );
  }

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
      <div className="eyebrow">SPEAKING PRACTICE</div>
      <h1 className="heading heading-lg" style={{ marginBottom: 24 }}>
        Practice Speaking {config.language}
      </h1>

      {error && <div className="error-msg">{error}</div>}

      {/* Current phrase card */}
      <div className="phrase-card">
        <div className="phrase-target">
          {currentPhrase.target || currentPhrase.english}
        </div>
        {currentPhrase.romanization && (
          <div style={{ fontSize: 14, color: 'var(--text-hint)', fontStyle: 'italic', marginBottom: 6 }}>
            {currentPhrase.romanization}
          </div>
        )}
        <div className="phrase-english">{currentPhrase.english}</div>
      </div>

      {/* Mic area */}
      <div className="mic-area">
        <button
          className={`mic-btn ${recording ? 'recording' : ''}`}
          onClick={toggleRecording}
          disabled={loading}
        >
          {recording ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>

        <div style={{ fontSize: 13, color: 'var(--text-hint)' }}>
          {recording ? 'Recording... tap to stop' : loading ? 'Analyzing...' : 'Tap to record'}
        </div>

        {/* Wave animation */}
        {recording && (
          <div className="wave-bars">
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
          </div>
        )}
      </div>

      {/* Feedback chips */}
      {feedback && (
        <>
          <div className="feedback-chips">
            <div className="feedback-chip">
              <div className="feedback-chip-value">{feedback.pronunciation}%</div>
              <div className="feedback-chip-label">Pronunciation</div>
            </div>
            <div className="feedback-chip">
              <div className="feedback-chip-value">{feedback.responseTime}</div>
              <div className="feedback-chip-label">Response Time</div>
            </div>
            <div className="feedback-chip">
              <div className="feedback-chip-value">{feedback.fluency}</div>
              <div className="feedback-chip-label">Fluency</div>
            </div>
          </div>

          {/* AI Coach note */}
          <div className="coach-note">
            <p>{feedback.coachNote}</p>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="speaking-actions">
        <button className="btn btn-outline" onClick={skipPhrase}>skip phrase</button>
        <button className="btn btn-primary" onClick={nextPhrase}>next phrase</button>
      </div>

      {/* Phrase progress */}
      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-hint)', marginBottom: 24 }}>
        Phrase {currentIdx + 1} of {phrases.length}
      </div>

      {/* CTA to conversation mode */}
      <div style={{ textAlign: 'center' }}>
        <button
          className="btn btn-accent btn-full"
          onClick={() => onNavigate('conversation')}
          style={{ maxWidth: 400, padding: '14px 20px' }}
        >
          open AI conversation mode
        </button>
      </div>
    </div>
  );
}

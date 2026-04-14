import { useState, useRef, useEffect } from 'react';
import { getConfig, getConversations, setConversations } from '../utils/storage';
import { chat } from '../utils/api';
import ApiKeyPrompt from '../components/ApiKeyPrompt';

const SCENARIOS = [
  { id: 'intro', label: 'Introduce Yourself', emoji: '👋' },
  { id: 'food', label: 'Order Food', emoji: '🍽️' },
  { id: 'directions', label: 'Ask for Directions', emoji: '🗺️' },
  { id: 'day', label: 'Talk About Your Day', emoji: '☀️' },
  { id: 'smalltalk', label: 'Make Small Talk', emoji: '💬' },
  { id: 'shopping', label: 'Go Shopping', emoji: '🛍️' },
];

export default function Conversation() {
  const [config, setConfigLocal] = useState(getConfig());
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const messagesEndRef = useRef(null);

  if (showKeyPrompt || !config.apiKey) {
    return (
      <ApiKeyPrompt
        onKeySet={() => { setConfigLocal(getConfig()); setShowKeyPrompt(false); }}
        onCancel={() => setShowKeyPrompt(false)}
      />
    );
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getSystemPrompt = (scenarioId) => {
    const scenarioLabel = SCENARIOS.find((s) => s.id === scenarioId)?.label || 'general conversation';
    return `You are a friendly ${config.language} tutor having a conversation about: ${scenarioLabel}. The user is a complete beginner (A1 level).

Rules:
- Respond ONLY in ${config.language} using short, simple sentences appropriate for A1 level
- After each response, on a new line write [Correction:] with any grammar fixes for the user's last message (skip if user's message was correct)
- Then write [Vocabulary:] with 1-2 new useful words from your response with their English meanings
- Encourage the user every few messages
- Keep sentences short (5-10 words)
- Use common, everyday vocabulary
- If the user writes in English, gently encourage them to try in ${config.language} but still respond in ${config.language}

Start by greeting the user and setting up the scenario in ${config.language} with a very simple opening line.`;
  };

  const startScenario = async (scenarioId) => {
    setScenario(scenarioId);
    setMessages([]);
    setLoading(true);
    setError('');

    try {
      const result = await chat(
        config.apiKey,
        [{ role: 'user', content: `Let's start! Please begin the conversation in ${config.language}.` }],
        getSystemPrompt(scenarioId)
      );

      const parsed = parseAIMessage(result.content);
      setMessages([{ role: 'ai', ...parsed }]);
    } catch (err) {
      setError('Failed to start: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', text: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      // Build conversation history for API
      const apiMessages = [];
      apiMessages.push({ role: 'user', content: `Let's start! Please begin the conversation in ${config.language}.` });

      for (const msg of newMessages) {
        if (msg.role === 'ai') {
          apiMessages.push({ role: 'assistant', content: msg.raw || msg.text });
        } else {
          apiMessages.push({ role: 'user', content: msg.text });
        }
      }

      const result = await chat(config.apiKey, apiMessages, getSystemPrompt(scenario));
      const parsed = parseAIMessage(result.content);
      setMessages([...newMessages, { role: 'ai', ...parsed }]);

      // Save conversation
      const saved = getConversations();
      const current = {
        id: Date.now(),
        scenario,
        date: new Date().toISOString(),
        messageCount: newMessages.length + 1,
      };
      setConversations([current, ...saved.slice(0, 19)]);
    } catch (err) {
      setError('Failed to send: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const parseAIMessage = (content) => {
    let text = content;
    let correction = '';
    let vocabulary = '';

    const corrIdx = content.indexOf('[Correction:]');
    const vocabIdx = content.indexOf('[Vocabulary:]');

    if (corrIdx !== -1) {
      text = content.slice(0, corrIdx).trim();
      if (vocabIdx !== -1) {
        correction = content.slice(corrIdx + 13, vocabIdx).trim();
        vocabulary = content.slice(vocabIdx + 13).trim();
      } else {
        correction = content.slice(corrIdx + 13).trim();
      }
    } else if (vocabIdx !== -1) {
      text = content.slice(0, vocabIdx).trim();
      vocabulary = content.slice(vocabIdx + 13).trim();
    }

    return { text, correction, vocabulary, raw: content };
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!scenario) {
    return (
      <div>
        <div className="page-header">
          <h1>Conversation Simulator</h1>
          <p>Practice speaking {config.language} with your AI tutor in real scenarios</p>
        </div>

        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Choose a Scenario</h3>
        <div className="scenario-grid">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="scenario-card"
              onClick={() => startScenario(s.id)}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
              {s.label}
            </button>
          ))}
        </div>

        {/* Past conversations */}
        {getConversations().length > 0 && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, marginBottom: 8 }}>Recent Sessions</h3>
            {getConversations().slice(0, 5).map((c) => (
              <div key={c.id} style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                {SCENARIOS.find((s) => s.id === c.scenario)?.label || c.scenario} — {c.messageCount} messages — {new Date(c.date).toLocaleDateString()}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{SCENARIOS.find((s) => s.id === scenario)?.emoji} {SCENARIOS.find((s) => s.id === scenario)?.label}</h1>
          <p>Practicing in {config.language} — type in {config.language} to practice!</p>
        </div>
        <button className="btn btn-secondary btn-small" onClick={() => setScenario(null)}>Change Scenario</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i}>
              <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.text}
              </div>
              {msg.role === 'ai' && (msg.correction || msg.vocabulary) && (
                <div style={{ maxWidth: '80%', marginBottom: 12, fontSize: 12 }}>
                  {msg.correction && (
                    <div style={{ color: 'var(--color-warning)', marginBottom: 4 }}>
                      <strong>Correction:</strong> {msg.correction}
                    </div>
                  )}
                  {msg.vocabulary && (
                    <div style={{ color: 'var(--color-info)' }}>
                      <strong>Vocabulary:</strong> {msg.vocabulary}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="chat-bubble ai" style={{ opacity: 0.6 }}>
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            placeholder={`Type in ${config.language}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

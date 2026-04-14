import { useState, useEffect } from 'react';
import { getConfig, getScriptInfo, setScriptInfo, getScriptProgress } from '../utils/storage';
import { upsertScriptProgress } from '../utils/db';
import { generateContent } from '../utils/api';

export default function ScriptTrainer() {
  const config = getConfig();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('learn'); // learn | quiz
  const [mastered, setMastered] = useState(getScriptProgress());

  // Quiz state
  const [quizChar, setQuizChar] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizResult, setQuizResult] = useState(null); // null | 'correct' | 'incorrect'
  const [quizStats, setQuizStats] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    const saved = getScriptInfo();
    if (saved) setInfo(saved);
  }, []);

  const loadScript = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateContent(config.apiKey, config.language, 'scriptInfo');
      setInfo(result.data);
      setScriptInfo(result.data);
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMastered = (char) => {
    const newVal = !mastered[char];
    setMastered({ ...mastered, [char]: newVal });
    upsertScriptProgress(char, newVal);
  };

  const startQuiz = () => {
    if (!info?.characters?.length) return;
    setMode('quiz');
    setQuizStats({ correct: 0, total: 0 });
    nextQuizChar(info.characters);
  };

  const nextQuizChar = (chars) => {
    const idx = Math.floor(Math.random() * chars.length);
    setQuizChar(chars[idx]);
    setQuizAnswer('');
    setQuizResult(null);
  };

  const checkAnswer = () => {
    if (!quizChar || !quizAnswer.trim()) return;
    const correct = quizAnswer.trim().toLowerCase() === quizChar.romanization?.toLowerCase();
    setQuizResult(correct ? 'correct' : 'incorrect');
    setQuizStats((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      total: prev.total + 1,
    }));
    if (correct) {
      setMastered({ ...mastered, [quizChar.char]: true });
      upsertScriptProgress(quizChar.char, true);
    }
  };

  const handleQuizKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (quizResult) {
        nextQuizChar(info.characters);
      } else {
        checkAnswer();
      }
    }
  };

  const masteredCount = Object.values(mastered).filter(Boolean).length;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p className="loading-text">Analyzing {config.language} writing system...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Script & Pronunciation Trainer</h1>
        <p>
          {info
            ? `${info.scriptName} — ${info.characters?.length || 0} characters`
            : `Learn the ${config.language} writing system and pronunciation`}
        </p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {!info ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ marginBottom: 16, color: 'var(--color-text-secondary)' }}>
            Generate the writing system guide for {config.language}
          </p>
          <button className="btn btn-primary" onClick={loadScript}>Generate Script Guide</button>
        </div>
      ) : (
        <>
          {/* Stats and mode toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              <strong>{masteredCount}</strong> / {info.characters?.length || 0} mastered
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className={`btn btn-small ${mode === 'learn' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('learn')}
              >
                Learn
              </button>
              <button
                className={`btn btn-small ${mode === 'quiz' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={startQuiz}
              >
                Quiz
              </button>
            </div>
          </div>

          <div className="progress-bar" style={{ marginBottom: 20 }}>
            <div
              className="progress-fill"
              style={{
                width: `${((masteredCount) / (info.characters?.length || 1)) * 100}%`,
                background: 'var(--color-success)',
              }}
            />
          </div>

          {mode === 'learn' ? (
            <>
              {/* Pronunciation tips */}
              {info.pronunciationTips && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Pronunciation Tips</h3>
                  <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {info.pronunciationTips.map((tip, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {info.notes && (
                <div className="card" style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{info.notes}</p>
                </div>
              )}

              {/* Character grid */}
              <div className="char-grid">
                {info.characters?.map((ch, i) => (
                  <div
                    key={i}
                    className={`char-card ${mastered[ch.char] ? 'mastered' : ''}`}
                    onClick={() => toggleMastered(ch.char)}
                    title={`${ch.exampleWord} — ${ch.exampleMeaning}`}
                  >
                    <div className="char">{ch.char}</div>
                    <div className="romanization">{ch.romanization}</div>
                    {ch.ipa && <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>/{ch.ipa}/</div>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Quiz mode */
            <div className="quiz-container">
              {quizChar && (
                <>
                  <div className="quiz-char">{quizChar.char}</div>
                  <input
                    className={`quiz-input ${quizResult || ''}`}
                    type="text"
                    placeholder="Type the romanization..."
                    value={quizAnswer}
                    onChange={(e) => setQuizAnswer(e.target.value)}
                    onKeyDown={handleQuizKeyDown}
                    autoFocus
                  />
                  {quizResult === 'incorrect' && (
                    <p style={{ color: 'var(--color-danger)', marginTop: 8, fontSize: 14 }}>
                      Correct answer: <strong>{quizChar.romanization}</strong>
                    </p>
                  )}
                  <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                    {!quizResult ? (
                      <button className="btn btn-primary btn-small" onClick={checkAnswer}>Check</button>
                    ) : (
                      <button className="btn btn-primary btn-small" onClick={() => nextQuizChar(info.characters)}>
                        Next
                      </button>
                    )}
                  </div>
                  <div className="quiz-stats">
                    <span>Correct: {quizStats.correct}</span>
                    <span>Total: {quizStats.total}</span>
                    <span>Accuracy: {quizStats.total > 0 ? Math.round((quizStats.correct / quizStats.total) * 100) : 0}%</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Language info badges */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
            {info.isRTL && <span className="tag tag-write">RTL Script</span>}
            {info.hasTones && <span className="tag tag-speak">Tonal Language</span>}
            {info.hasGender && <span className="tag tag-vocab">Grammatical Gender</span>}
            {info.hasHonorifics && <span className="tag tag-listen">Honorific System</span>}
          </div>
        </>
      )}
    </div>
  );
}

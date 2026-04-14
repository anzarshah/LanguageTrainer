import { useState, useEffect, useCallback } from 'react';
import { getConfig, getWordList, setWordList, getSentenceStructures, setSentenceStructures, getFlashcardProgress, getLearnedWords, getProgressData, getJournalEntries, getConversations } from '../utils/storage';
import { upsertFlashcardProgress } from '../utils/db';
import { generateContent } from '../utils/api';

export default function Dashboard({ onNavigate }) {
  const config = getConfig();
  const progressData = getProgressData();
  const learnedWords = getLearnedWords();
  const flashcardProgress = getFlashcardProgress();
  const journalEntries = getJournalEntries();
  const conversations = getConversations();

  const [words, setWords] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [deck, setDeck] = useState('words');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState(flashcardProgress);
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedWords = getWordList();
    const savedSentences = getSentenceStructures();
    if (savedWords.length > 0) setWords(savedWords);
    if (savedSentences.length > 0) setSentences(savedSentences);
  }, []);

  const loadWords = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateContent(config.apiKey, config.language, 'wordList');
      setWords(result.data);
      setWordList(result.data);
    } catch (err) {
      setError('Failed to load words: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSentences = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateContent(config.apiKey, config.language, 'sentenceStructures');
      setSentences(result.data);
      setSentenceStructures(result.data);
    } catch (err) {
      setError('Failed to load sentences: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentDeck = deck === 'words' ? words : sentences;

  const getSortedDeck = useCallback(() => {
    const now = Date.now();
    return [...currentDeck].sort((a, b) => {
      const keyA = deck === 'words' ? `w_${a.rank}` : `s_${a.id}`;
      const keyB = deck === 'words' ? `w_${b.rank}` : `s_${b.id}`;
      const progA = progress[keyA] || { ease: 0, nextReview: 0 };
      const progB = progress[keyB] || { ease: 0, nextReview: 0 };
      if (progA.nextReview <= now && progB.nextReview > now) return -1;
      if (progB.nextReview <= now && progA.nextReview > now) return 1;
      return (progA.ease || 0) - (progB.ease || 0);
    });
  }, [currentDeck, deck, progress]);

  const sortedDeck = getSortedDeck();
  const currentCard = sortedDeck[currentIndex];

  const handleRate = (rating) => {
    if (!currentCard) return;
    const key = deck === 'words' ? `w_${currentCard.rank}` : `s_${currentCard.id}`;
    const now = Date.now();
    const delays = { again: 30000, hard: 120000, easy: 600000 };
    const newProgress = {
      ...progress,
      [key]: {
        ease: rating === 'easy' ? (progress[key]?.ease || 0) + 1 : rating === 'again' ? 0 : (progress[key]?.ease || 0),
        nextReview: now + delays[rating] * Math.max(1, (progress[key]?.ease || 0)),
        lastReviewed: now,
      },
    };
    setProgress(newProgress);
    upsertFlashcardProgress(key, newProgress[key]);
    setSessionReviewed((prev) => prev + 1);
    setFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % Math.max(sortedDeck.length, 1));
  };

  // Stats — based on real data only
  const masteredCards = Object.values(flashcardProgress).filter((p) => p.ease >= 3).length;
  const totalCards = Object.keys(flashcardProgress).length;
  const totalWords = learnedWords.length;
  const accuracy = totalCards > 0 ? Math.round((masteredCards / totalCards) * 100) : 0;

  // Progress bars — based on real activity counts, not self-assessment
  const wordProgress = Math.min(Math.round((totalWords / 300) * 100), 100);

  // Count mastered sentence cards (keys starting with s_)
  const masteredSentences = Object.entries(flashcardProgress)
    .filter(([k, v]) => k.startsWith('s_') && v.ease >= 2).length;
  const sentenceProgress = sentences.length > 0 ? Math.min(Math.round((masteredSentences / 20) * 100), 100) : 0;

  // Speaking = based on actual conversation sessions
  const speakingTarget = 10; // 10 conversations = 100%
  const speakingProgress = Math.min(Math.round((conversations.length / speakingTarget) * 100), 100);

  // Journal = based on actual journal entries
  const journalTarget = 10; // 10 entries = 100%
  const journalProgress = Math.min(Math.round((journalEntries.length / journalTarget) * 100), 100);

  return (
    <div>
      {/* Methodology explanation */}
      <div className="card card-lg" style={{ marginBottom: 24, borderLeft: '3px solid var(--primary)' }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>THE 48-HOUR METHOD</div>
        <h2 className="heading heading-sm" style={{ marginBottom: 12 }}>
          How you'll have a conversation in {config.language} in 48 hours
        </h2>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 10 }}>
            This method is built on three scientifically-proven principles of language acquisition:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: '10px 14px', background: 'var(--green-tint-bg)', borderRadius: 'var(--radius)' }}>
              <strong style={{ color: 'var(--primary)', fontSize: 13 }}>1. Comprehensible Input</strong>
              <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
                Learn content just above your level — not rules, but real words and patterns you'll actually use.
              </p>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--accent-light)', borderRadius: 'var(--radius)' }}>
              <strong style={{ color: 'var(--primary)', fontSize: 13 }}>2. Spaced Repetition</strong>
              <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
                Review at increasing intervals. What you see again, you remember. What you don't, you forget.
              </p>
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 'var(--radius)' }}>
              <strong style={{ color: 'var(--primary)', fontSize: 13 }}>3. Output Forcing</strong>
              <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>
                Speaking and writing forces your brain to notice gaps. Passive input alone isn't enough.
              </p>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-hint)' }}>
            <strong>Day 1:</strong> Learn the top 200 words + 20 sentence structures (covers ~85% of everyday conversation). Practice with flashcards. Write your first journal entry.
            <br />
            <strong>Day 2:</strong> Review everything via spaced repetition. Add 100 more words. Have your first AI conversation. You're now conversational.
            <br />
            <strong>Week 1+:</strong> Keep building — expand to 500 words, practice daily, write and speak regularly.
          </p>
        </div>
      </div>

      {/* Section header */}
      <div className="eyebrow">YOUR DAILY PRACTICE</div>
      <h1 className="heading heading-lg" style={{ marginBottom: 24 }}>
        {config.language} Dashboard
      </h1>

      {error && <div className="error-msg">{error}</div>}

      {/* Streak banner */}
      <div className="streak-banner">
        <span className="flame">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
        </span>
        <span className="streak-text">{progressData.streak}-day streak</span>
        <span className="streak-sub">keep the fire lit</span>
      </div>

      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{totalWords}</div>
          <div className="metric-label">Words Learned</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{accuracy}%</div>
          <div className="metric-label">Accuracy</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{progressData.sessions?.length || 0}</div>
          <div className="metric-label">Sessions</div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="progress-section">
        {[
          { label: 'Top 300 Words', pct: wordProgress, color: 'green' },
          { label: '20 Sentence Constructs', pct: sentenceProgress, color: 'copper' },
          { label: `Speaking Sessions (${conversations.length}/${speakingTarget})`, pct: speakingProgress, color: 'green' },
          { label: `Journal Entries (${journalEntries.length}/${journalTarget})`, pct: journalProgress, color: 'copper' },
        ].map((item) => (
          <div key={item.label} className="progress-item">
            <div className="progress-item-header">
              <span className="progress-item-label">{item.label}</span>
              <span className="progress-item-pct">{item.pct}%</span>
            </div>
            <div className="progress-bar">
              <div className={`progress-fill ${item.color}`} style={{ width: `${item.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Flashcard Section */}
      <div className="flashcard-section">
        <div className="eyebrow" style={{ marginBottom: 12 }}>FLASHCARDS</div>

        <div className="deck-selector">
          <button className={`deck-tab ${deck === 'words' ? 'active' : ''}`} onClick={() => { setDeck('words'); setCurrentIndex(0); setFlipped(false); }}>
            Top 300 Words
          </button>
          <button className={`deck-tab ${deck === 'sentences' ? 'active' : ''}`} onClick={() => { setDeck('sentences'); setCurrentIndex(0); setFlipped(false); }}>
            20 Sentence Structures
          </button>
        </div>

        {currentDeck.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ marginBottom: 14, color: 'var(--text-muted)', fontSize: 14 }}>
              Generate {deck === 'words' ? 'the top 300 most frequent words' : '20 essential sentence structures'} for {config.language}
            </p>
            <button className="btn btn-primary" onClick={deck === 'words' ? loadWords : loadSentences} disabled={loading}>
              {loading ? 'Generating...' : `Generate ${deck === 'words' ? 'Words' : 'Sentences'}`}
            </button>
          </div>
        ) : (
          <>
            {/* Dot indicator */}
            <div className="flashcard-dots">
              {sortedDeck.slice(0, 20).map((_, i) => (
                <div key={i} className={`flashcard-dot ${i === currentIndex % 20 ? 'active' : i < currentIndex % 20 ? 'done' : ''}`} />
              ))}
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-hint)', textAlign: 'center', marginBottom: 8 }}>
              {currentIndex + 1} / {sortedDeck.length} · Reviewed: {sessionReviewed}
            </div>

            {currentCard && (
              <>
                <div className="flashcard-container">
                  <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
                    <div className="flashcard-face flashcard-front">
                      {deck === 'words' ? (
                        <>
                          <div className="flashcard-word">{currentCard.word}</div>
                          {currentCard.romanization && <div className="flashcard-phonetic">{currentCard.romanization}</div>}
                        </>
                      ) : (
                        <>
                          <div className="flashcard-word" style={{ fontSize: 22 }}>{currentCard.pattern}</div>
                          {currentCard.romanization && <div className="flashcard-phonetic">{currentCard.romanization}</div>}
                        </>
                      )}
                      <div className="flashcard-hint">tap to flip</div>
                    </div>
                    <div className="flashcard-face flashcard-back">
                      {deck === 'words' ? (
                        <>
                          <div className="flashcard-english">{currentCard.english}</div>
                          <div className="flashcard-pos">{currentCard.partOfSpeech}</div>
                        </>
                      ) : (
                        <>
                          <div className="flashcard-english" style={{ fontSize: 20 }}>{currentCard.english}</div>
                          {currentCard.exampleEnglish && <div style={{ fontSize: 13, color: 'var(--text-hint)', marginTop: 8 }}>{currentCard.exampleEnglish}</div>}
                          {currentCard.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, fontStyle: 'italic' }}>{currentCard.notes}</div>}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flashcard-controls">
                  <button className="btn btn-small btn-prev" onClick={() => { setCurrentIndex(Math.max(0, currentIndex - 1)); setFlipped(false); }}>Prev</button>
                  <button className="btn btn-small btn-didnt-know" onClick={() => handleRate('again')}>Didn't know</button>
                  <button className="btn btn-small btn-got-it" onClick={() => handleRate('easy')}>Got it</button>
                  <button className="btn btn-small btn-next" onClick={() => { setCurrentIndex((currentIndex + 1) % sortedDeck.length); setFlipped(false); }}>Next</button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* CTA to speaking */}
      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <button
          className="btn btn-accent btn-full"
          onClick={() => onNavigate('speaking')}
          style={{ maxWidth: 400, padding: '14px 20px' }}
        >
          go to speaking practice →
        </button>
      </div>
    </div>
  );
}

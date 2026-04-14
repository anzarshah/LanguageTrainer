import { useState, useEffect, useCallback } from 'react';
import { getConfig, getWordList, setWordList, getSentenceStructures, setSentenceStructures, getFlashcardProgress } from '../utils/storage';
import { upsertFlashcardProgress } from '../utils/db';
import { generateContent } from '../utils/api';

export default function Flashcards() {
  const config = getConfig();
  const [deck, setDeck] = useState('words');
  const [words, setWords] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState(getFlashcardProgress());
  const [sessionReviewed, setSessionReviewed] = useState(0);

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
      // Prioritize due cards, then unseen
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
    setCurrentIndex((prev) => (prev + 1) % sortedDeck.length);
  };

  const masteredCount = Object.values(progress).filter((p) => p.ease >= 3).length;
  const totalCards = words.length + sentences.length;
  const masteryPercent = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p className="loading-text">Generating {deck === 'words' ? 'top 300 words' : '20 sentence structures'} for {config.language}...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Flashcards</h1>
        <p>Master {config.language} vocabulary and sentence patterns with spaced repetition</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="deck-selector">
        <button className={`deck-tab ${deck === 'words' ? 'active' : ''}`} onClick={() => { setDeck('words'); setCurrentIndex(0); setFlipped(false); }}>
          Top 300 Words {words.length > 0 && `(${words.length})`}
        </button>
        <button className={`deck-tab ${deck === 'sentences' ? 'active' : ''}`} onClick={() => { setDeck('sentences'); setCurrentIndex(0); setFlipped(false); }}>
          20 Sentence Structures {sentences.length > 0 && `(${sentences.length})`}
        </button>
      </div>

      {currentDeck.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ marginBottom: 16, color: 'var(--color-text-secondary)' }}>
            {deck === 'words'
              ? `Generate the top 300 most frequently used ${config.language} words`
              : `Generate the 20 most essential ${config.language} sentence structures`}
          </p>
          <button className="btn btn-primary" onClick={deck === 'words' ? loadWords : loadSentences}>
            Generate {deck === 'words' ? 'Word List' : 'Sentence Structures'}
          </button>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <span>Reviewed today: <strong>{sessionReviewed}</strong></span>
            <span>Mastery: <strong>{masteryPercent}%</strong></span>
            <span>Cards: <strong>{sortedDeck.length}</strong></span>
          </div>

          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((currentIndex + 1) / sortedDeck.length) * 100}%` }} />
          </div>

          {currentCard && (
            <>
              <div className="flashcard-container">
                <div className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
                  <div className="flashcard-face">
                    {deck === 'words' ? (
                      <>
                        <div className="flashcard-word">{currentCard.word}</div>
                        {currentCard.romanization && (
                          <div className="flashcard-romanization">{currentCard.romanization}</div>
                        )}
                        <div className="flashcard-pos">{currentCard.partOfSpeech}</div>
                      </>
                    ) : (
                      <>
                        <div className="flashcard-word" style={{ fontSize: 24 }}>{currentCard.pattern}</div>
                        {currentCard.romanization && (
                          <div className="flashcard-romanization">{currentCard.romanization}</div>
                        )}
                        <div style={{ fontSize: 13, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                          {currentCard.example}
                        </div>
                      </>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 12 }}>Click to flip</p>
                  </div>
                  <div className="flashcard-face flashcard-back">
                    {deck === 'words' ? (
                      <>
                        <div className="flashcard-english">{currentCard.english}</div>
                        <div className="flashcard-pos">{currentCard.partOfSpeech}</div>
                      </>
                    ) : (
                      <>
                        <div className="flashcard-english">{currentCard.english}</div>
                        {currentCard.exampleEnglish && (
                          <div style={{ fontSize: 14, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                            {currentCard.exampleEnglish}
                          </div>
                        )}
                        {currentCard.notes && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 12, fontStyle: 'italic' }}>
                            {currentCard.notes}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flashcard-buttons">
                <button className="btn btn-small btn-again" onClick={() => handleRate('again')}>Again</button>
                <button className="btn btn-small btn-hard" onClick={() => handleRate('hard')}>Hard</button>
                <button className="btn btn-small btn-easy" onClick={() => handleRate('easy')}>Easy</button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

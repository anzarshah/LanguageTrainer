import { useState, useEffect } from 'react';
import { getConfig, getWordList, setWordList, getLearnedWords, setLearnedWords } from '../utils/storage';
import { generateContent } from '../utils/api';

const CATEGORIES = ['All', 'Pronoun', 'Verb', 'Noun', 'Adjective', 'Conjunction', 'Number', 'Question', 'Adverb', 'Preposition', 'Other'];

export default function WordListPage() {
  const config = getConfig();
  const [words, setWords] = useState([]);
  const [learned, setLearned] = useState(getLearnedWords());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const saved = getWordList();
    if (saved.length > 0) setWords(saved);
  }, []);

  const loadWords = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generateContent(config.apiKey, config.language, 'wordList');
      setWords(result.data);
      setWordList(result.data);
    } catch (err) {
      setError('Failed to load: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLearned = (rank) => {
    const updated = learned.includes(rank) ? learned.filter((r) => r !== rank) : [...learned, rank];
    setLearned(updated);
    setLearnedWords(updated);
  };

  const filtered = words.filter((w) => {
    const matchSearch = !search ||
      w.word?.toLowerCase().includes(search.toLowerCase()) ||
      w.english?.toLowerCase().includes(search.toLowerCase()) ||
      w.romanization?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'All' || w.partOfSpeech === category;
    return matchSearch && matchCategory;
  });

  const PAGE_SIZE = 50;
  const pageWords = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportUnlearned = () => {
    const unlearned = words
      .filter((w) => !learned.includes(w.rank))
      .map((w) => `${w.word}\t${w.romanization || ''}\t${w.english}`)
      .join('\n');
    navigator.clipboard.writeText(unlearned);
    alert('Copied unlearned words to clipboard (tab-separated for Anki import)');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p className="loading-text">Generating top 300 {config.language} words...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Word List</h1>
        <p>Top 300 most frequently used {config.language} words</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {words.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ marginBottom: 16, color: 'var(--color-text-secondary)' }}>
            Generate the frequency-based word list for {config.language}
          </p>
          <button className="btn btn-primary" onClick={loadWords}>Generate Word List</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              <strong>{learned.length}</strong> / {words.length} learned
            </span>
            <button className="btn btn-secondary btn-small" onClick={exportUnlearned}>
              Export Unlearned
            </button>
          </div>

          <div className="progress-bar" style={{ marginBottom: 16 }}>
            <div className="progress-fill" style={{ width: `${(learned.length / words.length) * 100}%`, background: 'var(--color-success)' }} />
          </div>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search words..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`filter-chip ${category === cat ? 'active' : ''}`}
                onClick={() => { setCategory(cat); setPage(0); }}
              >
                {cat}
              </button>
            ))}
          </div>

          <table className="word-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{config.language}</th>
                <th>Romanization</th>
                <th>Type</th>
                <th>English</th>
                <th>Learned</th>
              </tr>
            </thead>
            <tbody>
              {pageWords.map((w) => (
                <tr key={w.rank} className={learned.includes(w.rank) ? 'learned' : ''}>
                  <td>{w.rank}</td>
                  <td style={{ fontWeight: 600, fontSize: 15 }}>{w.word}</td>
                  <td style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>{w.romanization || '—'}</td>
                  <td><span className={`tag tag-vocab`}>{w.partOfSpeech}</span></td>
                  <td>{w.english}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={learned.includes(w.rank)}
                      onChange={() => toggleLearned(w.rank)}
                      style={{ width: 16, height: 16, accentColor: 'var(--color-success)' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  className={`btn btn-small ${page === i ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPage(i)}
                >
                  {i * PAGE_SIZE + 1}–{Math.min((i + 1) * PAGE_SIZE, filtered.length)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

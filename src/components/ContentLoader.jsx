import { useState, useEffect } from 'react';
import { getPrebuiltData } from '../data/index';
import {
  getConfig, setWordList, setSentenceStructures, setScriptInfo, setRoadmap,
  setContentReady, getWordList, getSentenceStructures, getScriptInfo, getRoadmap
} from '../utils/storage';
import { setUserContent } from '../utils/db';

const DISPLAY_STEPS = [
  { label: 'Top 300 frequency words' },
  { label: 'Sentence structures' },
  { label: 'Writing system & pronunciation' },
  { label: 'Learning roadmap' },
];

export default function ContentLoader({ onComplete }) {
  const config = getConfig();
  const [error, setError] = useState('');
  const [stepStatuses, setStepStatuses] = useState(['pending', 'pending', 'pending', 'pending']);
  const [done, setDone] = useState(false);

  useEffect(() => { run(); }, []);

  const alreadyLoaded = () => {
    return getWordList().length > 0 &&
      getSentenceStructures().length > 0 &&
      getScriptInfo() !== null &&
      getRoadmap() !== null;
  };

  const run = async () => {
    // Already loaded from a previous session
    if (alreadyLoaded()) {
      setStepStatuses(['cached', 'cached', 'cached', 'cached']);
      setContentReady(true);
      setTimeout(() => onComplete(), 200);
      return;
    }

    // Load pre-built data
    const data = getPrebuiltData(config.language);

    if (!data) {
      setError(`No pre-built data found for ${config.language}. Please restart and select a supported language.`);
      return;
    }

    // Animate loading steps
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 150));
      setStepStatuses(prev => {
        const next = [...prev];
        next[i] = 'done';
        return next;
      });
    }

    // Save to localStorage
    setWordList(data.wordList);
    setSentenceStructures(data.sentenceStructures);
    setScriptInfo(data.scriptInfo);
    setRoadmap(data.roadmap);
    setContentReady(true);

    // Also persist to Supabase for cross-device sync
    try {
      await Promise.all([
        setUserContent('wordList', config.language, data.wordList),
        setUserContent('sentenceStructures', config.language, data.sentenceStructures),
        setUserContent('scriptInfo', config.language, data.scriptInfo),
        setUserContent('roadmap', config.language, data.roadmap),
      ]);
    } catch {
      // Supabase sync is best-effort; localStorage is the primary store
    }

    setDone(true);
    setTimeout(() => onComplete(), 400);
  };

  const retry = () => {
    setError('');
    setStepStatuses(['pending', 'pending', 'pending', 'pending']);
    run();
  };

  const completedCount = stepStatuses.filter(s => s === 'done' || s === 'cached').length;
  const progressPct = (completedCount / 4) * 100;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - 56px)', padding: '40px 24px',
    }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
          preparing your {config.language} course
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
          Loading pre-built content — no API call needed.
        </p>

        {/* Progress bar */}
        <div style={{ height: 8, background: 'rgba(26,61,43,0.08)', borderRadius: 4, overflow: 'hidden', marginBottom: 28 }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--primary)', borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>

        {/* Steps */}
        <div style={{ textAlign: 'left' }}>
          {DISPLAY_STEPS.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
              borderBottom: i < DISPLAY_STEPS.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ width: 24, textAlign: 'center', flexShrink: 0 }}>
                {stepStatuses[i] === 'done' && <span style={{ color: '#2E7D52', fontSize: 16 }}>&#10003;</span>}
                {stepStatuses[i] === 'cached' && <span style={{ color: 'var(--accent)', fontSize: 16 }}>&#10003;</span>}
                {stepStatuses[i] === 'pending' && <span style={{ color: 'var(--text-hint)', fontSize: 14 }}>&#9675;</span>}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 400, color: stepStatuses[i] === 'pending' ? 'var(--text-hint)' : 'var(--text)' }}>
                  {step.label}
                </span>
                {stepStatuses[i] === 'cached' && <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 8 }}>cached</span>}
                {stepStatuses[i] === 'done' && <span style={{ fontSize: 11, color: '#2E7D52', marginLeft: 8 }}>pre-built</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: 'rgba(179,58,42,0.08)', color: '#B33A2A', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
            <button className="btn btn-primary" onClick={retry}>Retry</button>
          </div>
        )}

        {/* Done */}
        {done && !error && (
          <div style={{ marginTop: 24, fontSize: 15, color: '#2E7D52', fontWeight: 600 }}>
            All content ready. Let's begin!
          </div>
        )}
      </div>
    </div>
  );
}

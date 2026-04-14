import { useState, useEffect } from 'react';
import { generateBatch } from '../utils/api';
import { getPrebuiltData, hasPrebuiltData } from '../data/index';
import {
  getConfig, setWordList, setSentenceStructures, setScriptInfo, setRoadmap,
  setContentReady, getWordList, getSentenceStructures, getScriptInfo, getRoadmap
} from '../utils/storage';

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
  const [isPrebuilt, setIsPrebuilt] = useState(false);

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

    // ── Try pre-built data first (instant, no API needed) ──
    if (hasPrebuiltData(config.language)) {
      setIsPrebuilt(true);
      const data = getPrebuiltData(config.language);

      // Animate loading steps quickly
      for (let i = 0; i < 4; i++) {
        await new Promise(r => setTimeout(r, 150));
        setStepStatuses(prev => {
          const next = [...prev];
          next[i] = 'done';
          return next;
        });
      }

      setWordList(data.wordList);
      setSentenceStructures(data.sentenceStructures);
      setScriptInfo(data.scriptInfo);
      setRoadmap(data.roadmap);
      setContentReady(true);
      setDone(true);
      setTimeout(() => onComplete(), 400);
      return;
    }

    // ── No pre-built data — need API key ──
    if (!config.apiKey) {
      setError('This language requires an API key to generate content. Please go back and enter your Anthropic API key.');
      return;
    }

    // ── Wave 1: words, sentences, script (parallel) ──
    const statuses = ['loading', 'loading', 'loading', 'pending'];
    setStepStatuses([...statuses]);

    const wave1Needed = [];
    if (getWordList().length === 0) wave1Needed.push('wordList_1', 'wordList_2', 'wordList_3');
    if (getSentenceStructures().length === 0) wave1Needed.push('sentenceStructures');
    if (getScriptInfo() === null) wave1Needed.push('scriptInfo');

    if (wave1Needed.length > 0) {
      try {
        const batch = await generateBatch(config.apiKey, config.language, wave1Needed);

        if (Object.keys(batch.errors || {}).length > 0) {
          throw new Error(Object.values(batch.errors)[0]);
        }

        const r = batch.results;

        if (r.wordList_1 || r.wordList_2 || r.wordList_3) {
          setWordList([...(r.wordList_1?.data || []), ...(r.wordList_2?.data || []), ...(r.wordList_3?.data || [])]);
        }
        if (r.sentenceStructures) setSentenceStructures(r.sentenceStructures.data);
        if (r.scriptInfo) setScriptInfo(r.scriptInfo.data);

        statuses[0] = 'done';
        statuses[1] = 'done';
        statuses[2] = 'done';
        setStepStatuses([...statuses]);
      } catch (err) {
        statuses[0] = 'error'; statuses[1] = 'error'; statuses[2] = 'error';
        setStepStatuses([...statuses]);
        setError('Content generation failed: ' + err.message);
        return;
      }
    } else {
      statuses[0] = 'cached'; statuses[1] = 'cached'; statuses[2] = 'cached';
      setStepStatuses([...statuses]);
    }

    // ── Wave 2: roadmap phases (parallel) ──
    if (!getRoadmap()) {
      statuses[3] = 'loading';
      setStepStatuses([...statuses]);

      try {
        const roadmapTypes = ['roadmap_day1', 'roadmap_day2', 'roadmap_week1', 'roadmap_month1', 'roadmap_month2', 'roadmap_meta'];
        const batch = await generateBatch(config.apiKey, config.language, roadmapTypes);

        if (Object.keys(batch.errors || {}).length > 0) {
          throw new Error(Object.values(batch.errors)[0]);
        }

        const r = batch.results;
        setRoadmap({
          phases: [r.roadmap_day1?.data, r.roadmap_day2?.data, r.roadmap_week1?.data, r.roadmap_month1?.data, r.roadmap_month2?.data].filter(Boolean),
          tips: r.roadmap_meta?.data?.tips || [],
          coverageNote: r.roadmap_meta?.data?.coverageNote || '',
        });
        statuses[3] = 'done';
        setStepStatuses([...statuses]);
      } catch (err) {
        statuses[3] = 'error';
        setStepStatuses([...statuses]);
        setError('Roadmap generation failed: ' + err.message);
        return;
      }
    } else {
      statuses[3] = 'cached';
      setStepStatuses([...statuses]);
    }

    setContentReady(true);
    setDone(true);
    setTimeout(() => onComplete(), 500);
  };

  const retry = () => {
    setError('');
    setStepStatuses(['pending', 'pending', 'pending', 'pending']);
    run();
  };

  const skip = () => {
    setContentReady(true);
    onComplete();
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
          {isPrebuilt
            ? 'Loading pre-built content — no API call needed.'
            : 'Generating personalized content with Claude AI. This only happens once — everything is cached for instant access afterward.'
          }
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
                {stepStatuses[i] === 'loading' && (
                  <div style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                )}
                {stepStatuses[i] === 'error' && <span style={{ color: '#B33A2A', fontSize: 16 }}>&#10007;</span>}
                {stepStatuses[i] === 'pending' && <span style={{ color: 'var(--text-hint)', fontSize: 14 }}>&#9675;</span>}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: stepStatuses[i] === 'loading' ? 600 : 400, color: stepStatuses[i] === 'pending' ? 'var(--text-hint)' : 'var(--text)' }}>
                  {step.label}
                </span>
                {stepStatuses[i] === 'cached' && <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 8 }}>cached</span>}
                {stepStatuses[i] === 'done' && isPrebuilt && <span style={{ fontSize: 11, color: '#2E7D52', marginLeft: 8 }}>pre-built</span>}
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
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={retry}>Retry</button>
              <button className="btn btn-outline" onClick={skip}>Skip & Continue</button>
            </div>
          </div>
        )}

        {/* Done */}
        {done && !error && (
          <div style={{ marginTop: 24, fontSize: 15, color: '#2E7D52', fontWeight: 600 }}>
            All content ready. Let's begin!
          </div>
        )}

        {!done && !error && !isPrebuilt && stepStatuses.some(s => s === 'loading') && (
          <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-hint)' }}>
            Running parallel requests — much faster than sequential.
          </p>
        )}
      </div>
    </div>
  );
}

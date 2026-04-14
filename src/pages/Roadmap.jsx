import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { getRoadmap, setRoadmap, getConfig } from '../utils/storage';
import { generateContent } from '../utils/api';

const TAG_MAP = {
  vocab: 'tag-vocab',
  listen: 'tag-listen',
  speak: 'tag-speak',
  write: 'tag-write',
  review: 'tag-review',
};

const TOOL_ROUTES = {
  flashcards: '/flashcards',
  wordlist: '/wordlist',
  script: '/script',
  journal: '/journal',
  conversation: '/conversation',
  progress: '/progress',
};

export default function Roadmap({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openPhases, setOpenPhases] = useState({ day1: true });

  useEffect(() => {
    const saved = getRoadmap();
    if (saved) {
      setData(saved);
    } else {
      loadRoadmap();
    }
  }, []);

  const loadRoadmap = async () => {
    setLoading(true);
    setError('');
    try {
      const config = getConfig();
      const result = await generateContent(config.apiKey, config.language, 'roadmapContent');
      setData(result.data);
      setRoadmap(result.data);
    } catch (err) {
      setError('Failed to generate roadmap: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePhase = (id) => {
    setOpenPhases((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <p className="loading-text">Generating your personalized roadmap...</p>
        <p className="loading-text" style={{ fontSize: 12 }}>This may take a minute on first load.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="error-msg">{error}</div>
        <button className="btn btn-primary" onClick={loadRoadmap}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const config = getConfig();

  return (
    <div>
      <div className="page-header">
        <h1>Your {config.language} Learning Roadmap</h1>
        <p>Follow this step-by-step plan to have a conversation in 48 hours</p>
      </div>

      {data.phases?.map((phase) => (
        <div key={phase.id} className={`phase ${openPhases[phase.id] ? 'open' : ''}`}>
          <button className="phase-header" onClick={() => togglePhase(phase.id)}>
            <div className="phase-dot" style={{ background: phase.color }} />
            <span className="phase-title">{phase.title}</span>
            <span
              className="phase-badge"
              style={{
                background: phase.color + '20',
                color: phase.color,
              }}
            >
              {phase.time}
            </span>
            <ChevronDown size={16} className="phase-chevron" />
          </button>
          <div className="phase-body">
            {phase.steps?.map((step) => (
              <div key={step.number} className="step">
                <div className="step-left">
                  <div className="step-number" style={{ background: phase.color }}>
                    {step.number}
                  </div>
                  <div className="step-content">
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                    <div className="step-tags">
                      {step.tags?.map((tag) => (
                        <span key={tag} className={`tag ${TAG_MAP[tag] || ''}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="step-right">
                  {step.tool && TOOL_ROUTES[step.tool] ? (
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => onNavigate(TOOL_ROUTES[step.tool])}
                    >
                      Open Tool
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                      {step.toolPrompt || 'Self-guided'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {data.tips && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>Tips for Learning {config.language}</h3>
          <ul style={{ paddingLeft: 20, fontSize: 14, color: 'var(--color-text-secondary)' }}>
            {data.tips.map((tip, i) => (
              <li key={i} style={{ marginBottom: 6 }}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {data.coverageNote && (
        <div className="card">
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{data.coverageNote}</p>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button className="btn btn-secondary btn-small" onClick={loadRoadmap}>
          Regenerate Roadmap
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { getConfig, getProgressData, setProgressData, getLearnedWords, getFlashcardProgress } from '../utils/storage';

export default function Progress() {
  const config = getConfig();
  const [data, setData] = useState(getProgressData());
  const [logging, setLogging] = useState(false);
  const [logForm, setLogForm] = useState({
    flashcards: false, listening: false, speaking: false, writing: false, newWords: 0,
  });

  const learnedWords = getLearnedWords();
  const flashcardProgress = getFlashcardProgress();
  const masteredCards = Object.values(flashcardProgress).filter((p) => p.ease >= 3).length;

  const logSession = () => {
    const today = new Date().toISOString().split('T')[0];
    const activities = [];
    if (logForm.flashcards) activities.push('flashcards');
    if (logForm.listening) activities.push('listening');
    if (logForm.speaking) activities.push('speaking');
    if (logForm.writing) activities.push('writing');
    if (activities.length === 0 && logForm.newWords === 0) return;

    const session = { date: today, activities, wordsStudied: logForm.newWords, timestamp: Date.now() };
    const lastDate = data.lastSessionDate;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = data.streak;
    if (lastDate === today) { /* already logged */ }
    else if (lastDate === yesterdayStr || !lastDate) { newStreak += 1; }
    else { newStreak = 1; }

    const updated = {
      ...data,
      sessions: [session, ...data.sessions],
      wordsStudied: data.wordsStudied + logForm.newWords,
      streak: newStreak,
      lastSessionDate: today,
      skills: data.skills,
    };
    setData(updated);
    setProgressData(updated);
    setLogging(false);
    setLogForm({ flashcards: false, listening: false, speaking: false, writing: false, newWords: 0 });
  };

  const updateSkill = (skill, value) => {
    const updated = { ...data, skills: { ...data.skills, [skill]: parseInt(value) || 1 } };
    setData(updated);
    setProgressData(updated);
  };

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const daySessions = data.sessions.filter((s) => s.date === dateStr);
    const words = daySessions.reduce((sum, s) => sum + (s.wordsStudied || 0), 0);
    return { day: dayLabel, words };
  });

  const radarData = [
    { skill: 'Vocab', value: data.skills.vocab },
    { skill: 'Listening', value: data.skills.listening },
    { skill: 'Speaking', value: data.skills.speaking },
    { skill: 'Writing', value: data.skills.writing },
  ];

  const milestones = [100, 200, 300, 500, 1000];
  const totalWords = learnedWords.length;

  const ProgressRing = ({ target, current, label }) => {
    const pct = Math.min(current / target, 1);
    const r = 32;
    const circumference = 2 * Math.PI * r;
    const offset = circumference * (1 - pct);
    return (
      <div className="progress-ring">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle cx="40" cy="40" r={r} fill="none"
            stroke={pct >= 1 ? 'var(--green-tint)' : 'var(--primary)'}
            strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 40 40)" />
          <text x="40" y="40" textAnchor="middle" dy=".3em" fill="var(--text)" fontSize="14" fontWeight="700">
            {current >= target ? '✓' : current}
          </text>
        </svg>
        <div className="label">{label}</div>
      </div>
    );
  };

  return (
    <div>
      <div className="eyebrow">PROGRESS</div>
      <h1 className="heading heading-lg" style={{ marginBottom: 24 }}>
        {config.language} Progress
      </h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{data.streak}</div>
          <div className="stat-label">Day Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalWords}</div>
          <div className="stat-label">Words Learned</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{masteredCards}</div>
          <div className="stat-label">Cards Mastered</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.sessions.length}</div>
          <div className="stat-label">Sessions</div>
        </div>
      </div>

      {!logging ? (
        <button className="btn btn-primary" onClick={() => setLogging(true)} style={{ marginBottom: 24 }}>
          Log Today's Session
        </button>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 className="heading heading-sm" style={{ marginBottom: 12 }}>Log Today's Session</h3>
          <div className="checkbox-group" style={{ marginBottom: 16 }}>
            {['flashcards', 'listening', 'speaking', 'writing'].map((a) => (
              <label key={a} className="checkbox-label">
                <input type="checkbox" checked={logForm[a]} onChange={(e) => setLogForm({ ...logForm, [a]: e.target.checked })} />
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </label>
            ))}
          </div>
          <div className="input-group" style={{ maxWidth: 200, marginBottom: 12 }}>
            <label>New words studied</label>
            <input type="number" min="0" value={logForm.newWords} onChange={(e) => setLogForm({ ...logForm, newWords: parseInt(e.target.value) || 0 })} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-small" onClick={logSession}>Save</button>
            <button className="btn btn-outline btn-small" onClick={() => setLogging(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="heading heading-sm" style={{ marginBottom: 16 }}>Vocabulary Milestones</h3>
        <div className="progress-rings">
          {milestones.map((m) => (
            <ProgressRing key={m} target={m} current={totalWords} label={`${m} words`} />
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="heading heading-sm" style={{ marginBottom: 16 }}>Words Studied This Week</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last7Days}>
            <XAxis dataKey="day" fontSize={12} stroke="var(--text-hint)" />
            <YAxis fontSize={12} stroke="var(--text-hint)" />
            <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
            <Bar dataKey="words" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="heading heading-sm" style={{ marginBottom: 16 }}>Skills Self-Assessment</h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          {['vocab', 'listening', 'speaking', 'writing'].map((skill) => (
            <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, minWidth: 70 }}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</label>
              <input type="range" min="1" max="10" value={data.skills[skill]} onChange={(e) => updateSkill(skill, e.target.value)} style={{ width: 120 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', minWidth: 20 }}>{data.skills[skill]}</span>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="skill" fontSize={12} stroke="var(--text-muted)" />
            <PolarRadiusAxis domain={[0, 10]} tick={false} />
            <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

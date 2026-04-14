import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { getConfig } from './utils/storage';
import { storage, getContentReady } from './utils/storage';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import ContentLoader from './components/ContentLoader';
import Dashboard from './pages/Dashboard';
import Speaking from './pages/Speaking';
import Roadmap from './pages/Roadmap';
import Flashcards from './pages/Flashcards';
import WordListPage from './pages/WordList';
import ScriptTrainer from './pages/ScriptTrainer';
import Journal from './pages/Journal';
import Conversation from './pages/Conversation';
import Progress from './pages/Progress';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'wordlist', label: 'Word List' },
  { id: 'script', label: 'Script' },
  { id: 'journal', label: 'Journal' },
  { id: 'conversation', label: 'Chat' },
  { id: 'progress', label: 'Progress' },
];

function App() {
  const { user, loading: authLoading, isConfigured: authConfigured, signOut, profile } = useAuth();
  const [config, setConfigState] = useState(getConfig());
  const [contentReady, setContentReadyState] = useState(getContentReady());
  const [page, setPage] = useState('dashboard');

  // Auth loading spinner
  if (authLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid var(--border)',
            borderTopColor: 'var(--primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
          }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
        </div>
      </div>
    );
  }

  // If Supabase auth is configured but user isn't logged in, show auth page
  if (authConfigured && !user) {
    return <Auth />;
  }

  const handleSetupComplete = (newConfig) => {
    setConfigState(newConfig);
  };

  const handleContentReady = () => {
    setContentReadyState(true);
  };

  const handleReset = () => {
    if (window.confirm('This will clear all data and reset the app. Continue?')) {
      storage.clear();
      setConfigState({ apiKey: '', language: '', setupComplete: false });
      setContentReadyState(false);
      setPage('dashboard');
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('Sign out? Your progress is saved to your account.')) {
      storage.clear();
      await signOut();
      setConfigState({ apiKey: '', language: '', setupComplete: false });
      setContentReadyState(false);
      setPage('dashboard');
    }
  };

  // Onboarding (no setup yet)
  if (!config.setupComplete) {
    return (
      <>
        <div className="top-nav">
          <span className="top-nav-logo">Immerse48</span>
          {authConfigured && user && (
            <div className="top-nav-right">
              <button className="nav-reset" onClick={handleSignOut}>Sign Out</button>
            </div>
          )}
        </div>
        <Onboarding onComplete={handleSetupComplete} />
      </>
    );
  }

  // Content generation (runs once after onboarding)
  if (!contentReady) {
    return (
      <>
        <div className="top-nav">
          <span className="top-nav-logo">Immerse48</span>
          <div className="top-nav-right">
            <span className="nav-lang-badge">{config.language}</span>
          </div>
        </div>
        <ContentLoader onComplete={handleContentReady} />
      </>
    );
  }

  // Main app
  const navigate = (pageId) => setPage(pageId);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'speaking': return <Speaking onNavigate={navigate} />;
      case 'roadmap': return <Roadmap onNavigate={(route) => navigate(route.replace('/', ''))} />;
      case 'flashcards': return <Flashcards />;
      case 'wordlist': return <WordListPage />;
      case 'script': return <ScriptTrainer />;
      case 'journal': return <Journal />;
      case 'conversation': return <Conversation />;
      case 'progress': return <Progress />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <>
      <div className="top-nav">
        <span className="top-nav-logo">Immerse48</span>
        <div className="top-nav-tabs">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-tab ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="top-nav-right">
          <span className="nav-lang-badge">{config.language}</span>
          {authConfigured && user && (
            <button className="nav-reset" onClick={handleSignOut} title="Sign out">
              {profile?.display_name || user.email?.split('@')[0] || 'Account'}
            </button>
          )}
          <button className="nav-reset" onClick={handleReset}>Reset</button>
        </div>
      </div>
      <div className="main">
        {renderPage()}
      </div>
    </>
  );
}

export default App;

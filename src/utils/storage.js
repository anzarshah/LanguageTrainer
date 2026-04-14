// Persistent localStorage wrapper with JSON serialization

const PREFIX = 'lang48_';

export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
};

// Specific storage helpers
export const getConfig = () => storage.get('config', { apiKey: '', language: '', setupComplete: false });
export const setConfig = (config) => storage.set('config', config);

export const getWordList = () => storage.get('wordList', []);
export const setWordList = (list) => storage.set('wordList', list);

export const getSentenceStructures = () => storage.get('sentenceStructures', []);
export const setSentenceStructures = (list) => storage.set('sentenceStructures', list);

export const getScriptInfo = () => storage.get('scriptInfo', null);
export const setScriptInfo = (info) => storage.set('scriptInfo', info);

export const getRoadmap = () => storage.get('roadmap', null);
export const setRoadmap = (data) => storage.set('roadmap', data);

export const getFlashcardProgress = () => storage.get('flashcardProgress', {});
export const setFlashcardProgress = (progress) => storage.set('flashcardProgress', progress);

export const getLearnedWords = () => storage.get('learnedWords', []);
export const setLearnedWords = (words) => storage.set('learnedWords', words);

export const getJournalEntries = () => storage.get('journalEntries', []);
export const setJournalEntries = (entries) => storage.set('journalEntries', entries);

export const getConversations = () => storage.get('conversations', []);
export const setConversations = (convos) => storage.set('conversations', convos);

export const getProgressData = () => storage.get('progressData', {
  sessions: [],
  wordsStudied: 0,
  streak: 0,
  lastSessionDate: null,
  skills: { vocab: 0, listening: 0, speaking: 0, writing: 0 }
});
export const setProgressData = (data) => storage.set('progressData', data);

export const getScriptProgress = () => storage.get('scriptProgress', {});
export const setScriptProgress = (progress) => storage.set('scriptProgress', progress);

export const getContentReady = () => storage.get('contentReady', false);
export const setContentReady = (ready) => storage.set('contentReady', ready);

export const isContentLoaded = () => {
  return getWordList().length > 0 &&
    getSentenceStructures().length > 0 &&
    getScriptInfo() !== null &&
    getRoadmap() !== null;
};

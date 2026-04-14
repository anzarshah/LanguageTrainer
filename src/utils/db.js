/**
 * Supabase data layer — replaces localStorage as source of truth when auth is active.
 * Falls back to localStorage when Supabase is not configured (local-only mode).
 *
 * Pattern: read from Supabase, cache in localStorage for instant loads.
 * Write to both Supabase and localStorage.
 */

import { supabase } from '../lib/supabase';
import * as store from './storage';

function isActive() {
  return !!supabase;
}

async function getUserId() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

// ─── Profile ───

export async function getProfile() {
  if (!isActive()) return store.getConfig();
  const userId = await getUserId();
  if (!userId) return store.getConfig();

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (data) {
    // Sync to localStorage as cache
    const config = {
      language: data.language || '',
      goals: data.goals || [],
      setupComplete: data.setup_complete || false,
      setupDate: data.setup_date,
      apiKey: '', // never store raw key locally when using Supabase
    };
    store.setConfig(config);
    return config;
  }
  return store.getConfig();
}

export async function updateProfile(updates) {
  if (!isActive()) {
    const current = store.getConfig();
    store.setConfig({ ...current, ...updates });
    return;
  }
  const userId = await getUserId();
  if (!userId) return;

  const dbUpdates = {};
  if (updates.language !== undefined) dbUpdates.language = updates.language;
  if (updates.goals !== undefined) dbUpdates.goals = updates.goals;
  if (updates.setupComplete !== undefined) dbUpdates.setup_complete = updates.setupComplete;
  if (updates.setupDate !== undefined) dbUpdates.setup_date = updates.setupDate;
  dbUpdates.updated_at = new Date().toISOString();

  await supabase.from('profiles').update(dbUpdates).eq('id', userId);

  // Sync localStorage
  const current = store.getConfig();
  store.setConfig({ ...current, ...updates });
}

// ─── User Content (wordList, sentenceStructures, scriptInfo, roadmap) ───

export async function getUserContent(contentType, language) {
  if (!isActive()) {
    switch (contentType) {
      case 'wordList': return store.getWordList();
      case 'sentenceStructures': return store.getSentenceStructures();
      case 'scriptInfo': return store.getScriptInfo();
      case 'roadmap': return store.getRoadmap();
      default: return null;
    }
  }

  const userId = await getUserId();
  if (!userId) return null;

  const { data } = await supabase
    .from('user_content')
    .select('data')
    .eq('user_id', userId)
    .eq('content_type', contentType)
    .eq('language', language)
    .single();

  if (data?.data) {
    // Cache locally
    switch (contentType) {
      case 'wordList': store.setWordList(data.data); break;
      case 'sentenceStructures': store.setSentenceStructures(data.data); break;
      case 'scriptInfo': store.setScriptInfo(data.data); break;
      case 'roadmap': store.setRoadmap(data.data); break;
    }
    return data.data;
  }
  return null;
}

export async function setUserContent(contentType, language, contentData) {
  // Always cache locally
  switch (contentType) {
    case 'wordList': store.setWordList(contentData); break;
    case 'sentenceStructures': store.setSentenceStructures(contentData); break;
    case 'scriptInfo': store.setScriptInfo(contentData); break;
    case 'roadmap': store.setRoadmap(contentData); break;
  }

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('user_content').upsert({
    user_id: userId,
    content_type: contentType,
    language,
    data: contentData,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,content_type,language' });
}

// ─── Flashcard Progress ───

export async function getFlashcardProgress() {
  if (!isActive()) return store.getFlashcardProgress();
  const userId = await getUserId();
  if (!userId) return store.getFlashcardProgress();

  const { data } = await supabase
    .from('flashcard_progress')
    .select('card_key, ease, next_review, last_reviewed')
    .eq('user_id', userId);

  if (data && data.length > 0) {
    const progress = {};
    data.forEach(row => {
      progress[row.card_key] = {
        ease: row.ease,
        nextReview: row.next_review,
        lastReviewed: row.last_reviewed,
      };
    });
    store.setFlashcardProgress(progress);
    return progress;
  }
  return store.getFlashcardProgress();
}

export async function upsertFlashcardProgress(cardKey, progressData) {
  // Always update local
  const current = store.getFlashcardProgress();
  current[cardKey] = progressData;
  store.setFlashcardProgress(current);

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('flashcard_progress').upsert({
    user_id: userId,
    card_key: cardKey,
    ease: progressData.ease,
    next_review: progressData.nextReview,
    last_reviewed: progressData.lastReviewed,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,card_key' });
}

// ─── Learned Words ───

export async function getLearnedWords(language) {
  if (!isActive()) return store.getLearnedWords();
  const userId = await getUserId();
  if (!userId) return store.getLearnedWords();

  const { data } = await supabase
    .from('learned_words')
    .select('word, rank')
    .eq('user_id', userId)
    .eq('language', language);

  if (data) {
    store.setLearnedWords(data.map(r => r.rank || r.word));
    return data.map(r => r.rank || r.word);
  }
  return store.getLearnedWords();
}

export async function addLearnedWord(word, rank, language) {
  const current = store.getLearnedWords();
  if (!current.includes(rank || word)) {
    store.setLearnedWords([...current, rank || word]);
  }

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('learned_words').upsert({
    user_id: userId, word, rank, language,
  }, { onConflict: 'user_id,word,language' });
}

// ─── Journal Entries ───

export async function getJournalEntries(language) {
  if (!isActive()) return store.getJournalEntries();
  const userId = await getUserId();
  if (!userId) return store.getJournalEntries();

  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (data) {
    store.setJournalEntries(data);
    return data;
  }
  return store.getJournalEntries();
}

export async function addJournalEntry(entry, language) {
  const current = store.getJournalEntries();
  const newEntry = { ...entry, created_at: new Date().toISOString() };
  store.setJournalEntries([newEntry, ...current]);

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('journal_entries').insert({
    user_id: userId,
    original: entry.original,
    feedback: entry.feedback || null,
    language,
  });
}

// ─── Conversations ───

export async function getConversations(language) {
  if (!isActive()) return store.getConversations();
  const userId = await getUserId();
  if (!userId) return store.getConversations();

  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (data) {
    store.setConversations(data);
    return data;
  }
  return store.getConversations();
}

export async function addConversation(convo, language) {
  const current = store.getConversations();
  store.setConversations([{ ...convo, created_at: new Date().toISOString() }, ...current]);

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('conversations').insert({
    user_id: userId,
    scenario: convo.scenario || 'general',
    messages: convo.messages || [],
    message_count: convo.messages?.length || 0,
    language,
  });
}

// ─── Progress Data ───

export async function getProgressData() {
  if (!isActive()) return store.getProgressData();
  const userId = await getUserId();
  if (!userId) return store.getProgressData();

  const { data } = await supabase
    .from('progress_data')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (data) {
    const progress = {
      sessions: sessions || [],
      wordsStudied: data.words_studied,
      streak: data.streak,
      lastSessionDate: data.last_session_date,
      skills: data.skills || { vocab: 0, listening: 0, speaking: 0, writing: 0 },
    };
    store.setProgressData(progress);
    return progress;
  }
  return store.getProgressData();
}

export async function updateProgressData(updates) {
  const current = store.getProgressData();
  const updated = { ...current, ...updates };
  store.setProgressData(updated);

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  const dbUpdates = {};
  if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
  if (updates.wordsStudied !== undefined) dbUpdates.words_studied = updates.wordsStudied;
  if (updates.lastSessionDate !== undefined) dbUpdates.last_session_date = updates.lastSessionDate;
  if (updates.skills !== undefined) dbUpdates.skills = updates.skills;
  dbUpdates.updated_at = new Date().toISOString();

  await supabase.from('progress_data').update(dbUpdates).eq('user_id', userId);
}

export async function addSession(session) {
  const current = store.getProgressData();
  current.sessions = [session, ...(current.sessions || [])];
  store.setProgressData(current);

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('sessions').insert({
    user_id: userId,
    date: session.date,
    activities: session.activities || [],
    words_studied: session.wordsStudied || 0,
  });
}

// ─── Script Progress ───

export async function getScriptProgress() {
  if (!isActive()) return store.getScriptProgress();
  const userId = await getUserId();
  if (!userId) return store.getScriptProgress();

  const { data } = await supabase
    .from('script_progress')
    .select('char_key, mastered')
    .eq('user_id', userId);

  if (data && data.length > 0) {
    const progress = {};
    data.forEach(row => { progress[row.char_key] = row.mastered; });
    store.setScriptProgress(progress);
    return progress;
  }
  return store.getScriptProgress();
}

export async function upsertScriptProgress(charKey, mastered) {
  const current = store.getScriptProgress();
  current[charKey] = mastered;
  store.setScriptProgress(current);

  if (!isActive()) return;
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from('script_progress').upsert({
    user_id: userId,
    char_key: charKey,
    mastered,
  }, { onConflict: 'user_id,char_key' });
}

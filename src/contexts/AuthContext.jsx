import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getProfile as dbGetProfile, getUserContent } from '../utils/db';
import { getPrebuiltData } from '../data/index';
import * as store from '../utils/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // If Supabase is not configured, skip auth (local-only mode)
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) await fetchProfile(s.user.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    try {
      // Fetch raw profile for display data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) setProfile(data);

      // Sync profile to localStorage config via db layer
      const config = await dbGetProfile();

      // If setup was completed, restore content from Supabase or prebuilt data
      if (config && config.setupComplete && config.language) {
        await restoreContent(config.language);
      }
    } catch {}
    setLoading(false);
  };

  const restoreContent = async (language) => {
    try {
      // Try restoring from Supabase first
      const [words, sentences, script, roadmap] = await Promise.all([
        getUserContent('wordList', language),
        getUserContent('sentenceStructures', language),
        getUserContent('scriptInfo', language),
        getUserContent('roadmap', language),
      ]);

      // If Supabase had content, it's now in localStorage via getUserContent
      const hasContent = (words && words.length > 0) ||
        store.getWordList().length > 0;

      if (hasContent && store.getSentenceStructures().length > 0 &&
          store.getScriptInfo() !== null && store.getRoadmap() !== null) {
        store.setContentReady(true);
        return;
      }

      // Fallback: load from pre-built data if Supabase had nothing
      const prebuilt = getPrebuiltData(language);
      if (prebuilt) {
        store.setWordList(prebuilt.wordList);
        store.setSentenceStructures(prebuilt.sentenceStructures);
        store.setScriptInfo(prebuilt.scriptInfo);
        store.setRoadmap(prebuilt.roadmap);
        store.setContentReady(true);
      }
    } catch {
      // Best-effort restore; ContentLoader will handle missing content
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const getToken = () => session?.access_token || null;

  return (
    <AuthContext.Provider value={{
      user, session, profile, loading,
      signUp, signIn, signOut, getToken, refreshProfile,
      isConfigured: !!supabase,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

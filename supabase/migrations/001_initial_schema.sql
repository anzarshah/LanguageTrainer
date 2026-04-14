-- ============================================================
-- Immerse48 — Supabase Database Schema
-- Run this in your Supabase SQL editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  language TEXT,
  goals TEXT[] DEFAULT '{}',
  encrypted_api_key TEXT,
  api_key_iv TEXT,
  setup_complete BOOLEAN DEFAULT FALSE,
  setup_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. User content (word lists, roadmap, etc.)
CREATE TABLE public.user_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  language TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, content_type, language)
);

ALTER TABLE public.user_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own content" ON public.user_content FOR ALL USING (auth.uid() = user_id);

-- 3. Flashcard progress
CREATE TABLE public.flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_key TEXT NOT NULL,
  ease INTEGER DEFAULT 0,
  next_review BIGINT DEFAULT 0,
  last_reviewed BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, card_key)
);

ALTER TABLE public.flashcard_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own flashcard progress" ON public.flashcard_progress FOR ALL USING (auth.uid() = user_id);

-- 4. Learned words
CREATE TABLE public.learned_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  rank INTEGER,
  language TEXT NOT NULL,
  learned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word, language)
);

ALTER TABLE public.learned_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own learned words" ON public.learned_words FOR ALL USING (auth.uid() = user_id);

-- 5. Journal entries
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original TEXT NOT NULL,
  feedback JSONB,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own journal entries" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);

-- 6. Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  messages JSONB DEFAULT '[]',
  message_count INTEGER DEFAULT 0,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);

-- 7. Progress data (one row per user)
CREATE TABLE public.progress_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  streak INTEGER DEFAULT 0,
  words_studied INTEGER DEFAULT 0,
  last_session_date TEXT,
  skills JSONB DEFAULT '{"vocab":0,"listening":0,"speaking":0,"writing":0}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.progress_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own progress" ON public.progress_data FOR ALL USING (auth.uid() = user_id);

-- 8. Sessions log
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  activities TEXT[] DEFAULT '{}',
  words_studied INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own sessions" ON public.sessions FOR ALL USING (auth.uid() = user_id);

-- 9. Script progress
CREATE TABLE public.script_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  char_key TEXT NOT NULL,
  mastered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, char_key)
);

ALTER TABLE public.script_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own script progress" ON public.script_progress FOR ALL USING (auth.uid() = user_id);

-- 10. LLM cache (server-only, no RLS)
CREATE TABLE public.llm_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT,
  user_prompt TEXT NOT NULL,
  params JSONB,
  response TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_llm_cache_key ON public.llm_cache(cache_key);

-- 11. LLM request log (server-only, no RLS)
CREATE TABLE public.llm_requests (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL,
  model TEXT NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  latency_ms INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_llm_requests_created ON public.llm_requests(created_at);

-- 12. Auto-create profile + progress on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.progress_data (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Cache stats function
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'total_requests', COALESCE(COUNT(*), 0),
    'cache_hits', COALESCE(SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END), 0),
    'cache_misses', COALESCE(SUM(CASE WHEN NOT cache_hit THEN 1 ELSE 0 END), 0),
    'total_cost', COALESCE(SUM(estimated_cost), 0),
    'total_input_tokens', COALESCE(SUM(input_tokens), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens), 0),
    'avg_latency_ms', COALESCE(AVG(latency_ms), 0)
  )
  FROM public.llm_requests;
$$ LANGUAGE sql;

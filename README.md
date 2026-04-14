# Immerse48

**Have a Conversation in any Language in 48 Hours**

An open-source, AI-powered language learning app built on three scientifically-proven principles:

1. **Comprehensible Input** — Learn content just above your level
2. **Spaced Repetition** — Review consistently so nothing is forgotten
3. **Output Forcing** — Speak, write, and generate language to cement knowledge

Powered by Claude AI (Anthropic). Runs entirely on your machine.

---

## Features

| Screen / Tool | Description |
|---|---|
| **Language Onboarding** | Choose from 12 languages (or type any), select goals, enter API key |
| **Daily Dashboard** | Streak banner, metrics, progress bars, inline flashcards |
| **Speaking Practice** | Phrase cards, mic recording UI, pronunciation feedback, AI coach notes |
| **Roadmap** | AI-generated personalized learning plan (Day 1 → Month 2+) |
| **Flashcards** | Top 300 words + 20 sentence structures with spaced repetition |
| **Word List** | Searchable frequency word list with learn/export |
| **Script Trainer** | Learn non-Latin scripts with character cards + quiz mode |
| **AI Journal** | Write entries and get corrections from your AI tutor |
| **Conversation Simulator** | Practice scenarios (ordering food, introductions, etc.) |
| **Progress Dashboard** | Streaks, milestones, skills radar, weekly charts |

All content is generated specifically for your target language using Claude Sonnet 4.6 and persisted locally.

---

## Architecture

```
┌─────────────┐       ┌──────────────────┐       ┌───────────┐
│  React App  │──────▶│  Express Server  │──────▶│ Anthropic │
│  (Vite)     │       │  + LLM Wrapper   │       │   API     │
│  Port 5173  │       │  + SQLite Cache  │       └───────────┘
│             │◀──────│  Port 3001       │
└─────────────┘       └──────────────────┘
     localStorage           cache.db
     (user progress)        (LLM responses)
```

### Backend (server/)

- **`llm.js`** — Modular LLM wrapper with timeout, retry (exponential backoff), token tracking, and cost estimation. Provider-agnostic interface (swap Anthropic for another provider by changing one file).
- **`cache.js`** — Deterministic SHA-256 cache keys from normalized request input. SQLite-backed persistent cache with TTL support, hit counting, and `forceRefresh` bypass.
- **`db.js`** — SQLite setup (WAL mode for performance). Two tables: `llm_cache` (cached responses) and `llm_requests` (request log with hit/miss tracking).
- **`index.js`** — Express API with endpoints for chat, content generation, key validation, and cache stats.

### Frontend (src/)

- **React 19 + Vite** — Fast dev server with HMR
- **localStorage** — All user progress (flashcard state, learned words, journal entries, streaks) persists across sessions
- **No routing library** — Conditional rendering for instant navigation

### Caching Strategy

- Same effective input (model + system prompt + user prompt + params) → same cache key
- Cache persists in `cache.db` across app restarts
- Content generation (word lists, roadmap) cached permanently
- Conversation/journal responses cached but can be bypassed with `forceRefresh`
- Cache stats available via `/api/cache/stats`, `/api/cache/entries`, `/api/cache/requests`

### Design System — Atlas Green

- Primary: `#1A3D2B` (deep forest green)
- Accent: `#C8A26E` (warm copper)
- Background: `#F4EFE0` (aged parchment)
- Surface: `#EAE4D0` (light linen)
- Fonts: Playfair Display (headings) + DM Sans (body)
- No gradients, no shadows — flat surfaces only

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- An [Anthropic API key](https://console.anthropic.com/settings/keys) — **optional** for pre-built languages

### Pre-built Languages (no API key needed for core content)

These languages come with **300 words, 20 sentence structures, script info, and a full roadmap** bundled in:

- **French** 🇫🇷
- **German** 🇩🇪
- **Persian** 🇮🇷
- **Arabic** 🇸🇦
- **Spanish** 🇪🇸

You still need an API key for AI-powered features: speaking practice, journal feedback, and conversation simulator.

All other languages work too — they generate content via the API on first use (cached permanently after that).

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/anzarshah/48LanguageTrainer.git
cd 48LanguageTrainer

# 2. Install dependencies
npm install

# 3. Start the app (runs both frontend + backend)
npm run dev
```

Open **http://localhost:5173** → select a language → start learning.

For pre-built languages, you can start immediately without any API key. For other languages or AI features, enter your Anthropic API key when prompted.

### Environment Variables (optional)

Create a `.env` file in the root:

```env
PORT=3001
```

The API key is entered in the browser UI and sent per-request — it's never stored on disk.

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/chat` | POST | General LLM chat (with caching) |
| `/api/generate-content` | POST | Generate word lists, roadmap, etc. (auto-splits large requests) |
| `/api/generate-batch` | POST | Parallel batch content generation |
| `/api/validate-key` | POST | Validate Anthropic API key |
| `/api/cache/stats` | GET | Cache hit/miss stats, total cost |
| `/api/cache/entries` | GET | All cached responses |
| `/api/cache/requests` | GET | Recent request log |

---

## Supported Languages

Works with **any language**. The AI generates all content dynamically and adapts for:

- Non-Latin scripts (Cyrillic, Arabic, Devanagari, CJK, Hangul, etc.)
- Tonal languages (Mandarin, Cantonese, Vietnamese, Thai)
- RTL languages (Arabic, Hebrew, Persian, Urdu)
- Grammatical gender (French, Spanish, German, Arabic)
- Honorific systems (Japanese, Korean)

---

## API Costs

Uses Claude Sonnet 4.6. Typical costs:

| Action | Cost |
|---|---|
| Initial content generation (word list, roadmap, script) | ~$0.10–0.20 |
| Each conversation/journal session | ~$0.01–0.05 |
| Full 48-hour sprint | ~$0.50–1.00 |
| **Cached repeat requests** | **$0.00** |

---

## Project Structure

```
Immerse48/
├── server/
│   ├── index.js        # Express API server
│   ├── llm.js          # LLM wrapper (retry, timeout, cost tracking)
│   ├── cache.js        # SQLite cache layer
│   └── db.js           # Database setup
├── src/
│   ├── data/
│   │   ├── index.js         # Pre-built language data index
│   │   ├── french.js        # 300 words, sentences, script, roadmap
│   │   ├── german.js
│   │   ├── persian.js
│   │   ├── arabic.js
│   │   └── spanish.js
│   ├── pages/
│   │   ├── Onboarding.jsx   # Language selection + API key
│   │   ├── Dashboard.jsx    # Daily dashboard + inline flashcards
│   │   ├── Speaking.jsx     # Speaking practice
│   │   ├── Roadmap.jsx      # Learning roadmap
│   │   ├── Flashcards.jsx   # Standalone flashcard view
│   │   ├── WordList.jsx     # Frequency word list
│   │   ├── ScriptTrainer.jsx # Script/pronunciation trainer
│   │   ├── Journal.jsx      # AI journal with feedback
│   │   ├── Conversation.jsx # AI conversation simulator
│   │   └── Progress.jsx     # Progress dashboard
│   ├── utils/
│   │   ├── api.js      # Frontend API client
│   │   └── storage.js  # localStorage persistence
│   ├── App.jsx          # Top nav + screen routing
│   ├── main.jsx         # Entry point
│   └── index.css        # Atlas Green design system
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## Contributing

Contributions welcome! Open issues or PRs for bug fixes, new tools, UI improvements, or language-specific enhancements.

## License

MIT — see [LICENSE](LICENSE)

---

*Built with Claude AI. Scholarly travel journal aesthetic. No gamification — just science.*

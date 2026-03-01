# Architecture Overview

## File Structure

```
frontend/src/
├── App.jsx          # Main component, state management, UI
├── analysis.js      # Bigram analysis, timing, blending, weakness scoring
├── prompts.js       # Text generation with weak bigram targeting
├── api.js           # Word fetching from external APIs
├── db.js            # IndexedDB persistence layer
├── utils.js         # Helpers (shuffle, bigram extraction, coverage calc)
├── constants.js     # Config (RUNS_PER_CYCLE, WORDS_PER_PROMPT, etc.)
└── index.css        # Monkeytype-inspired dark theme
```

---

## Core Concepts

### Cycle-Based Practice
- **3 runs per cycle** (configurable in `constants.js`)
- **10 words per prompt**
- After each cycle, bigram analysis occurs and weak bigrams are identified
- Next cycle's prompts incorporate those weak bigrams

### Bigram Tracking

Bigrams are two consecutive characters (e.g., "th", "er", "ng"). Spaces are excluded.

**Error Analysis** (`analyzeRuns`):
- Tracks `attempts` and `errors` for each bigram
- Error = when user typed wrong character

**Timing Analysis** (`analyzeBigramTiming`):
- Tracks time delta between consecutive keystrokes
- Calculates average time per bigram

**Combined Weakness Scoring** (`getWeakBigramsCombined`):
```
weaknessScore = (errorRate × 0.6) + (slownessFactor × 0.4)
```
- 60% weight on accuracy errors
- 40% weight on timing slowness (relative to overall average)
- Minimum 3 attempts required per bigram
- Top 10 weak bigrams selected

### Blended Scoring (Cycle + Lifetime)

The `blendBigramStats` function merges current cycle stats with lifetime stats from IndexedDB:

```
blendedErrorRate = (cycleErrorRate × cycleWeight) + (lifetimeErrorRate × lifetimeWeight)
blendedAvgTime = (cycleAvgTime × cycleWeight) + (lifetimeAvgTime × lifetimeWeight)
```

User controls the weight via a slider (default: 60% cycle / 40% lifetime).

---

## Data Persistence (IndexedDB)

### Database: `typingTeacherDB`

**Object Stores:**

| Store | Key | Purpose |
|-------|-----|---------|
| `sessions` | Auto-increment ID | Tracks each typing session (start/end time, stats) |
| `runs` | Auto-increment ID | Individual run data with keystroke events |
| `bigramStats` | Bigram string (e.g., "th") | Lifetime aggregates per bigram |

**Key Functions in `db.js`:**
- `initDB()` - Opens/creates database
- `createSession()` - Creates new session on app load
- `saveRun()` - Persists run with keystroke events
- `updateBigramStats()` - Merges cycle stats into lifetime
- `getAllBigramStats()` - Returns lifetime stats as Map
- `getWeakestBigrams()` - Returns top N weak bigrams from lifetime data
- `clearAllData()` - Wipes all stored data

---

## State Management (App.jsx)

### Core State
| State | Type | Purpose |
|-------|------|---------|
| `promptQueue` | `string[]` | Array of prompts to type |
| `currentPromptIndex` | `number` | Current prompt in queue |
| `runHistory` | `RunResult[]` | Completed runs with events, WPM, accuracy |
| `weakBigrams` | `string[]` | Top 10 weak bigram strings |
| `weakBigramsDetailed` | `object[]` | Detailed stats for display |

### Current Run State
| State | Type | Purpose |
|-------|------|---------|
| `typedChars` | `string[]` | Characters typed so far |
| `keystrokeEvents` | `Event[]` | `{expected, actual, timestamp}` per keystroke |
| `startTime` | `number` | Timestamp of first keystroke |

### UI State
| State | Type | Purpose |
|-------|------|---------|
| `isLoading` | `boolean` | Initial load state |
| `isTransitioning` | `boolean` | Between runs/cycles |
| `lifetimeWeight` | `number` | Slider value (0-1), persisted to localStorage |

---

## Text Generation (prompts.js)

1. Fetches 50 random words from API (with fallback chain)
2. Scores each word by weak bigram count (`scoreWord`)
3. Weighted random selection favors words with more weak bigrams
4. Weight = `scoreWord(word) + 1` (ensures all words have a chance)

**API Fallback Chain:**
1. `https://random-word-api.vercel.app/api?words=50`
2. `https://random-word-api.herokuapp.com/word?number=50`
3. Local `FALLBACK_WORDS` array

---

## UI Features

### Prompt Display
- Character-by-character rendering
- States: `pending` (gray), `correct` (white), `incorrect` (red), `current` (yellow)
- Weak bigram characters are underlined (yellow)

### Stats Bar
- Live WPM and accuracy
- Run counter (e.g., "Run 2/3")

### Weight Slider
- Controls cycle vs lifetime blending
- Persisted to localStorage

### Coverage Stats
- Shows "X/Y words contain weak bigrams (Z%)"
- Only counts top 10 weak bigrams

### Weak Bigrams Panel
- Displays after first cycle completion
- Shows: rank, bigram, weakness score, error rate, avg time, timing diff

### Buttons
- **Restart Cycle** - Regenerates prompts with current weak bigrams
- **Reset All Data** - Clears IndexedDB (with confirmation)

---

## Data Flow

```
User types → keystrokeEvents[] → run completes
                                      ↓
                              runHistory[] updated
                              saveRun() to IndexedDB
                                      ↓
                         [Every 3 runs: cycle completes]
                                      ↓
                    analyzeRuns() + analyzeBigramTiming()
                                      ↓
                         combineAnalysis() → cycleStats
                                      ↓
                    blendBigramStats(cycleStats, lifetimeStats)
                                      ↓
                    getWeakBigramsCombined() → top 10 weak
                                      ↓
                    updateBigramStats() → save to IndexedDB
                                      ↓
                    generatePrompts(weakBigrams) → new cycle
```

---

## Configuration (constants.js)

| Constant | Default | Purpose |
|----------|---------|---------|
| `RUNS_PER_CYCLE` | 3 | Runs before analysis |
| `WORDS_PER_PROMPT` | 10 | Words in each prompt |
| `RUN_TRANSITION_DELAY` | 400 | ms delay between runs |

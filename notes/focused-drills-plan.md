# Focused Drills - Implementation Plan

## V1 Drill Modes

| Mode | Word Source | Special Processing |
|---|---|---|
| **Adaptive** | External API + fallback (unchanged) | None (current behavior) |
| **Home Row** | Curated word bank | Words using only a,s,d,f,g,h,j,k,l |
| **Top Row** | Curated word bank | Words using only q,w,e,r,t,y,u,i,o,p |
| **Punctuation** | API/fallback + contractions list | Post-process to inject `,` `.` `;` at word boundaries |

---

## Files

### 1. New: `frontend/src/wordBanks.js`

Two curated word lists:

- **`HOME_ROW_WORDS`** (~100 words): Real English words whose letters are exclusively from `{a,s,d,f,g,h,j,k,l}`.
  Examples: flash, slash, glad, flag, glass, lash, dash, gash, half, hall, fall, gall, shall, flask, saga, has, gas, lag, jag, lad, fad, gag, hag, sad, sash, shah, alga, shag, slag, add, dad, ask, gal

- **`TOP_ROW_WORDS`** (~150 words): Real English words whose letters are exclusively from `{q,w,e,r,t,y,u,i,o,p}`.
  Top row contains vowels e,i,o,u so many common words qualify.
  Examples: write, power, tower, route, outer, quite, type, your, true, worry, error, poetry, upper, proper, otter, pretty, retire, report, repute, pure, ripe, pipe, wipe, tripe, trout, tore, wore, yore, pore, rower, pewter, potter, putter, tipper, ripper, wiper, piper, titter, twitter, witty, petty, putty, retort

- **`PUNCTUATION_CONTRACTIONS`** (~30 words): Common contractions for apostrophe practice.
  Examples: don't, can't, won't, it's, they're, we're, I've, I'll, you're, he's, she's, isn't, aren't, wasn't, weren't, couldn't, wouldn't, shouldn't, I'd, you'd, he'd, they'd, I'm

### 2. Modify: `frontend/src/constants.js`

Add drill mode constants:

```js
export const DRILL_MODES = {
  ADAPTIVE: 'adaptive',
  HOME_ROW: 'homeRow',
  TOP_ROW: 'topRow',
  PUNCTUATION: 'punctuation',
};

export const DRILL_LABELS = {
  adaptive: 'Adaptive',
  homeRow: 'Home Row',
  topRow: 'Top Row',
  punctuation: 'Punctuation',
};
```

### 3. Modify: `frontend/src/prompts.js`

Update `generatePrompts(weakBigrams, count, drillMode)`:

**Word source logic:**
- `adaptive`: unchanged — call `fetchRandomWords(50)`
- `homeRow`: use `HOME_ROW_WORDS` shuffled
- `topRow`: use `TOP_ROW_WORDS` shuffled
- `punctuation`: call `fetchRandomWords(50)` and mix in `PUNCTUATION_CONTRACTIONS`

**Post-processing for punctuation mode:**
After word selection, apply a simple punctuation injection pass:
- Group the 10 words into 2-3 "phrases" of 3-5 words
- After each phrase boundary word: append `,` or `.` (alternating or random)
- Contractions in the pool naturally introduce `'`
- Result looks like: `"don't rush, type each word. it's quite fast, steady."`

**Weak bigram weighting:** unchanged — all modes still score and weight words by weak bigrams.

### 4. Modify: `frontend/src/App.jsx`

**New state:**
```js
const [drillMode, setDrillMode] = useState(DRILL_MODES.ADAPTIVE);
```
Persisted to localStorage (same pattern as `lifetimeWeight`).

**Pass `drillMode` to all `generatePrompts` calls:**
- `init()` useEffect
- `completeRun()` (cycle completion)
- `handleRestart()`

**Mode switching handler:**
```js
const handleModeChange = useCallback(async (newMode) => {
  setDrillMode(newMode);
  setIsLoading(true);
  // Reset cycle state — keep lifetime bigram stats
  setRunHistory([]);
  setTypedChars([]);
  setKeystrokeEvents([]);
  setStartTime(null);
  setCurrentPromptIndex(0);
  const newPrompts = await generatePrompts(weakBigrams, RUNS_PER_CYCLE, newMode);
  setPromptQueue(newPrompts);
  setIsLoading(false);
}, [weakBigrams]);
```

**UI — Mode selector** (above the prompt display):
```
[ Adaptive ]  [ Home Row ]  [ Top Row ]  [ Punctuation ]
```
Active mode gets a highlighted style. `tabIndex={-1}` on each button so keyboard focus stays on the container.

### 5. Modify: `frontend/src/index.css`

Add styles for `.drill-selector` and `.drill-btn` (active/inactive states) to match the existing monkeytype-inspired dark theme.

---

## What stays the same

- Bigram tracking and analysis — mode-agnostic, works on any text
- Lifetime stats in IndexedDB — accumulate across all modes
- Weak bigram highlighting and coverage stats — unchanged
- Blending slider — unchanged

## What changes at mode switch

- Prompt queue regenerated immediately
- Run history reset (the new cycle starts fresh)
- `drillMode` saved to localStorage so it persists across sessions

---

## Order of implementation

1. `wordBanks.js` — compile the word lists
2. `constants.js` — add `DRILL_MODES`
3. `prompts.js` — drill-aware word sourcing + punctuation post-processing
4. `App.jsx` — state + mode switch handler + UI
5. `index.css` — mode selector styles

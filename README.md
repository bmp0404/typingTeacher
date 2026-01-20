# typingTeacher
# Starter Code

To run the project:

```bash
npm install && npm run dev


What's Implemented
Core typing mechanics
Keystroke capture, backspace support, and character-by-character highlighting (correct, incorrect, pending, current)

Run flow
5 prompts per cycle, auto-advance on completion with a brief transition delay

Live stats
WPM and accuracy calculated in real time, plus a run counter

Bigram analysis
analyzeRuns() extracts bigram error rates after each 5-run cycle

Weighted prompt generation
Words are scored by weak bigram density and selected with weighted probability

API integration
Primary (Vercel) and fallback (Heroku) random word APIs, plus a hardcoded fallback

Focus indicator
Shows targeted bigrams after analysis

Monkeytype-style dark UI
JetBrains Mono font, muted and accent colors, minimal layout

What's Left for Claude Code

KushCreates API integration
The spec mentions using startsWith and length params for more targeted word fetching.
Currently only using simpler random word APIs.

Hesitation detection
The timestamp field is captured but not used for detecting slow bigrams.
Could identify bigrams where timing is slow even without errors.

Edge case polish

"Nice work!" message when the user has no errors

Visual flash or animation on run completion

Better loading state when fetching new prompts mid-session

Modifier key handling
Currently ignores Shift, so capital letters are not properly handled.
Prompts are all lowercase for now, but this could be extended.


Optional Enhancements (from spec)
More sophisticated caret animation

Subtle run completion animation

Cumulative stats display (e.g., average WPM across cycles)



3. KushCreates Random Words API

Endpoint:
https://random-words-api.kushcreates.com/api

Arguments you can pass:

words=5 → number of words

category=animals | food | wordle | etc.

length=5 → fixed length

startsWith=t → constrain first letter

What it returns:
An array of objects with metadata.

[
  { "word": "tiger", "definition": "...", "pronunciation": "..." },
  { "word": "turtle", "definition": "...", "pronunciation": "..." }
]


Good for: themed runs, controlled difficulty, or forcing patterns like “all words start with t”.
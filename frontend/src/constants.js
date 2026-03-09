// constants.js
// RUNS_PER_CYCLE, WORDS_PER_PROMPT, RUN_TRANSITION_DELAY, FALLBACK_WORDS

export const RUNS_PER_CYCLE = 3;
export const WORDS_PER_PROMPT = 10; // TODO: Change back to 10 after testing
export const RUN_TRANSITION_DELAY = 400;

export const DRILL_MODES = {
  ADAPTIVE:    'adaptive',
  HOME_ROW:    'homeRow',
  TOP_ROW:     'topRow',
  PUNCTUATION: 'punctuation',
};

export const DRILL_LABELS = {
  adaptive:    'Adaptive',
  homeRow:     'Home Row',
  topRow:      'Top Row',
  punctuation: 'Punctuation',
};

// Common contractions - used as extra words in punctuation drill for apostrophe practice
export const PUNCTUATION_CONTRACTIONS = [
  "don't", "can't", "won't", "it's", "they're", "we're", "i've", "i'll",
  "you're", "he's", "she's", "isn't", "aren't", "wasn't", "weren't",
  "couldn't", "wouldn't", "shouldn't", "i'd", "you'd", "he'd", "they'd",
  "i'm", "that's", "there's", "here's", "what's", "who's", "how's",
];

// Fallback word list if APIs fail
export const FALLBACK_WORDS = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'pack',
  'my', 'box', 'with', 'five', 'dozen', 'liquor', 'jugs', 'how', 'vexingly',
  'fast', 'daft', 'zebras', 'jump', 'sphinx', 'of', 'black', 'quartz', 'judge',
  'vow', 'waltz', 'nymph', 'for', 'quick', 'jigs', 'vex', 'bud', 'flow',
  'program', 'keyboard', 'typing', 'practice', 'speed', 'accuracy', 'words',
  'letters', 'fingers', 'hands', 'swift', 'rapid', 'smooth', 'rhythm', 'focus',
  'train', 'learn', 'improve', 'master', 'skill', 'muscle', 'memory', 'pattern',
  'repeat', 'drill', 'session', 'target', 'weak', 'strong', 'better', 'best',
  'time', 'clock', 'minute', 'second', 'score', 'high', 'low', 'average',
  'think', 'thought', 'through', 'though', 'there', 'their', 'these', 'those',
  'which', 'where', 'when', 'what', 'while', 'would', 'could', 'should', 'might',
  'about', 'above', 'after', 'again', 'being', 'below', 'between', 'both',
  'bring', 'change', 'different', 'during', 'each', 'even', 'every', 'find',
  'first', 'follow', 'found', 'give', 'good', 'great', 'hand', 'help', 'here',
  'home', 'house', 'into', 'just', 'keep', 'kind', 'know', 'large', 'last',
  'leave', 'left', 'life', 'light', 'line', 'little', 'live', 'long', 'look',
  'made', 'make', 'many', 'mean', 'more', 'most', 'move', 'much', 'must',
  'name', 'need', 'never', 'next', 'night', 'number', 'off', 'often', 'old',
  'only', 'other', 'our', 'out', 'own', 'part', 'people', 'place', 'point'
];

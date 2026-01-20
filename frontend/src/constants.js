// constants.js
// RUNS_PER_CYCLE, WORDS_PER_PROMPT, RUN_TRANSITION_DELAY, FALLBACK_WORDS

export const RUNS_PER_CYCLE = 3;
export const WORDS_PER_PROMPT = 10; // TODO: Change back to 10 after testing
export const RUN_TRANSITION_DELAY = 400;

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

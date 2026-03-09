// prompts.js
// generatePrompts

import { RUNS_PER_CYCLE, WORDS_PER_PROMPT, DRILL_MODES, FALLBACK_WORDS, PUNCTUATION_CONTRACTIONS } from './constants';
import { shuffleArray } from './utils';
import { fetchRandomWords } from './api';
import { scoreWord } from './analysis';
import wordBanks from './wordBanks.json';

// Injects commas, periods, and semicolons between words to create
// punctuation practice text. Contractions in the word pool handle apostrophes.
function injectPunctuation(words) {
  const result = [...words];
  for (let i = 0; i < result.length - 1; i++) {
    const r = Math.random();
    if (r < 0.30)      result[i] += ',';
    else if (r < 0.40) result[i] += '.';
    else if (r < 0.45) result[i] += ';';
  }
  return result.join(' ');
}

// Build a word pool targeted at the given weak bigrams using the pre-built
// bigramWords map. Falls back to FALLBACK_WORDS if the pool is too thin.
function buildAdaptivePool(weakBigrams) {
  const poolSet = new Set();
  for (const bigram of weakBigrams) {
    for (const w of (wordBanks.bigramWords[bigram] || [])) {
      poolSet.add(w);
    }
  }
  const pool = [...poolSet];
  return pool.length >= 30 ? pool : [...pool, ...FALLBACK_WORDS];
}

// Weighted selection: words containing more target bigrams are picked more often.
function weightedSelect(words, weakBigrams, count) {
  const scored = words.map(w => ({ word: w, score: scoreWord(w, weakBigrams) }));
  const selected = [];
  const pool = [...scored];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, w) => sum + w.score + 1, 0);
    let rand = Math.random() * totalWeight;
    for (let k = 0; k < pool.length; k++) {
      rand -= (pool[k].score + 1);
      if (rand <= 0) {
        selected.push(pool[k].word);
        pool.splice(k, 1);
        break;
      }
    }
  }
  return selected;
}

export async function generatePrompts(weakBigrams = [], count = RUNS_PER_CYCLE, drillMode = DRILL_MODES.ADAPTIVE) {
  // Determine the word pool for this mode
  let wordPool;

  if (drillMode === DRILL_MODES.HOME_ROW) {
    wordPool = wordBanks.homeRow;
  } else if (drillMode === DRILL_MODES.TOP_ROW) {
    wordPool = wordBanks.topRow;
  } else if (drillMode === DRILL_MODES.PUNCTUATION) {
    wordPool = [...FALLBACK_WORDS, ...PUNCTUATION_CONTRACTIONS];
  } else {
    // ADAPTIVE: use bigramWords for targeted practice, API for the very first run
    wordPool = weakBigrams.length > 0
      ? buildAdaptivePool(weakBigrams)
      : await fetchRandomWords(50);
  }

  const prompts = [];

  for (let i = 0; i < count; i++) {
    const shuffled = shuffleArray([...wordPool]);

    const selectedWords = weakBigrams.length > 0
      ? weightedSelect(shuffled, weakBigrams, WORDS_PER_PROMPT)
      : shuffled.slice(0, WORDS_PER_PROMPT);

    const prompt = drillMode === DRILL_MODES.PUNCTUATION
      ? injectPunctuation(selectedWords)
      : selectedWords.join(' ');

    prompts.push(prompt);
  }

  return prompts;
}

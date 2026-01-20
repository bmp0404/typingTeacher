// prompts.js
// generatePrompts

import { RUNS_PER_CYCLE, WORDS_PER_PROMPT } from './constants';
import { shuffleArray } from './utils';
import { fetchRandomWords } from './api';
import { scoreWord } from './analysis';

export async function generatePrompts(weakBigrams = [], count = RUNS_PER_CYCLE) {
  const words = await fetchRandomWords(50);
  const prompts = [];

  for (let i = 0; i < count; i++) {
    let selectedWords;

    if (weakBigrams.length === 0) {
      // No weaknesses yet - just random words
      selectedWords = shuffleArray(words).slice(0, WORDS_PER_PROMPT);
    } else {
      // Score and weight selection toward weak bigrams
      const scored = words.map(w => ({ word: w, score: scoreWord(w, weakBigrams) }));

      // Weighted selection: higher scores more likely to be picked
      selectedWords = [];
      const pool = [...scored];

      for (let j = 0; j < WORDS_PER_PROMPT && pool.length > 0; j++) {
        // Add score + 1 to give all words a chance
        const totalWeight = pool.reduce((sum, w) => sum + w.score + 1, 0);
        let random = Math.random() * totalWeight;

        for (let k = 0; k < pool.length; k++) {
          random -= (pool[k].score + 1);
          if (random <= 0) {
            selectedWords.push(pool[k].word);
            pool.splice(k, 1);
            break;
          }
        }
      }
    }

    prompts.push(selectedWords.join(' '));
  }

  return prompts;
}

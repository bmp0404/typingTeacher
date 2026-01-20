// api.js
// fetchRandomWords

import { shuffleArray } from './utils';
import { FALLBACK_WORDS } from './constants';

export async function fetchRandomWords(count = 50) {
  // Try primary API first
  try {
    const response = await fetch(
      `https://random-word-api.vercel.app/api?words=${count}`
    );
    if (response.ok) {
      const words = await response.json();
      // Filter to reasonable word lengths (3-10 chars)
      return words.filter(w => w.length >= 3 && w.length <= 10);
    }
  } catch (e) {
    console.warn('Primary API failed, trying fallback...');
  }

  // Try fallback API
  try {
    const response = await fetch(
      `https://random-word-api.herokuapp.com/word?number=${count}`
    );
    if (response.ok) {
      const words = await response.json();
      return words.filter(w => w.length >= 3 && w.length <= 10);
    }
  } catch (e) {
    console.warn('Fallback API failed, using local words');
  }

  // Return shuffled fallback words
  return shuffleArray(FALLBACK_WORDS).slice(0, count);
}

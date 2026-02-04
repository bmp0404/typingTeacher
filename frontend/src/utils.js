// utils.js
// shuffleArray, getBigrams

export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getBigrams(word) {
  const bigrams = [];
  for (let i = 0; i < word.length - 1; i++) {
    bigrams.push(word[i] + word[i + 1]);
  }
  return bigrams;
}

export function getWeakBigramPositions(text, weakBigrams) {
  const positions = new Set();
  const weakSet = new Set(weakBigrams);

  for (let i = 0; i < text.length - 1; i++) {
    const bigram = text[i] + text[i + 1];
    if (weakSet.has(bigram)) {
      positions.add(i);
      positions.add(i + 1);
    }
  }

  return positions;
}

export function calculateWeakBigramCoverage(prompts, weakBigrams) {
  const weakSet = new Set(weakBigrams);
  let totalWords = 0;
  let wordsWithWeakBigrams = 0;

  for (const prompt of prompts) {
    const words = prompt.split(' ');
    for (const word of words) {
      totalWords++;
      for (let i = 0; i < word.length - 1; i++) {
        if (weakSet.has(word[i] + word[i + 1])) {
          wordsWithWeakBigrams++;
          break;
        }
      }
    }
  }

  return {
    totalWords,
    wordsWithWeakBigrams,
    percentage: totalWords > 0
      ? Math.round((wordsWithWeakBigrams / totalWords) * 100)
      : 0
  };
}

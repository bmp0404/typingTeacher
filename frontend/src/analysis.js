// analysis.js
// analyzeRuns, getWeakBigrams, scoreWord

import { getBigrams } from './utils';

export function analyzeRuns(runs) {
  const stats = new Map();

  for (const run of runs) {
    for (let i = 0; i < run.events.length - 1; i++) {
      const bigram = run.events[i].expected + run.events[i + 1].expected;
      const existing = stats.get(bigram) || { attempts: 0, errors: 0 };
      existing.attempts++;
      if (run.events[i + 1].actual !== run.events[i + 1].expected) {
        existing.errors++;
      }
      stats.set(bigram, existing);
    }
  }

  return stats;
}

export function getWeakBigrams(bigramStats, minAttempts = 3, topN = 10) {
  const sorted = Array.from(bigramStats.entries())
    .filter(([_, stats]) => stats.attempts >= minAttempts)
    .map(([bigram, stats]) => ({
      bigram,
      errorRate: stats.errors / stats.attempts,
      ...stats
    }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, topN);

  return sorted.filter(b => b.errorRate > 0).map(b => b.bigram);
}

// Returns detailed stats for UI display
export function getWeakBigramsDetailed(bigramStats, minAttempts = 3, topN = 10) {
  const sorted = Array.from(bigramStats.entries())
    .filter(([_, stats]) => stats.attempts >= minAttempts)
    .map(([bigram, stats]) => ({
      bigram,
      errorRate: stats.errors / stats.attempts,
      ...stats
    }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, topN);

  return sorted.filter(b => b.errorRate > 0);
}

export function scoreWord(word, weakBigrams) {
  if (!weakBigrams.length) return 0;
  const wordBigrams = getBigrams(word.toLowerCase());
  return wordBigrams.filter(b => weakBigrams.includes(b)).length;
}

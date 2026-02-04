// analysis.js
// Error analysis, timing analysis, and combined weakness scoring

import { getBigrams } from './utils';

// ============================================
// ERROR ANALYSIS
// ============================================

export function analyzeRuns(runs) {
  const stats = new Map();

  for (const run of runs) {
    for (let i = 0; i < run.events.length - 1; i++) {
      const bigram = run.events[i].expected + run.events[i + 1].expected;
      if (bigram.includes(' ')) continue;

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

// ============================================
// TIMING ANALYSIS
// ============================================

export function analyzeBigramTiming(runs) {
  const timingStats = new Map();

  for (const run of runs) {
    for (let i = 0; i < run.events.length - 1; i++) {
      const bigram = run.events[i].expected + run.events[i + 1].expected;
      if (bigram.includes(' ')) continue;

      const delta = run.events[i + 1].timestamp - run.events[i].timestamp;

      const existing = timingStats.get(bigram) || { totalTime: 0, count: 0 };
      existing.totalTime += delta;
      existing.count++;
      timingStats.set(bigram, existing);
    }
  }

  return timingStats;
}

// Calculate overall average time across all bigrams
export function calculateOverallAvgTime(timingStats) {
  let totalTime = 0;
  let totalCount = 0;

  for (const stats of timingStats.values()) {
    totalTime += stats.totalTime;
    totalCount += stats.count;
  }

  return totalCount > 0 ? totalTime / totalCount : 0;
}

// ============================================
// COMBINED ANALYSIS
// ============================================

export function combineAnalysis(errorStats, timingStats) {
  const combined = new Map();

  // Add all bigrams from error stats
  for (const [bigram, eStats] of errorStats.entries()) {
    const tStats = timingStats.get(bigram) || { totalTime: 0, count: 0 };

    combined.set(bigram, {
      attempts: eStats.attempts,
      errors: eStats.errors,
      errorRate: eStats.errors / eStats.attempts,
      totalTime: tStats.totalTime,
      count: tStats.count,
      avgTime: tStats.count > 0 ? tStats.totalTime / tStats.count : 0
    });
  }

  // Add any bigrams that only exist in timing stats (shouldn't happen, but safe)
  for (const [bigram, tStats] of timingStats.entries()) {
    if (!combined.has(bigram)) {
      combined.set(bigram, {
        attempts: 0,
        errors: 0,
        errorRate: 0,
        totalTime: tStats.totalTime,
        count: tStats.count,
        avgTime: tStats.count > 0 ? tStats.totalTime / tStats.count : 0
      });
    }
  }

  return combined;
}

// ============================================
// WEAKNESS SCORING
// ============================================

export function getWeakBigramsCombined(
  combinedStats,
  overallAvgTime,
  options = {}
) {
  const {
    minAttempts = 3,
    topN = 10,
    errorWeight = 0.6,
    timingWeight = 0.4
  } = options;

  const scored = Array.from(combinedStats.entries())
    .filter(([_, stats]) => stats.attempts >= minAttempts)
    .map(([bigram, stats]) => {
      // Error factor: 0 to 1
      const errorFactor = stats.errorRate;

      // Raw timing difference (can be negative for faster-than-average)
      // e.g., avgTime=150, overallAvg=100 → timingDiff = 0.5 (50% slower)
      // e.g., avgTime=80, overallAvg=100 → timingDiff = -0.2 (20% faster)
      const timingDiff = overallAvgTime > 0
        ? (stats.avgTime - overallAvgTime) / overallAvgTime
        : 0;

      // Slowness factor for scoring (clamped to 0 - fast bigrams don't reduce score)
      const slownessFactor = Math.max(0, timingDiff);

      // Combined weakness score
      const weaknessScore = (errorFactor * errorWeight) + (slownessFactor * timingWeight);

      return {
        bigram,
        weaknessScore,
        errorRate: stats.errorRate,
        avgTime: Math.round(stats.avgTime),
        timingDiff: Math.round(timingDiff * 100), // as percentage (can be negative)
        attempts: stats.attempts,
        errors: stats.errors
      };
    })
    .filter(b => b.weaknessScore > 0)
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, topN);

  return scored;
}

// Returns just the bigram strings (for scoreWord compatibility)
export function getWeakBigramNames(combinedStats, overallAvgTime, options = {}) {
  const detailed = getWeakBigramsCombined(combinedStats, overallAvgTime, options);
  return detailed.map(b => b.bigram);
}

// ============================================
// WORD SCORING
// ============================================

export function scoreWord(word, weakBigrams) {
  if (!weakBigrams.length) return 0;
  const wordBigrams = getBigrams(word.toLowerCase());
  return wordBigrams.filter(b => weakBigrams.includes(b)).length;
}

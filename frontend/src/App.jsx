// App.jsx

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { RUNS_PER_CYCLE, RUN_TRANSITION_DELAY } from './constants';
import {
  analyzeRuns,
  analyzeBigramTiming,
  calculateOverallAvgTime,
  combineAnalysis,
  getWeakBigramsCombined,
  getWeakBigramNames
} from './analysis';
import { generatePrompts } from './prompts';
import { getWeakBigramPositions, calculateWeakBigramCoverage } from './utils';
import {
  initDB,
  createSession,
  saveRun,
  updateBigramStats,
  getWeakestBigrams,
  updateSession,
  clearAllData
} from './db';

export default function App() {
  // Core state
  const [promptQueue, setPromptQueue] = useState([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [runHistory, setRunHistory] = useState([]);
  const [weakBigrams, setWeakBigrams] = useState([]);
  const [weakBigramsDetailed, setWeakBigramsDetailed] = useState([]);
  const [overallAvgTime, setOverallAvgTime] = useState(0);

  // Current run state
  const [typedChars, setTypedChars] = useState([]);
  const [keystrokeEvents, setKeystrokeEvents] = useState([]);
  const [startTime, setStartTime] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [cycleCount, setCycleCount] = useState(1);

  // Database state
  const [sessionId, setSessionId] = useState(null);
  const [isDbReady, setIsDbReady] = useState(false);

  // Coverage state
  const [promptCoverage, setPromptCoverage] = useState(null);

  // Refs
  const containerRef = useRef(null);

  const currentPrompt = promptQueue[currentPromptIndex] || '';
  const cursorPosition = typedChars.length;

  // ============================================
  // COMPUTED VALUES
  // ============================================

  // Calculate live WPM
  const calculateWPM = useCallback(() => {
    if (!startTime || typedChars.length === 0) return 0;
    const timeElapsed = (Date.now() - startTime) / 1000 / 60; // in minutes
    const wordsTyped = typedChars.length / 5; // standard: 5 chars = 1 word
    return Math.round(wordsTyped / timeElapsed);
  }, [startTime, typedChars.length]);

  // Calculate accuracy
  const calculateAccuracy = useCallback(() => {
    if (typedChars.length === 0) return 100;
    const correct = typedChars.filter((char, i) => char === currentPrompt[i]).length;
    return Math.round((correct / typedChars.length) * 100);
  }, [typedChars, currentPrompt]);

  const wpm = calculateWPM();
  const accuracy = calculateAccuracy();
  const runNumber = (currentPromptIndex % RUNS_PER_CYCLE) + 1;

  // Positions of weak bigram characters in the current prompt
  const weakPositions = useMemo(
    () => getWeakBigramPositions(currentPrompt, weakBigrams),
    [currentPrompt, weakBigrams]
  );

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    async function init() {
      setIsLoading(true);

      // Initialize database
      try {
        await initDB();
        setIsDbReady(true);

        // Create a new session
        const newSessionId = await createSession();
        setSessionId(newSessionId);

        // Load lifetime weak bigrams to influence initial prompts
        const lifetimeWeakBigrams = await getWeakestBigrams(10);

        if (lifetimeWeakBigrams.length > 0) {
          setWeakBigrams(lifetimeWeakBigrams);
        }

        // Generate prompts (using lifetime weak bigrams if available)
        const prompts = await generatePrompts(lifetimeWeakBigrams);
        setPromptQueue(prompts);

        if (lifetimeWeakBigrams.length > 0) {
          setPromptCoverage(calculateWeakBigramCoverage(prompts, lifetimeWeakBigrams));
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // Fall back to generating prompts without DB
        const prompts = await generatePrompts([]);
        setPromptQueue(prompts);
      }

      setIsLoading(false);
    }
    init();
  }, []);

  // Focus container for keyboard capture
  useEffect(() => {
    if (containerRef.current && !isLoading) {
      containerRef.current.focus();
    }
  }, [isLoading, currentPromptIndex]);

  // Finalize session on page unload
  useEffect(() => {
    const handleUnload = () => {
      if (isDbReady && sessionId) {
        updateSession(sessionId, { endTime: Date.now() });
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isDbReady, sessionId]);

  // ============================================
  // RUN COMPLETION LOGIC
  // ============================================

  const completeRun = useCallback(async () => {
    const finalWPM = calculateWPM();
    const finalAccuracy = calculateAccuracy();
    const currentRunNumber = (runHistory.length % RUNS_PER_CYCLE) + 1;
    const currentCycleNumber = Math.floor(runHistory.length / RUNS_PER_CYCLE) + 1;

    const runResult = {
      events: keystrokeEvents,
      wpm: finalWPM,
      accuracy: finalAccuracy
    };

    const newHistory = [...runHistory, runResult];
    setRunHistory(newHistory);

    // Save run to database
    if (isDbReady && sessionId) {
      try {
        await saveRun({
          sessionId,
          cycleNumber: currentCycleNumber,
          runNumber: currentRunNumber,
          wpm: finalWPM,
          accuracy: finalAccuracy,
          events: keystrokeEvents
        });
      } catch (error) {
        console.error('Failed to save run:', error);
      }
    }

    // Check if we've completed a cycle
    if (newHistory.length % RUNS_PER_CYCLE === 0) {
      setIsTransitioning(true);

      // Analyze the last cycle's runs
      const lastCycleRuns = newHistory.slice(-RUNS_PER_CYCLE);

      // Error analysis
      const errorStats = analyzeRuns(lastCycleRuns);

      // Timing analysis
      const timingStats = analyzeBigramTiming(lastCycleRuns);
      const avgTime = calculateOverallAvgTime(timingStats);

      // Combined analysis
      const combinedStats = combineAnalysis(errorStats, timingStats);

      // Get weak bigrams (combined scoring)
      const newWeakBigramsDetailed = getWeakBigramsCombined(combinedStats, avgTime);
      const newWeakBigrams = getWeakBigramNames(combinedStats, avgTime);

      setWeakBigrams(newWeakBigrams);
      setWeakBigramsDetailed(newWeakBigramsDetailed);
      setOverallAvgTime(Math.round(avgTime));

      // Update lifetime bigram stats in database
      if (isDbReady) {
        try {
          // Build a map with the data structure db.js expects
          const bigramDataForDb = new Map();
          for (const [bigram, stats] of combinedStats.entries()) {
            bigramDataForDb.set(bigram, {
              attempts: stats.attempts,
              errors: stats.errors,
              totalTime: stats.totalTime,
              count: stats.count
            });
          }
          await updateBigramStats(bigramDataForDb);

          // Update session cycle count
          if (sessionId) {
            await updateSession(sessionId, { totalCycles: currentCycleNumber });
          }
        } catch (error) {
          console.error('Failed to update bigram stats:', error);
        }
      }

      // Generate new prompts targeting weaknesses
      const newPrompts = await generatePrompts(newWeakBigrams);
      setPromptCoverage(calculateWeakBigramCoverage(newPrompts, newWeakBigrams));

      setTimeout(() => {
        setPromptQueue(newPrompts);
        setCurrentPromptIndex(0);
        setTypedChars([]);
        setKeystrokeEvents([]);
        setStartTime(null);
        setCycleCount(c => c + 1);
        setIsTransitioning(false);
      }, RUN_TRANSITION_DELAY);
    } else {
      // Move to next prompt in current cycle
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentPromptIndex(i => i + 1);
        setTypedChars([]);
        setKeystrokeEvents([]);
        setStartTime(null);
        setIsTransitioning(false);
      }, RUN_TRANSITION_DELAY);
    }
  }, [runHistory, keystrokeEvents, calculateWPM, calculateAccuracy, isDbReady, sessionId]);

  // ============================================
  // KEYSTROKE HANDLING
  // ============================================

  const handleKeyDown = useCallback((e) => {
    if (isLoading || isTransitioning) return;

    // Ignore modifier keys
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    // Start timer on first keystroke
    if (startTime === null && e.key.length === 1) {
      setStartTime(Date.now());
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (typedChars.length > 0) {
        setTypedChars(chars => chars.slice(0, -1));
        // Note: We don't remove from keystrokeEvents - errors are still recorded
      }
      return;
    }

    // Only handle printable characters
    if (e.key.length !== 1) return;

    e.preventDefault();

    const expected = currentPrompt[cursorPosition];
    const actual = e.key;

    // Record keystroke event
    const event = {
      expected,
      actual,
      timestamp: Date.now()
    };

    setKeystrokeEvents(events => [...events, event]);
    setTypedChars(chars => [...chars, actual]);

    // Check for run completion (typed entire prompt)
    if (cursorPosition + 1 >= currentPrompt.length) {
      completeRun();
    }
  }, [isLoading, isTransitioning, startTime, currentPrompt, cursorPosition, typedChars, completeRun]);

  // ============================================
  // RESTART HANDLER
  // ============================================

  const handleRestart = useCallback(async () => {
    setIsLoading(true);
    const newPrompts = await generatePrompts(weakBigrams);
    setPromptQueue(newPrompts);
    setCurrentPromptIndex(0);
    setTypedChars([]);
    setKeystrokeEvents([]);
    setStartTime(null);
    if (weakBigrams.length > 0) {
      setPromptCoverage(calculateWeakBigramCoverage(newPrompts, weakBigrams));
    }
    setIsLoading(false);
    // Re-focus the container after restart
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, [weakBigrams]);

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="app loading">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <div
      className="app"
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="typing-container">
        {/* Prompt Display */}
        <div className={`prompt ${isTransitioning ? 'transitioning' : ''}`}>
          {currentPrompt.split('').map((char, i) => {
            let className = 'char';

            if (i < typedChars.length) {
              // Already typed
              className += typedChars[i] === char ? ' correct' : ' incorrect';
            } else if (i === cursorPosition) {
              // Current position
              className += ' current';
            } else {
              // Not yet typed
              className += ' pending';
            }

            if (weakPositions.has(i)) {
              className += ' weak-bigram';
            }

            return (
              <span key={i} className={className}>
                {char}
              </span>
            );
          })}
          <span className="caret" style={{ left: `${cursorPosition}ch` }} />
        </div>

        {/* Stats Bar */}
        <div className="stats-bar">
          <span className="stat">{wpm} wpm</span>
          <span className="stat-divider">•</span>
          <span className="stat">{accuracy}%</span>
          <span className="stat-divider">•</span>
          <span className="stat">Run {runNumber}/{RUNS_PER_CYCLE}</span>
        </div>

        {/* Restart Button */}
        <button
          className="restart-btn"
          onClick={handleRestart}
          tabIndex={-1}
        >
          Restart Cycle
        </button>

        {/* Reset Data Button */}
        <button
          className="reset-data-btn"
          onClick={async () => {
            if (window.confirm('Clear all saved data? This cannot be undone.')) {
              await clearAllData();
              window.location.reload();
            }
          }}
          tabIndex={-1}
        >
          Reset All Data
        </button>

        {/* Coverage Stats */}
        {promptCoverage && weakBigrams.length > 0 && (
          <div className="coverage-stats">
            Targeting: {promptCoverage.wordsWithWeakBigrams}/{promptCoverage.totalWords} words
            contain weak bigrams ({promptCoverage.percentage}%)
          </div>
        )}

        {/* Weak Bigrams Display */}
        {weakBigramsDetailed.length > 0 && (
          <div className="weak-bigrams-panel">
            <div className="weak-bigrams-title">Weak Bigrams (Top 10)</div>
            <div className="weak-bigrams-avg">
              Avg bigram time: {overallAvgTime}ms
            </div>
            <div className="weak-bigrams-header">
              <span className="header-rank">#</span>
              <span className="header-bigram">Bigram</span>
              <span className="header-score">Score</span>
              <span className="header-error">Error</span>
              <span className="header-time">Time</span>
            </div>
            <div className="weak-bigrams-list">
              {weakBigramsDetailed.map((item, index) => (
                <div key={item.bigram} className="weak-bigram-item">
                  <span className="weak-bigram-rank">{index + 1}.</span>
                  <span className="weak-bigram-text">"{item.bigram}"</span>
                  <span className="weak-bigram-score">
                    {(item.weaknessScore * 100).toFixed(0)}
                  </span>
                  <span className="weak-bigram-rate">
                    {Math.round(item.errorRate * 100)}%
                  </span>
                  <span className="weak-bigram-time">
                    {item.avgTime}ms
                    <span className={item.timingDiff >= 0 ? 'timing-slow' : 'timing-fast'}>
                      ({item.timingDiff >= 0 ? '+' : ''}{item.timingDiff}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

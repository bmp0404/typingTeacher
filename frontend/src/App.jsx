// App.jsx

import { useState, useEffect, useCallback, useRef } from 'react';
import { RUNS_PER_CYCLE, RUN_TRANSITION_DELAY } from './constants';
import { analyzeRuns, getWeakBigrams, getWeakBigramsDetailed } from './analysis';
import { generatePrompts } from './prompts';

export default function App() {
  // Core state
  const [promptQueue, setPromptQueue] = useState([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [runHistory, setRunHistory] = useState([]);
  const [weakBigrams, setWeakBigrams] = useState([]);
  const [weakBigramsDetailed, setWeakBigramsDetailed] = useState([]);

  // Current run state
  const [typedChars, setTypedChars] = useState([]);
  const [keystrokeEvents, setKeystrokeEvents] = useState([]);
  const [startTime, setStartTime] = useState(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [cycleCount, setCycleCount] = useState(1);

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

  // ============================================
  // INITIALIZATION
  // ============================================

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const prompts = await generatePrompts([]);
      setPromptQueue(prompts);
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

  // ============================================
  // RUN COMPLETION LOGIC
  // ============================================

  const completeRun = useCallback(async () => {
    const finalWPM = calculateWPM();
    const finalAccuracy = calculateAccuracy();

    const runResult = {
      events: keystrokeEvents,
      wpm: finalWPM,
      accuracy: finalAccuracy
    };

    const newHistory = [...runHistory, runResult];
    setRunHistory(newHistory);

    // Check if we've completed a cycle
    if (newHistory.length % RUNS_PER_CYCLE === 0) {
      setIsTransitioning(true);

      // Analyze the last 5 runs
      const lastFiveRuns = newHistory.slice(-RUNS_PER_CYCLE);
      const bigramStats = analyzeRuns(lastFiveRuns);
      const newWeakBigrams = getWeakBigrams(bigramStats);
      const newWeakBigramsDetailed = getWeakBigramsDetailed(bigramStats);

      setWeakBigrams(newWeakBigrams);
      setWeakBigramsDetailed(newWeakBigramsDetailed);

      // Generate new prompts targeting weaknesses
      const newPrompts = await generatePrompts(newWeakBigrams);

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
  }, [runHistory, keystrokeEvents, calculateWPM, calculateAccuracy]);

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

        {/* Weak Bigrams Display */}
        {weakBigramsDetailed.length > 0 && (
          <div className="weak-bigrams-panel">
            <div className="weak-bigrams-title">Weak Bigrams (Top 10)</div>
            <div className="weak-bigrams-list">
              {weakBigramsDetailed.map((item, index) => (
                <div key={item.bigram} className="weak-bigram-item">
                  <span className="weak-bigram-rank">{index + 1}.</span>
                  <span className="weak-bigram-text">"{item.bigram}"</span>
                  <span className="weak-bigram-rate">
                    {Math.round(item.errorRate * 100)}% err
                  </span>
                  <span className="weak-bigram-count">
                    ({item.errors}/{item.attempts})
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

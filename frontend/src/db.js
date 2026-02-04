// db.js - IndexedDB persistence layer

const DB_NAME = 'typingTeacherDB';
const DB_VERSION = 1;

let db = null;

// ============================================
// DATABASE INITIALIZATION
// ============================================

export function initDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Sessions store - tracks each typing session
      if (!database.objectStoreNames.contains('sessions')) {
        const sessionsStore = database.createObjectStore('sessions', {
          keyPath: 'id',
          autoIncrement: true
        });
        sessionsStore.createIndex('startTime', 'startTime', { unique: false });
      }

      // Runs store - individual typing runs with keystroke events
      if (!database.objectStoreNames.contains('runs')) {
        const runsStore = database.createObjectStore('runs', {
          keyPath: 'id',
          autoIncrement: true
        });
        runsStore.createIndex('sessionId', 'sessionId', { unique: false });
        runsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Bigram stats store - lifetime aggregates per bigram
      if (!database.objectStoreNames.contains('bigramStats')) {
        database.createObjectStore('bigramStats', {
          keyPath: 'bigram'
        });
      }
    };
  });
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export function createSession() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');

    const session = {
      startTime: Date.now(),
      endTime: null,
      totalRuns: 0,
      totalCycles: 0,
      avgWpm: 0,
      avgAccuracy: 0
    };

    const request = store.add(session);

    request.onsuccess = () => {
      resolve(request.result); // Returns the auto-generated id
    };

    request.onerror = () => {
      console.error('Failed to create session:', request.error);
      reject(request.error);
    };
  });
}

export function updateSession(sessionId, data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');

    const getRequest = store.get(sessionId);

    getRequest.onsuccess = () => {
      const session = getRequest.result;
      if (!session) {
        reject(new Error('Session not found'));
        return;
      }

      const updated = { ...session, ...data };
      const putRequest = store.put(updated);

      putRequest.onsuccess = () => resolve(updated);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

export function getSession(sessionId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const request = store.get(sessionId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getAllSessions() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// RUN MANAGEMENT
// ============================================

export function saveRun(runData) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['runs', 'sessions'], 'readwrite');
    const runsStore = transaction.objectStore('runs');
    const sessionsStore = transaction.objectStore('sessions');

    const run = {
      sessionId: runData.sessionId,
      cycleNumber: runData.cycleNumber,
      runNumber: runData.runNumber,
      wpm: runData.wpm,
      accuracy: runData.accuracy,
      timestamp: Date.now(),
      events: runData.events
    };

    const addRequest = runsStore.add(run);

    addRequest.onsuccess = () => {
      // Update session stats
      const getRequest = sessionsStore.get(runData.sessionId);

      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (session) {
          const newTotalRuns = session.totalRuns + 1;
          // Running average calculation
          const newAvgWpm = ((session.avgWpm * session.totalRuns) + runData.wpm) / newTotalRuns;
          const newAvgAccuracy = ((session.avgAccuracy * session.totalRuns) + runData.accuracy) / newTotalRuns;

          sessionsStore.put({
            ...session,
            totalRuns: newTotalRuns,
            avgWpm: Math.round(newAvgWpm),
            avgAccuracy: Math.round(newAvgAccuracy),
            endTime: Date.now()
          });
        }
      };

      resolve(addRequest.result);
    };

    addRequest.onerror = () => {
      console.error('Failed to save run:', addRequest.error);
      reject(addRequest.error);
    };
  });
}

export function getRunsBySession(sessionId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['runs'], 'readonly');
    const store = transaction.objectStore('runs');
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getRecentRuns(limit = 10) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['runs'], 'readonly');
    const store = transaction.objectStore('runs');
    const index = store.index('timestamp');

    const runs = [];
    const request = index.openCursor(null, 'prev'); // Descending order

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && runs.length < limit) {
        runs.push(cursor.value);
        cursor.continue();
      } else {
        resolve(runs);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

// ============================================
// BIGRAM STATS MANAGEMENT
// ============================================

export function updateBigramStats(bigramMap) {
  // bigramMap is a Map with structure: bigram -> { attempts, errors, totalTime, count }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['bigramStats'], 'readwrite');
    const store = transaction.objectStore('bigramStats');

    const updates = [];

    for (const [bigram, stats] of bigramMap.entries()) {
      updates.push(
        new Promise((res, rej) => {
          const getRequest = store.get(bigram);

          getRequest.onsuccess = () => {
            const existing = getRequest.result;

            const updated = {
              bigram,
              totalAttempts: (existing?.totalAttempts || 0) + stats.attempts,
              totalErrors: (existing?.totalErrors || 0) + stats.errors,
              totalTime: (existing?.totalTime || 0) + stats.totalTime,
              totalCount: (existing?.totalCount || 0) + stats.count,
              lastUpdated: Date.now()
            };

            const putRequest = store.put(updated);
            putRequest.onsuccess = () => res(updated);
            putRequest.onerror = () => rej(putRequest.error);
          };

          getRequest.onerror = () => rej(getRequest.error);
        })
      );
    }

    Promise.all(updates)
      .then(resolve)
      .catch(reject);
  });
}

export function getAllBigramStats() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['bigramStats'], 'readonly');
    const store = transaction.objectStore('bigramStats');
    const request = store.getAll();

    request.onsuccess = () => {
      // Convert array to Map for easier consumption
      const statsMap = new Map();
      for (const stat of request.result) {
        statsMap.set(stat.bigram, stat);
      }
      resolve(statsMap);
    };

    request.onerror = () => reject(request.error);
  });
}

export function getWeakestBigrams(limit = 10) {
  return new Promise((resolve, reject) => {
    getAllBigramStats()
      .then((statsMap) => {
        const scored = [];

        for (const [bigram, stats] of statsMap.entries()) {
          // Only consider bigrams with enough attempts
          if (stats.totalAttempts < 5) continue;

          const errorRate = stats.totalErrors / stats.totalAttempts;
          const avgTime = stats.totalTime / stats.totalCount;

          scored.push({
            bigram,
            errorRate,
            avgTime,
            attempts: stats.totalAttempts,
            errors: stats.totalErrors,
            // Simple weakness score based on error rate
            // (timing comparison requires overall avg which we don't have here)
            weaknessScore: errorRate
          });
        }

        // Sort by weakness score descending
        scored.sort((a, b) => b.weaknessScore - a.weaknessScore);

        // Return just the bigram strings
        resolve(scored.slice(0, limit).map(s => s.bigram));
      })
      .catch(reject);
  });
}

// ============================================
// UTILITY
// ============================================

export function clearAllData() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['sessions', 'runs', 'bigramStats'], 'readwrite');

    transaction.objectStore('sessions').clear();
    transaction.objectStore('runs').clear();
    transaction.objectStore('bigramStats').clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

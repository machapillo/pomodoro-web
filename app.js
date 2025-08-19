(() => {
  'use strict';

  // Elements
  const workEl = document.getElementById('work');
  const shortBreakEl = document.getElementById('shortBreak');
  const longBreakEl = document.getElementById('longBreak');
  const cyclesEl = document.getElementById('cycles');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const timeEl = document.getElementById('time-remaining');
  const percentEl = document.getElementById('percentage');
  const progressBar = document.getElementById('progress-bar');
  const stateEmojiEl = document.getElementById('state-emoji');
  const stateLabelEl = document.getElementById('state-label');
  const cycleLabelEl = document.getElementById('cycle-label');

  // Audio (optional)
  let bell;
  try {
    bell = new Audio('bell.mp3');
  } catch (_) {
    bell = null;
  }

  // State
  let timerId = null; // interval id
  let phase = 'work'; // 'work' | 'short' | 'long'
  let sessionCount = 0;
  let currentCycle = 0; // 1..cycles during work/short, 0 during long
  let totalSeconds = 0;
  let remainingSeconds = 0;
  let startTs = 0;

  function clampInt(v, min) {
    v = parseInt(v, 10);
    if (Number.isNaN(v)) return min;
    return Math.max(min, v);
  }

  function readSettings() {
    return {
      work: clampInt(workEl.value, 1),
      shortBreak: clampInt(shortBreakEl.value, 1),
      longBreak: clampInt(longBreakEl.value, 1),
      cycles: clampInt(cyclesEl.value, 1),
    };
  }

  function mmss(sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function setPhase(newPhase, opts = {}) {
    const { work, shortBreak, longBreak, cycles } = readSettings();
    phase = newPhase;

    if (phase === 'work') {
      sessionCount += 1;
      currentCycle = ((sessionCount - 1) % cycles) + 1;
      totalSeconds = work * 60;
      stateEmojiEl.textContent = '🍅';
      stateLabelEl.textContent = '作業中';
      cycleLabelEl.textContent = ` [${currentCycle}/${cycles}]`;
    } else if (phase === 'short') {
      totalSeconds = shortBreak * 60;
      stateEmojiEl.textContent = '☕';
      stateLabelEl.textContent = '短い休憩';
      cycleLabelEl.textContent = ` [${currentCycle}/${cycles}]`;
    } else if (phase === 'long') {
      totalSeconds = longBreak * 60;
      stateEmojiEl.textContent = '🛌';
      stateLabelEl.textContent = '長い休憩';
      cycleLabelEl.textContent = '';
      currentCycle = 0;
    }

    remainingSeconds = totalSeconds;
    startTs = performance.now();
    updateView();

    if (!opts.paused) startTicking();
  }

  function nextPhase() {
    const { cycles } = readSettings();
    if (phase === 'work') {
      if (sessionCount % cycles === 0) {
        return setPhase('long');
      }
      return setPhase('short');
    } else if (phase === 'short') {
      return setPhase('work');
    } else {
      return setPhase('work');
    }
  }

  function startTicking() {
    stopTicking();
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;

    startTs = performance.now();
    const initialRemaining = remainingSeconds;

    timerId = setInterval(() => {
      const elapsedMs = performance.now() - startTs;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      remainingSeconds = Math.max(0, initialRemaining - elapsedSec);
      updateView();

      if (remainingSeconds <= 0) {
        stopTicking();
        // Play bell (optional)
        if (bell) {
          try { bell.currentTime = 0; bell.play(); } catch (_) {}
        }
        nextPhase();
      }
    }, 200);
  }

  function stopTicking() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }

  function resetAll() {
    stopTicking();
    sessionCount = 0;
    currentCycle = 0;
    setPhase('work', { paused: true });
    updateView();
    resetBtn.disabled = true;
  }

  function updateView() {
    timeEl.textContent = mmss(remainingSeconds);
    const pct = totalSeconds > 0 ? (100 * (totalSeconds - remainingSeconds) / totalSeconds) : 0;
    progressBar.style.width = `${pct}%`;
    percentEl.textContent = `${pct.toFixed(1)}%`;
  }

  // Button handlers
  startBtn.addEventListener('click', () => {
    if (!timerId) startTicking();
  });

  pauseBtn.addEventListener('click', () => {
    stopTicking();
  });

  resetBtn.addEventListener('click', () => {
    resetAll();
  });

  // When settings change during pause, reflect immediately
  [workEl, shortBreakEl, longBreakEl, cyclesEl].forEach(el => {
    el.addEventListener('change', () => {
      const paused = !timerId;
      // Re-initialize current phase with new durations without incrementing sessionCount except when phase == 'work' and we re-enter
      const current = phase;
      if (paused) {
        setPhase(current, { paused: true });
      }
    });
  });

  // Initialize
  setPhase('work', { paused: true });
  resetBtn.disabled = true;
  pauseBtn.disabled = true;
})();

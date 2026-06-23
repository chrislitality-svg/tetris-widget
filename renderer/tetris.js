// ===================== 配置与常量 =====================
const CELL_PX = 20;
const CANVAS_SIZES = {
  small: { width: 10, height: 15, label: '10×15' },
  medium: { width: 10, height: 20, label: '10×20' },
  large: { width: 14, height: 24, label: '14×24' }
};
const SIZE_LIST = ['small', 'medium', 'large'];
const SPEEDS = {
  slow: { ms: 500, label: '慢' },
  normal: { ms: 300, label: '中' },
  fast: { ms: 150, label: '快' }
};
const SPEED_LIST = ['slow', 'normal', 'fast'];

const PIECE_COLORS = {
  I: '#36d1dc',
  O: '#fbbf24',
  T: '#a78bfa',
  S: '#4ade80',
  Z: '#f87171',
  J: '#60a5fa',
  L: '#fb923c'
};

// SRS-standard piece frames. State index: 0=spawn, 1=R (CW), 2=180, 3=L (CCW).
// (These match the Tetris Guideline / SRS orientations; combined with the kick
//  tables below they reproduce true wall/floor kicks and T-spins.)
const SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]]
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]]
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]]
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]]
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]]
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]]
  ]
};

const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// SRS wall-kick tables. Entries are [x, y] with y pointing UP (Tetris-wiki
// convention). resolveRotation() converts to board space via dRow = -y.
// Keyed by "<fromState><toState>" (e.g. "01" = spawn -> R).
const JLSTZ_KICKS = {
  '01': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '10': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '12': [[0,0],[1,0],[1,-1],[0,2],[1,2]],
  '21': [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
  '23': [[0,0],[1,0],[1,1],[0,-2],[1,-2]],
  '32': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '30': [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
  '03': [[0,0],[1,0],[1,1],[0,-2],[1,-2]]
};
const I_KICKS = {
  '01': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '10': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '12': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],
  '21': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '23': [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
  '32': [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
  '30': [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
  '03': [[0,0],[-1,0],[2,0],[-1,2],[2,-1]]
};

// Handfeel defaults (persisted; a tuning panel is planned for Phase 3).
const DEFAULT_SETTINGS = {
  das: 130,            // delayed auto shift (ms before auto-repeat)
  arr: 20,             // auto repeat rate (ms per cell; 0 = teleport to wall)
  softDropMs: 25,      // ms per cell while soft dropping
  lockDelayMs: 500,    // grounded grace period before lock
  lockResetCap: 15,    // max move/rotate lock-delay resets (infinity guard)
  autoPauseOnBlur: true,
  autoHideOnBlur: false, // hide to tray on blur (vs just pause)
  aiDebug: false,      // AI decision-visualization overlay (toggle: G)
  // stealth / window
  opacity: 1,
  alwaysOnTop: true,
  clickThrough: false,
  windowTitle: '俄罗斯方块',
  // input bindings (each action -> list of e.key values)
  keybinds: {
    moveLeft: ['ArrowLeft', 'a', 'A'],
    moveRight: ['ArrowRight', 'd', 'D'],
    softDrop: ['ArrowDown', 's', 'S'],
    rotateCW: ['ArrowUp', 'w', 'W', 'x', 'X'],
    rotateCCW: ['z', 'Z', 'Control'],
    hardDrop: [' '],
    hold: ['c', 'C', 'Shift'],
    pause: ['p', 'P', 'Escape']
  },
  // OS-level global shortcuts (Electron accelerators)
  globalHotkeys: {
    boss: 'Control+Alt+B',
    toggleShow: 'Control+Alt+H',
    clickThrough: 'Control+Alt+T',
    mini: 'Control+Alt+M'
  }
};

const ACTION_LABELS = {
  moveLeft: '左移', moveRight: '右移', softDrop: '软降',
  rotateCW: '顺时针', rotateCCW: '逆时针', hardDrop: '硬降', hold: '暂存', pause: '暂停'
};

const AI_STEP_MS = 30; // how often the AI performs one alignment step

// ===================== 纯逻辑（可被 node require 做单测） =====================
function collidesAt(board, type, rotation, row, col) {
  const H = board.length;
  const W = board[0].length;
  const shape = SHAPES[type][rotation];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = row + r;
      const bc = col + c;
      if (bc < 0 || bc >= W || br < 0 || br >= H) return true;
      if (board[br][bc] != null) return true;
    }
  }
  return false;
}

// Try to rotate `piece` ({type,rotation,row,col}) by dir (+1 CW / -1 CCW) using
// the SRS kick sequence. Returns the resolved {rotation,row,col,kickIndex} or null.
function resolveRotation(board, piece, dir) {
  if (piece.type === 'O') {
    return { rotation: (piece.rotation + (dir > 0 ? 1 : 3)) % 4, row: piece.row, col: piece.col, kickIndex: 0 };
  }
  const from = piece.rotation;
  const to = (from + (dir > 0 ? 1 : 3)) % 4;
  const table = piece.type === 'I' ? I_KICKS : JLSTZ_KICKS;
  const tests = table[`${from}${to}`] || [[0, 0]];
  for (let i = 0; i < tests.length; i++) {
    const nc = piece.col + tests[i][0];
    const nr = piece.row - tests[i][1]; // dRow = -y
    if (!collidesAt(board, piece.type, to, nr, nc)) {
      return { rotation: to, row: nr, col: nc, kickIndex: i };
    }
  }
  return null;
}

function getFullRows(board) {
  const rows = [];
  for (let r = 0; r < board.length; r++) {
    if (board[r].every(cell => cell != null)) rows.push(r);
  }
  return rows;
}

function dropDistance(board, piece) {
  let d = 0;
  while (!collidesAt(board, piece.type, piece.rotation, piece.row + d + 1, piece.col)) d++;
  return d;
}

function bottomRowOf(piece) {
  const shape = SHAPES[piece.type][piece.rotation];
  let maxR = 0;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) maxR = Math.max(maxR, r);
    }
  }
  return piece.row + maxR;
}

// T-spin recognition (3-corner rule). Requires the last successful action to be
// a rotation. Returns 'none' | 'mini' | 'full'.
function detectTSpin(board, piece, lastWasRotation) {
  if (piece.type !== 'T' || !lastWasRotation) return 'none';
  const H = board.length;
  const W = board[0].length;
  const cr = piece.row + 1; // T center is local (1,1) in its 3x3 box
  const cc = piece.col + 1;
  const corners = [[cr - 1, cc - 1], [cr - 1, cc + 1], [cr + 1, cc - 1], [cr + 1, cc + 1]]; // TL,TR,BL,BR
  const occ = corners.map(([r, c]) => (r < 0 || r >= H || c < 0 || c >= W) ? true : board[r][c] != null);
  const count = occ.filter(Boolean).length;
  if (count < 3) return 'none';
  const front = { 0: [0, 1], 1: [1, 3], 2: [2, 3], 3: [0, 2] }[piece.rotation];
  return (occ[front[0]] && occ[front[1]]) ? 'full' : 'mini';
}

// Guideline-style clear score. Returns {points, difficult}.
function computeClearScore(cleared, tSpin, level, b2bActive, combo) {
  let base = 0;
  let difficult = false;
  if (tSpin === 'full') {
    base = [400, 800, 1200, 1600][cleared] || 400;
    difficult = cleared > 0;
  } else if (tSpin === 'mini') {
    base = [100, 200, 400][cleared] || 100;
    difficult = cleared > 0;
  } else {
    base = [0, 100, 300, 500, 800][Math.min(cleared, 4)];
    difficult = cleared === 4;
  }
  let pts = base * level;
  if (cleared > 0 && difficult && b2bActive) pts = Math.floor(pts * 1.5);
  const comboBonus = (cleared > 0 && combo > 0) ? 50 * combo * level : 0;
  return { points: pts + comboBonus, difficult };
}

// 7-bag randomizer (every piece once per 7 before any repeat).
class BagRandomizer {
  constructor(rng) {
    this.rng = rng || Math.random;
    this.bag = [];
  }
  next() {
    if (this.bag.length === 0) {
      this.bag = PIECE_TYPES.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }
}

// ===================== 游戏状态 =====================
let canvas, ctx;
let nextCanvas, nextCtx;
let holdCanvas, holdCtx;
let config = {};
let settings = Object.assign({}, DEFAULT_SETTINGS);
let board = [];
let currentPiece = null;
let nextType = null;
let holdType = null;
let canHold = true;
let bag = new BagRandomizer();
let score = 0;
let level = 1;
let lines = 0;
let highScore = 0;
let combo = -1;
let b2b = false;
let gameOver = false;
let paused = true;
let aiMode = 0; // 0=manual, 1=AI, 2=AI+
let speedKey = 'normal';
let sizeKey = 'medium';

// loop / timing
let running = false;
let rafId = null;
let lastTime = 0;
let gravityAcc = 0;
let aiAcc = 0;
let autoRestartTimer = null;

// lock delay
let lockTimer = 0;
let lockResets = 0;
let lowestRow = 0;
let lastMoveWasRotation = false;
let lastKickIndex = 0;

// input (DAS/ARR/soft)
let heldLeft = false, heldRight = false, heldDown = false;
let dasDir = 0, dasTimer = 0, dasCharged = false, arrAcc = 0, softAcc = 0;
let wasAutoPaused = false;

// AI
let aiPlan = null;
let aiPlanDebug = null;

// juice
let clearText = '';
let clearTextUntil = 0;

// stealth / settings ui
let miniMode = false;
let capturingKeybind = false;
let wasPlayingBeforeHide = false;
let settingsWasPlaying = false;

// ===================== 初始化 =====================
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  nextCanvas = document.getElementById('nextCanvas');
  nextCtx = nextCanvas.getContext('2d');
  nextCtx.imageSmoothingEnabled = false;

  holdCanvas = document.getElementById('holdCanvas');
  holdCtx = holdCanvas.getContext('2d');
  holdCtx.imageSmoothingEnabled = false;

  bindControls();
  bindKeyboard();
  bindWindowFocus();

  loadConfigAsync().then(() => {
    sizeKey = CANVAS_SIZES[config.size] ? config.size : 'medium';
    speedKey = SPEEDS[config.speed] ? config.speed : 'normal';
    aiMode = [0, 1, 2, 3].includes(config.aiMode) ? config.aiMode : 0;
    highScore = config.highScore || 0;
    if (config.settings) settings = Object.assign({}, DEFAULT_SETTINGS, config.settings);
    settings.keybinds = Object.assign({}, DEFAULT_SETTINGS.keybinds, settings.keybinds || {});
    settings.globalHotkeys = Object.assign({}, DEFAULT_SETTINGS.globalHotkeys, settings.globalHotkeys || {});

    applySize(sizeKey, false);
    applyAIMode(aiMode);
    applySpeed(speedKey);

    resetGame();
    draw();
    updateUI();
    resizeWindow();
    applySettings();
    bindSettingsPanel();
    registerMainEvents();
  });
}

async function loadConfigAsync() {
  try {
    config = await window.electronAPI.loadConfig();
  } catch (e) {
    config = {};
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

// ===================== 控件绑定 =====================
function bindControls() {
  const wire = (id, fn) => {
    const el = document.getElementById(id);
    el.addEventListener('click', (ev) => {
      fn();
      ev.currentTarget.blur(); // so Space/Enter don't re-trigger the button
    });
  };

  wire('aiBtn', () => {
    aiMode = (aiMode + 1) % 4; // 手动 → 弱 → 普通 → 变态
    applyAIMode(aiMode);
    aiPlan = null;
    aiPlanDebug = null;
    saveConfig();
  });
  wire('sizeBtn', () => {
    const idx = SIZE_LIST.indexOf(sizeKey);
    applySize(SIZE_LIST[(idx + 1) % SIZE_LIST.length], true);
    saveConfig();
  });
  wire('speedBtn', () => {
    const idx = SPEED_LIST.indexOf(speedKey);
    applySpeed(SPEED_LIST[(idx + 1) % SPEED_LIST.length]);
    saveConfig();
  });
  wire('playBtn', () => togglePause());
  wire('restartBtn', () => {
    clearAutoRestart();
    resetGame();
    startLoop();
    updateUI();
  });
  wire('settingsBtn', () => openSettings());
  wire('closeBtn', () => window.electronAPI.quitApp());
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (capturingKeybind) return; // a rebind capture is consuming keys
    if (gameOver) return;
    const action = keyAction(e.key);

    if (action === 'pause') { e.preventDefault(); togglePause(); return; }
    if (e.key === 'g' || e.key === 'G') { // toggle AI decision-visualization overlay
      e.preventDefault();
      settings.aiDebug = !settings.aiDebug;
      saveConfig();
      draw();
      return;
    }
    if (paused) return;
    if (aiMode !== 0) return; // manual keys are inert while the AI is driving
    if (!action) return;
    if (e.repeat) { e.preventDefault(); return; } // we manage repeats via DAS/ARR
    e.preventDefault();

    switch (action) {
      case 'moveLeft': pressDir(-1); break;
      case 'moveRight': pressDir(1); break;
      case 'softDrop': heldDown = true; softAcc = 0; softDropStep(); break;
      case 'rotateCW': rotate(1); break;
      case 'rotateCCW': rotate(-1); break;
      case 'hardDrop': hardDrop(); break;
      case 'hold': holdPiece(); break;
    }
  });

  document.addEventListener('keyup', (e) => {
    const action = keyAction(e.key);
    if (action === 'moveLeft') {
      heldLeft = false;
      if (dasDir === -1) { dasDir = heldRight ? 1 : 0; dasCharged = false; dasTimer = 0; }
    } else if (action === 'moveRight') {
      heldRight = false;
      if (dasDir === 1) { dasDir = heldLeft ? -1 : 0; dasCharged = false; dasTimer = 0; }
    } else if (action === 'softDrop') {
      heldDown = false;
    }
  });
}

function pressDir(dir) {
  if (dir === -1) heldLeft = true; else heldRight = true;
  dasDir = dir;
  dasCharged = false;
  dasTimer = 0;
  arrAcc = 0;
  move(0, dir);
}

function bindWindowFocus() {
  window.addEventListener('blur', () => {
    heldLeft = heldRight = heldDown = false;
    dasDir = 0;
    if (aiMode !== 0 || gameOver) return; // AI demos keep running / showing on blur
    if (settings.autoHideOnBlur) {
      wasPlayingBeforeHide = running && !paused;
      if (!paused) togglePause();
      if (window.electronAPI) window.electronAPI.setVisible(false).catch(() => {});
    } else if (settings.autoPauseOnBlur && !paused && running) {
      wasAutoPaused = true;
      togglePause();
    }
  });
  window.addEventListener('focus', () => {
    if (wasAutoPaused && paused && !gameOver) { wasAutoPaused = false; togglePause(); }
    else if (wasPlayingBeforeHide && paused && !gameOver) { wasPlayingBeforeHide = false; togglePause(); }
  });
}

// ===================== 配置应用 =====================
function applySize(key, restart) {
  if (!CANVAS_SIZES[key]) return;
  sizeKey = key;
  const info = CANVAS_SIZES[sizeKey];
  canvas.width = info.width * CELL_PX;
  canvas.height = info.height * CELL_PX;
  nextCanvas.width = 4 * CELL_PX;
  nextCanvas.height = 4 * CELL_PX;
  holdCanvas.width = 4 * CELL_PX;
  holdCanvas.height = 4 * CELL_PX;
  resizeWindow();
  if (restart) {
    clearAutoRestart();
    resetGame();
    startLoop();
  }
  updateUI();
}

function applySpeed(key) {
  if (!SPEEDS[key]) key = 'normal';
  speedKey = key;
  // The loop reads gravityMs() live, so no reschedule needed (fixes applyspeed-no-reschedule).
}

function applyAIMode(mode) {
  aiMode = mode;
  const btn = document.getElementById('aiBtn');
  btn.classList.remove('active', 'active-fast');
  const labels = { 0: 'AI', 1: '弱', 2: '普', 3: '变' };
  const titles = { 0: 'AI 自动运行（点击切换难度）', 1: '弱鸡', 2: '普通', 3: '变态' };
  btn.textContent = labels[aiMode] || 'AI';
  btn.title = titles[aiMode] || 'AI';
  if (aiMode === 1 || aiMode === 2) btn.classList.add('active');
  else if (aiMode === 3) btn.classList.add('active-fast');
}

function saveConfig() {
  window.electronAPI.saveConfig({
    size: sizeKey,
    speed: speedKey,
    aiMode,
    highScore,
    settings
  }).catch(() => {});
}

function computeWindowSize(gameWidth, gameHeight) {
  if (miniMode) {
    // board only (side panel hidden): board + canvas-wrap padding(12) + container padding(24)
    return { width: gameWidth * CELL_PX + 12 + 24, height: gameHeight * CELL_PX + 78 };
  }
  // board width + canvas-wrap padding(12) + flex gap(10) + side panel(~115) + container padding(24)
  const totalWidth = gameWidth * CELL_PX + 12 + 10 + 115 + 24;
  // side panel holds HOLD + NEXT + info; ensure the window is tall enough for it.
  const SIDE_PANEL_PX = 330;
  const totalHeight = Math.max(gameHeight * CELL_PX, SIDE_PANEL_PX) + 78;
  return { width: totalWidth, height: totalHeight };
}

function resizeWindow() {
  const info = CANVAS_SIZES[sizeKey];
  const { width, height } = computeWindowSize(info.width, info.height);
  window.electronAPI.setWindowSize({ width, height }).catch(() => {});
}

function gravityMs() {
  return Math.max(50, SPEEDS[speedKey].ms - (level - 1) * 15);
}

// ===================== 游戏循环（固定步长） =====================
function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  paused = false;
  running = true;
  lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  gravityAcc = 0;
  aiAcc = 0;
  lockTimer = 0;
  rafId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function gameLoop(now) {
  if (!running) return;
  const dt = Math.min(100, now - lastTime); // clamp to avoid a burst after the tab was hidden
  lastTime = now;

  if (currentPiece && !gameOver && !paused) {
    if (aiMode !== 0) {
      aiAcc += dt;
      while (aiAcc >= AI_STEP_MS) {
        aiAcc -= AI_STEP_MS;
        if (currentPiece && !gameOver) aiStep();
      }
    } else {
      handleAutoShift(dt);

      if (heldDown) {
        softAcc += dt;
        while (softAcc >= settings.softDropMs) {
          softAcc -= settings.softDropMs;
          if (!softDropStep()) break;
        }
      }

      const g = gravityMs();
      gravityAcc += dt;
      while (gravityAcc >= g) {
        gravityAcc -= g;
        if (!move(1, 0)) break;
      }

      if (grounded()) {
        lockTimer += dt;
        if (lockTimer >= settings.lockDelayMs) lockPiece();
      } else {
        lockTimer = 0;
      }
    }
  }

  draw();
  updateUI();
  if (running) rafId = requestAnimationFrame(gameLoop);
}

function handleAutoShift(dt) {
  if (dasDir === 0) return;
  dasTimer += dt;
  if (!dasCharged) {
    if (dasTimer >= settings.das) {
      dasCharged = true;
      arrAcc = 0;
      if (settings.arr === 0) { while (move(0, dasDir)) {} }
      else move(0, dasDir);
    }
    return;
  }
  if (settings.arr === 0) { while (move(0, dasDir)) {} return; }
  arrAcc += dt;
  while (arrAcc >= settings.arr) {
    arrAcc -= settings.arr;
    if (!move(0, dasDir)) break;
  }
}

function togglePause() {
  if (gameOver) {
    clearAutoRestart();
    resetGame();
    startLoop();
    updateUI();
    return;
  }
  paused = !paused;
  if (paused) {
    stopLoop();
    draw();
    updateUI();
  } else {
    startLoop();
    updateUI();
  }
}

function resetGame() {
  stopLoop();
  gameOver = false;
  paused = true;
  score = 0;
  level = 1;
  lines = 0;
  combo = -1;
  b2b = false;
  holdType = null;
  canHold = true;
  clearText = '';
  bag = new BagRandomizer();

  const info = CANVAS_SIZES[sizeKey];
  board = [];
  for (let r = 0; r < info.height; r++) board.push(new Array(info.width).fill(null));

  nextType = bag.next();
  spawnPiece();
  draw();
}

function spawnPiece(typeOverride) {
  const info = CANVAS_SIZES[sizeKey];
  const type = typeOverride || nextType || bag.next();
  if (!typeOverride) {
    nextType = bag.next();
    canHold = true; // a freshly delivered piece may be held once
  }
  currentPiece = {
    type,
    rotation: 0,
    row: 0,
    col: Math.floor((info.width - SHAPES[type][0][0].length) / 2)
  };
  lastMoveWasRotation = false;
  lockTimer = 0;
  lockResets = 0;
  lowestRow = bottomRowOf(currentPiece);
  aiPlan = null;
  aiPlanDebug = null;

  if (collidesAt(board, type, 0, currentPiece.row, currentPiece.col)) {
    endGame(); // block-out
  }
}

// ===================== 方块操作 =====================
function getShape(piece) {
  return SHAPES[piece.type][piece.rotation];
}

function grounded() {
  return currentPiece && collidesAt(board, currentPiece.type, currentPiece.rotation, currentPiece.row + 1, currentPiece.col);
}

function afterMove(descended) {
  const bottom = bottomRowOf(currentPiece);
  if (descended && bottom > lowestRow) {
    lowestRow = bottom;
    lockResets = 0;
    lockTimer = 0;
  } else if (grounded() && lockResets < settings.lockResetCap) {
    // lateral move or rotation while grounded resets the lock timer (capped)
    lockTimer = 0;
    lockResets++;
  }
}

function move(dRow, dCol) {
  if (!currentPiece) return false;
  const nr = currentPiece.row + dRow;
  const nc = currentPiece.col + dCol;
  if (collidesAt(board, currentPiece.type, currentPiece.rotation, nr, nc)) return false;
  currentPiece.row = nr;
  currentPiece.col = nc;
  if (dRow > 0 || dCol !== 0) lastMoveWasRotation = false;
  afterMove(dRow > 0);
  return true;
}

function rotate(dir) {
  if (!currentPiece) return false;
  const res = resolveRotation(board, currentPiece, dir);
  if (!res) return false;
  currentPiece.rotation = res.rotation;
  currentPiece.row = res.row;
  currentPiece.col = res.col;
  lastMoveWasRotation = true;
  lastKickIndex = res.kickIndex;
  afterMove(false);
  return true;
}

function softDropStep() {
  if (move(1, 0)) {
    score += 1; // soft-drop scoring (+1 per cell)
    return true;
  }
  return false;
}

function hardDrop() {
  if (!currentPiece) return;
  let n = 0;
  while (move(1, 0)) n++;
  score += n * 2; // hard-drop scoring (+2 per cell)
  lockPiece();
}

function holdPiece() {
  if (!currentPiece || !canHold) return;
  const cur = currentPiece.type;
  if (holdType === null) {
    holdType = cur;
    spawnPiece();
  } else {
    const swap = holdType;
    holdType = cur;
    spawnPiece(swap);
  }
  canHold = false;
  lockTimer = 0;
  lockResets = 0;
}

function lockPiece() {
  if (!currentPiece) return;
  const shape = getShape(currentPiece);
  const color = PIECE_COLORS[currentPiece.type];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = currentPiece.row + r;
      const bc = currentPiece.col + c;
      if (br >= 0 && br < board.length && bc >= 0 && bc < board[0].length) board[br][bc] = color;
    }
  }

  const tSpin = detectTSpin(board, currentPiece, lastMoveWasRotation);
  const cleared = clearLines();
  applyScore(cleared, tSpin);

  currentPiece = null;
  spawnPiece(); // natural spawn; re-enables hold

  if (gameOver) {
    draw();
    updateUI();
  }
}

function clearLines() {
  let cleared = 0;
  const info = CANVAS_SIZES[sizeKey];
  for (let r = board.length - 1; r >= 0; r--) {
    if (board[r].every(cell => cell != null)) {
      board.splice(r, 1);
      board.unshift(new Array(info.width).fill(null));
      cleared++;
      r++; // re-check the row that shifted down
    }
  }
  return cleared;
}

function applyScore(cleared, tSpin) {
  if (cleared > 0) combo++; else combo = -1;

  const res = computeClearScore(cleared, tSpin, level, b2b, combo);
  score += res.points;

  if (cleared > 0) {
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    b2b = res.difficult; // a non-difficult line clear breaks B2B
  }

  setClearText(cleared, tSpin, res.difficult && b2b);

  if (score > highScore) {
    highScore = score;
    saveConfig();
  }
}

function setClearText(cleared, tSpin, b2bApplied) {
  const parts = [];
  if (b2bApplied) parts.push('B2B');
  if (tSpin === 'full') parts.push('T-SPIN');
  else if (tSpin === 'mini') parts.push('T-SPIN MINI');
  if (cleared > 0) parts.push([null, 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][Math.min(cleared, 4)]);
  if (combo > 0) parts.push(`${combo} COMBO`);
  const txt = parts.filter(Boolean).join(' ');
  if (txt) {
    clearText = txt;
    clearTextUntil = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + 1300;
  }
}

function endGame() {
  gameOver = true;
  paused = true;
  stopLoop();
  if (score > highScore) {
    highScore = score;
    saveConfig();
  }
  if (aiMode !== 0) scheduleAutoRestart();
}

function scheduleAutoRestart() {
  clearAutoRestart();
  autoRestartTimer = setTimeout(() => {
    resetGame();
    startLoop();
    updateUI();
  }, 5000);
}

function clearAutoRestart() {
  if (autoRestartTimer) {
    clearTimeout(autoRestartTimer);
    autoRestartTimer = null;
  }
}

// ===================== AI（接入共享 El-Tetris 引擎 ai.js） =====================
const AI_TIERS = [null, 'weak', 'normal', 'insane']; // 按 aiMode 索引（0=手动）

function aiStep() {
  if (!currentPiece || typeof TetrisAI === 'undefined') return;
  if (!aiPlan) {
    aiPlan = TetrisAI.chooseMove(board, currentPiece.type, [nextType], holdType, {
      shapes: SHAPES,
      tier: AI_TIERS[aiMode] || 'normal',
      canHold
    });
    if (!aiPlan) { hardDrop(); return; }
    aiPlanDebug = aiPlan;
    if (aiPlan.useHold && canHold) { holdPiece(); aiPlan = null; return; }
  }
  // Reach the planned orientation/column (rotation at spawn is in open space, so
  // no kick shifts the column), then hard drop — matches the benchmark's placement.
  if (currentPiece.rotation !== aiPlan.rotation) { rotate(1); return; }
  if (currentPiece.col < aiPlan.col) { move(0, 1); return; }
  if (currentPiece.col > aiPlan.col) { move(0, -1); return; }
  hardDrop();
  aiPlan = null;
}

// ===================== 绘制 =====================
function draw() {
  if (!ctx) return;
  const info = CANVAS_SIZES[sizeKey];
  const W = info.width;
  const H = info.height;

  ctx.fillStyle = '#0b1a0b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid(ctx, W, H, canvas.width, canvas.height);

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (board[r][c] != null) drawCell(ctx, c, r, board[r][c]);
    }
  }

  if (currentPiece && !gameOver) {
    drawGhost();
    const shape = getShape(currentPiece);
    const color = PIECE_COLORS[currentPiece.type];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) drawCell(ctx, currentPiece.col + c, currentPiece.row + r, color);
      }
    }
  } else if (currentPiece && gameOver) {
    // render the fatal piece (tinted) so the player sees where it landed
    const shape = getShape(currentPiece);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) drawCell(ctx, currentPiece.col + c, currentPiece.row + r, '#ff5a5a');
      }
    }
  }

  if (gameOver) drawOverlay(ctx, canvas.width, canvas.height, '游戏结束');
  else if (paused && currentPiece) drawOverlay(ctx, canvas.width, canvas.height, '已暂停');

  if (settings.aiDebug && aiMode !== 0 && aiPlanDebug) drawAIDebug();
  drawClearText();
  drawPreview(holdCtx, holdCanvas, holdType, !canHold);
  drawPreview(nextCtx, nextCanvas, nextType, false);
}

function drawGrid(context, gridW, gridH, canvasW, canvasH) {
  context.strokeStyle = 'rgba(126, 231, 135, 0.05)';
  context.lineWidth = 1;
  context.beginPath();
  for (let r = 0; r <= gridH; r++) { context.moveTo(0, r * CELL_PX); context.lineTo(canvasW, r * CELL_PX); }
  for (let c = 0; c <= gridW; c++) { context.moveTo(c * CELL_PX, 0); context.lineTo(c * CELL_PX, canvasH); }
  context.stroke();
}

function drawCell(context, col, row, color) {
  const x = col * CELL_PX;
  const y = row * CELL_PX;
  context.fillStyle = color;
  context.fillRect(x + 1, y + 1, CELL_PX - 2, CELL_PX - 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.15)';
  context.fillRect(x + 1, y + 1, CELL_PX - 2, 2);
  context.fillRect(x + 1, y + 1, 2, CELL_PX - 2);
  context.fillStyle = 'rgba(0, 0, 0, 0.15)';
  context.fillRect(x + CELL_PX - 3, y + 1, 2, CELL_PX - 2);
  context.fillRect(x + 1, y + CELL_PX - 3, CELL_PX - 2, 2);
}

function drawGhost() {
  if (!currentPiece) return;
  const shape = getShape(currentPiece);
  const ghostRow = currentPiece.row + dropDistance(board, currentPiece);
  ctx.strokeStyle = PIECE_COLORS[currentPiece.type];
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 2;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = (currentPiece.col + c) * CELL_PX;
      const y = (ghostRow + r) * CELL_PX;
      ctx.strokeRect(x + 2, y + 2, CELL_PX - 4, CELL_PX - 4);
    }
  }
  ctx.globalAlpha = 1;
}

function drawOverlay(context, w, h, text) {
  context.fillStyle = 'rgba(0, 0, 0, 0.65)';
  context.fillRect(0, 0, w, h);
  context.fillStyle = text === '游戏结束' ? '#ff9f9f' : '#fde68a';
  context.font = 'bold 14px Microsoft YaHei, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, w / 2, h / 2);
}

function drawAIDebug() {
  // Planned landing footprint (outline), if the plan is a placement (not a hold).
  if (!aiPlanDebug.useHold && currentPiece &&
      !collidesAt(board, currentPiece.type, aiPlanDebug.rotation, currentPiece.row, aiPlanDebug.col)) {
    const piece = { type: currentPiece.type, rotation: aiPlanDebug.rotation, row: currentPiece.row, col: aiPlanDebug.col };
    const gr = piece.row + dropDistance(board, piece);
    const shape = SHAPES[piece.type][piece.rotation];
    ctx.save();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) ctx.strokeRect((piece.col + c) * CELL_PX + 1, (gr + r) * CELL_PX + 1, CELL_PX - 2, CELL_PX - 2);
      }
    }
    ctx.restore();
  }
  const f = aiPlanDebug.features || {};
  const txt = `${AI_TIERS[aiMode] || ''} holes:${f.holes != null ? f.holes : '-'} sc:${Math.round(aiPlanDebug.score || 0)}`;
  ctx.save();
  ctx.fillStyle = 'rgba(253,230,138,0.95)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(txt, 3, 3);
  ctx.restore();
}

function drawClearText() {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (!clearText || now >= clearTextUntil) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, (clearTextUntil - now) / 600));
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 13px Microsoft YaHei, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(clearText, canvas.width / 2, 16);
  ctx.restore();
}

function drawPreview(context, cv, type, faded) {
  context.clearRect(0, 0, cv.width, cv.height);
  if (!type) return;
  const shape = SHAPES[type][0];
  const color = PIECE_COLORS[type];
  const rows = shape.length;
  const cols = shape[0].length;
  const offsetX = (cv.width - cols * CELL_PX) / 2;
  const offsetY = (cv.height - rows * CELL_PX) / 2;
  context.globalAlpha = faded ? 0.3 : 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[r][c]) continue;
      drawCell(context, (offsetX / CELL_PX) + c, (offsetY / CELL_PX) + r, color);
    }
  }
  context.globalAlpha = 1;
}

// ===================== UI 更新 =====================
function updateUI() {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('scoreText', score);
  set('levelText', level);
  set('linesText', lines);
  set('highScoreText', highScore);
  const playBtn = document.getElementById('playBtn');
  if (playBtn) playBtn.textContent = paused ? '▶' : '⏸';
}

// ===================== 设置面板 / 隐身 / 键位 =====================
function keyAction(key) {
  const kb = settings.keybinds || {};
  for (const action in kb) {
    if (kb[action] && kb[action].includes(key)) return action;
  }
  return null;
}

function applySettings() {
  const api = window.electronAPI;
  if (!api) return;
  api.setOpacity(settings.opacity).catch(() => {});
  api.setAlwaysOnTop(settings.alwaysOnTop).catch(() => {});
  api.setClickThrough(settings.clickThrough).catch(() => {});
  api.setTitle(settings.windowTitle).catch(() => {});
  api.applyGlobalHotkeys(settings.globalHotkeys).catch(() => {});
}

function applyClickThrough() {
  if (window.electronAPI) window.electronAPI.setClickThrough(settings.clickThrough).catch(() => {});
}

function registerMainEvents() {
  if (window.electronAPI && window.electronAPI.onMainEvent) {
    window.electronAPI.onMainEvent(handleMainEvent);
  }
}

function handleMainEvent(data) {
  if (!data) return;
  switch (data.type) {
    case 'boss':
      if (data.active) {
        wasPlayingBeforeHide = running && !paused;
        if (!paused && !gameOver) togglePause();
      } else if (wasPlayingBeforeHide && paused && !gameOver) {
        wasPlayingBeforeHide = false;
        togglePause();
      }
      break;
    case 'hidden':
      if (!paused && !gameOver) { wasPlayingBeforeHide = running; togglePause(); }
      break;
    case 'toggle-clickthrough':
      settings.clickThrough = !settings.clickThrough;
      applyClickThrough();
      saveConfig();
      syncSettingsUI();
      break;
    case 'toggle-mini':
      toggleMini();
      break;
  }
}

function toggleMini() {
  miniMode = !miniMode;
  const c = document.querySelector('.widget-container');
  if (c) c.classList.toggle('mini', miniMode);
  resizeWindow();
  draw();
}

function openSettings() {
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;
  settingsWasPlaying = running && !paused;
  if (settingsWasPlaying) togglePause();
  syncSettingsUI();
  renderKeybindList();
  panel.classList.remove('hidden');
}

function closeSettings() {
  const panel = document.getElementById('settingsPanel');
  if (panel) panel.classList.add('hidden');
  if (settingsWasPlaying && paused && !gameOver) {
    settingsWasPlaying = false;
    togglePause();
  }
}

function prettyKey(k) { return k === ' ' ? 'Space' : k; }

function syncSettingsUI() {
  const g = id => document.getElementById(id);
  if (!g('optOpacity')) return;
  g('optOpacity').value = settings.opacity;
  g('lblOpacity').textContent = Math.round(settings.opacity * 100) + '%';
  g('optAOT').checked = settings.alwaysOnTop;
  g('optClickThrough').checked = settings.clickThrough;
  g('optAutoPause').checked = settings.autoPauseOnBlur;
  g('optAutoHide').checked = settings.autoHideOnBlur;
  g('optTitle').value = settings.windowTitle;
  g('optDas').value = settings.das; g('lblDas').textContent = settings.das + 'ms';
  g('optArr').value = settings.arr; g('lblArr').textContent = settings.arr + 'ms';
  g('optSoft').value = settings.softDropMs; g('lblSoft').textContent = settings.softDropMs + 'ms';
  g('optLock').value = settings.lockDelayMs; g('lblLock').textContent = settings.lockDelayMs + 'ms';
  g('hkBoss').value = settings.globalHotkeys.boss;
  g('hkShow').value = settings.globalHotkeys.toggleShow;
  g('hkClick').value = settings.globalHotkeys.clickThrough;
  g('hkMini').value = settings.globalHotkeys.mini;
}

function renderKeybindList() {
  const list = document.getElementById('keybindList');
  if (!list) return;
  list.innerHTML = '';
  for (const action of Object.keys(ACTION_LABELS)) {
    const row = document.createElement('div'); row.className = 'kb-row';
    const name = document.createElement('span'); name.className = 'kb-name'; name.textContent = ACTION_LABELS[action];
    const keys = document.createElement('span'); keys.className = 'kb-keys';
    keys.textContent = (settings.keybinds[action] || []).map(prettyKey).join(' / ');
    const btn = document.createElement('button'); btn.className = 'kb-btn'; btn.textContent = '重绑';
    btn.addEventListener('click', () => captureKeybind(action, btn, keys));
    row.appendChild(name); row.appendChild(keys); row.appendChild(btn);
    list.appendChild(row);
  }
}

function captureKeybind(action, btn, keysEl) {
  capturingKeybind = true;
  btn.classList.add('capturing');
  btn.textContent = '按键…';
  const onKey = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.removeEventListener('keydown', onKey, true);
    capturingKeybind = false;
    btn.classList.remove('capturing');
    btn.textContent = '重绑';
    if (e.key === 'Escape') return; // cancel
    settings.keybinds[action] = [e.key];
    keysEl.textContent = prettyKey(e.key);
    saveConfig();
  };
  window.addEventListener('keydown', onKey, true);
}

function bindSettingsPanel() {
  const g = id => document.getElementById(id);
  if (!g('settingsPanel')) return;
  g('spClose').addEventListener('click', closeSettings);
  g('optOpacity').addEventListener('input', e => {
    settings.opacity = parseFloat(e.target.value);
    g('lblOpacity').textContent = Math.round(settings.opacity * 100) + '%';
    if (window.electronAPI) window.electronAPI.setOpacity(settings.opacity);
    saveConfig();
  });
  g('optAOT').addEventListener('change', e => {
    settings.alwaysOnTop = e.target.checked;
    if (window.electronAPI) window.electronAPI.setAlwaysOnTop(settings.alwaysOnTop);
    saveConfig();
  });
  g('optClickThrough').addEventListener('change', e => {
    settings.clickThrough = e.target.checked;
    applyClickThrough();
    saveConfig();
  });
  g('optAutoPause').addEventListener('change', e => { settings.autoPauseOnBlur = e.target.checked; saveConfig(); });
  g('optAutoHide').addEventListener('change', e => { settings.autoHideOnBlur = e.target.checked; saveConfig(); });
  g('optTitle').addEventListener('change', e => {
    settings.windowTitle = e.target.value || '俄罗斯方块';
    if (window.electronAPI) window.electronAPI.setTitle(settings.windowTitle);
    saveConfig();
  });
  g('optMini').addEventListener('click', () => toggleMini());
  g('optDas').addEventListener('input', e => { settings.das = +e.target.value; g('lblDas').textContent = settings.das + 'ms'; saveConfig(); });
  g('optArr').addEventListener('input', e => { settings.arr = +e.target.value; g('lblArr').textContent = settings.arr + 'ms'; saveConfig(); });
  g('optSoft').addEventListener('input', e => { settings.softDropMs = +e.target.value; g('lblSoft').textContent = settings.softDropMs + 'ms'; saveConfig(); });
  g('optLock').addEventListener('input', e => { settings.lockDelayMs = +e.target.value; g('lblLock').textContent = settings.lockDelayMs + 'ms'; saveConfig(); });
  g('hkApply').addEventListener('click', () => {
    settings.globalHotkeys = {
      boss: g('hkBoss').value.trim(),
      toggleShow: g('hkShow').value.trim(),
      clickThrough: g('hkClick').value.trim(),
      mini: g('hkMini').value.trim()
    };
    if (window.electronAPI) window.electronAPI.applyGlobalHotkeys(settings.globalHotkeys);
    saveConfig();
  });
  g('ioExport').addEventListener('click', () => { g('ioText').value = JSON.stringify(settings, null, 2); });
  g('ioImport').addEventListener('click', importSettings);
  g('ioReset').addEventListener('click', resetSettings);
}

function importSettings() {
  const ta = document.getElementById('ioText');
  try {
    const obj = JSON.parse(ta.value);
    settings = Object.assign({}, DEFAULT_SETTINGS, obj);
    settings.keybinds = Object.assign({}, DEFAULT_SETTINGS.keybinds, obj.keybinds || {});
    settings.globalHotkeys = Object.assign({}, DEFAULT_SETTINGS.globalHotkeys, obj.globalHotkeys || {});
    applySettings();
    syncSettingsUI();
    renderKeybindList();
    saveConfig();
  } catch (e) {
    ta.value = 'JSON 解析失败：' + e.message;
  }
}

function resetSettings() {
  settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  applySettings();
  syncSettingsUI();
  renderKeybindList();
  saveConfig();
}

// ===================== 单测导出（node） =====================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHAPES, PIECE_TYPES, PIECE_COLORS, JLSTZ_KICKS, I_KICKS, DEFAULT_SETTINGS,
    collidesAt, resolveRotation, getFullRows, dropDistance, bottomRowOf,
    detectTSpin, computeClearScore, BagRandomizer
  };
}

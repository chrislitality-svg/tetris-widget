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
  autoPauseOnBlur: true
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

// juice
let clearText = '';
let clearTextUntil = 0;

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
    aiMode = [0, 1, 2].includes(config.aiMode) ? config.aiMode : 0;
    highScore = config.highScore || 0;
    if (config.settings) settings = Object.assign({}, DEFAULT_SETTINGS, config.settings);

    applySize(sizeKey, false);
    applyAIMode(aiMode);
    applySpeed(speedKey);

    resetGame();
    draw();
    updateUI();
    resizeWindow();
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
    aiMode = (aiMode + 1) % 3;
    applyAIMode(aiMode);
    aiPlan = null;
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
  wire('closeBtn', () => window.electronAPI.quitApp());
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (paused) return;
    if (aiMode !== 0) return; // manual keys are inert while the AI is driving
    if (e.repeat) { e.preventDefault(); return; } // we manage repeats via DAS/ARR

    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); pressDir(-1); break;
      case 'ArrowRight': case 'd': case 'D': e.preventDefault(); pressDir(1); break;
      case 'ArrowDown': case 's': case 'S': e.preventDefault(); heldDown = true; softAcc = 0; softDropStep(); break;
      case 'ArrowUp': case 'w': case 'W': case 'x': case 'X': e.preventDefault(); rotate(1); break;
      case 'z': case 'Z': case 'Control': e.preventDefault(); rotate(-1); break;
      case ' ': e.preventDefault(); hardDrop(); break;
      case 'c': case 'C': case 'Shift': e.preventDefault(); holdPiece(); break;
    }
  });

  document.addEventListener('keyup', (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A':
        heldLeft = false;
        if (dasDir === -1) { dasDir = heldRight ? 1 : 0; dasCharged = false; dasTimer = 0; }
        break;
      case 'ArrowRight': case 'd': case 'D':
        heldRight = false;
        if (dasDir === 1) { dasDir = heldLeft ? -1 : 0; dasCharged = false; dasTimer = 0; }
        break;
      case 'ArrowDown': case 's': case 'S':
        heldDown = false;
        break;
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
    // Auto-pause manual play when you switch away; let AI demos keep running.
    if (settings.autoPauseOnBlur && aiMode === 0 && !paused && !gameOver && running) {
      wasAutoPaused = true;
      togglePause();
    }
  });
  window.addEventListener('focus', () => {
    if (wasAutoPaused && paused && !gameOver) {
      wasAutoPaused = false;
      togglePause();
    }
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
  if (aiMode === 1) { btn.classList.add('active'); btn.textContent = 'AI'; }
  else if (aiMode === 2) { btn.classList.add('active-fast'); btn.textContent = 'AI+'; }
  else { btn.textContent = 'AI'; }
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
  // board width + canvas-wrap padding(12) + flex gap(10) + side panel(~115) + container padding(24)
  const totalWidth = gameWidth * CELL_PX + 12 + 10 + 115 + 24;
  // side panel now holds HOLD + NEXT + info; ensure the window is tall enough for it.
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

  if (collidesAt(board, type, 0, currentPiece.row, currentPiece.col)) {
    endGame(); // block-out
  }
}

// ===================== 方块操作 =====================
function getShape(piece) {
  return SHAPES[piece.type][piece.rotation];
}

function collides(piece) {
  return collidesAt(board, piece.type, piece.rotation, piece.row, piece.col);
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

// ===================== AI（Phase 1 仅适配新循环；强化见 Phase 2） =====================
function aiStep() {
  if (!currentPiece) return;
  if (!aiPlan) {
    aiPlan = getAIAction();
    if (!aiPlan) { hardDrop(); return; }
  }
  if (currentPiece.rotation !== aiPlan.rotation) { rotate(1); return; }
  if (currentPiece.col < aiPlan.col) { move(0, 1); return; }
  if (currentPiece.col > aiPlan.col) { move(0, -1); return; }
  hardDrop();
  aiPlan = null;
}

function getAIAction() {
  if (!currentPiece) return null;
  if (aiMode === 1) return getBestAction1Step();
  if (aiMode === 2) return getBestAction2Step();
  return null;
}

function getBestAction1Step() {
  const piece = currentPiece;
  const info = CANVAS_SIZES[sizeKey];
  let bestScore = -Infinity;
  let bestAction = null;
  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= info.width - width; col++) {
      let row = 0;
      while (row < info.height) {
        if (collides({ type: piece.type, rotation: rot, row: row + 1, col })) break;
        row++;
      }
      const test = { type: piece.type, rotation: rot, row, col };
      if (test.row < 0) continue;
      const simBoard = simulatePlacement(test);
      if (!simBoard) continue;
      const sc = evaluateBoard(simBoard);
      const linesCleared = countLinesForPlacement(test);
      const totalScore = sc + linesCleared * 200;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

function getBestAction2Step() {
  const piece = currentPiece;
  const nextT = nextType;
  const info = CANVAS_SIZES[sizeKey];
  let bestScore = -Infinity;
  let bestAction = null;
  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= info.width - width; col++) {
      let row = 0;
      while (row < info.height) {
        if (collides({ type: piece.type, rotation: rot, row: row + 1, col })) break;
        row++;
      }
      const test = { type: piece.type, rotation: rot, row, col };
      if (test.row < 0) continue;
      const simBoard = simulatePlacement(test);
      if (!simBoard) continue;

      let nextBest = -Infinity;
      for (let rot2 = 0; rot2 < 4; rot2++) {
        const shape2 = SHAPES[nextT][rot2];
        const width2 = shape2[0].length;
        for (let col2 = 0; col2 <= info.width - width2; col2++) {
          let row2 = 0;
          while (row2 < info.height) {
            if (collidesWithBoard({ type: nextT, rotation: rot2, row: row2 + 1, col: col2 }, simBoard)) break;
            row2++;
          }
          const test2 = { type: nextT, rotation: rot2, row: row2, col: col2 };
          if (test2.row < 0) continue;
          const simBoard2 = simulatePlacementOnBoard(test2, simBoard);
          if (!simBoard2) continue;
          const sc2 = evaluateBoard(simBoard2);
          const linesCleared2 = countLinesClearedOnBoard(test2, simBoard);
          nextBest = Math.max(nextBest, sc2 + linesCleared2 * 200);
        }
      }

      const currentScore = evaluateBoard(simBoard);
      const currentLines = countLinesForPlacement(test);
      const totalScore = currentScore + currentLines * 200 + (nextBest > -Infinity ? nextBest * 0.5 : 0);
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

function simulatePlacement(piece) {
  return simulatePlacementOnBoard(piece, board);
}

function collidesWithBoard(piece, boardData) {
  return collidesAt(boardData, piece.type, piece.rotation, piece.row, piece.col);
}

function simulatePlacementOnBoard(piece, boardData) {
  const info = CANVAS_SIZES[sizeKey];
  const sim = boardData.map(row => [...row]);
  const shape = SHAPES[piece.type][piece.rotation];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br < 0 || br >= info.height || bc < 0 || bc >= info.width) return null;
      sim[br][bc] = true;
    }
  }
  for (let r = sim.length - 1; r >= 0; r--) {
    if (sim[r].every(cell => cell != null)) {
      sim.splice(r, 1);
      sim.unshift(new Array(info.width).fill(null));
      r++;
    }
  }
  return sim;
}

function evaluateBoard(boardData) {
  if (!boardData || boardData.length === 0) return -999999;
  const H = boardData.length;
  const W = boardData[0].length;
  const heights = [];
  let totalHeight = 0;
  for (let c = 0; c < W; c++) {
    let h = 0;
    for (let r = 0; r < H; r++) {
      if (boardData[r][c] != null) { h = H - r; break; }
    }
    heights.push(h);
    totalHeight += h;
  }
  let holes = 0;
  for (let c = 0; c < W; c++) {
    let blocked = false;
    for (let r = 0; r < H; r++) {
      if (boardData[r][c] != null) blocked = true;
      else if (blocked) holes++;
    }
  }
  let bumpiness = 0;
  for (let c = 0; c < W - 1; c++) bumpiness += Math.abs(heights[c] - heights[c + 1]);
  const maxHeight = Math.max(...heights, 0);
  return -0.5 * totalHeight - 1.5 * holes - 0.75 * bumpiness - 0.5 * maxHeight;
}

function countLinesOnBoard(boardData) {
  let count = 0;
  for (let r = 0; r < boardData.length; r++) {
    if (boardData[r].every(cell => cell != null)) count++;
  }
  return count;
}

function countLinesForPlacement(placement) {
  return countLinesClearedOnBoard(placement, board);
}

function countLinesClearedOnBoard(placement, boardData) {
  const info = CANVAS_SIZES[sizeKey];
  const sim = boardData.map(row => [...row]);
  const shape = SHAPES[placement.type][placement.rotation];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = placement.row + r;
      const bc = placement.col + c;
      if (br >= 0 && br < info.height && bc >= 0 && bc < info.width) sim[br][bc] = true;
    }
  }
  return countLinesOnBoard(sim);
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

// ===================== 单测导出（node） =====================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHAPES, PIECE_TYPES, PIECE_COLORS, JLSTZ_KICKS, I_KICKS, DEFAULT_SETTINGS,
    collidesAt, resolveRotation, getFullRows, dropDistance, bottomRowOf,
    detectTSpin, computeClearScore, BagRandomizer
  };
}

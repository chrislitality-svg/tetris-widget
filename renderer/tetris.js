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
  theme: 'classic',
  muted: true,
  effectMode: false, // 方块效应：程序生成音乐 + 逐关配色/调式同步
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
    mini: 'Control+Alt+M',
    vanish: 'num1' // 摸鱼模式：小键盘 1 瞬间隐藏
  }
};

const ACTION_LABELS = {
  moveLeft: '左移', moveRight: '右移', softDrop: '软降',
  rotateCW: '顺时针', rotateCCW: '逆时针', hardDrop: '硬降', hold: '暂存', pause: '暂停'
};

// Color themes. Board cells store the piece TYPE letter (or 'G' for garbage);
// the color is resolved from the active theme at draw time, so switching theme
// is instant and affects already-placed blocks too.
const THEMES = {
  classic: { name: '经典', bg: '#0b1a0b', grid: 'rgba(126,231,135,0.05)', colors: { I: '#36d1dc', O: '#fbbf24', T: '#a78bfa', S: '#4ade80', Z: '#f87171', J: '#60a5fa', L: '#fb923c', G: '#6b7280' } },
  mono:    { name: '极简', bg: '#0d0d0f', grid: 'rgba(255,255,255,0.05)', colors: { I: '#e5e7eb', O: '#d1d5db', T: '#cbd5e1', S: '#9ca3af', Z: '#a8adb8', J: '#b0b6c0', L: '#dfe3ea', G: '#4b5563' } },
  neon:    { name: '霓虹', bg: '#0a0a12', grid: 'rgba(0,255,255,0.06)', colors: { I: '#00f0ff', O: '#fff200', T: '#ff00e6', S: '#00ff85', Z: '#ff003c', J: '#2979ff', L: '#ff9100', G: '#3a3a4a' } },
  pastel:  { name: '马卡龙', bg: '#1a1620', grid: 'rgba(255,255,255,0.05)', colors: { I: '#a0e7e5', O: '#fbe7a1', T: '#c3aed6', S: '#b5ead7', Z: '#ffb3ba', J: '#a2d2ff', L: '#ffd6a5', G: '#6b7280' } },
  // 摸鱼模式：配色对齐 Claude Desktop 浅色界面（暖米白底 + 低对比中性色块），远看像一块普通面板
  moyu:    { name: '摸鱼', bg: '#faf9f5', grid: 'rgba(20,20,19,0.05)', colors: { I: '#d97757', O: '#c9c7bd', T: '#b0aea5', S: '#a39d8f', Z: '#8f8a7c', J: '#736f63', L: '#e8e6dc', G: '#dedcd2' } }
};

// 特效模式（俄罗斯方块效应式）：每套除了配色，还带 root(根音Hz) + scale(音阶半音偏移数组)，
// 关卡切换时画面配色和音乐调式一起换，效果模式开启时 activeTheme 直接指向这里而不经过 THEMES/settings.theme。
const EFFECT_PALETTES = [
  { name: '黎明', bg: '#0f1226', grid: 'rgba(255,255,255,0.05)', colors: { I: '#7dd3fc', O: '#fde68a', T: '#c4b5fd', S: '#86efac', Z: '#fca5a5', J: '#93c5fd', L: '#fdba74', G: '#334155' }, root: 261.63, scale: [0, 2, 4, 7, 9] },
  { name: '热带', bg: '#031f1a', grid: 'rgba(255,255,255,0.05)', colors: { I: '#2dd4bf', O: '#fbbf24', T: '#f472b6', S: '#4ade80', Z: '#fb7185', J: '#38bdf8', L: '#fb923c', G: '#134e4a' }, root: 293.66, scale: [0, 2, 4, 7, 9] },
  { name: '霓虹都市', bg: '#0a0014', grid: 'rgba(255,0,255,0.06)', colors: { I: '#00e5ff', O: '#ffea00', T: '#ff00e5', S: '#00ff9c', Z: '#ff2d55', J: '#448aff', L: '#ff9100', G: '#3a0a4a' }, root: 329.63, scale: [0, 3, 5, 7, 10] },
  { name: '深海', bg: '#001220', grid: 'rgba(255,255,255,0.05)', colors: { I: '#22d3ee', O: '#a5f3fc', T: '#818cf8', S: '#2dd4bf', Z: '#f87171', J: '#60a5fa', L: '#facc15', G: '#0e3a52' }, root: 349.23, scale: [0, 2, 3, 7, 9] },
  { name: '熔岩', bg: '#1a0500', grid: 'rgba(255,120,0,0.06)', colors: { I: '#fb923c', O: '#fde047', T: '#f87171', S: '#fbbf24', Z: '#dc2626', J: '#ef4444', L: '#facc15', G: '#3f0d02' }, root: 392.00, scale: [0, 1, 4, 5, 7, 8, 11] },
  { name: '极光', bg: '#04120f', grid: 'rgba(0,255,200,0.06)', colors: { I: '#5eead4', O: '#a7f3d0', T: '#67e8f9', S: '#34d399', Z: '#f472b6', J: '#7dd3fc', L: '#fde047', G: '#0f3d33' }, root: 440.00, scale: [0, 2, 4, 7, 9] },
  { name: '紫夜', bg: '#0d0620', grid: 'rgba(180,120,255,0.06)', colors: { I: '#c4b5fd', O: '#fbcfe8', T: '#a78bfa', S: '#93c5fd', Z: '#f9a8d4', J: '#818cf8', L: '#fcd34d', G: '#2e1a4a' }, root: 493.88, scale: [0, 2, 4, 7, 9] },
  { name: '金昼', bg: '#1a1200', grid: 'rgba(255,215,0,0.06)', colors: { I: '#fde68a', O: '#fbbf24', T: '#fcd34d', S: '#facc15', Z: '#f59e0b', J: '#eab308', L: '#fef08a', G: '#3d2e00' }, root: 523.25, scale: [0, 2, 4, 7, 9] }
];

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

// theme
let activeTheme = THEMES.classic;
let prevThemeBeforeMoyu = 'classic'; // remembers which theme to restore when leaving 摸鱼模式

// modes / leaderboard
let mode = 'marathon';
let modeElapsedMs = 0;
let gameWon = false;
let records = {};

// juice / audio
let shakeUntil = 0;
let shakeMag = 0;
let flashUntil = 0;
let flashColor = '#ffffff';
let particles = [];
let audioCtx = null;

// 对战模式：本地AI机器人
let bots = [];
let battleLog = '';
let battleFinalRank = 0;

// 特效模式：程序生成音乐 + 逐关配色
let musicTimer = null;
let musicStep = 0;

// achievements
let unlockedAch = new Set();
let b2bStreak = 0;
let achText = '';
let achUntil = 0;

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
    applyTheme(settings.theme);
    if (settings.effectMode) { applyEffectPalette(); ensureEffectMusic(); }
    updateEffectBtn();
    records = config.records || {};
    unlockedAch = new Set(config.achievements || []);
    mode = MODES[config.mode] ? config.mode : 'marathon';

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
  wire('moyuBtn', () => toggleMoyuMode());
  wire('effectBtn', () => toggleEffectMode());
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
    settings,
    mode,
    records,
    achievements: [...unlockedAch]
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
    tickMode(dt); // mode timer (Ultra countdown can end the game)
    if (gameOver) { draw(); updateUI(); return; }
    updateBattle(dt); // battle 模式：机器人对手落子/攻击（可能触发胜利）
    if (gameOver) { draw(); updateUI(); return; }
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

  updateParticles(dt);
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
  b2bStreak = 0;
  holdType = null;
  canHold = true;
  clearText = '';
  particles = [];
  shakeUntil = 0;
  flashUntil = 0;
  battleLog = '';
  battleFinalRank = 0;
  bag = new BagRandomizer();

  const info = CANVAS_SIZES[sizeKey];
  board = [];
  for (let r = 0; r < info.height; r++) board.push(new Array(info.width).fill(null));

  setupMode(); // timer reset + mode-specific board/bag (cheese garbage, daily seed)
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
    if (MODES[mode] && MODES[mode].noTopOut) {
      for (let r = 0; r < board.length; r++) board[r].fill(null); // Zen: clear & keep playing
    } else {
      endGame(); // block-out
    }
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
  playSound('rotate');
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
  if (n > 0) playSound('hard');
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
  playSound('hold');
}

function lockPiece() {
  if (!currentPiece) return;
  const shape = getShape(currentPiece);
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = currentPiece.row + r;
      const bc = currentPiece.col + c;
      if (br >= 0 && br < board.length && bc >= 0 && bc < board[0].length) board[br][bc] = currentPiece.type;
    }
  }

  const tSpin = detectTSpin(board, currentPiece, lastMoveWasRotation);
  const fullRows = getFullRows(board);
  const clearCells = fullRows.map(r => board[r].slice());
  const cleared = clearLines();
  applyScore(cleared, tSpin);
  if (cleared > 0) triggerClearJuice(cleared, tSpin, fullRows, clearCells);
  else playSound('lock');
  onModeClear(cleared); // sprint goal / cheese garbage refill (may end the game)
  if (mode === 'battle' && cleared > 0) resolveAttack('player', cleared);

  currentPiece = null;
  if (gameOver) { draw(); updateUI(); return; }
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

  const b2bBefore = b2b; // capture before update — the 1.5x only applies if we were already in B2B
  const res = computeClearScore(cleared, tSpin, level, b2bBefore, combo);
  score += res.points;
  const b2bApplied = cleared > 0 && res.difficult && b2bBefore;

  if (cleared > 0) {
    lines += cleared;
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) triggerLevelUp();
    level = newLevel;
    b2b = res.difficult; // a non-difficult line clear breaks B2B
  }

  setClearText(cleared, tSpin, b2bApplied);
  checkGameplayAchievements(cleared, tSpin, res.difficult);

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
  playSound('over');
  if (score > highScore) highScore = score;
  updateModeRecord();
  if (mode === 'ultra' && gameWon) unlockAch('ultra_done');
  if (mode === 'sprint' && gameWon && modeElapsedMs < 60000) unlockAch('sprint_sub60');
  if (mode === 'battle') {
    battleFinalRank = gameWon ? 1 : battleRank();
    if (gameWon) unlockAch('battle_win');
  }
  saveConfig();
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
function pieceColor(t) { return (activeTheme && activeTheme.colors[t]) || '#888888'; }
function applyTheme(key) {
  const prevTheme = settings.theme;
  activeTheme = THEMES[key] ? THEMES[key] : THEMES.classic;
  settings.theme = THEMES[key] ? key : 'classic';
  const c = document.querySelector('.widget-container');
  if (c) c.classList.toggle('moyu', settings.theme === 'moyu');
  updateMoyuBtn();
  // Entering 摸鱼模式: pin to the top of the screen and force always-on-top.
  if (settings.theme === 'moyu' && prevTheme !== 'moyu') {
    settings.alwaysOnTop = true;
    if (window.electronAPI) {
      window.electronAPI.setAlwaysOnTop(true).catch(() => {});
      if (window.electronAPI.snapTop) window.electronAPI.snapTop().catch(() => {});
    }
  }
}

function updateMoyuBtn() {
  const btn = document.getElementById('moyuBtn');
  if (btn) btn.classList.toggle('active', settings.theme === 'moyu');
}

// 摸鱼模式一键开关：进入时记住原配色，退出时还原。
function toggleMoyuMode() {
  if (settings.theme === 'moyu') {
    applyTheme(prevThemeBeforeMoyu || 'classic');
  } else {
    prevThemeBeforeMoyu = settings.theme;
    applyTheme('moyu');
  }
  draw();
  syncSettingsUI();
  saveConfig();
}

function draw() {
  if (!ctx) return;
  const info = CANVAS_SIZES[sizeKey];
  const W = info.width;
  const H = info.height;

  ctx.fillStyle = activeTheme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sNow = nowMs();
  let sx = 0, sy = 0;
  if (sNow < shakeUntil) {
    const m = shakeMag * Math.max(0, (shakeUntil - sNow) / 200);
    sx = (Math.random() * 2 - 1) * m;
    sy = (Math.random() * 2 - 1) * m;
  }
  ctx.save();
  ctx.translate(sx, sy);
  drawGrid(ctx, W, H, canvas.width, canvas.height);

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (board[r][c] != null) drawCell(ctx, c, r, pieceColor(board[r][c]));
    }
  }

  if (currentPiece && !gameOver) {
    drawGhost();
    const shape = getShape(currentPiece);
    const color = pieceColor(currentPiece.type);
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

  drawParticles();
  ctx.restore(); // end shake transform
  drawFlash();

  if (gameOver) {
    let overlayText = gameWon ? winText() : '游戏结束';
    if (mode === 'battle' && !gameWon) overlayText = '出局 · 排名 ' + battleFinalRank + '/' + (BATTLE_BOT_COUNT + 1);
    drawOverlay(ctx, canvas.width, canvas.height, overlayText);
  }
  else if (paused && currentPiece) drawOverlay(ctx, canvas.width, canvas.height, '已暂停');

  if (settings.aiDebug && aiMode !== 0 && aiPlanDebug) drawAIDebug();
  drawClearText();
  drawAchToast();
  drawPreview(holdCtx, holdCanvas, holdType, !canHold);
  drawPreview(nextCtx, nextCanvas, nextType, false);
}

function drawGrid(context, gridW, gridH, canvasW, canvasH) {
  context.strokeStyle = activeTheme.grid;
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
  ctx.strokeStyle = pieceColor(currentPiece.type);
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
  context.fillStyle = (text === '游戏结束' || text.indexOf('出局') === 0) ? '#ff9f9f' : '#fde68a';
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
  const color = pieceColor(type);
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
  set('modeText', (MODES[mode] || MODES.marathon).name);
  const timeLabel = document.getElementById('timeLabel');
  const recordLabel = document.getElementById('recordLabel');
  if (mode === 'battle') {
    if (timeLabel) timeLabel.textContent = '存活';
    if (recordLabel) recordLabel.textContent = '播报';
    set('timeText', aliveBotCount() + '/' + BATTLE_BOT_COUNT);
    set('recordText', battleLog || '—');
  } else {
    if (timeLabel) timeLabel.textContent = '时间';
    if (recordLabel) recordLabel.textContent = '最佳';
    set('timeText', modeTimeDisplay());
    set('recordText', modeRecordDisplay());
  }
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
  renderModeButtons();
  renderAchievements();
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
  if (g('optTheme')) g('optTheme').value = settings.theme;
  if (g('optSound')) g('optSound').checked = !settings.muted;
  g('optDas').value = settings.das; g('lblDas').textContent = settings.das + 'ms';
  g('optArr').value = settings.arr; g('lblArr').textContent = settings.arr + 'ms';
  g('optSoft').value = settings.softDropMs; g('lblSoft').textContent = settings.softDropMs + 'ms';
  g('optLock').value = settings.lockDelayMs; g('lblLock').textContent = settings.lockDelayMs + 'ms';
  g('hkBoss').value = settings.globalHotkeys.boss;
  g('hkShow').value = settings.globalHotkeys.toggleShow;
  g('hkClick').value = settings.globalHotkeys.clickThrough;
  g('hkMini').value = settings.globalHotkeys.mini;
  g('hkVanish').value = settings.globalHotkeys.vanish;
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
      mini: g('hkMini').value.trim(),
      vanish: g('hkVanish').value.trim()
    };
    if (window.electronAPI) window.electronAPI.applyGlobalHotkeys(settings.globalHotkeys);
    saveConfig();
  });
  const themeSel = g('optTheme');
  if (themeSel && !themeSel.dataset.built) {
    for (const k of Object.keys(THEMES)) {
      const o = document.createElement('option'); o.value = k; o.textContent = THEMES[k].name; themeSel.appendChild(o);
    }
    themeSel.dataset.built = '1';
  }
  if (themeSel) themeSel.addEventListener('change', e => { applyTheme(e.target.value); draw(); saveConfig(); });
  if (g('optSound')) g('optSound').addEventListener('change', e => { settings.muted = !e.target.checked; if (!settings.muted) playSound('rotate'); saveConfig(); });
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

// ===================== Juice / 音效 =====================
// Synthesized SFX via WebAudio — no bundled audio assets (copyright-safe). Muted by default.
const SOUND_CFG = {
  move:    { wave: 'square',   freq: 220, dur: 0.03, vol: 0.05 },
  rotate:  { wave: 'square',   freq: 330, dur: 0.05, vol: 0.06 },
  lock:    { wave: 'triangle', freq: 160, dur: 0.06, vol: 0.07 },
  hard:    { wave: 'square',   freq: 130, dur: 0.06, vol: 0.08 },
  hold:    { wave: 'sine',     freq: 440, dur: 0.06, vol: 0.05 },
  clear:   { wave: 'sine',     freq: 520, slide: 780, dur: 0.18, vol: 0.09 },
  tetris:  { wave: 'sawtooth', freq: 440, slide: 880, dur: 0.30, vol: 0.11 },
  levelup: { wave: 'sine',     freq: 660, slide: 990, dur: 0.25, vol: 0.10 },
  over:    { wave: 'sawtooth', freq: 300, slide: 80,  dur: 0.50, vol: 0.10 },
  attackOut: { wave: 'square',   freq: 380, slide: 620, dur: 0.14, vol: 0.09 },
  attackIn:  { wave: 'sawtooth', freq: 200, slide: 90,  dur: 0.22, vol: 0.11 }
};

function nowMs() { return (typeof performance !== 'undefined' ? performance.now() : Date.now()); }

function playSound(type) {
  if (settings.muted) return;
  if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const cfg = SOUND_CFG[type] || SOUND_CFG.move;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = cfg.wave;
    // 特效模式：消行/锁定/升级音效从当前调式取音，随连击级联升高——零延迟，操作即演出。
    let freq = cfg.freq, slide = cfg.slide;
    if (settings.effectMode && (type === 'clear' || type === 'tetris' || type === 'lock' || type === 'levelup')) {
      const p = paletteForLevel(level);
      const idx = type === 'lock' ? 0 : Math.max(0, combo) + (type === 'levelup' ? 4 : 0);
      freq = noteFreq(p.root, p.scale, idx);
      if (cfg.slide) slide = freq * 1.5;
    }
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + cfg.dur);
    g.gain.setValueAtTime(cfg.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + cfg.dur);
  } catch (e) { /* audio unavailable */ }
}

// ===================== 特效模式：程序生成音乐引擎（无外部音乐文件，纯 Web Audio 合成） =====================
function paletteForLevel(lvl) {
  return EFFECT_PALETTES[(Math.max(1, lvl) - 1) % EFFECT_PALETTES.length];
}

// idx 可以超出 scale.length，超出部分自动折算到高八度，保证连击越高音高越亮。
function noteFreq(root, scale, idx) {
  const n = scale.length;
  const semis = scale[((idx % n) + n) % n] + 12 * Math.floor(idx / n);
  return root * Math.pow(2, semis / 12);
}

function playTone(freq, dur, vol, wave) {
  if (typeof window === 'undefined' || !(window.AudioContext || window.webkitAudioContext)) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = wave || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* audio unavailable */ }
}

// 背景氛围琶音：低音量、低八度，节奏跟随当前重力速度换算出的 BPM。
function musicTick() {
  if (!settings.effectMode || settings.muted) return;
  const p = paletteForLevel(level);
  playTone(noteFreq(p.root / 2, p.scale, musicStep), 0.9, 0.025, 'sine');
  musicStep++;
}

function ensureEffectMusic() {
  if (musicTimer || settings.muted) return;
  const bpm = Math.max(60, Math.min(160, 60000 / gravityMs()));
  musicTimer = setInterval(musicTick, 60000 / bpm);
}

function stopEffectMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}

// 升级时重启一遍，好让 BPM/调式跟上新的关卡（interval 一旦建立不会自己变速）。
function restartEffectMusic() {
  stopEffectMusic();
  ensureEffectMusic();
}

function applyEffectPalette() {
  if (!settings.effectMode) return;
  activeTheme = paletteForLevel(level);
}

function updateEffectBtn() {
  const btn = document.getElementById('effectBtn');
  if (btn) btn.classList.toggle('active', !!settings.effectMode);
}

function toggleEffectMode() {
  settings.effectMode = !settings.effectMode;
  if (settings.effectMode) {
    applyEffectPalette();
    ensureEffectMusic();
  } else {
    applyTheme(settings.theme); // 交回给普通主题系统（含摸鱼模式的 .moyu class）
    stopEffectMusic();
  }
  updateEffectBtn();
  draw();
  saveConfig();
}

function triggerClearJuice(cleared, tSpin, rows, cellsList) {
  const big = cleared >= 4 || tSpin !== 'none';
  const now = nowMs();
  shakeMag = big ? 8 : 2 + cleared * 1.5;
  shakeUntil = now + (big ? 260 : 160);
  flashColor = '#ffffff';
  flashUntil = now + (big ? 150 : 90);
  spawnParticles(rows, cellsList);
  playSound(big ? 'tetris' : 'clear');
}

function triggerLevelUp() {
  flashColor = '#ffffff';
  flashUntil = nowMs() + 150;
  playSound('levelup');
  if (settings.effectMode) { applyEffectPalette(); restartEffectMusic(); }
}

function spawnParticles(rows, cellsList) {
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const cells = cellsList[i] || [];
    for (let c = 0; c < cells.length; c++) {
      if (cells[c] == null) continue;
      const cx = c * CELL_PX + CELL_PX / 2;
      const cy = r * CELL_PX + CELL_PX / 2;
      const color = pieceColor(cells[c]);
      for (let k = 0; k < 2; k++) {
        particles.push({ x: cx, y: cy, vx: (Math.random() * 2 - 1) * 2.5, vy: Math.random() * -3 - 0.5, size: 3, color, life: 420, maxLife: 420 });
      }
    }
  }
  if (particles.length > 320) particles = particles.slice(-320);
}

function updateParticles(dt) {
  if (!particles.length) return;
  const f = dt / 16.67;
  for (const p of particles) { p.x += p.vx * f; p.y += p.vy * f; p.vy += 0.4 * f; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.restore();
  }
}

function drawFlash() {
  const now = nowMs();
  if (now < flashUntil) {
    ctx.save();
    ctx.globalAlpha = 0.45 * Math.max(0, (flashUntil - now) / 150);
    ctx.fillStyle = flashColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

// ===================== 游戏模式 / 排行榜 =====================
const MODES = {
  marathon: { name: '马拉松' },
  sprint:   { name: 'Sprint40', timed: 'up', goalLines: 40 },
  ultra:    { name: 'Ultra2:00', timed: 'down', durationMs: 120000 },
  zen:      { name: 'Zen', noTopOut: true },
  cheese:   { name: 'Cheese', garbage: 9 },
  daily:    { name: '每日挑战', seeded: true },
  battle:   { name: '大逃杀', battle: true }
};
const MODE_LIST = ['marathon', 'sprint', 'ultra', 'zen', 'cheese', 'daily', 'battle'];

function makeSeededRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function dailySeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function setMode(m) {
  if (!MODES[m]) m = 'marathon';
  mode = m;
  settingsWasPlaying = false;
  clearAutoRestart();
  resetGame();
  startLoop();
  updateUI();
  saveConfig();
}

// Called inside resetGame after the board is built.
function setupMode() {
  modeElapsedMs = 0;
  gameWon = false;
  const cfg = MODES[mode] || MODES.marathon;
  if (cfg.seeded) bag = new BagRandomizer(makeSeededRng(dailySeed())); // deterministic daily
  if (cfg.garbage) addGarbageRows(cfg.garbage);
  if (cfg.battle) initBattle();
}

function addGarbageRows(n) {
  const info = CANVAS_SIZES[sizeKey];
  for (let i = 0; i < n; i++) {
    const row = new Array(info.width).fill('G');
    row[Math.floor(Math.random() * info.width)] = null; // one gap so the row is clearable
    board.shift();   // push the stack up
    board.push(row); // garbage rises from the bottom
  }
}

function countGarbageRows() {
  let n = 0;
  for (let r = 0; r < board.length; r++) if (board[r].some(c => c === 'G')) n++;
  return n;
}

// ===================== 对战模式：本地AI机器人（俄罗斯方块99式大逃杀，无联网） =====================
// 机器人棋盘固定标准 10×20（不跟随玩家 size 设置），落子决策直接复用 ai.js 的纯函数
// TetrisAI.chooseMove / landingRow / clearRows，全程不碰玩家的全局 board/currentPiece。
const BOT_TIER_ROSTER = ['weak', 'weak', 'weak', 'weak', 'normal', 'normal', 'normal', 'normal', 'insane'];
const BATTLE_BOT_COUNT = BOT_TIER_ROSTER.length;
const ATTACK_TABLE = [0, 0, 1, 2, 4]; // 消行数(0-4) -> 送出的垃圾行数，沿用竞技俄罗斯方块惯例

function makeEmptyBotBoard() {
  return Array.from({ length: 20 }, () => new Array(10).fill(null));
}

function botIntervalFor(tier) {
  const base = tier === 'insane' ? 480 : tier === 'normal' ? 700 : 950;
  return base * (0.85 + Math.random() * 0.3); // 抖动节奏，避免所有机器人同帧计算
}

function initBattle() {
  bots = BOT_TIER_ROSTER.map((tier, i) => {
    const b = { id: i + 1, tier, board: makeEmptyBotBoard(), bag: new BagRandomizer(), holdType: null, nextType: null, alive: true, decideAcc: Math.random() * 400, decideInterval: botIntervalFor(tier) };
    b.nextType = b.bag.next();
    return b;
  });
  battleLog = '';
}

// 与 ai.js 内部 stamp() 同构，只是把布尔值换成方块类型字母，方便复用 TetrisAI.clearRows()。
function botStamp(board, shape, row, col, type) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = row + r, bc = col + c;
      if (br >= 0 && br < board.length && bc >= 0 && bc < board[0].length) board[br][bc] = type;
    }
  }
  return board;
}

function botTopOut(board) {
  return board[0].some(c => c != null) || board[1].some(c => c != null);
}

function eliminateBot(bot) {
  if (!bot.alive) return;
  bot.alive = false;
  battleLog = 'BOT' + bot.id + ' 出局';
}

function addBotGarbage(bot, n) {
  for (let i = 0; i < n; i++) {
    const row = new Array(10).fill('G');
    row[Math.floor(Math.random() * 10)] = null;
    bot.board.shift();
    bot.board.push(row);
  }
  if (botTopOut(bot.board)) eliminateBot(bot);
}

function aliveBotCount() {
  return bots.filter(b => b.alive).length;
}

// 存活对象池里随机挑一个攻击目标（V1 不做定向策略，保持简单）。sourceId 是 'player' 或机器人 id。
function pickAttackTarget(sourceId) {
  const pool = [];
  if (sourceId !== 'player' && !gameOver) pool.push('player');
  for (const b of bots) if (b.alive && b.id !== sourceId) pool.push(b.id);
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function resolveAttack(sourceId, cleared) {
  if (mode !== 'battle') return;
  const n = ATTACK_TABLE[Math.min(cleared, 4)] || 0;
  if (n <= 0) return;
  const target = pickAttackTarget(sourceId);
  if (target == null) return;
  if (sourceId === 'player') playSound('attackOut');
  if (target === 'player') {
    addGarbageRows(n);
    flashColor = '#ff4d4f';
    shakeMag = Math.max(shakeMag, 4 + n * 1.5);
    shakeUntil = Math.max(shakeUntil, nowMs() + 220);
    flashUntil = Math.max(flashUntil, nowMs() + 160);
    playSound('attackIn');
  } else {
    const bot = bots.find(b => b.id === target);
    if (bot) addBotGarbage(bot, n);
  }
}

function botDecide(bot) {
  const res = TetrisAI.chooseMove(bot.board, bot.nextType, [], bot.holdType, { shapes: SHAPES, tier: bot.tier, canHold: false });
  if (!res) { eliminateBot(bot); return; }
  const shape = SHAPES[bot.nextType][res.rotation];
  const row = TetrisAI.landingRow(bot.board, shape, res.col);
  if (row == null) { eliminateBot(bot); return; }
  botStamp(bot.board, shape, row, res.col, bot.nextType);
  const { board: clearedBoard, cleared } = TetrisAI.clearRows(bot.board);
  bot.board = clearedBoard;
  bot.nextType = bot.bag.next();
  if (botTopOut(bot.board)) { eliminateBot(bot); return; }
  if (cleared > 0) resolveAttack(bot.id, cleared);
}

function updateBattle(dt) {
  if (mode !== 'battle') return;
  for (const bot of bots) {
    if (!bot.alive) continue;
    bot.decideAcc += dt;
    while (bot.decideAcc >= bot.decideInterval && bot.alive) {
      bot.decideAcc -= bot.decideInterval;
      botDecide(bot);
    }
  }
  if (!gameOver && running && aliveBotCount() === 0) { gameWon = true; endGame(); }
}

// 你出局时的名次：仍存活的机器人数 + 1（吃鸡时 aliveBotCount()===0，名次恒为1）。
function battleRank() {
  return aliveBotCount() + 1;
}

function tickMode(dt) {
  if (gameOver || paused) return;
  modeElapsedMs += dt;
  const cfg = MODES[mode];
  if (cfg && cfg.timed === 'down' && modeElapsedMs >= cfg.durationMs) {
    gameWon = true; // surviving the 2 minutes is the goal in Ultra
    endGame();
  }
}

function onModeClear(cleared) {
  const cfg = MODES[mode];
  if (!cfg) return;
  if (cfg.goalLines && lines >= cfg.goalLines) { gameWon = true; endGame(); return; }
  if (cfg.garbage && cleared > 0) {
    const deficit = cfg.garbage - countGarbageRows();
    if (deficit > 0) addGarbageRows(Math.min(deficit, cleared)); // keep the pressure on
  }
}

function updateModeRecord() {
  if (mode === 'sprint') {
    if (gameWon && (!records.sprint || modeElapsedMs < records.sprint)) records.sprint = modeElapsedMs;
  } else if (mode === 'cheese') {
    if (!records.cheese || lines > records.cheese) records.cheese = lines;
  } else {
    if (!records[mode] || score > records[mode]) records[mode] = score;
  }
}

function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function modeTimeDisplay() {
  const cfg = MODES[mode];
  if (!cfg || !cfg.timed) return '—';
  if (cfg.timed === 'down') return formatTime(Math.max(0, cfg.durationMs - modeElapsedMs));
  return formatTime(modeElapsedMs);
}

function modeRecordDisplay() {
  if (mode === 'sprint') return records.sprint ? formatTime(records.sprint) : '—';
  if (mode === 'cheese') return records.cheese || 0;
  if (mode === 'marathon') return Math.max(highScore || 0, records.marathon || 0);
  return records[mode] || 0;
}

function winText() {
  if (mode === 'sprint') return '完成 ' + formatTime(modeElapsedMs);
  if (mode === 'ultra') return '时间到 ' + score;
  if (mode === 'battle') return '吃鸡！排名 1/' + (BATTLE_BOT_COUNT + 1);
  return '完成';
}

function renderModeButtons() {
  const box = document.getElementById('modeBtns');
  if (!box) return;
  box.innerHTML = '';
  for (const m of MODE_LIST) {
    const b = document.createElement('button');
    b.className = 'mode-btn' + (m === mode ? ' active' : '');
    b.textContent = MODES[m].name;
    b.addEventListener('click', () => { setMode(m); renderModeButtons(); closeSettings(); });
    box.appendChild(b);
  }
}

// ===================== 成就 =====================
const ACHIEVEMENTS = [
  { id: 'first_tetris', name: '四连消', desc: '完成一次 Tetris' },
  { id: 'first_tspin', name: 'T-Spin', desc: '完成一次 T-Spin 消行' },
  { id: 'combo5', name: '连击大师', desc: '达成 5 连击' },
  { id: 'level10', name: '十级', desc: '达到 10 级' },
  { id: 'lines100', name: '百行', desc: '单局消除 100 行' },
  { id: 'sprint_sub60', name: '闪电40', desc: 'Sprint 40 行用时 < 60 秒' },
  { id: 'ultra_done', name: '两分钟', desc: '完成一局 Ultra' },
  { id: 'b2b3', name: '连战连捷', desc: '连续 3 次难度消除（B2B）' },
  { id: 'battle_win', name: '大逃杀冠军', desc: '在大逃杀模式吃鸡' }
];

function unlockAch(id) {
  if (unlockedAch.has(id)) return;
  unlockedAch.add(id);
  const a = ACHIEVEMENTS.find(x => x.id === id);
  achText = '成就达成 · ' + (a ? a.name : id);
  achUntil = nowMs() + 2600;
  playSound('levelup');
  saveConfig();
}

function checkGameplayAchievements(cleared, tSpin, difficult) {
  if (cleared === 4) unlockAch('first_tetris');
  if (tSpin !== 'none' && cleared > 0) unlockAch('first_tspin');
  if (combo >= 5) unlockAch('combo5');
  if (level >= 10) unlockAch('level10');
  if (lines >= 100) unlockAch('lines100');
  if (cleared > 0) {
    if (difficult) b2bStreak++; else b2bStreak = 0;
    if (b2bStreak >= 3) unlockAch('b2b3');
  }
}

function drawAchToast() {
  const now = nowMs();
  if (!achText || now >= achUntil) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, (achUntil - now) / 700));
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, canvas.height - 34, canvas.width, 22);
  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 11px Microsoft YaHei, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(achText, canvas.width / 2, canvas.height - 23);
  ctx.restore();
}

function renderAchievements() {
  const box = document.getElementById('achList');
  if (!box) return;
  box.innerHTML = '';
  for (const a of ACHIEVEMENTS) {
    const got = unlockedAch.has(a.id);
    const row = document.createElement('div');
    row.className = 'ach-row' + (got ? ' got' : '');
    const name = document.createElement('span');
    name.className = 'ach-name';
    name.textContent = (got ? '★ ' : '☆ ') + a.name;
    const desc = document.createElement('span');
    desc.className = 'ach-desc';
    desc.textContent = a.desc;
    row.appendChild(name); row.appendChild(desc);
    box.appendChild(row);
  }
}

// ===================== 单测导出（node） =====================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SHAPES, PIECE_TYPES, PIECE_COLORS, JLSTZ_KICKS, I_KICKS, DEFAULT_SETTINGS,
    collidesAt, resolveRotation, getFullRows, dropDistance, bottomRowOf,
    detectTSpin, computeClearScore, BagRandomizer,
    MODES, formatTime, makeSeededRng
  };
}

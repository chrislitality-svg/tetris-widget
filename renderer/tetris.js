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

// 方块定义：[旋转状态][行][列] (4x4 或 3x3 或 2x2)
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

function computeWindowSize(gameWidth, gameHeight) {
  // 主画布宽度 + canvas-wrap内边距(12px) + flex间距(10px) + 侧面板(~115px) + 容器padding(24px)
  const totalWidth = gameWidth * CELL_PX + 12 + 10 + 115 + 24;
  const totalHeight = gameHeight * CELL_PX + 78;
  return { width: totalWidth, height: totalHeight };
}

// ===================== 游戏状态 =====================
let canvas, ctx;
let nextCanvas, nextCtx;
let config = {};
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let highScore = 0;
let gameOver = false;
let paused = true;
let aiMode = 0; // 0=手动, 1=AI, 2=AI+
let speedKey = 'normal';
let sizeKey = 'medium';
let loopTimer = null;
let autoRestartTimer = null;
let dropCounter = 0;

// ===================== 初始化 =====================
document.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  nextCanvas = document.getElementById('nextCanvas');
  nextCtx = nextCanvas.getContext('2d');
  nextCtx.imageSmoothingEnabled = false;

  bindControls();
  bindKeyboard();

  try {
    config = await window.electronAPI.loadConfig();
  } catch (e) {
    config = {};
  }

  sizeKey = CANVAS_SIZES[config.size] ? config.size : 'medium';
  speedKey = SPEEDS[config.speed] ? config.speed : 'normal';
  aiMode = [0, 1, 2].includes(config.aiMode) ? config.aiMode : 0;
  highScore = config.highScore || 0;

  applySize(sizeKey, false);
  applyAIMode(aiMode);

  resetGame();
  draw();
  updateUI();
  resizeWindow();
});

// ===================== 控件绑定 =====================
function bindControls() {
  document.getElementById('aiBtn').addEventListener('click', () => {
    aiMode = (aiMode + 1) % 3;
    applyAIMode(aiMode);
    saveConfig();
  });

  document.getElementById('sizeBtn').addEventListener('click', () => {
    const idx = SIZE_LIST.indexOf(sizeKey);
    const newSize = SIZE_LIST[(idx + 1) % SIZE_LIST.length];
    applySize(newSize, true);
    saveConfig();
  });

  document.getElementById('speedBtn').addEventListener('click', () => {
    const idx = SPEED_LIST.indexOf(speedKey);
    const newSpeed = SPEED_LIST[(idx + 1) % SPEED_LIST.length];
    applySpeed(newSpeed);
    saveConfig();
  });

  document.getElementById('playBtn').addEventListener('click', () => {
    togglePause();
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    clearAutoRestart();
    resetGame();
    paused = false;
    startLoop();
    updateUI();
  });

  document.getElementById('closeBtn').addEventListener('click', () => {
    window.electronAPI.quitApp();
  });
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (gameOver) return;

    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }
    if (paused) return;

    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': movePiece(0, -1); break;
      case 'ArrowRight': case 'd': case 'D': movePiece(0, 1); break;
      case 'ArrowDown': case 's': case 'S': softDrop(); break;
      case 'ArrowUp': case 'w': case 'W': rotatePiece(); break;
      case ' ': hardDrop(); break;
    }
    draw();
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

  resizeWindow();

  if (restart) {
    clearAutoRestart();
    resetGame();
    paused = false;
    startLoop();
  }
  updateUI();
}

function applySpeed(key) {
  if (!SPEEDS[key]) key = 'normal';
  speedKey = key;
}

function applyAIMode(mode) {
  aiMode = mode;
  const btn = document.getElementById('aiBtn');
  btn.classList.remove('active', 'active-fast');
  if (aiMode === 1) {
    btn.classList.add('active');
    btn.textContent = 'AI';
  } else if (aiMode === 2) {
    btn.classList.add('active-fast');
    btn.textContent = 'AI+';
  } else {
    btn.textContent = 'AI';
  }
}

function saveConfig() {
  window.electronAPI.saveConfig({
    size: sizeKey,
    speed: speedKey,
    aiMode,
    highScore
  }).catch(() => {});
}

function resizeWindow() {
  const info = CANVAS_SIZES[sizeKey];
  const { width, height } = computeWindowSize(info.width, info.height);
  window.electronAPI.setWindowSize({ width, height }).catch(() => {});
}

// ===================== 游戏循环 =====================
function togglePause() {
  if (gameOver) {
    clearAutoRestart();
    resetGame();
    paused = false;
    startLoop();
  } else {
    paused = !paused;
    if (!paused) startLoop();
  }
  updateUI();
}

function startLoop() {
  if (loopTimer) clearTimeout(loopTimer);
  loopTimer = null;
  dropCounter = 0;
  if (!paused && !gameOver) {
    loopTimer = setTimeout(tick, SPEEDS[speedKey].ms);
  }
}

function tick() {
  if (paused || gameOver) return;

  // AI 模式：自动移动
  if (aiMode !== 0 && currentPiece) {
    const action = getAIAction();
    if (action) executeAIAction(action);
  }

  // 下落
  dropCounter++;
  if (dropCounter >= (aiMode !== 0 ? 1 : 1)) {
    if (!movePiece(1, 0)) {
      // 无法下落，锁定
      lockPiece();
    }
    dropCounter = 0;
  }

  draw();
  updateUI();

  if (!gameOver) {
    const speed = SPEEDS[speedKey].ms - (level - 1) * 15;
    loopTimer = setTimeout(tick, Math.max(50, speed));
  }
}

function resetGame() {
  gameOver = false;
  paused = true;
  score = 0;
  level = 1;
  lines = 0;

  const info = CANVAS_SIZES[sizeKey];
  board = [];
  for (let r = 0; r < info.height; r++) {
    board.push(new Array(info.width).fill(null));
  }

  nextPiece = randomPiece();
  spawnPiece();
  draw();
}

function spawnPiece() {
  if (!nextPiece) {
    nextPiece = randomPiece();
  }
  currentPiece = {
    type: nextPiece.type,
    rotation: 0,
    row: 0,
    col: Math.floor((CANVAS_SIZES[sizeKey].width - SHAPES[nextPiece.type][0][0].length) / 2)
  };
  nextPiece = randomPiece();

  // 检查是否碰撞（游戏结束）
  if (collides(currentPiece)) {
    endGame();
  }
}

function randomPiece() {
  return {
    type: PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)],
    rotation: 0
  };
}

// ===================== 方块操作 =====================
function getShape(piece) {
  return SHAPES[piece.type][piece.rotation];
}

function collides(piece, boardOffset) {
  const shape = SHAPES[piece.type][piece.rotation];
  const info = CANVAS_SIZES[sizeKey];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = piece.row + r + (boardOffset ? boardOffset.row || 0 : 0);
      const bc = piece.col + c + (boardOffset ? boardOffset.col || 0 : 0);
      if (br < 0 || br >= info.height || bc < 0 || bc >= info.width) return true;
      if (board[br][bc] !== null) return true;
    }
  }
  return false;
}

function movePiece(dRow, dCol) {
  if (!currentPiece) return false;
  const test = { ...currentPiece, row: currentPiece.row + dRow, col: currentPiece.col + dCol };
  if (!collides(test)) {
    currentPiece.row = test.row;
    currentPiece.col = test.col;
    return true;
  }
  return false;
}

function rotatePiece() {
  if (!currentPiece) return;
  const test = { ...currentPiece, rotation: (currentPiece.rotation + 1) % 4 };
  if (!collides(test)) {
    currentPiece.rotation = test.rotation;
  }
}

function softDrop() {
  if (!movePiece(1, 0)) {
    lockPiece();
  }
  draw();
}

function hardDrop() {
  if (!currentPiece) return;
  while (movePiece(1, 0)) {}
  lockPiece();
  draw();
  updateUI();
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
      if (br >= 0 && br < board.length && bc >= 0 && bc < board[0].length) {
        board[br][bc] = color;
      }
    }
  }
  currentPiece = null;

  // 消行
  clearLines();

  // 生成下一个方块
  spawnPiece();

  // 检查是否游戏结束
  if (gameOver) {
    draw();
    updateUI();
  }
}

function clearLines() {
  let cleared = 0;
  for (let r = board.length - 1; r >= 0; r--) {
    if (board[r].every(cell => cell !== null)) {
      board.splice(r, 1);
      const info = CANVAS_SIZES[sizeKey];
      board.unshift(new Array(info.width).fill(null));
      cleared++;
      r++; // 重新检查当前行
    }
  }

  if (cleared > 0) {
    lines += cleared;
    const points = [0, 100, 300, 500, 800];
    score += points[Math.min(cleared, 4)];
    level = Math.floor(lines / 10) + 1;

    if (score > highScore) {
      highScore = score;
      saveConfig();
    }
  }
}

function endGame() {
  gameOver = true;
  paused = true;
  if (loopTimer) clearTimeout(loopTimer);
  loopTimer = null;

  // 保存最高分
  if (score > highScore) {
    highScore = score;
    saveConfig();
  }

  // AI 模式下 5 秒后自动重启
  if (aiMode !== 0) {
    scheduleAutoRestart();
  }
}

function scheduleAutoRestart() {
  clearAutoRestart();
  autoRestartTimer = setTimeout(() => {
    resetGame();
    paused = false;
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

// ===================== AI =====================
function getAIAction() {
  if (!currentPiece) return null;

  if (aiMode === 1) {
    return getBestAction1Step();
  } else if (aiMode === 2) {
    return getBestAction2Step();
  }
  return null;
}

function getBestAction1Step() {
  const piece = currentPiece;
  const info = CANVAS_SIZES[sizeKey];
  let bestScore = -Infinity;
  let bestAction = null;

  // 枚举所有旋转
  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    // 枚举所有列
    for (let col = 0; col <= info.width - width; col++) {
      // 找到该列的最低掉落位置
      let row = 0;
      while (row < info.height) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (collides(test)) break;
        row++;
      }
      const test = { type: piece.type, rotation: rot, row, col };
      if (test.row < 0) continue;

      // 模拟放置并评分
      const simBoard = simulatePlacement(test);
      if (!simBoard) continue;

      const sc = evaluateBoard(simBoard);

      // 在消行前计算消行数（修复：simulatePlacement已消行，countLinesCleared(simBoard)始终为0）
      const linesCleared = countLinesForPlacement(test);
      const lineBonus = linesCleared * 200;

      const totalScore = sc + lineBonus;
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
  const next = nextPiece;
  const info = CANVAS_SIZES[sizeKey];
  let bestScore = -Infinity;
  let bestAction = null;

  // 枚举当前方块的所有放置
  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= info.width - width; col++) {
      let row = 0;
      while (row < info.height) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (collides(test)) break;
        row++;
      }
      const test = { type: piece.type, rotation: rot, row, col };
      if (test.row < 0) continue;

      const simBoard = simulatePlacement(test);
      if (!simBoard) continue;

      // 枚举下一个方块的所有放置
      let nextBest = -Infinity;
      for (let rot2 = 0; rot2 < 4; rot2++) {
        const shape2 = SHAPES[next.type][rot2];
        const width2 = shape2[0].length;
        for (let col2 = 0; col2 <= info.width - width2; col2++) {
          let row2 = 0;
          while (row2 < info.height) {
            const test2 = { type: next.type, rotation: rot2, row: row2 + 1, col: col2 };
            if (collidesWithBoard(test2, simBoard)) break;
            row2++;
          }
          const test2 = { type: next.type, rotation: rot2, row: row2, col: col2 };
          if (test2.row < 0) continue;

          const simBoard2 = simulatePlacementOnBoard(test2, simBoard);
          if (!simBoard2) continue;

          const sc2 = evaluateBoard(simBoard2);
          const linesCleared2 = countLinesCleared(simBoard2);
          nextBest = Math.max(nextBest, sc2 + linesCleared2 * 200);
        }
      }

      // 总评分 = 当前放置评分 + 下一步最佳评分
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
  const info = CANVAS_SIZES[sizeKey];
  const sim = board.map(row => [...row]);
  const shape = SHAPES[piece.type][piece.rotation];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br < 0 || br >= info.height || bc < 0 || bc >= info.width) return null;
      sim[br][bc] = PIECE_COLORS[piece.type];
    }
  }
  // 消行（模拟中也要消行）
  for (let r = sim.length - 1; r >= 0; r--) {
    if (sim[r].every(cell => cell !== null)) {
      sim.splice(r, 1);
      sim.unshift(new Array(info.width).fill(null));
    }
  }
  return sim;
}

function collidesWithBoard(piece, boardData) {
  const shape = SHAPES[piece.type][piece.rotation];
  const info = CANVAS_SIZES[sizeKey];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br < 0 || br >= info.height || bc < 0 || bc >= info.width) return true;
      if (boardData[br][bc] !== null) return true;
    }
  }
  return false;
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
      sim[br][bc] = PIECE_COLORS[piece.type];
    }
  }
  // 消行
  for (let r = sim.length - 1; r >= 0; r--) {
    if (sim[r].every(cell => cell !== null)) {
      sim.splice(r, 1);
      sim.unshift(new Array(info.width).fill(null));
    }
  }
  return sim;
}

// 评估函数（分数越低越好，取负值）
function evaluateBoard(boardData) {
  if (!boardData || boardData.length === 0) return -999999;
  const info = CANVAS_SIZES[sizeKey];
  const H = boardData.length;
  const W = boardData[0].length;

  // 1. 各列高度
  const heights = [];
  let totalHeight = 0;
  for (let c = 0; c < W; c++) {
    let h = 0;
    for (let r = 0; r < H; r++) {
      if (boardData[r][c] !== null) { h = H - r; break; }
    }
    heights.push(h);
    totalHeight += h;
  }

  // 2. 空洞数
  let holes = 0;
  for (let c = 0; c < W; c++) {
    let blocked = false;
    for (let r = 0; r < H; r++) {
      if (boardData[r][c] !== null) {
        blocked = true;
      } else if (blocked) {
        holes++;
      }
    }
  }

  // 3. 不平坦度（相邻列高度差之和）
  let bumpiness = 0;
  for (let c = 0; c < W - 1; c++) {
    bumpiness += Math.abs(heights[c] - heights[c + 1]);
  }

  // 4. 完整行数（已在 simulatePlacement 中消行，这里计算已消的行）
  // 5. 最高列惩罚
  const maxHeight = Math.max(...heights, 0);

  // 评分 = -(a*aggregateHeight + b*holes + c*bumpiness + d*maxHeight)
  // 权重
  const wHeight = -0.5;
  const wHoles = -1.5;
  const wBumpiness = -0.75;
  const wMaxHeight = -0.5;

  const score = wHeight * totalHeight + wHoles * holes + wBumpiness * bumpiness + wMaxHeight * maxHeight;
  return score;
}

// 在已放置方块的棋盘上统计消行数（在消行前调用）
function countLinesCleared(boardData) {
  let count = 0;
  for (let r = 0; r < boardData.length; r++) {
    if (boardData[r].every(cell => cell !== null)) count++;
  }
  return count;
}

// 计算某次放置后、消行前能消除的行数
function countLinesForPlacement(placement) {
  const info = CANVAS_SIZES[sizeKey];
  const sim = board.map(row => [...row]);
  const shape = SHAPES[placement.type][placement.rotation];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = placement.row + r;
      const bc = placement.col + c;
      if (br >= 0 && br < info.height && bc >= 0 && bc < info.width) {
        sim[br][bc] = true;
      }
    }
  }
  return countLinesCleared(sim);
}

function executeAIAction(action) {
  if (!action || !currentPiece) return;

  // 先旋转到目标角度
  const targetRot = action.rotation;
  let rotSteps = (targetRot - currentPiece.rotation + 4) % 4;
  for (let i = 0; i < rotSteps; i++) {
    rotatePiece();
  }

  // 水平移动到目标列
  const targetCol = action.col;
  while (currentPiece.col < targetCol) {
    if (!movePiece(0, 1)) break;
  }
  while (currentPiece.col > targetCol) {
    if (!movePiece(0, -1)) break;
  }

  // 不移除硬降，方块将自由下落（由 tick 中的下落逻辑自然处理）
}

// ===================== 绘制 =====================
function draw() {
  const info = CANVAS_SIZES[sizeKey];
  const W = info.width;
  const H = info.height;

  // 清空主画布
  ctx.fillStyle = '#0b1a0b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid(ctx, W, H, canvas.width, canvas.height);

  // 绘制已固定的方块
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      if (board[r][c] !== null) {
        drawCell(ctx, c, r, board[r][c]);
      }
    }
  }

  // 绘制幽灵方块
  if (currentPiece && !gameOver) {
    drawGhost();
  }

  // 绘制当前方块
  if (currentPiece && !gameOver) {
    const shape = getShape(currentPiece);
    const color = PIECE_COLORS[currentPiece.type];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        drawCell(ctx, currentPiece.col + c, currentPiece.row + r, color);
      }
    }
  }

  // 覆盖层
  if (gameOver) {
    drawOverlay(ctx, canvas.width, canvas.height, '游戏结束');
  } else if (paused && !gameOver && currentPiece) {
    drawOverlay(ctx, canvas.width, canvas.height, '已暂停');
  }

  // 绘制下一个方块
  drawNextPiece();
}

function drawGrid(context, gridW, gridH, canvasW, canvasH) {
  context.strokeStyle = 'rgba(126, 231, 135, 0.05)';
  context.lineWidth = 1;
  context.beginPath();
  for (let r = 0; r <= gridH; r++) {
    context.moveTo(0, r * CELL_PX);
    context.lineTo(canvasW, r * CELL_PX);
  }
  for (let c = 0; c <= gridW; c++) {
    context.moveTo(c * CELL_PX, 0);
    context.lineTo(c * CELL_PX, canvasH);
  }
  context.stroke();
}

function drawCell(context, col, row, color) {
  const x = col * CELL_PX;
  const y = row * CELL_PX;

  // 方块本体
  context.fillStyle = color;
  context.fillRect(x + 1, y + 1, CELL_PX - 2, CELL_PX - 2);

  // 高光效果
  context.fillStyle = 'rgba(255, 255, 255, 0.15)';
  context.fillRect(x + 1, y + 1, CELL_PX - 2, 2);
  context.fillRect(x + 1, y + 1, 2, CELL_PX - 2);

  // 阴影效果
  context.fillStyle = 'rgba(0, 0, 0, 0.15)';
  context.fillRect(x + CELL_PX - 3, y + 1, 2, CELL_PX - 2);
  context.fillRect(x + 1, y + CELL_PX - 3, CELL_PX - 2, 2);
}

function drawGhost() {
  if (!currentPiece) return;
  const shape = getShape(currentPiece);
  const info = CANVAS_SIZES[sizeKey];

  // 找到落点
  let ghostRow = currentPiece.row;
  while (ghostRow < info.height) {
    const test = { ...currentPiece, row: ghostRow + 1 };
    if (collides(test)) break;
    ghostRow++;
  }

  // 绘制幽灵
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const x = (currentPiece.col + c) * CELL_PX;
      const y = (ghostRow + r) * CELL_PX;
      ctx.strokeStyle = PIECE_COLORS[currentPiece.type];
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.strokeRect(x + 2, y + 2, CELL_PX - 4, CELL_PX - 4);
      ctx.globalAlpha = 1;
    }
  }
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

function drawNextPiece() {
  const nw = nextCanvas.width;
  const nh = nextCanvas.height;
  nextCtx.clearRect(0, 0, nw, nh);
  nextCtx.fillStyle = 'transparent';
  nextCtx.fillRect(0, 0, nw, nh);

  if (!nextPiece) return;
  const shape = SHAPES[nextPiece.type][0];
  const color = PIECE_COLORS[nextPiece.type];
  const rows = shape.length;
  const cols = shape[0].length;

  // 居中绘制
  const offsetX = (nw - cols * CELL_PX) / 2;
  const offsetY = (nh - rows * CELL_PX) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!shape[r][c]) continue;
      const x = offsetX + c * CELL_PX;
      const y = offsetY + r * CELL_PX;
      nextCtx.fillStyle = color;
      nextCtx.fillRect(x + 1, y + 1, CELL_PX - 2, CELL_PX - 2);
      nextCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      nextCtx.fillRect(x + 1, y + 1, CELL_PX - 2, 2);
      nextCtx.fillRect(x + 1, y + 1, 2, CELL_PX - 2);
      nextCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      nextCtx.fillRect(x + CELL_PX - 3, y + 1, 2, CELL_PX - 2);
      nextCtx.fillRect(x + 1, y + CELL_PX - 3, CELL_PX - 2, 2);
    }
  }
}

// ===================== UI 更新 =====================
function updateUI() {
  document.getElementById('scoreText').textContent = score;
  document.getElementById('levelText').textContent = level;
  document.getElementById('linesText').textContent = lines;
  document.getElementById('highScoreText').textContent = highScore;

  const playBtn = document.getElementById('playBtn');
  playBtn.textContent = paused ? '▶' : '⏸';
}

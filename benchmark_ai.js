// ===================== 无UI AI 基准测试脚本 =====================
const CELL_PX = 20;
const CANVAS_SIZES = {
  small: { width: 10, height: 15 },
  medium: { width: 10, height: 20 },
  large: { width: 14, height: 24 }
};

const PIECE_COLORS = {
  I: '#36d1dc', O: '#fbbf24', T: '#a78bfa',
  S: '#4ade80', Z: '#f87171', J: '#60a5fa', L: '#fb923c'
};

const SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
  ],
  O: [[[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]],[[1,1],[1,1]]],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]], [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]], [[0,1,0],[1,1,0],[0,1,0]]
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]], [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]], [[1,0,0],[1,1,0],[0,1,0]]
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]], [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]], [[0,1,0],[1,1,0],[1,0,0]]
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]], [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]], [[0,1,0],[0,1,0],[1,1,0]]
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]], [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]], [[1,1,0],[0,1,0],[0,1,0]]
  ]
};
const PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// ===================== 种子随机数（可复现） =====================
class SeededRandom {
  constructor(seed) {
    this.seed = seed || Date.now();
    this._state = this.seed;
  }
  next() {
    this._state = (this._state * 16807 + 0) % 2147483647;
    return this._state / 2147483647;
  }
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// 7-bag 随机生成器（标准Tetris）
class BagRandomizer {
  constructor(seed) {
    this.rng = new SeededRandom(seed);
    this.bag = [];
  }
  nextType() {
    if (this.bag.length === 0) {
      this.bag = [...PIECE_TYPES];
      this.rng.shuffle(this.bag);
    }
    return this.bag.pop();
  }
}

// ===================== 游戏引擎 =====================
class GameEngine {
  constructor(sizeKey, seed) {
    this.sizeKey = sizeKey;
    const info = CANVAS_SIZES[sizeKey];
    this.W = info.width;
    this.H = info.height;
    this.board = Array.from({ length: this.H }, () => new Array(this.W).fill(null));
    this.randomizer = new BagRandomizer(seed);
    this.current = null;
    this.next = null;
    this.gameOver = false;
    this.lines = 0;
    this.score = 0;
    this.piecesPlaced = 0;
    this.spawn();
  }

  spawn() {
    if (!this.next) {
      this.next = { type: this.randomizer.nextType(), rotation: 0 };
    }
    this.current = {
      type: this.next.type,
      rotation: 0,
      row: 0,
      col: Math.floor((this.W - SHAPES[this.next.type][0][0].length) / 2)
    };
    this.next = { type: this.randomizer.nextType(), rotation: 0 };
    if (this.collides(this.current)) {
      this.gameOver = true;
      return false;
    }
    return true;
  }

  getShape(piece) {
    return SHAPES[piece.type][piece.rotation];
  }

  collides(piece) {
    const shape = SHAPES[piece.type][piece.rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const br = piece.row + r;
        const bc = piece.col + c;
        if (br < 0 || br >= this.H || bc < 0 || bc >= this.W) return true;
        if (this.board[br][bc] !== null) return true;
      }
    }
    return false;
  }

  collidesWithBoard(piece, board) {
    const shape = SHAPES[piece.type][piece.rotation];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const br = piece.row + r;
        const bc = piece.col + c;
        if (br < 0 || br >= this.H || bc < 0 || bc >= this.W) return true;
        if (board[br][bc] !== null) return true;
      }
    }
    return false;
  }

  movePiece(dRow, dCol) {
    if (!this.current) return false;
    const test = { ...this.current, row: this.current.row + dRow, col: this.current.col + dCol };
    if (!this.collides(test)) {
      this.current.row = test.row;
      this.current.col = test.col;
      return true;
    }
    return false;
  }

  rotatePiece() {
    if (!this.current) return;
    const test = { ...this.current, rotation: (this.current.rotation + 1) % 4 };
    if (!this.collides(test)) {
      this.current.rotation = test.rotation;
    }
  }

  hardDrop() {
    if (!this.current) return;
    while (this.movePiece(1, 0)) {}
    this.lockPiece();
  }

  lockPiece() {
    if (!this.current) return;
    const shape = this.getShape(this.current);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const br = this.current.row + r;
        const bc = this.current.col + c;
        if (br >= 0 && br < this.H && bc >= 0 && bc < this.W) {
          this.board[br][bc] = true; // 只用布尔值，不需要颜色
        }
      }
    }
    this.current = null;
    this.piecesPlaced++;
    this.clearLines();
    this.spawn();
  }

  clearLines() {
    let cleared = 0;
    for (let r = this.H - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== null)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(this.W).fill(null));
        cleared++;
        r++;
      }
    }
    if (cleared > 0) {
      this.lines += cleared;
      const points = [0, 100, 300, 500, 800];
      this.score += points[Math.min(cleared, 4)];
    }
  }

  // AI 执行动作：旋转+水平移动+硬降（快速下落）
  executeAIAction(action) {
    if (!action || !this.current) return;
    const targetRot = action.rotation;
    let rotSteps = (targetRot - this.current.rotation + 4) % 4;
    for (let i = 0; i < rotSteps; i++) this.rotatePiece();
    while (this.current.col < action.col) { if (!this.movePiece(0, 1)) break; }
    while (this.current.col > action.col) { if (!this.movePiece(0, -1)) break; }
    this.hardDrop();
  }
}

// ===================== AI 策略 =====================

// 工具函数：深拷贝棋盘
function cloneBoard(board) {
  return board.map(row => [...row]);
}

// 模拟放置 + 消行，返回新棋盘
function simulatePlacement(piece, board, W, H) {
  const sim = cloneBoard(board);
  const shape = SHAPES[piece.type][piece.rotation];
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = piece.row + r;
      const bc = piece.col + c;
      if (br < 0 || br >= H || bc < 0 || bc >= W) return null;
      sim[br][bc] = true;
    }
  }
  // 消行
  for (let r = H - 1; r >= 0; r--) {
    if (sim[r].every(cell => cell !== null)) {
      sim.splice(r, 1);
      sim.unshift(new Array(W).fill(null));
    }
  }
  return sim;
}

// 统计棋盘特征（给评估函数用）
function evaluateBoard(boardData, W, H) {
  if (!boardData || boardData.length === 0) return { score: -999999 };

  // 各列高度
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

  // 空洞数
  let holes = 0;
  for (let c = 0; c < W; c++) {
    let blocked = false;
    for (let r = 0; r < H; r++) {
      if (boardData[r][c] !== null) { blocked = true; }
      else if (blocked) { holes++; }
    }
  }

  // 不平坦度
  let bumpiness = 0;
  for (let c = 0; c < W - 1; c++) {
    bumpiness += Math.abs(heights[c] - heights[c + 1]);
  }

  const maxHeight = Math.max(...heights, 0);

  return { heights, totalHeight, holes, bumpiness, maxHeight };
}

// 放置前统计消行数
function countLinesToClear(board, W, H) {
  let count = 0;
  for (let r = 0; r < H; r++) {
    if (board[r].every(cell => cell !== null)) count++;
  }
  return count;
}

// 计算井道深度（wells）：每列左右相邻列高度均高于该列，差值之和
function countWells(heights, W) {
  let wells = 0;
  for (let c = 0; c < W; c++) {
    let left = (c === 0) ? heights[1] : heights[c - 1];
    let right = (c === W - 1) ? heights[W - 2] : heights[c + 1];
    let minNeighbor = Math.min(left, right);
    if (heights[c] < minNeighbor) {
      wells += (minNeighbor - heights[c]) * 2;
    }
  }
  return wells;
}

// ===================== AI 策略实现 =====================

// 通用框架：枚举所有放置位置
function enumeratePlacements(piece, board, W, H) {
  const placements = [];
  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        const simBoard = board.map(r => [...r]);
        const eng = { board: simBoard, W, H, collidesWithBoard: (p) => {
          const s = SHAPES[p.type][p.rotation];
          for (let r2 = 0; r2 < s.length; r2++) {
            for (let c2 = 0; c2 < s[r2].length; c2++) {
              if (!s[r2][c2]) continue;
              const br = p.row + r2, bc = p.col + c2;
              if (br < 0 || br >= H || bc < 0 || bc >= W) return true;
              if (simBoard[br][bc] !== null) return true;
            }
          }
          return false;
        }};
        if (eng.collidesWithBoard(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;
      placements.push(placement);
    }
  }
  return placements;
}

// ------ 策略1: Baseline-1step (当前AI) ------
function strategyBaseline1Step(engine) {
  const piece = engine.current;
  const W = engine.W, H = engine.H;
  let bestScore = -Infinity;
  let bestAction = null;

  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (engine.collides(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;

      const simBoard = simulatePlacement(placement, engine.board, W, H);
      if (!simBoard) continue;

      const info = evaluateBoard(simBoard, W, H);
      const wH = -0.5, wHoles = -3.0, wBump = -0.75, wMaxH = -0.5;
      const sc = wH * info.totalHeight + wHoles * info.holes + wBump * info.bumpiness + wMaxH * info.maxHeight;

      if (sc > bestScore) {
        bestScore = sc;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

// ------ 策略2: Baseline-2step ------
function strategyBaseline2Step(engine) {
  const piece = engine.current;
  const next = engine.next;
  const W = engine.W, H = engine.H;
  let bestScore = -Infinity;
  let bestAction = null;

  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (engine.collides(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;

      const simBoard = simulatePlacement(placement, engine.board, W, H);
      if (!simBoard) continue;

      let nextBest = -Infinity;
      for (let rot2 = 0; rot2 < 4; rot2++) {
        const shape2 = SHAPES[next.type][rot2];
        const width2 = shape2[0].length;
        for (let col2 = 0; col2 <= W - width2; col2++) {
          let row2 = 0;
          while (row2 < H) {
            const test2 = { type: next.type, rotation: rot2, row: row2 + 1, col: col2 };
            if (engine.collidesWithBoard(test2, simBoard)) break;
            row2++;
          }
          const placement2 = { type: next.type, rotation: rot2, row: row2, col: col2 };
          if (placement2.row < 0) continue;

          const simBoard2 = simulatePlacement(placement2, simBoard, W, H);
          if (!simBoard2) continue;

          const info2 = evaluateBoard(simBoard2, W, H);
          const wH = -0.5, wHoles = -3.0, wBump = -0.75, wMaxH = -0.5;
          nextBest = Math.max(nextBest, wH * info2.totalHeight + wHoles * info2.holes + wBump * info2.bumpiness + wMaxH * info2.maxHeight);
        }
      }

      const info = evaluateBoard(simBoard, W, H);
      const wH = -0.5, wHoles = -3.0, wBump = -0.75, wMaxH = -0.5;
      const sc = wH * info.totalHeight + wHoles * info.holes + wBump * info.bumpiness + wMaxH * info.maxHeight;
      const totalScore = sc + (nextBest > -Infinity ? nextBest * 0.5 : 0);

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

// ------ 策略3: FixedLine-1step (修复消行奖励) ------
function strategyFixedLine1Step(engine) {
  const piece = engine.current;
  const W = engine.W, H = engine.H;
  let bestScore = -Infinity;
  let bestAction = null;

  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (engine.collides(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;

      // 放置前计算消行数（在原棋盘上模拟）
      const preBoard = cloneBoard(engine.board);
      const shapeS = SHAPES[piece.type][rot];
      for (let r = 0; r < shapeS.length; r++) {
        for (let c = 0; c < shapeS[r].length; c++) {
          if (!shapeS[r][c]) continue;
          preBoard[placement.row + r][placement.col + c] = true;
        }
      }
      const linesCleared = countLinesToClear(preBoard, W, H);

      const simBoard = simulatePlacement(placement, engine.board, W, H);
      if (!simBoard) continue;

      const info = evaluateBoard(simBoard, W, H);
      const wH = -0.5, wHoles = -3.0, wBump = -0.75, wMaxH = -0.5;
      const sc = wH * info.totalHeight + wHoles * info.holes + wBump * info.bumpiness + wMaxH * info.maxHeight;
      const totalScore = sc + linesCleared * 200;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

// ------ 策略4: FaheyWeights-1step ------
function strategyFahey1Step(engine) {
  const piece = engine.current;
  const W = engine.W, H = engine.H;
  let bestScore = -Infinity;
  let bestAction = null;

  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (engine.collides(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;

      const preBoard = cloneBoard(engine.board);
      const shapeS = SHAPES[piece.type][rot];
      for (let r = 0; r < shapeS.length; r++) {
        for (let c = 0; c < shapeS[r].length; c++) {
          if (!shapeS[r][c]) continue;
          preBoard[placement.row + r][placement.col + c] = true;
        }
      }
      const linesCleared = countLinesToClear(preBoard, W, H);

      const simBoard = simulatePlacement(placement, engine.board, W, H);
      if (!simBoard) continue;

      const info = evaluateBoard(simBoard, W, H);

      // Fahey 经典权重（归一化后）
      const wH = -0.510066;
      const wHoles = -0.760666;
      const wBump = -0.184483;
      const wLines = 0.760666;

      const sc = wH * info.totalHeight + wHoles * info.holes + wBump * info.bumpiness + wLines * (linesCleared * 4);
      // linesCleared * 4 是因为在标准Tetris中一次最多消4行，放大消行效果

      if (sc > bestScore) {
        bestScore = sc;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

// ------ 策略5: FaheyWeights-2step ------
function strategyFahey2Step(engine) {
  const piece = engine.current;
  const next = engine.next;
  const W = engine.W, H = engine.H;
  let bestScore = -Infinity;
  let bestAction = null;

  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (engine.collides(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;

      const preBoard = cloneBoard(engine.board);
      const shapeS = SHAPES[piece.type][rot];
      for (let r = 0; r < shapeS.length; r++) {
        for (let c = 0; c < shapeS[r].length; c++) {
          if (!shapeS[r][c]) continue;
          preBoard[placement.row + r][placement.col + c] = true;
        }
      }
      const linesCleared = countLinesToClear(preBoard, W, H);

      const simBoard = simulatePlacement(placement, engine.board, W, H);
      if (!simBoard) continue;

      let nextBest = -Infinity;
      for (let rot2 = 0; rot2 < 4; rot2++) {
        const shape2 = SHAPES[next.type][rot2];
        const width2 = shape2[0].length;
        for (let col2 = 0; col2 <= W - width2; col2++) {
          let row2 = 0;
          while (row2 < H) {
            const test2 = { type: next.type, rotation: rot2, row: row2 + 1, col: col2 };
            if (engine.collidesWithBoard(test2, simBoard)) break;
            row2++;
          }
          const placement2 = { type: next.type, rotation: rot2, row: row2, col: col2 };
          if (placement2.row < 0) continue;

          const simBoard2 = simulatePlacement(placement2, simBoard, W, H);
          if (!simBoard2) continue;

          const info2 = evaluateBoard(simBoard2, W, H);
          const wH = -0.510066, wHoles = -0.760666, wBump = -0.184483;
          nextBest = Math.max(nextBest, wH * info2.totalHeight + wHoles * info2.holes + wBump * info2.bumpiness);
        }
      }

      const info = evaluateBoard(simBoard, W, H);
      const wH = -0.510066, wHoles = -0.760666, wBump = -0.184483, wLines = 0.760666;
      const sc = wH * info.totalHeight + wHoles * info.holes + wBump * info.bumpiness + wLines * (linesCleared * 4);
      const totalScore = sc + (nextBest > -Infinity ? nextBest * 0.5 : 0);

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

// ------ 策略6: TunedHoles-1step ------
function strategyTunedHoles1Step(engine) {
  const piece = engine.current;
  const W = engine.W, H = engine.H;
  let bestScore = -Infinity;
  let bestAction = null;

  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (engine.collides(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;

      const preBoard = cloneBoard(engine.board);
      const shapeS = SHAPES[piece.type][rot];
      for (let r = 0; r < shapeS.length; r++) {
        for (let c = 0; c < shapeS[r].length; c++) {
          if (!shapeS[r][c]) continue;
          preBoard[placement.row + r][placement.col + c] = true;
        }
      }
      const linesCleared = countLinesToClear(preBoard, W, H);

      const simBoard = simulatePlacement(placement, engine.board, W, H);
      if (!simBoard) continue;

      const info = evaluateBoard(simBoard, W, H);
      const wH = -0.5, wHoles = -1.5, wBump = -0.75, wMaxH = -0.5;
      const sc = wH * info.totalHeight + wHoles * info.holes + wBump * info.bumpiness + wMaxH * info.maxHeight;
      const totalScore = sc + linesCleared * 200;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

// ------ 策略7: CompleteHeuristic (综合优化) ------
function strategyCompleteHeuristic(engine) {
  const piece = engine.current;
  const W = engine.W, H = engine.H;
  let bestScore = -Infinity;
  let bestAction = null;

  // 当前棋盘的空洞数（基准参考）
  const curInfo = evaluateBoard(engine.board, W, H);
  const curHoles = curInfo.holes;

  for (let rot = 0; rot < 4; rot++) {
    const shape = SHAPES[piece.type][rot];
    const width = shape[0].length;
    for (let col = 0; col <= W - width; col++) {
      let row = 0;
      while (row < H) {
        const test = { type: piece.type, rotation: rot, row: row + 1, col };
        if (engine.collides(test)) break;
        row++;
      }
      const placement = { type: piece.type, rotation: rot, row, col };
      if (placement.row < 0) continue;

      // 放置后、消行前的棋盘
      const placedBoard = cloneBoard(engine.board);
      const shapeS = SHAPES[piece.type][rot];
      for (let r = 0; r < shapeS.length; r++) {
        for (let c = 0; c < shapeS[r].length; c++) {
          if (!shapeS[r][c]) continue;
          placedBoard[placement.row + r][placement.col + c] = true;
        }
      }

      // 消行数
      const linesCleared = countLinesToClear(placedBoard, W, H);

      // 消行后的棋盘
      const simBoard = simulatePlacement(placement, engine.board, W, H);
      if (!simBoard) continue;

      const info = evaluateBoard(simBoard, W, H);

      // 空洞变化（正数=空洞减少，奖励）
      const holeImprovement = curHoles - info.holes;

      // 井道深度
      const wells = countWells(info.heights, W);

      // 综合评分
      const wH = -0.5;
      const wHoles = -1.0;
      const wBump = -0.5;
      const wMaxH = -0.3;
      const wLines = 200;
      const wWells = 50;
      const wHoleFill = 100;

      let sc = wH * info.totalHeight + wHoles * info.holes + wBump * info.bumpiness + wMaxH * info.maxHeight;
      sc += linesCleared * wLines;
      sc += wells * wWells;
      sc += holeImprovement * wHoleFill;

      if (sc > bestScore) {
        bestScore = sc;
        bestAction = { rotation: rot, col, row };
      }
    }
  }
  return bestAction;
}

// ===================== 策略注册表 =====================
const STRATEGIES = [
  { name: 'Baseline-1step',        fn: strategyBaseline1Step, baseScoreOnly: true },
  { name: 'Baseline-2step',        fn: strategyBaseline2Step, baseScoreOnly: true },
  { name: 'FixedLine-1step',       fn: strategyFixedLine1Step, baseScoreOnly: false },
  { name: 'FaheyWeights-1step',    fn: strategyFahey1Step, baseScoreOnly: false },
  { name: 'FaheyWeights-2step',    fn: strategyFahey2Step, baseScoreOnly: false },
  { name: 'TunedHoles-1step',      fn: strategyTunedHoles1Step, baseScoreOnly: false },
  { name: 'CompleteHeuristic',     fn: strategyCompleteHeuristic, baseScoreOnly: false },
];

// ===================== 跑一场游戏 =====================
function runOneGame(strategyFn, seed, sizeKey) {
  const engine = new GameEngine(sizeKey, seed);

  while (!engine.gameOver) {
    const action = strategyFn(engine);
    engine.executeAIAction(action);
  }

  return {
    pieces: engine.piecesPlaced,
    lines: engine.lines,
    score: engine.score
  };
}

// ===================== 批量测试 =====================
function runBenchmark(strategy, games, sizeKey) {
  const results = [];
  for (let i = 0; i < games; i++) {
    const seed = 10000 + i;
    const result = runOneGame(strategy.fn, seed, sizeKey);
    results.push(result);
  }

  // 统计
  const pieces = results.map(r => r.pieces);
  const lines = results.map(r => r.lines);
  const scores = results.map(r => r.score);

  pieces.sort((a, b) => a - b);
  lines.sort((a, b) => a - b);
  scores.sort((a, b) => a - b);

  function median(arr) {
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }
  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function max(arr) {
    return Math.max(...arr);
  }
  function min(arr) {
    return Math.min(...arr);
  }

  return {
    name: strategy.name,
    games,
    pieces: { mean: mean(pieces).toFixed(1), median: median(pieces), min: min(pieces), max: max(pieces) },
    lines: { mean: mean(lines).toFixed(1), median: median(lines), min: min(lines), max: max(lines) },
    score: { mean: mean(scores).toFixed(1), median: median(scores), min: min(scores), max: max(scores) }
  };
}

// ===================== 主程序 =====================
const GAMES_PER_STRATEGY = 100;
const SIZE = 'medium';

console.log('='.repeat(100));
console.log('  🧠 俄罗斯方块 AI 策略基准测试');
console.log(`  棋盘: ${CANVAS_SIZES[SIZE].width}×${CANVAS_SIZES[SIZE].height}  |  每种策略 ${GAMES_PER_STRATEGY} 局`);
console.log('='.repeat(100));

async function main() {
  const allResults = [];

  for (const strategy of STRATEGIES) {
    process.stdout.write(`  ▶ ${strategy.name.padEnd(22)}... `);
    const start = Date.now();
    const result = runBenchmark(strategy, GAMES_PER_STRATEGY, SIZE);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`完成 (${elapsed}s)`);
    allResults.push(result);
  }

  // 输出结果表格
  console.log('\n' + '='.repeat(100));
  console.log('  📊 结果对比');
  console.log('='.repeat(100));

  // 表头
  console.log(
    '  ' +
    '策略'.padEnd(22) +
    '放置数(平均)'.padEnd(14) +
    '放置数(中位)'.padEnd(14) +
    '消行(平均)'.padEnd(14) +
    '消行(中位)'.padEnd(14) +
    '分数(平均)'.padEnd(14) +
    '分数(中位)'.padEnd(14)
  );
  console.log('  ' + '-'.repeat(96));

  // 按放置数平均值排序
  allResults.sort((a, b) => parseFloat(b.pieces.mean) - parseFloat(a.pieces.mean));

  for (const r of allResults) {
    console.log(
      '  ' +
      r.name.padEnd(22) +
      String(r.pieces.mean).padStart(10) + '  '.padEnd(4) +
      String(r.median).padStart(10) + '  '.padEnd(4) +
      String(r.lines.mean).padStart(10) + '  '.padEnd(4) +
      String(r.lines.median).padStart(10) + '  '.padEnd(4) +
      String(r.score.mean).padStart(10) + '  '.padEnd(4) +
      String(r.score.median).padStart(10)
    );
  }

  // 详细数据
  console.log('\n' + '='.repeat(100));
  console.log('  📋 详细数据（放置方块数）');
  console.log('='.repeat(100));
  console.log(
    '  ' +
    '策略'.padEnd(22) +
    '平均'.padEnd(10) +
    '中位数'.padEnd(10) +
    '最小值'.padEnd(10) +
    '最大值'.padEnd(10)
  );
  console.log('  ' + '-'.repeat(62));
  for (const r of allResults) {
    console.log(
      '  ' +
      r.name.padEnd(22) +
      String(r.pieces.mean).padStart(8) + '  ' +
      String(r.pieces.median).padStart(8) + '  ' +
      String(r.pieces.min).padStart(8) + '  ' +
      String(r.pieces.max).padStart(8)
    );
  }

  console.log('\n' + '='.repeat(100));
  console.log('  📋 详细数据（消行数）');
  console.log('='.repeat(100));
  console.log(
    '  ' +
    '策略'.padEnd(22) +
    '平均'.padEnd(10) +
    '中位数'.padEnd(10) +
    '最小值'.padEnd(10) +
    '最大值'.padEnd(10)
  );
  console.log('  ' + '-'.repeat(62));
  for (const r of allResults) {
    console.log(
      '  ' +
      r.name.padEnd(22) +
      String(r.lines.mean).padStart(8) + '  ' +
      String(r.lines.median).padStart(8) + '  ' +
      String(r.lines.min).padStart(8) + '  ' +
      String(r.lines.max).padStart(8)
    );
  }

  console.log('\n✅ 基准测试完成！');
}

main().catch(console.error);

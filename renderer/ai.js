// ===================== 共享 AI 引擎（同构：浏览器全局 / node require） =====================
// 评估特征集参考 El-Tetris / Dellacherie：landing height、rows cleared、
// row/col transitions、holes、wells。被实时游戏与 benchmark 共用，保证
// benchmark 数据对实机有代表性。
(function (global) {
  'use strict';

  // El-Tetris 权重（对 1 步前瞻已极强）；weak 为故意削弱的近视权重，可被人类击败。
  const W_ELTETRIS = {
    landingHeight: -4.500158,
    rowsCleared: 3.4181268,
    rowTransitions: -3.2178882,
    colTransitions: -9.348695,
    holes: -7.899265,
    wells: -3.3855972
  };
  const W_WEAK = {
    landingHeight: -1.2,
    rowsCleared: 1.0,
    rowTransitions: 0,
    colTransitions: 0,
    holes: -2.2,
    wells: -0.4
  };

  const DIFFICULTIES = {
    weak:   { weights: W_WEAK,     lookahead: 0, beam: 1,  errorRate: 0.28, useHold: false, label: '弱' },
    normal: { weights: W_ELTETRIS, lookahead: 0, beam: 1,  errorRate: 0.03, useHold: false, label: '普通' },
    insane: { weights: W_ELTETRIS, lookahead: 1, beam: 14, errorRate: 0,    useHold: true,  label: '变态' }
  };

  function cloneBoard(b) { return b.map(r => r.slice()); }

  // Collision test for a raw shape matrix at (row,col). Cells above the top
  // (br < 0) are treated as empty so tall stacks / partial-above placements work.
  function collide(board, shape, row, col) {
    const H = board.length, W = board[0].length;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const br = row + r, bc = col + c;
        if (bc < 0 || bc >= W || br >= H) return true;
        if (br >= 0 && board[br][bc] != null) return true;
      }
    }
    return false;
  }

  function landingRow(board, shape, col) {
    let r = -2;
    if (collide(board, shape, r, col)) return null; // column blocked to the very top
    while (!collide(board, shape, r + 1, col)) r++;
    return r;
  }

  function shapeBounds(shape) {
    let minR = Infinity, maxR = -Infinity;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) { if (r < minR) minR = r; if (r > maxR) maxR = r; }
      }
    }
    return { minR, maxR };
  }

  function stamp(board, shape, row, col) {
    const out = cloneBoard(board);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const br = row + r, bc = col + c;
        if (br >= 0) out[br][bc] = true;
      }
    }
    return out;
  }

  function clearRows(board) {
    const W = board[0].length;
    let cleared = 0;
    const out = board.filter(row => !row.every(cell => cell != null));
    cleared = board.length - out.length;
    while (out.length < board.length) out.unshift(new Array(W).fill(null));
    return { board: out, cleared };
  }

  function columnHeights(board) {
    const H = board.length, W = board[0].length;
    const heights = new Array(W).fill(0);
    for (let c = 0; c < W; c++) {
      for (let r = 0; r < H; r++) {
        if (board[r][c] != null) { heights[c] = H - r; break; }
      }
    }
    return heights;
  }

  function countHoles(board) {
    const H = board.length, W = board[0].length;
    let holes = 0;
    for (let c = 0; c < W; c++) {
      let seen = false;
      for (let r = 0; r < H; r++) {
        if (board[r][c] != null) seen = true;
        else if (seen) holes++;
      }
    }
    return holes;
  }

  function rowTransitions(board) {
    const H = board.length, W = board[0].length;
    let t = 0;
    for (let r = 0; r < H; r++) {
      // skip fully-empty rows (counting them would reward taller stacks)
      let any = false;
      for (let c = 0; c < W; c++) { if (board[r][c] != null) { any = true; break; } }
      if (!any) continue;
      let prev = 1; // left wall = filled
      for (let c = 0; c < W; c++) {
        const cur = board[r][c] != null ? 1 : 0;
        if (cur !== prev) t++;
        prev = cur;
      }
      if (prev !== 1) t++; // right wall = filled
    }
    return t;
  }

  function colTransitions(board) {
    const H = board.length, W = board[0].length;
    let t = 0;
    for (let c = 0; c < W; c++) {
      let prev = 0; // above the top = empty
      for (let r = 0; r < H; r++) {
        const cur = board[r][c] != null ? 1 : 0;
        if (cur !== prev) t++;
        prev = cur;
      }
      if (prev !== 1) t++; // floor below bottom = filled
    }
    return t;
  }

  function wellSums(board) {
    const H = board.length, W = board[0].length;
    const heights = columnHeights(board);
    let wells = 0;
    for (let c = 0; c < W; c++) {
      const leftH = c === 0 ? Infinity : heights[c - 1];
      const rightH = c === W - 1 ? Infinity : heights[c + 1];
      const d = Math.min(leftH, rightH) - heights[c];
      if (d > 0) wells += d * (d + 1) / 2;
    }
    return wells;
  }

  // Evaluate one concrete placement. Returns {score, rowsCleared, board, features} or null.
  function evalPlacement(board, shape, col, weights) {
    const H = board.length;
    const lr = landingRow(board, shape, col);
    if (lr === null) return null;
    const pre = stamp(board, shape, lr, col);
    const { minR, maxR } = shapeBounds(shape);
    const centerRow = lr + (minR + maxR) / 2;
    const landingHeight = H - centerRow;
    const { board: post, cleared } = clearRows(pre);
    const f = {
      landingHeight,
      rowsCleared: cleared,
      rowTransitions: rowTransitions(post),
      colTransitions: colTransitions(post),
      holes: countHoles(post),
      wells: wellSums(post)
    };
    const score = weights.landingHeight * f.landingHeight
      + weights.rowsCleared * f.rowsCleared
      + weights.rowTransitions * f.rowTransitions
      + weights.colTransitions * f.colTransitions
      + weights.holes * f.holes
      + weights.wells * f.wells;
    return { score, rowsCleared: cleared, board: post, features: f };
  }

  // All placements of a piece type on a board. Returns [{rotation,col,score,board,features}].
  function enumerate(board, type, shapes, weights) {
    const W = board[0].length;
    const out = [];
    const seen = new Set();
    for (let rot = 0; rot < 4; rot++) {
      const shape = shapes[type][rot];
      const key = shape.map(r => r.join('')).join('|');
      if (seen.has(key)) continue; // skip duplicate orientations (O, I-180, etc.)
      seen.add(key);
      // Span all box offsets (the 4x4 box may have empty edge columns, e.g. the
      // vertical I sits at box-col 2). Out-of-bounds filled cells yield null and
      // are skipped, so this guarantees full column coverage incl. the edges.
      for (let col = -3; col <= W + 2; col++) {
        const res = evalPlacement(board, shape, col, weights);
        if (res) out.push({ rotation: rot, col, score: res.score, board: res.board, features: res.features });
      }
    }
    return out;
  }

  // Best achievable score for a sequence of pieces using beam search.
  function bestSequenceScore(board, pieces, idx, shapes, weights, beam) {
    if (idx >= pieces.length) return 0;
    const placements = enumerate(board, pieces[idx], shapes, weights);
    if (placements.length === 0) return -1e9;
    if (idx === pieces.length - 1) {
      let best = -Infinity;
      for (const p of placements) if (p.score > best) best = p.score;
      return best;
    }
    placements.sort((a, b) => b.score - a.score);
    const top = placements.slice(0, beam);
    let best = -Infinity;
    for (const p of top) {
      const future = bestSequenceScore(p.board, pieces, idx + 1, shapes, weights, beam);
      const total = p.score + future;
      if (total > best) best = total;
    }
    return best;
  }

  // Pick the move for `current`, given upcoming `nexts` (array of types) and `hold`.
  // opts: { shapes, difficulty|tier, canHold, rng }
  // Returns { rotation, col, useHold, score, features } or null if no move exists.
  function chooseMove(board, current, nexts, hold, opts) {
    opts = opts || {};
    const shapes = opts.shapes;
    const cfg = DIFFICULTIES[opts.tier] || DIFFICULTIES.normal;
    const weights = opts.weights || cfg.weights;
    const rng = opts.rng || Math.random;
    nexts = nexts || [];

    const evalBranch = (firstType, lookaheadPieces) => {
      const placements = enumerate(board, firstType, shapes, weights);
      if (placements.length === 0) return null;
      let best = null;
      if (cfg.lookahead > 0 && lookaheadPieces.length > 0) {
        placements.sort((a, b) => b.score - a.score);
        const top = placements.slice(0, cfg.beam);
        for (const p of top) {
          const depth = Math.min(cfg.lookahead, lookaheadPieces.length);
          const future = bestSequenceScore(p.board, lookaheadPieces.slice(0, depth), 0, shapes, weights, cfg.beam);
          const total = p.score + future;
          if (!best || total > best.total) best = { p, total };
        }
      } else {
        for (const p of placements) {
          if (!best || p.score > best.total) best = { p, total: p.score };
        }
      }
      return best; // { p, total }
    };

    // No-hold branch: place `current`, look ahead over nexts.
    const noHold = evalBranch(current, nexts);
    if (!noHold) return null;

    // Error model (beatable tiers): sometimes pick a random legal placement.
    if (cfg.errorRate > 0 && rng() < cfg.errorRate) {
      const placements = enumerate(board, current, shapes, weights);
      const pick = placements[Math.floor(rng() * placements.length)] || noHold.p;
      return { rotation: pick.rotation, col: pick.col, useHold: false, score: pick.score, features: pick.features };
    }

    // Hold branch (insane): swap current with hold (or peek next), then look ahead.
    if (cfg.useHold && opts.canHold) {
      const heldActive = (hold != null) ? hold : (nexts[0] != null ? nexts[0] : null);
      if (heldActive != null) {
        const heldNexts = (hold != null) ? nexts : nexts.slice(1);
        const holdBranch = evalBranch(heldActive, heldNexts);
        if (holdBranch && holdBranch.total > noHold.total + 1e-6) {
          return { useHold: true, rotation: 0, col: noHold.p.col, score: holdBranch.total, features: holdBranch.p.features };
        }
      }
    }

    return { rotation: noHold.p.rotation, col: noHold.p.col, useHold: false, score: noHold.p.score, features: noHold.p.features };
  }

  const TetrisAI = {
    DIFFICULTIES,
    W_ELTETRIS,
    W_WEAK,
    chooseMove,
    enumerate,
    evalPlacement,
    // feature helpers (exported for tests)
    columnHeights, countHoles, rowTransitions, colTransitions, wellSums, clearRows, landingRow
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = TetrisAI;
  else global.TetrisAI = TetrisAI;
})(typeof window !== 'undefined' ? window : globalThis);

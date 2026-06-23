// ===================== AI 策略基准测试（共享引擎版） =====================
// 用 renderer/ai.js（实机同款评估）驱动一个无 UI 的 7-bag 引擎，对比：
//   - Legacy(shipped)  旧版 1-step 启发式（聚合高度/空洞/bumpiness/maxH）
//   - ElTetris normal   新评估 1-ply
//   - ElTetris insane   新评估 2-ply + hold
// 因强 AI 近乎不死，按「每局方块数上限」封顶，并报告触顶比例。
const AI = require('./renderer/ai.js');
const { SHAPES, PIECE_TYPES } = require('./renderer/tetris.js');

// ---- 可复现随机：seeded 7-bag ----
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function makeBag(rng) {
  let bag = [];
  return () => {
    if (bag.length === 0) {
      bag = PIECE_TYPES.slice();
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    }
    return bag.pop();
  };
}

// ---- 引擎 ----
function emptyBoard(W, H) { return Array.from({ length: H }, () => new Array(W).fill(null)); }

function place(board, type, rotation, col) {
  const shape = SHAPES[type][rotation];
  const lr = AI.landingRow(board, shape, col);
  if (lr === null) return null;
  const nb = board.map(r => r.slice());
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const br = lr + r, bc = col + c;
      if (br < 0) return { dead: true };  // locked above the board -> top out
      nb[br][bc] = true;
    }
  }
  const { board: cleared, cleared: n } = AI.clearRows(nb);
  return { board: cleared, cleared: n };
}

function runGame(strategy, seed, W, H, cap) {
  const rng = makeRng(seed);
  const bag = makeBag(rng);
  let board = emptyBoard(W, H);
  let current = bag(), next = bag(), hold = null, canHold = true;
  let lines = 0, pieces = 0;

  while (pieces < cap) {
    const ctx = { board, current, next, hold, canHold };
    let mv = strategy.choose(ctx);
    if (!mv) break;

    if (mv.useHold && canHold) {
      if (hold === null) { hold = current; current = next; next = bag(); }
      else { const t = hold; hold = current; current = t; }
      canHold = false;
      // re-plan placement for the swapped-in piece (no further hold this turn)
      mv = strategy.choose({ board, current, next, hold, canHold });
      if (!mv) break;
    }

    const res = place(board, current, mv.rotation, mv.col);
    if (!res || res.dead) break;
    board = res.board;
    lines += res.cleared;
    pieces++;
    current = next; next = bag(); canHold = true;
  }
  return { lines, pieces, cappedOut: pieces >= cap };
}

// ---- legacy（复刻旧版 shipped 1-step 启发式） ----
function legacyChoose(ctx) {
  const placements = AI.enumerate(ctx.board, ctx.current, SHAPES, AI.W_ELTETRIS);
  let best = null;
  for (const p of placements) {
    const h = AI.columnHeights(p.board);
    let aggH = 0, maxH = 0, bump = 0;
    for (let i = 0; i < h.length; i++) { aggH += h[i]; if (h[i] > maxH) maxH = h[i]; }
    for (let i = 0; i < h.length - 1; i++) bump += Math.abs(h[i] - h[i + 1]);
    const holes = AI.countHoles(p.board);
    const sc = -0.5 * aggH - 1.5 * holes - 0.75 * bump - 0.5 * maxH + p.features.rowsCleared * 200;
    if (!best || sc > best.sc) best = { sc, rotation: p.rotation, col: p.col };
  }
  return best ? { rotation: best.rotation, col: best.col, useHold: false } : null;
}

const STRATEGIES = [
  { name: 'Legacy (shipped 1-step)', games: 20, cap: 2000, choose: legacyChoose },
  { name: 'ElTetris normal (1-ply)', games: 20, cap: 2000, choose: c => AI.chooseMove(c.board, c.current, [], null, { shapes: SHAPES, tier: 'normal' }) },
  { name: 'ElTetris insane (2-ply+hold)', games: 8, cap: 2000, choose: c => AI.chooseMove(c.board, c.current, [c.next], c.hold, { shapes: SHAPES, tier: 'insane', canHold: c.canHold }) }
];

function stats(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  return { mean: mean.toFixed(1), median, min: s[0], max: s[s.length - 1] };
}

const W = 10, H = 20;
console.log('='.repeat(86));
console.log(`  俄罗斯方块 AI 基准（共享引擎 / ${W}x${H} / 7-bag / 每局方块上限见下）`);
console.log('='.repeat(86));

const results = [];
for (const st of STRATEGIES) {
  process.stdout.write(`  ▶ ${st.name.padEnd(30)} (${st.games} 局, 上限 ${st.cap}) ... `);
  const t0 = Date.now();
  const lines = [], pieces = [];
  let capped = 0;
  for (let i = 0; i < st.games; i++) {
    const r = runGame(st, 10000 + i, W, H, st.cap);
    lines.push(r.lines); pieces.push(r.pieces); if (r.cappedOut) capped++;
  }
  console.log(`${((Date.now() - t0) / 1000).toFixed(1)}s`);
  results.push({ name: st.name, games: st.games, capped, lines: stats(lines), pieces: stats(pieces) });
}

console.log('\n' + '='.repeat(86));
console.log('  消行数（lines cleared）');
console.log('='.repeat(86));
console.log('  ' + '策略'.padEnd(30) + '平均'.padStart(10) + '中位'.padStart(10) + '最小'.padStart(10) + '最大'.padStart(10) + '  触顶');
console.log('  ' + '-'.repeat(82));
for (const r of results) {
  console.log('  ' + r.name.padEnd(30) +
    String(r.lines.mean).padStart(10) + String(r.lines.median).padStart(10) +
    String(r.lines.min).padStart(10) + String(r.lines.max).padStart(10) +
    `   ${r.capped}/${r.games}`);
}
console.log('\n  放置方块数（pieces）');
console.log('  ' + '-'.repeat(82));
for (const r of results) {
  console.log('  ' + r.name.padEnd(30) +
    String(r.pieces.mean).padStart(10) + String(r.pieces.median).padStart(10) +
    String(r.pieces.min).padStart(10) + String(r.pieces.max).padStart(10));
}
console.log('\n  注：强 AI 触顶（达到方块上限仍未死）即视为「实际上不死」。');

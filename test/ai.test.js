// Unit tests for the shared AI engine (renderer/ai.js).
// Run: node test/ai.test.js
const AI = require('../renderer/ai.js');
const { SHAPES } = require('../renderer/tetris.js');

let passed = 0, failed = 0;
function ok(name, cond) { cond ? passed++ : (failed++, console.error('  ✗ FAIL: ' + name)); }
function eq(name, a, b) {
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (!same) console.error(`  ✗ FAIL: ${name}\n      expected ${JSON.stringify(b)}  got ${JSON.stringify(a)}`);
  same ? passed++ : failed++;
}
function emptyBoard(w, h) { return Array.from({ length: h }, () => new Array(w).fill(null)); }

// ---------- feature helpers ----------
(() => {
  const b = emptyBoard(4, 4);
  b[0][0] = true; // filled top of col0 -> 3 empties below count as holes
  eq('countHoles: filled-over-empties', AI.countHoles(b), 3);

  eq('rowTransitions: empty board = 0 (empty rows skipped)', AI.rowTransitions(emptyBoard(4, 4)), 0);
  const rb = emptyBoard(4, 4);
  rb[3][0] = true; rb[3][1] = true; // row: F F . .  -> wall|FF (0) .. (1 at c2) ..|wall (1) = 2
  eq('rowTransitions: half-filled row = 2', AI.rowTransitions(rb), 2);

  eq('colTransitions: empty board = W (floor only)', AI.colTransitions(emptyBoard(4, 4)), 4);

  const wb = emptyBoard(3, 4);
  wb[1][1] = true; wb[2][1] = true; wb[3][1] = true; // col1 height 3, cols 0/2 height 0
  eq('wellSums: two depth-3 wells either side = 6+6', AI.wellSums(wb), 12);
})();

// ---------- chooseMove: clears an available line ----------
(() => {
  // Empty 4-wide board + I piece: a flat I fills the bottom row entirely -> clear.
  const b = emptyBoard(4, 6);
  const mv = AI.chooseMove(b, 'I', [], null, { shapes: SHAPES, tier: 'normal' });
  ok('line-clear: returns a move', mv !== null);
  eq('line-clear: chosen move clears exactly 1 row', mv.features.rowsCleared, 1);
  ok('line-clear: not a hold', mv.useHold === false);
})();

// ---------- chooseMove: avoids creating a hole ----------
(() => {
  // col0 has a 1-high bump; an O placed over cols0-1 would bury a hole under col1.
  // The AI should instead place the O on the flat cols2-3 (no hole).
  const b = emptyBoard(4, 6);
  b[5][0] = true; // bump at bottom of col0
  const mv = AI.chooseMove(b, 'O', [], null, { shapes: SHAPES, tier: 'normal' });
  ok('avoid-hole: returns a move', mv !== null);
  eq('avoid-hole: chosen placement creates no hole', mv.features.holes, 0);
})();

// ---------- chooseMove: insane tier uses hold when beneficial / returns valid move ----------
(() => {
  const b = emptyBoard(10, 20);
  const mv = AI.chooseMove(b, 'S', ['I'], null, { shapes: SHAPES, tier: 'insane', canHold: true });
  ok('insane: returns a valid move on empty board', mv !== null && typeof mv.col === 'number');
})();

// ---------- enumerate sanity ----------
(() => {
  const b = emptyBoard(10, 20);
  const placements = AI.enumerate(b, 'O', SHAPES, AI.W_ELTETRIS);
  // O collapses to a single orientation; valid columns 0..8 on width-10 = 9.
  ok('enumerate O: dedup to one orientation, 9 columns', placements.length === 9 && new Set(placements.map(p => p.rotation)).size === 1);
  // Vertical I must be placeable in every board column incl. the edges (10).
  const vertI = AI.enumerate(b, 'I', SHAPES, AI.W_ELTETRIS).filter(p => p.rotation === 1);
  ok('enumerate I: vertical orientation reaches all 10 columns', vertI.length === 10);
})();

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

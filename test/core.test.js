// Headless unit tests for the pure engine logic in renderer/tetris.js.
// Run: node test/core.test.js
const T = require('../renderer/tetris.js');

let passed = 0, failed = 0;
function ok(name, cond) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ FAIL: ' + name); }
}
function eq(name, a, b) {
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (!same) console.error(`  ✗ FAIL: ${name}\n      expected ${JSON.stringify(b)}\n      got      ${JSON.stringify(a)}`);
  same ? passed++ : failed++;
}
function emptyBoard(w = 10, h = 20) {
  return Array.from({ length: h }, () => new Array(w).fill(null));
}

// ---------- collidesAt ----------
(() => {
  const b = emptyBoard();
  ok('empty board: no collision', !T.collidesAt(b, 'T', 0, 0, 3));
  ok('left out of bounds collides', T.collidesAt(b, 'T', 0, 0, -2));
  ok('right out of bounds collides', T.collidesAt(b, 'T', 0, 0, 9));
  ok('floor out of bounds collides', T.collidesAt(b, 'I', 0, 20, 3));
  b[1][4] = true;
  ok('overlap with stack collides', T.collidesAt(b, 'O', 0, 0, 4));
})();

// ---------- resolveRotation: open space ----------
(() => {
  const b = emptyBoard();
  const r = T.resolveRotation(b, { type: 'T', rotation: 0, row: 5, col: 4 }, 1);
  eq('open-space CW: rotation->1, no kick offset', { rotation: r.rotation, row: r.row, col: r.col, kickIndex: r.kickIndex }, { rotation: 1, row: 5, col: 4, kickIndex: 0 });
  const o = T.resolveRotation(b, { type: 'O', rotation: 0, row: 5, col: 4 }, 1);
  eq('O piece rotation is positional no-op', { row: o.row, col: o.col }, { row: 5, col: 4 });
})();

// ---------- resolveRotation: floor kick (I horizontal on floor -> vertical, kicks up) ----------
(() => {
  const b = emptyBoard();
  // I rotation0 (cells in shape row 1). row=18 -> cells on board row 19 (the floor). col=3 (spawn).
  const r = T.resolveRotation(b, { type: 'I', rotation: 0, row: 18, col: 3 }, 1);
  ok('floor I-kick succeeds (not null)', r !== null);
  eq('floor I-kick lands at rotation1,row16,col4 (kick test #5)', { rotation: r.rotation, row: r.row, col: r.col, kickIndex: r.kickIndex }, { rotation: 1, row: 16, col: 4, kickIndex: 4 });
})();

// ---------- resolveRotation: left-wall kick (vertical I at far left -> horizontal, kicks right) ----------
(() => {
  const b = emptyBoard();
  const r = T.resolveRotation(b, { type: 'I', rotation: 1, row: 5, col: -2 }, 1);
  ok('left-wall I-kick succeeds', r !== null);
  eq('left-wall I-kick lands rotation2,row5,col0 (kick test #3)', { rotation: r.rotation, row: r.row, col: r.col, kickIndex: r.kickIndex }, { rotation: 2, row: 5, col: 0, kickIndex: 2 });
})();

// ---------- resolveRotation: no kick possible -> null ----------
(() => {
  // 3-wide board, fill everything except a single column so the piece can't rotate anywhere.
  const b = emptyBoard(3, 6);
  for (let r = 0; r < 6; r++) { b[r][0] = true; b[r][2] = true; } // only column 1 free (1 wide)
  // A vertical I cannot exist in 1-wide free space; use T in the well -> any rotation collides.
  const res = T.resolveRotation(b, { type: 'T', rotation: 0, row: 2, col: 0 }, 1);
  ok('rotation with no valid kick returns null', res === null);
})();

// ---------- BagRandomizer ----------
(() => {
  const bag = new T.BagRandomizer();
  const first7 = Array.from({ length: 7 }, () => bag.next()).sort().join('');
  eq('first 7 draws contain every piece once', first7, 'IJLOSTZ');
  const next7 = Array.from({ length: 7 }, () => bag.next()).sort().join('');
  eq('next 7 draws contain every piece once', next7, 'IJLOSTZ');
})();

// ---------- computeClearScore ----------
(() => {
  eq('single @ lvl1 = 100', T.computeClearScore(1, 'none', 1, false, -1).points, 100);
  eq('tetris @ lvl1 = 800', T.computeClearScore(4, 'none', 1, false, -1).points, 800);
  ok('tetris is difficult', T.computeClearScore(4, 'none', 1, false, -1).difficult === true);
  ok('single is not difficult', T.computeClearScore(1, 'none', 1, false, -1).difficult === false);
  eq('tetris @ lvl2 with B2B = 1600*1.5 = 2400', T.computeClearScore(4, 'none', 2, true, -1).points, 2400);
  eq('T-spin double @ lvl3 = 1200*3 = 3600', T.computeClearScore(2, 'full', 3, false, -1).points, 3600);
  ok('T-spin (lines) is difficult', T.computeClearScore(2, 'full', 1, false, -1).difficult === true);
  eq('single @ lvl1 with combo 2 = 100 + 50*2 = 200', T.computeClearScore(1, 'none', 1, false, 2).points, 200);
  eq('T-spin no-line still scores 400*lvl', T.computeClearScore(0, 'full', 2, false, -1).points, 800);
})();

// ---------- detectTSpin (3-corner rule) ----------
(() => {
  const b = emptyBoard();
  const piece = { type: 'T', rotation: 0, row: 17, col: 4 }; // center (18,5); corners TL(17,4) TR(17,6) BL(19,4) BR(19,6)
  b[17][4] = true; b[17][6] = true; b[19][6] = true; // TL,TR,BR filled (front TL&TR for rot0)
  eq('3 corners incl. both front -> full', T.detectTSpin(b, piece, true), 'full');
  ok('lastWasRotation=false -> none', T.detectTSpin(b, piece, false) === 'none');
  const b2 = emptyBoard();
  b2[19][4] = true; b2[19][6] = true; b2[17][6] = true; // BL,BR,TR (only one front corner TR)
  eq('3 corners but not both front -> mini', T.detectTSpin(b2, piece, true), 'mini');
  const b3 = emptyBoard();
  b3[17][4] = true; b3[19][6] = true; // only 2 corners
  ok('fewer than 3 corners -> none', T.detectTSpin(b3, piece, true) === 'none');
  ok('non-T piece -> none', T.detectTSpin(b, { type: 'L', rotation: 0, row: 17, col: 4 }, true) === 'none');
})();

// ---------- getFullRows / dropDistance ----------
(() => {
  const b = emptyBoard();
  for (let c = 0; c < 10; c++) b[19][c] = true;
  eq('one full bottom row detected', T.getFullRows(b), [19]);
  eq('drop distance from top of empty 20-tall board (I spawn row1)', T.dropDistance(emptyBoard(), { type: 'I', rotation: 0, row: 0, col: 3 }), 18);
})();

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

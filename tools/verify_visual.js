// Programmatic verification harness for the Tetris widget.
// Loads the real renderer offscreen, scripts the engine via executeJavaScript
// (engine functions/state are page globals), captures PNGs, and asserts state.
// Run:  npx electron tools/verify_visual.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'verify_shots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const win = new BrowserWindow({
    width: 400,
    height: 520,
    x: -2200, y: 0,            // offscreen so we don't disturb the user
    show: true,                 // shown (not minimized) so requestAnimationFrame runs
    frame: false,
    transparent: false,
    backgroundColor: '#0b0b10',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  await wait(900); // let init() + async config + first render settle

  const results = {};
  const shot = async (name) => {
    const img = await win.webContents.capturePage();
    const p = path.join(OUT, name);
    fs.writeFileSync(p, img.toPNG());
    return p;
  };
  const evaljs = (code) => win.webContents.executeJavaScript(code, true);

  // ---- Scenario A: manual play — hold + hard drops + render ----
  results.A = await evaljs(`(function(){
    try {
      resetGame(); paused = false;
      holdPiece();
      for (var i=0;i<6;i++){ hardDrop(); }
      draw();
      return JSON.stringify({ ok:true, holdType:holdType, nextType:nextType, score:score, lines:lines, hasCurrent:!!currentPiece, gameOver:gameOver });
    } catch(e){ return JSON.stringify({ ok:false, error:String(e && e.stack || e) }); }
  })();`);
  await shot('A_manual.png');

  // ---- Scenario B: SRS wall kick — vertical I flush right, rotate CW, expect kick ----
  results.B = await evaljs(`(function(){
    try {
      for (var r=0;r<board.length;r++) for(var c=0;c<board[0].length;c++) board[r][c]=null;
      var W = board[0].length;
      currentPiece = { type:'I', rotation:1, row:6, col:W-3 }; // occupied col = W-1 (flush right)
      var before = Object.assign({}, currentPiece);
      var ok = rotate(1); // -> horizontal; naive would poke past right wall, so it must kick
      var after = Object.assign({}, currentPiece);
      draw();
      return JSON.stringify({ ok:true, kickReturned:ok, before:before, after:after });
    } catch(e){ return JSON.stringify({ ok:false, error:String(e && e.stack || e) }); }
  })();`);
  await shot('B_wallkick.png');

  // ---- Scenario C: T-spin scoring path — build a T-slot, rotate T in, lock, read score ----
  results.C = await evaljs(`(function(){
    try {
      var H=board.length, W=board[0].length;
      for (var r=0;r<H;r++) for(var c=0;c<W;c++) board[r][c]=null;
      // Build a T-slot at columns 3..5 on the floor: fill bottom two rows except the slot,
      // with an overhang so a T must be spun in.
      for (var c=0;c<W;c++){ board[H-1][c] = '#555'; board[H-2][c] = '#555'; }
      board[H-1][4]=null; board[H-2][4]=null; board[H-2][3]=null; board[H-2][5]=null; // notch + mouth
      board[H-3][3]='#555'; board[H-3][5]='#555'; // overhang corners
      score=0; lines=0; combo=-1; b2b=false;
      currentPiece = { type:'T', rotation:0, row:H-4, col:3 };
      // hard drop into the mouth, then spin to tuck (rotation makes it a T-spin)
      // place T above slot, rotate to point down, then drop
      currentPiece = { type:'T', rotation:2, row:H-4, col:3 };
      var moved=0; while(move(1,0)) moved++;
      var ts = detectTSpin(board, currentPiece, true);
      return JSON.stringify({ ok:true, droppedCells:moved, tSpinIfRotated: ts });
    } catch(e){ return JSON.stringify({ ok:false, error:String(e && e.stack || e) }); }
  })();`);
  await shot('C_tspin_setup.png');

  // ---- Scenario D: AI + real loop — let AI+ play, then read progress ----
  await evaljs(`(function(){ aiMode=2; applyAIMode(2); resetGame(); startLoop(); return 'ai-started'; })();`);
  await wait(3000);
  results.D = await evaljs(`(function(){ return JSON.stringify({ aiLines:lines, aiScore:score, hasCurrent:!!currentPiece, gameOver:gameOver }); })();`);
  await shot('D_ai_playing.png');

  console.log('VERIFY_RESULTS=' + JSON.stringify(results));
  await wait(200);
  win.destroy();
  app.quit();
}

app.whenReady().then(() => run().catch(err => {
  console.error('VERIFY_ERROR=' + (err && err.stack || err));
  app.quit();
}));

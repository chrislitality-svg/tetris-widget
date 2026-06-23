// Verifies the Electron OS/window primitives Phase 3 relies on actually work in
// this environment, and captures the disguise window. Run: npx electron tools/verify_window.js
const { app, BrowserWindow, Tray, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'verify_shots');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));

app.whenReady().then(async () => {
  const res = {};
  const win = new BrowserWindow({
    width: 1100, height: 720, x: -2300, y: 0, show: true,
    backgroundColor: '#1e1e1e',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'disguise.html'));
  await wait(1200);
  res.disguiseShot = 'empty';
  for (let i = 0; i < 4; i++) {
    try {
      const buf = (await win.webContents.capturePage()).toPNG();
      if (buf && buf.length > 0) { fs.writeFileSync(path.join(OUT, 'E_disguise.png'), buf); res.disguiseShot = 'saved(' + buf.length + ')'; break; }
    } catch (e) { res.disguiseShot = 'ERR:' + e.message; break; }
    await wait(500);
  }

  try { win.setOpacity(0.45); res.opacity = Math.round(win.getOpacity() * 100) / 100; }
  catch (e) { res.opacity = 'ERR:' + e.message; }
  try { win.setOpacity(1); win.setIgnoreMouseEvents(true, { forward: true }); win.setIgnoreMouseEvents(false); res.clickThrough = 'ok'; }
  catch (e) { res.clickThrough = 'ERR:' + e.message; }
  try { win.setAlwaysOnTop(true); res.alwaysOnTop = win.isAlwaysOnTop(); win.setAlwaysOnTop(false); }
  catch (e) { res.alwaysOnTop = 'ERR:' + e.message; }
  try { win.setTitle('main.js — Visual Studio Code'); res.title = win.getTitle(); }
  catch (e) { res.title = 'ERR:' + e.message; }
  try { const t = new Tray(path.join(__dirname, '..', 'icon.ico')); res.tray = 'ok'; t.destroy(); }
  catch (e) { res.tray = 'ERR:' + e.message; }
  try {
    const ok = globalShortcut.register('Control+Alt+B', () => {});
    res.globalShortcut = { registered: ok, isRegistered: globalShortcut.isRegistered('Control+Alt+B') };
    globalShortcut.unregisterAll();
  } catch (e) { res.globalShortcut = 'ERR:' + e.message; }

  console.log('WINDOW_RESULTS=' + JSON.stringify(res));
  await wait(150);
  win.destroy();
  app.quit();
}).catch(err => { console.error('WINDOW_ERROR=' + (err && err.stack || err)); app.quit(); });

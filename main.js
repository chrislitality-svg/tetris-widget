const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let disguiseWindow = null;
let tray = null;
let bossActive = false;

const DEFAULT_WIDTH = 430;
const DEFAULT_HEIGHT = 500;

const CONFIG_FILE = 'tetris-config.json';
let configPath = '';

// Only these top-level keys may be persisted (save-config hardening).
const ALLOWED_CONFIG_KEYS = ['size', 'speed', 'aiMode', 'highScore', 'settings', 'windowBounds', 'mode', 'records', 'achievements'];

// Configurable global hotkeys (renderer can override via apply-global-hotkeys).
let globalHotkeys = {
  boss: 'Control+Alt+B',
  toggleShow: 'Control+Alt+H',
  clickThrough: 'Control+Alt+T',
  mini: 'Control+Alt+M'
};

// ========== 配置持久化 ==========
function initConfigPath() {
  if (!configPath) {
    const userData = app.getPath('userData');
    if (!fs.existsSync(userData)) fs.mkdirSync(userData, { recursive: true });
    configPath = path.join(userData, CONFIG_FILE);
  }
}

function loadConfig() {
  initConfigPath();
  try {
    if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error('读取配置失败:', err);
  }
  return {};
}

function sanitizeConfig(patch) {
  const out = {};
  if (!patch || typeof patch !== 'object') return out;
  for (const k of ALLOWED_CONFIG_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) out[k] = patch[k];
  }
  return out;
}

function saveConfig(config) {
  initConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(sanitizeConfig(config), null, 2));
  } catch (err) {
    console.error('保存配置失败:', err);
  }
}

// ========== 窗口位置持久化 ==========
function saveWindowBounds() {
  if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.isVisible()) return;
  const config = loadConfig();
  config.windowBounds = mainWindow.getBounds();
  saveConfig(config);
}

function getDefaultBounds() {
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  return { x: width - DEFAULT_WIDTH - 20, y: 50, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
}

function restoreWindowBounds() {
  const config = loadConfig();
  return config.windowBounds || getDefaultBounds();
}

// Keep a bounds rect fully on a real display (used on load and on resize).
function clampToWorkArea(bounds) {
  const display = screen.getDisplayNearestPoint({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  });
  const area = display.workArea;
  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);
  const x = Math.max(area.x, Math.min(bounds.x, area.x + area.width - width));
  const y = Math.max(area.y, Math.min(bounds.y, area.y + area.height - height));
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function ensureVisible(bounds) {
  const displays = screen.getAllDisplays();
  if (displays.length === 0) return getDefaultBounds();
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const area = screen.getDisplayNearestPoint({ x: centerX, y: centerY }).workArea;
  const fullyOutside =
    bounds.x + bounds.width < area.x || bounds.x > area.x + area.width ||
    bounds.y + bounds.height < area.y || bounds.y > area.y + area.height;
  if (fullyOutside) {
    return { x: area.x + area.width - DEFAULT_WIDTH - 20, y: area.y + 50, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
  return clampToWorkArea(bounds);
}

// ========== 游戏窗口 ==========
function createWindow() {
  const safeBounds = ensureVisible(restoreWindowBounds());
  mainWindow = new BrowserWindow({
    width: safeBounds.width,
    height: safeBounds.height,
    x: safeBounds.x,
    y: safeBounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      devTools: !app.isPackaged
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('moved', saveWindowBounds);
  mainWindow.on('resize', saveWindowBounds);
  mainWindow.on('close', saveWindowBounds);
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ========== 伪装窗口（假代码编辑器） ==========
function createDisguise() {
  disguiseWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    show: false,
    title: 'tetris.js — Visual Studio Code',
    backgroundColor: '#1e1e1e',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  disguiseWindow.setMenuBarVisibility(false);
  disguiseWindow.loadFile(path.join(__dirname, 'renderer', 'disguise.html'));
  // Closing the disguise restores the game rather than quitting.
  disguiseWindow.on('close', (e) => {
    if (app.isQuitting) return;
    e.preventDefault();
    unboss();
  });
}

function showDisguise() {
  if (!disguiseWindow || disguiseWindow.isDestroyed()) createDisguise();
  disguiseWindow.show();
  disguiseWindow.focus();
}
function hideDisguise() { if (disguiseWindow && !disguiseWindow.isDestroyed()) disguiseWindow.hide(); }

function notifyRenderer(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('main-event', payload);
}

// ========== 老板键 ==========
function bossOn() {
  bossActive = true;
  notifyRenderer({ type: 'boss', active: true });
  if (mainWindow) mainWindow.hide();
  showDisguise();
}
function unboss() {
  bossActive = false;
  hideDisguise();
  if (mainWindow) { mainWindow.show(); notifyRenderer({ type: 'boss', active: false }); }
}
function toggleBoss() { bossActive ? unboss() : bossOn(); }

// ========== 可见性 ==========
function isVisible() { return mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible(); }
function setVisible(v) {
  if (!mainWindow) return;
  if (v) { mainWindow.show(); }
  else { mainWindow.hide(); notifyRenderer({ type: 'hidden' }); }
}

// ========== 托盘 ==========
function createTray() {
  try {
    tray = new Tray(path.join(__dirname, 'icon.ico'));
  } catch (e) {
    console.error('托盘创建失败:', e);
    return;
  }
  const menu = Menu.buildFromTemplate([
    { label: '显示 / 隐藏', click: () => setVisible(!isVisible()) },
    { label: '老板键（隐藏并伪装）', click: toggleBoss },
    { label: '鼠标穿透 开/关', click: () => notifyRenderer({ type: 'toggle-clickthrough' }) },
    { label: 'Mini 模式 开/关', click: () => notifyRenderer({ type: 'toggle-mini' }) },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setToolTip('俄罗斯方块');
  tray.setContextMenu(menu);
  tray.on('click', () => setVisible(!isVisible()));
}

// ========== 全局热键 ==========
function registerGlobalShortcuts() {
  globalShortcut.unregisterAll();
  const reg = (accel, fn) => {
    if (!accel) return;
    try { globalShortcut.register(accel, fn); } catch (e) { /* combo unavailable */ }
  };
  reg(globalHotkeys.boss, toggleBoss);
  reg(globalHotkeys.toggleShow, () => setVisible(!isVisible()));
  reg(globalHotkeys.clickThrough, () => notifyRenderer({ type: 'toggle-clickthrough' }));
  reg(globalHotkeys.mini, () => notifyRenderer({ type: 'toggle-mini' }));
}

// ========== IPC ==========
ipcMain.handle('load-config', () => loadConfig());
ipcMain.handle('save-config', (event, patch) => {
  const config = loadConfig();
  Object.assign(config, sanitizeConfig(patch));
  saveConfig(config);
  return config;
});
ipcMain.handle('set-window-size', (event, { width, height }) => {
  if (!mainWindow) return;
  const b = mainWindow.getBounds();
  const clamped = clampToWorkArea({ x: b.x, y: b.y, width: Math.round(width), height: Math.round(height) });
  mainWindow.setBounds(clamped);
  saveWindowBounds();
});
ipcMain.handle('quit-app', () => { app.isQuitting = true; app.quit(); });
ipcMain.handle('set-opacity', (e, v) => {
  if (mainWindow) mainWindow.setOpacity(Math.max(0.1, Math.min(1, Number(v) || 1)));
});
ipcMain.handle('set-click-through', (e, on) => {
  if (mainWindow) mainWindow.setIgnoreMouseEvents(!!on, { forward: true });
});
ipcMain.handle('set-title', (e, t) => { if (mainWindow && t) mainWindow.setTitle(String(t)); });
ipcMain.handle('set-always-on-top', (e, on) => { if (mainWindow) mainWindow.setAlwaysOnTop(!!on); });
ipcMain.handle('set-visible', (e, v) => setVisible(!!v));
ipcMain.handle('toggle-boss', () => toggleBoss());
ipcMain.handle('apply-global-hotkeys', (e, hk) => {
  globalHotkeys = Object.assign({}, globalHotkeys, hk || {});
  registerGlobalShortcuts();
});

// ========== App 生命周期 ==========
app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // remove default menu/accelerators (cleaner + stealth)
  createWindow();
  createTray();
  registerGlobalShortcuts();
});

app.on('window-all-closed', () => { app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); if (tray) tray.destroy(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

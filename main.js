const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const DEFAULT_WIDTH = 430;
const DEFAULT_HEIGHT = 500;

const CONFIG_FILE = 'tetris-config.json';
let configPath = '';

// ========== 配置持久化 ==========
function initConfigPath() {
  if (!configPath) {
    const userData = app.getPath('userData');
    if (!fs.existsSync(userData)) {
      fs.mkdirSync(userData, { recursive: true });
    }
    configPath = path.join(userData, CONFIG_FILE);
  }
}

function loadConfig() {
  initConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('读取配置失败:', err);
  }
  return {};
}

function saveConfig(config) {
  initConfigPath();
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('保存配置失败:', err);
  }
}

// ========== 窗口位置持久化 ==========
function saveWindowBounds() {
  if (!mainWindow) return;
  const config = loadConfig();
  config.windowBounds = mainWindow.getBounds();
  saveConfig(config);
}

function getDefaultBounds() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return {
    x: width - DEFAULT_WIDTH - 20,
    y: 50,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT
  };
}

function restoreWindowBounds() {
  const config = loadConfig();
  if (config.windowBounds) {
    return config.windowBounds;
  }
  return getDefaultBounds();
}

function ensureVisible(bounds) {
  const displays = screen.getAllDisplays();
  if (displays.length === 0) return getDefaultBounds();

  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const display = screen.getDisplayNearestPoint({ x: centerX, y: centerY });
  const area = display.workArea;

  const fullyOutside =
    bounds.x + bounds.width < area.x ||
    bounds.x > area.x + area.width ||
    bounds.y + bounds.height < area.y ||
    bounds.y > area.y + area.height;

  if (fullyOutside) {
    return {
      x: area.x + area.width - DEFAULT_WIDTH - 20,
      y: area.y + 50,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT
    };
  }
  return bounds;
}

// ========== 窗口创建 ==========
function createWindow() {
  const savedBounds = restoreWindowBounds();
  const safeBounds = ensureVisible(savedBounds);

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
      // Keep the fixed-timestep game loop running smoothly even when the
      // widget is unfocused / occluded (it is a background "moyu" overlay).
      backgroundThrottling: false,
      // Disable DevTools in the packaged build (stealth hardening); keep it in dev.
      devTools: !app.isPackaged
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.on('moved', saveWindowBounds);
  mainWindow.on('close', saveWindowBounds);
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ========== IPC ==========
ipcMain.handle('load-config', () => loadConfig());

ipcMain.handle('save-config', (event, patch) => {
  const config = loadConfig();
  Object.assign(config, patch);
  saveConfig(config);
  return config;
});

ipcMain.handle('set-window-size', (event, { width, height }) => {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  mainWindow.setBounds({
    x: bounds.x,
    y: bounds.y,
    width: Math.round(width),
    height: Math.round(height)
  });
  saveWindowBounds();
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

// ========== App 生命周期 ==========
app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

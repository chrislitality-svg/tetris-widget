const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (patch) => ipcRenderer.invoke('save-config', patch),
  setWindowSize: (size) => ipcRenderer.invoke('set-window-size', size),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  // Phase 3 — stealth / window control
  setOpacity: (v) => ipcRenderer.invoke('set-opacity', v),
  setClickThrough: (on) => ipcRenderer.invoke('set-click-through', on),
  setTitle: (t) => ipcRenderer.invoke('set-title', t),
  setAlwaysOnTop: (on) => ipcRenderer.invoke('set-always-on-top', on),
  snapTop: () => ipcRenderer.invoke('snap-top'),
  setVisible: (v) => ipcRenderer.invoke('set-visible', v),
  toggleBoss: () => ipcRenderer.invoke('toggle-boss'),
  applyGlobalHotkeys: (hk) => ipcRenderer.invoke('apply-global-hotkeys', hk),
  // main -> renderer events (boss on/off, hidden, toggle-clickthrough, toggle-mini)
  onMainEvent: (cb) => ipcRenderer.on('main-event', (event, data) => cb(data))
});

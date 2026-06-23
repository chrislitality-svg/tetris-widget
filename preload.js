const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (patch) => ipcRenderer.invoke('save-config', patch),
  setWindowSize: (size) => ipcRenderer.invoke('set-window-size', size),
  quitApp: () => ipcRenderer.invoke('quit-app')
});

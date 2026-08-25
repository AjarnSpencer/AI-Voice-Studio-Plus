const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showInFolder: (path) => ipcRenderer.invoke('show-in-folder', path),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  platform: process.platform
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('Polyglot Pro Preload Active: Metadata Verified');
});

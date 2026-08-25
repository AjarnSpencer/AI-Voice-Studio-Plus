const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');

if (isDev) {
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 960,
    titleBarStyle: 'hiddenInset', // Professional Mac Look
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });
  
  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, 'dist/index.html')}`
  );

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

// Secure Communication Handlers
ipcMain.handle('show-in-folder', async (event, filePath) => {
  if (filePath) shell.showItemInFolder(filePath);
});

ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('save-file', async (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePath } = await dialog.showSaveDialog(win, {
    title: options.title || 'Save File',
    defaultPath: options.defaultPath,
    filters: options.filters || []
  });
  if (filePath) {
    if (options.isBase64) { fs.writeFileSync(filePath, Buffer.from(options.content, "base64")); } else { fs.writeFileSync(filePath, options.content); }
    return true;
  }
  return false;
});

ipcMain.handle('open-file', async (event, options) => {
  const win = BrowserWindow.getFocusedWindow();
  const { filePaths } = await dialog.showOpenDialog(win, {
    title: options.title || 'Open File',
    properties: ['openFile'],
    filters: options.filters || []
  });
  if (filePaths && filePaths.length > 0) {
    return fs.readFileSync(filePaths[0], 'utf-8');
  }
  return null;
});

app.whenReady().then(() => {
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log("Permission requested (FORCED ALLOW):", permission);
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

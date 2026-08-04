const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
const fs = require('fs');

let backendProcess = null;
let mainWindow = null;

function getBackendEntryPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  }

  return path.join(__dirname, '../../backend/dist/main.js');
}

function getBackendCwd() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }

  return path.join(__dirname, '../../backend');
}

function startBackend() {
  const entry = getBackendEntryPath();
  const cwd = getBackendCwd();

  backendProcess = fork(entry, [], {
    cwd,
    silent: true
  });

  backendProcess.stdout?.on('data', (data) => {
    console.log('[BACKEND]', data.toString());
  });

  backendProcess.stderr?.on('data', (data) => {
    console.error('[BACKEND ERROR]', data.toString());
  });

  backendProcess.on('exit', (code) => {
    console.log('Backend finalizado:', code);
  });
}

function waitForBackend(url, timeout = 20000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, () => resolve())
        .on('error', () => {
          if (Date.now() - start > timeout) {
            reject(new Error('Timeout esperando backend'));
            return;
          }

          setTimeout(check, 500);
        });
    };

    check();
  });
}

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('did-fail-load:', code, desc);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('URL:', mainWindow.webContents.getURL());
  });

  if (app.isPackaged) {

    const index = path.join(
      app.getAppPath(),
      'dist',
      'landing',
      'browser',
      'index.html'
    );

    console.log('app.getAppPath():', app.getAppPath());
    console.log('index:', index);
    console.log('exists:', fs.existsSync(index));

    mainWindow.loadFile(index);

  } else {

    mainWindow.loadURL('http://localhost:4200');

  }
}

app.whenReady().then(async () => {

  startBackend();

  try {
    await waitForBackend('http://localhost:3000');
    console.log('Backend listo');
  } catch (e) {
    console.error(e);
  }

  createWindow();

});

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

app.on('before-quit', stopBackend);

app.on('window-all-closed', () => {

  stopBackend();

  if (process.platform !== 'darwin') {
    app.quit();
  }

});
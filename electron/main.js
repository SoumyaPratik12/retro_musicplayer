// electron/main.js — Electron main process (plain JS, no build step needed)
const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Register a privileged scheme so <audio src="media://..."> works with contextIsolation.
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { stream: true, supportFetchAPI: true, secure: true, bypassCSP: true } }
]);

const STATE_FILE = () => path.join(app.getPath('userData'), 'retrowave-state.json');
const AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.opus', '.webm']);

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#08080c',
    title: 'RetroWave Player',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // serve local files to the renderer through the media:// scheme
  protocol.handle('media', (request) => {
    const encoded = request.url.slice('media://file/'.length);
    const filePath = decodeURIComponent(encoded);
    return net.fetch(pathToFileURL(filePath).href);
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---- IPC: pick files / folder ----
function walkDir(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(p, out);
    else if (AUDIO_EXT.has(path.extname(entry.name).toLowerCase())) out.push(p);
  }
  return out;
}

ipcMain.handle('pick-files', async () => {
  const r = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus', 'webm'] }]
  });
  return r.canceled ? [] : r.filePaths;
});

ipcMain.handle('pick-folder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return [];
  try { return walkDir(r.filePaths[0], []); } catch { return []; }
});

// ---- IPC: expand dropped paths (files + folders) into audio file paths ----
ipcMain.handle('expand-paths', async (_e, paths) => {
  const out = [];
  for (const p of paths || []) {
    try {
      const st = fs.statSync(p);
      if (st.isDirectory()) walkDir(p, out);
      else if (AUDIO_EXT.has(path.extname(p).toLowerCase())) out.push(p);
    } catch { /* skip unreadable entries */ }
  }
  return out;
});

// ---- IPC: read metadata (tags + album art) ----
ipcMain.handle('read-meta', async (_e, filePath) => {
  const base = path.basename(filePath).replace(/\.[^.]+$/, '');
  try {
    const mm = require('music-metadata');
    const { common, format } = await mm.parseFile(filePath, { duration: true });
    let picture = null;
    if (common.picture && common.picture[0]) {
      const pic = common.picture[0];
      picture = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
    }
    return {
      path: filePath,
      title: common.title || base,
      artist: common.artist || 'Unknown Artist',
      album: common.album || 'Unknown Album',
      durationMs: Math.round((format.duration || 0) * 1000),
      picture
    };
  } catch {
    return { path: filePath, title: base, artist: 'Unknown Artist', album: 'Unknown Album', durationMs: 0, picture: null };
  }
});

// ---- IPC: persist library + prefs as JSON in userData ----
ipcMain.handle('load-state', async () => {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); } catch { return null; }
});
ipcMain.handle('save-state', async (_e, state) => {
  try { fs.writeFileSync(STATE_FILE(), JSON.stringify(state)); return true; } catch { return false; }
});

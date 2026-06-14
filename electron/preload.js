// electron/preload.js — safe bridge between main and renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  pickFiles: () => ipcRenderer.invoke('pick-files'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  expandPaths: (paths) => ipcRenderer.invoke('expand-paths', paths),
  watchFolders: (folders) => ipcRenderer.invoke('watch-folders', folders),
  onFolderChanged: (cb) => ipcRenderer.on('folder-changed', (_e, dir) => cb(dir)),
  readMeta: (filePath) => ipcRenderer.invoke('read-meta', filePath),
  loadState: () => ipcRenderer.invoke('load-state'),
  saveState: (state) => ipcRenderer.invoke('save-state', state),
  // turn an absolute path into a URL the <audio> element can load
  mediaUrl: (filePath) => 'media://file/' + encodeURIComponent(filePath)
});

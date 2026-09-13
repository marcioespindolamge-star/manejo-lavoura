const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopStore', {
  load: () => ipcRenderer.sendSync('db-load-sync'),
  save: (json) => ipcRenderer.sendSync('db-save-sync', json),
  backup: () => ipcRenderer.invoke('db-backup'),
  restore: () => ipcRenderer.invoke('db-restore'),
  location: () => ipcRenderer.invoke('db-location')
});

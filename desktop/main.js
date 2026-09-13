const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

let db;

function dbPath(){
  return path.join(app.getPath('userData'), 'manejo-lavoura.sqlite');
}

function openDb(){
  db = new Database(dbPath());
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK(id=1),
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
}

function loadState(){
  const row = db.prepare('SELECT json FROM app_state WHERE id=1').get();
  return row ? row.json : null;
}

function saveState(json){
  db.prepare(`INSERT INTO app_state(id,json,updated_at) VALUES(1,?,datetime('now'))
    ON CONFLICT(id) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`).run(json);
  return true;
}

async function backupDatabase(){
  const result = await dialog.showSaveDialog({
    title: 'Salvar backup do Manejo da Lavoura',
    defaultPath: `manejo-lavoura-backup-${new Date().toISOString().slice(0,10)}.sqlite`,
    filters: [{ name: 'Backup SQLite', extensions: ['sqlite'] }]
  });
  if (result.canceled || !result.filePath) return {ok:false};
  db.pragma('wal_checkpoint(FULL)');
  fs.copyFileSync(dbPath(), result.filePath);
  return {ok:true, path:result.filePath};
}

async function restoreDatabase(){
  const result = await dialog.showOpenDialog({
    title: 'Restaurar backup do Manejo da Lavoura',
    properties: ['openFile'],
    filters: [{ name: 'Backup SQLite', extensions: ['sqlite'] }]
  });
  if (result.canceled || !result.filePaths[0]) return {ok:false};
  const src = result.filePaths[0];
  try{
    db.close();
    fs.copyFileSync(src, dbPath());
    openDb();
    return {ok:true};
  }catch(e){
    try{ if(!db || !db.open) openDb(); }catch{}
    return {ok:false, error:String(e)};
  }
}

function createWindow(){
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.maximize();
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, '..', 'index.html'));
}

app.whenReady().then(() => {
  openDb();

  ipcMain.on('db-load-sync', event => {
    event.returnValue = loadState();
  });
  ipcMain.on('db-save-sync', (event, json) => {
    try{ event.returnValue = saveState(json); }
    catch(e){ event.returnValue = false; }
  });
  ipcMain.handle('db-backup', backupDatabase);
  ipcMain.handle('db-restore', restoreDatabase);
  ipcMain.handle('db-location', () => dbPath());

  createWindow();
});

app.on('window-all-closed', () => {
  try{ if(db) db.close(); }catch{}
  if (process.platform !== 'darwin') app.quit();
});

const { app, BrowserWindow, desktopCapturer, dialog, ipcMain, screen } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// eslint-disable-next-line global-require
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Global window IDs
const windows = {};

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  windows.main = mainWindow.id;

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// Launch cropping window
ipcMain.on('selectCropArea', () => {
  const mainWindow = BrowserWindow.fromId(windows.main);
  const { width, height } = screen.getPrimaryDisplay().size;
  
  mainWindow.minimize();

  const cropWindow = new BrowserWindow({
    alwaysOnTop: true,
    width,
    height,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
  })
  cropWindow.loadFile(path.join(__dirname, 'crop.html'));
  windows.crop = cropWindow.id;
})

// Stop cropping, start recording
ipcMain.on('stopCropping', (_, cropDimensions) => {
  const mainWindow = BrowserWindow.fromId(windows.main);
  const cropWindow = BrowserWindow.fromId(windows.crop);
  cropWindow.setIgnoreMouseEvents(true);
  cropWindow.setFocusable(false);
  
  mainWindow.webContents.send('startRecording', cropDimensions);
})

ipcMain.on('closeCropWindow', () => {
  const mainWindow = BrowserWindow.fromId(windows.main);
  const cropWindow = BrowserWindow.fromId(windows.crop);
  cropWindow.close();

  mainWindow.webContents.send('stopRecording');
})

// Send main process modules to renderer
ipcMain.handle('DESKTOP_CAPTURER_GET_SOURCES', (_, opts) => desktopCapturer.getSources(opts));
ipcMain.handle('DIALOG_SHOW_SAVE', (_, opts) => dialog.showSaveDialog(opts));
ipcMain.handle('TEMP_DIR', () => app.getPath('temp'));

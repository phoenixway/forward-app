import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import Store from 'electron-store';

const store = new Store();
let mainWindow: BrowserWindow | null = null; // Змінив тип для коректного присвоєння null

const IPC_CHANNELS = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
};

function createWindow(): void {
  mainWindow = new BrowserWindow({
    height: 700,
    width: 1000,
          icon: path.join(__dirname, '../../buildResources/icon.png'), 

    webPreferences: {
      // Шлях до preload.js, враховуючи, що main.js буде в dist/main/main.js,
      // а preload.js в dist/preload/preload.js.
      // При пакуванні, ця структура зберігається всередині app.asar або app/
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Логіка завантаження URL
if (app.isPackaged) {
    // ПРОДАКШН: завантажуємо index.html з файлової системи
    // __dirname тут буде вказувати на:
    // /path/to/your-app/resources/app.asar/dist/main/
    // (або /path/to/your-app/resources/app/dist/main/ якщо не запаковано в asar)

    // Відносний шлях від `dist/main/` до `dist/renderer/index.html`
    // це `../renderer/index.html`
    const indexPath = path.join(__dirname, '../renderer/index.html');
    
    console.log(`[Main Process] In packaged app, attempting to load index.html from: ${indexPath}`); // Додайте лог для перевірки
    
    mainWindow.loadFile(indexPath)
      .then(() => {
        console.log(`[Main Process] Successfully loaded ${indexPath}`);
      })
      .catch((err) => {
        console.error(`[Main Process] FAILED to load ${indexPath}:`, err);
        // Тут можна показати діалогове вікно з помилкою або закрити додаток
        // Наприклад:
        // dialog.showErrorBox("Помилка завантаження", `Не вдалося завантажити головний файл додатку: ${err.message}`);
        // app.quit();
      });

  } else {
    // РОЗРОБКА: завантажуємо з dev сервера
    console.log('[Main Process] In development mode, loading from http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    if (mainWindow && mainWindow.webContents) { // Додайте перевірку перед openDevTools
        mainWindow.webContents.openDevTools();
    }
  }


  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load ${validatedURL}: ${errorDescription} (Error Code: ${errorCode})`);
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
  return app.getVersion();
});

ipcMain.handle(IPC_CHANNELS.GET_APP_SETTINGS, async () => {
  try {
    return store.store;
  } catch (error) {
    console.error('Failed to get app settings from store:', error);
    return null;
  }
});

ipcMain.handle(IPC_CHANNELS.SET_APP_SETTING, async (event, key: string, value: any) => {
  if (typeof key !== 'string') {
    console.error('Invalid key type for setAppSetting. Expected string, got:', typeof key);
    return { success: false, message: 'Ключ має бути рядком.' };
  }
  try {
    store.set(key, value);
    return { success: true, message: `Налаштування "${key}" збережено.` };
  } catch (error: any) {
    console.error(`Failed to set app setting "${key}":`, error);
    return { success: false, message: error.message || 'Не вдалося зберегти налаштування.' };
  }
});


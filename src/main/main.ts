// src/main/main.ts
import { app, BrowserWindow, ipcMain, shell, dialog } from "electron"; // Додав dialog
import * as path from "path";
import Store from "electron-store";

const store = new Store();
let mainWindow: BrowserWindow | null = null;

const IPC_CHANNELS = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  OPEN_EXTERNAL_LINK: "open-external-link",
  HANDLE_CUSTOM_URL: "handle-custom-url", // Новий канал для передачі URL в рендерер
};

const MY_APP_PROTOCOL = "forwardapp"; // <<< ВАША КАСТОМНА URL-СХЕМА

// Функція для надсилання URL до рендерер-процесу
// function sendUrlToRenderer(url: string) {
//   if (mainWindow) {
//     if (mainWindow.webContents.isLoading()) {
//       mainWindow.webContents.once("did-finish-load", () => {
//         console.log(
//           `[Main Process] Sending URL to renderer (after load): ${url}`,
//         );
//         mainWindow!.webContents.send(IPC_CHANNELS.HANDLE_CUSTOM_URL, url);
//       });
//     } else {
//       console.log(
//         `[Main Process] Sending URL to renderer (immediately): ${url}`,
//       );
//       mainWindow.webContents.send(IPC_CHANNELS.HANDLE_CUSTOM_URL, url);
//     }
//   } else {
//     console.warn("[Main Process] Main window not available to send URL.");
//     // Можна зберегти URL і відправити пізніше, коли вікно буде створено
//     // global.initialUrlToOpen = url; // Потребує обережної обробки
//   }
// }

// src/main/main.ts
function sendUrlToRenderer(url: string) {
  if (mainWindow) {
    console.log(`[Main Process] Sending URL to renderer (immediately): ${url}`);
    mainWindow.webContents.send(IPC_CHANNELS.HANDLE_CUSTOM_URL, url);
  } else {
    console.warn("[Main Process] Main window not available to send URL.");
    // global.initialUrlToOpen = url; // Обережно з цим
  }
}

// Обробка єдиного екземпляру програми та URL з другого екземпляру
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    console.log("[Main Process] Second instance detected.");
    // Хтось намагався запустити другий екземпляр
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }

    // Обробка URL, переданого другому екземпляру
    // На Windows, URL передається як останній аргумент.
    const urlFromCmd = commandLine.pop();
    if (urlFromCmd && urlFromCmd.startsWith(`${MY_APP_PROTOCOL}://`)) {
      console.log(
        `[Main Process] Second instance opened with URL: ${urlFromCmd}`,
      );
      sendUrlToRenderer(urlFromCmd);
    } else if (
      commandLine.find((arg) => arg.startsWith(`${MY_APP_PROTOCOL}://`))
    ) {
      // Іноді URL може бути не останнім, якщо є інші аргументи
      const foundUrl = commandLine.find((arg) =>
        arg.startsWith(`${MY_APP_PROTOCOL}://`),
      );
      if (foundUrl) {
        console.log(
          `[Main Process] Second instance (found among args) opened with URL: ${foundUrl}`,
        );
        sendUrlToRenderer(foundUrl);
      }
    }
  });
}

function createWindow(): BrowserWindow {
  // Змінив повертаний тип
  mainWindow = new BrowserWindow({
    height: 700,
    width: 1000,
    icon: path.join(__dirname, "../../buildResources/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    const indexPath = path.join(__dirname, "../renderer/index.html");
    console.log(
      `[Main Process] In packaged app, attempting to load index.html from: ${indexPath}`,
    );
    mainWindow
      .loadFile(indexPath)
      .then(() =>
        console.log(`[Main Process] Successfully loaded ${indexPath}`),
      )
      .catch((err) => {
        console.error(`[Main Process] FAILED to load ${indexPath}:`, err);
        dialog.showErrorBox(
          "Помилка завантаження",
          `Не вдалося завантажити головний файл додатку: ${err.message}`,
        );
        // app.quit(); // Можливо, не варто закривати, якщо є інші способи обробки
      });
  } else {
    console.log(
      "[Main Process] In development mode, loading from http://localhost:3000",
    );
    mainWindow.loadURL("http://localhost:3000");
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.openDevTools();
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (event, errorCode, errorDescription, validatedURL) => {
      console.error(
        `Failed to load ${validatedURL}: ${errorDescription} (Error Code: ${errorCode})`,
      );
    },
  );
  return mainWindow; // Повертаємо створене вікно
}

// Обробка URL з аргументів командного рядка при першому запуску (особливо для Windows)
let initialUrlToProcess: string | null = null;
const cmdLineArgs = app.isPackaged
  ? process.argv.slice(1)
  : process.argv.slice(2); // В режимі розробки є додаткові аргументи
const urlFromCmdLineArgs = cmdLineArgs.find((arg) =>
  arg.startsWith(`${MY_APP_PROTOCOL}://`),
);
if (urlFromCmdLineArgs) {
  console.log(
    `[Main Process] Initial URL from command line arguments: ${urlFromCmdLineArgs}`,
  );
  initialUrlToProcess = urlFromCmdLineArgs;
}

app.whenReady().then(() => {
  createWindow(); // Створюємо вікно
  let registrationSuccess = null;
  // Реєстрація протоколу
  // app.removeAsDefaultProtocolClient(MY_APP_PROTOCOL); // Для тестування, якщо потрібно перереєструвати
  if (process.defaultApp) {
    // У режимі розробки (коли запускається через electron .)
    if (process.argv.length >= 2) {
      if (!app.isPackaged) {
        // Лише для розробки
        console.log(
          `[Main Process] Registering protocol for dev: ${MY_APP_PROTOCOL} with path: ${process.execPath} and args: ${path.resolve(process.argv[1])}`,
        );
        // Потрібно вказати шлях до Electron і шлях до вашого головного скрипта
        app.setAsDefaultProtocolClient(MY_APP_PROTOCOL, process.execPath, [
          path.resolve(process.argv[1]),
        ]);
      } else {
        // Для зібраного додатку, але запущеного як defaultApp (рідкісний випадок)
        console.log(
          `[Main Process] Registering protocol for packaged app (as defaultApp): ${MY_APP_PROTOCOL}`,
        );
        registrationSuccess = app.setAsDefaultProtocolClient(MY_APP_PROTOCOL);
      }
      console.log(
        `[Main Process] Protocol registration attempt result: ${registrationSuccess}`,
      );
    }
  } else {
    // Для нормально зібраного додатку
    console.log(
      `[Main Process] Registering protocol (packaged): ${MY_APP_PROTOCOL}`,
    );
    registrationSuccess = app.setAsDefaultProtocolClient(MY_APP_PROTOCOL);
    console.log(
      `[Main Process] Protocol registration attempt result: ${registrationSuccess}`,
    );
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Обробка URL, який міг бути отриманий з командного рядка до того, як вікно було готове
  if (initialUrlToProcess && mainWindow) {
    console.log(
      `[Main Process] Processing initial URL before window is ready: ${initialUrlToProcess}`,
    );
    sendUrlToRenderer(initialUrlToProcess);
    initialUrlToProcess = null; // Оброблено
  }
});

// Обробка URL, переданого при першому запуску (macOS) або коли додаток вже запущений
app.on("open-url", (event, url) => {
  event.preventDefault();
  console.log(`[Main Process] app.on('open-url') triggered with URL: ${url}`);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    sendUrlToRenderer(url);
  } else {
    // Якщо вікно ще не створено (дуже ранній етап запуску),
    // збережемо URL, щоб обробити його після створення вікна.
    // Це може перетинатися з initialUrlToProcess, тому потрібна обережна логіка.
    // Якщо initialUrlToProcess вже встановлено, можливо, цей URL такий самий.
    if (!initialUrlToProcess) {
      // Якщо з командного рядка ще не було URL
      initialUrlToProcess = url;
      console.log(
        `[Main Process] Queued URL from 'open-url' as initial: ${url}`,
      );
    }
    // Коли вікно буде готове в app.whenReady(), цей URL буде оброблено.
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
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
    console.error("Failed to get app settings from store:", error);
    return null;
  }
});

ipcMain.handle(
  IPC_CHANNELS.SET_APP_SETTING,
  async (event, key: string, value: any) => {
    if (typeof key !== "string") {
      console.error(
        "Invalid key type for setAppSetting. Expected string, got:",
        typeof key,
      );
      return { success: false, message: "Ключ має бути рядком." };
    }
    try {
      store.set(key, value);
      return { success: true, message: `Налаштування "${key}" збережено.` };
    } catch (error: any) {
      console.error(`Failed to set app setting "${key}":`, error);
      return {
        success: false,
        message: error.message || "Не вдалося зберегти налаштування.",
      };
    }
  },
);

ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL_LINK, async (event, url: string) => {
  console.log(
    `[Main Process, ipcMain] Attempting to open external URL: ${url}`,
  );
  try {
    if (
      !url ||
      typeof url !== "string" ||
      (!url.startsWith("http:") &&
        !url.startsWith("https:") &&
        !url.startsWith("mailto:") &&
        !url.startsWith("obsidian:"))
    ) {
      console.warn(
        `[Main Process] Attempted to open invalid or non-external URL: ${url}`,
      );
      return { success: false, error: "Invalid or non-external URL provided." };
    }
    await shell.openExternal(url);
    console.log(
      `[Main Process] Successfully initiated opening of external URL: ${url}`,
    );
    return { success: true };
  } catch (error: any) {
    console.error(
      `[Main Process] Failed to open external URL "${url}":`,
      error,
    );
    return {
      success: false,
      error: error.message || "Unknown error opening external link.",
    };
  }
});

// Додатково, переконайтеся, що ваш preload.js містить:
/*
// src/preload.ts або preload.js
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // ... інші ваші API ...
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  setAppSetting: (key: string, value: any) => ipcRenderer.invoke('set-app-setting', key, value),
  openExternalLink: (url: string) => ipcRenderer.invoke('open-external-link', url),

  // Для обробки кастомних URL
  onCustomUrl: (callback: (url: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('handle-custom-url', handler); // 'handle-custom-url' - назва каналу
    return () => {
      ipcRenderer.removeListener('handle-custom-url', handler);
    };
  }
});
*/

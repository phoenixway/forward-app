// src/main/main.ts
import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  Menu,
  dialog,
  shell,
  Event as ElectronEvent,
  App,
} from "electron";
import path from "path";
import { URL as NodeURL } from "url";
import fs from "fs";
import Store, { Schema as StoreSchema } from "electron-store";
// import { console } from "inspector"; // Цей імпорт, ймовірно, не потрібен і може викликати конфлікти. Глобальний console доступний.

// ---- Константи ----
const APP_PROTOCOL = "forwardapp";
// ВИПРАВЛЕННЯ: Використання app.isPackaged для визначення режиму
const IS_PACKAGED = app.isPackaged;
const IS_DEV = !IS_PACKAGED;

console.log(
  `[Main Process] Application Mode Determined: ${IS_DEV ? "Development" : "Production (Packaged)"}. app.isPackaged = ${IS_PACKAGED}`,
);

// ---- Тип для вашої схеми electron-store ----
type AppSettingsSchema = {
  zoomFactor: number;
  obsidianVaultPath: string;
  themePreference: "system" | "light" | "dark";
};

// ---- Схема для electron-store ----
const schema: StoreSchema<AppSettingsSchema> = {
  zoomFactor: {
    type: "number",
    minimum: 0.2,
    maximum: 3.0,
    default: 1.0,
  },
  obsidianVaultPath: {
    type: "string",
    default: "",
  },
  themePreference: {
    type: "string",
    enum: ["system", "light", "dark"],
    default: "system",
  },
};

// ---- Глобальні змінні ----
let mainWindow: BrowserWindow | null = null;
let initialUrlToProcess: string | null = null;
let appSettingsStore: Store<AppSettingsSchema>;

appSettingsStore = new Store<AppSettingsSchema>({
  schema,
  name: "app-settings",
});

// ---- IPC Канали ----
const IPC_CHANNELS = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  HANDLE_CUSTOM_URL: "handle-custom-url",
  OPEN_EXTERNAL: "open-external-url",
  SHOW_SAVE_DIALOG: "show-save-dialog",
  SHOW_OPEN_DIALOG: "show-open-dialog",
  WRITE_FILE: "write-file",
  READ_FILE: "read-file",
};

// ---- Обробка аргументів командного рядка для URL ----
function processCommandLineArgs(argv: string[]): string | null {
  // process.defaultApp є true, коли запущено з стандартним electron executable (dev mode)
  const searchStartIndex = process.defaultApp ? 2 : 1;
  for (let i = searchStartIndex; i < argv.length; i++) {
    if (argv[i] && argv[i].startsWith(`${APP_PROTOCOL}://`)) {
      return argv[i];
    }
  }
  return null;
}

initialUrlToProcess = processCommandLineArgs(process.argv);
if (initialUrlToProcess) {
  console.log(
    `[Main Process] Initial URL from command line arguments: ${initialUrlToProcess}`,
  );
}

// ---- Інтерфейс для additionalData в second-instance ----
interface SecondInstanceData {
  urlToOpen?: string;
}

// ---- Логіка "Single Instance" ----
const gotTheLock = app.requestSingleInstanceLock({
  urlToOpen: initialUrlToProcess,
} as SecondInstanceData);

if (!gotTheLock) {
  console.log(
    "[Main Process] Another instance is already running. Quitting this instance.",
  );
  app.quit();
} else {
  // ТИМЧАСОВЕ СПРОЩЕННЯ ДЛЯ ДІАГНОСТИКИ TS2769 (залишено для тестування цієї помилки)
  (app as any).on(
    "second-instance",
    (
      event: any, // ElectronEvent
      commandLine: any, // string[]
      workingDirectory: any, // string
      additionalData: any, // SecondInstanceData
    ) => {
      console.log(
        '[Main Process] "second-instance" event received (using "as any" for diagnostics).',
      );

      let urlFromSecondInstance: string | null = null;
      if (commandLine && Array.isArray(commandLine)) {
        urlFromSecondInstance = processCommandLineArgs(commandLine);
      }

      if (
        !urlFromSecondInstance &&
        additionalData &&
        typeof additionalData.urlToOpen === "string" &&
        additionalData.urlToOpen.startsWith(`${APP_PROTOCOL}://`)
      ) {
        console.log(
          "[Main Process] Falling back to additionalData.urlToOpen for second instance (diagnostics).",
        );
        urlFromSecondInstance = additionalData.urlToOpen;
      }

      if (urlFromSecondInstance) {
        console.log(
          `[Main Process] URL from second instance (diagnostics): ${urlFromSecondInstance}`,
        );
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
          sendUrlToRenderer(urlFromSecondInstance);
        } else {
          initialUrlToProcess = urlFromSecondInstance;
          console.log(
            `[Main Process] Second instance URL queued as initialUrlToProcess (diagnostics - mainWindow was null or destroyed).`,
          );
        }
      } else {
        console.log(
          "[Main Process] No URL found in second-instance (diagnostics). Focusing existing window.",
        );
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      }
    },
  );

  // ---- Реєстрація протоколу ----
  // Немає сенсу реєструвати протокол, якщо це упакований додаток і реєстрація залежить від інсталятора/desktop файлу.
  // Однак, Electron може спробувати це зробити, і ми логуємо результат.
  // Для розробки це може бути корисно.
  if (!app.isDefaultProtocolClient(APP_PROTOCOL)) {
    let registrationSuccess = false;
    // На Windows в розробці потрібно вказувати шлях до electron.exe і скрипту
    if (IS_DEV && process.platform === "win32") {
      registrationSuccess = app.setAsDefaultProtocolClient(
        APP_PROTOCOL,
        process.execPath, // шлях до electron.exe
        [path.resolve(process.argv[1])], // шлях до вашого main.js
      );
    } else {
      // Для упакованих або для Linux/macOS в розробці
      registrationSuccess = app.setAsDefaultProtocolClient(APP_PROTOCOL);
    }
    console.log(
      `[Main Process] Protocol client registration attempt for "${APP_PROTOCOL}": ${registrationSuccess}`,
    );
    if (!registrationSuccess && !IS_PACKAGED) {
      // Показувати попередження, тільки якщо не упаковано і не вдалося
      console.warn(
        `[Main Process] WARN: Failed to set default protocol client for ${APP_PROTOCOL} in dev mode. Deeplinking might not work as expected. For packaged apps, this relies on the installer/desktop file.`,
      );
    }
  } else {
    console.log(
      `[Main Process] Application is already the default protocol client for "${APP_PROTOCOL}".`,
    );
  }

  // ---- Обробники подій життєвого циклу додатка ----
  app.on("ready", async () => {
    console.log("[Main Process] App is ready.");

    mainWindow = createWindow();

    if (mainWindow && initialUrlToProcess) {
      console.log(
        `[Main Process] Processing initial URL at "ready" event: ${initialUrlToProcess}`,
      );
      const urlToSend = initialUrlToProcess;
      initialUrlToProcess = null;

      mainWindow.webContents.once("did-finish-load", () => {
        console.log(
          '[Main Process] mainWindow "did-finish-load". Delaying initial URL send.',
        );
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log(
              `[Main Process] Delay ended. Sending initial URL to renderer: ${urlToSend}`,
            );
            sendUrlToRenderer(urlToSend);
          } else {
            console.warn(
              "[Main Process] Cannot send initial URL, mainWindow is null or destroyed after delay on did-finish-load.",
            );
          }
        }, 1500);
      });
    } else if (initialUrlToProcess) {
      console.warn(
        '[Main Process] mainWindow is null at "ready" event when initialUrlToProcess is set. URL might be lost.',
      );
    }
  });

  app.on("open-url", (event: ElectronEvent, url: string) => {
    event.preventDefault();
    console.log(`[Main Process] "open-url" event received (macOS): ${url}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      sendUrlToRenderer(url);
    } else {
      initialUrlToProcess = url;
      console.log(
        `[Main Process] "open-url" (macOS) URL queued as initialUrlToProcess (mainWindow was null or destroyed).`,
      );
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    } else if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createWindow();
    }
  });

  // ---- Функція створення вікна ----
  function createWindow(): BrowserWindow {
    const currentZoomFactor = appSettingsStore.get("zoomFactor");

    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, "../preload/preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: true,
        zoomFactor: currentZoomFactor,
      },
      icon: path.join(app.getAppPath(), "resources/icon.png"), // Використовуємо app.getAppPath() для іконки
      show: false,
      backgroundColor: "#1e293b",
    });

    if (IS_DEV) {
      const rendererPort = process.env.PORT || 3000; // Переконайтеся, що цей порт правильний для вашого dev server
      console.log(
        `[Main Process] Development mode: Loading URL http://localhost:${rendererPort}`,
      );
      win.loadURL(`http://localhost:${rendererPort}`).catch((err) => {
        console.error(
          `[Main Process] FAILED to load URL http://localhost:${rendererPort} in DEV mode: `,
          err,
        );
        dialog.showErrorBox(
          "Помилка завантаження (DEV)",
          `Не вдалося завантажити сторінку з dev сервера: http://localhost:${rendererPort}\nПереконайтеся, що сервер запущено.\n${err.message}`,
        );
      });
      win.webContents.openDevTools();
    } else {
      // Для упакованої версії, шлях до index.html відносно кореня додатка
      // Зазвичай, якщо ваш outputDir для рендерера 'dist/renderer', то цей шлях коректний.
      const indexPath = path.join(app.getAppPath(), "dist/renderer/index.html");
      console.log(
        `[Main Process] Packaged app: Attempting to load index.html from: ${indexPath}`,
      );
      win
        .loadFile(indexPath)
        .then(() => {
          console.log(`[Main Process] Successfully loaded ${indexPath}`);
        })
        .catch((err) => {
          console.error(
            `[Main Process] FAILED to load file ${indexPath} in PACKAGED mode:`,
            err,
          );
          dialog.showErrorBox(
            "Помилка завантаження",
            `Не вдалося завантажити головний файл програми: ${indexPath}\n${err.message}`,
          );
        });
    }

    win.once("ready-to-show", () => {
      win.show();
    });

    return win;
  }

  // ---- Функція відправки URL в рендерер ----
  function sendUrlToRenderer(url: string) {
    if (!mainWindow || mainWindow.isDestroyed()) {
      console.warn(
        "[Main Process] sendUrlToRenderer: mainWindow is null or destroyed. URL might be lost:",
        url,
      );
      return;
    }

    console.log(`[Main Process] sendUrlToRenderer called with URL: ${url}`);

    const wc = mainWindow.webContents;
    if (wc.isLoading()) {
      console.log(
        "[Main Process] webContents is loading. Waiting for did-finish-load to send URL.",
      );
      wc.once("did-finish-load", () => {
        console.log(
          "[Main Process] webContents did-finish-load (in sendUrlToRenderer). Sending URL.",
        );
        if (!wc.isDestroyed()) {
          wc.send(IPC_CHANNELS.HANDLE_CUSTOM_URL, url);
          console.log(
            `[Main Process] IPC message '${IPC_CHANNELS.HANDLE_CUSTOM_URL}' sent (after load) with URL: ${url}`,
          );
        } else {
          console.warn(
            "[Main Process] webContents destroyed before URL could be sent (after load).",
          );
        }
      });
    } else {
      if (!wc.isDestroyed()) {
        wc.send(IPC_CHANNELS.HANDLE_CUSTOM_URL, url);
        console.log(
          `[Main Process] IPC message '${IPC_CHANNELS.HANDLE_CUSTOM_URL}' sent with URL: ${url}`,
        );
      } else {
        console.warn(
          "[Main Process] webContents destroyed before URL could be sent (direct).",
        );
      }
    }
  }

  // ---- Обробники IPC від рендерера ----
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS.GET_APP_SETTINGS, () => {
    return appSettingsStore.store;
  });

  ipcMain.handle(
    IPC_CHANNELS.SET_APP_SETTING,
    (event, key: keyof AppSettingsSchema, value: any) => {
      try {
        appSettingsStore.set(key, value);

        const currentMainWindow = mainWindow;
        if (
          key === "zoomFactor" &&
          currentMainWindow &&
          !currentMainWindow.isDestroyed()
        ) {
          currentMainWindow.webContents.setZoomFactor(value as number);
        }
        if (
          key === "themePreference" &&
          currentMainWindow &&
          !currentMainWindow.isDestroyed()
        ) {
          currentMainWindow.webContents.send("theme-preference-changed", value);
        }
        return { success: true };
      } catch (error: any) {
        console.error(
          `[Main Process] Error setting app setting '${key}':`,
          error,
        );
        return { success: false, message: error.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.OPEN_EXTERNAL,
    async (event, urlToOpen: string) => {
      try {
        await shell.openExternal(urlToOpen);
        return { success: true };
      } catch (error: any) {
        console.error(
          `[Main Process] Error opening external URL '${urlToOpen}':`,
          error,
        );
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SHOW_SAVE_DIALOG,
    async (event, options: Electron.SaveDialogOptions) => {
      const currentMainWindow = mainWindow;
      if (!currentMainWindow || currentMainWindow.isDestroyed()) {
        console.warn(
          `[Main Process] ${IPC_CHANNELS.SHOW_SAVE_DIALOG}: mainWindow is null or destroyed.`,
        );
        return { canceled: true, filePath: undefined };
      }
      return await dialog.showSaveDialog(currentMainWindow, options);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SHOW_OPEN_DIALOG,
    async (event, options: Electron.OpenDialogOptions) => {
      const currentMainWindow = mainWindow;
      if (!currentMainWindow || currentMainWindow.isDestroyed()) {
        console.warn(
          `[Main Process] ${IPC_CHANNELS.SHOW_OPEN_DIALOG}: mainWindow is null or destroyed.`,
        );
        return { canceled: true, filePaths: [] };
      }
      return await dialog.showOpenDialog(currentMainWindow, options);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.WRITE_FILE,
    async (event, filePath: string, content: string) => {
      try {
        fs.writeFileSync(filePath, content, "utf8");
        return { success: true };
      } catch (error: any) {
        console.error(
          `[Main Process] Error writing file '${filePath}':`,
          error,
        );
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.READ_FILE, async (event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return { success: true, content };
    } catch (error: any) {
      console.error(`[Main Process] Error reading file '${filePath}':`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.on("test-ipc-main-listener", (event, arg) => {
    console.log("[Main Process] Received on test-ipc-main-listener:", arg);
    event.reply("test-ipc-main-reply", "Pong from Main!");

    const currentMainWindow = mainWindow;
    if (currentMainWindow && !currentMainWindow.isDestroyed()) {
      const wc = currentMainWindow.webContents;
      if (wc && !wc.isDestroyed()) {
        wc.send("test-ipc-message", "Hello from Main Process on test channel!");
      } else {
        console.warn(
          "[Main Process] test-ipc-main-listener: webContents is null or destroyed.",
        );
      }
    } else {
      console.warn(
        "[Main Process] test-ipc-main-listener: mainWindow is null or destroyed when trying to send message.",
      );
    }
  });
} // Кінець блоку `else` для `gotTheLock`

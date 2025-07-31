import { app, ipcMain, dialog, BrowserWindow, Menu, shell } from "electron";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { exec, execSync } from "child_process";
import Store from "electron-store";
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import ip from 'ip';
import * as http from 'http';

type StoreSchema = {
	[key: string]: unknown;
};
// Цей store використовується для інших налаштувань, але не для стану Redux
const store = new Store<StoreSchema>();
app.commandLine.appendSwitch("gtk-version", "3");

console.log("[Main] Налаштування командного рядка для GTK завершено.");

const packageJsonDefaultPath = path.join(__dirname, "..", "..", "package.json");
let packageJson: any;
try {
  const possiblePackageJsonPaths = [
    packageJsonDefaultPath,
    path.join(app.getAppPath(), "package.json"),
    app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked", "package.json")
      : null,
    app.isPackaged
      ? path.join(process.resourcesPath, "app", "package.json")
      : null,
  ].filter((p) => p !== null) as string[];

  let foundPath: string | undefined;
  for (const p of possiblePackageJsonPaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (foundPath) {
    packageJson = fs.readJsonSync(foundPath);
    console.log(`[Main] package.json завантажено з: ${foundPath}`);
  } else {
    throw new Error(
      `package.json не знайдено за перевіреними шляхами: ${possiblePackageJsonPaths.join(", ")}`,
    );
  }
} catch (error) {
  console.error(
    `[Main] Не вдалося завантажити package.json. Використання значень за замовчуванням. Помилка:`,
    error,
  );
  packageJson = {
    name: "default-app-name",
    productName: "DefaultApp",
    build: { linux: {} },
  };
}

const APP_PRODUCT_NAME = packageJson.productName || "ForwardApp";
const APP_EXECUTABLE_NAME =
  packageJson.build?.linux?.executableName || packageJson.name || "forward-app";
const APP_URL_SCHEME = "forwardapp"; 

const userHomeDir = os.homedir();
const userApplicationsDir = path.join(
  userHomeDir,
  ".local",
  "share",
  "applications",
);
const userIconsBaseDir = path.join(userHomeDir, ".local", "share", "icons");
const desktopFileName = `${APP_EXECUTABLE_NAME}.desktop`;

let mainWindowInstance: BrowserWindow | null = null;
let queuedUrlFromAppOpen: string | null = null;
let isRendererReadyForUrl = false;

const IPC_CHANNELS_FROM_PRELOAD = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  OPEN_EXTERNAL_LINK: "open-external-link",
  HANDLE_CUSTOM_URL: "handle-custom-url",
  SHOW_SAVE_DIALOG: "show-save-dialog",
  SHOW_OPEN_DIALOG: "show-open-dialog",
  WRITE_FILE: "write-file",
  READ_FILE: "read-file",
  RENDERER_ERROR: "renderer-error",
  TEST_IPC_MESSAGE: "test-ipc-message",
  REPORT_RENDERER_ERROR: "report-renderer-error",
  RENDERER_READY_FOR_URL: "renderer-ready-for-url",
  WIFI_SYNC_START_SERVER: "wifi-sync:start-server",
  WIFI_SYNC_STOP_SERVER: "wifi-sync:stop-server",
  WIFI_SYNC_FETCH_FROM_DEVICE: "wifi-sync:fetch-from-device",
  WIFI_SYNC_APPLY_TO_DEVICE: "wifi-sync:apply-to-device",
  SHOW_WIFI_IMPORT_DIALOG: "show-wifi-import-dialog",
  SHOW_WIFI_SERVER_STATUS: "show-wifi-server-status",
};

let syncServer: Express | null = null;
let serverInstance: http.Server | null = null;

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow() {
  console.log("[Main] createWindow: Створення головного вікна.");
  isRendererReadyForUrl = false;

  mainWindowInstance = new BrowserWindow({
    width: 1200,
    height: 800,
    title: `${app.getName()} v${app.getVersion()}`,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  });

  if (process.platform === "linux") {
    const untypedMainWindowInstance = mainWindowInstance as any;
    try {
      if (typeof untypedMainWindowInstance.setWMClass === "function") {
        console.log(`[Main] Спроба встановити WMClass на: ${APP_PRODUCT_NAME}`);
        untypedMainWindowInstance.setWMClass(APP_PRODUCT_NAME);
      } else {
        console.warn("[Main] Функція BrowserWindow.setWMClass() не знайдена.");
      }
    } catch (wmClassError) {
      console.warn("[Main] Помилка під час виклику setWMClass:", wmClassError);
    }
  }

  if (
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined" &&
    MAIN_WINDOW_VITE_DEV_SERVER_URL
  ) {
    mainWindowInstance.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else if (typeof MAIN_WINDOW_VITE_NAME !== "undefined") {
    mainWindowInstance.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  } else {
    console.warn(
      "[Main] MAIN_WINDOW_VITE_DEV_SERVER_URL та MAIN_WINDOW_VITE_NAME не визначені.",
    );
    const indexPath = app.isPackaged
      ? path.join(__dirname, "../renderer/index.html")
      : "http://localhost:3000"; 

    if (app.isPackaged) {
      mainWindowInstance
        .loadFile(indexPath)
        .catch((err) =>
          console.error("[Main] Помилка завантаження файлу:", err),
        );
    } else {
      mainWindowInstance
        .loadURL(indexPath)
        .catch((err) => console.error("[Main] Помилка завантаження URL:", err));
    }
  }

  if (!app.isPackaged) {
    mainWindowInstance.webContents.openDevTools();
  }

  mainWindowInstance.webContents.once("did-finish-load", () => {
    console.log(
      "[Main] Подія 'did-finish-load': Контент вікна завантажено. Очікування сигналу готовності від рендерера.",
    );
  });

  mainWindowInstance.webContents.on("dom-ready", () => {
    console.log(
      `[Main] Подія 'dom-ready': DOM готовий. Надсилання тестового повідомлення на канал ${IPC_CHANNELS_FROM_PRELOAD.TEST_IPC_MESSAGE}`,
    );
    if (
      mainWindowInstance &&
      !mainWindowInstance.isDestroyed() &&
      mainWindowInstance.webContents &&
      !mainWindowInstance.webContents.isDestroyed()
    ) {
      mainWindowInstance.webContents.send(
        IPC_CHANNELS_FROM_PRELOAD.TEST_IPC_MESSAGE,
        "Привіт від Головного Процесу після dom-ready!",
      );
    }
  });

  mainWindowInstance.on("closed", () => {
    mainWindowInstance = null;
    isRendererReadyForUrl = false;
  });

  return mainWindowInstance;
}

if (process.platform !== "darwin") {
  const initialUrlFromArgs = process.argv.find((arg) =>
    arg.startsWith(`${APP_URL_SCHEME}://`),
  );
  if (initialUrlFromArgs) {
    console.log(
      `[Main] Додаток запущено з URL з командного рядка: ${initialUrlFromArgs}`,
    );
    queuedUrlFromAppOpen = initialUrlFromArgs;
  }
}

function handleAppUrl(urlToProcess: string) {
  console.log(`[Main] handleAppUrl: Обробка URL: ${urlToProcess}`);
  if (!urlToProcess || !urlToProcess.startsWith(`${APP_URL_SCHEME}://`)) {
    console.warn(
      `[Main] handleAppUrl: Некоректний URL або URL не відповідає схемі: ${urlToProcess}`,
    );
    return;
  }

  if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
    if (mainWindowInstance.isMinimized()) mainWindowInstance.restore();
    mainWindowInstance.focus();

    if (
      mainWindowInstance.webContents &&
      !mainWindowInstance.webContents.isDestroyed() &&
      !mainWindowInstance.webContents.isLoading() &&
      isRendererReadyForUrl
    ) {
      console.log(
        `[Main] handleAppUrl: Вікно та рендерер готові. Надсилання URL через IPC: ${urlToProcess}`,
      );
      mainWindowInstance.webContents.send(
        IPC_CHANNELS_FROM_PRELOAD.HANDLE_CUSTOM_URL,
        urlToProcess,
      );
      queuedUrlFromAppOpen = null;
    } else {
      console.log(
        `[Main] handleAppUrl: Вікно/webContents не повністю готові або рендерер не сигналізував. URL поставлено в чергу: ${urlToProcess}`,
      );
      queuedUrlFromAppOpen = urlToProcess;
    }
  } else {
    console.log(
      `[Main] handleAppUrl: Головне вікно недоступне. URL поставлено в чергу: ${urlToProcess}`,
    );
    queuedUrlFromAppOpen = urlToProcess;
    if (app.isReady() && BrowserWindow.getAllWindows().length === 0) {
      console.log(
        "[Main] handleAppUrl: Додаток готовий, вікон немає. Створення вікна.",
      );
      createWindow();
    }
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log(
    "[Main] Інший екземпляр програми вже запущено. Завершення поточного екземпляру.",
  );
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    console.log("[Main] Подія 'second-instance' спрацювала.");
    if (mainWindowInstance) {
      if (mainWindowInstance.isMinimized()) {
        console.log("[Main] Відновлення згорнутого вікна.");
        mainWindowInstance.restore();
      }
      console.log("[Main] Фокусування головного вікна.");
      mainWindowInstance.focus();
    }

    const urlFromCommandLine = commandLine.find((arg) =>
      arg.startsWith(`${APP_URL_SCHEME}://`),
    );
    if (urlFromCommandLine) {
      console.log(
        `[Main] URL отримано з командного рядка другого екземпляру: ${urlFromCommandLine}`,
      );
      handleAppUrl(urlFromCommandLine);
    } else {
      console.log(
        "[Main] URL не знайдено в командному рядку другого екземпляру.",
      );
    }
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    console.log(`[Main] Подія 'open-url' (macOS) з URL: ${url}`);
    if (app.isReady()) {
      handleAppUrl(url);
    } else {
      console.log(
        `[Main] 'open-url': Додаток не готовий, URL поставлено в чергу: ${url}`,
      );
      queuedUrlFromAppOpen = url;
    }
  });

  function isAppImageOnLinuxInternal(): boolean {
    const result =
      process.platform === "linux" &&
      !!process.env.APPIMAGE &&
      !!process.env.APPDIR;
    console.log(
      `[Main] isAppImageOnLinuxInternal: platform=${process.platform}, APPIMAGE=${process.env.APPIMAGE}, APPDIR=${process.env.APPDIR}, result=${result}`,
    );
    return result;
  }

  async function hasUserDesktopFileInternal(): Promise<boolean> {
    if (process.platform !== "linux") return false;
    const desktopFilePath = path.join(userApplicationsDir, desktopFileName);
    try {
      await fs.access(desktopFilePath, fs.constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  function commandExistsInternal(command: string): boolean {
    try {
      execSync(`command -v ${command}`, { stdio: "ignore" });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function createUserDesktopFileHandlerInternal(): Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }> {
    if (!isAppImageOnLinuxInternal()) {
      return {
        success: false,
        error: "Додаток не запущено як AppImage на Linux.",
      };
    }
    if (await hasUserDesktopFileInternal()) {
      return {
        success: false,
        message: "Файл .desktop для поточного користувача вже існує.",
      };
    }

    const appImagePath = process.env.APPIMAGE;
    if (!appImagePath) {
      return {
        success: false,
        error: "Змінна середовища APPIMAGE не знайдена.",
      };
    }

    const iconSizesToTry = [
      "256x256",
      "128x128",
      "512x512",
      "64x64",
      "48x48",
      "32x32",
    ];
    let iconSourcePathInAppDir: string | null = null;
    let targetIconDir: string | null = null;
    let targetIconPath: string | null = null;

    for (const size of iconSizesToTry) {
      const potentialIconPath = path.join(
        process.env.APPDIR!,
        "usr",
        "share",
        "icons",
        "hicolor",
        size,
        "apps",
        `${APP_EXECUTABLE_NAME}.png`,
      );
      if (await fs.pathExists(potentialIconPath)) {
        iconSourcePathInAppDir = potentialIconPath;
        targetIconDir = path.join(userIconsBaseDir, "hicolor", size, "apps");
        targetIconPath = path.join(targetIconDir, `${APP_EXECUTABLE_NAME}.png`);
        break;
      }
    }

    try {
      await fs.mkdirp(userApplicationsDir);
      let iconCopied = false;
      if (iconSourcePathInAppDir && targetIconDir && targetIconPath) {
        await fs.mkdirp(targetIconDir);
        await fs.copy(iconSourcePathInAppDir, targetIconPath);
        iconCopied = true;
        console.log(
          `[Main] Іконку скопійовано: ${iconSourcePathInAppDir} -> ${targetIconPath}`,
        );
      } else {
        console.warn(
          `[Main] Файл іконки "${APP_EXECUTABLE_NAME}.png" не знайдено. Іконка для .desktop файлу може не відображатися коректно.`,
        );
      }

      const desktopFileContent = `[Desktop Entry]
Name=${APP_PRODUCT_NAME}
Comment=Запустити ${APP_PRODUCT_NAME}
Exec="${appImagePath}" --gtk-version=3 %U
Icon=${APP_EXECUTABLE_NAME}
Terminal=false
Type=Application
Categories=Utility;Office;Network;
MimeType=x-scheme-handler/${APP_URL_SCHEME};
StartupWMClass=${APP_PRODUCT_NAME}
X-AppImage-Path=${appImagePath}
X-AppImage-Version=${app.getVersion()}
Keywords=goals;tasks;productivity;${APP_PRODUCT_NAME};${APP_EXECUTABLE_NAME};
`;
      const desktopFilePath = path.join(userApplicationsDir, desktopFileName);
      await fs.writeFile(desktopFilePath, desktopFileContent);
      await fs.chmod(desktopFilePath, 0o755);
      console.log(`[Main] .desktop файл створено: ${desktopFilePath}`);

      const commandsToExecute: string[] = [];
      if (commandExistsInternal("update-desktop-database")) {
        commandsToExecute.push(
          `update-desktop-database -q "${userApplicationsDir}"`,
        );
      } else {
        console.warn("[Main] Команда update-desktop-database не знайдена.");
      }
      if (iconCopied && commandExistsInternal("gtk-update-icon-cache")) {
        const userIconsHicolorDir = path.join(userIconsBaseDir, "hicolor");
        const indexThemePath = path.join(userIconsHicolorDir, "index.theme");
        if (!(await fs.pathExists(indexThemePath))) {
          try {
            const hicolorIndexThemeContent = `[Icon Theme]
Name=Hicolor
Comment=Fallback theme for Freedesktop icon themes
Inherits=hicolor
Directories=16x16/apps,22x22/apps,24x24/apps,32x32/apps,48x48/apps,64x64/apps,128x128/apps,256x256/apps,512x512/apps,scalable/apps
[256x256/apps]
Size=256
Context=Applications
Type=Fixed
`;
            await fs.mkdirp(userIconsHicolorDir);
            await fs.writeFile(indexThemePath, hicolorIndexThemeContent);
            console.log(`[Main] Створено файл ${indexThemePath}`);
          } catch (themeError) {
            console.warn(
              `[Main] Не вдалося створити ${indexThemePath}:`,
              themeError,
            );
          }
        }
        commandsToExecute.push(
          `gtk-update-icon-cache -f -q "${userIconsHicolorDir}"`,
        );
      } else if (iconCopied) {
        console.warn("[Main] Команда gtk-update-icon-cache не знайдена.");
      }

      for (const cmd of commandsToExecute) {
        await new Promise<void>((resolve) => {
          exec(cmd, (error, stdout, stderr) => {
            if (error)
              console.warn(
                `[Main] Помилка виконання "${cmd}": ${stderr || error.message}`,
              );
            else console.log(`[Main] Команда "${cmd}" виконана: ${stdout}`);
            resolve();
          });
        });
      }
      return {
        success: true,
        message: "Ярлик для меню та іконку успішно створено.",
      };
    } catch (err: any) {
      console.error("[Main] Помилка створення .desktop файлу:", err);
      return { success: false, error: err.message || "Невідома помилка." };
    }
  }

app.whenReady().then(() => {

    const menuTemplate: (
      | Electron.MenuItemConstructorOptions
      | Electron.MenuItem
    )[] = [
      {
        label: "Файл",
        submenu: [
          { label: "Вихід", role: "quit" },
        ],
      },
      {
        label: "Синхронізація",
        submenu: [
          {
            label: "Імпорт з Wi-Fi (Android)...",
            click: () => {
              mainWindowInstance?.webContents.send("show-wifi-import-dialog");
            },
          },
          {
            label: "Запустити Wi-Fi сервер",
            click: () => {
              mainWindowInstance?.webContents.send("show-wifi-server-status");
            },
          },
        ],
      },
      // ✨ ВИПРАВЛЕННЯ: Меню розробки тепер доступне завжди.
      {
          label: 'Розробка',
          submenu: [
              { role: 'reload' },
              { role: 'forceReload' },
              { type: 'separator' },
              { role: 'toggleDevTools' }
          ]
      },
      {
        label: "Допомога",
        submenu: [
          {
            label: `Про програму ${app.getName()}`,
            click: () => {
              if (mainWindowInstance) {
                dialog.showMessageBox(mainWindowInstance, {
                  type: "info",
                  title: `Про програму`,
                  message: app.getName(),
                  detail: `Версія: ${app.getVersion()}`,
                });
              }
            },
          },
          {
            label: "Відвідати GitHub",
            click: async () => {
              await shell.openExternal("https://github.com/phoenixway/forward-app");
            },
          },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    
    // IPC обробники
    ipcMain.handle("get-app-version", () => app.getVersion());

    ipcMain.handle("show-save-dialog", async (_event, options: Electron.SaveDialogOptions) => {
        if (!mainWindowInstance) return { canceled: true, filePath: undefined };
        return dialog.showSaveDialog(mainWindowInstance, options);
    });

    ipcMain.handle("write-file", async (_event, filePath: string, content: string) => {
        try {
          await fs.writeFile(filePath, content);
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle("show-open-dialog", async (_event, options: Electron.OpenDialogOptions) => {
        if (!mainWindowInstance) return { canceled: true, filePaths: [] };
        return dialog.showOpenDialog(mainWindowInstance, options);
    });

    ipcMain.handle("read-file", async (_event, filePath: string) => {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          return { success: true, content };
        } catch (error: any) {
          return { success: false, error: error.message };
        }
    });

    let serverInstance: http.Server | null = null;
    ipcMain.handle("wifi-sync:start-server", async (_event, dataForExport: any) => {
        if (serverInstance) {
            return { success: false, error: "Сервер вже запущено." };
        }
        try {
            const port = 8080;
            const syncServer = express();
            syncServer.use(cors());
            syncServer.get('/export', (req: Request, res: Response) => {
                res.json(dataForExport);
            });
            return new Promise((resolve) => {
                serverInstance = syncServer.listen(port, () => {
                    const address = ip.address();
                    resolve({ success: true, address: `${address}:${port}` });
                }).on('error', (err) => {
                    resolve({ success: false, error: err.message });
                });
            });
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle("wifi-sync:stop-server", async () => {
      if (serverInstance) {
        return new Promise((resolve) => {
            serverInstance!.close((err) => {
                if(err) {
                    resolve({ success: false, error: err.message });
                    return;
                }
                serverInstance = null;
                resolve({ success: true });
            });
        });
      }
      return { success: true }; // Вже зупинено
    });

    ipcMain.handle("wifi-sync:fetch-from-device", async (_event, deviceAddress: string) => {
        try {
            const fullUrl = `http://${deviceAddress.trim()}/export`;
            const response = await axios.get(fullUrl, { timeout: 10000 }); 
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
});

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

}
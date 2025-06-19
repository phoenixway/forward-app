import { app, ipcMain, dialog, BrowserWindow, shell } from "electron";
import path from "path";
import fs from "fs-extra";
import os from "os";
import { exec, execSync } from "child_process";

// Шлях до package.json (адаптуйте, якщо структура інша)
// Цей шлях правильний, якщо main.ts компілюється в dist/main/main.js, а package.json в корені
const packageJsonDefaultPath = path.join(__dirname, "..", "..", "package.json");
let packageJson: any;
try {
  // Спробуємо знайти package.json поруч із зібраним main.js (якщо electron-builder копіює його)
  // або в корені проекту для розробки.
  const possiblePackageJsonPaths = [
    packageJsonDefaultPath, // Для випадку, якщо __dirname вказує на dist/main
    path.join(app.getAppPath(), "package.json"), // Більш надійний шлях для розробки та деяких упаковок
    app.isPackaged
      ? path.join(process.resourcesPath, "app.asar.unpacked", "package.json")
      : null, // Для app.asar.unpacked
    app.isPackaged
      ? path.join(process.resourcesPath, "app", "package.json")
      : null, // Ще один можливий варіант для упакованого
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
console.log(
  `[Main] packageJson.build?.linux?.executableName: ${packageJson.build?.linux?.executableName}`,
);
console.log(`[Main] packageJson.name: ${packageJson.name}`);
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

// Канали IPC, які використовуються у вашому preload.ts
const IPC_CHANNELS_FROM_PRELOAD = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings", // Потрібна реалізація
  SET_APP_SETTING: "set-app-setting", // Потрібна реалізація
  OPEN_EXTERNAL_LINK: "open-external-link",
  HANDLE_CUSTOM_URL: "handle-custom-url", // Це для рендерера, щоб отримувати URL
  SHOW_SAVE_DIALOG: "show-save-dialog",
  SHOW_OPEN_DIALOG: "show-open-dialog",
  WRITE_FILE: "write-file",
  READ_FILE: "read-file",
  TEST_IPC_MESSAGE: "test-ipc-message", // Канал для тестування
  RENDERER_READY_FOR_URL: "renderer-ready-for-url",
};

// Не забудьте оголосити MAIN_WINDOW_VITE_DEV_SERVER_URL та MAIN_WINDOW_VITE_NAME,
// якщо ви використовуєте electron-vite шаблон. Якщо ні, адаптуйте завантаження URL/файлу.
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow() {
  mainWindowInstance = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
    },
  });

  if (process.platform === "linux") {
    const untypedMainWindowInstance = mainWindowInstance as any; // Приведення до any
    if (typeof untypedMainWindowInstance.setWMClass === "function") {
      console.log(`[Main] Спроба встановити WMClass на: ${APP_PRODUCT_NAME}`);
      untypedMainWindowInstance.setWMClass(APP_PRODUCT_NAME);
      console.log(`[Main] WMClass встановлено (або помилка не виникла).`);
    } else {
      console.warn(
        "[Main] BrowserWindow.setWMClass() function not found on instance.",
      );
    }
  }

  // Завантаження UI (зберігаємо вашу логіку з MAIN_WINDOW_VITE_...)
  // Переконайтеся, що ці змінні визначені, якщо ви їх використовуєте.
  // Якщо ні, замініть цю логіку на app.isPackaged, як було запропоновано раніше.
  if (
    typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== "undefined" &&
    MAIN_WINDOW_VITE_DEV_SERVER_URL
  ) {
    mainWindowInstance.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    // mainWindowInstance.webContents.openDevTools(); // Розкоментуйте для відладки
  } else if (typeof MAIN_WINDOW_VITE_NAME !== "undefined") {
    mainWindowInstance.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  } else {
    // Запасний варіант, якщо змінні electron-vite не визначені
    console.warn(
      "[Main] MAIN_WINDOW_VITE_DEV_SERVER_URL та MAIN_WINDOW_VITE_NAME не визначені. Спроба завантажити стандартний index.html.",
    );
    const indexPath = app.isPackaged
      ? path.join(__dirname, "../renderer/index.html") // Адаптуйте шлях для продакшену
      : "http://localhost:5173"; // Адаптуйте URL для dev сервера

    if (app.isPackaged) {
      mainWindowInstance
        .loadFile(indexPath)
        .catch((err) => console.error("[Main] Error loading file:", err));
    } else {
      mainWindowInstance
        .loadURL(indexPath)
        .catch((err) => console.error("[Main] Error loading URL:", err));
      // mainWindowInstance.webContents.openDevTools();
    }
  }

  mainWindowInstance.webContents.once("did-finish-load", () => {
    console.log("[Main] Window finished loading.");
    if (queuedUrlFromAppOpen && mainWindowInstance) {
      console.log(
        `[Main] Sending queued URL to renderer: ${queuedUrlFromAppOpen}`,
      );
      mainWindowInstance.webContents.send(
        IPC_CHANNELS_FROM_PRELOAD.HANDLE_CUSTOM_URL, // Використовуємо ваш канал
        queuedUrlFromAppOpen,
      );
      queuedUrlFromAppOpen = null;
    }
  });

  // Надсилання тестового повідомлення рендереру після завантаження
  mainWindowInstance.webContents.on("dom-ready", () => {
    // Або did-finish-load
    console.log(
      `[Main] DOM ready, sending test message on channel ${IPC_CHANNELS_FROM_PRELOAD.TEST_IPC_MESSAGE}`,
    );
    mainWindowInstance?.webContents.send(
      IPC_CHANNELS_FROM_PRELOAD.TEST_IPC_MESSAGE,
      "Hello from Main Process after DOM ready!",
    );
  });

  return mainWindowInstance;
}

// --- Функції для інтеграції з робочим столом ---
function isAppImageOnLinuxInternal(): boolean {
  const result =
    process.platform === "linux" &&
    !!process.env.APPIMAGE && // <--- Перевірка 1
    !!process.env.APPDIR; // <--- Перевірка 2

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
    return { success: false, error: "Змінна середовища APPIMAGE не знайдена." };
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
Exec="${appImagePath}" %U
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
      // Спробуємо створити index.theme, якщо його немає, перш ніж оновлювати кеш
      const indexThemePath = path.join(userIconsHicolorDir, "index.theme");
      if (!(await fs.pathExists(indexThemePath))) {
        try {
          // Створюємо мінімальний index.theme для hicolor
          const hicolorIndexThemeContent = `[Icon Theme]
Name=Hicolor
Comment=Fallback theme for Freedesktop icon themes
Inherits=hicolor
Directories=16x16/apps,22x22/apps,24x24/apps,32x32/apps,48x48/apps,64x64/apps,128x128/apps,256x256/apps,512x512/apps,scalable/apps
# Example for 256x256/apps
[256x256/apps]
Size=256
Context=Applications
Type=Fixed
`; // Можна додати інші розміри, якщо потрібно
          // Переконаємося, що базовий каталог для hicolor існує
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
        `gtk-update-icon-cache -f -q "${userIconsHicolorDir}"`, // Оновлюємо конкретно hicolor
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

// --- Реєстрація IPC обробників ---
app.whenReady().then(() => {
  // Обробники з вашого preload.ts
  ipcMain.handle(IPC_CHANNELS_FROM_PRELOAD.GET_APP_VERSION, () => {
    return app.getVersion();
  });

  ipcMain.handle(IPC_CHANNELS_FROM_PRELOAD.GET_APP_SETTINGS, async () => {
    // ЗАМІНІТЬ ЦЕ НА ВАШУ РЕАЛЬНУ ЛОГІКУ ОТРИМАННЯ НАЛАШТУВАНЬ
    console.log("[Main] GET_APP_SETTINGS called");
    return { exampleSetting: "exampleValue" }; // Приклад
  });

  ipcMain.handle(
    IPC_CHANNELS_FROM_PRELOAD.SET_APP_SETTING,
    async (_event, key: string, value: any) => {
      // ЗАМІНІТЬ ЦЕ НА ВАШУ РЕАЛЬНУ ЛОГІКУ ЗБЕРЕЖЕННЯ НАЛАШТУВАНЬ
      console.log(
        `[Main] SET_APP_SETTING called with key: ${key}, value: ${value}`,
      );
      return { success: true, message: `Setting ${key} saved.` }; // Приклад
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_FROM_PRELOAD.OPEN_EXTERNAL_LINK,
    async (_event, url: string) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error: any) {
        console.error(`[Main] Failed to open external link ${url}:`, error);
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_FROM_PRELOAD.SHOW_SAVE_DIALOG,
    async (_event, options: Electron.SaveDialogOptions) => {
      if (!mainWindowInstance) return { canceled: true, filePath: undefined };
      return dialog.showSaveDialog(mainWindowInstance, options);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_FROM_PRELOAD.WRITE_FILE,
    async (_event, filePath: string, content: string) => {
      try {
        await fs.writeFile(filePath, content);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_FROM_PRELOAD.SHOW_OPEN_DIALOG,
    async (_event, options: Electron.OpenDialogOptions) => {
      if (!mainWindowInstance) return { canceled: true, filePaths: [] };
      return dialog.showOpenDialog(mainWindowInstance, options);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS_FROM_PRELOAD.READ_FILE,
    async (_event, filePath: string) => {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return { success: true, content };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    },
  );

  // Обробник для сигналу готовності рендерера
  ipcMain.on(IPC_CHANNELS_FROM_PRELOAD.RENDERER_READY_FOR_URL, () => {
    console.log(
      `[Main] Received ${IPC_CHANNELS_FROM_PRELOAD.RENDERER_READY_FOR_URL}`,
    );
    if (
      queuedUrlFromAppOpen &&
      mainWindowInstance &&
      !mainWindowInstance.isDestroyed() &&
      !mainWindowInstance.webContents.isLoading()
    ) {
      console.log(
        `[Main] Sending queued URL via ${IPC_CHANNELS_FROM_PRELOAD.HANDLE_CUSTOM_URL}: ${queuedUrlFromAppOpen}`,
      );
      mainWindowInstance.webContents.send(
        IPC_CHANNELS_FROM_PRELOAD.HANDLE_CUSTOM_URL,
        queuedUrlFromAppOpen,
      );
      queuedUrlFromAppOpen = null;
    }
  });

  // Нові IPC хендлери для інтеграції з робочим столом
  ipcMain.handle("app:isAppImageOnLinux", () => isAppImageOnLinuxInternal());
  ipcMain.handle("app:hasUserDesktopFile", async () =>
    hasUserDesktopFileInternal(),
  );
  ipcMain.handle("app:createUserDesktopFile", async () =>
    createUserDesktopFileHandlerInternal(),
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// --- Обробка URL-схеми та життєвий цикл додатка ---
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Реєстрація обробника протоколу
// Важливо зробити це до app.whenReady(), якщо можливо, або переконатися, що це не викликає проблем
if (process.platform !== "darwin") {
  // На macOS це зазвичай робиться через Info.plist
  if (!app.isDefaultProtocolClient(APP_URL_SCHEME)) {
    // Встановлюємо лише якщо ще не встановлено як обробник за замовчуванням
    console.log(
      `[Main] Реєстрація протоколу: APP_URL_SCHEME=${APP_URL_SCHEME}, process.execPath=${process.execPath}, defaultApp=${process.defaultApp}`,
    );
    if (process.defaultApp && process.argv.length >= 2) {
      console.log(
        `[Main] Аргументи для defaultApp: ${[path.resolve(process.argv[1])]}`,
      );
    }
    const success = app.setAsDefaultProtocolClient(
      APP_URL_SCHEME,
      process.execPath,
      process.defaultApp ? [path.resolve(process.argv[1])] : undefined,
    );
    if (!success) {
      console.error(
        `[Main] Не вдалося зареєструвати клієнт протоколу для ${APP_URL_SCHEME}`,
      );
    } else {
      console.log(
        `[Main] Клієнт протоколу для ${APP_URL_SCHEME} успішно зареєстровано/перевірено.`,
      );
    }
  } else {
    console.log(
      `[Main] ${APP_URL_SCHEME} вже є клієнтом протоколу за замовчуванням.`,
    );
  }
}

// Обробник події 'open-url'
app.on("open-url", (event, url) => {
  event.preventDefault();
  console.log(`[Main] Подія open-url з URL: ${url}`);
  if (mainWindowInstance && !mainWindowInstance.isDestroyed()) {
    if (mainWindowInstance.webContents.isLoading()) {
      console.log(
        `[Main] Вікно завантажується, URL поставлено в чергу: ${url}`,
      );
      queuedUrlFromAppOpen = url;
    } else {
      console.log(
        `[Main] Вікно існує, надсилання URL через ${IPC_CHANNELS_FROM_PRELOAD.HANDLE_CUSTOM_URL}: ${url}`,
      );
      mainWindowInstance.webContents.send(
        IPC_CHANNELS_FROM_PRELOAD.HANDLE_CUSTOM_URL,
        url,
      );
    }
    if (mainWindowInstance.isMinimized()) mainWindowInstance.restore();
    mainWindowInstance.focus();
  } else {
    console.log(
      `[Main] Головне вікно недоступне. URL поставлено в чергу: ${url}`,
    );
    queuedUrlFromAppOpen = url;
    // Якщо вікна немає, воно буде створено в app.whenReady() або app.on('activate')
    // і URL буде оброблено після 'did-finish-load' або 'renderer-ready-for-url'
  }
});

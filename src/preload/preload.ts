// src/preload/preload.ts
import {
  contextBridge,
  ipcRenderer,
  webFrame,
  IpcRendererEvent,
} from "electron";

// Канали, які використовуються для IPC
export const IPC_CHANNELS = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  OPEN_EXTERNAL_LINK: "open-external-link",
  HANDLE_CUSTOM_URL: "handle-custom-url", // Канал для отримання URL від main
  SHOW_SAVE_DIALOG: "show-save-dialog",
  SHOW_OPEN_DIALOG: "show-open-dialog",
  WRITE_FILE: "write-file",
  READ_FILE: "read-file",
  TEST_IPC_MESSAGE: "test-ipc-message", // Тестовий канал
  RENDERER_READY_FOR_URL: "renderer-ready-for-url", // Канал для сигналу готовності рендерера

  // Нові канали для інтеграції з робочим столом
  APP_IS_APPIMAGE_ON_LINUX: "app:isAppImageOnLinux",
  APP_HAS_USER_DESKTOP_FILE: "app:hasUserDesktopFile",
  APP_CREATE_USER_DESKTOP_FILE: "app:createUserDesktopFile",
};

// Типізація для API, що експортується
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppSettings: () => Promise<Record<string, any> | null>; // Адаптуйте тип повернення
  setAppSetting: (
    key: string,
    value: any,
  ) => Promise<{ success: boolean; message?: string }>;
  getZoomFactor: () => number;
  setZoomFactor: (factor: number) => void;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;

  onCustomUrl: (callback: (url: string) => void) => () => void; // Функція відписки
  rendererReadyForUrl: () => void;

  showSaveDialog: (
    options: Electron.SaveDialogOptions,
  ) => Promise<Electron.SaveDialogReturnValue & { filePath?: string }>;
  showOpenDialog: (
    options: Electron.OpenDialogOptions,
  ) => Promise<Electron.OpenDialogReturnValue & { filePaths: string[] }>;
  writeFile: (
    filePath: string,
    content: string,
  ) => Promise<{ success: boolean; error?: string }>;
  readFile: (
    filePath: string,
  ) => Promise<{ success: boolean; content?: string | Buffer; error?: string }>;

  // Нові функції
  isAppImageOnLinux: () => Promise<boolean>;
  hasUserDesktopFile: () => Promise<boolean>;
  createUserDesktopFile: () => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;
}

// --- Логіка для обробки URL ---
let activeCustomUrlCallback: ((url: string) => void) | null = null;
let queuedUrlFromMain: string | null = null;

// Слухач для отримання URL від головного процесу
ipcRenderer.on(
  IPC_CHANNELS.HANDLE_CUSTOM_URL,
  (_event: IpcRendererEvent, url: string) => {
    console.log(
      `[Preload] Listener for "${IPC_CHANNELS.HANDLE_CUSTOM_URL}" received URL: "${url}"`,
    );
    if (activeCustomUrlCallback) {
      console.log("[Preload] Active callback exists, calling it with URL.");
      activeCustomUrlCallback(url);
      queuedUrlFromMain = null;
    } else {
      console.log("[Preload] No active callback, queuing URL.");
      queuedUrlFromMain = url;
    }
  },
);
// --- Кінець логіки для обробки URL ---

// --- Тестовий слухач ---
ipcRenderer.on(
  IPC_CHANNELS.TEST_IPC_MESSAGE,
  (_event: IpcRendererEvent, message: string) => {
    console.log(
      `[Preload] Listener for "${IPC_CHANNELS.TEST_IPC_MESSAGE}" received: "${message}"`,
    );
  },
);
// --- Кінець тестового слухача ---

// Об'єкт API, що експортується
const exposedAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  getAppSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_SETTINGS),
  setAppSetting: (key, value) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_APP_SETTING, key, value),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  openExternal: (url) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_LINK, url),

  onCustomUrl: (callback) => {
    console.log("[Preload] onCustomUrl: Registering callback.");
    activeCustomUrlCallback = callback;
    if (queuedUrlFromMain) {
      console.log(
        "[Preload] onCustomUrl: Processing queued URL:",
        queuedUrlFromMain,
      );
      activeCustomUrlCallback(queuedUrlFromMain);
      queuedUrlFromMain = null;
    }
    return () => {
      console.log("[Preload] onCustomUrl: Unregistering callback.");
      activeCustomUrlCallback = null;
    };
  },

  rendererReadyForUrl: () => {
    console.log(
      `[Preload] Sending "${IPC_CHANNELS.RENDERER_READY_FOR_URL}" to main.`,
    );
    ipcRenderer.send(IPC_CHANNELS.RENDERER_READY_FOR_URL);
  },

  showSaveDialog: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options),
  showOpenDialog: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),
  readFile: (filePath) => ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),

  // Нові функції
  isAppImageOnLinux: () =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_IS_APPIMAGE_ON_LINUX),
  hasUserDesktopFile: () =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_HAS_USER_DESKTOP_FILE),
  createUserDesktopFile: () =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_CREATE_USER_DESKTOP_FILE),
};

contextBridge.exposeInMainWorld("electronAPI", exposedAPI);

// Типізація для window.electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

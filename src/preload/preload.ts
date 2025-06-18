// src/preload/preload.ts
import {
  contextBridge,
  ipcRenderer,
  webFrame,
  IpcRendererEvent,
} from "electron";

const IPC_CHANNELS = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  OPEN_EXTERNAL_LINK: "open-external-link",
  HANDLE_CUSTOM_URL: "handle-custom-url",
  SHOW_SAVE_DIALOG: "show-save-dialog",
  SHOW_OPEN_DIALOG: "show-open-dialog",
  WRITE_FILE: "write-file",
  READ_FILE: "read-file",
  TEST_IPC_MESSAGE: "test-ipc-message", // Тестовий канал
  RENDERER_READY_FOR_URL: "renderer-ready-for-url", // Канал для сигналу готовності рендерера
};

// --- Глобальні змінні в preload ---
let activeCustomUrlCallback: ((url: string) => void) | null = null;
let queuedUrlFromMain: string | null = null; // Черга для URL, якщо він прийшов раніше колбека

// --- Слухач для тестового IPC повідомлення ---
// Цей слухач реєструється одразу при завантаженні preload скрипта
ipcRenderer.on(
  IPC_CHANNELS.TEST_IPC_MESSAGE,
  (_event: IpcRendererEvent, message: string) => {
    console.log(`[Preload] Received on TEST_IPC_MESSAGE: "${message}"`);
  },
);
console.log(
  `[Preload] Registered global listener for ${IPC_CHANNELS.TEST_IPC_MESSAGE}`,
);
// --- Кінець тестового слухача ---

// --- ПРЯМИЙ СЛУХАЧ ДЛЯ HANDLE_CUSTOM_URL (для тесту) ---
ipcRenderer.on(
  IPC_CHANNELS.HANDLE_CUSTOM_URL,
  (_event: IpcRendererEvent, url: string) => {
    console.log(
      `[Preload] DIRECT LISTENER received on HANDLE_CUSTOM_URL: "${url}"`,
    );
    if (activeCustomUrlCallback) {
      console.log(
        "[Preload] Callback is active. Calling active custom URL callback immediately.",
      );
      activeCustomUrlCallback(url); // Передаємо "чистий" URL
      queuedUrlFromMain = null; // Очищаємо чергу, якщо URL був оброблений
    } else {
      console.log("[Preload] Callback is NOT active. Queuing URL:", url);
      queuedUrlFromMain = url; // Зберігаємо URL в чергу
    }
  },
);
console.log(
  `[Preload] Registered DIRECT global listener for ${IPC_CHANNELS.HANDLE_CUSTOM_URL}`,
);
// --- Кінець прямого слухача ---

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  getAppSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_SETTINGS),
  setAppSetting: (key: string, value: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_APP_SETTING, key, value),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
  openExternal: (
    url: string,
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_LINK, url);
  },

  onCustomUrl: (callback: (url: string) => void): (() => void) => {
    console.log(
      "[Preload] electronAPI.onCustomUrl called by renderer. Setting active callback.",
    );
    activeCustomUrlCallback = callback;

    // Якщо в черзі є URL, який прийшов раніше, обробляємо його зараз
    if (queuedUrlFromMain) {
      console.log(
        "[Preload] Found queued URL. Calling active custom URL callback with queued URL:",
        queuedUrlFromMain,
      );
      activeCustomUrlCallback(queuedUrlFromMain);
      queuedUrlFromMain = null; // Очищаємо чергу
    }

    // Функція відписки просто очищає колбек
    return () => {
      console.log(
        "[Preload] Renderer wants to unsubscribe (from onCustomUrl). Clearing active custom URL callback.",
      );
      activeCustomUrlCallback = null;
      // Не потрібно видаляти глобальний слухач ipcRenderer.on
    };
  },

  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options),
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options),
  writeFile: (
    filePath: string,
    content: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),
  readFile: (
    filePath: string,
  ): Promise<{ success: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),
  // Метод для сигналу готовності рендерера (якщо ви реалізуєте "Спробу 2")
  rendererReadyForUrl: () => {
    console.log(
      `[Preload] Sending IPC message on channel ${IPC_CHANNELS.RENDERER_READY_FOR_URL}`,
    );
    ipcRenderer.send(IPC_CHANNELS.RENDERER_READY_FOR_URL);
  },
});

declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppSettings: () => Promise<Record<string, any> | null>;
      setAppSetting: (
        key: string,
        value: any,
      ) => Promise<{ success: boolean; message?: string }>;
      getZoomFactor: () => number;
      setZoomFactor: (factor: number) => void;
      openExternal: (
        url: string,
      ) => Promise<{ success: boolean; error?: string }>;
      onCustomUrl: (callback: (url: string) => void) => () => void;
      showSaveDialog: (
        options: Electron.SaveDialogOptions,
      ) => Promise<Electron.SaveDialogReturnValue>;
      showOpenDialog: (
        options: Electron.OpenDialogOptions,
      ) => Promise<Electron.OpenDialogReturnValue>;
      writeFile: (
        filePath: string,
        content: string,
      ) => Promise<{ success: boolean; error?: string }>;
      readFile: (
        filePath: string,
      ) => Promise<{ success: boolean; content?: string; error?: string }>;
      rendererReadyForUrl: () => void; // Додано тип
    };
  }
}

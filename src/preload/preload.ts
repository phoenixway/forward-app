// src/preload/preload.ts
import {
  contextBridge,
  ipcRenderer,
  webFrame,
  IpcRendererEvent,
} from "electron"; // Додав IpcRendererEvent

// Назви каналів мають співпадати з тими, що використовуються в main.ts
const IPC_CHANNELS = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  OPEN_EXTERNAL_LINK: "open-external-link",
  HANDLE_CUSTOM_URL: "handle-custom-url", // Канал для отримання URL з main процесу
};

contextBridge.exposeInMainWorld("electronAPI", {
  // --- Version ---
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),

  // --- Settings ---
  getAppSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_SETTINGS),
  setAppSetting: (key: string, value: any) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_APP_SETTING, key, value),

  // --- Zoom ---
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),

  // --- External Links ---
  openExternal: (
    url: string,
  ): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_LINK, url);
  },

  // --- Custom URL Handling ---
  onCustomUrl: (callback: (url: string) => void): (() => void) => {
    // Функція для підписки на URL
    const handler = (_event: IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on(IPC_CHANNELS.HANDLE_CUSTOM_URL, handler);
    // Повертаємо функцію для відписки, щоб уникнути витоків пам'яті
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.HANDLE_CUSTOM_URL, handler);
    };
  },
});

// Єдине і повне визначення типів для window.electronAPI
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
      // Додаємо новий метод до типів
      onCustomUrl: (callback: (url: string) => void) => () => void; // Тип для підписки та відписки
    };
  }
}

import { contextBridge, ipcRenderer, webFrame } from "electron";

const IPC_CHANNELS_PRELOAD = { // Перейменував, щоб уникнути конфлікту імен, якщо канали імпортуються
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  OPEN_EXTERNAL_LINK: "open-external-link", // <--- НОВИЙ КАНАЛ
};

contextBridge.exposeInMainWorld("electronAPI", {
  // --- Version ---
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.GET_APP_VERSION),

  // --- Settings ---
  getAppSettings: () => ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.GET_APP_SETTINGS),
  setAppSetting: (key: string, value: any) =>
    ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.SET_APP_SETTING, key, value),

  // --- Zoom ---
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),

  // --- External Links ---
  // Додаємо нову функцію
  openExternal: (url: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.OPEN_EXTERNAL_LINK, url);
  },
});

// Єдине і повне визначення типів для window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppSettings: () => Promise<Record<string, any> | null>;
      setAppSetting: (key: string, value: any) => Promise<{ success: boolean; message?: string } | void>;
      getZoomFactor: () => number;
      setZoomFactor: (factor: number) => void;
      // Додаємо новий метод до типів
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
import { contextBridge, ipcRenderer, webFrame } from "electron"; // Додано webFrame

// Канали IPC, які ми будемо використовувати
const IPC_CHANNELS = {
  GET_APP_VERSION: "get-app-version",
  GET_APP_SETTINGS: "get-app-settings",
  SET_APP_SETTING: "set-app-setting",
  // GET_ZOOM_FACTOR: "get-zoom-factor", // webFrame.getZoomFactor() працює синхронно
  // SET_ZOOM_FACTOR: "set-zoom-factor", // webFrame.setZoomFactor() працює синхронно
};

contextBridge.exposeInMainWorld("electronAPI", {
  // --- Version ---
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),

  // --- Settings ---
  getAppSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_SETTINGS),
  setAppSetting: (key: string, value: any) => 
    ipcRenderer.invoke(IPC_CHANNELS.SET_APP_SETTING, key, value),

  // --- Zoom ---
  // Для масштабування краще використовувати webFrame напряму,
  // оскільки це синхронні операції і не потребують IPC до main процесу,
  // якщо тільки main процес не має виконувати додаткову логіку при зміні масштабу.
  // Якщо ж логіка масштабування має бути в main, тоді потрібні IPC хендлери.
  // Наразі припускаємо, що достатньо webFrame.
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
});

// Єдине і повне визначення типів для window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppSettings: () => Promise<Record<string, any> | null>;
      setAppSetting: (key: string, value: any) => Promise<{ success: boolean; message?: string } | void>; // Або просто Promise<void>
      getZoomFactor: () => number; // webFrame.getZoomFactor() повертає number синхронно
      setZoomFactor: (factor: number) => void; // webFrame.setZoomFactor() нічого не повертає і працює синхронно
    };
  }
}
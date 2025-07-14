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
  HANDLE_CUSTOM_URL: "handle-custom-url", 
  SHOW_SAVE_DIALOG: "show-save-dialog",
  SHOW_OPEN_DIALOG: "show-open-dialog",
  WRITE_FILE: "write-file",
  READ_FILE: "read-file",
  TEST_IPC_MESSAGE: "test-ipc-message", 
  RENDERER_READY_FOR_URL: "renderer-ready-for-url", 
  RENDERER_ERROR: "renderer-error",
  APP_IS_APPIMAGE_ON_LINUX: "app:isAppImageOnLinux",
  APP_HAS_USER_DESKTOP_FILE: "app:hasUserDesktopFile",
  APP_CREATE_USER_DESKTOP_FILE: "app:createUserDesktopFile",
  
  // --- НОВІ КАНАЛИ ---
  WIFI_SYNC_START_SERVER: "wifi-sync:start-server",
  WIFI_SYNC_STOP_SERVER: "wifi-sync:stop-server",
  WIFI_SYNC_FETCH_FROM_DEVICE: "wifi-sync:fetch-from-device",
  WIFI_SYNC_APPLY_TO_DEVICE: "wifi-sync:apply-to-device",
  SHOW_WIFI_IMPORT_DIALOG: "show-wifi-import-dialog",
  SHOW_WIFI_SERVER_STATUS: "show-wifi-server-status",
};

export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  getAppSettings: () => Promise<Record<string, any> | null>; 
  setAppSetting: (key: string, value: any) => Promise<{ success: boolean; message?: string }>;
  getZoomFactor: () => number;
  setZoomFactor: (factor: number) => void;
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
  onCustomUrl: (callback: (url: string) => void) => () => void;
  rendererReadyForUrl: () => void;
  reportRendererError: (error: { message: string; stack?: string }) => void;
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue & { filePath?: string }>;
  showOpenDialog: (options: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue & { filePaths: string[] }>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  readFile: (filePath: string) => Promise<{ success: boolean; content?: string | Buffer; error?: string }>;
  isAppImageOnLinux: () => Promise<boolean>;
  hasUserDesktopFile: () => Promise<boolean>;
  createUserDesktopFile: () => Promise<{ success: boolean; error?: string; message?: string }>;

  // --- НОВІ ФУНКЦІЇ ДЛЯ WI-FI SYNC ---
  startWifiServer: (dataForExport: any) => Promise<{ success: boolean; address?: string, error?: string }>;

  stopWifiServer: () => Promise<{ success: boolean; error?: string }>;
  fetchFromDevice: (deviceAddress: string) => Promise<{ success: boolean; data?: any, error?: string }>;
  applyToDevice: (options: { deviceAddress: string; payload: any }) => Promise<{ success: boolean; data?: any, error?: string }>;
  // --- НОВІ СЛУХАЧІ ДЛЯ ВИКЛИКІВ З МЕНЮ ---
  onShowWifiImportDialog: (callback: () => void) => () => void;
  onShowWifiServerStatus: (callback: () => void) => () => void;
}


let activeCustomUrlCallback: ((url: string) => void) | null = null;
let queuedUrlFromMain: string | null = null;


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

ipcRenderer.on(
  IPC_CHANNELS.TEST_IPC_MESSAGE,
  (_event: IpcRendererEvent, message: string) => {
    console.log(
      `[Preload] Listener for "${IPC_CHANNELS.TEST_IPC_MESSAGE}" received: "${message}"`,
    );
  },
);

const exposedAPI: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),
  getAppSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_SETTINGS),
  setAppSetting: (key, value) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_APP_SETTING, key, value),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  openExternal: (url) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_LINK, url),
  reportRendererError: (error) =>
    ipcRenderer.send(IPC_CHANNELS.RENDERER_ERROR, error),
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
  isAppImageOnLinux: () =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_IS_APPIMAGE_ON_LINUX),
  hasUserDesktopFile: () =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_HAS_USER_DESKTOP_FILE),
  createUserDesktopFile: () =>
    ipcRenderer.invoke(IPC_CHANNELS.APP_CREATE_USER_DESKTOP_FILE),

  // --- НОВІ РЕАЛІЗАЦІЇ ---
  startWifiServer: (dataForExport) => ipcRenderer.invoke(IPC_CHANNELS.WIFI_SYNC_START_SERVER, dataForExport),

  stopWifiServer: () => ipcRenderer.invoke(IPC_CHANNELS.WIFI_SYNC_STOP_SERVER),
  fetchFromDevice: (deviceAddress) => ipcRenderer.invoke(IPC_CHANNELS.WIFI_SYNC_FETCH_FROM_DEVICE, deviceAddress),
  applyToDevice: (options) => ipcRenderer.invoke(IPC_CHANNELS.WIFI_SYNC_APPLY_TO_DEVICE, options),

  onShowWifiImportDialog: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.SHOW_WIFI_IMPORT_DIALOG, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SHOW_WIFI_IMPORT_DIALOG, listener);
  },
  onShowWifiServerStatus: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.SHOW_WIFI_SERVER_STATUS, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.SHOW_WIFI_SERVER_STATUS, listener);
  },
};

contextBridge.exposeInMainWorld("electronAPI", exposedAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
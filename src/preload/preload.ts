import {
  contextBridge,
  ipcRenderer,
  webFrame,
  IpcRendererEvent,
} from "electron";
import type { Tab } from '../renderer/types';

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
  
  // Канали синхронізації
  WIFI_SYNC_START_SERVER: "wifi-sync:start-server",
  WIFI_SYNC_STOP_SERVER: "wifi-sync:stop-server",
  WIFI_SYNC_FETCH_FROM_DEVICE: "wifi-sync:fetch-from-device",
  WIFI_SYNC_APPLY_TO_DEVICE: "wifi-sync:apply-to-device",
  
  // Канали, що викликаються з меню
  SHOW_WIFI_IMPORT_DIALOG: "show-wifi-import-dialog",
  SHOW_WIFI_SERVER_STATUS: "show-wifi-server-status",
  TRIGGER_FILE_EXPORT: "trigger-file-export",
  TRIGGER_FILE_IMPORT: "trigger-file-import",
  TRIGGER_SHOW_SETTINGS: "trigger-show-settings",
  
  // Канали для гарячих клавіш
  CLOSE_CURRENT_TAB: "close-current-tab",
  NAVIGATE_NEXT_TAB: 'navigate-next-tab',
  NAVIGATE_PREVIOUS_TAB: 'navigate-previous-tab',

  // Канали для збереження сесії вкладок
  REQUEST_TABS_FOR_SAVING: 'request-tabs-for-saving',
  SAVE_TABS_STATE: 'save-tabs-state',
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

  // Функції Wi-Fi Sync
  startWifiServer: (dataForExport: any) => Promise<{ success: boolean; address?: string, error?: string }>;
  stopWifiServer: () => Promise<{ success: boolean; error?: string }>;
  fetchFromDevice: (deviceAddress: string) => Promise<{ success: boolean; data?: any, error?: string }>;
  applyToDevice: (options: { deviceAddress: string; payload: any }) => Promise<{ success: boolean; data?: any, error?: string }>;
  
  // Слухачі подій з меню та гарячих клавіш
  onShowWifiImportDialog: (callback: () => void) => () => void;
  onShowWifiServerStatus: (callback: () => void) => () => void;
  onTriggerFileExport: (callback: () => void) => () => void;
  onTriggerFileImport: (callback: () => void) => () => void;
  onShowSettingsPage: (callback: () => void) => () => void;
  onCloseCurrentTab: (callback: () => void) => () => void;
  onNavigateNextTab: (callback: () => void) => () => void;
  onNavigatePreviousTab: (callback: () => void) => () => void;

  // Збереження сесії вкладок
  onRequestTabsForSaving: (callback: () => void) => () => void;
  saveTabsState: (tabs: Tab[], activeTabId: string | null) => void;
}


let activeCustomUrlCallback: ((url: string) => void) | null = null;
let queuedUrlFromMain: string | null = null;

ipcRenderer.on(
  IPC_CHANNELS.HANDLE_CUSTOM_URL,
  (_event: IpcRendererEvent, url: string) => {
    if (activeCustomUrlCallback) {
      activeCustomUrlCallback(url);
      queuedUrlFromMain = null;
    } else {
      queuedUrlFromMain = url;
    }
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
    activeCustomUrlCallback = callback;
    if (queuedUrlFromMain) {
      activeCustomUrlCallback(queuedUrlFromMain);
      queuedUrlFromMain = null;
    }
    return () => {
      activeCustomUrlCallback = null;
    };
  },
  rendererReadyForUrl: () => {
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
  onTriggerFileExport: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.TRIGGER_FILE_EXPORT, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRIGGER_FILE_EXPORT, listener);
  },
  onTriggerFileImport: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.TRIGGER_FILE_IMPORT, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRIGGER_FILE_IMPORT, listener);
  },
  onShowSettingsPage: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.TRIGGER_SHOW_SETTINGS, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.TRIGGER_SHOW_SETTINGS, listener);
  },
  onCloseCurrentTab: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.CLOSE_CURRENT_TAB, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.CLOSE_CURRENT_TAB, listener);
  },
  onNavigateNextTab: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.NAVIGATE_NEXT_TAB, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATE_NEXT_TAB, listener);
  },
  onNavigatePreviousTab: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.NAVIGATE_PREVIOUS_TAB, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.NAVIGATE_PREVIOUS_TAB, listener);
  },
  onRequestTabsForSaving: (callback) => {
    const listener = () => callback();
    ipcRenderer.on(IPC_CHANNELS.REQUEST_TABS_FOR_SAVING, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.REQUEST_TABS_FOR_SAVING, listener);
  },
  saveTabsState: (tabs, activeTabId) => {
    ipcRenderer.send(IPC_CHANNELS.SAVE_TABS_STATE, tabs, activeTabId);
  }
};

contextBridge.exposeInMainWorld("electronAPI", exposedAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
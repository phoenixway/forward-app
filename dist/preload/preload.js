/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/preload/preload.ts":
/*!********************************!*\
  !*** ./src/preload/preload.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.IPC_CHANNELS = void 0;\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\n// Канали, які використовуються для IPC\nexports.IPC_CHANNELS = {\n    GET_APP_VERSION: \"get-app-version\",\n    GET_APP_SETTINGS: \"get-app-settings\",\n    SET_APP_SETTING: \"set-app-setting\",\n    OPEN_EXTERNAL_LINK: \"open-external-link\",\n    HANDLE_CUSTOM_URL: \"handle-custom-url\",\n    SHOW_SAVE_DIALOG: \"show-save-dialog\",\n    SHOW_OPEN_DIALOG: \"show-open-dialog\",\n    WRITE_FILE: \"write-file\",\n    READ_FILE: \"read-file\",\n    TEST_IPC_MESSAGE: \"test-ipc-message\",\n    RENDERER_READY_FOR_URL: \"renderer-ready-for-url\",\n    RENDERER_ERROR: \"renderer-error\",\n    APP_IS_APPIMAGE_ON_LINUX: \"app:isAppImageOnLinux\",\n    APP_HAS_USER_DESKTOP_FILE: \"app:hasUserDesktopFile\",\n    APP_CREATE_USER_DESKTOP_FILE: \"app:createUserDesktopFile\",\n    // --- SYNC CHANNELS ---\n    WIFI_SYNC_START_SERVER: \"wifi-sync:start-server\",\n    WIFI_SYNC_STOP_SERVER: \"wifi-sync:stop-server\",\n    WIFI_SYNC_FETCH_FROM_DEVICE: \"wifi-sync:fetch-from-device\",\n    WIFI_SYNC_APPLY_TO_DEVICE: \"wifi-sync:apply-to-device\",\n    SHOW_WIFI_IMPORT_DIALOG: \"show-wifi-import-dialog\",\n    SHOW_WIFI_SERVER_STATUS: \"show-wifi-server-status\",\n    // --- MENU TRIGGER CHANNELS ---\n    TRIGGER_FILE_EXPORT: \"trigger-file-export\",\n    TRIGGER_FILE_IMPORT: \"trigger-file-import\",\n    TRIGGER_SHOW_SETTINGS: \"trigger-show-settings\",\n    CLOSE_CURRENT_TAB: \"close-current-tab\",\n    NAVIGATE_NEXT_TAB: 'navigate-next-tab',\n    NAVIGATE_PREVIOUS_TAB: 'navigate-previous-tab',\n};\nlet activeCustomUrlCallback = null;\nlet queuedUrlFromMain = null;\nelectron_1.ipcRenderer.on(exports.IPC_CHANNELS.HANDLE_CUSTOM_URL, (_event, url) => {\n    console.log(`[Preload] Listener for \"${exports.IPC_CHANNELS.HANDLE_CUSTOM_URL}\" received URL: \"${url}\"`);\n    if (activeCustomUrlCallback) {\n        console.log(\"[Preload] Active callback exists, calling it with URL.\");\n        activeCustomUrlCallback(url);\n        queuedUrlFromMain = null;\n    }\n    else {\n        console.log(\"[Preload] No active callback, queuing URL.\");\n        queuedUrlFromMain = url;\n    }\n});\nelectron_1.ipcRenderer.on(exports.IPC_CHANNELS.TEST_IPC_MESSAGE, (_event, message) => {\n    console.log(`[Preload] Listener for \"${exports.IPC_CHANNELS.TEST_IPC_MESSAGE}\" received: \"${message}\"`);\n});\nconst exposedAPI = {\n    getAppVersion: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.GET_APP_VERSION),\n    getAppSettings: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.GET_APP_SETTINGS),\n    setAppSetting: (key, value) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.SET_APP_SETTING, key, value),\n    getZoomFactor: () => electron_1.webFrame.getZoomFactor(),\n    setZoomFactor: (factor) => electron_1.webFrame.setZoomFactor(factor),\n    openExternal: (url) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.OPEN_EXTERNAL_LINK, url),\n    reportRendererError: (error) => electron_1.ipcRenderer.send(exports.IPC_CHANNELS.RENDERER_ERROR, error),\n    onCustomUrl: (callback) => {\n        console.log(\"[Preload] onCustomUrl: Registering callback.\");\n        activeCustomUrlCallback = callback;\n        if (queuedUrlFromMain) {\n            console.log(\"[Preload] onCustomUrl: Processing queued URL:\", queuedUrlFromMain);\n            activeCustomUrlCallback(queuedUrlFromMain);\n            queuedUrlFromMain = null;\n        }\n        return () => {\n            console.log(\"[Preload] onCustomUrl: Unregistering callback.\");\n            activeCustomUrlCallback = null;\n        };\n    },\n    rendererReadyForUrl: () => {\n        console.log(`[Preload] Sending \"${exports.IPC_CHANNELS.RENDERER_READY_FOR_URL}\" to main.`);\n        electron_1.ipcRenderer.send(exports.IPC_CHANNELS.RENDERER_READY_FOR_URL);\n    },\n    showSaveDialog: (options) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.SHOW_SAVE_DIALOG, options),\n    showOpenDialog: (options) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.SHOW_OPEN_DIALOG, options),\n    writeFile: (filePath, content) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.WRITE_FILE, filePath, content),\n    readFile: (filePath) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.READ_FILE, filePath),\n    isAppImageOnLinux: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.APP_IS_APPIMAGE_ON_LINUX),\n    hasUserDesktopFile: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.APP_HAS_USER_DESKTOP_FILE),\n    createUserDesktopFile: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.APP_CREATE_USER_DESKTOP_FILE),\n    // --- WI-FI SYNC IMPLEMENTATIONS ---\n    startWifiServer: (dataForExport) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.WIFI_SYNC_START_SERVER, dataForExport),\n    stopWifiServer: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.WIFI_SYNC_STOP_SERVER),\n    fetchFromDevice: (deviceAddress) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.WIFI_SYNC_FETCH_FROM_DEVICE, deviceAddress),\n    applyToDevice: (options) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.WIFI_SYNC_APPLY_TO_DEVICE, options),\n    // --- MENU TRIGGER LISTENERS IMPLEMENTATIONS ---\n    onShowWifiImportDialog: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.SHOW_WIFI_IMPORT_DIALOG, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.SHOW_WIFI_IMPORT_DIALOG, listener);\n    },\n    onShowWifiServerStatus: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.SHOW_WIFI_SERVER_STATUS, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.SHOW_WIFI_SERVER_STATUS, listener);\n    },\n    onTriggerFileExport: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.TRIGGER_FILE_EXPORT, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.TRIGGER_FILE_EXPORT, listener);\n    },\n    onTriggerFileImport: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.TRIGGER_FILE_IMPORT, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.TRIGGER_FILE_IMPORT, listener);\n    },\n    onShowSettingsPage: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.TRIGGER_SHOW_SETTINGS, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.TRIGGER_SHOW_SETTINGS, listener);\n    },\n    onCloseCurrentTab: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.CLOSE_CURRENT_TAB, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.CLOSE_CURRENT_TAB, listener);\n    },\n    onNavigateNextTab: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.NAVIGATE_NEXT_TAB, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.NAVIGATE_NEXT_TAB, listener);\n    },\n    onNavigatePreviousTab: (callback) => {\n        const listener = () => callback();\n        electron_1.ipcRenderer.on(exports.IPC_CHANNELS.NAVIGATE_PREVIOUS_TAB, listener);\n        return () => electron_1.ipcRenderer.removeListener(exports.IPC_CHANNELS.NAVIGATE_PREVIOUS_TAB, listener);\n    },\n};\nelectron_1.contextBridge.exposeInMainWorld(\"electronAPI\", exposedAPI);\n\n\n//# sourceURL=webpack://forwardapp/./src/preload/preload.ts?");

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/preload/preload.ts");
/******/ 	
/******/ })()
;
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

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nexports.IPC_CHANNELS = void 0;\n// src/preload/preload.ts\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\n// Канали, які використовуються для IPC\nexports.IPC_CHANNELS = {\n    GET_APP_VERSION: \"get-app-version\",\n    GET_APP_SETTINGS: \"get-app-settings\",\n    SET_APP_SETTING: \"set-app-setting\",\n    OPEN_EXTERNAL_LINK: \"open-external-link\",\n    HANDLE_CUSTOM_URL: \"handle-custom-url\", // Канал для отримання URL від main\n    SHOW_SAVE_DIALOG: \"show-save-dialog\",\n    SHOW_OPEN_DIALOG: \"show-open-dialog\",\n    WRITE_FILE: \"write-file\",\n    READ_FILE: \"read-file\",\n    TEST_IPC_MESSAGE: \"test-ipc-message\", // Тестовий канал\n    RENDERER_READY_FOR_URL: \"renderer-ready-for-url\", // Канал для сигналу готовності рендерера\n    // Нові канали для інтеграції з робочим столом\n    APP_IS_APPIMAGE_ON_LINUX: \"app:isAppImageOnLinux\",\n    APP_HAS_USER_DESKTOP_FILE: \"app:hasUserDesktopFile\",\n    APP_CREATE_USER_DESKTOP_FILE: \"app:createUserDesktopFile\",\n};\n// --- Логіка для обробки URL ---\nlet activeCustomUrlCallback = null;\nlet queuedUrlFromMain = null;\n// Слухач для отримання URL від головного процесу\nelectron_1.ipcRenderer.on(exports.IPC_CHANNELS.HANDLE_CUSTOM_URL, (_event, url) => {\n    console.log(`[Preload] Listener for \"${exports.IPC_CHANNELS.HANDLE_CUSTOM_URL}\" received URL: \"${url}\"`);\n    if (activeCustomUrlCallback) {\n        console.log(\"[Preload] Active callback exists, calling it with URL.\");\n        activeCustomUrlCallback(url);\n        queuedUrlFromMain = null;\n    }\n    else {\n        console.log(\"[Preload] No active callback, queuing URL.\");\n        queuedUrlFromMain = url;\n    }\n});\n// --- Кінець логіки для обробки URL ---\n// --- Тестовий слухач ---\nelectron_1.ipcRenderer.on(exports.IPC_CHANNELS.TEST_IPC_MESSAGE, (_event, message) => {\n    console.log(`[Preload] Listener for \"${exports.IPC_CHANNELS.TEST_IPC_MESSAGE}\" received: \"${message}\"`);\n});\n// --- Кінець тестового слухача ---\n// Об'єкт API, що експортується\nconst exposedAPI = {\n    getAppVersion: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.GET_APP_VERSION),\n    getAppSettings: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.GET_APP_SETTINGS),\n    setAppSetting: (key, value) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.SET_APP_SETTING, key, value),\n    getZoomFactor: () => electron_1.webFrame.getZoomFactor(),\n    setZoomFactor: (factor) => electron_1.webFrame.setZoomFactor(factor),\n    openExternal: (url) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.OPEN_EXTERNAL_LINK, url),\n    onCustomUrl: (callback) => {\n        console.log(\"[Preload] onCustomUrl: Registering callback.\");\n        activeCustomUrlCallback = callback;\n        if (queuedUrlFromMain) {\n            console.log(\"[Preload] onCustomUrl: Processing queued URL:\", queuedUrlFromMain);\n            activeCustomUrlCallback(queuedUrlFromMain);\n            queuedUrlFromMain = null;\n        }\n        return () => {\n            console.log(\"[Preload] onCustomUrl: Unregistering callback.\");\n            activeCustomUrlCallback = null;\n        };\n    },\n    rendererReadyForUrl: () => {\n        console.log(`[Preload] Sending \"${exports.IPC_CHANNELS.RENDERER_READY_FOR_URL}\" to main.`);\n        electron_1.ipcRenderer.send(exports.IPC_CHANNELS.RENDERER_READY_FOR_URL);\n    },\n    showSaveDialog: (options) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.SHOW_SAVE_DIALOG, options),\n    showOpenDialog: (options) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.SHOW_OPEN_DIALOG, options),\n    writeFile: (filePath, content) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.WRITE_FILE, filePath, content),\n    readFile: (filePath) => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.READ_FILE, filePath),\n    // Нові функції\n    isAppImageOnLinux: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.APP_IS_APPIMAGE_ON_LINUX),\n    hasUserDesktopFile: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.APP_HAS_USER_DESKTOP_FILE),\n    createUserDesktopFile: () => electron_1.ipcRenderer.invoke(exports.IPC_CHANNELS.APP_CREATE_USER_DESKTOP_FILE),\n};\nelectron_1.contextBridge.exposeInMainWorld(\"electronAPI\", exposedAPI);\n\n\n//# sourceURL=webpack://forwardapp/./src/preload/preload.ts?");

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
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

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\n// src/preload/preload.ts\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nconst IPC_CHANNELS = {\n    GET_APP_VERSION: \"get-app-version\",\n    GET_APP_SETTINGS: \"get-app-settings\",\n    SET_APP_SETTING: \"set-app-setting\",\n    OPEN_EXTERNAL_LINK: \"open-external-link\",\n    HANDLE_CUSTOM_URL: \"handle-custom-url\",\n    SHOW_SAVE_DIALOG: \"show-save-dialog\",\n    SHOW_OPEN_DIALOG: \"show-open-dialog\",\n    WRITE_FILE: \"write-file\",\n    READ_FILE: \"read-file\",\n    TEST_IPC_MESSAGE: \"test-ipc-message\", // Тестовий канал\n    RENDERER_READY_FOR_URL: \"renderer-ready-for-url\", // Канал для сигналу готовності рендерера\n};\n// --- Глобальні змінні в preload ---\nlet activeCustomUrlCallback = null;\nlet queuedUrlFromMain = null; // Черга для URL, якщо він прийшов раніше колбека\n// --- Слухач для тестового IPC повідомлення ---\n// Цей слухач реєструється одразу при завантаженні preload скрипта\nelectron_1.ipcRenderer.on(IPC_CHANNELS.TEST_IPC_MESSAGE, (_event, message) => {\n    console.log(`[Preload] Received on TEST_IPC_MESSAGE: \"${message}\"`);\n});\nconsole.log(`[Preload] Registered global listener for ${IPC_CHANNELS.TEST_IPC_MESSAGE}`);\n// --- Кінець тестового слухача ---\n// --- ПРЯМИЙ СЛУХАЧ ДЛЯ HANDLE_CUSTOM_URL (для тесту) ---\nelectron_1.ipcRenderer.on(IPC_CHANNELS.HANDLE_CUSTOM_URL, (_event, url) => {\n    console.log(`[Preload] DIRECT LISTENER received on HANDLE_CUSTOM_URL: \"${url}\"`);\n    if (activeCustomUrlCallback) {\n        console.log(\"[Preload] Callback is active. Calling active custom URL callback immediately.\");\n        activeCustomUrlCallback(url); // Передаємо \"чистий\" URL\n        queuedUrlFromMain = null; // Очищаємо чергу, якщо URL був оброблений\n    }\n    else {\n        console.log(\"[Preload] Callback is NOT active. Queuing URL:\", url);\n        queuedUrlFromMain = url; // Зберігаємо URL в чергу\n    }\n});\nconsole.log(`[Preload] Registered DIRECT global listener for ${IPC_CHANNELS.HANDLE_CUSTOM_URL}`);\n// --- Кінець прямого слухача ---\nelectron_1.contextBridge.exposeInMainWorld(\"electronAPI\", {\n    getAppVersion: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),\n    getAppSettings: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.GET_APP_SETTINGS),\n    setAppSetting: (key, value) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SET_APP_SETTING, key, value),\n    getZoomFactor: () => electron_1.webFrame.getZoomFactor(),\n    setZoomFactor: (factor) => electron_1.webFrame.setZoomFactor(factor),\n    openExternal: (url) => {\n        return electron_1.ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL_LINK, url);\n    },\n    onCustomUrl: (callback) => {\n        console.log(\"[Preload] electronAPI.onCustomUrl called by renderer. Setting active callback.\");\n        activeCustomUrlCallback = callback;\n        // Якщо в черзі є URL, який прийшов раніше, обробляємо його зараз\n        if (queuedUrlFromMain) {\n            console.log(\"[Preload] Found queued URL. Calling active custom URL callback with queued URL:\", queuedUrlFromMain);\n            activeCustomUrlCallback(queuedUrlFromMain);\n            queuedUrlFromMain = null; // Очищаємо чергу\n        }\n        // Функція відписки просто очищає колбек\n        return () => {\n            console.log(\"[Preload] Renderer wants to unsubscribe (from onCustomUrl). Clearing active custom URL callback.\");\n            activeCustomUrlCallback = null;\n            // Не потрібно видаляти глобальний слухач ipcRenderer.on\n        };\n    },\n    showSaveDialog: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SHOW_SAVE_DIALOG, options),\n    showOpenDialog: (options) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options),\n    writeFile: (filePath, content) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.WRITE_FILE, filePath, content),\n    readFile: (filePath) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.READ_FILE, filePath),\n    // Метод для сигналу готовності рендерера (якщо ви реалізуєте \"Спробу 2\")\n    rendererReadyForUrl: () => {\n        console.log(`[Preload] Sending IPC message on channel ${IPC_CHANNELS.RENDERER_READY_FOR_URL}`);\n        electron_1.ipcRenderer.send(IPC_CHANNELS.RENDERER_READY_FOR_URL);\n    },\n});\n\n\n//# sourceURL=webpack://forward-app/./src/preload/preload.ts?");

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
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/preload/preload.ts");
/******/ 	
/******/ })()
;
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

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\");\nconst IPC_CHANNELS_PRELOAD = {\n    GET_APP_VERSION: \"get-app-version\",\n    GET_APP_SETTINGS: \"get-app-settings\",\n    SET_APP_SETTING: \"set-app-setting\",\n    OPEN_EXTERNAL_LINK: \"open-external-link\", // <--- НОВИЙ КАНАЛ\n};\nelectron_1.contextBridge.exposeInMainWorld(\"electronAPI\", {\n    // --- Version ---\n    getAppVersion: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.GET_APP_VERSION),\n    // --- Settings ---\n    getAppSettings: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.GET_APP_SETTINGS),\n    setAppSetting: (key, value) => electron_1.ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.SET_APP_SETTING, key, value),\n    // --- Zoom ---\n    getZoomFactor: () => electron_1.webFrame.getZoomFactor(),\n    setZoomFactor: (factor) => electron_1.webFrame.setZoomFactor(factor),\n    // --- External Links ---\n    // Додаємо нову функцію\n    openExternal: (url) => {\n        return electron_1.ipcRenderer.invoke(IPC_CHANNELS_PRELOAD.OPEN_EXTERNAL_LINK, url);\n    },\n});\n\n\n//# sourceURL=webpack://forward-app/./src/preload/preload.ts?");

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
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

eval("\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nconst electron_1 = __webpack_require__(/*! electron */ \"electron\"); // Додано webFrame\n// Канали IPC, які ми будемо використовувати\nconst IPC_CHANNELS = {\n    GET_APP_VERSION: \"get-app-version\",\n    GET_APP_SETTINGS: \"get-app-settings\",\n    SET_APP_SETTING: \"set-app-setting\",\n    // GET_ZOOM_FACTOR: \"get-zoom-factor\", // webFrame.getZoomFactor() працює синхронно\n    // SET_ZOOM_FACTOR: \"set-zoom-factor\", // webFrame.setZoomFactor() працює синхронно\n};\nelectron_1.contextBridge.exposeInMainWorld(\"electronAPI\", {\n    // --- Version ---\n    getAppVersion: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.GET_APP_VERSION),\n    // --- Settings ---\n    getAppSettings: () => electron_1.ipcRenderer.invoke(IPC_CHANNELS.GET_APP_SETTINGS),\n    setAppSetting: (key, value) => electron_1.ipcRenderer.invoke(IPC_CHANNELS.SET_APP_SETTING, key, value),\n    // --- Zoom ---\n    // Для масштабування краще використовувати webFrame напряму,\n    // оскільки це синхронні операції і не потребують IPC до main процесу,\n    // якщо тільки main процес не має виконувати додаткову логіку при зміні масштабу.\n    // Якщо ж логіка масштабування має бути в main, тоді потрібні IPC хендлери.\n    // Наразі припускаємо, що достатньо webFrame.\n    getZoomFactor: () => electron_1.webFrame.getZoomFactor(),\n    setZoomFactor: (factor) => electron_1.webFrame.setZoomFactor(factor),\n});\n\n\n//# sourceURL=webpack://forward-app/./src/preload/preload.ts?");

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
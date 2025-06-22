// +++ ДОДАЙТЕ ЦЕЙ БЛОК НА ПОЧАТКУ ФАЙЛУ +++
window.onerror = function (message, source, lineno, colno, error) {
  const errorData = {
    message: typeof message === "string" ? message : JSON.stringify(message),
    stack: error?.stack || "No stack available",
  };
  console.error("ПОМИЛКА RENDERER (onerror):", errorData);
  window.electronAPI?.reportRendererError(errorData);
  return true; // запобігає показу помилки в консолі браузера за замовчуванням
};

window.addEventListener("unhandledrejection", (event) => {
  const errorData = {
    message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
    stack: event.reason?.stack || "No stack available for promise rejection",
  };
  console.error("ПОМИЛКА RENDERER (unhandledrejection):", errorData);
  window.electronAPI?.reportRendererError(errorData);
});
// +++ КІНЕЦЬ БЛОКУ +++

import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store"; // Імпортуємо store та persistor
import App from "./App";
import "./styles.css";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <App />
          </PersistGate>
        </Provider>
      </React.StrictMode>,
    );
  } else {
    console.error("Root element not found.");
  }
});

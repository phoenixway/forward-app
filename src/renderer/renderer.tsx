// src/renderer/renderer.tsx

// Ваші обробники помилок залишаються на місці
window.onerror = function (message, source, lineno, colno, error) {
  const errorData = {
    message: typeof message === "string" ? message : JSON.stringify(message),
    stack: error?.stack || "No stack available",
  };
  console.error("ПОМИЛКА RENDERER (onerror):", errorData);
  window.electronAPI?.reportRendererError(errorData);
  return true;
};
window.addEventListener("unhandledrejection", (event) => {
  const errorData = {
    message: `Unhandled Promise Rejection: ${event.reason?.message || event.reason}`,
    stack: event.reason?.stack || "No stack available for promise rejection",
  };
  console.error("ПОМИЛКА RENDERER (unhandledrejection):", errorData);
  window.electronAPI?.reportRendererError(errorData);
});

// Імпорти
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./store/store";
import App from "./App";
import "./styles.css";

// --- КОД DEVTOOLS ПЕРЕНЕСЕНО СЮДИ ---
document.addEventListener("DOMContentLoaded", () => {
  // Ми запускаємо підключення ПІСЛЯ того, як DOM готовий, але ПЕРЕД рендерингом React
  if (process.env.NODE_ENV === 'development') {
    try {
      console.log("[DevTools] Спроба підключення...");
      const devTools = require('react-devtools-core');
      devTools.connectToDevTools({
        host: 'localhost',
        port: 8097,
      });
      console.log("[DevTools] Скрипт підключення виконано успішно.");
    } catch (e) {
      console.error("[DevTools] НЕ ВДАЛОСЯ виконати скрипт підключення:", e);
    }
  }

  // Основний код рендерингу додатку
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
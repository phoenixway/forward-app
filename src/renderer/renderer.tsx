//src/renderer/renderer.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { Provider } from "react-redux";
import store from "./store";

console.log("[Renderer] Store object:", store); // <--- ДОДАЙ ЦЕЙ РЯДОК
console.log("[Renderer] Store dispatch function type:", typeof store.dispatch); // <--- І ЦЕЙ
console.log("[Renderer] Store getState function type:", typeof store.getState); // <--- І ЦЕЙ

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <Provider store={store}>
          <App />
        </Provider>
      </React.StrictMode>,
    );
  } else {
    console.error(
      "Root element not found. Make sure you have a <div id='root'></div> in your HTML.",
    );
  }
});

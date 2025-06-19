//src/renderer/renderer.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(
      // <React.StrictMode> // Тимчасово закоментуйте або видаліть
      <App />,
      // </React.StrictMode> // Тимчасово закоментуйте або видаліть
    );
  } else {
    console.error(
      "Root element not found. Make sure you have a <div id='root'></div> in your HTML.",
    );
  }
});

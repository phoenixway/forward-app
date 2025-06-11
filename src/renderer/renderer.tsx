//src/renderer/renderer.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css'; // <--- ДОДАЙ ЦЕЙ ІМПОРТ (адаптуй шлях!)
// Імпорт стилів перенесено в App.tsx або може бути тут, якщо це глобальні стилі для всього
// import './styles.css'; 

// Переконуємося, що DOM завантажено перед тим, як рендерити
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.error("Root element not found. Make sure you have a <div id='root'></div> in your HTML.");
  }
});
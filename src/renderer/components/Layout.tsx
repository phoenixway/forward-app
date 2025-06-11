// src/renderer/components/Layout.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';

const MIN_SIDEBAR_WIDTH = 150;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 250;

interface LayoutProps {
  sidebar: React.ReactNode;
  mainPanel: React.ReactNode;
}

function Layout({ sidebar, mainPanel }: LayoutProps) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const savedWidth = localStorage.getItem('sidebarWidth');
    return savedWidth ? parseInt(savedWidth, 10) : DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  
  const resizeStartXRef = useRef(0);
  const initialSidebarWidthRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = mouseDownEvent.clientX;
    initialSidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const doResize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const deltaX = mouseMoveEvent.clientX - resizeStartXRef.current;
      let newWidth = initialSidebarWidthRef.current + deltaX;

      if (newWidth < MIN_SIDEBAR_WIDTH) {
        newWidth = MIN_SIDEBAR_WIDTH;
      } else if (newWidth > MAX_SIDEBAR_WIDTH) {
        newWidth = MAX_SIDEBAR_WIDTH;
      }
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResizing);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResizing);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, doResize, stopResizing]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-black"> {/* або dark:bg-slate-950 якщо це ваш глобальний фон */}
      <aside
        className="h-full flex-shrink-0 bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-y-auto"
        style={{ width: `${sidebarWidth}px` }}
      >
        {sidebar}
      </aside>

      <div
        className="w-1.5 h-full cursor-col-resize bg-slate-300 dark:bg-slate-700 hover:bg-blue-500 dark:hover:bg-blue-600 transition-colors duration-150 ease-in-out flex-shrink-0"
        onMouseDown={startResizing}
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={sidebarWidth}
        aria-valuemin={MIN_SIDEBAR_WIDTH}
        aria-valuemax={MAX_SIDEBAR_WIDTH}
        tabIndex={0}
      />

      {/* Контейнер для MainPanel */}
      {/* Цей фон має бути найтемнішим базовим фоном для області MainPanel */}
      <main className="h-full flex-grow bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden"> 
        {/* bg-slate-50 для світлого режиму, dark:bg-slate-950 для темного */}
        {/* Якщо ваш MainPanel.tsx сам встановлює фон для свого кореневого div, 
            то цей фон може бути необов'язковим, але краще мати його для узгодженості.
        */}
        {mainPanel}
      </main>
    </div>
  );
}

export default Layout;
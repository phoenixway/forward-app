import React, { useState, useEffect, useCallback } from 'react';
import './styles.css'; // Глобальні стилі або стилі для App
import Layout from './components/Layout';
import Sidebar from './components/Sidebar';
import MainPanel from './components/MainPanel';

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const OBSIDIAN_VAULT_SETTING_KEY = 'obsidianVaultPath';

// Видаляємо це оголошення, оскільки типи тепер надходять з preload.ts
// declare global {
//   interface Window {
//     electronAPI?: {
//       getAppVersion: () => Promise<string>;
//       getAppSettings: () => Promise<Record<string, any> | null>;
//       setAppSetting: (key: string, value: any) => Promise<{ success: boolean; message?: string } | void>;
//       getZoomFactor: () => Promise<number>; // Змінено на синхронний виклик, тому Promise не потрібен
//       setZoomFactor: (factor: number) => Promise<void>; // Змінено на синхронний виклик
//     };
//   }
// }

const App: React.FC = () => {
  // --- Логіка теми ---
  const [userPreference, setUserPreference] = useState<string>(() => {
    return localStorage.getItem('themePreference') || 'system';
  });

  const applyTheme = useCallback((themeToApply: string) => {
    document.documentElement.classList.remove('light', 'dark');
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('themePreference', userPreference);
    if (userPreference === 'system') {
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(systemPrefersDark ? 'dark' : 'light');
    } else {
      applyTheme(userPreference);
    }
  }, [userPreference, applyTheme]);

  useEffect(() => {
    if (userPreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [userPreference, applyTheme]);

  const handleThemePreferenceChange = useCallback((newPreference: string) => {
    setUserPreference(newPreference);
  }, []);

  // --- Логіка Obsidian Vault Path ---
  const [obsidianVaultPath, setObsidianVaultPath] = useState<string>('');

  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI && typeof window.electronAPI.getAppSettings === 'function') {
        try {
          const settings = await window.electronAPI.getAppSettings();
          if (settings && typeof settings[OBSIDIAN_VAULT_SETTING_KEY] === 'string') {
            setObsidianVaultPath(settings[OBSIDIAN_VAULT_SETTING_KEY]);
          }
        } catch (error) {
          console.warn('Failed to load app settings:', error);
        }
      } else {
        console.warn('electronAPI.getAppSettings is not available.');
      }
    };
    loadSettings();
  }, []);

  const handleObsidianVaultChange = useCallback(async (newPath: string) => {
    if (window.electronAPI && typeof window.electronAPI.setAppSetting === 'function') {
      try {
        const result = await window.electronAPI.setAppSetting(OBSIDIAN_VAULT_SETTING_KEY, newPath);
        if (typeof result === 'object' && result !== null && 'success' in result) {
            if (result.success) {
                setObsidianVaultPath(newPath);
            } else {
                console.error('Failed to save Obsidian Vault path: Main process reported failure.', result.message);
                alert(`Не вдалося зберегти шлях: ${result.message || 'Помилка на боці головного процесу.'}`);
            }
        } else {
            setObsidianVaultPath(newPath);
        }
      } catch (error: any) {
        console.error('Failed to save Obsidian Vault path:', error);
        const errorMessage = error?.message || 'Невідома помилка збереження.';
        alert(`Не вдалося зберегти шлях до Obsidian Vault: ${errorMessage}`);
      }
    } else {
      alert("API для збереження налаштувань недоступне.");
      console.warn('electronAPI.setAppSetting is not available.');
    }
  }, []);

  // --- Логіка масштабування ---
  const handleKeyDownForZoom = useCallback((event: KeyboardEvent) => { // Тепер це не async, бо webFrame синхронний
    if (!window.electronAPI || typeof window.electronAPI.getZoomFactor !== 'function' || typeof window.electronAPI.setZoomFactor !== 'function') {
      console.warn('Zoom API functions are not available.');
      return;
    }

    const target = event.target as HTMLElement;
    const isInputElementFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (isInputElementFocused && !((event.ctrlKey || event.metaKey) && event.key === '0')) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      // Оскільки webFrame.getZoomFactor() синхронний, нам не потрібен try-catch тут,
      // якщо тільки не очікуємо, що window.electronAPI може бути не визначено (що перевіряється вище)
      const currentFactor = window.electronAPI.getZoomFactor();
      let newFactor: number | undefined;

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        newFactor = Math.min(MAX_ZOOM, currentFactor + ZOOM_STEP);
      } else if (event.key === '-') {
        event.preventDefault();
        newFactor = Math.max(MIN_ZOOM, currentFactor - ZOOM_STEP);
      } else if (event.key === '0') {
        event.preventDefault();
        newFactor = 1.0;
      }

      if (newFactor !== undefined && Math.abs(newFactor - currentFactor) > 0.001) {
        // webFrame.setZoomFactor() також синхронний
        window.electronAPI.setZoomFactor(newFactor);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDownForZoom);
    return () => {
      window.removeEventListener('keydown', handleKeyDownForZoom);
    };
  }, [handleKeyDownForZoom]);

  // --- Логіка отримання версії (для MainPanel) ---
  const fetchAppVersionForPanel = useCallback(async (): Promise<string | null> => {
    if (window.electronAPI && typeof window.electronAPI.getAppVersion === 'function') {
      try {
        // getAppVersion залишається асинхронним, бо це IPC виклик
        return await window.electronAPI.getAppVersion();
      } catch (err) {
        console.error("Помилка отримання версії з App.tsx:", err);
        return null;
      }
    } else {
      console.warn('window.electronAPI.getAppVersion is not available.');
      return null;
    }
  }, []);


  return (
    <>
      <Layout
        sidebar={<Sidebar />}
        mainPanel={
          <MainPanel
            currentThemePreference={userPreference}
            onChangeThemePreference={handleThemePreferenceChange}
            obsidianVaultPath={obsidianVaultPath}
            onObsidianVaultChange={handleObsidianVaultChange}
          />
        }
      />
    </>
    
  );
};

export default App;
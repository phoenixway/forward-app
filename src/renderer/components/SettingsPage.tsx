// src/renderer/components/SettingsPage.tsx
import React, { useState, useEffect, useCallback } from 'react';

interface SettingsPageProps {
  currentTheme: string;
  onChangeTheme: (newTheme: string) => void;
  // Додаємо пропси для Obsidian Vault
  initialObsidianVault: string;
  onObsidianVaultChange: (newPath: string) => void;
}

function SettingsPage({
  currentTheme,
  onChangeTheme,
  initialObsidianVault,
  onObsidianVaultChange,
}: SettingsPageProps) {
  const [obsidianVaultPath, setObsidianVaultPath] = useState(initialObsidianVault);

  // Синхронізуємо локальний стан, якщо initialObsidianVault зміниться ззовні
  useEffect(() => {
    setObsidianVaultPath(initialObsidianVault);
  }, [initialObsidianVault]);

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeTheme(event.target.value);
  };

  const handleVaultPathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setObsidianVaultPath(event.target.value);
  };

// SettingsPage.tsx
  const handleSaveVaultPath = useCallback(() => {
    onObsidianVaultChange(obsidianVaultPath.trim());
    // alert("Шлях до Obsidian Vault збережено!"); // Цей alert тепер показується в App.tsx
  }, [obsidianVaultPath, onObsidianVaultChange]);

  return (
    <div className="p-6 min-h-full text-slate-800 dark:text-slate-200">
      <h1 className="text-2xl font-semibold mb-8 text-slate-900 dark:text-slate-100">Налаштування Додатка</h1>
      
      <div className="space-y-10 max-w-3xl mx-auto">
        <section>
          <h2 className="text-xl font-medium mb-4 text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-300 dark:border-slate-700">Загальні</h2>
          <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="theme" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Тема оформлення
                </label>
                <select
                  id="theme"
                  name="theme"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200
                             focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 
                             focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md"
                  value={currentTheme}
                  onChange={handleThemeChange}
                >
                  <option value="light">Світла</option>
                  <option value="dark">Темна</option>
                  <option value="system">Як у системі</option>
                </select>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Виберіть бажану тему. "Як у системі" автоматично адаптується до налаштувань вашої ОС.
                </p>
              </div>

              <div>
                <label htmlFor="obsidian-vault" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Назва Obsidian Vault (для URL)
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    name="obsidian-vault"
                    id="obsidian-vault"
                    className="focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 flex-1 block w-full rounded-none rounded-l-md sm:text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2"
                    placeholder="MyVaultName"
                    value={obsidianVaultPath}
                    onChange={handleVaultPathChange}
                  />
                  <button
                    type="button"
                    onClick={handleSaveVaultPath}
                    className="inline-flex items-center px-3 py-2 border border-l-0 border-slate-300 dark:border-slate-600 rounded-r-md bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    Зберегти
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Вкажіть точну назву вашого Obsidian Vault, як вона використовується в obsidian:// URL (чутлива до регістру). Наприклад, якщо ваше сховище називається "My Notes", введіть "My Notes".
                </p>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Мова інтерфейсу
                </label>
                <select
                  id="language"
                  name="language"
                  disabled
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 
                             bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200
                             focus:outline-none focus:ring-indigo-500 dark:focus:ring-indigo-400 
                             focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm rounded-md
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  defaultValue="uk"
                >
                  <option value="uk">Українська</option>
                  <option value="en">English (недоступно)</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4 text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-300 dark:border-slate-700">Сповіщення</h2>
          <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="enable-notifications"
                  name="enable-notifications"
                  type="checkbox"
                  disabled
                  className="h-4 w-4 text-indigo-600 dark:text-indigo-500 border-slate-300 dark:border-slate-500 rounded 
                             focus:ring-indigo-500 dark:focus:ring-indigo-400
                             bg-white dark:bg-slate-600 checked:bg-indigo-600 dark:checked:bg-indigo-500
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  defaultChecked
                />
                <label htmlFor="enable-notifications" className="ml-3 block text-sm text-slate-900 dark:text-slate-200 disabled:opacity-50">
                  Увімкнути сповіщення (недоступно)
                </label>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;
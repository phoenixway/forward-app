// src/renderer/components/SettingsPage.tsx
import React from 'react';

interface SettingsPageProps {
  currentTheme: string;
  onChangeTheme: (newTheme: string) => void;
  initialObsidianVault: string;
  onObsidianVaultChange: (newPath: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  currentTheme,
  onChangeTheme,
  initialObsidianVault,
  onObsidianVaultChange,
}) => {

  return (
    <div className="p-6 min-h-full text-slate-800 dark:text-slate-200">
      <h1 className="text-2xl font-semibold mb-8 text-slate-900 dark:text-slate-100">
        Налаштування
      </h1>
      <div className="space-y-10 max-w-3xl mx-auto">
        <section>
          <h2 className="text-xl font-medium mb-4">Вигляд</h2>
          <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="theme-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Тема оформлення
                </label>
                <select
                  id="theme-select"
                  value={currentTheme}
                  onChange={(e) => onChangeTheme(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="system">Системна</option>
                  <option value="light">Світла</option>
                  <option value="dark">Темна</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4">Інтеграції</h2>
          <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div className="space-y-4">
               <div>
                <label htmlFor="obsidian-path" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Шлях до сховища Obsidian
                </label>
                <input
                    type="text"
                    id="obsidian-path"
                    value={initialObsidianVault}
                    onChange={(e) => onObsidianVaultChange(e.target.value)}
                    placeholder="/path/to/your/vault"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Вкажіть шлях для створення посилань `obsidian://`.
                </p>
               </div>
            </div>
          </div>
        </section>
        
        {/*
          Розділ "Резервне копіювання" було видалено звідси.
          Функціонал імпорту та експорту тепер доступний через
          головне меню програми (Sync -> Import/Export from File...).
        */}

      </div>
    </div>
  );
};

export default SettingsPage;
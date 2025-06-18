// src/renderer/components/SettingsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import * as goalListStore from "../data/goalListsStore";
import type {
  GoalList as GoalListTypeImport,
  Goal as GoalImport,
} from "../data/goalListsStore";

interface AppBackupDataFormat {
  version: number;
  exportedAt: string;
  data: {
    goalLists: GoalListTypeImport[];
    goals: GoalImport[];
  };
}

interface SettingsPageProps {
  currentTheme: string;
  onChangeTheme: (newTheme: string) => void;
  initialObsidianVault: string;
  onObsidianVaultChange: (newPath: string) => void;
  onDataImported?: () => void;
}

function SettingsPage({
  currentTheme,
  onChangeTheme,
  initialObsidianVault,
  onObsidianVaultChange,
  onDataImported,
}: SettingsPageProps) {
  const [obsidianVaultPath, setObsidianVaultPath] =
    useState(initialObsidianVault);

  const [isLinuxAppImage, setIsLinuxAppImage] = useState(false);
  const [userDesktopFileExists, setUserDesktopFileExists] = useState(true);
  const [desktopFileMessage, setDesktopFileMessage] = useState<string | null>(
    null,
  );
  const [isDesktopFileProcessing, setIsDesktopFileProcessing] = useState(false);

  useEffect(() => {
    setObsidianVaultPath(initialObsidianVault);
  }, [initialObsidianVault]);

  useEffect(() => {
    const checkDesktopIntegrationStatus = async () => {
      if (
        window.electronAPI &&
        navigator.platform.toUpperCase().indexOf("LINUX") >= 0
      ) {
        try {
          const isAppImage = await window.electronAPI.isAppImageOnLinux();
          setIsLinuxAppImage(isAppImage);
          if (isAppImage) {
            const hasFile = await window.electronAPI.hasUserDesktopFile();
            setUserDesktopFileExists(hasFile);
            if (hasFile) {
              setDesktopFileMessage(
                "Ярлик для меню вже існує для поточного користувача.",
              );
            } else {
              setDesktopFileMessage(null);
            }
          } else {
            setUserDesktopFileExists(true);
          }
        } catch (error) {
          console.error(
            "Помилка перевірки статусу інтеграції з робочим столом:",
            error,
          );
          setIsLinuxAppImage(false);
          setUserDesktopFileExists(true);
          setDesktopFileMessage("Не вдалося перевірити статус ярлика.");
        }
      } else {
        setIsLinuxAppImage(false);
        setUserDesktopFileExists(true);
      }
    };
    checkDesktopIntegrationStatus();
  }, []);

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeTheme(event.target.value);
  };

  const handleVaultPathChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setObsidianVaultPath(event.target.value);
  };

  const handleSaveVaultPath = useCallback(() => {
    onObsidianVaultChange(obsidianVaultPath.trim());
  }, [obsidianVaultPath, onObsidianVaultChange]);

  const handleExportData = async () => {
    if (!window.electronAPI) {
      alert("Electron API не доступне для операцій з файлами.");
      console.error(
        "Electron API (window.electronAPI) not found for file operations.",
      );
      return;
    }

    try {
      const allGoalLists = goalListStore.getAllGoalLists();
      const allGoals = goalListStore.getAllGoals();

      if (allGoalLists.length === 0 && allGoals.length === 0) {
        alert("Немає даних для експорту.");
        return;
      }

      const exportData: AppBackupDataFormat = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          goalLists: allGoalLists,
          goals: allGoals,
        },
      };

      const result = await window.electronAPI.showSaveDialog({
        title: "Експорт всіх даних",
        defaultPath: `forward-app-backup-${new Date().toISOString().split("T")[0]}.json`,
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });

      if (!result.canceled && result.filePath) {
        const jsonContent = JSON.stringify(exportData, null, 2);
        const writeResult = await window.electronAPI.writeFile(
          result.filePath,
          jsonContent,
        );
        if (writeResult.success) {
          alert("Дані успішно експортовано!");
          console.log("Data exported successfully to:", result.filePath);
        } else {
          alert(`Помилка експорту: ${writeResult.error || "Невідома помилка"}`);
          console.error("Export error:", writeResult.error);
        }
      } else {
        console.log("Export dialog was canceled by user.");
      }
    } catch (error) {
      console.error("Помилка під час експорту даних:", error);
      alert(
        `Сталася помилка експорту: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const handleImportData = async () => {
    if (!window.electronAPI) {
      alert("Electron API не доступне для операцій з файлами.");
      console.error(
        "Electron API (window.electronAPI) not found for file operations.",
      );
      return;
    }

    const confirmImport = window.confirm(
      "УВАГА! Імпорт даних повністю ПЕРЕЗАПИШЕ всі ваші поточні списки та цілі. " +
        "Рекомендується зробити резервну копію (експорт) перед продовженням.\n\n" +
        "Ви впевнені, що хочете продовжити?",
    );

    if (!confirmImport) {
      console.log("Import was canceled by user confirmation.");
      return;
    }

    try {
      const result = await window.electronAPI.showOpenDialog({
        title: "Імпорт всіх даних",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
        properties: ["openFile"],
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log("Attempting to import data from:", filePath);
        const readResult = await window.electronAPI.readFile(filePath);

        if (readResult.success && typeof readResult.content === "string") {
          const importedObject = JSON.parse(
            readResult.content,
          ) as AppBackupDataFormat;

          if (
            importedObject.version !== 1 ||
            !importedObject.data ||
            !Array.isArray(importedObject.data.goalLists) ||
            !Array.isArray(importedObject.data.goals)
          ) {
            alert(
              "Файл має невірний формат, версію або пошкоджений. Будь ласка, перевірте файл.",
            );
            console.error(
              "Invalid import file format or version:",
              importedObject,
            );
            return;
          }

          goalListStore.dangerouslyReplaceAllData(
            importedObject.data.goalLists,
            importedObject.data.goals,
          );

          alert("Дані успішно імпортовано!");
          console.log(
            "Data imported successfully. Triggering onDataImported callback.",
          );
          if (onDataImported) {
            onDataImported();
          }
        } else {
          alert(
            `Помилка читання файлу: ${readResult.error || "Невідома помилка або файл порожній."}`,
          );
          console.error("File read error or empty content:", readResult.error);
        }
      } else {
        console.log("Import dialog was canceled or no file selected.");
      }
    } catch (error) {
      console.error("Помилка під час імпорту даних:", error);
      alert(
        `Сталася помилка імпорту: ${error instanceof Error ? error.message : String(error)}. Перевірте консоль для деталей.`,
      );
    }
  };

  const handleCreateDesktopFile = async () => {
    if (!window.electronAPI) {
      alert("Electron API не доступне.");
      setDesktopFileMessage("Electron API не доступне.");
      return;
    }
    setIsDesktopFileProcessing(true);
    setDesktopFileMessage("Створення ярлика...");
    try {
      const result = await window.electronAPI.createUserDesktopFile();
      if (result.success) {
        alert(result.message || "Ярлик успішно створено!");
        setDesktopFileMessage(result.message || "Ярлик успішно створено!");
        setUserDesktopFileExists(true);
      } else {
        const errorMsg =
          result.error || result.message || "Не вдалося створити ярлик.";
        alert(`Помилка: ${errorMsg}`);
        setDesktopFileMessage(`Помилка: ${errorMsg}`);
      }
    } catch (error: any) {
      alert(`Критична помилка: ${error.message}`);
      setDesktopFileMessage(`Критична помилка: ${error.message}`);
      console.error("Критична помилка при створенні .desktop файлу:", error);
    } finally {
      setIsDesktopFileProcessing(false);
    }
  };

  const canCreateDesktopFile =
    isLinuxAppImage && !userDesktopFileExists && !isDesktopFileProcessing;

  return (
    <div className="p-6 min-h-full text-slate-800 dark:text-slate-200">
      <h1 className="text-2xl font-semibold mb-8 text-slate-900 dark:text-slate-100">
        Налаштування Додатка
      </h1>

      <div className="space-y-10 max-w-3xl mx-auto">
        <section>
          <h2 className="text-xl font-medium mb-4 text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-300 dark:border-slate-700">
            Загальні
          </h2>
          <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="theme"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
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
                  Виберіть бажану тему. "Як у системі" автоматично адаптується
                  до налаштувань вашої ОС.
                </p>
              </div>

              <div>
                <label
                  htmlFor="obsidian-vault"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
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
                  Вкажіть точну назву вашого Obsidian Vault, як вона
                  використовується в obsidian:// URL (чутлива до регістру).
                  Наприклад, якщо ваше сховище називається "My Notes", введіть
                  "My Notes".
                </p>
              </div>

              {/* Інтеграція з робочим столом (Linux AppImage) */}
              {navigator.platform.toUpperCase().indexOf("LINUX") >= 0 && ( // Показуємо цей блок тільки на Linux
                <div className="pt-4">
                  <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-3">
                    Інтеграція з системою (Linux)
                  </h3>
                  {isLinuxAppImage ? (
                    <>
                      <button
                        onClick={handleCreateDesktopFile}
                        disabled={!canCreateDesktopFile}
                        className={`px-4 py-2 text-sm text-white rounded-md w-full sm:w-auto justify-center
                                    ${
                                      canCreateDesktopFile
                                        ? "bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600"
                                        : "bg-slate-400 dark:bg-slate-600 cursor-not-allowed opacity-70"
                                    }`}
                      >
                        {isDesktopFileProcessing
                          ? "Обробка..."
                          : userDesktopFileExists
                            ? "Ярлик для меню вже існує"
                            : "Створити ярлик для меню"}
                      </button>
                      {desktopFileMessage && (
                        <p
                          className={`mt-2 text-xs ${desktopFileMessage.toLowerCase().includes("помилка") || desktopFileMessage.toLowerCase().includes("failed") ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {desktopFileMessage}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Додає програму в меню для легкого запуску (тільки для
                        поточного користувача).
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Опція створення ярлика доступна тільки при запуску з
                      AppImage на Linux.
                    </p>
                  )}
                </div>
              )}

              <div className="pt-4">
                <h3 className="text-md font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Резервне копіювання та відновлення даних
                </h3>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={handleExportData}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md dark:bg-blue-500 dark:hover:bg-blue-600 w-full sm:w-auto justify-center"
                  >
                    Експортувати всі дані
                  </button>
                  <button
                    onClick={handleImportData}
                    className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-md dark:bg-orange-600 dark:hover:bg-orange-700 w-full sm:w-auto justify-center"
                  >
                    Імпортувати всі дані
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Імпорт повністю перезапише всі поточні списки та цілі.
                  Рекомендується зробити експорт перед імпортом.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4 text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-300 dark:border-slate-700">
            Сповіщення
          </h2>
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
                <label
                  htmlFor="enable-notifications"
                  className="ml-3 block text-sm text-slate-900 dark:text-slate-200 disabled:opacity-50"
                >
                  Увімкнути сповіщення (недоступно)
                </label>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-medium mb-4 text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-300 dark:border-slate-700">
            Мова
          </h2>
          <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div>
              <label
                htmlFor="language"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
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
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;

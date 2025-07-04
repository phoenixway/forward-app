// src/renderer/components/SettingsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { nanoid } from "@reduxjs/toolkit";
import { RootState, AppDispatch } from "../store/store";
import { ListsState, stateReplaced } from "../store/listsSlice";
import type { Goal, GoalList, GoalInstance } from "../types";

// Типи для розбору старих і нових форматів бекапу
interface OldGoalListFormat {
  id: string;
  name: string;
  itemGoalIds?: string[];
  itemInstanceIds?: string[];
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface OldBackupData {
  goalLists: OldGoalListFormat[];
  goals: Goal[];
}

interface AppBackupDataFormat {
  version: number;
  exportedAt: string;
  data: OldBackupData | ListsState;
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
  const dispatch = useDispatch<AppDispatch>();
  const listsStateForExport = useSelector((state: RootState) => state.lists);

  const [obsidianVaultPath, setObsidianVaultPath] = useState(initialObsidianVault);
  // ... (решта ваших станів залишається без змін)
  const [isLinuxAppImage, setIsLinuxAppImage] = useState(false);
  const [userDesktopFileExists, setUserDesktopFileExists] = useState(true);
  const [desktopFileMessage, setDesktopFileMessage] = useState<string | null>(null);
  const [isDesktopFileProcessing, setIsDesktopFileProcessing] = useState(false);


  useEffect(() => {
    setObsidianVaultPath(initialObsidianVault);
  }, [initialObsidianVault]);
  
  // ... (решта ваших useEffect та хендлерів залишається без змін)
  useEffect(() => {
    const checkDesktopIntegrationStatus = async () => {
      if (window.electronAPI && navigator.platform.toUpperCase().indexOf("LINUX") >= 0) {
        try {
          const isAppImage = await window.electronAPI.isAppImageOnLinux();
          setIsLinuxAppImage(isAppImage);
          if (isAppImage) {
            const hasFile = await window.electronAPI.hasUserDesktopFile();
            setUserDesktopFileExists(hasFile);
          }
        } catch (error) {
          console.error("Помилка перевірки статусу інтеграції з робочим столом:", error);
        }
      }
    };
    checkDesktopIntegrationStatus();
  }, []);

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChangeTheme(event.target.value);
  };

  const handleVaultPathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setObsidianVaultPath(event.target.value);
  };

  const handleSaveVaultPath = useCallback(() => {
    onObsidianVaultChange(obsidianVaultPath.trim());
  }, [obsidianVaultPath, onObsidianVaultChange]);

  const handleExportData = async () => {
    if (!window.electronAPI?.showSaveDialog || !window.electronAPI.writeFile) return;
    try {
      const exportData = {
        version: 2, // Завжди експортуємо в новому форматі (v2)
        exportedAt: new Date().toISOString(),
        data: listsStateForExport,
      };
      const result = await window.electronAPI.showSaveDialog({
        title: "Експорт всіх даних",
        defaultPath: `forward-app-backup-${new Date().toISOString().split("T")[0]}.json`,
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });

      if (!result.canceled && result.filePath) {
        const jsonContent = JSON.stringify(exportData, null, 2);
        await window.electronAPI.writeFile(result.filePath, jsonContent);
        alert("Дані успішно експортовано!");
      }
    } catch (error) {
      alert(`Сталася помилка експорту: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleImportData = async () => {
    if (!window.electronAPI?.showOpenDialog || !window.electronAPI.readFile) return;
    if (!window.confirm("УВАГА! Імпорт даних повністю ПЕРЕЗАПИШЕ всі ваші поточні дані. Продовжити?")) return;

    try {
      const result = await window.electronAPI.showOpenDialog({
        title: "Імпорт всіх даних",
        filters: [{ name: "JSON Files", extensions: ["json"] }],
        properties: ["openFile"],
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) return;
      
      const readResult = await window.electronAPI.readFile(result.filePaths[0]);
      if (!readResult.success || typeof readResult.content !== "string") throw new Error("Не вдалося прочитати файл.");

      const importedObject: AppBackupDataFormat = JSON.parse(readResult.content);
      if (!importedObject.version || !importedObject.data) throw new Error("Файл має невірний формат.");

      let finalState: ListsState;

      if (importedObject.version === 1) {
        // --- МІГРАЦІЯ ЗІ СТАРОГО ФОРМАТУ (v1) ---
        const oldData = importedObject.data as OldBackupData;
        const goalsAsRecord = (oldData.goals || []).reduce((acc: Record<string, Goal>, goal) => {
          acc[goal.id] = goal;
          return acc;
        }, {});

        const newInstances: Record<string, GoalInstance> = {};
        const newLists: Record<string, GoalList> = {};

        (oldData.goalLists || []).forEach((list) => {
          const newInstanceIds: string[] = (list.itemGoalIds || []).map(goalId => {
            if (goalsAsRecord[goalId]) {
              const instanceId = nanoid();
              newInstances[instanceId] = { id: instanceId, goalId: goalId };
              return instanceId;
            }
            return null;
          }).filter(Boolean) as string[];

          newLists[list.id] = {
            ...list,
            itemInstanceIds: newInstanceIds,
            createdAt: list.createdAt || new Date().toISOString(),
            updatedAt: list.updatedAt || new Date().toISOString(),
            parentId: null,       // Додаємо поле
            childListIds: [],     // Додаємо поле
          };
        });

        finalState = {
          goals: goalsAsRecord,
          goalLists: newLists,
          goalInstances: newInstances,
          rootListIds: Object.keys(newLists), // Всі списки стають кореневими
        };

      } else {
        // --- ОБРОБКА НОВОГО ФОРМАТУ (v2) ---
        const importedState = importedObject.data as ListsState;
        const goalLists: Record<string, GoalList> = {};
        
        Object.values(importedState.goalLists || {}).forEach(list => {
            goalLists[list.id] = {
                ...list,
                parentId: list.parentId !== undefined ? list.parentId : null,
                childListIds: list.childListIds || [],
            };
        });

        let rootListIds = importedState.rootListIds;
        if (!Array.isArray(rootListIds)) {
            const allChildIds = new Set(Object.values(goalLists).flatMap(l => l.childListIds));
            rootListIds = Object.keys(goalLists).filter(id => !allChildIds.has(id));
        }
        
        finalState = {
            goals: importedState.goals || {},
            goalInstances: importedState.goalInstances || {},
            goalLists,
            rootListIds,
        };
      }

      dispatch(stateReplaced(finalState));
      alert("Дані успішно імпортовано!");
      if (onDataImported) onDataImported();

    } catch (error) {
      alert(`Сталася помилка імпорту: ${error instanceof Error ? error.message : String(error)}.`);
    }
  };
  
  const handleCreateDesktopFile = async () => {
    if (!window.electronAPI?.createUserDesktopFile) return;
    setIsDesktopFileProcessing(true);
    try {
      const result = await window.electronAPI.createUserDesktopFile();
      if (result.success) {
        alert(result.message || "Ярлик успішно створено!");
        setUserDesktopFileExists(true);
      } else {
        alert(`Помилка: ${result.error || "Не вдалося створити ярлик."}`);
      }
    } catch (error: any) {
      alert(`Критична помилка: ${error.message}`);
    } finally {
      setIsDesktopFileProcessing(false);
    }
  };
  
  const canCreateDesktopFile = isLinuxAppImage && !userDesktopFileExists && !isDesktopFileProcessing;

  return (
    <div className="p-6 min-h-full text-slate-800 dark:text-slate-200">
      <h1 className="text-2xl font-semibold mb-8 text-slate-900 dark:text-slate-100">
        Налаштування
      </h1>
      <div className="space-y-10 max-w-3xl mx-auto">
        {/* Тут ваша розмітка для налаштувань теми, Vault, тощо. */}
        {/* Я залишаю її без змін, оскільки вона не стосується помилок. */}
        <section>
          <h2 className="text-xl font-medium mb-4">Загальні</h2>
          {/* ... */}
           <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="theme" className="block text-sm font-medium">Тема</label>
                <select id="theme" value={currentTheme} onChange={handleThemeChange} className="mt-1 block w-full ...">
                  <option value="light">Світла</option>
                  <option value="dark">Темна</option>
                  <option value="system">Як у системі</option>
                </select>
              </div>
              {/* ... інші налаштування */}
              <div className="pt-4">
                <h3 className="text-md font-medium">Резервне копіювання</h3>
                <div className="flex space-x-3 mt-2">
                  <button onClick={handleExportData} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md">
                    Експорт
                  </button>
                  <button onClick={handleImportData} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md">
                    Імпорт
                  </button>
                </div>
              </div>
            </div>
           </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsPage;

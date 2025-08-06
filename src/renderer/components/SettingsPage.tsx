// src/renderer/components/SettingsPage.tsx
import React from "react";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { stateReplaced } from "../store/listsSlice";
import { formatStateForExport, transformImportedData, DesktopBackupFile } from '../logic/syncLogic';

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
  const dispatch = useAppDispatch();
  const listsState = useAppSelector((state) => state.lists);
  
  const handleExportData = async () => {
    if (!window.electronAPI?.showSaveDialog || !window.electronAPI.writeFile) return;
    try {
      const dataForExport = formatStateForExport(listsState);
      
      const exportFileContent: DesktopBackupFile = {
        version: 4,
        exportedAt: new Date().toISOString(),
        data: dataForExport,
      };

      const result = await window.electronAPI.showSaveDialog({
        title: "Експорт всіх даних",
        defaultPath: `forward-app-backup-${new Date().toISOString().split("T")[0]}.json`,
        filters: [{ name: "JSON Files", extensions: ["json"] }],
      });

      if (!result.canceled && result.filePath) {
        const jsonContent = JSON.stringify(exportFileContent, null, 2);
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

      const importedObject: DesktopBackupFile = JSON.parse(readResult.content);
      if (!importedObject.data) throw new Error("Файл має невірний формат.");

      const finalState = transformImportedData(importedObject.data);
      
      dispatch(stateReplaced(finalState));
      alert("Дані успішно імпортовано!");
      if (onDataImported) onDataImported();

    } catch (error) {
      alert(`Сталася помилка імпорту: ${error instanceof Error ? error.message : String(error)}.`);
    }
  };

  return (
    <div className="p-6 min-h-full text-slate-800 dark:text-slate-200">
      <h1 className="text-2xl font-semibold mb-8 text-slate-900 dark:text-slate-100">
        Налаштування
      </h1>
      <div className="space-y-10 max-w-3xl mx-auto">
        <section>
          <h2 className="text-xl font-medium mb-4">Резервне копіювання</h2>
           <div className="bg-white dark:bg-slate-700/30 shadow-md sm:rounded-lg p-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Збережіть всі ваші дані в один файл або відновіть їх з резервної копії.</p>
                <div className="flex space-x-3 mt-2">
                  <button onClick={handleExportData} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Експорт
                  </button>
                  <button onClick={handleImportData} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600">
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
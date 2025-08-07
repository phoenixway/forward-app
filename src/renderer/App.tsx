// src/renderer/App.tsx
import React, { useCallback, useEffect, useState } from "react";
import "./styles.css";
import MainPanel from "./components/MainPanel";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import Sidebar from "./components/Sidebar";
import DropActionMenu from "./components/DropActionMenu";
import WifiSyncModal from "./components/WifiSyncModal";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { openDropActionMenu } from "./store/uiSlice";
import { openSyncModal, setDeviceAddress } from "./store/syncSlice";
import {
  goalOrderUpdated,
  listMoved,
  listsReordered,
  stateReplaced,
} from "./store/listsSlice";
import type { GoalList } from "./types";
import { formatStateForExport, transformImportedData, DesktopBackupFile } from "./logic/syncLogic";
import { dispatchOpenSettingsEvent } from "./events";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { allLists, goalInstances, listsState } = useAppSelector((state) => ({
    allLists: state.lists.goalLists,
    goalInstances: state.lists.goalInstances,
    listsState: state.lists,
  }));

  const handleExportData = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
        const dataForExport = formatStateForExport(listsState);
        const exportFileContent: DesktopBackupFile = {
            version: 4,
            exportedAt: new Date().toISOString(),
            data: dataForExport,
        };
        const result = await window.electronAPI.showSaveDialog({
            title: "Export All Data",
            defaultPath: `forward-app-backup-${new Date().toISOString().split("T")[0]}.json`,
            filters: [{ name: "JSON Files", extensions: ["json"] }],
        });
        if (!result.canceled && result.filePath) {
            const jsonContent = JSON.stringify(exportFileContent, null, 2);
            await window.electronAPI.writeFile(result.filePath, jsonContent);
            alert("Data successfully exported!");
        }
    } catch (error) {
        alert(`An export error occurred: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [listsState]);

  const handleImportData = useCallback(async () => {
      if (!window.electronAPI) return;
      if (!window.confirm("WARNING! Importing data will completely OVERWRITE all your current data. Continue?")) return;
      try {
          const result = await window.electronAPI.showOpenDialog({
              title: "Import All Data",
              filters: [{ name: "JSON Files", extensions: ["json"] }],
              properties: ["openFile"],
          });
          if (result.canceled || !result.filePaths || result.filePaths.length === 0) return;
          const readResult = await window.electronAPI.readFile(result.filePaths[0]);
          if (!readResult.success || typeof readResult.content !== "string") throw new Error("Could not read the file.");
          const importedObject: DesktopBackupFile = JSON.parse(readResult.content);
          if (!importedObject.data) throw new Error("The file has an invalid format.");
          const finalState = transformImportedData(importedObject.data);
          dispatch(stateReplaced(finalState));
          alert("Data successfully imported!");
      } catch (error) {
          alert(`An import error occurred: ${error instanceof Error ? error.message : String(error)}.`);
      }
  }, [dispatch]);

  // ВИПРАВЛЕННЯ: Розділено на два useEffect для стабільності
  
  // Ефект для стабільних слухачів, що запускається один раз
  useEffect(() => {
    if (!window.electronAPI) return;

    const removeImportListener = window.electronAPI.onShowWifiImportDialog(async () => {
      try {
        const settings = await window.electronAPI.getAppSettings();
        const defaultAddress = settings?.defaultWifiImportAddress || '';
        dispatch(setDeviceAddress(defaultAddress));
        dispatch(openSyncModal('import'));
      } catch (error) {
        console.error("Failed to get app settings for Wi-Fi import:", error);
        dispatch(openSyncModal('import'));
      }
    });

    const removeServerListener = window.electronAPI.onShowWifiServerStatus(() => {
      dispatch(openSyncModal('server'));
    });
    
    const removeShowSettingsListener = window.electronAPI.onShowSettingsPage(() => {
      dispatchOpenSettingsEvent();
    });

    return () => {
      removeImportListener();
      removeServerListener();
      removeShowSettingsListener();
    };
  }, [dispatch]); // `dispatch` є стабільним

  // Ефект для слухачів, колбеки яких залежать від мінливого стану (listsState)
  useEffect(() => {
    if (!window.electronAPI) return;
    
    const removeFileExportListener = window.electronAPI.onTriggerFileExport(handleExportData);
    const removeFileImportListener = window.electronAPI.onTriggerFileImport(handleImportData);

    return () => {
      removeFileExportListener();
      removeFileImportListener();
    };
  }, [handleExportData, handleImportData]);


  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type } = result;
      if (!destination) return;

      if (type === "LIST") {
          if (source.droppableId !== destination.droppableId) {
            alert("Списки можна сортувати лише в межах одного рівня.");
            return;
          }
          const parentId = source.droppableId === 'root' ? null : source.droppableId;
          const siblingLists = Object.values(allLists)
              .filter((l: GoalList) => l.parentId == parentId)
              .sort((a: GoalList, b: GoalList) => a.order - b.order);
          const reorderedIds = siblingLists.map((l: GoalList) => l.id);
          const [movedItem] = reorderedIds.splice(source.index, 1);
          reorderedIds.splice(destination.index, 0, movedItem);
          dispatch(listsReordered({ parentId, orderedListIds: reorderedIds }));
          return;
      }

      if (type === "GOAL" || type === undefined) {
          const destinationListId = destination.droppableId;
          if (destinationListId.startsWith('sidebar-list-')) {
            dispatch(openDropActionMenu(result));
            return;
          }
          if (source.droppableId === destinationListId) {
            const instancesInList = Object.values(goalInstances).filter(inst => inst.listId === source.droppableId).sort((a, b) => a.order - b.order);
            const orderedInstanceIds = instancesInList.map(inst => inst.instanceId);
            const [movedItem] = orderedInstanceIds.splice(source.index, 1);
            orderedInstanceIds.splice(destination.index, 0, movedItem);
            dispatch(goalOrderUpdated({ listId: source.droppableId, orderedInstanceIds: orderedInstanceIds }));
          } else {
            dispatch(openDropActionMenu(result));
          }
      }
    },
    [dispatch, allLists, goalInstances],
  );

  const [userPreference, setUserPreference] = useState<string>('system');
  const handleThemePreferenceChange = (pref: string) => setUserPreference(pref);
  const [obsidianVaultPath, setObsidianVaultPath] = useState('');
  const handleObsidianVaultChange = (path: string) => setObsidianVaultPath(path);

  return (
    <>
      <div className="flex h-screen w-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <DragDropContext onDragEnd={handleDragEnd}>
            <aside className="w-80 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 h-full flex flex-col">
              <Sidebar />
            </aside>
            <main className="flex-1 min-w-0 h-full">
              <MainPanel
                currentThemePreference={userPreference}
                onChangeThemePreference={handleThemePreferenceChange}
                obsidianVaultPath={obsidianVaultPath}
                onObsidianVaultChange={handleObsidianVaultChange}
              />
            </main>
        </DragDropContext>
      </div>
      <DropActionMenu />
      <WifiSyncModal />
    </>
  );
};

export default App;
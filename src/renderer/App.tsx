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
  listsReordered,
  stateReplaced,
} from "./store/listsSlice";
// listMoved більше не потрібен тут, якщо він не використовується для цілей
// import { listMoved } from "./store/listsSlice";
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

  // ... (handleExportData, handleImportData, useEffect без змін) ...
  const handleExportData = useCallback(async () => {
    // ...
  }, [listsState]);

  const handleImportData = useCallback(async () => {
    // ...
  }, [dispatch]);

  useEffect(() => {
    // ...
  }, [dispatch, handleExportData, handleImportData]);


  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type } = result;
      if (!destination) return;

      // ВИДАЛЕНО: Блок if (type === "LIST") {...}
      // Тепер DnD обробляє тільки цілі.

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
        {/* DragDropContext залишається, він потрібен для цілей */}
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
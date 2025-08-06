// src/renderer/App.tsx
import React, { useCallback, useEffect, useState } from "react";
import "./styles.css";
import Layout from "./components/Layout";
import MainPanel from "./components/MainPanel";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import Sidebar from "./components/Sidebar";
import DropActionMenu from "./components/DropActionMenu";
import WifiSyncModal from "./components/WifiSyncModal";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { openDropActionMenu } from "./store/uiSlice";
import { openSyncModal } from "./store/syncSlice";
import {
  goalOrderUpdated,
  listMoved,
  listsReordered,
  stateReplaced,
} from "./store/listsSlice";
import type { GoalList } from "./types";
import { formatStateForExport, transformImportedData, DesktopBackupFile } from "./logic/syncLogic";
import { dispatchOpenSettingsEvent } from "./events"; // Імпортуємо нову функцію

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { goalLists, allLists, goalInstances, listsState } = useAppSelector((state) => ({
    goalLists: state.lists.goalLists,
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

  useEffect(() => {
    const removeImportListener = window.electronAPI.onShowWifiImportDialog(() => {
      dispatch(openSyncModal('import'));
    });
    const removeServerListener = window.electronAPI.onShowWifiServerStatus(() => {
      dispatch(openSyncModal('server'));
    });
    
    const removeFileExportListener = window.electronAPI.onTriggerFileExport(handleExportData);
    const removeFileImportListener = window.electronAPI.onTriggerFileImport(handleImportData);
    const removeShowSettingsListener = window.electronAPI.onShowSettingsPage(() => {
      // Замість зміни стану, ми відправляємо подію, яку слухає MainPanel
      dispatchOpenSettingsEvent();
    });

    return () => {
      removeImportListener();
      removeServerListener();
      removeFileExportListener();
      removeFileImportListener();
      removeShowSettingsListener();
    };
  }, [dispatch, handleExportData, handleImportData]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type, draggableId } = result;
      if (!destination) return;
      if (type === "LIST") {
        const sourceParentId = source.droppableId === "root" ? null : source.droppableId;
        const destinationParentId = destination.droppableId === "root" ? null : destination.droppableId;
        if (source.droppableId === destination.droppableId) {
          const parentId = source.droppableId === 'root' ? null : source.droppableId;
          const siblingLists = Object.values(allLists).filter((l: GoalList) => l.parentId === parentId).sort((a: GoalList, b: GoalList) => a.order - b.order);
          const reorderedIds = siblingLists.map((l: GoalList) => l.id);
          const [movedItem] = reorderedIds.splice(source.index, 1);
          reorderedIds.splice(destination.index, 0, movedItem);
          dispatch(listsReordered({ parentId, orderedListIds: reorderedIds }));
        } else {
          dispatch(listMoved({ listId: draggableId, newParentId: destinationParentId }));
          const oldSiblings = Object.values(allLists).filter((l: GoalList) => l.parentId === sourceParentId && l.id !== draggableId).sort((a: GoalList,b: GoalList) => a.order - b.order).map((l: GoalList) => l.id);
          dispatch(listsReordered({ parentId: sourceParentId, orderedListIds: oldSiblings }));
          const newSiblings = Object.values(allLists).filter((l: GoalList) => l.parentId === destinationParentId && l.id !== draggableId).sort((a: GoalList,b: GoalList) => a.order - b.order).map((l: GoalList) => l.id);
          newSiblings.splice(destination.index, 0, draggableId);
          dispatch(listsReordered({ parentId: destinationParentId, orderedListIds: newSiblings }));
        }
        return;
      }
      if (type === "GOAL" || type === undefined) {
          const sourceListId = source.droppableId;
          const destinationListId = destination.droppableId;
          if (sourceListId === destinationListId) {
            const instancesInList = Object.values(goalInstances).filter(inst => inst.listId === sourceListId).sort((a, b) => a.order - b.order);
            const orderedInstanceIds = instancesInList.map(inst => inst.instanceId);
            const [movedItem] = orderedInstanceIds.splice(source.index, 1);
            orderedInstanceIds.splice(destination.index, 0, movedItem);
            dispatch(goalOrderUpdated({ listId: sourceListId, orderedInstanceIds: orderedInstanceIds }));
          } else {
            dispatch(openDropActionMenu(result));
          }
      }
    },
    [dispatch, goalLists, allLists, goalInstances],
  );

  const [userPreference, setUserPreference] = useState<string>('system');
  const handleThemePreferenceChange = (pref: string) => setUserPreference(pref);
  const [obsidianVaultPath, setObsidianVaultPath] = useState('');
  const handleObsidianVaultChange = (path: string) => setObsidianVaultPath(path);

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Layout
          sidebar={<Sidebar />}
          mainPanel={
            <MainPanel
              // Пропси isSettingsVisible та onCloseSettings більше не потрібні
              currentThemePreference={userPreference}
              onChangeThemePreference={handleThemePreferenceChange}
              obsidianVaultPath={obsidianVaultPath}
              onObsidianVaultChange={handleObsidianVaultChange}
            />
          }
        />
      </DragDropContext>
      <DropActionMenu />
      <WifiSyncModal />
    </>
  );
};

export default App;
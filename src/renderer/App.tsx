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
} from "./store/listsSlice";
import type { GoalList } from "./types";

const App: React.FC = () => {
  const dispatch = useAppDispatch();
  // ✨ ВИПРАВЛЕННЯ: Отримуємо також goalInstances для нової логіки сортування
  const { goalLists, allLists, goalInstances } = useAppSelector((state) => ({
    goalLists: state.lists.goalLists,
    allLists: state.lists.goalLists,
    goalInstances: state.lists.goalInstances,
  }));

  useEffect(() => {
    const removeImportListener = window.electronAPI.onShowWifiImportDialog(() => {
      dispatch(openSyncModal('import'));
    });
    const removeServerListener = window.electronAPI.onShowWifiServerStatus(() => {
      dispatch(openSyncModal('server'));
    });

    return () => {
      removeImportListener();
      removeServerListener();
    };
  }, [dispatch]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type, draggableId } = result;

      if (!destination) return;

      if (type === "LIST") {
        // ... (логіка для списків залишається без змін)
        const sourceParentId = source.droppableId === "root" ? null : source.droppableId;
        const destinationParentId = destination.droppableId === "root" ? null : destination.droppableId;

        if (source.droppableId === destination.droppableId) {
          const parentId = source.droppableId === 'root' ? null : source.droppableId;
          const siblingLists = Object.values(allLists)
            .filter((l: GoalList) => l.parentId === parentId)
            .sort((a: GoalList, b: GoalList) => a.order - b.order);

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

      // ✨ ВИПРАВЛЕННЯ: Повністю оновлена логіка для сортування цілей
      if (type === "GOAL" || type === undefined) {
          const sourceListId = source.droppableId;
          const destinationListId = destination.droppableId;

          if (sourceListId === destinationListId) {
            // 1. Знаходимо всі екземпляри для цього списку
            const instancesInList = Object.values(goalInstances)
              .filter(inst => inst.listId === sourceListId)
              .sort((a, b) => a.order - b.order);

            // 2. Створюємо масив їх ID у поточному порядку
            const orderedInstanceIds = instancesInList.map(inst => inst.instanceId);

            // 3. Виконуємо сортування
            const [movedItem] = orderedInstanceIds.splice(source.index, 1);
            orderedInstanceIds.splice(destination.index, 0, movedItem);

            // 4. Відправляємо екшен з новим порядком ID
            dispatch(
              goalOrderUpdated({
                listId: sourceListId,
                orderedInstanceIds: orderedInstanceIds,
              }),
            );
          } else {
            // Логіка переміщення між списками залишається через DropActionMenu
            dispatch(openDropActionMenu(result));
          }
      }
    },
    [dispatch, goalLists, allLists, goalInstances], // Додано goalInstances
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
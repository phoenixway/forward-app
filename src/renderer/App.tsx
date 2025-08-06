import React, { useCallback, useEffect, useState } from "react";
import "./styles.css";
import Layout from "./components/Layout";
import MainPanel from "./components/MainPanel";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import Sidebar from "./components/Sidebar";
import DropActionMenu from "./components/DropActionMenu";
import WifiSyncModal from "./components/WifiSyncModal";

// --- ВИПРАВЛЕННЯ: Імпортуємо наші нові типізовані хуки ---
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { openDropActionMenu } from "./store/uiSlice";
import { openSyncModal } from "./store/syncSlice";
import {
  goalOrderUpdated,
  listMoved,
  listsReordered,
} from "./store/listsSlice";
import type { GoalList } from "./types"; // Переконайтеся, що цей імпорт є

const App: React.FC = () => {
  // --- ВИПРАВЛЕННЯ: Використовуємо useAppDispatch та useAppSelector ---
  const dispatch = useAppDispatch();
  // Тепер `state` автоматично має тип `RootState`, і `allLists` буде правильно типізовано
  const allLists = useAppSelector((state) => state.lists.goalLists); 
  const goalLists = allLists; // `goalLists` - це те саме, що `allLists`

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
        const sourceParentId = source.droppableId === "root" ? null : source.droppableId;
        const destinationParentId = destination.droppableId === "root" ? null : destination.droppableId;

        if (source.droppableId === destination.droppableId) {
          const parentId = source.droppableId === 'root' ? null : source.droppableId;
          
          // Тепер, коли allLists має правильний тип, ці явні анотації працюватимуть коректно
          const siblingLists = Object.values(allLists)
            .filter((l: GoalList) => l.parentId === parentId)
            .sort((a: GoalList, b: GoalList) => a.order - b.order);

          const reorderedIds = siblingLists.map((l: GoalList) => l.id);
          const [movedItem] = reorderedIds.splice(source.index, 1);
          reorderedIds.splice(destination.index, 0, movedItem);

          dispatch(listsReordered({ parentId, orderedListIds: reorderedIds }));

        } else {
          dispatch(listMoved({ listId: draggableId, newParentId: destinationParentId }));

          const oldSiblings = Object.values(allLists)
            .filter((l: GoalList) => l.parentId === sourceParentId && l.id !== draggableId)
            .sort((a: GoalList,b: GoalList) => a.order - b.order)
            .map((l: GoalList) => l.id);
          dispatch(listsReordered({ parentId: sourceParentId, orderedListIds: oldSiblings }));

          const newSiblings = Object.values(allLists)
            .filter((l: GoalList) => l.parentId === destinationParentId && l.id !== draggableId)
            .sort((a: GoalList,b: GoalList) => a.order - b.order)
            .map((l: GoalList) => l.id);
          newSiblings.splice(destination.index, 0, draggableId);
          dispatch(listsReordered({ parentId: destinationParentId, orderedListIds: newSiblings }));
        }
        return;
      }

      if (type === "GOAL" || type === undefined) {
          const sourceListId = source.droppableId;
          const destinationListId = destination.droppableId;

          if (sourceListId === destinationListId) {
            const list = goalLists[sourceListId];
            if (!list) return;
            const reorderedInstanceIds = Array.from(list.itemInstanceIds);
            const [movedItem] = reorderedInstanceIds.splice(source.index, 1);
            reorderedInstanceIds.splice(destination.index, 0, movedItem);
            dispatch(
              goalOrderUpdated({
                listId: sourceListId,
                orderedInstanceIds: reorderedInstanceIds,
              }),
            );
          } else {
            dispatch(openDropActionMenu(result));
          }
      }
    },
    [dispatch, goalLists, allLists],
  );

  const [userPreference, setUserPreference] = useState<string>('system');
  const handleThemePreferenceChange = (pref: string) => setUserPreference(pref);
  const [obsidianVaultPath, setObsidianVaultPath] = useState('');
  const handleObsidianVaultChange = (path: string) => setObsidianVaultPath(path);

  useEffect(() => {
  }, []);

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
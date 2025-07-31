import React, { useCallback, useEffect, useState } from "react";
import "./styles.css";
import Layout from "./components/Layout";
import MainPanel from "./components/MainPanel";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import Sidebar from "./components/Sidebar";
import DropActionMenu from "./components/DropActionMenu";
import WifiSyncModal from "./components/WifiSyncModal";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "./store/store";
import { openDropActionMenu } from "./store/uiSlice";
import { openSyncModal } from "./store/syncSlice";
import {
  goalOrderUpdated,
  listMoved,
  listsReordered, // ✨ Імпортуємо новий екшен
} from "./store/listsSlice";
import { selectTopLevelLists, makeSelectChildLists } from "./store/selectors"; // ✨ Імпортуємо селектори

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { goalLists } = useSelector((state: RootState) => state.lists);
  const allLists = useSelector((state: RootState) => state.lists.goalLists);

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

        // ✨ ВИПРАВЛЕННЯ: Повністю нова логіка для обробки перетягування списків
        if (source.droppableId === destination.droppableId) {
          // --- Випадок 1: Зміна порядку в межах одного батька ---
          const parentId = source.droppableId === 'root' ? null : source.droppableId;
          const siblingLists = Object.values(allLists)
            .filter(l => l.parentId === parentId)
            .sort((a, b) => a.order - b.order);

          const reorderedIds = siblingLists.map(l => l.id);
          const [movedItem] = reorderedIds.splice(source.index, 1);
          reorderedIds.splice(destination.index, 0, movedItem);

          dispatch(listsReordered({ parentId, orderedListIds: reorderedIds }));

        } else {
          // --- Випадок 2: Переміщення до нового батька ---
          dispatch(listMoved({ listId: draggableId, newParentId: destinationParentId }));

          // Оновлюємо порядок у старому списку
          const oldSiblings = Object.values(allLists)
            .filter(l => l.parentId === sourceParentId && l.id !== draggableId)
            .sort((a,b) => a.order - b.order)
            .map(l => l.id);
          dispatch(listsReordered({ parentId: sourceParentId, orderedListIds: oldSiblings }));

          // Оновлюємо порядок у новому списку
          const newSiblings = Object.values(allLists)
            .filter(l => l.parentId === destinationParentId && l.id !== draggableId)
            .sort((a,b) => a.order - b.order)
            .map(l => l.id);
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

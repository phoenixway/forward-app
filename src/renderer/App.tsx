// src/renderer/App.tsx
import React, { useCallback, useEffect, useState } from "react";
import "./styles.css";
import Layout from "./components/Layout";
import MainPanel from "./components/MainPanel";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import Sidebar from "./components/Sidebar";
import { openDropActionMenu } from "./store/uiSlice";
import DropActionMenu from "./components/DropActionMenu";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "./store/store";
import {
  goalOrderUpdated,
  listMoved,
} from "./store/listsSlice";

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { goalLists } = useSelector((state: RootState) => state.lists);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, type, draggableId } = result;

      if (!destination) return;

      if (type === "LIST") {
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
          return;
        }
        if (destination.droppableId === draggableId) {
            return; // Prevent dropping a list onto itself
        }

        dispatch(
          listMoved({
            listId: draggableId,
            sourceParentId: source.droppableId === "root" ? null : source.droppableId,
            destinationParentId: destination.droppableId === "root" ? null : destination.droppableId,
            sourceIndex: source.index,
            destinationIndex: destination.index,
          }),
        );
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
    [dispatch, goalLists],
  );

  // Keep the rest of your App component's logic (theme, settings, etc.)
  // This part is simplified for brevity
  const [userPreference, setUserPreference] = useState<string>('system');
  const handleThemePreferenceChange = (pref: string) => setUserPreference(pref);
  const [obsidianVaultPath, setObsidianVaultPath] = useState('');
  const handleObsidianVaultChange = (path: string) => setObsidianVaultPath(path);
  
  useEffect(() => {
     // Your existing logic for theme, settings, etc.
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
    </>
  );
};

export default App;

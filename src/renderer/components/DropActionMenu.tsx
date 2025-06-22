// src/renderer/components/DropActionMenu.tsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { closeDropActionMenu } from "../store/uiSlice";
import { goalMoved, goalReferenceAdded, goalCopied } from "../store/listsSlice";

const DropActionMenu: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { isOpen, result } = useSelector((state: RootState) => state.ui);
  const goalInstances = useSelector(
    (state: RootState) => state.lists.goalInstances,
  );

  if (!isOpen || !result || !result.destination) {
    return null;
  }

  const { source, destination, draggableId: instanceId } = result;

  const sourceListId = source.droppableId;
  let destinationListId = destination.droppableId;

  // --- ВИПРАВЛЕННЯ: Додаємо обробку префікса "tab-" ---
  if (destination.droppableId.startsWith("sidebar-")) {
    destinationListId = destination.droppableId.substring("sidebar-".length);
  } else if (destination.droppableId.startsWith("tab-")) {
    destinationListId = destination.droppableId.substring("tab-".length);
  }
  // ----------------------------------------------------

  const handleAction = (action: "move" | "reference" | "copy") => {
    const originalGoalId = goalInstances[instanceId]?.goalId;

    switch (action) {
      case "move":
        dispatch(
          goalMoved({
            instanceId,
            sourceListId,
            destinationListId,
            destinationIndex: destination.index,
          }),
        );
        break;
      case "reference":
        if (originalGoalId) {
          dispatch(
            goalReferenceAdded({
              listId: destinationListId,
              goalId: originalGoalId,
            }),
          );
        }
        break;
      case "copy":
        if (originalGoalId) {
          dispatch(
            goalCopied({
              sourceGoalId: originalGoalId,
              destinationListId,
              destinationIndex: destination.index,
            }),
          );
        }
        break;
    }
    dispatch(closeDropActionMenu());
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center"
      onClick={() => dispatch(closeDropActionMenu())}
    >
      <div
        className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl w-full max-w-xs text-slate-800 dark:text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4 text-center">Виберіть дію</h3>
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => handleAction("move")}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Перемістити
          </button>
          <button
            onClick={() => handleAction("reference")}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-md"
          >
            Створити посилання
          </button>
          <button
            onClick={() => handleAction("copy")}
            className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md"
          >
            Створити копію
          </button>
          <button
            onClick={() => dispatch(closeDropActionMenu())}
            className="mt-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
          >
            Скасувати
          </button>
        </div>
      </div>
    </div>
  );
};

export default DropActionMenu;

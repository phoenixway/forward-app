// src/renderer/components/DropActionMenu.tsx
import React from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { closeDropActionMenu } from "../store/uiSlice";
import { goalMoved, goalReferenceAdded, goalCopied } from "../store/listsSlice";
import { Move, Copy, CopyPlus, X } from 'lucide-react';

const DropActionMenu: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isOpen, result } = useAppSelector((state) => state.ui);
  const goalInstances = useAppSelector((state) => state.lists.goalInstances);

  if (!isOpen || !result || !result.destination) {
    return null;
  }

  const { source, destination, draggableId: instanceId } = result;

  const sourceListId = source.droppableId;
  // Видаляємо префікси, щоб отримати чистий ID списку
  let destinationListId = destination.droppableId
    .replace('sidebar-list-', '')
    .replace('tab-', '');

  const handleAction = (action: "move" | "reference" | "copy") => {
    const originalGoalId = goalInstances[instanceId]?.goalId;
    if (!originalGoalId) {
        console.error("Не вдалося знайти оригінальну ціль для дії.");
        dispatch(closeDropActionMenu());
        return;
    }

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
        dispatch(
          goalReferenceAdded({
            listId: destinationListId,
            goalId: originalGoalId,
          }),
        );
        break;
      case "copy":
          dispatch(
            goalCopied({
              sourceGoalId: originalGoalId,
              destinationListId,
              destinationIndex: destination.index,
            }),
          );
        break;
    }
    dispatch(closeDropActionMenu());
  };

  const handleClose = () => dispatch(closeDropActionMenu());

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onMouseDown={handleClose}
    >
      <div
        className="relative bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-xs text-slate-800 dark:text-slate-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button onClick={handleClose} className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
          <X size={20} />
        </button>
        <h3 className="text-lg font-semibold mb-4 text-center">Виберіть дію</h3>
        <div className="space-y-3">
          <button onClick={() => handleAction('move')} className="w-full flex items-center p-3 rounded-md bg-slate-100 hover:bg-blue-100 dark:bg-slate-700 dark:hover:bg-blue-900/50 transition-colors">
              <Move className="mr-3 h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Перемістити сюди</span>
          </button>
          <button onClick={() => handleAction('reference')} className="w-full flex items-center p-3 rounded-md bg-slate-100 hover:bg-purple-100 dark:bg-slate-700 dark:hover:bg-purple-900/50 transition-colors">
              <Copy className="mr-3 h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>Створити посилання</span>
          </button>
          <button onClick={() => handleAction('copy')} className="w-full flex items-center p-3 rounded-md bg-slate-100 hover:bg-green-100 dark:bg-slate-700 dark:hover:bg-green-900/50 transition-colors">
              <CopyPlus className="mr-3 h-5 w-5 text-green-600 dark:text-green-400" />
              <span>Створити копію (клонувати)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DropActionMenu;
// src/renderer/components/AssociatedListsPopover.tsx
import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import {
  listAdded,
  goalAssociated,
  goalDisassociated,
} from "../store/listsSlice";
import type { Goal, GoalList } from "../types";
import { dispatchOpenGoalListEvent } from "./Sidebar";
import { X, Plus, Link2 as LinkIcon, Link2Off, Eye } from "lucide-react";

// --- ЗМІНА ТУТ ---
interface AssociatedListsPopoverProps {
  targetGoal: Goal;
  onClose: () => void;
  anchorEl: HTMLButtonElement | null; // <-- ДОДАНО ЦЕЙ РЯДОК
}

const AssociatedListsPopover: React.FC<AssociatedListsPopoverProps> = ({
  targetGoal,
  onClose,
  anchorEl, // <-- ДОДАНО ДО ПРОПСІВ
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const { associatedListDetails, availableListsToSelect } = useSelector(
    (state: RootState) => {
      const currentTargetGoal = state.lists.goals[targetGoal.id] || targetGoal;
      const associatedIds = new Set(currentTargetGoal.associatedListIds || []);

      const allLists = Object.values(state.lists.goalLists);

      const associatedDetails = allLists.filter((list: GoalList) =>
        associatedIds.has(list.id),
      );
      const availableLists = allLists.filter(
        (list: GoalList) => !associatedIds.has(list.id),
      );

      return {
        associatedListDetails: associatedDetails,
        availableListsToSelect: availableLists,
      };
    },
  );

  const [showCreateNewListForm, setShowCreateNewListForm] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [listIdToAssociateSelection, setListIdToAssociateSelection] =
    useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const newListInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    if (showCreateNewListForm && newListInputRef.current) {
      newListInputRef.current.focus();
    }
  }, [showCreateNewListForm]);

  const handleAssociateList = (selectedListId: string) => {
    if (!selectedListId) return;
    dispatch(goalAssociated({ goalId: targetGoal.id, listId: selectedListId }));
    setListIdToAssociateSelection("");
  };

  const handleDisassociateList = (listIdToDisassociate: string) => {
    dispatch(
      goalDisassociated({
        goalId: targetGoal.id,
        listId: listIdToDisassociate,
      }),
    );
  };

  const handleCreateAndAssociateList = () => {
    const trimmedName = newListName.trim();
    if (!trimmedName) {
      alert("Назва списку не може бути порожньою.");
      if (newListInputRef.current) newListInputRef.current.focus();
      return;
    }
    const newListAction = listAdded({ name: trimmedName });
    const newListId = newListAction.payload.id;

    dispatch(newListAction);
    dispatch(goalAssociated({ goalId: targetGoal.id, listId: newListId }));

    setShowCreateNewListForm(false);
    setNewListName("");
  };

  const handleOpenAssociatedList = (listId: string, listName: string) => {
    dispatchOpenGoalListEvent(listId, listName);
    onClose();
  };

  const buttonClass =
    "p-1 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none";
  const smallButtonClass = "px-2 py-1 text-xs rounded-md font-medium";

  return (
    <div
      ref={popoverRef}
      className="absolute z-20 mt-1 w-80 max-w-sm rounded-md shadow-xl bg-white dark:bg-slate-800 ring-1 ring-black dark:ring-slate-700 ring-opacity-5 focus:outline-none p-3
                 right-0 top-full transform translate-y-1 text-sm text-slate-800 dark:text-slate-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
        <h4
          className="font-semibold text-slate-900 dark:text-slate-100 truncate pr-2"
          title={`Для цілі: ${targetGoal.text}`}
        >
          Асоційовані списки
        </h4>
        <button
          onClick={onClose}
          className={`${buttonClass} hover:text-red-500 dark:hover:text-red-400`}
        >
          <X size={18} />
        </button>
      </div>

      <div className="mb-3">
        <h5 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
          Прив'язані списки:
        </h5>
        <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
          {associatedListDetails.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic px-1">
              Немає асоційованих списків.
            </p>
          )}
          {associatedListDetails.map((list) => (
            <div
              key={list.id}
              className="flex justify-between items-center py-1 group hover:bg-slate-50 dark:hover:bg-slate-700/60 px-1.5 rounded-md"
            >
              <span
                className="truncate flex-grow mr-2 cursor-pointer hover:underline"
                title={`Відкрити список: ${list.name}`}
                onClick={() => handleOpenAssociatedList(list.id, list.name)}
              >
                {list.name}
              </span>
              <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenAssociatedList(list.id, list.name)}
                  title="Відкрити список"
                  className={`${buttonClass} hover:text-blue-500 dark:hover:text-blue-400`}
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleDisassociateList(list.id)}
                  title="Відв'язати цей список"
                  className={`${buttonClass} hover:text-orange-500 dark:hover:text-orange-400`}
                >
                  <Link2Off size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!showCreateNewListForm && availableListsToSelect.length > 0 && (
        <div className="mb-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <label
            htmlFor="associate-list-select"
            className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
          >
            Прив'язати існуючий список:
          </label>
          <div className="flex space-x-2">
            <select
              id="associate-list-select"
              value={listIdToAssociateSelection}
              onChange={(e) => setListIdToAssociateSelection(e.target.value)}
              className="flex-grow block w-full pl-2 pr-7 py-1.5 text-xs border-slate-300 dark:border-slate-600
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                         focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400
                         focus:border-indigo-500 dark:focus:border-indigo-400 rounded-md"
            >
              <option value="">Виберіть список...</option>
              {availableListsToSelect.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleAssociateList(listIdToAssociateSelection)}
              disabled={!listIdToAssociateSelection}
              className={`${smallButtonClass} bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center`}
            >
              <LinkIcon size={14} className="mr-1" /> Зв'язати
            </button>
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
        {showCreateNewListForm ? (
          <div>
            <label
              htmlFor="new-associated-list-name"
              className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1"
            >
              Назва нового списку для прив'язки:
            </label>
            <input
              ref={newListInputRef}
              id="new-associated-list-name"
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Наприклад, 'Кроки для підцілі'"
              className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-xs mb-2
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                         focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateAndAssociateList();
                if (e.key === "Escape") {
                  setShowCreateNewListForm(false);
                  setNewListName("");
                }
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCreateNewListForm(false);
                  setNewListName("");
                }}
                className={`${smallButtonClass} bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-500`}
              >
                Скасувати
              </button>
              <button
                onClick={handleCreateAndAssociateList}
                className={`${smallButtonClass} bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700 flex items-center`}
              >
                <Plus size={14} className="mr-1" /> Створити і зв'язати
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateNewListForm(true)}
            className="w-full text-left px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-md text-xs text-green-600 dark:text-green-400 font-medium flex items-center"
          >
            <Plus size={14} className="mr-1.5" /> Створити новий список та
            прив'язати
          </button>
        )}
      </div>
    </div>
  );
};

export default AssociatedListsPopover;
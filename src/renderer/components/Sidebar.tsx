// src/renderer/components/Sidebar.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { dispatchOpenSettingsEvent } from "../events";
import type { Goal, GoalList } from "../types";
import {
  Plus,
  Edit3,
  Trash2,
  Settings,
  Search,
  X as XIcon,
} from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { listAdded, listRemoved, listUpdated } from "../store/listsSlice";
import { selectAllLists } from "../store/selectors";
import GlobalSearch from "./GlobalSearch"; // Ваш файл вже мав цей імпорт, це чудово.

export const OPEN_GOAL_LIST_EVENT = "app:open-goal-list";
export const MAIN_PANEL_REFRESH_CONTENT = "app:main-panel-refresh-content";

export interface OpenGoalListDetail {
  listId: string;
  listName: string;
}

export function dispatchOpenGoalListEvent(listId: string, listName: string) {
  window.dispatchEvent(
    new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
      detail: { listId, listName },
    }),
  );
}

function Sidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const allLists = useSelector(selectAllLists);

  const [filteredLists, setFilteredLists] = useState<GoalList[]>([]);
  const [filterText, setFilterText] = useState("");

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");

  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");

  const newListInputRef = useRef<HTMLInputElement>(null);
  const editNameInputRef = useRef<HTMLInputElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!filterText.trim()) {
      setFilteredLists(allLists);
    } else {
      const lowercasedFilter = filterText.toLowerCase();
      setFilteredLists(
        allLists.filter((list) =>
          list.name.toLowerCase().includes(lowercasedFilter),
        ),
      );
    }
  }, [allLists, filterText]);

  useEffect(() => {
    if (isCreatingNewList && newListInputRef.current) {
      newListInputRef.current.focus();
    } else if (editingListId && editNameInputRef.current) {
      editNameInputRef.current.focus();
    }
  }, [isCreatingNewList, editingListId]);

  const handleOpenSettings = () => dispatchOpenSettingsEvent();
  const handleOpenGoalList = (list: GoalList) =>
    dispatchOpenGoalListEvent(list.id, list.name);

  const handleCreateNewListClick = () => {
    setIsCreatingNewList(true);
    setNewListName("");
    setNewListDescription("");
    setFilterText("");
  };

  const submitNewList = () => {
    const trimmedName = newListName.trim();
    if (trimmedName) {
      const listExists = allLists.some(
        (list) => list.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (listExists) {
        alert(`Список з назвою "${trimmedName}" вже існує.`);
        return;
      }
      dispatch(
        listAdded({
          name: trimmedName,
          description: newListDescription.trim(),
        }),
      );
      setIsCreatingNewList(false);
    } else {
      setIsCreatingNewList(false);
    }
  };

  const handleStartEdit = (list: GoalList) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
    setEditingListDescription(list.description || "");
    setFilterText("");
  };

  const handleCancelEdit = () => {
    setEditingListId(null);
    setEditingListName("");
    setEditingListDescription("");
  };

  const submitRenameList = (listId: string) => {
    const trimmedName = editingListName.trim();
    if (trimmedName && listId) {
      const listExists = allLists.some(
        (list) =>
          list.id !== listId &&
          list.name.toLowerCase() === trimmedName.toLowerCase(),
      );
      if (listExists) {
        alert(`Список з назвою "${trimmedName}" вже існує.`);
        return;
      }
      dispatch(
        listUpdated({
          id: listId,
          name: trimmedName,
          description: editingListDescription.trim(),
        }),
      );
      handleCancelEdit();
    } else {
      handleCancelEdit();
    }
  };

  const handleDeleteList = (listId: string, listName: string) => {
    if (window.confirm(`Видалити список "${listName}"?`)) {
      dispatch(listRemoved(listId));
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value);
  };

  const clearFilter = () => {
    setFilterText("");
    filterInputRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900">
      {/* --- 1. ГЛОБАЛЬНИЙ ПОШУК ДОДАНО СЮДИ --- */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <GlobalSearch />
      </div>

      {/* --- 2. Весь ваш існуючий контент обгорнуто в цей div --- */}
      <div className="p-4 flex-grow flex flex-col overflow-y-auto">
        <div className="mb-3 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Списки Цілей
          </h3>
          <button
            onClick={handleCreateNewListClick}
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Створити новий список"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="mb-3 relative flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <input
            ref={filterInputRef}
            type="text"
            placeholder="Фільтрувати списки..."
            value={filterText}
            onChange={handleFilterChange}
            className="w-full pl-9 pr-8 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
          />
          {filterText && (
            <button
              onClick={clearFilter}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              title="Очистити фільтр"
            >
              <XIcon size={16} />
            </button>
          )}
        </div>

        {isCreatingNewList && (
          <div className="mb-3 p-2.5 border border-blue-300 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-slate-800 shadow-sm flex-shrink-0">
            <input
              ref={newListInputRef}
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Назва нового списку"
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm mb-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitNewList();
                }
                if (e.key === "Escape") setIsCreatingNewList(false);
              }}
            />
            <textarea
              value={newListDescription}
              onChange={(e) => setNewListDescription(e.target.value)}
              placeholder="Опис списку (опціонально)"
              rows={2}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs mb-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500 min-h-[40px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.shiftKey) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitNewList();
                }
                if (e.key === "Escape") setIsCreatingNewList(false);
              }}
            />
            <div className="flex justify-end space-x-2 mt-1">
              <button
                onClick={() => setIsCreatingNewList(false)}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Скасувати
              </button>
              <button
                onClick={submitNewList}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-600/50"
              >
                Створити
              </button>
            </div>
          </div>
        )}

        <div className="flex-grow space-y-0.5 -mr-2 pr-2 custom-scrollbar overflow-y-auto">
          {filteredLists.length === 0 && !isCreatingNewList && (
            <div className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">
              {filterText.trim()
                ? "Списків за фільтром не знайдено."
                : "Списки не знайдено."}
            </div>
          )}
          {filteredLists.map((list) => (
            <Droppable
              key={`sidebar-drop-${list.id}`}
              droppableId={`sidebar-${list.id}`}
              type="GOAL"
            >
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`group rounded-md transition-colors duration-100 ${snapshot.isDraggingOver ? "bg-green-100 dark:bg-green-700/50 ring-1 ring-green-500" : editingListId === list.id ? "" : "hover:bg-slate-200 dark:hover:bg-slate-700/60"}`}
                >
                  {editingListId === list.id ? (
                    <div className="p-2 border border-blue-400 dark:border-blue-600 rounded-md bg-white dark:bg-slate-800 shadow">
                      <input
                        ref={editNameInputRef}
                        type="text"
                        value={editingListName}
                        onChange={(e) => setEditingListName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm mb-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            submitRenameList(list.id);
                          }
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <textarea
                        value={editingListDescription}
                        onChange={(e) => setEditingListDescription(e.target.value)}
                        placeholder="Опис списку (опціонально)"
                        rows={2}
                        className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-xs mb-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500 min-h-[40px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.shiftKey) return;
                          if (e.key === "Enter") {
                            e.preventDefault();
                            submitRenameList(list.id);
                          }
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <div className="flex justify-end space-x-2 mt-1">
                        <button
                          onClick={handleCancelEdit}
                          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          Скасувати
                        </button>
                        <button
                          onClick={() => submitRenameList(list.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-600/50"
                        >
                          Зберегти
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between p-1.5 rounded-md cursor-pointer"
                      onClick={() => handleOpenGoalList(list)}
                    >
                      <span
                        className="text-slate-700 dark:text-slate-300 text-sm truncate flex-grow mr-2"
                        title={list.name}
                      >
                        {list.name}
                      </span>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 space-x-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEdit(list); }}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                          title="Редагувати список"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id, list.name); }}
                          className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 focus:outline-none rounded hover:bg-red-100 dark:hover:bg-red-600/50"
                          title="Видалити список"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-300 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={handleOpenSettings}
            className="w-full inline-flex justify-center items-center rounded-md bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-blue-400 focus-visible:ring-opacity-75"
          >
            <Settings size={16} className="mr-2" /> Налаштування
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

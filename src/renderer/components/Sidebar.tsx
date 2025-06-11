// src/renderer/components/Sidebar.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { dispatchOpenSettingsEvent } from '../events';
import * as goalListStore from '../data/goalListsStore';
import type { GoalList } from '../data/goalListsStore';
import { Plus, Edit3, Trash2 } from 'lucide-react'; // Іконки

export const OPEN_GOAL_LIST_EVENT = 'app:open-goal-list';
export interface OpenGoalListDetail {
  listId: string;
  listName: string;
}

export function dispatchOpenGoalListEvent(listId: string, listName: string) {
  window.dispatchEvent(new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, { 
    detail: { listId, listName } 
  }));
}

function Sidebar() {
  const [lists, setLists] = useState<GoalList[]>([]);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState('');

  const loadLists = useCallback(() => {
    setLists(goalListStore.getAllGoalLists());
  }, []);

  useEffect(() => { loadLists(); }, [loadLists]);

  const handleOpenSettings = () => dispatchOpenSettingsEvent();
  const handleOpenGoalList = (listId: string, listName: string) => dispatchOpenGoalListEvent(listId, listName);

  const handleCreateNewList = () => {
    setIsCreatingNewList(true);
    setNewListName('');
  };

  const submitNewList = () => {
    if (newListName.trim()) {
      try {
        goalListStore.createGoalList(newListName.trim());
        loadLists();
        setIsCreatingNewList(false);
        setNewListName('');
      } catch (error) { alert((error as Error).message); }
    } else {
        setIsCreatingNewList(false);
    }
  };

  const handleStartEdit = (list: GoalList) => {
    setEditingListId(list.id);
    setEditingListName(list.name);
  };

  const handleCancelEdit = () => {
    setEditingListId(null);
    setEditingListName('');
  };

  const submitRenameList = (listId: string) => {
    if (editingListName.trim() && listId) {
      try {
        goalListStore.updateGoalListName(listId, editingListName.trim());
        loadLists();
        handleCancelEdit();
      } catch (error) { alert((error as Error).message); }
    } else {
        handleCancelEdit();
    }
  };

  const handleDeleteList = (listId: string, listName: string) => {
    if (window.confirm(`Ви впевнені, що хочете видалити список "${listName}"?`)) {
      goalListStore.deleteGoalList(listId);
      loadLists();
    }
  };

  return (
    // Фон для Sidebar вже встановлено в Layout.tsx (bg-slate-100 dark:bg-slate-900)
    // Текст також (text-slate-800 dark:text-slate-200)
    <div className="p-4 h-full flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Списки Цілей</h3>
        <button
          onClick={handleCreateNewList}
          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          title="Створити новий список"
        >
          <Plus size={20} />
        </button>
      </div>

      {isCreatingNewList && (
        <div className="mb-3 p-2.5 border border-blue-300 dark:border-blue-700 rounded-md bg-blue-50 dark:bg-slate-800 shadow-sm">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Назва нового списку"
            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm mb-2 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                       focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNewList();
              if (e.key === 'Escape') setIsCreatingNewList(false);
            }}
          />
          <div className="flex justify-end space-x-2 mt-1">
            <button onClick={() => setIsCreatingNewList(false)} className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">Скасувати</button>
            <button onClick={submitNewList} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-600/50">Створити</button>
          </div>
        </div>
      )}

      <ul className="overflow-y-auto flex-grow space-y-0.5 -mr-2 pr-2"> {/* -mr-2 pr-2 для компенсації ширини скролбару */}
        {lists.length === 0 && !isCreatingNewList && (
          <li className="text-slate-500 dark:text-slate-400 text-sm text-center py-4">Списки не знайдено.</li>
        )}
        {lists.map((list) => (
          <li key={list.id} className="group rounded-md hover:bg-slate-200 dark:hover:bg-slate-700/60 transition-colors duration-100">
            {editingListId === list.id ? (
              <div className="p-2 border border-blue-400 dark:border-blue-600 rounded-md bg-white dark:bg-slate-800 shadow">
                <input
                  type="text"
                  value={editingListName}
                  onChange={(e) => setEditingListName(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded text-sm mb-2
                             bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                             focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRenameList(list.id);
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <div className="flex justify-end space-x-2 mt-1">
                  <button onClick={handleCancelEdit} className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">Скасувати</button>
                  <button onClick={() => submitRenameList(list.id)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-600/50">Зберегти</button>
                </div>
              </div>
            ) : (
              <div 
                className="flex items-center justify-between p-1.5 rounded-md cursor-pointer" // hover ефект тепер на батьківському li
                onClick={() => handleOpenGoalList(list.id, list.name)}
              >
                <span className="text-slate-700 dark:text-slate-300 text-sm truncate flex-grow mr-2" title={list.name}>
                  {list.name}
                </span>
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 space-x-0.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(list); }} 
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none rounded hover:bg-slate-300 dark:hover:bg-slate-600" 
                    title="Перейменувати"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id, list.name); }} 
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 focus:outline-none rounded hover:bg-red-100 dark:hover:bg-red-600/50" 
                    title="Видалити"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      
      <div className="mt-auto pt-4 border-t border-slate-300 dark:border-slate-700">
        <button
          onClick={handleOpenSettings}
          className="w-full inline-flex justify-center items-center rounded-md 
                     bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white 
                     hover:bg-blue-700 dark:hover:bg-blue-600 
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 focus-visible:ring-opacity-75"
        >
          Налаштування
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
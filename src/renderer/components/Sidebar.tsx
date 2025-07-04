// src/renderer/components/Sidebar.tsx
import React, { useState } from "react";
import { dispatchOpenSettingsEvent } from "../events";
import type { GoalList } from "../types";
import { Plus, Edit3, Trash2, Settings, ChevronDown, ChevronRight, Scissors, ClipboardPaste } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { listAdded, listRemoved, listUpdated, listMoved } from "../store/listsSlice"; // Припускаємо, що listMoved обробляє переміщення
import { selectTopLevelLists } from "../store/selectors";
import GlobalSearch from "./GlobalSearch";

export const OPEN_GOAL_LIST_EVENT = "app:open-goal-list";

export interface OpenGoalListDetail {
  listId: string;
  listName: string;
}

export function dispatchOpenGoalListEvent(listId: string, listName: string) {
  window.dispatchEvent(new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, { detail: { listId, listName } }));
}

// --- НОВІ ПРОПИ ДЛЯ CUT/PASTE ---
interface SidebarListItemProps {
  listId: string;
  level: number;
  onStartEdit: (list: GoalList) => void;
  onDelete: (id: string, name: string) => void;
  cutListId: string | null;
  onCut: (id: string) => void;
  onPaste: (targetListId: string, asChild: boolean) => void;
}

const SidebarListItem: React.FC<SidebarListItemProps> = ({ listId, level, onStartEdit, onDelete, cutListId, onCut, onPaste }) => {
  const list = useSelector((state: RootState) => state.lists.goalLists[listId]);
  const [isExpanded, setIsExpanded] = useState(true);

  if (!list) return null;

  const handleOpenGoalList = () => dispatchOpenGoalListEvent(list.id, list.name);
  const hasChildren = list.childListIds && list.childListIds.length > 0;
  const isCut = cutListId === list.id;

  return (
    // Вся логіка Draggable та Droppable видалена
    <div className={`rounded-md my-px ${isCut ? 'opacity-50 bg-yellow-100 dark:bg-yellow-900/30' : ''}`}>
      <div
        className="group flex items-center justify-between p-1 rounded-md cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/60"
        style={{ paddingLeft: `${level * 12 + 4}px` }} // ЗМЕНШЕНО ВІДСТУП
        onClick={handleOpenGoalList}
      >
        <div className="flex items-center flex-grow truncate mr-2">
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
              className="p-0.5 mr-1 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 flex-shrink-0"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[18px] mr-1 flex-shrink-0"></span> // Зменшено розмір
          )}
          <span className="text-slate-700 dark:text-slate-300 text-sm truncate" title={list.name}>
            {list.name}
          </span>
        </div>
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 space-x-0.5">
          {/* --- НОВЕ МЕНЮ CUT/PASTE --- */}
          {cutListId && cutListId !== list.id && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onPaste(list.id, false); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 rounded" title="Вставити як сусіда">
                <ClipboardPaste size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onPaste(list.id, true); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 rounded" title="Вставити як дочірній">
                <ClipboardPaste size={14} className="ml-[-4px]" style={{ clipPath: 'inset(50% 0 0 0)' }}/>
              </button>
            </>
          )}
          <button onClick={(e) => { e.stopPropagation(); onCut(list.id); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-500 rounded" title="Вирізати">
            <Scissors size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onStartEdit(list); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded" title="Редагувати">
            <Edit3 size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(list.id, list.name); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 rounded" title="Видалити">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Вкладені елементи без Droppable */}
      {isExpanded && hasChildren && (
        <div
          className="transition-all duration-150 rounded-b-md"
        >
          {list.childListIds.map((childId) => (
            <SidebarListItem
              key={childId}
              listId={childId}
              level={level + 1}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              cutListId={cutListId}
              onCut={onCut}
              onPaste={onPaste}
            />
          ))}
        </div>
      )}
    </div>
  );
};

function Sidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const topLevelLists = useSelector(selectTopLevelLists);
  const allLists = useSelector((state: RootState) => state.lists.goalLists);

  const [editingList, setEditingList] = useState<GoalList | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [cutListId, setCutListId] = useState<string | null>(null); // Стан для вирізаного списку

  const handleStartEdit = (list: GoalList) => {
    setEditingList(list);
    setEditingListName(list.name);
    setEditingListDescription(list.description || "");
  };

  const handleCancelEdit = () => setEditingList(null);

  const submitRenameList = () => {
    if (editingList && editingListName.trim()) {
      dispatch(listUpdated({ id: editingList.id, name: editingListName.trim(), description: editingListDescription.trim() }));
    }
    handleCancelEdit();
  };

  const handleDeleteList = (listId: string, listName: string) => {
    if (window.confirm(`Видалити список "${listName}" та всі вкладені списки?`)) {
      dispatch(listRemoved(listId));
    }
  };

  const submitNewList = () => {
    if (newListName.trim()) {
      dispatch(listAdded({ name: newListName.trim(), parentId: null }));
      setNewListName("");
      setIsCreatingNewList(false);
    }
  };

  const handleCut = (id: string) => {
    setCutListId(id);
  };

  const handlePaste = (targetListId: string, asChild: boolean) => {
    if (!cutListId) return;

    const cutList = allLists[cutListId];
    const targetList = allLists[targetListId];
    if (!cutList || !targetList) return;

    // Запобігання вставці батька в свого нащадка
    let currentParentId = targetList.parentId;
    while (currentParentId) {
      if (currentParentId === cutListId) {
        alert("Неможливо вставити батьківський список у дочірній.");
        return;
      }
      currentParentId = allLists[currentParentId]?.parentId;
    }
    if (targetListId === cutListId) return;


    const destinationParentId = asChild ? targetListId : targetList.parentId;
    const destinationList = asChild ? targetList.childListIds : (targetList.parentId ? allLists[targetList.parentId].childListIds : topLevelLists.map(l => l.id));
    const destinationIndex = asChild ? targetList.childListIds.length : destinationList.indexOf(targetListId) + 1;

    dispatch(listMoved({
      listId: cutListId,
      sourceParentId: cutList.parentId,
      // Ми не маємо індексів, тому передаємо null і розраховуємо на логіку в slice
      sourceIndex: -1,
      destinationParentId: destinationParentId,
      destinationIndex: destinationIndex,
    }));

    setCutListId(null);
  };

  const renderEditForm = () => {
    if (!editingList) return null;
    return (
     <div className="p-2 my-1 border border-blue-400 dark:border-blue-600 rounded-md bg-white dark:bg-slate-800 shadow">
        <input type="text" value={editingListName} onChange={(e) => setEditingListName(e.target.value)} className="w-full text-sm p-2 mb-2 border rounded" onKeyDown={(e) => e.key === 'Enter' && submitRenameList()} autoFocus />
        <textarea value={editingListDescription} onChange={(e) => setEditingListDescription(e.target.value)} rows={2} className="w-full text-xs p-2 mb-2 border rounded" />
        <div className="flex justify-end space-x-2">
            <button onClick={handleCancelEdit} className="px-3 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500">Скасувати</button>
            <button onClick={submitRenameList} className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white">Зберегти</button>
        </div>
    </div>
    )
  };

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900">
      <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        <GlobalSearch />
      </div>

      <div className="p-4 flex-shrink-0">
        <div className="mb-3 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Списки</h3>
          <button onClick={() => setIsCreatingNewList(true)} className="p-1.5 text-slate-500 hover:text-blue-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><Plus size={20} /></button>
        </div>
        {isCreatingNewList && (
           <div className="mb-3 p-2 border rounded-md bg-white dark:bg-slate-800">
             <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Назва нового списку" onKeyDown={e => e.key === 'Enter' && submitNewList()} className="w-full p-2 mb-2 border rounded" autoFocus />
             <div className="flex justify-end space-x-2">
                <button onClick={() => setIsCreatingNewList(false)} className="px-3 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500">Скасувати</button>
                <button onClick={submitNewList} className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white">Створити</button>
             </div>
           </div>
        )}
        {editingList && renderEditForm()}
      </div>

      {/* Контейнер списків без Droppable, але з прокруткою */}
      <div className="flex-grow min-h-0 px-2 overflow-y-auto custom-scrollbar">
          <div className="p-1">
            {topLevelLists.map((list) =>
                <SidebarListItem
                  key={list.id}
                  listId={list.id}
                  level={0}
                  onStartEdit={handleStartEdit}
                  onDelete={handleDeleteList}
                  cutListId={cutListId}
                  onCut={handleCut}
                  onPaste={handlePaste}
                />
            )}
            {/* Кнопка для вставки в корінь */}
            {cutListId && (
              <button
                onClick={() => handlePaste(topLevelLists[topLevelLists.length - 1]?.id, false)}
                className="w-full text-left mt-2 p-2 text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md"
              >
                Вставити в корінь...
              </button>
            )}
          </div>
      </div>

      <div className="p-4 mt-auto border-t border-slate-300 dark:border-slate-700 flex-shrink-0">
          <button onClick={dispatchOpenSettingsEvent} className="w-full flex items-center justify-center p-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"><Settings size={16} className="mr-2" /> Налаштування</button>
      </div>
    </div>
  );
}

export default Sidebar;
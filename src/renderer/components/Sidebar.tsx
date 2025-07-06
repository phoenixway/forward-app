// src/renderer/components/Sidebar.tsx
import React, { useState, useMemo } from "react";
import { dispatchOpenSettingsEvent } from "../events";
import type { GoalList } from "../types";
import { Plus, Edit3, Trash2, Settings, ChevronDown, ChevronRight, GripVertical, Scissors, ClipboardPaste } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import { listAdded, listRemoved, listUpdated, listMoved } from "../store/listsSlice";
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

interface SidebarListItemProps {
  listId: string;
  index: number;
  level: number;
  onStartEdit: (list: GoalList) => void;
  onDelete: (id: string, name: string) => void;
  cutListId: string | null;
  onCut: (id: string) => void;
  onPaste: (targetListId: string, asChild: boolean) => void;
  filterTerm: string;
}

// Рекурсивна функція для перевірки чи список або його діти відповідають фільтру
const listMatchesFilter = (list: GoalList, allLists: Record<string, GoalList>, filterTerm: string): boolean => {
  if (!filterTerm.trim()) return true;
  
  const lowercaseFilter = filterTerm.toLowerCase();
  
  // Перевіряємо чи сам список відповідає фільтру
  if (list.name.toLowerCase().includes(lowercaseFilter)) {
    return true;
  }
  
  // Перевіряємо чи якась з дочірніх списків відповідає фільтру
  if (list.childListIds && list.childListIds.length > 0) {
    return list.childListIds.some(childId => {
      const childList = allLists[childId];
      return childList && listMatchesFilter(childList, allLists, filterTerm);
    });
  }
  
  return false;
};

const SidebarListItem: React.FC<SidebarListItemProps> = ({ 
  listId, 
  index, 
  level, 
  onStartEdit, 
  onDelete, 
  cutListId, 
  onCut, 
  onPaste, 
  filterTerm 
}) => {
  const list = useSelector((state: RootState) => state.lists.goalLists[listId]);
  const allLists = useSelector((state: RootState) => state.lists.goalLists);
  const [isExpanded, setIsExpanded] = useState(true);

  // Фільтруємо дочірні списки
  const filteredChildIds = useMemo(() => {
    if (!list?.childListIds || !filterTerm.trim()) {
      return list?.childListIds || [];
    }
    
    // Показуємо дочірні списки, які відповідають фільтру (включно з їх дочірніми)
    return list.childListIds.filter(childId => {
      const childList = allLists[childId];
      return childList && listMatchesFilter(childList, allLists, filterTerm);
    });
  }, [list?.childListIds, filterTerm, allLists]);

  if (!list) return null;

  const handleOpenGoalList = () => dispatchOpenGoalListEvent(list.id, list.name);
  const hasChildren = list.childListIds && list.childListIds.length > 0;
  const hasFilteredChildren = filteredChildIds.length > 0;
  const isCut = cutListId === list.id;

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-md my-px transition-opacity ${snapshot.isDragging ? 'bg-blue-100 dark:bg-blue-900/50 shadow-lg' : ''} ${isCut ? 'opacity-50' : 'opacity-100'}`}
        >
          <Droppable droppableId={`sidebar-${list.id}`} type="GOAL">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`p-1 rounded-md transition-colors ${dropSnapshot.isDraggingOver ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-400' : ''}`}
              >
                <div
                  className="group flex items-center justify-between"
                  style={{ paddingLeft: `${level * 12}px` }}
                >
                  <div {...provided.dragHandleProps} className="p-1 opacity-50 group-hover:opacity-100 cursor-grab">
                    <GripVertical size={14} />
                  </div>

                  <div className="flex items-center flex-grow truncate mr-2" onClick={handleOpenGoalList}>
                    {hasChildren ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                        className="p-0.5 mr-1 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 flex-shrink-0"
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    ) : (
                      <span className="w-[18px] mr-1 flex-shrink-0"></span>
                    )}
                    <span className="text-slate-700 dark:text-slate-300 text-sm cursor-pointer" title={list.name}>
                      {list.name}
                    </span>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 space-x-0.5">
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
              </div>
            )}
          </Droppable>

          {isExpanded && hasFilteredChildren && (
            <Droppable droppableId={list.id} type="LIST">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`transition-all duration-150 rounded-b-md ${snapshot.isDraggingOver ? 'bg-purple-100 dark:bg-purple-700/20' : ''}`}
                  style={{ minHeight: '8px' }}
                >
                  {filteredChildIds.map((childId, childIndex) => (
                    <SidebarListItem
                      key={childId}
                      listId={childId}
                      index={childIndex}
                      level={level + 1}
                      onStartEdit={onStartEdit}
                      onDelete={onDelete}
                      cutListId={cutListId}
                      onCut={onCut}
                      onPaste={onPaste}
                      filterTerm={filterTerm}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>
      )}
    </Draggable>
  );
};

function Sidebar() {
  const dispatch = useDispatch<AppDispatch>();
  const allTopLevelLists = useSelector(selectTopLevelLists);
  const allLists = useSelector((state: RootState) => state.lists.goalLists);

  const [filterTerm, setFilterTerm] = useState("");
  const [editingList, setEditingList] = useState<GoalList | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [cutListId, setCutListId] = useState<string | null>(null);

  // Покращена фільтрація верхнього рівня з урахуванням дочірніх списків
  const filteredLists = useMemo(() => {
    if (!filterTerm.trim()) {
      return allTopLevelLists;
    }
    
    // Показуємо списки верхнього рівня, які відповідають фільтру або мають дочірні списки, що відповідають
    return allTopLevelLists.filter(list => 
      listMatchesFilter(list, allLists, filterTerm)
    );
  }, [allTopLevelLists, filterTerm, allLists]);

  const handleStartEdit = (list: GoalList) => {
    setEditingList(list);
    setEditingListName(list.name);
    setEditingListDescription(list.description || "");
  };

  const handleCancelEdit = () => {
    setEditingList(null);
    setEditingListName("");
    setEditingListDescription("");
  };

  const submitRenameList = () => {
    if (editingList && editingListName.trim()) {
      dispatch(listUpdated({ id: editingList.id, name: editingListName.trim(), description: editingListDescription.trim() }));
    }
    handleCancelEdit();
  };

  const handleDeleteList = (listId: string, listName: string) => {
    if (window.confirm(`Видалити список "${listName}" та всі вкладені списки?`)) {
      dispatch(listRemoved(listId));
      if (cutListId === listId) {
        setCutListId(null);
      }
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
    if (targetListId === cutListId) return;

    const cutList = allLists[cutListId];
    const targetList = allLists[targetListId];
    if (!cutList || !targetList) return;

    let currentParentId = asChild ? targetListId : targetList.parentId;
    while (currentParentId) {
      if (currentParentId === cutListId) {
        alert("Неможливо вставити батьківський список у дочірній.");
        return;
      }
      currentParentId = allLists[currentParentId]?.parentId;
    }

    const destinationParentId = asChild ? targetListId : targetList.parentId;
    const parentOfTarget = targetList.parentId ? allLists[targetList.parentId] : null;
    const siblingIds = parentOfTarget ? parentOfTarget.childListIds : allTopLevelLists.map(l => l.id);
    const destinationIndex = asChild ? targetList.childListIds.length : siblingIds.indexOf(targetListId) + 1;

    dispatch(listMoved({
      listId: cutListId,
      sourceParentId: cutList.parentId,
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
        <GlobalSearch value={filterTerm} onFilterChange={setFilterTerm} />
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

      <div className="flex-grow px-2 min-h-0 overflow-y-auto custom-scrollbar">
          <Droppable
            key={filterTerm ? 'filtered-lists' : 'all-lists'}
            droppableId="root"
            type="LIST"
          >
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`transition-colors min-h-full p-1 rounded-md ${snapshot.isDraggingOver ? 'bg-purple-100 dark:bg-purple-900/30' : ''}`}
              >
                {filteredLists.map((list, index) =>
                    <SidebarListItem
                      key={list.id}
                      listId={list.id}
                      index={index}
                      level={0}
                      onStartEdit={handleStartEdit}
                      onDelete={handleDeleteList}
                      cutListId={cutListId}
                      onCut={handleCut}
                      onPaste={handlePaste}
                      filterTerm={filterTerm}
                    />
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
      </div>

      <div className="p-4 mt-auto border-t border-slate-300 dark:border-slate-700 flex-shrink-0">
          <button onClick={dispatchOpenSettingsEvent} className="w-full flex items-center justify-center p-2 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"><Settings size={16} className="mr-2" /> Налаштування</button>
      </div>
    </div>
  );
}

export default Sidebar;
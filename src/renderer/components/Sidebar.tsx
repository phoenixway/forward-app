// src/renderer/components/Sidebar.tsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { dispatchOpenGoalListEvent, SIDEBAR_CREATE_NEW_LIST_EVENT } from "../events";
import type { GoalList } from "../types";
import { Plus, Edit3, Trash2, ChevronDown, ChevronRight, CornerDownRight, Scissors, ClipboardPaste, ArrowUp, ArrowDown } from "lucide-react";
import { Droppable } from "@hello-pangea/dnd";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { listAdded, listRemoved, listUpdated, listMoved, listExpansionToggled, listsReordered } from "../store/listsSlice";
import { selectTopLevelLists, makeSelectChildLists } from "../store/selectors";
import GlobalSearch from "./GlobalSearch";
import { nanoid } from "@reduxjs/toolkit";

interface SidebarListItemProps {
  listId: string;
  isFirst: boolean;
  isLast: boolean;
  level: number;
  onMoveUp: (listId: string) => void;
  onMoveDown: (listId: string) => void;
  onStartEdit: (list: GoalList) => void;
  onDelete: (id: string, name: string) => void;
  onAddChild: (parentId: string) => void;
  cutListId: string | null;
  onCut: (id: string) => void;
  onPaste: (targetListId: string, asChild: boolean) => void;
}

const SidebarListItem: React.FC<SidebarListItemProps> = ({
  listId,
  isFirst,
  isLast,
  level,
  onMoveUp,
  onMoveDown,
  onStartEdit,
  onDelete,
  onAddChild,
  cutListId,
  onCut,
  onPaste
}) => {
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.lists.goalLists[listId]);
  const childLists = useAppSelector((state) => makeSelectChildLists()(state, listId));

  if (!list) return null;

  const isExpanded = list.isExpanded ?? true;
  const handleOpenGoalList = () => dispatchOpenGoalListEvent(list.id, list.name);
  const hasChildren = childLists.length > 0;
  const isCut = cutListId === list.id;
  
  const handleMoveUp = (e: React.MouseEvent) => { e.stopPropagation(); onMoveUp(listId); };
  const handleMoveDown = (e: React.MouseEvent) => { e.stopPropagation(); onMoveDown(listId); };

  return (
    <div className={`my-px relative ${isCut ? 'opacity-50' : ''}`}>
      <Droppable droppableId={`sidebar-list-${listId}`} type="GOAL">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            // Клас `group` тепер тут, на самому рядку
            className={`group flex items-center p-1 rounded-md transition-colors min-h-[32px] 
              ${snapshot.isDraggingOver 
                ? 'bg-green-100 dark:bg-green-800/40 ring-1 ring-green-500' 
                : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            style={{ paddingLeft: `${level * 16}px` }}
            onClick={handleOpenGoalList}
          >
            <div className="flex items-center flex-grow truncate mr-2">
              {hasChildren ? (
                <button
                  onClick={(e) => { e.stopPropagation(); dispatch(listExpansionToggled({ listId: list.id })); }}
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
            <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 space-x-0.5">
              <button onClick={handleMoveUp} disabled={isFirst} className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded disabled:opacity-30 disabled:cursor-not-allowed" title="Перемістити вгору"><ArrowUp size={16} /></button>
              <button onClick={handleMoveDown} disabled={isLast} className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded disabled:opacity-30 disabled:cursor-not-allowed" title="Перемістити вниз"><ArrowDown size={16} /></button>
              {cutListId && cutListId !== list.id && (
                <>
                  <button onClick={(e) => { e.stopPropagation(); onPaste(list.id, false); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 rounded" title="Вставити як сусіда"><ClipboardPaste size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); onPaste(list.id, true); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 rounded" title="Вставити як дочірній"><ClipboardPaste size={14} className="ml-[-4px]" style={{ clipPath: 'inset(50% 0 0 0)' }}/></button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); onCut(list.id); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-500 rounded" title="Вирізати"><Scissors size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); onAddChild(list.id); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-500 rounded" title="Створити дочірній список"><CornerDownRight size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); onStartEdit(list); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded" title="Редагувати"><Edit3 size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(list.id, list.name); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 rounded" title="Видалити"><Trash2 size={14} /></button>
            </div>
            <div style={{display: 'none'}}>{provided.placeholder}</div>
          </div>
        )}
      </Droppable>
      
      {isExpanded && hasChildren && (
        <div className="pt-1">
          {childLists.map((child, index) => (
            <SidebarListItem
              key={child.id}
              listId={child.id}
              isFirst={index === 0}
              isLast={index === childLists.length - 1}
              level={level + 1}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
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
  const dispatch = useAppDispatch();
  const allTopLevelLists = useAppSelector(selectTopLevelLists);
  const allLists = useAppSelector((state) => state.lists.goalLists);
  const [filterTerm, setFilterTerm] = useState("");
  const [editingList, setEditingList] = useState<GoalList | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");
  const [isCreatingNewList, setIsCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [cutListId, setCutListId] = useState<string | null>(null);

  useEffect(() => {
    const handleCreateRequest = () => { setIsCreatingNewList(true); };
    window.addEventListener(SIDEBAR_CREATE_NEW_LIST_EVENT, handleCreateRequest);
    return () => { window.removeEventListener(SIDEBAR_CREATE_NEW_LIST_EVENT, handleCreateRequest); };
  }, []);

  const moveList = useCallback((listId: string, direction: 'up' | 'down') => {
    const listToMove = allLists[listId];
    if (!listToMove) return;
    const parentId = listToMove.parentId;
    const siblings = Object.values(allLists).filter(l => l.parentId == parentId).sort((a, b) => a.order - b.order);
    const currentIndex = siblings.findIndex(l => l.id === listId);
    if (currentIndex === -1) return;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= siblings.length) return;
    const reorderedSiblings = [...siblings];
    const [movedItem] = reorderedSiblings.splice(currentIndex, 1);
    reorderedSiblings.splice(newIndex, 0, movedItem);
    const reorderedIds = reorderedSiblings.map(l => l.id);
    dispatch(listsReordered({ parentId, orderedListIds: reorderedIds }));
  }, [allLists, dispatch]);

  const handleMoveListUp = useCallback((listId: string) => moveList(listId, 'up'), [moveList]);
  const handleMoveListDown = useCallback((listId: string) => moveList(listId, 'down'), [moveList]);
  
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
      if (cutListId === listId) { setCutListId(null); }
    }
  };
  const submitNewList = () => {
    if (newListName.trim()) {
      const newId = nanoid();
      const name = newListName.trim();
      const newList: GoalList = { id: newId, name: name, parentId: null, createdAt: Date.now(), updatedAt: Date.now(), description: "", isExpanded: true, order: 0, tags: [] };
      dispatch(listAdded(newList));
      dispatchOpenGoalListEvent(newId, name);
      setNewListName("");
      setIsCreatingNewList(false);
    }
  };
  const handleAddChildList = (parentId: string) => {
    const name = prompt("Введіть назву для нового під-списку:");
    if (name && name.trim()) {
      const newId = nanoid();
      const newName = name.trim();
      const newList: GoalList = { id: newId, name: newName, parentId: parentId, createdAt: Date.now(), updatedAt: Date.now(), description: "", isExpanded: true, order: 0, tags: [] };
      dispatch(listAdded(newList));
      dispatchOpenGoalListEvent(newId, newName);
    }
  };
  const handleCut = (id: string) => { setCutListId(id); };
  const handlePaste = (targetListId: string, asChild: boolean) => {
    if (!cutListId || targetListId === cutListId) return;
    const cutList = allLists[cutListId];
    const targetList = allLists[targetListId];
    if (!cutList || !targetList) return;
    let currentParentIdCheck = asChild ? targetListId : targetList.parentId;
    while (currentParentIdCheck) {
      if (currentParentIdCheck === cutListId) {
        alert("Неможливо вставити батьківський список у дочірній.");
        return;
      }
      currentParentIdCheck = allLists[currentParentIdCheck]?.parentId;
    }
    const newParentId = asChild ? targetListId : targetList.parentId;
    dispatch(listMoved({ listId: cutListId, newParentId: newParentId }));
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
      <div className="px-4 py-2 flex-shrink-0">
        <div className="mb-2 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Backlogs</h3>
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
          {allTopLevelLists.map((list, index) =>
              <SidebarListItem
                key={list.id}
                listId={list.id}
                isFirst={index === 0}
                isLast={index === allTopLevelLists.length - 1}
                level={0}
                onMoveUp={handleMoveListUp}
                onMoveDown={handleMoveListDown}
                onStartEdit={handleStartEdit}
                onDelete={handleDeleteList}
                onAddChild={handleAddChildList}
                cutListId={cutListId}
                onCut={handleCut}
                onPaste={handlePaste}
              />
          )}
      </div>
    </div>
  );
}

export default Sidebar;
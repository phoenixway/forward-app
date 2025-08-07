// src/renderer/components/Sidebar.tsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { dispatchOpenGoalListEvent, SIDEBAR_CREATE_NEW_LIST_EVENT } from "../events";
import type { GoalList } from "../types";
import { Plus, Edit3, Trash2, ChevronDown, ChevronRight, CornerDownRight, Scissors, ClipboardPaste, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
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
  
  const selectChildLists = useMemo(makeSelectChildLists, []);
  const childLists = useAppSelector((state) => selectChildLists(state, listId));

  const [isMenuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !menuButtonRef.current?.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  if (!list) return null;

  const isExpanded = list.isExpanded ?? true;
  const handleOpenGoalList = () => dispatchOpenGoalListEvent(list.id, list.name);
  const hasChildren = childLists.length > 0;
  const isCut = cutListId === list.id;
  
  const handleActionClick = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
    setMenuOpen(false);
  };

  const ActionMenuItem: React.FC<{ onClick: (e: React.MouseEvent) => void, children: React.ReactNode, className?: string }> = ({ onClick, children, className = '' }) => (
    <button onClick={onClick} className={`w-full text-left flex items-center px-3 py-2 text-sm rounded-md ${className}`}>
        {children}
    </button>
  );

  const ActionMenu = () => (
    <div
        ref={menuRef}
        className="absolute top-full right-0 z-20 mt-1 w-52 bg-white dark:bg-slate-800 rounded-lg shadow-xl ring-1 ring-black/5 dark:ring-white/10 p-1.5"
    >
        <ActionMenuItem onClick={handleActionClick(() => onStartEdit(list))} className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
            <Edit3 size={14} className="mr-3 text-slate-500 dark:text-slate-400"/>Редагувати
        </ActionMenuItem>
        <ActionMenuItem onClick={handleActionClick(() => onAddChild(list.id))} className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
            <CornerDownRight size={14} className="mr-3 text-slate-500 dark:text-slate-400"/>Створити дочірній
        </ActionMenuItem>
        <ActionMenuItem onClick={handleActionClick(() => onCut(list.id))} className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
            <Scissors size={14} className="mr-3 text-slate-500 dark:text-slate-400"/>Вирізати
        </ActionMenuItem>
        {cutListId && cutListId !== list.id && (
            <>
            <ActionMenuItem onClick={handleActionClick(() => onPaste(list.id, false))} className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                <ClipboardPaste size={14} className="mr-3 text-slate-500 dark:text-slate-400"/>Вставити
            </ActionMenuItem>
            <ActionMenuItem onClick={handleActionClick(() => onPaste(list.id, true))} className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                <ClipboardPaste size={14} className="mr-3 text-slate-500 dark:text-slate-400"/>Вставити як дочірній
            </ActionMenuItem>
            </>
        )}
        <div className="my-1.5 h-px bg-slate-200 dark:bg-slate-700" />
        <ActionMenuItem onClick={handleActionClick(() => onDelete(list.id, list.name))} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40">
            <Trash2 size={14} className="mr-3"/>Видалити
        </ActionMenuItem>
    </div>
  );

  return (
    <div className={`my-px relative ${isCut ? 'opacity-50' : ''}`}>
      <Droppable droppableId={`sidebar-list-${listId}`} type="GOAL">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`group flex items-center p-1 rounded-md transition-colors min-h-[32px] 
              ${snapshot.isDraggingOver 
                ? 'bg-green-100 dark:bg-green-800/40 ring-1 ring-green-500' 
                : 'hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            style={{ paddingLeft: `${level * 16}px` }}
            onClick={handleOpenGoalList}
          >
            <div className="flex items-center flex-grow truncate min-w-0 mr-2">
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
              <span className="truncate text-slate-700 dark:text-slate-300 text-sm cursor-pointer" title={list.name}>
                {list.name}
              </span>
            </div>
            <div className="relative flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              {!isFirst && <button onClick={handleActionClick(() => onMoveUp(listId))} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 rounded" title="Перемістити вгору"><ArrowUp size={16} /></button>}
              {!isLast && <button onClick={handleActionClick(() => onMoveDown(listId))} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 rounded" title="Перемістити вниз"><ArrowDown size={16} /></button>}
              <button ref={menuButtonRef} onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev); }} className="p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600 rounded" title="Більше дій"><MoreHorizontal size={16} /></button>
              {isMenuOpen && <ActionMenu />}
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
    
    // ЗМІНА 1: Стан для відстеження, для якого батька створюється список
    const [creatingListParentId, setCreatingListParentId] = useState<null | 'root' | string>(null);
    const [newListName, setNewListName] = useState("");
    const [cutListId, setCutListId] = useState<string | null>(null);
  
    useEffect(() => {
      const handleCreateRequest = () => { setCreatingListParentId('root'); };
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

    // ЗМІНА 2: `handleAddChildList` тепер просто відкриває форму
    const handleAddChildList = (parentId: string) => {
        setCreatingListParentId(parentId);
    };

    // ЗМІНА 3: `submitNewList` тепер універсальний
    const handleCreateNewList = () => {
        if (newListName.trim() && creatingListParentId !== null) {
            const parentId = creatingListParentId === 'root' ? null : creatingListParentId;
            const newId = nanoid();
            const name = newListName.trim();
            const newList: GoalList = { 
                id: newId, 
                name, 
                parentId, 
                createdAt: Date.now(), 
                updatedAt: Date.now(), 
                description: "", 
                isExpanded: true, 
                order: 0, 
                tags: [] 
            };
            dispatch(listAdded(newList));
            dispatchOpenGoalListEvent(newId, name);
            setNewListName("");
            setCreatingListParentId(null);
        }
    };
    
    // ... решта обробників ...
    const handleCancelEdit = () => { setEditingList(null); setEditingListName(""); setEditingListDescription(""); };
    const submitRenameList = () => { if (editingList && editingListName.trim()) { dispatch(listUpdated({ id: editingList.id, name: editingListName.trim(), description: editingListDescription.trim() })); } handleCancelEdit(); };
    const handleDeleteList = (listId: string, listName: string) => { if (window.confirm(`Видалити список "${listName}" та всі вкладені списки?`)) { dispatch(listRemoved(listId)); if (cutListId === listId) { setCutListId(null); } } };
    const handleCut = (id: string) => { setCutListId(id); };
    const handlePaste = (targetListId: string, asChild: boolean) => { if (!cutListId || targetListId === cutListId) return; const cutList = allLists[cutListId]; const targetList = allLists[targetListId]; if (!cutList || !targetList) return; let currentParentIdCheck = asChild ? targetListId : targetList.parentId; while (currentParentIdCheck) { if (currentParentIdCheck === cutListId) { alert("Неможливо вставити батьківський список у дочірній."); return; } currentParentIdCheck = allLists[currentParentIdCheck]?.parentId; } const newParentId = asChild ? targetListId : targetList.parentId; dispatch(listMoved({ listId: cutListId, newParentId: newParentId })); setCutListId(null); };
    const renderEditForm = () => { if (!editingList) return null; return ( <div className="p-2 my-1 border border-blue-400 dark:border-blue-600 rounded-md bg-white dark:bg-slate-800 shadow"> <input type="text" value={editingListName} onChange={(e) => setEditingListName(e.target.value)} className="w-full text-sm p-2 mb-2 border rounded" onKeyDown={(e) => e.key === 'Enter' && submitRenameList()} autoFocus /> <textarea value={editingListDescription} onChange={(e) => setEditingListDescription(e.target.value)} rows={2} className="w-full text-xs p-2 mb-2 border rounded" /> <div className="flex justify-end space-x-2"> <button onClick={handleCancelEdit} className="px-3 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500">Скасувати</button> <button onClick={submitRenameList} className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white">Зберегти</button> </div> </div> ) };
  
    return (
      <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-900">
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <GlobalSearch value={filterTerm} onFilterChange={setFilterTerm} />
        </div>
        <div className="px-4 py-2 flex-shrink-0">
          <div className="mb-2 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Backlogs</h3>
            <button onClick={() => setCreatingListParentId('root')} className="p-1.5 text-slate-500 hover:text-blue-600 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><Plus size={20} /></button>
          </div>
          {/* ЗМІНА 4: Форма тепер рендериться, якщо `creatingListParentId` не є `null` */}
          {creatingListParentId !== null && (
             <div className="mb-3 p-2 border rounded-md bg-white dark:bg-slate-800">
               <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Назва нового списку" onKeyDown={e => e.key === 'Enter' && handleCreateNewList()} className="w-full p-2 mb-2 border rounded" autoFocus />
               <div className="flex justify-end space-x-2">
                  <button onClick={() => setCreatingListParentId(null)} className="px-3 py-1 text-xs rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500">Скасувати</button>
                  <button onClick={handleCreateNewList} className="px-3 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white">Створити</button>
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
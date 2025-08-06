// src/renderer/components/Sidebar.tsx
import React, { useState, useMemo, useEffect } from "react";
import { dispatchOpenSettingsEvent, dispatchOpenGoalListEvent, SIDEBAR_CREATE_NEW_LIST_EVENT } from "../events";
import type { GoalList } from "../types";
import { Plus, Edit3, Trash2, Settings, ChevronDown, ChevronRight, GripVertical, CornerDownRight, Scissors, ClipboardPaste } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { listAdded, listRemoved, listUpdated, listMoved, listExpansionToggled } from "../store/listsSlice";
import { selectTopLevelLists, makeSelectChildLists } from "../store/selectors";
import GlobalSearch from "./GlobalSearch";
import { nanoid } from "@reduxjs/toolkit";

interface SidebarListItemProps {
  listId: string;
  index: number;
  level: number;
  onStartEdit: (list: GoalList) => void;
  onDelete: (id: string, name: string) => void;
  onAddChild: (parentId: string) => void;
  cutListId: string | null;
  onCut: (id: string) => void;
  onPaste: (targetListId: string, asChild: boolean) => void;
  filterTerm: string;
}

const listMatchesFilter = (list: GoalList, allLists: Record<string, GoalList>, filterTerm: string): boolean => {
  if (!filterTerm.trim()) return true;
  const lowercaseFilter = filterTerm.toLowerCase();
  if (list.name.toLowerCase().includes(lowercaseFilter)) {
    return true;
  }
  const children = Object.values(allLists).filter(l => l.parentId === list.id);
  return children.some(childList => listMatchesFilter(childList, allLists, filterTerm));
};

const SidebarListItem: React.FC<SidebarListItemProps> = ({
  listId,
  index,
  level,
  onStartEdit,
  onDelete,
  onAddChild,
  cutListId,
  onCut,
  onPaste,
  filterTerm
}) => {
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.lists.goalLists[listId]);
  const allLists = useAppSelector((state) => state.lists.goalLists);

  const selectChildLists = useMemo(makeSelectChildLists, []);
  const childLists = useAppSelector((state) => selectChildLists(state, listId));

  const filteredChildLists = useMemo(() => {
    if (!filterTerm.trim()) return childLists;
    return childLists.filter(child => listMatchesFilter(child, allLists, filterTerm));
  }, [childLists, filterTerm, allLists]);

  if (!list) return null;

  const isExpanded = list.isExpanded ?? true;
  const handleOpenGoalList = () => dispatchOpenGoalListEvent(list.id, list.name);
  const hasChildren = childLists.length > 0;
  const hasFilteredChildren = filteredChildLists.length > 0;
  const isCut = cutListId === list.id;

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`rounded-md my-px transition-opacity ${snapshot.isDragging ? 'bg-blue-100 dark:bg-blue-900/50 shadow-lg' : ''} ${isCut ? 'opacity-50' : 'opacity-100'}`}
        >
          <Droppable droppableId={list.id} type="LIST">
            {(dropProvided, dropSnapshot) => (
              <div
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
                className={`p-1 rounded-md transition-colors ${dropSnapshot.isDraggingOver ? 'bg-purple-100 dark:bg-purple-700/20' : ''}`}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch(listExpansionToggled({ listId: list.id }));
                        }}
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
                    <button onClick={(e) => { e.stopPropagation(); onAddChild(list.id); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-500 rounded" title="Створити дочірній список">
                      <CornerDownRight size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onStartEdit(list); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded" title="Редагувати">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(list.id, list.name); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 rounded" title="Видалити">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {dropProvided.placeholder}
              </div>
            )}
          </Droppable>

          {isExpanded && hasFilteredChildren && (
            <div className="pl-2">
                {filteredChildLists.map((child, childIndex) => (
                  <SidebarListItem
                    key={child.id}
                    listId={child.id}
                    index={childIndex}
                    level={level + 1}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    onAddChild={onAddChild}
                    cutListId={cutListId}
                    onCut={onCut}
                    onPaste={onPaste}
                    filterTerm={filterTerm}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </Draggable>
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
    const handleCreateRequest = () => {
        setIsCreatingNewList(true);
    };

    window.addEventListener(SIDEBAR_CREATE_NEW_LIST_EVENT, handleCreateRequest);

    return () => {
        window.removeEventListener(SIDEBAR_CREATE_NEW_LIST_EVENT, handleCreateRequest);
    };
  }, []);

  const filteredLists = useMemo(() => {
    if (!filterTerm.trim()) return allTopLevelLists;
    return allTopLevelLists.filter(list => listMatchesFilter(list, allLists, filterTerm));
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
      const newId = nanoid();
      const name = newListName.trim();
      const newList: GoalList = {
        id: newId,
        name: name,
        parentId: null,
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
      setIsCreatingNewList(false);
    }
  };
  
  const handleAddChildList = (parentId: string) => {
    const name = prompt("Введіть назву для нового під-списку:");
    if (name && name.trim()) {
      const newId = nanoid();
      const newName = name.trim();
      const newList: GoalList = {
        id: newId,
        name: newName,
        parentId: parentId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        description: "",
        isExpanded: true,
        order: 0,
        tags: []
      };
      dispatch(listAdded(newList));
      dispatchOpenGoalListEvent(newId, newName);
    }
  };

  const handleCut = (id: string) => {
    setCutListId(id);
  };

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
    
    dispatch(listMoved({
      listId: cutListId,
      newParentId: newParentId,
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

      <div className="px-4 py-2 flex-shrink-0"> {/* Зменшено вертикальний відступ */}
        <div className="mb-2 flex justify-between items-center"> {/* Зменшено нижній відступ */}
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Backlogs</h3> {/* Змінено заголовок */}
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
                      onAddChild={handleAddChildList}
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
    </div>
  );
}

export default Sidebar;
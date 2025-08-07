// src/renderer/components/GoalAssociationManager.tsx
import React, { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { listAdded } from '../store/listsSlice';
import { dispatchOpenGoalListEvent } from '../events';
import type { Goal, GoalList } from '../types';
import { nanoid } from '@reduxjs/toolkit';
import { X, Plus, ChevronRight, ChevronDown } from 'lucide-react'; // ЗМІНА: Замінено іконку

interface GoalAssociationManagerProps {
  goal: Goal;
  onGoalChange: (updatedGoal: Goal) => void;
}

const SelectableListItem: React.FC<{
  list: GoalList;
  level: number;
  allLists: Record<string, GoalList>;
  onSelect: (listId: string) => void;
  expandedNodes: Record<string, boolean>;
  onToggleExpand: (listId: string) => void;
}> = ({ list, level, allLists, onSelect, expandedNodes, onToggleExpand }) => {
  const children = useMemo(() => 
    Object.values(allLists).filter(l => l.parentId === list.id).sort((a,b) => a.order - b.order),
    [allLists, list.id]
  );
  const isExpanded = expandedNodes[list.id] || false;

  return (
    <>
      <div 
        className="flex items-center p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {children.length > 0 ? (
          <button onClick={(e) => { e.stopPropagation(); onToggleExpand(list.id); }} className="p-0.5 mr-1">
            {isExpanded ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400" />}
          </button>
        ) : (
          <span className="w-5 mr-1" />
        )}
        <span className="truncate flex-grow" onClick={() => onSelect(list.id)}>{list.name}</span>
      </div>
      {isExpanded && children.map(child => (
        <SelectableListItem 
          key={child.id}
          list={child}
          level={level + 1}
          allLists={allLists}
          onSelect={onSelect}
          expandedNodes={expandedNodes}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </>
  );
};

const GoalAssociationManager: React.FC<GoalAssociationManagerProps> = ({ goal, onGoalChange }) => {
  const dispatch = useAppDispatch();
  const allLists = useAppSelector(state => state.lists.goalLists);
  const [newListName, setNewListName] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const { associatedLists, availableLists } = useMemo(() => {
    const associatedIds = new Set(goal.associatedListIds || []);
    const listsArray = Object.values(allLists);
    return {
      associatedLists: listsArray.filter(l => associatedIds.has(l.id)),
      availableLists: listsArray.filter(l => !associatedIds.has(l.id)),
    };
  }, [allLists, goal.associatedListIds]);
  
  const topLevelAvailableLists = useMemo(() => 
    availableLists.filter(l => !l.parentId).sort((a,b) => a.order-b.order),
    [availableLists]
  );

  const handleToggleExpand = (listId: string) => {
    setExpandedNodes(prev => ({ ...prev, [listId]: !prev[listId] }));
  };

  const handleAssociate = (listId: string) => {
    const currentIds = goal.associatedListIds || [];
    if (!currentIds.includes(listId)) {
        onGoalChange({ ...goal, associatedListIds: [...currentIds, listId] });
    }
  };
  
  const handleDisassociate = (listId: string) => {
    const updatedIds = (goal.associatedListIds || []).filter(id => id !== listId);
    onGoalChange({ ...goal, associatedListIds: updatedIds });
  };

  const handleCreateAndAssociate = () => {
    if (!newListName.trim()) return;
    const newId = nanoid();
    const name = newListName.trim();
    const newList: GoalList = { 
        id: newId, name, parentId: null, createdAt: Date.now(), updatedAt: Date.now(), 
        description: "", isExpanded: true, order: 0, tags: [] 
    };
    dispatch(listAdded(newList));
    handleAssociate(newId);
    setNewListName('');
  };

  return (
    <div className="grid grid-cols-2 gap-6 h-full">
      <div>
        <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Прив'язані списки</h4>
        <div className="bg-white dark:bg-slate-700/50 p-2 rounded-md border border-slate-200 dark:border-slate-700 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
          {associatedLists.length > 0 ? (
            associatedLists.map(list => (
              <div key={list.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600">
                <span className="truncate cursor-pointer" onClick={() => dispatchOpenGoalListEvent(list.id, list.name)}>
                  {list.name}
                </span>
                {/* ЗМІНА: Іконку замінено на "X" */}
                <button onClick={() => handleDisassociate(list.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-500 rounded-full">
                  <X size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-center text-slate-400 dark:text-slate-500 p-4">Немає прив'язаних списків.</p>
          )}
        </div>
      </div>
      <div>
        <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Доступні для прив'язки</h4>
        <div className="bg-white dark:bg-slate-700/50 p-2 rounded-md border border-slate-200 dark:border-slate-700 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar">
            {topLevelAvailableLists.map(list => (
              <SelectableListItem 
                key={list.id}
                list={list}
                level={0}
                allLists={allLists}
                onSelect={handleAssociate}
                expandedNodes={expandedNodes}
                onToggleExpand={handleToggleExpand}
              />
            ))}
        </div>
        <div>
          <h5 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Або створити новий</h5>
          <div className="flex space-x-2">
            <input 
              type="text"
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              placeholder="Назва нового списку..."
              className="flex-grow block w-full rounded-md border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <button onClick={handleCreateAndAssociate} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md flex items-center disabled:opacity-50" disabled={!newListName.trim()}>
              <Plus size={16} className="mr-1"/> Створити
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalAssociationManager;
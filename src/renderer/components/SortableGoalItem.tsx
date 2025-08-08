// src/renderer/components/SortableGoalItem.tsx
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Zap,
  ZapOff,
} from "lucide-react";
import type { Goal, GoalList } from "../types";
import GoalTextRenderer from "./GoalTextRenderer";
import { OPEN_GOAL_LIST_EVENT, OpenGoalListDetail } from "../events";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setGoalToHighlight } from "../store/uiSlice";

export interface SortableGoalItemProps {
  instanceId: string;
  goal: Goal;
  index: number;
  associatedLists: GoalList[];
  onToggle: (goalId: string) => void;
  onDelete: (instanceId: string) => void;
  onStartEdit: (goal: Goal) => void;
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void;
}

const ScoreBadge: React.FC<{ goal: Goal }> = ({ goal }) => {
    const isAssessed = goal.scoringStatus === 'ASSESSED' && typeof goal.displayScore === 'number';
    const isImpossibleToAssess = goal.scoringStatus === 'IMPOSSIBLE_TO_ASSESS';

    if (isAssessed) {
        const score = goal.rawScore ?? 0;
        const colorClass = score > 0.05 ? 'text-green-600 dark:text-green-400' 
                         : score < -0.05 ? 'text-red-600 dark:text-red-400' 
                         : 'text-slate-500 dark:text-slate-400';

        return (
            <div className={`flex items-center text-xs font-semibold ${colorClass}`} title={`Оцінка: ${goal.displayScore}/100`}>
                <Zap size={14} className="mr-0.5" />
                <span>{goal.displayScore}/100</span>
            </div>
        );
    }

    if (isImpossibleToAssess) {
        return (
            <div className="flex items-center text-slate-400 dark:text-slate-500" title="Неможливо оцінити">
                <ZapOff size={14} />
            </div>
        );
    }
    return null;
};


function SortableGoalItem({
  instanceId,
  goal,
  index,
  associatedLists,
  onToggle,
  onDelete,
  onStartEdit,
  obsidianVaultName,
  onTagClickForFilter,
}: SortableGoalItemProps) {
  const dispatch = useAppDispatch();
  const goalToHighlight = useAppSelector((state) => state.ui.goalToHighlight);

  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasAssociatedLists = associatedLists.length > 0;
  
  const shouldRenderExpandButton = hasAssociatedLists;

  const toggleExpand = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);
  
  const handleGoToList = useCallback((event: React.MouseEvent, list: GoalList) => {
    event.stopPropagation();
    const detail: OpenGoalListDetail = { listId: list.id, listName: list.name };
    const customEvent = new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, { detail });
    window.dispatchEvent(customEvent);
  }, []);

  const isHighlighted = goalToHighlight === goal.id;

  useEffect(() => {
    if (isHighlighted) {
      const element = document.getElementById(`goal-${goal.id}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => { dispatch(setGoalToHighlight(null)); }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, dispatch, goal.id]);

  const handleContainerClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('button, a, input, [data-tag-name]')) {
          if (!goal.completed) onStartEdit(goal);
      }
  };

  return (
    <Draggable draggableId={instanceId} index={index}>
      {(provided, snapshot) => (
        <li
          id={`goal-${goal.id}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={handleContainerClick}
          className={`group relative p-2.5 rounded-md flex flex-col justify-between transition-all duration-150 border ${!goal.completed ? 'cursor-pointer' : ''} ${
            snapshot.isDragging ? "ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-xl bg-indigo-50 dark:bg-indigo-900/60"
            : isHighlighted ? "ring-2 ring-blue-500 dark:ring-blue-400 bg-blue-50 dark:bg-blue-900/40 shadow-lg"
            : goal.completed ? "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50"
            : "bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
          } ${!snapshot.isDragging && !isHighlighted && "hover:shadow-md dark:hover:shadow-black/10"}`}
          style={provided.draggableProps.style}
        >
          <div className="flex items-center w-full">
            <div className="flex-shrink-0 pt-0.5">
              <button {...provided.dragHandleProps} type="button" onClick={e => e.stopPropagation()}
                className="p-1 mr-2 cursor-grab focus:outline-none text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                aria-label="Перетягнути ціль" title="Перетягнути для сортування">
                <GripVertical size={18} />
              </button>
            </div>
            <div className="flex items-center flex-grow flex-wrap gap-x-2 mr-2 min-w-0">
                <div className="flex items-start flex-shrink-0">
                    <input type="checkbox" checked={goal.completed} onChange={() => onToggle(goal.id)} onClick={e => e.stopPropagation()}
                        className="h-4 w-4 text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-500 rounded focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-slate-700 mr-2.5 cursor-pointer flex-shrink-0 mt-1"
                        aria-label={`Позначити ціль ${goal.text}`}
                    />
                    <div className={`text-sm ${goal.completed ? "line-through text-slate-500 dark:text-slate-500 opacity-70 dark:opacity-60" : "text-slate-800 dark:text-slate-100"}`} title={goal.text}>
                        <GoalTextRenderer text={goal.text} stripFields={true} obsidianVaultName={obsidianVaultName} onTagClick={onTagClickForFilter}/>
                    </div>
                </div>
                {/* --- ЗМІНА: `span` замінено на `button` з обробником onClick --- */}
                {!isExpanded && hasAssociatedLists && (
                    <div className="flex items-center space-x-1.5">
                        {associatedLists.map(list => (
                            <button 
                                key={list.id} 
                                onClick={(e) => handleGoToList(e, list)}
                                title={`Перейти до списку: ${list.name}`}
                                className="text-xs bg-slate-200 dark:bg-slate-600/80 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded hover:bg-slate-300 dark:hover:bg-slate-500"
                            >
                                {list.name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 flex items-center space-x-1 pt-0.5">
                <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                    {shouldRenderExpandButton && (
                        <button onClick={toggleExpand} className="p-1 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 rounded" title={isExpanded ? "Сховати деталі" : "Показати деталі"}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    )}
                    {!goal.completed && (
                        <button onClick={(e) => { e.stopPropagation(); onStartEdit(goal); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded" title="Редагувати ціль">
                            <Edit2 size={16} />
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(instanceId); }} className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded" title="Видалити цей екземпляр цілі">
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="flex-shrink-0">
                    <ScoreBadge goal={goal} />
                </div>
            </div>
          </div>
          
          {isExpanded && hasAssociatedLists && (
            <div className="pl-10 pt-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {associatedLists.map((list) => (
                    <button key={list.id} onClick={(e) => handleGoToList(e, list)} title={`Перейти до списку: ${list.name}`}
                    className="inline-flex items-center text-xs bg-indigo-100 dark:bg-indigo-800/80 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    {list.name}
                    </button>
                ))}
                </div>
            </div>
          )}
        </li>
      )}
    </Draggable>
  );
}

export default SortableGoalItem;
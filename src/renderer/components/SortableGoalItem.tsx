// src/renderer/components/SortableGoalItem.tsx
import React, { useState, useCallback, useRef } from "react";
import { Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Link as LinkIconLucide,
} from "lucide-react";
import type { Goal } from "../types"; // Оновлено шлях до типів
import GoalTextRenderer from "./GoalTextRenderer";
import { parseGoalData } from "../utils/textProcessing";
import AssociatedListsPopover from "./AssociatedListsPopover";

// Інтерфейс пропсів було спрощено після міграції на Redux
export interface SortableGoalItemProps {
  goal: Goal;
  index: number;
  onToggle: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onStartEdit: (goal: Goal) => void;
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void;
}

function SortableGoalItem({
  goal,
  index,
  onToggle,
  onDelete,
  onStartEdit,
  obsidianVaultName,
  onTagClickForFilter,
}: SortableGoalItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAssocPopoverOpen, setIsAssocPopoverOpen] = useState(false);
  const popoverAnchorRef = useRef<HTMLButtonElement>(null);

  const { displayableFields, rating, ratingLabel } = parseGoalData(goal.text);
  const hasExtraInfo =
    !goal.completed && (displayableFields.length > 0 || rating !== undefined);

  const toggleExpand = useCallback(
    (event: React.MouseEvent) => {
      if (hasExtraInfo) {
        setIsExpanded((prev) => !prev);
      }
    },
    [hasExtraInfo],
  );

  const toggleAssocPopover = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsAssocPopoverOpen((prev) => !prev);
  }, []);

  const closeAssocPopover = useCallback(() => {
    setIsAssocPopoverOpen(false);
  }, []);

  return (
    <Draggable draggableId={goal.id} index={index}>
      {(provided, snapshot) => (
        // КРОК 1: Переконуємось, що на батьківському елементі <li> є клас "group"
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative p-2.5 rounded-md flex items-start justify-between transition-shadow duration-150 border ${
            snapshot.isDragging
              ? "ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-xl bg-indigo-50 dark:bg-indigo-900/60"
              : goal.completed
                ? "text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50"
                : "text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
          } ${!snapshot.isDragging && "hover:shadow-md dark:hover:shadow-black/10"}`}
          style={provided.draggableProps.style}
        >
          <button
            {...provided.dragHandleProps}
            type="button"
            className="p-1 mr-2 cursor-grab focus:outline-none text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0 rounded hover:bg-slate-200 dark:hover:bg-slate-600 mt-0.5"
            aria-label="Перетягнути ціль"
            title="Перетягнути для сортування"
          >
            <GripVertical size={18} />
          </button>

          <div className="flex items-start flex-grow mr-2 min-w-0">
            <input
              type="checkbox"
              checked={goal.completed}
              onChange={() => onToggle(goal.id)}
              className="h-4 w-4 text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-500 rounded focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-slate-700 mr-2.5 cursor-pointer flex-shrink-0 bg-white dark:bg-slate-600 checked:bg-indigo-600 dark:checked:bg-indigo-400 mt-0.5"
              aria-label={`Позначити ціль ${goal.text}`}
            />
            <div className="flex-grow min-w-0">
              <div
                onClick={(e) => {
                  const targetElement = e.target as HTMLElement;
                  const isChildInteractive =
                    targetElement.closest("a") ||
                    targetElement.closest("button") ||
                    targetElement.closest("span[data-tag-name]");
                  if (!isChildInteractive && !goal.completed) {
                    onStartEdit(goal);
                  }
                }}
                className={`text-sm ${
                  goal.completed
                    ? "line-through opacity-70 dark:opacity-60"
                    : "text-slate-800 dark:text-slate-100 cursor-pointer"
                }`}
                title={goal.text}
              >
                <GoalTextRenderer
                  text={goal.text}
                  stripFields={true}
                  obsidianVaultName={obsidianVaultName}
                  onTagClick={onTagClickForFilter}
                />
              </div>
              <div
                className={`mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-1 transition-all duration-300 ease-in-out overflow-hidden ${
                  isExpanded && hasExtraInfo
                    ? "opacity-100 max-h-40"
                    : "opacity-0 max-h-0"
                }`}
              >
                {/* ... детальна інформація ... */}
              </div>
            </div>
          </div>

          {/* КРОК 2: Додаємо класи для управління видимістю до цього контейнера <div> */}
          <div className="flex-shrink-0 flex items-center space-x-0.5 mt-0.5 relative opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
            {hasExtraInfo && (
              <button
                onClick={toggleExpand}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 focus:outline-none rounded hover:bg-sky-100 dark:hover:bg-sky-700/50"
                title={isExpanded ? "Згорнути деталі" : "Розгорнути деталі"}
              >
                {isExpanded ? (
                  <ChevronUp size={16} />
                ) : (
                  <ChevronDown size={16} />
                )}
              </button>
            )}
            {!goal.completed && (
              <button
                ref={popoverAnchorRef}
                onClick={toggleAssocPopover}
                className={`p-1 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none rounded hover:bg-purple-100 dark:hover:bg-purple-700/50 ${
                  isAssocPopoverOpen
                    ? "bg-purple-100 dark:bg-purple-700/50 text-purple-600 dark:text-purple-400"
                    : ""
                }`}
                title="Асоційовані списки"
              >
                <LinkIconLucide size={16} />
              </button>
            )}
            {!goal.completed && (
              <button
                onClick={() => onStartEdit(goal)}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none rounded hover:bg-blue-100 dark:hover:bg-blue-700/50"
                title="Редагувати ціль"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button
              onClick={() => onDelete(goal.id)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none rounded hover:bg-red-100 dark:hover:bg-red-700/50"
              title="Видалити ціль"
            >
              <Trash2 size={16} />
            </button>
            {isAssocPopoverOpen && (
              <AssociatedListsPopover
                targetGoal={goal}
                onClose={closeAssocPopover}
              />
            )}
          </div>
        </li>
      )}
    </Draggable>
  );
}

export default SortableGoalItem;

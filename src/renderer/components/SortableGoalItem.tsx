//src/renderer/SortableGoalItem.tsx
/// <reference types="react" /> 
/// <reference types="react-dom" />

// src/renderer/components/SortableGoalItem.tsx
import React, { useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Goal } from "../data/goalListsStore";
import GoalTextRenderer from "./GoalTextRenderer";
import { parseGoalData } from "../utils/textProcessing";

export interface SortableGoalItemProps {
  goal: Goal;
  onToggle: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onStartEdit: (goal: Goal) => void;
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void; // <-- НОВИЙ ПРОП
}

function SortableGoalItem({
  goal,
  onToggle,
  onDelete,
  onStartEdit,
  obsidianVaultName,
  onTagClickForFilter, // <-- ОТРИМУЄМО НОВИЙ ПРОП
}: SortableGoalItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : "auto",
    opacity: isDragging ? 0.9 : 1,
  };

  const { displayableFields, rating, ratingLabel } = parseGoalData(goal.text);
  const hasExtraInfo =
    !goal.completed && (displayableFields.length > 0 || rating !== undefined);

  const toggleExpand = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); 
      if (hasExtraInfo) {
        setIsExpanded((prev) => !prev);
      }
    },
    [hasExtraInfo]
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`p-2.5 rounded-md flex items-start justify-between group transition-shadow duration-150 border
        ${
          goal.completed
            ? "text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50"
            : "text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600"
        }
        ${
          isDragging
            ? "ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-xl bg-indigo-50 dark:bg-indigo-900/60"
            : "hover:shadow-md dark:hover:shadow-black/10"
        }
      `}
    >
      <button
        {...listeners}
        {...attributes}
        type="button"
        className="p-1 mr-2 cursor-grab focus:outline-none text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0 rounded hover:bg-slate-200 dark:hover:bg-slate-600 mt-0.5"
        aria-label="Перетягнути ціль"
        onClick={(e) => e.stopPropagation()}
        title="Перетягнути для сортування"
      >
        <GripVertical size={18} />
      </button>

      <div className="flex items-start flex-grow mr-2 min-w-0">
        <input
          type="checkbox"
          checked={goal.completed}
          onClick={(e) => e.stopPropagation()}
          onChange={() => onToggle(goal.id)}
          className="h-4 w-4 text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-500 rounded 
                     focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 
                     dark:focus:ring-offset-slate-700 mr-2.5 cursor-pointer flex-shrink-0
                     bg-white dark:bg-slate-600 checked:bg-indigo-600 dark:checked:bg-indigo-400
                     mt-0.5"
          aria-label={`Позначити ціль ${goal.text}`}
        />
        <div className="flex-grow min-w-0">
          <div
            onClick={(e) => {
              // Запобігаємо виклику onStartEdit, якщо клік був на тегу всередині GoalTextRenderer
              // або на будь-якому іншому інтерактивному елементі, який вже має свій обробник
              const targetElement = e.target as HTMLElement;
              const isInteractiveChild = 
                targetElement.closest('a') || // для вікі-посилань
                targetElement.closest('span[class*="cursor-pointer"]'); // для тегів з cursor-pointer

              if (!isInteractiveChild && !goal.completed) {
                onStartEdit(goal);
              }
            }}
            className={`text-sm 
              ${
                goal.completed
                  ? "line-through opacity-70 dark:opacity-60"
                  : "text-slate-800 dark:text-slate-100 cursor-pointer" 
                  // Додаємо cursor-pointer тільки якщо ціль не завершена, 
                  // але GoalTextRenderer сам керує курсором для тегів/посилань
              }
            `}
            title={goal.text}
          >
            <GoalTextRenderer
              text={goal.text}
              stripFields={true} // Зверни увагу: поля не будуть показані тут, якщо stripFields=true
              obsidianVaultName={obsidianVaultName}
              onTagClick={onTagClickForFilter} // <-- ПЕРЕДАЄМО КОЛБЕК
            />
          </div>

          <div
            className={`
              mt-1.5 text-xs text-slate-500 dark:text-slate-400 space-y-1
              transition-all duration-300 ease-in-out overflow-hidden
              ${
                isExpanded && hasExtraInfo
                  ? "opacity-100 max-h-40"
                  : "opacity-0 max-h-0"
              }
            `}
          >
            {hasExtraInfo && (
              <>
                {displayableFields.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    {displayableFields.map((field, index) => (
                      <span
                        key={index}
                        className="bg-slate-200 dark:bg-slate-600/70 px-1.5 py-0.5 rounded-sm text-slate-600 dark:text-slate-300"
                      >
                        {field.name}: {field.value}
                      </span>
                    ))}
                  </div>
                )}
                {rating !== undefined && ratingLabel && (
                  <div>
                    <span
                      className={`font-semibold px-1.5 py-0.5 rounded-full border whitespace-nowrap
                                  ${
                                    rating > 5
                                      ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600/70"
                                      : rating > 1
                                      ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600/70"
                                      : rating > -Infinity
                                      ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-700/30 dark:text-orange-300 dark:border-orange-600/70"
                                      : "bg-red-100 text-red-700 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600/70"
                                  }`}
                      title={`${ratingLabel}: ${
                        isFinite(rating) ? rating.toFixed(2) : rating.toString()
                      }`}
                    >
                      {ratingLabel}:{" "}
                      {isFinite(rating) ? rating.toFixed(2) : rating.toString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center space-x-1 mt-0.5">
        {hasExtraInfo && (
          <button
            onClick={toggleExpand}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 focus:outline-none rounded hover:bg-sky-100 dark:hover:bg-sky-700/50"
            title={isExpanded ? "Згорнути деталі" : "Розгорнути деталі"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {!goal.completed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit(goal);
            }}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none rounded hover:bg-blue-100 dark:hover:bg-blue-700/50"
            title="Редагувати ціль"
          >
            <Edit2 size={16} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id);
          }}
          className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none rounded hover:bg-red-100 dark:hover:bg-red-700/50"
          title="Видалити ціль"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

export default SortableGoalItem;
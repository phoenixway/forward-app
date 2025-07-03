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
import type { Goal, GoalList } from "../types";
import GoalTextRenderer from "./GoalTextRenderer";
import AssociatedListsPopover from "./AssociatedListsPopover";
import { OPEN_GOAL_LIST_EVENT, OpenGoalListDetail } from "./Sidebar";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAssocPopoverOpen, setIsAssocPopoverOpen] = useState(false);
  const popoverAnchorRef = useRef<HTMLButtonElement>(null);

  const hasAssociatedLists = associatedLists.length > 0;

  const toggleExpand = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      if (hasAssociatedLists) {
        setIsExpanded((prev) => !prev);
      }
    },
    [hasAssociatedLists],
  );

  const toggleAssocPopover = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setIsAssocPopoverOpen((prev) => !prev);
  }, []);

  const closeAssocPopover = useCallback(() => {
    setIsAssocPopoverOpen(false);
  }, []);

  const handleGoToList = useCallback(
    (event: React.MouseEvent, list: GoalList) => {
      event.stopPropagation();
      const detail: OpenGoalListDetail = { listId: list.id, listName: list.name };
      const customEvent = new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, { detail });
      window.dispatchEvent(customEvent);
    },
    [],
  );

  return (
    <Draggable draggableId={instanceId} index={index}>
      {(provided, snapshot) => (
        <li
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group relative p-2.5 rounded-md flex items-start justify-between transition-all duration-150 border ${
            snapshot.isDragging
              ? "ring-2 ring-indigo-500 dark:ring-indigo-400 shadow-xl bg-indigo-50 dark:bg-indigo-900/60"
              : goal.completed
                ? "text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/50"
                : "text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
          } ${!snapshot.isDragging && "hover:shadow-md dark:hover:shadow-black/10"}`}
          style={provided.draggableProps.style}
        >
          {/* Ручка для перетягування */}
          <div className="flex-shrink-0 pt-0.5">
            <button
              {...provided.dragHandleProps}
              type="button"
              className="p-1 mr-2 cursor-grab focus:outline-none text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
              aria-label="Перетягнути ціль"
              title="Перетягнути для сортування"
            >
              <GripVertical size={18} />
            </button>
          </div>

          {/* Основний контент цілі */}
          <div className="flex items-start flex-grow mr-2 min-w-0">
            <input
              type="checkbox"
              checked={goal.completed}
              onChange={() => onToggle(goal.id)}
              className="h-4 w-4 text-indigo-600 dark:text-indigo-400 border-slate-300 dark:border-slate-500 rounded focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:focus:ring-offset-slate-700 mr-2.5 cursor-pointer flex-shrink-0 mt-1"
              aria-label={`Позначити ціль ${goal.text}`}
            />
            <div className="flex-grow min-w-0">
              {/* --- 1. ВЕРХНІЙ РЯДОК: ТЕКСТ + СПИСКИ ПРИ НАВЕДЕННІ --- */}
              <div className="flex items-center min-w-0">
                {/* Контейнер для тексту, що дозволяє перенос */}
                <div
                  onClick={(e) => {
                    const targetElement = e.target as HTMLElement;
                    const isChildInteractive = targetElement.closest("a") || targetElement.closest("button") || targetElement.closest("span[data-tag-name]");
                    if (!isChildInteractive && !goal.completed) { onStartEdit(goal); }
                  }}
                  className={`text-sm ${goal.completed ? "line-through opacity-70 dark:opacity-60" : "text-slate-800 dark:text-slate-100 cursor-pointer"}`}
                  title={goal.text}
                >
                  <GoalTextRenderer
                    text={goal.text}
                    stripFields={true}
                    obsidianVaultName={obsidianVaultName}
                    onTagClick={onTagClickForFilter}
                  />
                </div>

                {/* Попередній перегляд списків при наведенні (з'являється справа) */}
                <div
                  className={`flex-1 flex items-center min-w-0 overflow-hidden ml-2 transition-opacity duration-200 opacity-0 ${
                    !isExpanded ? 'group-hover:opacity-100' : '' // <-- ЗМІНА ТУТ: ефект hover працює, тільки якщо ціль НЕ розгорнута
                  }`}
                  aria-hidden="true"
                >
                  <div className="flex items-center flex-nowrap">
                    {associatedLists.map((list) => (
                      <button
                        key={list.id}
                        tabIndex={-1} // Робимо нефокусованим, бо це лише прев'ю
                        onClick={(e) => handleGoToList(e, list)}
                        title={`Перейти до списку: ${list.name}`}
                        className="inline-flex items-center text-xs bg-slate-200 dark:bg-slate-600/80 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded mr-1 flex-shrink-0 whitespace-nowrap overflow-hidden text-ellipsis hover:bg-slate-300 dark:hover:bg-slate-500"
                      >
                        {list.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* --- 2. НИЖНІЙ БЛОК: З'ЯВЛЯЄТЬСЯ ПРИ КЛІКУ НА EXPAND --- */}
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden max-h-0 opacity-0 ${
                  isExpanded ? "max-h-96 opacity-100 mt-2" : ""
                }`}
              >
                {hasAssociatedLists && (
                  <div className="flex flex-wrap gap-1.5">
                    {associatedLists.map((list) => (
                      <button
                        key={list.id}
                        onClick={(e) => handleGoToList(e, list)}
                        title={`Перейти до списку: ${list.name}`}
                        className="inline-flex items-center text-xs bg-indigo-100 dark:bg-indigo-800/80 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-md hover:bg-indigo-200 dark:hover:bg-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {list.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Кнопки дій */}
          <div className="flex-shrink-0 flex items-center space-x-0.5 relative opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150 pt-0.5">
            {hasAssociatedLists && !goal.completed && (
              <button
                onClick={toggleExpand}
                className="p-1 text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 focus:outline-none rounded hover:bg-sky-100 dark:hover:bg-sky-700/50"
                title={isExpanded ? "Сховати списки" : "Показати списки"}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            )}
            {!goal.completed && (
              <button
                ref={popoverAnchorRef}
                onClick={toggleAssocPopover}
                className={`p-1 text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none rounded hover:bg-purple-100 dark:hover:bg-purple-700/50 ${isAssocPopoverOpen ? "bg-purple-100 dark:bg-purple-700/50 text-purple-600 dark:text-purple-400" : ""}`}
                title="Редагувати асоційовані списки"
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
              onClick={() => onDelete(instanceId)}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none rounded hover:bg-red-100 dark:hover:bg-red-700/50"
              title="Видалити цей екземпляр цілі"
            >
              <Trash2 size={16} />
            </button>
            {isAssocPopoverOpen && (
              <AssociatedListsPopover
                targetGoal={goal}
                onClose={closeAssocPopover}
                anchorEl={popoverAnchorRef.current}
              />
            )}
          </div>
        </li>
      )}
    </Draggable>
  );
}

export default SortableGoalItem;
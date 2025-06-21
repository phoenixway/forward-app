// src/renderer/components/TabItem.tsx
import React from "react";
import type { Tab } from "./MainPanel";
import { X } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  OnDragEndResponder,
} from "@hello-pangea/dnd"; // <--- ІМПОРТ

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: (tabId: string) => void;
  onClose?: (tabId: string) => void;
}

const TabItem: React.FC<TabItemProps> = ({
  tab,
  isActive,
  onClick,
  onClose,
}) => {
  const handlePrimaryClick = () => {
    onClick(tab.id);
  };

  const handleCloseClick = (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    if (onClose && tab.isClosable) {
      onClose(tab.id);
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button === 1 && onClose && tab.isClosable) {
      event.preventDefault();
      handleCloseClick();
    }
  };
  // const onDragEnd: OnDragEndResponder<string> = () => {}; // <--- ВИПРАВЛЕНО ЗАЛЕЖНІСТЬ

  // Вкладки, що представляють списки цілей, будуть дроп-зонами
  const isGoalListTab = tab.type === "goal-list" && tab.listId;

  return (
    // <DragDropContext onDragEnd={onDragEnd}>
    <Droppable
      droppableId={`tab-${tab.listId || tab.id}`} // Унікальний ID для дроп-зони вкладки
      type="GOAL" // Приймає тільки цілі
      isDropDisabled={!isGoalListTab || isActive} // Не можна кидати на активну вкладку або не на список цілей
      direction="horizontal" // Вкладки розташовані горизонтально
    >
      {(provided, snapshot) => (
        <div // Цей div є кореневим елементом для Droppable
          ref={provided.innerRef} // ref від Droppable
          {...provided.droppableProps} // props від Droppable
          onClick={handlePrimaryClick}
          onMouseDown={handleMouseDown}
          className={`flex items-center justify-between cursor-pointer text-sm whitespace-nowrap
            border-r border-slate-300 dark:border-slate-700 last:border-r-0 group flex-shrink-0
            ${
              isActive
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 relative px-3 py-1.5"
                : `text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 ${
                    snapshot.isDraggingOver && isGoalListTab
                      ? "bg-green-100 dark:bg-green-700/50 ring-1 ring-green-500" // Підсвітка при перетягуванні НА вкладку
                      : ""
                  }`
            }`}
          title={tab.title}
          role="tab"
          aria-selected={isActive}
        >
          <span
            className={`truncate max-w-[150px] ${isActive ? "font-medium" : ""}`}
          >
            {tab.title}
          </span>
          {tab.isClosable && onClose && (
            <button
              onClick={handleCloseClick}
              className={`ml-2 p-0.5 rounded-full
                          ${
                            isActive
                              ? "text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-700"
                              : "text-slate-400 dark:text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 opacity-50 group-hover:opacity-100"
                          }`}
              aria-label={`Закрити вкладку ${tab.title}`}
              title={`Закрити вкладку ${tab.title}`}
            >
              <X size={14} />
            </button>
          )}
          {/*
            ОСЬ ТУТ МАЄ БУТИ ПЛЕЙСХОЛДЕР!
            Він має бути прямим нащадком елемента, якому присвоєно provided.innerRef
          */}
          <div style={{ display: "none" }}>{provided.placeholder}</div>

          {/* {provided.placeholder} */}
        </div>
      )}
    </Droppable>
    // </DragDropContext>
  );
};

export default TabItem;

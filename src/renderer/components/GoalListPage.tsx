// src/renderer/components/GoalListPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import * as goalListStore from "../data/goalListsStore";
import type { Goal, GoalList as GoalListType } from "../data/goalListsStore";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import { SearchX, ListChecks } from "lucide-react";
import SortableGoalItem from "./SortableGoalItem";

interface GoalListPageProps {
  listId: string;
  filterText: string;
  refreshSignal: number;
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void;
  onNeedsSidebarRefresh?: () => void;
}

function GoalListPage({
  listId,
  filterText,
  refreshSignal,
  obsidianVaultName,
  onTagClickForFilter,
  onNeedsSidebarRefresh,
}: GoalListPageProps) {
  const [listInfo, setListInfo] = useState<Omit<
    GoalListType,
    "itemGoalIds"
  > | null>(null);
  const [displayedGoals, setDisplayedGoals] = useState<Goal[]>([]);
  const [activeFilteredGoals, setActiveFilteredGoals] = useState<Goal[]>([]);

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");
  const editGoalInputRef = useRef<HTMLTextAreaElement>(null);

  const loadListAndGoals = useCallback(() => {
    const foundList = goalListStore.getGoalListById(listId);
    if (foundList) {
      const { itemGoalIds, ...restOfListInfo } = foundList; // itemGoalIds тут не використовується для listInfo
      setListInfo(restOfListInfo);
      const goalsForThisList = goalListStore.getGoalsForList(listId);
      setDisplayedGoals(goalsForThisList);
    } else {
      setListInfo(null);
      setDisplayedGoals([]);
      console.warn(`[GoalListPage] List ${listId} not found.`);
    }
  }, [listId]); // refreshSignal прибрано звідси, щоб не перезавантажувати при кожному DND або малій зміні

  useEffect(() => {
    // console.log(`[GoalListPage] useEffect for listId change: ${listId}. Calling loadListAndGoals.`);
    loadListAndGoals();
  }, [listId, loadListAndGoals]); // Залежність від listId

  useEffect(() => {
    // console.log(`[GoalListPage] useEffect for refreshSignal: ${refreshSignal}. Calling loadListAndGoals.`);
    // Цей ефект спрацьовує, коли батько хоче оновити дані (наприклад, після додавання цілі)
    if (refreshSignal > 0) {
      // Перевірка, щоб не викликати при першому рендері, якщо refreshSignal = 0
      loadListAndGoals();
    }
  }, [refreshSignal, loadListAndGoals]);

  useEffect(() => {
    if (listInfo) {
      // listInfo тепер не залежить від refreshSignal напряму
      if (!filterText.trim()) {
        setActiveFilteredGoals(displayedGoals);
      } else {
        const lowercasedFilter = filterText.toLowerCase();
        setActiveFilteredGoals(
          displayedGoals.filter((goal) =>
            goal.text.toLowerCase().includes(lowercasedFilter),
          ),
        );
      }
    } else {
      setActiveFilteredGoals([]);
    }
  }, [listInfo, displayedGoals, filterText]);

  useEffect(() => {
    if (editingGoal && editGoalInputRef.current) {
      editGoalInputRef.current.focus();
      editGoalInputRef.current.select();
    }
  }, [editingGoal]);

  const handleToggleGoal = useCallback((goalId: string) => {
    goalListStore.toggleGlobalGoalCompletion(goalId);
    setDisplayedGoals((currentGoals) =>
      currentGoals.map((g) =>
        g.id === goalId ? { ...g, completed: !g.completed } : g,
      ),
    );
  }, []); // setDisplayedGoals стабільний

  const handleDeleteGoal = useCallback(
    (goalId: string) => {
      const goalToDelete = displayedGoals.find((g) => g.id === goalId); // Шукаємо в displayedGoals
      if (
        goalToDelete &&
        window.confirm(
          `Видалити ціль "${goalToDelete.text}" зі списку? (Ціль залишиться глобально, якщо використовується в інших списках)`,
        )
      ) {
        goalListStore.removeGoalFromList(listId, goalId);
        setDisplayedGoals((prevGoals) =>
          prevGoals.filter((goal) => goal.id !== goalId),
        );
        if (editingGoal?.id === goalId) {
          setEditingGoal(null);
          setEditingGoalText("");
        }
        if (onNeedsSidebarRefresh) {
          onNeedsSidebarRefresh();
        }
      }
    },
    [listId, displayedGoals, editingGoal?.id, onNeedsSidebarRefresh], // displayedGoals додано в залежності
  );

  const handleStartEditGoal = useCallback((goal: Goal) => {
    if (goal.completed) return;
    setEditingGoal(goal);
    setEditingGoalText(goal.text);
  }, []); // setEditingGoal, setEditingGoalText стабільні

  const handleCancelEditGoal = useCallback(() => {
    setEditingGoal(null);
    setEditingGoalText("");
  }, []); // setEditingGoal, setEditingGoalText стабільні

  const handleSubmitEditGoal = useCallback(() => {
    if (!editingGoal) return;
    if (!editingGoalText.trim()) {
      alert("Текст цілі не може бути порожнім.");
      editGoalInputRef.current?.focus();
      return;
    }
    try {
      goalListStore.updateGlobalGoalText(
        editingGoal.id,
        editingGoalText.trim(),
      );
      setDisplayedGoals((currentGoals) =>
        currentGoals.map((g) =>
          g.id === editingGoal.id ? { ...g, text: editingGoalText.trim() } : g,
        ),
      );
      setEditingGoal(null);
      setEditingGoalText("");
    } catch (error: any) {
      alert((error as Error).message);
    }
  }, [editingGoal, editingGoalText]); // setDisplayedGoals, setEditingGoal, setEditingGoalText стабільні

  const handleDataRefreshRequestFromPopover = useCallback(() => {
    loadListAndGoals();
  }, [loadListAndGoals]);

  const handleSidebarRefreshRequestFromPopover = useCallback(() => {
    if (onNeedsSidebarRefresh) {
      onNeedsSidebarRefresh();
    }
  }, [onNeedsSidebarRefresh]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // itemsToReorder завжди базується на activeFilteredGoals, бо користувач сортує те, що бачить
    const itemsToReorder = Array.from(activeFilteredGoals);
    const [reorderedItemFromActive] = itemsToReorder.splice(source.index, 1);
    itemsToReorder.splice(destination.index, 0, reorderedItemFromActive);

    // Негайно оновлюємо activeFilteredGoals для UI
    setActiveFilteredGoals(itemsToReorder);

    // Тепер готуємо масив ID для збереження в сторі.
    // Якщо фільтр неактивний, то `itemsToReorder` (оновлений `activeFilteredGoals`) є новим `displayedGoals`.
    if (!filterText.trim()) {
      setDisplayedGoals(itemsToReorder);
      const finalOrderedIdsForStore = itemsToReorder.map((goal) => goal.id);
      goalListStore.updateGoalOrderInList(listId, finalOrderedIdsForStore);
      console.log(
        `Reordered (no filter) ${draggableId} from index ${source.index} to ${destination.index}. Store updated.`,
      );
    } else {
      // Якщо фільтр активний, потрібно реконструювати `displayedGoals`.
      const newDisplayedGoals = Array.from(displayedGoals);
      const itemBeingMovedInDisplayed = newDisplayedGoals.find(
        (g) => g.id === draggableId,
      );

      if (!itemBeingMovedInDisplayed) {
        console.error(
          "DND: Переміщуваний елемент не знайдено в displayedGoals. Це не повинно трапитися.",
        );
        return; // Або інша обробка помилки
      }

      // Видаляємо елемент зі старої позиції в displayedGoals
      const oldIndexInDisplayed = newDisplayedGoals.findIndex(
        (g) => g.id === draggableId,
      );
      if (oldIndexInDisplayed > -1) {
        newDisplayedGoals.splice(oldIndexInDisplayed, 1);
      }

      // Знаходимо новий індекс для вставки в displayedGoals.
      // `destination.index` - це індекс у `itemsToReorder` (оновленому `activeFilteredGoals`).
      let targetIndexInDisplayed;

      if (destination.index === 0) {
        // Якщо вставляємо на початок ВІДФІЛЬТРОВАНОГО списку
        // Знаходимо, де перший елемент ВІДФІЛЬТРОВАНОГО списку знаходиться у ПОВНОМУ списку
        const firstActiveItemId = itemsToReorder[0]?.id;
        if (firstActiveItemId) {
          const indexOfFirstActiveInDisplayed = newDisplayedGoals.findIndex(
            (g) => g.id === firstActiveItemId,
          );
          targetIndexInDisplayed =
            indexOfFirstActiveInDisplayed !== -1
              ? indexOfFirstActiveInDisplayed
              : 0;
        } else {
          // Якщо відфільтрований список став порожнім (малоймовірно тут, але для безпеки)
          targetIndexInDisplayed = 0;
        }
      } else {
        // Якщо вставляємо після якогось елемента у ВІДФІЛЬТРОВАНОМУ списку
        const itemBeforeIdInActive = itemsToReorder[destination.index - 1]?.id;
        if (itemBeforeIdInActive) {
          const indexOfItemBeforeInDisplayed = newDisplayedGoals.findIndex(
            (g) => g.id === itemBeforeIdInActive,
          );
          targetIndexInDisplayed =
            indexOfItemBeforeInDisplayed !== -1
              ? indexOfItemBeforeInDisplayed + 1
              : newDisplayedGoals.length;
        } else {
          // Якщо немає попереднього елемента (малоймовірно)
          targetIndexInDisplayed = newDisplayedGoals.length;
        }
      }

      newDisplayedGoals.splice(
        Math.min(targetIndexInDisplayed, newDisplayedGoals.length),
        0,
        itemBeingMovedInDisplayed,
      );
      setDisplayedGoals(newDisplayedGoals);

      const finalOrderedIdsForStore = newDisplayedGoals.map((goal) => goal.id);
      goalListStore.updateGoalOrderInList(listId, finalOrderedIdsForStore);
      console.log(
        `Reordered (with filter) ${draggableId} from index ${source.index} (filtered) to ${destination.index} (filtered). Store updated based on new displayedGoals order.`,
      );
    }
  };

  if (!listInfo) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <ListChecks
          size={48}
          className="text-slate-400 dark:text-slate-500 mb-4"
          strokeWidth={1.5}
        />
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Завантаження даних списку "{listId}"...
        </p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="pt-3 pl-1.5 pr-4 pb-4 min-h-full flex flex-col">
        {editingGoal && (
          <div className="mb-3 p-3 border border-blue-400 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 shadow-md flex-shrink-0">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1.5">
              Редагувати ціль
            </h3>
            <textarea
              ref={editGoalInputRef}
              value={editingGoalText}
              onChange={(e) => setEditingGoalText(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500 sm:text-sm mb-2 min-h-[50px]"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitEditGoal();
                }
                if (e.key === "Escape") handleCancelEditGoal();
              }}
            />
            <div className="flex justify-end space-x-1.5">
              <button
                onClick={handleCancelEditGoal}
                className="px-3 py-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-500 hover:bg-slate-300 dark:hover:bg-slate-400 rounded-md font-medium"
              >
                Скасувати
              </button>
              <button
                onClick={handleSubmitEditGoal}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium"
              >
                Зберегти
              </button>
            </div>
          </div>
        )}

        <div className="flex-grow pr-1 overflow-y-auto">
          {activeFilteredGoals.length === 0 && !editingGoal && (
            <div className="text-center py-8 px-2 flex flex-col items-center justify-center h-full">
              <SearchX
                size={40}
                className="text-slate-400 dark:text-slate-500 mb-3"
                strokeWidth={1.5}
              />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {filterText.trim()
                  ? `Цілей за фільтром "${filterText}" не знайдено у списку "${listInfo.name}".`
                  : `У списку "${listInfo.name}" ще немає цілей.`}
              </p>
              {!filterText.trim() && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Додайте першу ціль, використовуючи командний рядок внизу
                  екрана.
                </p>
              )}
            </div>
          )}
          {activeFilteredGoals.length > 0 && (
            <Droppable droppableId={listId} type="GOAL">
              {(provided, snapshot) => (
                <ul
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-1.5 ${snapshot.isDraggingOver ? "bg-slate-100 dark:bg-slate-700/50 rounded-md p-1" : ""}`}
                >
                  {activeFilteredGoals.map((goal, itemIndex) => (
                    <SortableGoalItem
                      key={goal.id}
                      goal={goal}
                      index={itemIndex}
                      onToggle={handleToggleGoal}
                      obsidianVaultName={obsidianVaultName}
                      onTagClickForFilter={onTagClickForFilter}
                      listIdThisGoalBelongsTo={listId} // Передаємо
                      onDelete={handleDeleteGoal}
                      onStartEdit={handleStartEditGoal}
                      onDataShouldRefreshInParent={
                        handleDataRefreshRequestFromPopover
                      }
                      onSidebarShouldRefreshListsInParent={
                        handleSidebarRefreshRequestFromPopover
                      }
                    />
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          )}
        </div>
      </div>
    </DragDropContext>
  );
}

export default GoalListPage;

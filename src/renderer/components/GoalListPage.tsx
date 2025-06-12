// src/renderer/components/GoalListPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import * as goalListStore from "../data/goalListsStore";
import type { Goal, GoalList as GoalListType } from "../data/goalListsStore";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SearchX, ListChecks } from "lucide-react"; // GripVertical, Edit2, Trash2 - тепер у SortableGoalItem
import SortableGoalItem from "./SortableGoalItem";

interface GoalListPageProps {
  listId: string;
  filterText: string;
  refreshSignal: number; // Цей сигнал може використовуватися для примусового перезавантаження з MainPanel
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void;
  onNeedsSidebarRefresh?: () => void; // Для оновлення Sidebar, якщо новий список створено через поповер
}

function GoalListPage({
  listId,
  filterText,
  refreshSignal,
  obsidianVaultName,
  onTagClickForFilter,
  onNeedsSidebarRefresh,
}: GoalListPageProps) {
  const [listInfo, setListInfo] = useState<Omit<GoalListType, 'itemGoalIds'> | null>(null); // Інформація про список (без самих цілей)
  const [displayedGoals, setDisplayedGoals] = useState<Goal[]>([]); // Цілі, що зберігаються в списку
  const [activeFilteredGoals, setActiveFilteredGoals] = useState<Goal[]>([]); // Цілі після фільтрації

  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");
  const editGoalInputRef = useRef<HTMLTextAreaElement>(null);

  const loadListAndGoals = useCallback(() => {
    const foundList = goalListStore.getGoalListById(listId);
    if (foundList) {
      const { itemGoalIds, ...restOfListInfo } = foundList;
      setListInfo(restOfListInfo);
      const goalsForThisList = goalListStore.getGoalsForList(listId);
      setDisplayedGoals(goalsForThisList);
    } else {
      setListInfo(null);
      setDisplayedGoals([]);
    }
  }, [listId]);

  useEffect(() => {
    loadListAndGoals();
  }, [loadListAndGoals, refreshSignal]); // refreshSignal змусить перезавантажити

  useEffect(() => {
    if (listInfo) { // Перевіряємо listInfo замість list (який тепер не містить цілі)
      if (!filterText.trim()) {
        setActiveFilteredGoals(displayedGoals);
      } else {
        const lowercasedFilter = filterText.toLowerCase();
        setActiveFilteredGoals(
          displayedGoals.filter((goal) =>
            goal.text.toLowerCase().includes(lowercasedFilter)
          )
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (filterText.trim()) {
      alert("Будь ласка, очистіть фільтр для сортування цілей.");
      return;
    }
    if (over && active.id !== over.id && listInfo) { // Використовуємо listInfo
      // Важливо: arrayMove працює з поточним відфільтрованим списком (activeFilteredGoals),
      // але зберігати порядок треба для повного списку displayedGoals.
      // Якщо фільтр активний, сортування може бути непередбачуваним або його треба заборонити.
      // Зараз assumed, що displayedGoals - це те, що ми сортуємо.

      const oldIndex = displayedGoals.findIndex((goal) => goal.id === active.id);
      const newIndex = displayedGoals.findIndex((goal) => goal.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) {
        console.warn("Помилка сортування: ціль не знайдено в displayedGoals.");
        return;
      }
      
      const newOrderedGoalsFullList = arrayMove([...displayedGoals], oldIndex, newIndex);
      setDisplayedGoals(newOrderedGoalsFullList); // Оновлюємо локальний стан для негайного відображення
      
      // Зберігаємо новий порядок ID
      goalListStore.updateGoalOrderInList(
        listId,
        newOrderedGoalsFullList.map((g) => g.id)
      );
      // Немає потреби викликати loadListAndGoals(), бо ми вже оновили displayedGoals
    }
  };

  const handleToggleGoal = useCallback(
    (goalId: string) => {
      goalListStore.toggleGlobalGoalCompletion(goalId);
      loadListAndGoals(); // Перезавантажуємо, щоб отримати оновлений статус цілі
    },
    [loadListAndGoals] // listId не потрібен, бо goalId глобальний
  );

  const handleDeleteGoal = useCallback(
    (goalId: string) => {
      const goalToDelete = displayedGoals.find((g) => g.id === goalId);
      if (
        goalToDelete &&
        window.confirm(`Видалити ціль "${goalToDelete.text}" зі списку? (Ціль залишиться глобально, якщо використовується в інших списках)`)
      ) {
        goalListStore.removeGoalFromList(listId, goalId);
        loadListAndGoals(); // Перезавантажуємо для оновлення списку цілей
        if (editingGoal?.id === goalId) {
          setEditingGoal(null);
          setEditingGoalText("");
        }
      }
    },
    [listId, loadListAndGoals, displayedGoals, editingGoal?.id]
  );

  const handleStartEditGoal = useCallback((goal: Goal) => {
    if (goal.completed) return;
    setEditingGoal(goal);
    setEditingGoalText(goal.text);
  }, []);

  const handleCancelEditGoal = useCallback(() => {
    setEditingGoal(null);
    setEditingGoalText("");
  }, []);

  const handleSubmitEditGoal = useCallback(() => {
    if (!editingGoal) return;
    if (!editingGoalText.trim()) {
      // Замість видалення, просто скасуємо редагування або покажемо помилку
      alert("Текст цілі не може бути порожнім.");
      editGoalInputRef.current?.focus();
      return;
    }
    try {
      goalListStore.updateGlobalGoalText( // Оновлюємо глобальну ціль
        editingGoal.id,
        editingGoalText.trim()
      );
      loadListAndGoals(); // Перезавантажуємо для оновлення тексту
      setEditingGoal(null);
      setEditingGoalText("");
    } catch (error) {
      alert((error as Error).message);
    }
  }, [editingGoal, editingGoalText, loadListAndGoals]);


  const handleDataRefreshRequestFromPopover = useCallback(() => {
    loadListAndGoals();
  }, [loadListAndGoals]);

  const handleSidebarRefreshRequestFromPopover = useCallback(() => {
    if (onNeedsSidebarRefresh) {
      onNeedsSidebarRefresh();
    }
  }, [onNeedsSidebarRefresh]);


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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
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
              className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-500 rounded-md 
                         bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100
                         focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 
                         focus:border-indigo-500 dark:focus:border-indigo-400 
                         placeholder-slate-400 dark:placeholder-slate-500 sm:text-sm mb-2 min-h-[50px]"
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

        <div className="flex-grow pr-1 overflow-y-auto"> {/* Додав overflow-y-auto сюди */}
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
            <SortableContext
              items={activeFilteredGoals.map((goal) => goal.id)} // Сортуємо відфільтровані, але DragEnd працює з displayedGoals
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1.5">
                {activeFilteredGoals.map((goal) => (
                  <SortableGoalItem
                    key={goal.id}
                    goal={goal}
                    listIdThisGoalBelongsTo={listId} // Передаємо ID поточного списку
                    onToggle={handleToggleGoal}
                    onDelete={handleDeleteGoal}
                    onStartEdit={handleStartEditGoal}
                    obsidianVaultName={obsidianVaultName}
                    onTagClickForFilter={onTagClickForFilter}
                    onDataShouldRefreshInParent={handleDataRefreshRequestFromPopover}
                    onSidebarShouldRefreshListsInParent={handleSidebarRefreshRequestFromPopover}
                  />
                ))}
              </ul>
            </SortableContext>
          )}
        </div>
      </div>
    </DndContext>
  );
}

export default GoalListPage;
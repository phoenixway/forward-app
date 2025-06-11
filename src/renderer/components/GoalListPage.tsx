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
// CSS та іконки не змінюються
import { GripVertical, Edit2, Trash2, SearchX, ListChecks } from "lucide-react";
import SortableGoalItem from "./SortableGoalItem";

interface GoalListPageProps {
  listId: string;
  filterText: string;
  refreshSignal: number;
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void; // <-- НОВИЙ ПРОП
}

// SortableGoalItemProps тут більше не потрібен, бо SortableGoalItem - окремий компонент

function GoalListPage({
  listId,
  filterText,
  refreshSignal,
  obsidianVaultName,
  onTagClickForFilter, // <-- ОТРИМУЄМО НОВИЙ ПРОП
}: GoalListPageProps) {
  const [list, setList] = useState<GoalListType | null>(null);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");
  const editGoalInputRef = useRef<HTMLTextAreaElement>(null);

  const loadListDetails = useCallback(() => {
    const foundList = goalListStore.getGoalListById(listId);
    if (foundList) {
      setList({ ...foundList, goals: [...foundList.goals] });
    } else {
      setList(null);
    }
  }, [listId]);

  useEffect(() => {
    loadListDetails();
  }, [loadListDetails, refreshSignal]);

  useEffect(() => {
    if (list) {
      const goalsToFilter = list.goals;
      if (!filterText.trim()) {
        setActiveGoals(goalsToFilter);
      } else {
        const lowercasedFilter = filterText.toLowerCase();
        setActiveGoals(
          goalsToFilter.filter((goal) =>
            goal.text.toLowerCase().includes(lowercasedFilter)
          )
        );
      }
    } else {
      setActiveGoals([]);
    }
  }, [list, filterText]);

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
    if (over && active.id !== over.id && list) {
      const oldIndex = list.goals.findIndex((goal) => goal.id === active.id);
      const newIndex = list.goals.findIndex((goal) => goal.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOrderedGoals = arrayMove(list.goals, oldIndex, newIndex);
      setList((prev) => (prev ? { ...prev, goals: newOrderedGoals } : null));
      goalListStore.updateGoalOrder(
        listId,
        newOrderedGoals.map((g) => g.id)
      );
    }
  };

  const handleToggleGoal = useCallback(
    (goalId: string) => {
      goalListStore.toggleGoalCompletion(listId, goalId);
      loadListDetails();
    },
    [listId, loadListDetails]
  );

  const handleDeleteGoal = useCallback(
    (goalId: string) => {
      const goalToDelete = list?.goals.find((g) => g.id === goalId);
      if (
        goalToDelete &&
        window.confirm(`Видалити ціль "${goalToDelete.text}"?`)
      ) {
        goalListStore.deleteGoalFromList(listId, goalId);
        loadListDetails();
        if (editingGoal?.id === goalId) {
          setEditingGoal(null);
          setEditingGoalText("");
        }
      }
    },
    [listId, loadListDetails, list, editingGoal?.id]
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
      if (window.confirm("Текст цілі порожній. Видалити цю ціль?")) {
        handleDeleteGoal(editingGoal.id);
      }
      setEditingGoal(null);
      setEditingGoalText("");
      return;
    }
    try {
      goalListStore.updateGoalText(
        listId,
        editingGoal.id,
        editingGoalText.trim()
      );
      loadListDetails();
      setEditingGoal(null);
      setEditingGoalText("");
    } catch (error) {
      alert((error as Error).message);
    }
  }, [listId, editingGoal, editingGoalText, loadListDetails, handleDeleteGoal]);

  if (!list) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <ListChecks
          size={48}
          className="text-slate-400 dark:text-slate-500 mb-4"
          strokeWidth={1.5}
        />
        <p className="text-slate-500 dark:text-slate-400 text-lg">
          Завантаження даних списку...
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

        <div className="flex-grow pr-1">
          {activeGoals.length === 0 && !editingGoal && (
            <div className="text-center py-8 px-2 flex flex-col items-center justify-center h-full">
              <SearchX
                size={40}
                className="text-slate-400 dark:text-slate-500 mb-3"
                strokeWidth={1.5}
              />
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {filterText.trim()
                  ? "Цілей за вашим фільтром не знайдено."
                  : "У цьому списку ще немає цілей."}
              </p>
              {!filterText.trim() && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Додайте першу ціль, використовуючи командний рядок внизу
                  екрана.
                </p>
              )}
            </div>
          )}
          {activeGoals.length > 0 && (
            <SortableContext
              items={activeGoals.map((goal) => goal.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1.5">
                {activeGoals.map((goal) => (
                  <SortableGoalItem
                    key={goal.id}
                    goal={goal}
                    onToggle={handleToggleGoal}
                    onDelete={handleDeleteGoal}
                    onStartEdit={handleStartEditGoal}
                    obsidianVaultName={obsidianVaultName}
                    onTagClickForFilter={onTagClickForFilter} // <-- ПЕРЕДАЄМО КОЛБЕК ДО SortableGoalItem
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
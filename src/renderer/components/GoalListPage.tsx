// src/renderer/components/GoalListPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import {
  makeSelectListInfo,
  makeSelectGoalInstancesForList,
} from "../store/selectors";
import {
  goalToggled,
  instanceRemovedFromList,
  goalUpdated,
} from "../store/listsSlice";
import type { Goal, GoalInstance } from "../types";
import { SearchX, ListChecks } from "lucide-react";
import SortableGoalItem from "./SortableGoalItem";

interface GoalListPageProps {
  listId: string;
  filterText: string;
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void;
}

function GoalListPage({
  listId,
  filterText,
  obsidianVaultName,
  onTagClickForFilter,
}: GoalListPageProps) {
  const dispatch = useDispatch<AppDispatch>();

  // --- ВИПРАВЛЕНО: Використовуємо два окремі мемоізовані селектори ---
  const selectListInfo = useMemo(makeSelectListInfo, []);
  const selectGoalInstancesForList = useMemo(
    makeSelectGoalInstancesForList,
    [],
  );

  const listInfo = useSelector((state: RootState) =>
    selectListInfo(state, listId),
  );
  const displayedGoalInstances = useSelector((state: RootState) =>
    selectGoalInstancesForList(state, listId),
  );

  const [activeFilteredGoals, setActiveFilteredGoals] = useState<
    { instance: GoalInstance; goal: Goal }[]
  >([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");
  const editGoalInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (listInfo) {
      if (!filterText.trim()) {
        setActiveFilteredGoals(displayedGoalInstances);
      } else {
        const lowercasedFilter = filterText.toLowerCase();
        setActiveFilteredGoals(
          displayedGoalInstances.filter(({ goal }) =>
            goal.text.toLowerCase().includes(lowercasedFilter),
          ),
        );
      }
    } else {
      setActiveFilteredGoals([]);
    }
  }, [listInfo, displayedGoalInstances, filterText]);

  useEffect(() => {
    if (editingGoal && editGoalInputRef.current) {
      editGoalInputRef.current.focus();
      editGoalInputRef.current.select();
    }
  }, [editingGoal]);

  const handleToggleGoal = useCallback(
    (goalId: string) => {
      dispatch(goalToggled(goalId));
    },
    [dispatch],
  );

  const handleDeleteGoal = useCallback(
    (instanceId: string) => {
      const goalInstanceToDelete = displayedGoalInstances.find(
        ({ instance }) => instance.id === instanceId,
      );
      if (
        goalInstanceToDelete &&
        window.confirm(
          `Видалити ціль "${goalInstanceToDelete.goal.text}" зі списку?`,
        )
      ) {
        dispatch(instanceRemovedFromList({ listId, instanceId }));
        if (editingGoal?.id === goalInstanceToDelete.goal.id) {
          setEditingGoal(null);
          setEditingGoalText("");
        }
      }
    },
    [listId, displayedGoalInstances, editingGoal, dispatch],
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
      alert("Текст цілі не може бути порожнім.");
      editGoalInputRef.current?.focus();
      return;
    }
    dispatch(goalUpdated({ id: editingGoal.id, text: editingGoalText.trim() }));
    setEditingGoal(null);
    setEditingGoalText("");
  }, [dispatch, editingGoal, editingGoalText]);

  if (!listInfo) {
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
        <p className="text-xs text-slate-400 dark:text-slate-500">
          ID: {listId}
        </p>
      </div>
    );
  }

  return (
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
                Додайте першу ціль, використовуючи командний рядок внизу екрана.
              </p>
            )}
          </div>
        )}
        {activeFilteredGoals.length > 0 && (
          <ul className="space-y-1.5">
            {activeFilteredGoals.map(({ instance, goal }, itemIndex) => (
              <SortableGoalItem
                key={instance.id}
                instanceId={instance.id}
                goal={goal}
                index={itemIndex}
                onToggle={handleToggleGoal}
                onDelete={handleDeleteGoal}
                onStartEdit={handleStartEditGoal}
                obsidianVaultName={obsidianVaultName}
                onTagClickForFilter={onTagClickForFilter}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default React.memo(GoalListPage);

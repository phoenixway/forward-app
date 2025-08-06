// src/renderer/components/GoalListPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
// ВИПРАВЛЕНО: Імпортуємо типізовані хуки
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  makeSelectListInfo,
  makeSelectEnrichedGoalInstances,
} from "../store/selectors";
import {
  goalToggled,
  instanceRemovedFromList,
} from "../store/listsSlice";
// ВИПРАВЛЕНО: Використовуємо оновлені типи
import type { Goal, GoalInstance, GoalList } from "../types";
import { SearchX, ListChecks } from "lucide-react";
import SortableGoalItem from "./SortableGoalItem";
import GoalEditModal from './GoalEditModal';

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
  // ВИПРАВЛЕНО: Використовуємо useAppDispatch
  const dispatch = useAppDispatch();

  const selectListInfo = useMemo(makeSelectListInfo, []);
  const selectEnrichedInstances = useMemo(makeSelectEnrichedGoalInstances, []);

  // ВИПРАВЛЕНО: Використовуємо useAppSelector
  const listInfo = useAppSelector((state) =>
    selectListInfo(state, listId),
  );
  const allEnrichedGoals = useAppSelector((state) =>
    selectEnrichedInstances(state, listId),
  );

  const [activeFilteredGoals, setActiveFilteredGoals] = useState<
    Array<{
      instance: GoalInstance;
      goal: Goal;
      associatedLists: GoalList[];
    }>
  >([]);
  
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (!filterText.trim()) {
      setActiveFilteredGoals(allEnrichedGoals);
    } else {
      const lowercasedFilter = filterText.toLowerCase();
      setActiveFilteredGoals(
        allEnrichedGoals.filter(({ goal }) =>
          goal.text.toLowerCase().includes(lowercasedFilter),
        ),
      );
    }
  }, [allEnrichedGoals, filterText]);

  const handleToggleGoal = useCallback(
    (goalId: string) => {
      dispatch(goalToggled(goalId));
    },
    [dispatch],
  );

  const handleDeleteGoal = useCallback(
    (instanceId: string) => {
      const goalInstanceToDelete = allEnrichedGoals.find(
        // ВИПРАВЛЕНО: Звертаємось до instance.instanceId
        ({ instance }: { instance: GoalInstance }) => instance.instanceId === instanceId,
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
        }
      }
    },
    [listId, allEnrichedGoals, editingGoal, dispatch],
  );

  const handleStartEditGoal = useCallback((goal: Goal) => {
    if (goal.completed) return;
    setEditingGoal(goal);
  }, []);

  const handleCancelEditGoal = useCallback(() => {
    setEditingGoal(null);
  }, []);


  if (!listInfo) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <ListChecks size={48} className="text-slate-400 dark:text-slate-500 mb-4" strokeWidth={1.5} />
        <p className="text-slate-500 dark:text-slate-400 text-lg">Завантаження даних списку...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">ID: {listId}</p>
      </div>
    );
  }

  return (
    <div className="pt-3 pl-1.5 pr-4 pb-4 min-h-full flex flex-col">
      <div className="flex-grow pr-1 overflow-y-auto">
        {activeFilteredGoals.length === 0 && !editingGoal && (
          <div className="text-center py-8 px-2 flex flex-col items-center justify-center h-full">
            <SearchX size={40} className="text-slate-400 dark:text-slate-500 mb-3" strokeWidth={1.5} />
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
            {activeFilteredGoals.map(({ instance, goal, associatedLists }, itemIndex) => (
              <SortableGoalItem
                // ВИПРАВЛЕНО: Використовуємо instance.instanceId
                key={instance.instanceId}
                instanceId={instance.instanceId}
                goal={goal}
                associatedLists={associatedLists}
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

      {editingGoal && (
        <GoalEditModal 
          goal={editingGoal} 
          onClose={handleCancelEditGoal} 
        />
      )}
    </div>
  );
}

export default React.memo(GoalListPage);
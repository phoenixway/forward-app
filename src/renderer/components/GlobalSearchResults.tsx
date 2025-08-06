// src/renderer/components/GlobalSearchResults.tsx
import React from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store/store';
import { setGlobalFilterTerm, setGoalToHighlight } from '../store/uiSlice';
import type { Goal } from '../types';
import GoalItem from './GoalItem';
import { dispatchOpenGoalListEvent } from './Sidebar';

const selectFilteredGoals = createSelector(
  (state: RootState) => state.lists.goals,
  (state: RootState) => state.ui.globalFilterTerm,
  (allGoals, filterTerm) => {
    if (!filterTerm) return [];
    const lowerCaseFilter = filterTerm.toLowerCase();
    return Object.values(allGoals).filter((goal: Goal) =>
      goal.text.toLowerCase().includes(lowerCaseFilter)
    );
  }
);
const selectAllLists = (state: RootState) => state.lists.goalLists;

interface GlobalSearchResultsProps {
  obsidianVaultName: string;
}

const GlobalSearchResults: React.FC<GlobalSearchResultsProps> = ({ obsidianVaultName }) => {
  const dispatch = useAppDispatch();
  const filteredGoals = useAppSelector(selectFilteredGoals);
  const filterTerm = useAppSelector((state) => state.ui.globalFilterTerm);
  const allLists = useAppSelector(selectAllLists);
  const goalInstances = useAppSelector((state) => state.lists.goalInstances);

  // ✨ ВИПРАВЛЕННЯ: Повністю оновлена логіка пошуку батьківського списку
  const findParentList = (goalId: string) => {
    // 1. Знаходимо перший-ліпший екземпляр цієї цілі
    const instance = Object.values(goalInstances).find(inst => inst.goalId === goalId);
    // 2. Якщо екземпляр знайдено, використовуємо його listId, щоб знайти список
    if (instance) {
      return allLists[instance.listId] || null;
    }
    return null;
  };

  const handleNavigate = (goal: Goal) => {
    const parentList = findParentList(goal.id);
    if (parentList) {
      dispatch(setGlobalFilterTerm(''));
      dispatch(setGoalToHighlight(goal.id));
      dispatchOpenGoalListEvent(parentList.id, parentList.name);
    } else {
      alert(`Не вдалося знайти батьківський список для цілі: "${goal.text}"`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-200 dark:bg-slate-950">
        <div className="flex-grow overflow-y-auto bg-slate-50 dark:bg-slate-800 p-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
                    Результати глобального пошуку для:
                    <span className="ml-2 text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                        {filterTerm}
                    </span>
                </h1>
                {filteredGoals.length > 0 ? (
                    <div className="space-y-1">
                        {filteredGoals.map((goal) => {
                            const listName = findParentList(goal.id)?.name;
                            return (
                                <div key={`search-result-${goal.id}`} className="bg-white dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700/50">
                                     <GoalItem
                                        goal={goal}
                                        obsidianVaultName={obsidianVaultName}
                                        onNavigate={handleNavigate}
                                    />
                                    {listName && (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 pl-2 border-t border-slate-100 dark:border-slate-800 pt-1">
                                            Зі списку: <span className="font-medium text-slate-500 dark:text-slate-400">{listName}</span>
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                        Нічого не знайдено за вашим запитом.
                    </p>
                )}
            </div>
        </div>
        <div className="p-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700 shadow- ऊपर-md z-10 flex-shrink-0">
             <button
                onClick={() => dispatch(setGlobalFilterTerm(''))}
                className="w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-md font-medium"
             >
                Закрити пошук і повернутись до вкладок
             </button>
        </div>
    </div>
  );
};

export default GlobalSearchResults;
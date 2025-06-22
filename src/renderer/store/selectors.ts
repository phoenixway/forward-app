// src/renderer/store/selectors.ts
import { createSelector } from "reselect";
import { RootState } from "./store";
import type { Goal, GoalInstance } from "../types";

// Базові селектори
const selectGoals = (state: RootState) => state.goals;
const selectGoalLists = (state: RootState) => state.goalLists;
const selectGoalInstances = (state: RootState) => state.goalInstances;
const selectListId = (_state: RootState, listId: string) => listId;

// --- НОВІ, РОЗДІЛЕНІ СЕЛЕКТОРИ ---

// 1. Створюємо селектор, що повертає ТІЛЬКИ інформацію про список.
// Він буде повертати стабільний об'єкт, якщо назва не змінилася.
export const makeSelectListInfo = () => {
  return createSelector(
    [selectGoalLists, selectListId],
    (goalLists, listId) => {
      const list = goalLists[listId];
      if (!list) return null;
      // Повертаємо об'єкт без масиву ID, щоб він був стабільним
      const { itemInstanceIds, ...listInfo } = list;
      return listInfo;
    },
  );
};

// 2. Створюємо селектор, що повертає ТІЛЬКИ масив екземплярів цілей.
// Він буде повертати той самий масив, якщо дані не змінилися.
export const makeSelectGoalInstancesForList = () => {
  return createSelector(
    [selectGoals, selectGoalLists, selectGoalInstances, selectListId],
    (goals, goalLists, goalInstances, listId) => {
      const list = goalLists[listId];
      if (!list) return [];

      return list.itemInstanceIds
        .map((instanceId) => {
          const instance = goalInstances[instanceId];
          const goal = instance ? goals[instance.goalId] : null;
          // Повертаємо null, якщо щось не знайдено, і відфільтруємо пізніше
          if (!instance || !goal) return null;
          return { instance, goal };
        })
        .filter(Boolean) as { instance: GoalInstance; goal: Goal }[];
    },
  );
};

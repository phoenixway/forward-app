// src/renderer/store/selectors.ts
import { createSelector } from "reselect";
import { RootState } from "./store";
import type { Goal, GoalInstance, GoalList } from "../types";

// Базові селектори
const selectGoals = (state: RootState) => state.goals;
const selectGoalLists = (state: RootState) => state.goalLists;
const selectGoalInstances = (state: RootState) => state.goalInstances;
const selectListId = (_state: RootState, listId: string) => listId;

// +++ ДОДАЙТЕ ЦЕЙ НОВИЙ СЕЛЕКТОР +++
// Він буде повертати масив списків і кешувати результат.
// Новий масив буде створено тільки якщо об'єкт goalLists зміниться.
export const selectAllLists = createSelector([selectGoalLists], (goalLists) =>
  Object.values(goalLists),
);

// --- Існуючий селектор для GoalListPage ---
export const makeSelectListInfo = () => {
  return createSelector(
    [selectGoalLists, selectListId],
    (goalLists, listId) => {
      const list = goalLists[listId];
      if (!list) return null;
      const { itemInstanceIds, ...listInfo } = list;
      return listInfo;
    },
  );
};

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
          if (!instance || !goal) return null;
          return { instance, goal };
        })
        .filter(Boolean) as { instance: GoalInstance; goal: Goal }[];
    },
  );
};

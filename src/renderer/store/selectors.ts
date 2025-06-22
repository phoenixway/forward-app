// src/renderer/store/selectors.ts
import { createSelector } from "reselect";
import { RootState } from "./store";
import type { Goal, GoalInstance, GoalList } from "../types";

// --- ВИПРАВЛЕНО: Всі селектори тепер дивляться в state.lists ---
const selectListsSlice = (state: RootState) => state.lists;

const selectGoals = createSelector([selectListsSlice], (lists) => lists.goals);
const selectGoalLists = createSelector(
  [selectListsSlice],
  (lists) => lists.goalLists,
);
const selectGoalInstances = createSelector(
  [selectListsSlice],
  (lists) => lists.goalInstances,
);
const selectListId = (_state: RootState, listId: string) => listId;

export const selectAllLists = createSelector([selectGoalLists], (goalLists) =>
  Object.values(goalLists),
);

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

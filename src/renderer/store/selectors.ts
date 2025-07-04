// src/renderer/store/selectors.ts
import { createSelector } from "reselect";
import { RootState } from "./store";
import type { Goal, GoalInstance, GoalList } from "../types";

// --- BASE SELECTORS ---
const selectListsSlice = (state: RootState) => state.lists;
const selectAllGoalLists = createSelector([selectListsSlice], (lists) => lists.goalLists);
const selectRootListIds = createSelector([selectListsSlice], (lists) => lists.rootListIds);
const selectGoals = createSelector([selectListsSlice], (lists) => lists.goals);
const selectGoalInstances = createSelector([selectListsSlice], (lists) => lists.goalInstances);
const selectListId = (_state: RootState, listId: string) => listId;

// --- HIERARCHY SELECTORS ---
export const selectTopLevelLists = createSelector(
  [selectAllGoalLists, selectRootListIds],
  (allLists, rootIds) => {
    if (!Array.isArray(rootIds)) {
        // Fallback for older states or during loading
        const allChildIds = new Set(Object.values(allLists).flatMap(l => l.childListIds || []));
        return Object.values(allLists).filter(l => !allChildIds.has(l.id) && (!l.parentId || !allLists[l.parentId]));
    }
    return rootIds.map(id => allLists[id]).filter(Boolean);
  }
);

// --- ORIGINAL SELECTORS (RESTORED) ---
export const selectAllLists = createSelector([selectAllGoalLists], (goalLists) =>
  Object.values(goalLists),
);

export const makeSelectListInfo = () => createSelector(
    [selectAllGoalLists, selectListId],
    (goalLists, listId) => {
      const list = goalLists[listId];
      if (!list) return null;
      const { itemInstanceIds, ...listInfo } = list;
      return listInfo;
    },
);

export const makeSelectGoalInstancesForList = () => createSelector(
    [selectGoals, selectAllGoalLists, selectGoalInstances, selectListId],
    (goals, goalLists, goalInstances, listId) => {
      const list = goalLists[listId];
      if (!list) return [];
      return list.itemInstanceIds
        .map((instanceId) => {
          const instance = goalInstances[instanceId];
          const goal = instance ? goals[instance.goalId] : null;
          return (instance && goal) ? { instance, goal } : null;
        })
        .filter(Boolean) as { instance: GoalInstance; goal: Goal }[];
    },
);

export const makeSelectEnrichedGoalInstances = () => createSelector(
    [makeSelectGoalInstancesForList(), selectAllGoalLists],
    (goalInstancesForList, allGoalLists) => {
      return goalInstancesForList.map(({ instance, goal }) => ({
        instance,
        goal,
        associatedLists: (goal.associatedListIds || [])
          .map(id => allGoalLists[id])
          .filter(Boolean) as GoalList[],
      }));
    }
);

const selectAllGoalsArray = createSelector(
  [selectGoals],
  (goalsRecord): Goal[] => {
    return Object.values(goalsRecord).filter((goal) => !!goal) as Goal[];
  },
);

const extractMatchesFromText = (text: string, regex: RegExp): string[] => {
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[0]);
  }
  return Array.from(matches);
};

export const selectAllUniqueTags = createSelector(
  [selectAllGoalsArray],
  (allGoals) => {
    const allTags = new Set<string>();
    const tagRegex = /(?:\B|^)#[a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+\b/g;
    allGoals.forEach((goal) => {
      if (goal && typeof goal.text === "string") {
        extractMatchesFromText(goal.text, tagRegex).forEach((tag) => allTags.add(tag));
      }
    });
    return Array.from(allTags).sort();
  },
);

export const selectAllUniqueContexts = createSelector(
  [selectAllGoalsArray],
  (allGoals) => {
    const allContexts = new Set<string>();
    const contextRegex = /@[a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+/g;
    allGoals.forEach((goal) => {
      if (goal && typeof goal.text === "string") {
        extractMatchesFromText(goal.text, contextRegex).forEach((context) => allContexts.add(context));
      }
    });
    return Array.from(allContexts).sort();
  },
);
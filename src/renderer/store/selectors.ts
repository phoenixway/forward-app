// src/renderer/store/selectors.ts
import { createSelector } from "reselect";
import { RootState } from "./store";
import type { Goal, GoalInstance, GoalList } from "../types";

// --- BASE SELECTORS ---
const selectListsSlice = (state: RootState) => state.lists;
const selectAllGoalLists = createSelector([selectListsSlice], (lists) => lists.goalLists);
const selectGoals = createSelector([selectListsSlice], (lists) => lists.goals);
const selectGoalInstances = createSelector([selectListsSlice], (lists) => lists.goalInstances);
const selectListId = (_state: RootState, listId: string) => listId;
const selectParentId = (_state: RootState, parentId: string | null) => parentId;

// --- HIERARCHY SELECTORS ---
export const selectTopLevelLists = createSelector(
  [selectAllGoalLists],
  (allLists) => {
    return Object.values(allLists)
      .filter(list => list.parentId === null)
      .sort((a, b) => a.order - b.order);
  }
);

export const makeSelectChildLists = () => createSelector(
    [selectAllGoalLists, selectParentId],
    (allLists, parentId) => {
        return Object.values(allLists)
            .filter(list => list.parentId === parentId)
            .sort((a, b) => a.order - b.order);
    }
);

// --- ORIGINAL SELECTORS ---
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

// ✨ ПОВЕРНУТО: Цей селектор потрібен для GoalListPage
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

// ✨ ПОВЕРНУТО: Селектори для тегів та контекстів
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

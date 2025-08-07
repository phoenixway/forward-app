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

export const selectTopLevelLists = createSelector(
  [selectAllGoalLists],
  (allLists) => {
    return Object.values(allLists)
      .filter(list => !list.parentId)
      // ВИПРАВЛЕНО: Розкоментовано сортування
      .sort((a, b) => a.order - b.order);
  }
);

export const makeSelectChildLists = () =>
  createSelector(
    [selectAllGoalLists, (_state: RootState, parentId: string) => parentId],
    (allLists, parentId) => {
      return Object.values(allLists)
        .filter((list) => list.parentId === parentId)
        // ВИПРАВЛЕНО: Розкоментовано сортування
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
      return list;
    },
);

export const makeSelectGoalInstancesForList = () => createSelector(
    [selectGoals, selectGoalInstances, selectListId],
    (goals, allGoalInstances, listId) => {
      if (!listId) return [];
      
      const instancesArray = Object.values(allGoalInstances);
      const filteredInstances = instancesArray.filter(instance => instance.listId === listId);
      const sortedInstances = filteredInstances.sort((a, b) => a.order - b.order);

      return sortedInstances
        .map((instance) => {
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
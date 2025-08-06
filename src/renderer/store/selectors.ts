// src/renderer/store/selectors.ts
import { createSelector } from "reselect";
import { RootState } from "./store";
// ✨ ВИКОРИСТОВУЄМО ОНОВЛЕНІ ТИПИ
import type { Goal, GoalInstance, GoalList } from "../types";

// --- BASE SELECTORS ---
const selectListsSlice = (state: RootState) => state.lists;
const selectAllGoalLists = createSelector([selectListsSlice], (lists) => lists.goalLists);
const selectGoals = createSelector([selectListsSlice], (lists) => lists.goals);
const selectGoalInstances = createSelector([selectListsSlice], (lists) => lists.goalInstances);
const selectListId = (_state: RootState, listId: string) => listId;
const selectParentId = (_state: RootState, parentId: string | null) => parentId;

// --- HIERARCHY SELECTORS ---
// Ці селектори залишаються без змін, оскільки ієрархія списків не змінилася.
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

// ✨ ЗМІНА: Спрощено селектор. Більше не потрібно видаляти `itemInstanceIds`, бо його не існує.
export const makeSelectListInfo = () => createSelector(
    [selectAllGoalLists, selectListId],
    (goalLists, listId) => {
      const list = goalLists[listId];
      if (!list) return null;
      // Просто повертаємо інформацію про список.
      return list;
    },
);

// ✨ КАРДИНАЛЬНА ЗМІНА: Повністю нова логіка для отримання екземплярів цілей для списку.
export const makeSelectGoalInstancesForList = () => createSelector(
    [selectGoals, selectGoalInstances, selectListId],
    (goals, allGoalInstances, listId) => {
      if (!listId) return [];
      
      // 1. Отримуємо ВСІ екземпляри і перетворюємо на масив.
      const instancesArray = Object.values(allGoalInstances);

      // 2. Фільтруємо екземпляри, щоб отримати тільки ті, що належать потрібному списку.
      const filteredInstances = instancesArray.filter(instance => instance.listId === listId);

      // 3. Сортуємо їх за полем `order`, яке тепер є в самому екземплярі.
      const sortedInstances = filteredInstances.sort((a, b) => a.order - b.order);

      // 4. "Збагачуємо" кожен екземпляр повними даними про його ціль.
      return sortedInstances
        .map((instance) => {
          const goal = instance ? goals[instance.goalId] : null;
          // Повертаємо пару { instance, goal }, якщо обидва існують.
          return (instance && goal) ? { instance, goal } : null;
        })
        .filter(Boolean) as { instance: GoalInstance; goal: Goal }[];
    },
);

// Цей селектор працюватиме без змін, оскільки він залежить від результату
// попереднього селектора, який ми щойно виправили.
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

// Селектори для тегів та контекстів залишаються без змін.
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
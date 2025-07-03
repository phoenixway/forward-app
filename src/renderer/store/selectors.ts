// src/renderer/store/selectors.ts
import { createSelector } from "reselect";
import { RootState } from "./store";
import type { Goal, GoalInstance, GoalList } from "../types";

const selectListsSlice = (state: RootState) => state.lists;

// Базові селектори для частин стану `lists`
const selectGoals = createSelector([selectListsSlice], (lists) => lists.goals);
const selectGoalLists = createSelector(
  [selectListsSlice],
  (lists) => lists.goalLists,
);
const selectGoalInstances = createSelector(
  [selectListsSlice],
  (lists) => lists.goalInstances,
);

// Селектор для отримання ID списку з аргументів
const selectListId = (_state: RootState, listId: string) => listId;

// --- Існуючі селектори ---
export const selectAllLists = createSelector([selectGoalLists], (goalLists) =>
  Object.values(goalLists),
);

export const makeSelectListInfo = () => {
  return createSelector(
    [selectGoalLists, selectListId],
    (goalLists, listId) => {
      const list = goalLists[listId];
      if (!list) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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


// +++ НОВИЙ МЕМОІЗОВАНИЙ СЕЛЕКТОР ДЛЯ ЗБАГАЧЕННЯ ДАНИХ +++
export const makeSelectEnrichedGoalInstances = () =>
  createSelector(
    // Вхідні селектори: отримуємо базові дані для списку та всі списки
    [makeSelectGoalInstancesForList(), selectGoalLists],
    // Функція-трансформатор, яка виконається, тільки якщо вхідні дані змінилися
    (goalInstancesForList, allGoalLists) => {
      return goalInstancesForList.map(({ instance, goal }) => ({
        instance,
        goal,
        // Додаємо поле з повними даними асоційованих списків
        associatedLists: (goal.associatedListIds || [])
          .map(id => allGoalLists[id])
          .filter(Boolean) as GoalList[],
      }));
    }
  );


// --- Селектори для автодоповнення тегів та контекстів ---
// ... (решта файлу залишається без змін) ...
export const selectAllGoalsArray = createSelector(
  [selectGoals],
  (goalsRecord): Goal[] => {
    return Object.values(goalsRecord).filter((goal) => !!goal) as Goal[];
  },
);

export const selectAllUniqueTags = createSelector(
  [selectAllGoalsArray],
  (allGoals) => {
    const allTags = new Set<string>();
    const tagRegex = /(?:\B|^)#[a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+\b/g;
    allGoals.forEach((goal) => {
      if (goal && typeof goal.text === "string") {
        extractMatchesFromText(goal.text, tagRegex).forEach((tag) =>
          allTags.add(tag),
        );
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
        extractMatchesFromText(goal.text, contextRegex).forEach((context) =>
          allContexts.add(context),
        );
      }
    });
    return Array.from(allContexts).sort();
  },
);

// Допоміжна функція (має бути визначена перед використанням)
const extractMatchesFromText = (text: string, regex: RegExp): string[] => {
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[0]);
  }
  return Array.from(matches);
};
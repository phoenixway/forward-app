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
      const { itemInstanceIds, ...listInfo } = list; // Виключаємо itemInstanceIds з інформації про список
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

// --- НОВІ СЕЛЕКТОРИ для автодоповнення тегів та контекстів ---

// Допоміжна функція для вилучення збігів за регулярним виразом
const extractMatchesFromText = (text: string, regex: RegExp): string[] => {
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[0]); // Додаємо повний збіг (наприклад, "#tag" або "@context")
  }
  return Array.from(matches);
};

// Селектор для отримання всіх цілей у вигляді масиву
export const selectAllGoalsArray = createSelector(
  [selectGoals], // Використовуємо selectGoals, який вказує на state.lists.goals
  (goalsRecord): Goal[] => {
    // Перетворюємо Record<string, Goal> на Goal[]
    return Object.values(goalsRecord).filter((goal) => !!goal) as Goal[];
  },
);

// Селектор для отримання всіх унікальних тегів (#tag)
export const selectAllUniqueTags = createSelector(
  [selectAllGoalsArray],
  (allGoals) => {
    const allTags = new Set<string>();
    // Регулярний вираз для тегів, що відповідає GoalTextRenderer: (?:\B|^)#([a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+)\b
    // Вилучаємо повний тег, включаючи #
    const tagRegex = /(?:\B|^)#[a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+\b/g;
    allGoals.forEach((goal) => {
      if (goal && typeof goal.text === "string") {
        // Додаткова перевірка
        extractMatchesFromText(goal.text, tagRegex).forEach((tag) =>
          allTags.add(tag),
        );
      }
    });
    return Array.from(allTags).sort();
  },
);

// Селектор для отримання всіх унікальних контекстів (@context)
export const selectAllUniqueContexts = createSelector(
  [selectAllGoalsArray],
  (allGoals) => {
    const allContexts = new Set<string>();
    // Регулярний вираз для контекстів, що відповідає GoalTextRenderer: @([a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+)
    // Вилучаємо повний контекст, включаючи @
    const contextRegex = /@[a-zA-Z0-9_а-яА-ЯіІїЇєЄ'-]+/g;
    allGoals.forEach((goal) => {
      if (goal && typeof goal.text === "string") {
        // Додаткова перевірка
        extractMatchesFromText(goal.text, contextRegex).forEach((context) =>
          allContexts.add(context),
        );
      }
    });
    return Array.from(allContexts).sort();
  },
);

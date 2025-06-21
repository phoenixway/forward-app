// src/renderer/data/goalListsStore.ts
import { v4 as uuidv4 } from "uuid";

// --- ТИПИ ---
export interface Goal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  associatedListIds?: string[];
}

export interface GoalList {
  id: string;
  name: string;
  description?: string;
  itemGoalIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface AppDataStore {
  goals: Record<string, Goal>;
  goalLists: Record<string, GoalList>;
}

// +++ НОВИЙ ТИП ДЛЯ РЕЗУЛЬТАТУ ПЕРЕМІЩЕННЯ +++
export type MoveGoalResult =
  | {
      success: true;
      updatedSourceList?: GoalList;
      updatedDestinationList: GoalList;
      movedGoal: Goal;
    }
  | {
      success: false;
      error: string;
    };

// Ключі для localStorage
const STORE_KEY_GOALS_V2 = "forwardApp_goals_v2";
const STORE_KEY_GOAL_LISTS_V2 = "forwardApp_goal_lists_v2";
const OLD_STORAGE_KEY = "forwardAppGoalLists";

let store: AppDataStore = {
  goals: {},
  goalLists: {},
};

const saveGoalsData = () => {
  try {
    localStorage.setItem(STORE_KEY_GOALS_V2, JSON.stringify(store.goals));
  } catch (error) {
    console.error("Не вдалося зберегти дані цілей в localStorage:", error);
  }
};

const saveGoalListsData = () => {
  try {
    localStorage.setItem(
      STORE_KEY_GOAL_LISTS_V2,
      JSON.stringify(store.goalLists),
    );
  } catch (error) {
    console.error(
      "Не вдалося зберегти дані списків цілей в localStorage:",
      error,
    );
  }
};

const generateUniqueId = (): string => uuidv4();

const createNewGoalObjectInternal = (
  text: string,
  completed = false,
  associatedListIds?: string[],
): Goal => ({
  id: generateUniqueId(),
  text: text.trim(),
  completed,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  associatedListIds: associatedListIds ? [...associatedListIds] : [],
});

const initializeDefaultData = () => {
  console.log("Ініціалізація дефолтних даних для нової структури...");

  const goal1Id = generateUniqueId();
  const goal2Id = generateUniqueId();
  store.goals[goal1Id] = createNewGoalObjectInternal(
    "Прочитати книгу про TypeScript",
  );
  store.goals[goal2Id] = createNewGoalObjectInternal(
    "Сходити в спортзал 3 рази на тиждень",
  );

  const list1Id = generateUniqueId();
  store.goalLists[list1Id] = {
    id: list1Id,
    name: "Особисті цілі",
    itemGoalIds: [goal1Id, goal2Id],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveGoalsData();
  saveGoalListsData();
  console.log("Дефолтні дані для нової структури створено та збережено.");
};

const attemptMigrationFromOldStructure = () => {
  const oldDataRaw = localStorage.getItem(OLD_STORAGE_KEY);
  if (!oldDataRaw) return false;

  if (
    localStorage.getItem(STORE_KEY_GOALS_V2) ||
    localStorage.getItem(STORE_KEY_GOAL_LISTS_V2)
  ) {
    console.log(
      "Нові дані вже існують, міграція зі старої структури не потрібна.",
    );
    return true;
  }
  // ... (Ваша логіка міграції, якщо потрібна, інакше її можна спростити або видалити) ...
  // Якщо міграція не реалізована або не потрібна, просто повертаємо false
  console.log(
    "Логіка міграції не реалізована або не потрібна для старих даних.",
  );
  return false;
};

const loadData = () => {
  try {
    const migrated = attemptMigrationFromOldStructure();

    const goalsDataRaw = localStorage.getItem(STORE_KEY_GOALS_V2);
    const goalListsDataRaw = localStorage.getItem(STORE_KEY_GOAL_LISTS_V2);

    if (goalsDataRaw) {
      store.goals = JSON.parse(goalsDataRaw);
    }
    if (goalListsDataRaw) {
      store.goalLists = JSON.parse(goalListsDataRaw);
    }

    if (
      Object.keys(store.goals).length === 0 &&
      Object.keys(store.goalLists).length === 0 &&
      !migrated
    ) {
      initializeDefaultData();
    }
    console.log("Дані завантажено/ініціалізовано для нової структури.");
  } catch (error) {
    console.error(
      "Не вдалося завантажити дані з localStorage або вони пошкоджені (нова структура):",
      error,
    );
    store.goals = {};
    store.goalLists = {};
    initializeDefaultData();
  }
};

export const getAllGoals = (): Goal[] => Object.values(store.goals);
export const getGoalById = (goalId: string): Goal | undefined =>
  store.goals[goalId];

export const createGlobalGoal = (
  text: string,
  description?: string,
  associatedListIds?: string[],
): Goal => {
  if (!text.trim()) throw new Error("Текст цілі не може бути порожнім.");
  const newGoal = createNewGoalObjectInternal(text, false, associatedListIds);
  newGoal.description = description?.trim();
  store.goals[newGoal.id] = newGoal;
  saveGoalsData();
  return { ...newGoal };
};

export const updateGlobalGoal = (
  goalId: string,
  updates: Partial<Omit<Goal, "id" | "createdAt">>,
): Goal => {
  const goal = store.goals[goalId];
  if (!goal) throw new Error(`Ціль з ID "${goalId}" не знайдено.`);

  const currentText = updates.text !== undefined ? updates.text : goal.text;
  if (!currentText.trim()) throw new Error("Текст цілі не може бути порожнім.");

  const updatedGoal = {
    ...goal,
    ...updates,
    text: currentText.trim(),
    updatedAt: new Date().toISOString(),
  };
  if (updates.description !== undefined)
    updatedGoal.description = updates.description.trim();

  store.goals[goalId] = updatedGoal;
  saveGoalsData();
  return { ...updatedGoal };
};

export const deleteGlobalGoal = (goalId: string): boolean => {
  if (!store.goals[goalId]) return false;
  delete store.goals[goalId];
  saveGoalsData();
  Object.values(store.goalLists).forEach((list) => {
    const index = list.itemGoalIds.indexOf(goalId);
    if (index > -1) {
      list.itemGoalIds.splice(index, 1);
      list.updatedAt = new Date().toISOString();
    }
  });
  saveGoalListsData();
  return true;
};

export const toggleGlobalGoalCompletion = (
  goalId: string,
): Goal | undefined => {
  const goal = store.goals[goalId];
  if (!goal) return undefined;
  return updateGlobalGoal(goalId, { completed: !goal.completed });
};

export const updateGlobalGoalText = (
  goalId: string,
  newText: string,
): Goal | undefined => {
  return updateGlobalGoal(goalId, { text: newText });
};

export const getAllGoalLists = (): GoalList[] => {
  return Object.values(store.goalLists).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const getGoalListById = (listId: string): GoalList | undefined =>
  store.goalLists[listId];

export const getGoalsForList = (listId: string): Goal[] => {
  const list = store.goalLists[listId];
  if (!list) return [];
  return list.itemGoalIds
    .map((id) => store.goals[id])
    .filter(Boolean) as Goal[];
};

export const createGoalList = (
  name: string,
  description?: string,
  itemGoalIds: string[] = [],
): GoalList => {
  if (!name.trim()) throw new Error("Назва списку не може бути порожньою.");
  if (
    Object.values(store.goalLists).some(
      (l) => l.name.toLowerCase() === name.trim().toLowerCase(),
    )
  ) {
    throw new Error(`Список з назвою "${name.trim()}" вже існує.`);
  }
  const newList: GoalList = {
    id: generateUniqueId(),
    name: name.trim(),
    description: description?.trim(),
    itemGoalIds: [...new Set(itemGoalIds)],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.goalLists[newList.id] = newList;
  saveGoalListsData();
  return { ...newList };
};

export const updateGoalListName = (
  listId: string,
  newName: string,
  newDescription?: string,
): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) return undefined;
  if (!newName.trim())
    throw new Error("Нова назва списку не може бути порожньою.");
  if (
    Object.values(store.goalLists).some(
      (l) =>
        l.id !== listId &&
        l.name.toLowerCase() === newName.trim().toLowerCase(),
    )
  ) {
    throw new Error(`Список з назвою "${newName.trim()}" вже існує.`);
  }
  list.name = newName.trim();
  if (newDescription !== undefined) list.description = newDescription.trim();
  list.updatedAt = new Date().toISOString();
  saveGoalListsData();
  return { ...list };
};

export const deleteGoalList = (listId: string): boolean => {
  if (!store.goalLists[listId]) return false;
  delete store.goalLists[listId];
  saveGoalListsData();
  Object.values(store.goals).forEach((goal) => {
    if (goal.associatedListIds?.includes(listId)) {
      goal.associatedListIds = goal.associatedListIds.filter(
        (id) => id !== listId,
      );
      goal.updatedAt = new Date().toISOString();
    }
  });
  saveGoalsData();
  return true;
};

export const addGoalToExistingList = (
  listId: string,
  goalId: string,
): GoalList | undefined => {
  const list = store.goalLists[listId];
  const goal = store.goals[goalId];
  if (!list || !goal) {
    console.warn(
      `Список ${listId} або ціль ${goalId} не знайдено для додавання.`,
    );
    return undefined;
  }
  if (!list.itemGoalIds.includes(goalId)) {
    list.itemGoalIds.push(goalId);
    list.updatedAt = new Date().toISOString();
    saveGoalListsData();
  }
  return { ...list };
};

export const createGoalAndAddToList = (
  listId: string,
  goalText: string,
  goalDescription?: string,
): { list: GoalList; newGoal: Goal } | undefined => {
  const list = store.goalLists[listId];
  if (!list) {
    console.warn(
      `Список ${listId} не знайдено для створення та додавання цілі.`,
    );
    return undefined;
  }
  const newGoal = createGlobalGoal(goalText, goalDescription);
  list.itemGoalIds.unshift(newGoal.id);
  list.updatedAt = new Date().toISOString();
  saveGoalListsData();
  return { list: { ...list }, newGoal: { ...newGoal } };
};

export const removeGoalFromList = (
  listId: string,
  goalId: string,
): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) return undefined;
  const initialLength = list.itemGoalIds.length;
  list.itemGoalIds = list.itemGoalIds.filter((id) => id !== goalId);
  if (list.itemGoalIds.length < initialLength) {
    list.updatedAt = new Date().toISOString();
    saveGoalListsData();
  }
  return { ...list };
};

export const updateGoalOrderInList = (
  listId: string,
  orderedGoalIds: string[],
): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) return undefined;

  const validGoalIds = new Set(Object.keys(store.goals));
  const uniqueOrderedIds = [...new Set(orderedGoalIds)];

  const newOrderedItemGoalIds = uniqueOrderedIds.filter((id) =>
    validGoalIds.has(id),
  );

  const orderChanged =
    list.itemGoalIds.length !== newOrderedItemGoalIds.length ||
    list.itemGoalIds.some((id, index) => id !== newOrderedItemGoalIds[index]);

  if (orderChanged) {
    list.itemGoalIds = newOrderedItemGoalIds;
    list.updatedAt = new Date().toISOString();
    saveGoalListsData();
  }
  return { ...list };
};

export const addMultipleGoalsToList = (
  listId: string,
  goalsData: Array<{ text: string; completed?: boolean }>,
): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) throw new Error(`Список з ID "${listId}" не знайдено.`);

  const newGoalIds: string[] = [];
  goalsData.forEach((data) => {
    if (data.text.trim()) {
      const newGoal = createGlobalGoal(data.text.trim());
      if (data.completed !== undefined) {
        updateGlobalGoal(newGoal.id, { completed: data.completed });
      }
      newGoalIds.push(newGoal.id);
    }
  });

  if (newGoalIds.length > 0) {
    list.itemGoalIds.push(...newGoalIds);
    list.updatedAt = new Date().toISOString();
    saveGoalListsData();
  }
  return { ...list };
};

export const associateGoalWithDetailList = (
  mainGoalId: string,
  detailListIdToAssociate: string,
): Goal | undefined => {
  const mainGoal = store.goals[mainGoalId];
  const detailList = store.goalLists[detailListIdToAssociate];
  if (!mainGoal || !detailList) {
    console.warn(
      `Головна ціль ${mainGoalId} або список деталей ${detailListIdToAssociate} не знайдено.`,
    );
    return undefined;
  }
  const currentAssociatedIds = mainGoal.associatedListIds || [];
  if (!currentAssociatedIds.includes(detailListIdToAssociate)) {
    return updateGlobalGoal(mainGoalId, {
      associatedListIds: [...currentAssociatedIds, detailListIdToAssociate],
    });
  }
  return { ...mainGoal };
};

export const disassociateGoalFromDetailList = (
  mainGoalId: string,
  detailListIdToDisassociate: string,
): Goal | undefined => {
  const mainGoal = store.goals[mainGoalId];
  if (!mainGoal) return undefined;
  const currentAssociatedIds = mainGoal.associatedListIds || [];
  if (currentAssociatedIds.includes(detailListIdToDisassociate)) {
    return updateGlobalGoal(mainGoalId, {
      associatedListIds: currentAssociatedIds.filter(
        (id) => id !== detailListIdToDisassociate,
      ),
    });
  }
  return { ...mainGoal };
};

export function dangerouslyReplaceAllData(
  newGoalListsData: GoalList[],
  newGoalsData: Goal[],
): void {
  console.log("Starting data replacement for import...");
  const newGoalsMap: Record<string, Goal> = {};
  newGoalsData.forEach((goal) => {
    newGoalsMap[goal.id] = goal;
  });

  const newGoalListsMap: Record<string, GoalList> = {};
  newGoalListsData.forEach((list) => {
    newGoalListsMap[list.id] = list;
  });

  store.goals = newGoalsMap;
  store.goalLists = newGoalListsMap;

  saveGoalsData();
  saveGoalListsData();
  console.log("All data has been replaced from import. Store re-initialized.");
}

// +++ ОНОВЛЕНА ФУНКЦІЯ moveGoalToList +++
export function moveGoalToList(
  goalId: string,
  sourceListId: string,
  destinationListId: string,
  destinationIndex: number = -1,
): MoveGoalResult {
  const sourceList = getGoalListById(sourceListId);
  const destinationList = getGoalListById(destinationListId);
  const goalToMove = getGoalById(goalId);

  if (!destinationList || !goalToMove) {
    const errorMsg = `Не вдалося перемістити ціль: ${
      !destinationList
        ? `список призначення (${destinationListId}) не знайдено`
        : ""
    } ${!goalToMove ? `ціль (${goalId}) не знайдено` : ""}`.trim();
    console.error(`[goalListsStore] ${errorMsg}`, {
      destListExists: !!destinationList,
      goalExists: !!goalToMove,
    });
    return { success: false, error: errorMsg };
  }

  if (sourceListId === destinationListId) {
    // Ця функція призначена для переміщення МІЖ списками.
    // Для сортування в межах одного списку краще використовувати updateGoalOrderInList.
    // Повертаємо помилку, щоб уникнути неочікуваної поведінки.
    const errorMsg =
      "Спроба перемістити ціль в той самий список. Для зміни порядку використовуйте updateGoalOrderInList.";
    console.warn(`[goalListsStore] ${errorMsg}`);
    return { success: false, error: errorMsg };
  }

  let finalUpdatedSourceList: GoalList | undefined = undefined;

  // 1. Видалити goalId зі списку-джерела (якщо він існує)
  if (sourceList && sourceList.itemGoalIds.includes(goalId)) {
    const updatedSourceGoalIds = sourceList.itemGoalIds.filter(
      (id) => id !== goalId,
    );
    finalUpdatedSourceList = {
      ...sourceList,
      itemGoalIds: updatedSourceGoalIds,
      updatedAt: new Date().toISOString(),
    };
    store.goalLists[sourceList.id] = finalUpdatedSourceList;
  }

  // 2. Додати goalId до списку-призначення
  const updatedDestinationGoalIds = [...destinationList.itemGoalIds];

  // Видаляємо ціль, якщо вона вже є, щоб уникнути дублікатів і перемістити її
  const existingIndex = updatedDestinationGoalIds.indexOf(goalId);
  if (existingIndex > -1) {
    updatedDestinationGoalIds.splice(existingIndex, 1);
  }

  // Вставляємо ціль на нову позицію
  if (
    destinationIndex >= 0 &&
    destinationIndex <= updatedDestinationGoalIds.length
  ) {
    updatedDestinationGoalIds.splice(destinationIndex, 0, goalId);
  } else {
    updatedDestinationGoalIds.push(goalId); // Додати в кінець, якщо індекс невалідний
  }

  const finalUpdatedDestinationList = {
    ...destinationList,
    itemGoalIds: updatedDestinationGoalIds,
    updatedAt: new Date().toISOString(),
  };
  store.goalLists[destinationList.id] = finalUpdatedDestinationList;

  // Зберегти зміни
  saveGoalListsData();

  console.log(
    `[goalListsStore] Ціль ${goalId} успішно переміщено з ${sourceListId} до ${destinationListId}`,
  );

  return {
    success: true,
    updatedSourceList: finalUpdatedSourceList,
    updatedDestinationList: finalUpdatedDestinationList,
    movedGoal: goalToMove,
  };
}

loadData();

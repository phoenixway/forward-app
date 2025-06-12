// src/renderer/data/goalListsStore.ts
import { v4 as uuidv4 } from 'uuid';

// --- ТИПИ ---
export interface Goal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: string; // ISO date string
  updatedAt?: string; // ISO date string
  // ID списків цілей (GoalList.id), з якими ця "велика" ціль асоційована.
  associatedListIds?: string[];
}

export interface GoalList {
  id: string;
  name: string;
  description?: string;
  itemGoalIds: string[]; // Масив ID цілей, що входять до ЦЬОГО СПИСКУ
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Тип для всього стану, що зберігається
interface AppDataStore {
  goals: Record<string, Goal>; // Словник цілей, ключ - Goal.id
  goalLists: Record<string, GoalList>; // Словник списків цілей, ключ - GoalList.id
}

// Ключі для localStorage
const STORE_KEY_GOALS_V2 = 'forwardApp_goals_v2';
const STORE_KEY_GOAL_LISTS_V2 = 'forwardApp_goal_lists_v2';
const OLD_STORAGE_KEY = 'forwardAppGoalLists'; // Старий ключ для можливої міграції

// Наша "база даних" у пам'яті
let store: AppDataStore = {
  goals: {},
  goalLists: {},
};

// --- Функції для збереження/завантаження ---

const saveGoalsData = () => {
  try {
    localStorage.setItem(STORE_KEY_GOALS_V2, JSON.stringify(store.goals));
  } catch (error) {
    console.error("Не вдалося зберегти дані цілей в localStorage:", error);
  }
};

const saveGoalListsData = () => {
  try {
    localStorage.setItem(STORE_KEY_GOAL_LISTS_V2, JSON.stringify(store.goalLists));
  } catch (error) {
    console.error("Не вдалося зберегти дані списків цілей в localStorage:", error);
  }
};

const generateUniqueId = (): string => uuidv4();

// Функція для створення об'єкта цілі (уніфікована)
const createNewGoalObjectInternal = (text: string, completed = false, associatedListIds?: string[]): Goal => ({
  id: generateUniqueId(),
  text: text.trim(),
  completed,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  associatedListIds: associatedListIds ? [...associatedListIds] : [],
});

// Функція для ініціалізації початкових даних
const initializeDefaultData = () => {
  console.log("Ініціалізація дефолтних даних для нової структури...");

  const goal1Id = generateUniqueId();
  const goal2Id = generateUniqueId();
  const goal3Id = generateUniqueId();
  const goal4Id = generateUniqueId();
  const goal5Id = generateUniqueId();

  store.goals[goal1Id] = createNewGoalObjectInternal("Прочитати книгу про TypeScript");
  store.goals[goal2Id] = createNewGoalObjectInternal("Сходити в спортзал 3 рази на тиждень");
  store.goals[goal3Id] = createNewGoalObjectInternal("Помити посуд після вечері", true); // завершена
  store.goals[goal4Id] = createNewGoalObjectInternal("Завершити звіт по проекту ForwardApp");
  store.goals[goal5Id] = createNewGoalObjectInternal("Підготувати презентацію для зустрічі");

  const list1Id = generateUniqueId();
  const list2Id = generateUniqueId();
  const list3Id = generateUniqueId();

  store.goalLists[list1Id] = {
    id: list1Id,
    name: "Особисті цілі",
    itemGoalIds: [goal1Id, goal2Id, goal3Id],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.goalLists[list2Id] = {
    id: list2Id,
    name: "Робочі проекти",
    itemGoalIds: [goal4Id, goal5Id],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.goalLists[list3Id] = {
    id: list3Id,
    name: "Навчання",
    itemGoalIds: [goal1Id], // "Прочитати книгу" є і в особистих, і в навчанні
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Приклад цілі з асоційованим списком
  const mainProjectGoalId = generateUniqueId();
  store.goals[mainProjectGoalId] = createNewGoalObjectInternal(
    "Запустити проект ForwardApp v1.0", 
    false, 
    [list2Id] // "Робочі проекти" є деталізацією цієї великої цілі
  );
  // Додамо цю велику ціль до якогось загального списку, наприклад "Великі Проекти"
  const bigProjectsListId = generateUniqueId();
  store.goalLists[bigProjectsListId] = {
    id: bigProjectsListId,
    name: "Великі Проекти",
    itemGoalIds: [mainProjectGoalId],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveGoalsData();
  saveGoalListsData();
  console.log("Дефолтні дані для нової структури створено та збережено.");
};

// Проста міграція: якщо є старі дані і немає нових, конвертуємо.
const attemptMigrationFromOldStructure = () => {
  const oldDataRaw = localStorage.getItem(OLD_STORAGE_KEY);
  if (!oldDataRaw) return false; // Немає старих даних

  // Якщо нові дані вже є, міграція не потрібна
  if (localStorage.getItem(STORE_KEY_GOALS_V2) || localStorage.getItem(STORE_KEY_GOAL_LISTS_V2)) {
    console.log("Нові дані вже існують, міграція зі старої структури не потрібна.");
    return true; // Вважаємо, що "міграція" не потрібна, бо є нові дані
  }

  try {
    const oldGoalLists = JSON.parse(oldDataRaw) as Array<{ id: string; name: string; goals: Goal[]; createdAt: string; updatedAt: string }>;
    if (!Array.isArray(oldGoalLists)) {
        console.warn("Старі дані мають невірний формат, міграція неможлива.");
        return false;
    }

    console.log("Початок міграції даних зі старої структури...");
    const migratedGoals: Record<string, Goal> = {};
    const migratedGoalLists: Record<string, GoalList> = {};

    oldGoalLists.forEach(oldList => {
      const newItemGoalIds: string[] = [];
      oldList.goals.forEach(oldGoal => {
        // Перевірка на унікальність ID цілі, якщо цілі могли дублюватися
        // Для простоти зараз припускаємо, що ID цілей були унікальні глобально або їх треба зробити такими
        const newGoalId = oldGoal.id || generateUniqueId(); // Якщо в старих цілях не було ID, генеруємо
        
        // Створюємо копію цілі, щоб не модифікувати оригінал, і додаємо associatedListIds
        migratedGoals[newGoalId] = {
            ...oldGoal,
            id: newGoalId, // Перезаписуємо ID, якщо він був згенерований
            associatedListIds: [], // Поки що порожній, потім можна буде додавати логіку
            updatedAt: oldGoal.updatedAt || oldGoal.createdAt, // Додаємо updatedAt, якщо не було
        };
        newItemGoalIds.push(newGoalId);
      });

      migratedGoalLists[oldList.id] = {
        id: oldList.id,
        name: oldList.name,
        itemGoalIds: newItemGoalIds,
        createdAt: oldList.createdAt,
        updatedAt: oldList.updatedAt,
      };
    });

    store.goals = migratedGoals;
    store.goalLists = migratedGoalLists;
    saveGoalsData();
    saveGoalListsData();
    // localStorage.removeItem(OLD_STORAGE_KEY); // Можна видалити старі дані після успішної міграції
    console.log("Дані успішно мігровано зі старої структури.");
    return true;
  } catch (error) {
    console.error("Помилка під час міграції даних:", error);
    return false;
  }
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

    // Якщо після всього дані порожні (наприклад, не було ні старих, ні нових), ініціалізуємо
    if (Object.keys(store.goals).length === 0 && Object.keys(store.goalLists).length === 0 && !migrated) {
      initializeDefaultData();
    }
    console.log('Дані завантажено/ініціалізовано для нової структури.');

  } catch (error) {
    console.error("Не вдалося завантажити дані з localStorage або вони пошкоджені (нова структура):", error);
    // При критичній помилці завантаження, можна відкотитися до дефолтних
    store.goals = {};
    store.goalLists = {};
    initializeDefaultData();
  }
};

// ----- Експортовані CRUD Операції -----

// === Цілі (Goals) ===
export const getAllGoals = (): Goal[] => Object.values(store.goals);
export const getGoalById = (goalId: string): Goal | undefined => store.goals[goalId];

export const createGlobalGoal = (text: string, description?: string, associatedListIds?: string[]): Goal => {
  if (!text.trim()) throw new Error("Текст цілі не може бути порожнім.");
  const newGoal = createNewGoalObjectInternal(text, false, associatedListIds);
  newGoal.description = description?.trim();
  store.goals[newGoal.id] = newGoal;
  saveGoalsData();
  return { ...newGoal };
};

export const updateGlobalGoal = (goalId: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): Goal => {
  const goal = store.goals[goalId];
  if (!goal) throw new Error(`Ціль з ID "${goalId}" не знайдено.`);
  
  const currentText = updates.text !== undefined ? updates.text : goal.text;
  if (!currentText.trim()) throw new Error("Текст цілі не може бути порожнім.");

  const updatedGoal = { ...goal, ...updates, text: currentText.trim(), updatedAt: new Date().toISOString() };
  if(updates.description !== undefined) updatedGoal.description = updates.description.trim();
  
  store.goals[goalId] = updatedGoal;
  saveGoalsData();
  return { ...updatedGoal };
};

export const deleteGlobalGoal = (goalId: string): boolean => {
  if (!store.goals[goalId]) return false;
  delete store.goals[goalId];
  saveGoalsData();
  // Видалити ID цілі з усіх itemGoalIds у списках
  Object.values(store.goalLists).forEach(list => {
    const index = list.itemGoalIds.indexOf(goalId);
    if (index > -1) {
      list.itemGoalIds.splice(index, 1);
      list.updatedAt = new Date().toISOString();
    }
  });
  saveGoalListsData();
  return true;
};

export const toggleGlobalGoalCompletion = (goalId: string): Goal | undefined => {
  const goal = store.goals[goalId];
  if (!goal) return undefined;
  return updateGlobalGoal(goalId, { completed: !goal.completed });
};

export const updateGlobalGoalText = (goalId: string, newText: string): Goal | undefined => {
    return updateGlobalGoal(goalId, {text: newText});
};


// === Списки Цілей (GoalLists) ===
export const getAllGoalLists = (): GoalList[] => {
  return Object.values(store.goalLists).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getGoalListById = (listId: string): GoalList | undefined => store.goalLists[listId];

export const getGoalsForList = (listId: string): Goal[] => {
  const list = store.goalLists[listId];
  if (!list) return [];
  // Сортуємо цілі в списку за їх порядком в itemGoalIds
  return list.itemGoalIds.map(id => store.goals[id]).filter(Boolean) as Goal[];
};

export const createGoalList = (name: string, description?: string, itemGoalIds: string[] = []): GoalList => {
  if (!name.trim()) throw new Error('Назва списку не може бути порожньою.');
  if (Object.values(store.goalLists).some(l => l.name.toLowerCase() === name.trim().toLowerCase())) {
    throw new Error(`Список з назвою "${name.trim()}" вже існує.`);
  }
  const newList: GoalList = {
    id: generateUniqueId(),
    name: name.trim(),
    description: description?.trim(),
    itemGoalIds: [...new Set(itemGoalIds)], // Унікальні ID
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.goalLists[newList.id] = newList;
  saveGoalListsData();
  return { ...newList };
};

export const updateGoalListName = (listId: string, newName: string, newDescription?: string): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) return undefined;
  if (!newName.trim()) throw new Error('Нова назва списку не може бути порожньою.');
  if (Object.values(store.goalLists).some(l => l.id !== listId && l.name.toLowerCase() === newName.trim().toLowerCase())) {
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
  // Видалити цей listId з associatedListIds у всіх цілей
  Object.values(store.goals).forEach(goal => {
    if (goal.associatedListIds?.includes(listId)) {
      goal.associatedListIds = goal.associatedListIds.filter(id => id !== listId);
      goal.updatedAt = new Date().toISOString();
    }
  });
  saveGoalsData();
  return true;
};

// === Операції зі зв'язками Цілей та Списків ===
export const addGoalToExistingList = (listId: string, goalId: string): GoalList | undefined => {
  const list = store.goalLists[listId];
  const goal = store.goals[goalId];
  if (!list || !goal) {
    console.warn(`Список ${listId} або ціль ${goalId} не знайдено для додавання.`);
    return undefined;
  }
  if (!list.itemGoalIds.includes(goalId)) {
    list.itemGoalIds.push(goalId); // Додаємо в кінець за замовчуванням
    list.updatedAt = new Date().toISOString();
    saveGoalListsData();
  }
  return { ...list };
};

export const createGoalAndAddToList = (listId: string, goalText: string, goalDescription?: string): { list: GoalList, newGoal: Goal } | undefined => {
  const list = store.goalLists[listId];
  if (!list) {
    console.warn(`Список ${listId} не знайдено для створення та додавання цілі.`);
    return undefined;
  }
  const newGoal = createGlobalGoal(goalText, goalDescription);
  list.itemGoalIds.unshift(newGoal.id); // Нові цілі додаємо на початок списку
  list.updatedAt = new Date().toISOString();
  saveGoalListsData();
  return { list: { ...list }, newGoal: { ...newGoal } };
};

export const removeGoalFromList = (listId: string, goalId: string): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) return undefined;
  const initialLength = list.itemGoalIds.length;
  list.itemGoalIds = list.itemGoalIds.filter(id => id !== goalId);
  if (list.itemGoalIds.length < initialLength) {
    list.updatedAt = new Date().toISOString();
    saveGoalListsData();
  }
  // Ціль не видаляється з глобального store.goals
  return { ...list };
};

export const updateGoalOrderInList = (listId: string, orderedGoalIds: string[]): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) return undefined;
  
  // Перевірка, що всі передані ID існують у глобальному списку цілей
  // і що вони унікальні в переданому масиві
  const validGoalIds = new Set(Object.keys(store.goals));
  const uniqueOrderedIds = [...new Set(orderedGoalIds)];
  
  const newOrderedItemGoalIds = uniqueOrderedIds.filter(id => validGoalIds.has(id));

  if (newOrderedItemGoalIds.length !== list.itemGoalIds.length || 
      !newOrderedItemGoalIds.every((id, i) => id === list.itemGoalIds[i])) {
      list.itemGoalIds = newOrderedItemGoalIds;
      list.updatedAt = new Date().toISOString();
      saveGoalListsData();
  }
  return { ...list };
};

export const addMultipleGoalsToList = (listId: string, goalsData: Array<{ text: string; completed?: boolean }>): GoalList | undefined => {
  const list = store.goalLists[listId];
  if (!list) throw new Error(`Список з ID "${listId}" не знайдено.`);

  const newGoalIds: string[] = [];
  goalsData.forEach(data => {
    if (data.text.trim()) {
      const newGoal = createGlobalGoal(data.text.trim());
      if (data.completed !== undefined) {
        updateGlobalGoal(newGoal.id, { completed: data.completed });
      }
      newGoalIds.push(newGoal.id);
    }
  });

  if (newGoalIds.length > 0) {
    list.itemGoalIds.push(...newGoalIds); // Додаємо в кінець
    list.updatedAt = new Date().toISOString();
    saveGoalListsData();
  }
  return { ...list };
}


// === Операції з "associatedListIds" для цілей ===
export const associateGoalWithDetailList = (mainGoalId: string, detailListIdToAssociate: string): Goal | undefined => {
  const mainGoal = store.goals[mainGoalId];
  const detailList = store.goalLists[detailListIdToAssociate];
  if (!mainGoal || !detailList) {
    console.warn(`Головна ціль ${mainGoalId} або список деталей ${detailListIdToAssociate} не знайдено.`);
    return undefined;
  }
  const currentAssociatedIds = mainGoal.associatedListIds || [];
  if (!currentAssociatedIds.includes(detailListIdToAssociate)) {
    return updateGlobalGoal(mainGoalId, { associatedListIds: [...currentAssociatedIds, detailListIdToAssociate] });
  }
  return { ...mainGoal };
};

export const disassociateGoalFromDetailList = (mainGoalId: string, detailListIdToDisassociate: string): Goal | undefined => {
  const mainGoal = store.goals[mainGoalId];
  if (!mainGoal) return undefined;
  const currentAssociatedIds = mainGoal.associatedListIds || [];
  if (currentAssociatedIds.includes(detailListIdToDisassociate)) {
    return updateGlobalGoal(mainGoalId, {
      associatedListIds: currentAssociatedIds.filter(id => id !== detailListIdToDisassociate)
    });
  }
  return { ...mainGoal };
};

// Завантажуємо дані при першому імпорті модуля
loadData();
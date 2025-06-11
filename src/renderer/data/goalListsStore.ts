// src/renderer/data/goalListsStore.ts
import { v4 as uuidv4 } from 'uuid';

export interface Goal {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string; // ISO date string
}

export interface GoalList {
  id: string;
  name: string;
  goals: Goal[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

let goalLists: GoalList[] = []; // Наша "база даних" у пам'яті

const STORAGE_KEY = 'forwardAppGoalLists'; // Ключ для localStorage

// --- Функції для збереження/завантаження ---

const saveData = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goalLists));
    // console.log('Дані збережено в localStorage'); // Можна розкоментувати для дебагу
  } catch (error) {
    console.error("Не вдалося зберегти дані в localStorage:", error);
  }
};

// Функція для генерації ID вже існувала як uuidv4, але можна залишити обгортку для ясності
const generateUniqueId = (): string => {
  return uuidv4();
};

const loadData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsedData = JSON.parse(data) as GoalList[];
      if (Array.isArray(parsedData) && (parsedData.length === 0 || (parsedData[0] && typeof parsedData[0].id === 'string'))) {
        goalLists = parsedData;
        // console.log('Дані завантажено з localStorage');
      } else {
        console.warn('Дані в localStorage мають неправильний формат, ініціалізація.');
        initializeDefaultData(); // Викликаємо, якщо формат невірний
      }
    } else {
      // console.log('Дані в localStorage не знайдено, ініціалізація.');
      initializeDefaultData(); // Викликаємо, якщо дані відсутні
    }
  } catch (error) {
    console.error("Не вдалося завантажити дані з localStorage або вони пошкоджені:", error);
    goalLists = []; 
    initializeDefaultData(); // Викликаємо при помилці завантаження
  }
};

// Функція для створення об'єкта цілі (уніфікована)
const createNewGoalObject = (text: string): Goal => ({
  id: generateUniqueId(),
  text: text.trim(),
  completed: false,
  createdAt: new Date().toISOString(),
});

// Функція для ініціалізації початкових даних
const initializeDefaultData = () => {
  // Перевіряємо, чи не було вже завантажено щось (на випадок помилки парсингу)
  // Або якщо localStorage.getItem(STORAGE_KEY) повернув null
  if (localStorage.getItem(STORAGE_KEY) === null || goalLists.length === 0 ) { 
    console.log("Ініціалізація дефолтних даних...");
    // Створюємо списки без негайного збереження, щоб уникнути багаторазових записів
    const list1 = createGoalListInternal("Особисті цілі");
    const list2 = createGoalListInternal("Робочі проекти");
    createGoalListInternal("Навчання");

    addGoalToListInternal(list1.id, "Прочитати книгу");
    addGoalToListInternal(list1.id, "Сходити в спортзал");
    const completedGoal = addGoalToListInternal(list1.id, "Помити посуд");
    if (completedGoal) toggleGoalCompletionInternal(list1.id, completedGoal.id);
    
    addGoalToListInternal(list2.id, "Завершити звіт по проекту Х");
    addGoalToListInternal(list2.id, "Підготувати презентацію");
    
    saveData(); // Зберігаємо всі дефолтні дані один раз наприкінці ініціалізації
    console.log("Дефолтні дані створено та збережено.");
  }
};

// ----- Внутрішні CRUD Операції (без автоматичного saveData) для initializeDefaultData -----
// Ці функції не експортуються і використовуються лише для початкової ініціалізації
const createGoalListInternal = (name: string): GoalList => {
  const newList: GoalList = {
    id: generateUniqueId(),
    name: name.trim(),
    goals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  goalLists.unshift(newList);
  return newList; // Повертаємо, щоб можна було отримати ID
};

const addGoalToListInternal = (listId: string, goalText: string): Goal | undefined => {
  const list = goalLists.find(l => l.id === listId); // Шукаємо в поточному масиві goalLists
  if (!list) return undefined;
  const newGoal = createNewGoalObject(goalText);
  list.goals.unshift(newGoal);
  list.updatedAt = new Date().toISOString();
  return newGoal;
};

const toggleGoalCompletionInternal = (listId: string, goalId: string): Goal | undefined => {
    const list = goalLists.find(l => l.id === listId);
    if (!list) return undefined;
    const goal = list.goals.find(g => g.id === goalId);
    if (!goal) return undefined;
    goal.completed = !goal.completed;
    list.updatedAt = new Date().toISOString();
    return goal;
};


// ----- Експортовані CRUD Операції для Списків Цілей -----
// Тепер кожна експортована CRUD-операція буде викликати saveData()

export const getAllGoalLists = (): GoalList[] => {
  // Сортування можна залишити тут або перенести на бік компонента, якщо потрібно різне сортування
  return [...goalLists].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getGoalListById = (id: string): GoalList | undefined => {
  return goalLists.find(list => list.id === id);
};

export const createGoalList = (name: string): GoalList => {
  if (!name.trim()) {
    throw new Error('Назва списку не може бути порожньою.');
  }
  const newList: GoalList = {
    id: generateUniqueId(),
    name: name.trim(),
    goals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  goalLists.unshift(newList); // Додаємо на початок для відображення нових списків зверху
  saveData(); 
  return { ...newList }; // Повертаємо копію
};

export const updateGoalListName = (id: string, newName: string): GoalList | undefined => {
  if (!newName.trim()) {
    throw new Error('Нова назва списку не може бути порожньою.');
  }
  const listIndex = goalLists.findIndex(list => list.id === id);
  if (listIndex === -1) {
    // Можна кидати помилку або повертати undefined
    console.warn(`Список з ID "${id}" не знайдено для оновлення.`);
    return undefined;
  }
  goalLists[listIndex] = {
    ...goalLists[listIndex],
    name: newName.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveData();
  return { ...goalLists[listIndex] };
};

export const deleteGoalList = (id: string): boolean => {
  const initialLength = goalLists.length;
  goalLists = goalLists.filter(list => list.id !== id);
  if (goalLists.length < initialLength) {
    saveData();
    return true;
  }
  return false;
};


// ----- Експортовані CRUD Операції для Цілей (в межах списку) -----

export const addGoalToList = (listId: string, goalText: string): Goal | undefined => {
  if (!goalText.trim()) {
    throw new Error('Текст цілі не може бути порожнім.');
  }
  const list = getGoalListById(listId); // Використовуємо експортовану функцію
  if (!list) {
    console.warn(`Список з ID "${listId}" не знайдено для додавання цілі.`);
    return undefined;
  }
  const newGoal = createNewGoalObject(goalText); // Використовуємо уніфіковану функцію
  list.goals.unshift(newGoal); // Додаємо на початок
  list.updatedAt = new Date().toISOString();
  saveData();
  return { ...newGoal };
};

export const toggleGoalCompletion = (listId: string, goalId: string): Goal | undefined => {
  const list = getGoalListById(listId);
  if (!list) return undefined;

  const goal = list.goals.find(g => g.id === goalId);
  if (!goal) return undefined;

  goal.completed = !goal.completed;
  list.updatedAt = new Date().toISOString();
  saveData();
  return { ...goal };
};

export const updateGoalText = (listId: string, goalId: string, newText: string): Goal | undefined => {
  if (!newText.trim()) {
    // Можна або кидати помилку, або просто не оновлювати
    // throw new Error('Новий текст цілі не може бути порожнім.');
    console.warn("Спроба оновити ціль порожнім текстом. Оновлення скасовано.");
    const listForReturn = getGoalListById(listId);
    return listForReturn?.goals.find(g => g.id === goalId);
  }
  const list = getGoalListById(listId);
  if (!list) return undefined;

  const goal = list.goals.find(g => g.id === goalId);
  if (!goal) return undefined;

  goal.text = newText.trim();
  list.updatedAt = new Date().toISOString();
  saveData();
  return { ...goal };
};

export const deleteGoalFromList = (listId: string, goalId: string): boolean => {
  const list = getGoalListById(listId);
  if (!list) return false;

  const initialLength = list.goals.length;
  list.goals = list.goals.filter(g => g.id !== goalId);
  if (list.goals.length < initialLength) {
    list.updatedAt = new Date().toISOString();
    saveData();
    return true;
  }
  return false;
};

export const updateGoalOrder = (listId: string, orderedGoalIds: string[]): boolean => {
  const list = getGoalListById(listId);
  if (!list) return false;

  const newOrderedGoals: Goal[] = [];
  const goalMap = new Map(list.goals.map(goal => [goal.id, goal]));

  for (const goalId of orderedGoalIds) {
    const goal = goalMap.get(goalId);
    if (goal) {
      newOrderedGoals.push(goal);
    } else {
      console.warn(`Ціль з ID ${goalId} не знайдено при оновленні порядку у списку ${listId}`);
    }
  }
  
  // Дозволяємо оновлення, навіть якщо деякі цілі були видалені (наприклад, іншим клієнтом)
  // Головне, щоб усі передані orderedGoalIds були знайдені серед існуючих
  if (newOrderedGoals.length !== orderedGoalIds.length && list.goals.length > 0) {
      const existingIdsInOrder = new Set(list.goals.map(g => g.id));
      const validOrderedGoals = orderedGoalIds.filter(id => existingIdsInOrder.has(id));
      if (validOrderedGoals.length !== orderedGoalIds.length) {
        console.error("Помилка оновлення порядку: деякі ID цілей з orderedGoalIds не існують у списку. Порядок не оновлено.");
        return false;
      }
  }
  
  list.goals = newOrderedGoals;
  list.updatedAt = new Date().toISOString();
  saveData();
  // console.log(`Порядок цілей оновлено для списку ${listId}`);
  return true;
};


// Функція для імпорту кількох цілей
export function addMultipleGoalsToList(listId: string, goalTexts: string[]): void {
  const list = getGoalListById(listId); // Використовуємо експортовану функцію
  if (!list) {
    throw new Error(`Список з ID "${listId}" не знайдено для додавання кількох цілей.`);
  }

  const newGoals = goalTexts.map(text => createNewGoalObject(text));
  
  // Додаємо нові цілі в кінець існуючих
  list.goals.push(...newGoals);
  list.updatedAt = new Date().toISOString();
  
  saveData(); // Виправлено з saveGoalLists() на saveData()
}


// Завантажуємо дані при першому імпорті модуля (один раз)
loadData();
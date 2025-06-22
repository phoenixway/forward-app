// src/renderer/store/listsSlice.ts
import { createSlice, PayloadAction, nanoid } from "@reduxjs/toolkit";
import type { Goal, GoalInstance, GoalList } from "../types";

// Оновлюємо стан, додаючи goalInstances
export interface ListsState {
  goals: Record<string, Goal>;
  goalLists: Record<string, GoalList>;
  goalInstances: Record<string, GoalInstance>; // <--- Нове поле
}

const loadInitialState = (): ListsState => {
  try {
    const savedStateRaw = localStorage.getItem("persist:root"); // redux-persist за замовчуванням використовує цей ключ
    if (savedStateRaw) {
      const savedState = JSON.parse(savedStateRaw);
      // redux-persist зберігає кожен slice як рядок, тому їх треба парсити окремо
      const listsSliceState = savedState.lists
        ? JSON.parse(savedState.lists)
        : {};

      if (listsSliceState.goalInstances) {
        return listsSliceState;
      }
    }
  } catch (e) {
    console.error("Не вдалося завантажити стан з localStorage", e);
  }
  return { goals: {}, goalLists: {}, goalInstances: {} };
};

const initialState: ListsState = loadInitialState();

const listsSlice = createSlice({
  name: "lists",
  initialState,
  reducers: {
    // --- РЕДЮСЕРИ ДЛЯ СПИСКІВ ---
    listAdded: {
      reducer: (state, action: PayloadAction<GoalList>) => {
        state.goalLists[action.payload.id] = action.payload;
      },
      prepare: (payload: { name: string; description?: string }) => {
        const id = nanoid();
        const createdAt = new Date().toISOString();
        return {
          payload: {
            id,
            name: payload.name,
            description: payload.description || "",
            itemInstanceIds: [], // <-- ВИПРАВЛЕНО
            createdAt,
            updatedAt: createdAt,
          },
        };
      },
    },
    listUpdated(
      state,
      action: PayloadAction<{ id: string; name: string; description?: string }>,
    ) {
      const { id, name, description } = action.payload;
      const list = state.goalLists[id];
      if (list) {
        list.name = name;
        if (description !== undefined) {
          list.description = description;
        }
        list.updatedAt = new Date().toISOString();
      }
    },
    listRemoved(state, action: PayloadAction<string>) {
      const listId = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        // Видаляємо всі екземпляри, що належали цьому списку
        list.itemInstanceIds.forEach((instanceId) => {
          delete state.goalInstances[instanceId];
        });
        delete state.goalLists[listId];
      }
    },

    // --- РЕДЮСЕРИ ДЛЯ ЦІЛЕЙ ---
    // Створює і ціль, і її перший екземпляр
    goalAdded(state, action: PayloadAction<{ listId: string; text: string }>) {
      const { listId, text } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        const goalId = nanoid();
        const instanceId = nanoid();
        const now = new Date().toISOString();

        // Створюємо оригінал цілі
        state.goals[goalId] = {
          id: goalId,
          text,
          completed: false,
          createdAt: now,
          updatedAt: now,
        };

        // Створюємо екземпляр цілі
        state.goalInstances[instanceId] = { id: instanceId, goalId };

        // Додаємо ID екземпляра до списку
        list.itemInstanceIds.unshift(instanceId);
      }
    },

    // src/renderer/store/listsSlice.ts

    // ...
    instanceRemovedFromList(
      state,
      action: PayloadAction<{ listId: string; instanceId: string }>,
    ) {
      const { listId, instanceId } = action.payload;
      const instanceToRemove = state.goalInstances[instanceId];
      if (!instanceToRemove) return;

      const goalId = instanceToRemove.goalId;

      // 1. Видаляємо екземпляр зі списку
      const list = state.goalLists[listId];
      if (list) {
        list.itemInstanceIds = list.itemInstanceIds.filter(
          (id) => id !== instanceId,
        );
      }

      // 2. Видаляємо сам об'єкт екземпляру
      delete state.goalInstances[instanceId];

      // 3. ПЕРЕВІРКА НА СИРІТСТВО:
      // Перевіряємо, чи залишився хоча б один інший екземпляр, що посилається на цю ж ціль
      const isOrphaned = !Object.values(state.goalInstances).some(
        (instance) => instance.goalId === goalId,
      );

      if (isOrphaned) {
        // Якщо інших екземплярів немає, видаляємо оригінал цілі
        console.log(`Goal ${goalId} is orphaned. Deleting original.`);
        delete state.goals[goalId];
      }
    },
    // ...

    // +++ НОВИЙ ACTION: Повне видалення оригіналу цілі та всіх її посилань +++
    goalPermanentlyDeleted(state, action: PayloadAction<string>) {
      const goalIdToDelete = action.payload;

      // 1. Видалити оригінал цілі
      delete state.goals[goalIdToDelete];

      // 2. Знайти та видалити всі екземпляри, що посилаються на цю ціль
      const instancesToDelete: string[] = [];
      Object.values(state.goalInstances).forEach((instance) => {
        if (instance.goalId === goalIdToDelete) {
          instancesToDelete.push(instance.id);
        }
      });

      instancesToDelete.forEach((instanceId) => {
        delete state.goalInstances[instanceId];
        // 3. Видалити ID цих екземплярів з усіх списків
        Object.values(state.goalLists).forEach((list) => {
          list.itemInstanceIds = list.itemInstanceIds.filter(
            (id) => id !== instanceId,
          );
        });
      });
    },
    goalReferenceAdded(
      state,
      action: PayloadAction<{ listId: string; goalId: string }>,
    ) {
      const { listId, goalId } = action.payload;
      const list = state.goalLists[listId];
      // Переконуємось, що і список, і оригінальна ціль існують
      if (list && state.goals[goalId]) {
        const instanceId = nanoid();
        state.goalInstances[instanceId] = { id: instanceId, goalId: goalId };
        list.itemInstanceIds.push(instanceId); // Додаємо в кінець
      }
    },
    goalToggled(state, action: PayloadAction<string>) {
      const goalId = action.payload;
      const goal = state.goals[goalId];
      if (goal) {
        goal.completed = !goal.completed;
        goal.updatedAt = new Date().toISOString();
      }
    },
    goalUpdated(state, action: PayloadAction<{ id: string; text: string }>) {
      const { id, text } = action.payload;
      const goal = state.goals[id];
      if (goal) {
        goal.text = text;
        goal.updatedAt = new Date().toISOString();
      }
    },
    goalRemovedFromList(
      state,
      action: PayloadAction<{ listId: string; goalId: string }>,
    ) {
      const { listId, goalId } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        list.itemInstanceIds = list.itemInstanceIds.filter(
          (id) => id !== goalId,
        );
        list.updatedAt = new Date().toISOString();
      }
    },
    goalMoved(
      state,
      action: PayloadAction<{
        instanceId: string;
        sourceListId: string;
        destinationListId: string;
        destinationIndex: number;
      }>,
    ) {
      const { instanceId, sourceListId, destinationListId, destinationIndex } =
        action.payload;

      const sourceList = state.goalLists[sourceListId];
      if (sourceList) {
        sourceList.itemInstanceIds = sourceList.itemInstanceIds.filter(
          (id) => id !== instanceId,
        );
        sourceList.updatedAt = new Date().toISOString();
      }

      const destinationList = state.goalLists[destinationListId];
      if (
        destinationList &&
        !destinationList.itemInstanceIds.includes(instanceId)
      ) {
        destinationList.itemInstanceIds.splice(destinationIndex, 0, instanceId);
        destinationList.updatedAt = new Date().toISOString();
      }
    },

    goalOrderUpdated(
      state,
      action: PayloadAction<{ listId: string; orderedInstanceIds: string[] }>,
    ) {
      const list = state.goalLists[action.payload.listId];
      if (list) {
        list.itemInstanceIds = action.payload.orderedInstanceIds;
      }
    },

    goalsImported(
      state,
      action: PayloadAction<{
        listId: string;
        goalsData: { text: string; completed?: boolean }[];
      }>,
    ) {
      const { listId, goalsData } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        const newGoalIds: string[] = [];
        goalsData.forEach((goalData) => {
          const newGoal: Goal = {
            id: nanoid(),
            text: goalData.text.trim(),
            completed: goalData.completed || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.goals[newGoal.id] = newGoal;
          newGoalIds.push(newGoal.id);
        });
        list.itemInstanceIds.push(...newGoalIds);
        list.updatedAt = new Date().toISOString();
      }
    },

    // +++ ВІДСУТНІ РЕДЮСЕРИ, ЯКІ МИ ЗАРАЗ ДОДАЄМО +++
    goalAssociated(
      state,
      action: PayloadAction<{ goalId: string; listId: string }>,
    ) {
      const { goalId, listId } = action.payload;
      const goal = state.goals[goalId];
      if (goal) {
        if (!goal.associatedListIds) {
          goal.associatedListIds = [];
        }
        if (!goal.associatedListIds.includes(listId)) {
          goal.associatedListIds.push(listId);
          goal.updatedAt = new Date().toISOString();
        }
      }
    },
    goalDisassociated(
      state,
      action: PayloadAction<{ goalId: string; listId: string }>,
    ) {
      const { goalId, listId } = action.payload;
      const goal = state.goals[goalId];
      if (goal && goal.associatedListIds) {
        goal.associatedListIds = goal.associatedListIds.filter(
          (id) => id !== listId,
        );
        goal.updatedAt = new Date().toISOString();
      }
    },
    stateReplaced(state, action: PayloadAction<ListsState>) {
      // Новий підхід: створюємо новий об'єкт стану
      return {
        ...state, // <-- Спочатку копіюємо ВСІ поля з поточного стану (включаючи _persist)

        // Потім перезаписуємо тільки ті поля, що прийшли з імпортованого файлу
        goals: action.payload.goals || {},
        goalLists: action.payload.goalLists || {},
        goalInstances: action.payload.goalInstances || {},
      };
    },
  },
});

export const {
  listAdded,
  listUpdated,
  listRemoved,
  goalAdded,
  goalToggled,
  goalUpdated,
  goalRemovedFromList,
  goalMoved,
  goalOrderUpdated,
  goalsImported,
  goalAssociated, // <-- Тепер експортується
  goalDisassociated, // <-- Тепер експортується
  stateReplaced, // <-- Додаємо новий експорт
  goalReferenceAdded,
  instanceRemovedFromList,
  goalPermanentlyDeleted,
} = listsSlice.actions;

export default listsSlice.reducer;

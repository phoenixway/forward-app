// src/renderer/store/listsSlice.ts
import { createSlice, PayloadAction, nanoid } from "@reduxjs/toolkit";
import type { Goal, GoalList } from "../types";

export interface ListsState {
  goals: Record<string, Goal>;
  goalLists: Record<string, GoalList>;
}

const loadInitialState = (): ListsState => {
  try {
    const goalsDataRaw = localStorage.getItem("forwardApp_goals_v2");
    const goalListsDataRaw = localStorage.getItem("forwardApp_goal_lists_v2");
    const goals = goalsDataRaw ? JSON.parse(goalsDataRaw) : {};
    const goalLists = goalListsDataRaw ? JSON.parse(goalListsDataRaw) : {};
    return { goals, goalLists };
  } catch {
    return { goals: {}, goalLists: {} };
  }
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
            itemGoalIds: [],
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
      delete state.goalLists[listId];
    },

    // --- РЕДЮСЕРИ ДЛЯ ЦІЛЕЙ ---
    goalAdded: {
      reducer: (
        state,
        action: PayloadAction<{ listId: string; goal: Goal }>,
      ) => {
        const { listId, goal } = action.payload;
        state.goals[goal.id] = goal;
        const list = state.goalLists[listId];
        if (list) {
          list.itemGoalIds.unshift(goal.id);
          list.updatedAt = new Date().toISOString();
        }
      },
      prepare: (payload: { listId: string; text: string }) => {
        const id = nanoid();
        const createdAt = new Date().toISOString();
        return {
          payload: {
            listId: payload.listId,
            goal: {
              id,
              text: payload.text,
              completed: false,
              createdAt,
              updatedAt: createdAt,
            },
          },
        };
      },
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
        list.itemGoalIds = list.itemGoalIds.filter((id) => id !== goalId);
        list.updatedAt = new Date().toISOString();
      }
    },
    goalMoved(
      state,
      action: PayloadAction<{
        goalId: string;
        sourceListId: string;
        destinationListId: string;
        destinationIndex: number;
      }>,
    ) {
      const { goalId, sourceListId, destinationListId, destinationIndex } =
        action.payload;
      const sourceList = state.goalLists[sourceListId];
      if (sourceList) {
        sourceList.itemGoalIds = sourceList.itemGoalIds.filter(
          (id) => id !== goalId,
        );
        sourceList.updatedAt = new Date().toISOString();
      }
      const destinationList = state.goalLists[destinationListId];
      if (destinationList && !destinationList.itemGoalIds.includes(goalId)) {
        destinationList.itemGoalIds.splice(destinationIndex, 0, goalId);
        destinationList.updatedAt = new Date().toISOString();
      }
    },

    goalOrderUpdated(
      state,
      action: PayloadAction<{ listId: string; orderedGoalIds: string[] }>,
    ) {
      const { listId, orderedGoalIds } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        list.itemGoalIds = orderedGoalIds;
        list.updatedAt = new Date().toISOString();
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
        list.itemGoalIds.push(...newGoalIds);
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
      // Повністю замінюємо стан на той, що прийшов з імпорту
      state.goals = action.payload.goals;
      state.goalLists = action.payload.goalLists;
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
} = listsSlice.actions;

export default listsSlice.reducer;

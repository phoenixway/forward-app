// src/renderer/store/listsSlice.ts
import { createSlice, PayloadAction, nanoid } from "@reduxjs/toolkit";
import type { Draft } from "immer";
import type { Goal, GoalInstance, GoalList, ScoringStatus } from "../types";
// --- ІМПОРТИ ДЛЯ НОВОЇ ЛОГІКИ СИНХРОНІЗАЦІЇ ---
import { applyChanges, SyncChange } from '../logic/syncLogic';

// Визначимо тип для Thunk. Це робить слайс більш самодостатнім.
type AppThunk<ReturnType = void> = (dispatch: any, getState: () => { lists: ListsState }) => ReturnType;


export interface ListsState {
  goals: Record<string, Goal>;
  goalLists: Record<string, GoalList>;
  goalInstances: Record<string, GoalInstance>;
}

const initialState: ListsState = {
  goals: {},
  goalLists: {},
  goalInstances: {},
};

const recursivelyDeleteList = (state: Draft<ListsState>, listId: string) => {
  const listToDelete = state.goalLists[listId];
  if (!listToDelete) return;

  const childIds = Object.values(state.goalLists)
    .filter(l => l.parentId === listId)
    .map(l => l.id);
  childIds.forEach(childId => {
    recursivelyDeleteList(state, childId);
  });

  const instanceIdsToDelete = Object.values(state.goalInstances)
    .filter(instance => instance.listId === listId)
    .map(instance => instance.instanceId);

  instanceIdsToDelete.forEach(instanceId => {
    const instance = state.goalInstances[instanceId];
    if (instance) {
      const isOrphaned = !Object.values(state.goalInstances).some(
        i => i.instanceId !== instanceId && i.goalId === instance.goalId
      );
      if (isOrphaned) {
        delete state.goals[instance.goalId];
      }
    }
    delete state.goalInstances[instanceId];
  });

  delete state.goalLists[listId];
};


const listsSlice = createSlice({
  name: "lists",
  initialState,
  reducers: {
    // --- LIST ACTIONS ---

    listAdded(state, action: PayloadAction<GoalList>) {
      const newList = action.payload;
      const siblingLists = Object.values(state.goalLists).filter(
        (list) => list.parentId === newList.parentId
      );
      newList.order = siblingLists.length;
      state.goalLists[newList.id] = newList;
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
        list.updatedAt = Date.now();
      }
    },
    listRemoved(state, action: PayloadAction<string>) {
      recursivelyDeleteList(state, action.payload);
    },
    listMoved(state, action: PayloadAction<{ listId: string; newParentId: string | null }>) {
      const { listId, newParentId } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        const newSiblings = Object.values(state.goalLists).filter(l => l.parentId === newParentId);
        list.parentId = newParentId;
        list.order = newSiblings.length;
        list.updatedAt = Date.now();
      }
    },
    listsReordered(state, action: PayloadAction<{ parentId: string | null; orderedListIds: string[] }>) {
      const { orderedListIds } = action.payload;
      orderedListIds.forEach((listId, index) => {
        const list = state.goalLists[listId];
        if (list) {
          list.order = index;
          list.updatedAt = Date.now();
        }
      });
    },

    // --- GOAL & INSTANCE ACTIONS ---
    goalAdded: (state, action: PayloadAction<{ listId: string; text: string }>) => {
      const { listId, text } = action.payload;
      if (!state.goalLists[listId]) return;

      const goalId = nanoid();
      const instanceId = nanoid();
      const now = Date.now();

      state.goals[goalId] = {
        id: goalId,
        text,
        completed: false,
        createdAt: now,
        updatedAt: now,
        scoringStatus: "NOT_ASSESSED" as ScoringStatus,
        associatedListIds: [],
        description: "",
      };

      state.goalInstances[instanceId] = {
        instanceId: instanceId,
        goalId,
        listId,
        order: -now, 
      };
    },
    goalToggled(state, action: PayloadAction<string>) {
      const goalId = action.payload;
      const goal = state.goals[goalId];
      if (goal) {
        goal.completed = !goal.completed;
        goal.updatedAt = Date.now();
      }
    },
    goalUpdated(state, action: PayloadAction<Partial<Goal> & { id: string }>) {
      const { id, ...updates } = action.payload;
      const goal = state.goals[id];
      if (goal) {
        Object.assign(goal, updates);
        goal.updatedAt = Date.now();
      }
    },
    instanceRemovedFromList(state, action: PayloadAction<{ listId: string; instanceId: string }>) {
      const { instanceId } = action.payload;
      const instanceToRemove = state.goalInstances[instanceId];
      if (!instanceToRemove) return;

      const goalId = instanceToRemove.goalId;
      delete state.goalInstances[instanceId];

      const isOrphaned = !Object.values(state.goalInstances).some(instance => instance.goalId === goalId);
      if (isOrphaned) {
        delete state.goals[goalId];
      }
    },
    goalMoved: (state, action: PayloadAction<{ instanceId: string; sourceListId: string; destinationListId: string; destinationIndex: number; }>) => {
      const { instanceId, destinationListId, destinationIndex } = action.payload;
      const instance = state.goalInstances[instanceId];
      if (!instance) return;

      instance.listId = destinationListId;

      const destinationSiblings = Object.values(state.goalInstances)
        .filter(i => i.listId === destinationListId && i.instanceId !== instanceId)
        .sort((a, b) => a.order - b.order)
        .map(i => i.instanceId);

      destinationSiblings.splice(destinationIndex, 0, instanceId);

      destinationSiblings.forEach((id, index) => {
        if (state.goalInstances[id]) {
          state.goalInstances[id].order = index;
        }
      });
    },
    goalOrderUpdated: (state, action: PayloadAction<{ listId: string; orderedInstanceIds: string[] }>) => {
      const { listId, orderedInstanceIds } = action.payload;

      const instancesInList = Object.values(state.goalInstances).filter(i => i.listId === listId);
      if (instancesInList.length !== orderedInstanceIds.length) {
        console.warn("Mismatch in goalOrderUpdated instance count.");
      }

      orderedInstanceIds.forEach((instanceId, index) => {
        const instance = state.goalInstances[instanceId];
        if (instance && instance.listId === listId) {
          instance.order = index;
        }
      });
    },
    goalReferenceAdded: (state, action: PayloadAction<{ listId: string; goalId: string }>) => {
      const { listId, goalId } = action.payload;
      if (state.goalLists[listId] && state.goals[goalId]) {
        const instanceId = nanoid();
        const now = Date.now();
        state.goalInstances[instanceId] = {
          instanceId,
          goalId,
          listId,
          order: -now,
        };
      }
    },
    goalCopied: (state, action: PayloadAction<{ sourceGoalId: string; destinationListId: string; destinationIndex: number; }>) => {
      const { sourceGoalId, destinationListId } = action.payload;
      const originalGoal = state.goals[sourceGoalId];
      const destinationList = state.goalLists[destinationListId];
      if (originalGoal && destinationList) {
        const newGoalId = nanoid();
        const newInstanceId = nanoid();
        const now = Date.now();
        const newGoal: Goal = {
          ...originalGoal,
          id: newGoalId,
          createdAt: now,
          updatedAt: now,
        };
        state.goals[newGoalId] = newGoal;
        state.goalInstances[newInstanceId] = {
          instanceId: newInstanceId,
          goalId: newGoalId,
          listId: destinationListId,
          order: -now,
        };
      }
    },
    goalAssociated(state, action: PayloadAction<{ goalId: string; listId: string }>) {
      const { goalId, listId } = action.payload;
      const goal = state.goals[goalId];
      if (goal) {
        if (!goal.associatedListIds) goal.associatedListIds = [];
        if (!goal.associatedListIds.includes(listId)) {
          goal.associatedListIds.push(listId);
          goal.updatedAt = Date.now();
        }
      }
    },
    goalDisassociated(state, action: PayloadAction<{ goalId: string; listId: string }>) {
      const { goalId, listId } = action.payload;
      const goal = state.goals[goalId];
      if (goal?.associatedListIds) {
        goal.associatedListIds = goal.associatedListIds.filter(id => id !== listId);
        goal.updatedAt = Date.now();
      }
    },
    listExpansionToggled(state, action: PayloadAction<{ listId: string }>) {
      const { listId } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        list.isExpanded = !(list.isExpanded ?? true);
      }
    },
    stateReplaced(state, action: PayloadAction<ListsState>) {
      const { goals, goalLists, goalInstances } = action.payload;
      return {
        ...state,
        goals: goals || {},
        goalLists: goalLists || {},
        goalInstances: goalInstances || {},
      };
    },
  },
});

export const {
  listAdded,
  listUpdated,
  listRemoved,
  listMoved,
  listsReordered,
  goalAdded,
  goalToggled,
  goalUpdated,
  instanceRemovedFromList,
  goalMoved,
  goalOrderUpdated,
  goalReferenceAdded,
  goalCopied,
  goalAssociated,
  goalDisassociated,
  stateReplaced,
  listExpansionToggled,
} = listsSlice.actions;

// --- НОВА АСИНХРОННА ДІЯ (THUNK) ДЛЯ ЗАСТОСУВАННЯ ЗМІН СИНХРОНІЗАЦІЇ ---
export const applyApprovedChanges = (approvedChanges: SyncChange[]): AppThunk =>
    (dispatch, getState) => {
        const currentState = getState().lists;
        // Використовуємо applicator з syncLogic для розрахунку нового стану
        const newState = applyChanges(currentState, approvedChanges);
        // Замінюємо старий стан на новий за допомогою існуючої дії
        dispatch(stateReplaced(newState));
    };

export default listsSlice.reducer;
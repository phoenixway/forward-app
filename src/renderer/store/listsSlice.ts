// src/renderer/store/listsSlice.ts
import { createSlice, PayloadAction, nanoid } from "@reduxjs/toolkit";
import type { Draft } from "immer";
import type { Goal, GoalInstance, GoalList } from "../types";

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

  const instanceIds = [...(listToDelete.itemInstanceIds || [])];
  instanceIds.forEach(instanceId => {
    const instance = state.goalInstances[instanceId];
    if (instance) {
      const isOrphaned = !Object.values(state.goalInstances).some(
        i => i.id !== instanceId && i.goalId === instance.goalId
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
    listAdded: {
      reducer: (state, action: PayloadAction<GoalList>) => {
        const newList = action.payload;
        // ✨ ВИПРАВЛЕННЯ: Логіка визначення порядку перенесена сюди, де є доступ до стану
        const siblingLists = Object.values(state.goalLists).filter(
          list => list.parentId === newList.parentId
        );
        newList.order = siblingLists.length;
        state.goalLists[newList.id] = newList;
      },
      prepare: (payload: { name: string; description?: string, parentId?: string | null }) => {
        const id = nanoid();
        const createdAt = new Date().toISOString();
        return {
          payload: {
            id,
            name: payload.name,
            description: payload.description || "",
            itemInstanceIds: [],
            createdAt,
            updatedAt: createdAt,
            parentId: payload.parentId || null,
            isExpanded: true,
            order: 0, // Порядок буде перевизначено в редьюсері
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
      recursivelyDeleteList(state, action.payload);
    },
    listMoved(state, action: PayloadAction<{ listId: string; newParentId: string | null }>) {
      const { listId, newParentId } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        // Призначаємо максимально можливий порядок, щоб він опинився в кінці нового списку
        const newSiblings = Object.values(state.goalLists).filter(l => l.parentId === newParentId);
        list.parentId = newParentId;
        list.order = newSiblings.length;
        list.updatedAt = new Date().toISOString();
      }
    },
    listsReordered(state, action: PayloadAction<{ parentId: string | null; orderedListIds: string[] }>) {
        const { orderedListIds } = action.payload;
        orderedListIds.forEach((listId, index) => {
            const list = state.goalLists[listId];
            if (list) {
                list.order = index;
                list.updatedAt = new Date().toISOString();
            }
        });
    },

    // --- GOAL & INSTANCE ACTIONS ---
    goalAdded: (state, action: PayloadAction<{ listId: string; text: string }>) => {
      const { listId, text } = action.payload;
      const list = state.goalLists[listId];
      if (!list) return;
      const goalId = nanoid();
      const instanceId = nanoid();
      const now = new Date().toISOString();
      state.goals[goalId] = {
        id: goalId,
        text,
        description: "",
        completed: false,
        createdAt: now,
        updatedAt: now,
        associatedListIds: []
      };
      state.goalInstances[instanceId] = { id: instanceId, goalId };
      list.itemInstanceIds.unshift(instanceId);
    },
    goalToggled(state, action: PayloadAction<string>) {
      const goalId = action.payload;
      const goal = state.goals[goalId];
      if (goal) {
        goal.completed = !goal.completed;
        goal.updatedAt = new Date().toISOString();
      }
    },
    goalUpdated(state, action: PayloadAction<{ id: string; text: string; description?: string, associatedListIds?: string[] }>) {
      const { id, text, description, associatedListIds } = action.payload;
      const goal = state.goals[id];
      if (goal) {
        goal.text = text;
        if (description !== undefined) {
          goal.description = description;
        }
        if (associatedListIds !== undefined) {
          goal.associatedListIds = associatedListIds;
        }
        goal.updatedAt = new Date().toISOString();
      }
    },
    instanceRemovedFromList(state, action: PayloadAction<{ listId: string; instanceId: string }>) {
      const { listId, instanceId } = action.payload;
      const instanceToRemove = state.goalInstances[instanceId];
      if (!instanceToRemove) return;
      const goalId = instanceToRemove.goalId;
      const list = state.goalLists[listId];
      if (list) {
        list.itemInstanceIds = list.itemInstanceIds.filter(id => id !== instanceId);
      }
      delete state.goalInstances[instanceId];
      const isOrphaned = !Object.values(state.goalInstances).some(instance => instance.goalId === goalId);
      if (isOrphaned) {
        delete state.goals[goalId];
      }
    },
    goalMoved: (state, action: PayloadAction<{ instanceId: string; sourceListId: string; destinationListId: string; destinationIndex: number; }>) => {
      const { instanceId, sourceListId, destinationListId, destinationIndex } = action.payload;
      const sourceList = state.goalLists[sourceListId];
      if (sourceList) {
        sourceList.itemInstanceIds = sourceList.itemInstanceIds.filter(id => id !== instanceId);
      }
      const destinationList = state.goalLists[destinationListId];
      if (destinationList && !destinationList.itemInstanceIds.includes(instanceId)) {
        destinationList.itemInstanceIds.splice(destinationIndex, 0, instanceId);
      }
    },
    goalOrderUpdated: (state, action: PayloadAction<{ listId: string; orderedInstanceIds: string[] }>) => {
      const list = state.goalLists[action.payload.listId];
      if (list) {
        list.itemInstanceIds = action.payload.orderedInstanceIds;
      }
    },
    // ✨ ПОВЕРНУТО: Екшени, що були випадково видалені
    goalReferenceAdded: (state, action: PayloadAction<{ listId: string; goalId: string }>) => {
      const { listId, goalId } = action.payload;
      const list = state.goalLists[listId];
      if (list && state.goals[goalId]) {
        const instanceId = nanoid();
        state.goalInstances[instanceId] = { id: instanceId, goalId: goalId };
        list.itemInstanceIds.push(instanceId);
      }
    },
    goalCopied: (state, action: PayloadAction<{ sourceGoalId: string; destinationListId: string; destinationIndex: number; }>) => {
      const { sourceGoalId, destinationListId, destinationIndex } = action.payload;
      const originalGoal = state.goals[sourceGoalId];
      const destinationList = state.goalLists[destinationListId];
      if (originalGoal && destinationList) {
        const newGoalId = nanoid();
        const newInstanceId = nanoid();
        const now = new Date().toISOString();
        const newGoal: Goal = {
          ...originalGoal,
          id: newGoalId,
          createdAt: now,
          updatedAt: now,
          associatedListIds: [...(originalGoal.associatedListIds || [])]
        };
        state.goals[newGoalId] = newGoal;
        state.goalInstances[newInstanceId] = { id: newInstanceId, goalId: newGoalId };
        destinationList.itemInstanceIds.splice(destinationIndex, 0, newInstanceId);
      }
    },
    goalAssociated(state, action: PayloadAction<{ goalId: string; listId: string }>) {
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
    goalDisassociated(state, action: PayloadAction<{ goalId: string; listId: string }>) {
      const { goalId, listId } = action.payload;
      const goal = state.goals[goalId];
      if (goal && goal.associatedListIds) {
        goal.associatedListIds = goal.associatedListIds.filter(id => id !== listId);
        goal.updatedAt = new Date().toISOString();
      }
    },
    goalsImported(state, action: PayloadAction<{ listId: string; goalsData: { text: string; completed?: boolean }[] }>) {
      const { listId, goalsData } = action.payload;
      const list = state.goalLists[listId];
      if (list) {
        const newInstanceIds: string[] = [];
        const now = new Date().toISOString();
        goalsData.forEach((goalData) => {
          const newGoalId = nanoid();
          state.goals[newGoalId] = {
            id: newGoalId,
            text: goalData.text.trim(),
            description: "",
            completed: goalData.completed || false,
            createdAt: now,
            updatedAt: now,
            associatedListIds: [],
          };
          const newInstanceId = nanoid();
          state.goalInstances[newInstanceId] = { id: newInstanceId, goalId: newGoalId };
          newInstanceIds.push(newInstanceId);
        });
        list.itemInstanceIds.push(...newInstanceIds);
        list.updatedAt = now;
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
  goalReferenceAdded, // ✨ Повернуто
  goalCopied,         // ✨ Повернуто
  goalAssociated,     // ✨ Повернуто
  goalDisassociated,  // ✨ Повернуто
  goalsImported,      // ✨ Повернуто
  stateReplaced,
  listExpansionToggled,
} = listsSlice.actions;

export default listsSlice.reducer;

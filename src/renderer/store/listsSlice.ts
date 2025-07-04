// src/renderer/store/listsSlice.ts
import { createSlice, PayloadAction, nanoid } from "@reduxjs/toolkit";
import type { Goal, GoalInstance, GoalList } from "../types";

export interface ListsState {
  goals: Record<string, Goal>;
  goalLists: Record<string, GoalList>;
  goalInstances: Record<string, GoalInstance>;
  rootListIds: string[]; // ID списків верхнього рівня для збереження порядку
}

const initialState: ListsState = {
  goals: {},
  goalLists: {},
  goalInstances: {},
  rootListIds: [],
};

// Допоміжна функція для рекурсивного видалення
const recursivelyDeleteList = (state: ListsState, listId: string) => {
  const listToDelete = state.goalLists[listId];
  if (!listToDelete) return;

  // Make a copy of childListIds before iterating, as it might be mutated
  const childIds = [...(listToDelete.childListIds || [])];
  childIds.forEach(childId => {
    recursivelyDeleteList(state, childId);
  });

  // Make a copy of itemInstanceIds before iterating
  const instanceIds = [...(listToDelete.itemInstanceIds || [])];
  instanceIds.forEach(instanceId => {
    const instance = state.goalInstances[instanceId];
    if (instance) {
        // Check if the goal is orphaned before deleting
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
    // --- LIST ACTIONS (with nesting) ---
    listAdded: {
      reducer: (state, action: PayloadAction<GoalList>) => {
        const newList = action.payload;
        state.goalLists[newList.id] = newList;
        if (newList.parentId) {
          const parent = state.goalLists[newList.parentId];
          if (parent) {
            if (!Array.isArray(parent.childListIds)) {
                parent.childListIds = [];
            }
            if (!parent.childListIds.includes(newList.id)) {
                parent.childListIds.push(newList.id);
            }
          }
        } else {
           if (!Array.isArray(state.rootListIds)) {
               state.rootListIds = [];
           }
           if (!state.rootListIds.includes(newList.id)) {
             state.rootListIds.push(newList.id);
           }
        }
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
            childListIds: [],
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
      const listIdToRemove = action.payload;
      const listToRemove = state.goalLists[listIdToRemove];
      if (!listToRemove) return;

      if (listToRemove.parentId) {
        const parent = state.goalLists[listToRemove.parentId];
        if (parent && Array.isArray(parent.childListIds)) {
          parent.childListIds = parent.childListIds.filter(id => id !== listIdToRemove);
        }
      } else {
        if(Array.isArray(state.rootListIds)) {
            state.rootListIds = state.rootListIds.filter(id => id !== listIdToRemove);
        }
      }

      recursivelyDeleteList(state, listIdToRemove);
    },
    listMoved(state, action: PayloadAction<{
      listId: string;
      sourceParentId: string | null;
      destinationParentId: string | null;
      sourceIndex: number;
      destinationIndex: number;
    }>) {
      const { listId, destinationParentId, destinationIndex } = action.payload;
      const listToMove = state.goalLists[listId];
      if (!listToMove) return;

      // Ensure rootListIds is an array before any operations
      if (!Array.isArray(state.rootListIds)) {
          state.rootListIds = [];
      }

      // 1. Find and remove from old location (ROBUST METHOD)
      const oldParentId = listToMove.parentId;

      if (oldParentId === null) {
        // It was a root list. Remove from rootListIds.
        const idx = state.rootListIds.indexOf(listId);
        if (idx > -1) {
          state.rootListIds.splice(idx, 1);
        }
      } else {
        // It was a child list. Remove from its old parent.
        const oldParent = state.goalLists[oldParentId];
        if (oldParent && Array.isArray(oldParent.childListIds)) {
          const idx = oldParent.childListIds.indexOf(listId);
          if (idx > -1) {
            oldParent.childListIds.splice(idx, 1);
          }
        }
      }

      // 2. Add to the new location
      if (destinationParentId === null) {
        state.rootListIds.splice(destinationIndex, 0, listId);
        listToMove.parentId = null;
      } else {
        const destParent = state.goalLists[destinationParentId];
        if (destParent) {
          if (!Array.isArray(destParent.childListIds)) {
            destParent.childListIds = [];
          }
          destParent.childListIds.splice(destinationIndex, 0, listId);
          listToMove.parentId = destinationParentId;
        }
      }
      listToMove.updatedAt = new Date().toISOString();
    },

    // --- GOAL & INSTANCE ACTIONS ---
    goalAdded: (state, action: PayloadAction<{ listId: string; text: string }>) => { 
        const { listId, text } = action.payload;
        const list = state.goalLists[listId];
        if (!list) return;
        const goalId = nanoid();
        const instanceId = nanoid();
        const now = new Date().toISOString();
        state.goals[goalId] = { id: goalId, text, completed: false, createdAt: now, updatedAt: now };
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
    goalUpdated(state, action: PayloadAction<{ id: string; text: string }>) {
      const { id, text } = action.payload;
      const goal = state.goals[id];
      if (goal) {
        goal.text = text;
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
            const newGoal: Goal = { ...originalGoal, id: newGoalId, createdAt: now, updatedAt: now, associatedListIds: [] };
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
        goalsData.forEach((goalData) => {
          const newGoalId = nanoid();
          state.goals[newGoalId] = {
            id: newGoalId,
            text: goalData.text.trim(),
            completed: goalData.completed || false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const newInstanceId = nanoid();
          state.goalInstances[newInstanceId] = { id: newInstanceId, goalId: newGoalId };
          newInstanceIds.push(newInstanceId);
        });
        list.itemInstanceIds.push(...newInstanceIds);
        list.updatedAt = new Date().toISOString();
      }
    },
    stateReplaced(state, action: PayloadAction<ListsState>) {
      const { goals, goalLists, goalInstances, rootListIds } = action.payload;
      return {
          ...state,
          goals: goals || {},
          goalLists: goalLists || {},
          goalInstances: goalInstances || {},
          rootListIds: rootListIds || [],
      };
    },
  },
});

export const {
  listAdded,
  listUpdated,
  listRemoved,
  listMoved,
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
  goalsImported,
  stateReplaced,
} = listsSlice.actions;

export default listsSlice.reducer;
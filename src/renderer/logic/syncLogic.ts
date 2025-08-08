// src/renderer/logic/syncLogic.ts
import { produce } from 'immer';
import { ListsState } from "../store/listsSlice";
import { Goal, GoalInstance, GoalList, ScoringStatus } from "../types";

// --- Розширена структура для звіту про зміни ---

export type ChangeType = 'Add' | 'Update' | 'Delete' | 'Move';

export interface SyncChange {
    type: ChangeType;
    entityType: 'Список' | 'Ціль' | 'Привʼязка'; // Привʼязка = GoalInstance
    id: string; 
    description: string;
    longDescription?: string; // Для детальних описів, напр. переміщення
    entity: any; // Повна сутність для Add/Update
}

export interface SyncReport {
    changes: SyncChange[];
}


// --- Інтерфейси для JSON-формату, сумісного з Android (без змін) ---

interface DesktopGoal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: string; // ISO String
  updatedAt?: string; // ISO String
  tags?: string[];
  associatedListIds?: string[];
  valueImportance?: number;
  valueImpact?: number;
  effort?: number;
  cost?: number;
  risk?: number;
  weightEffort?: number;
  weightCost?: number;
  weightRisk?: number;
  rawScore?: number;
  displayScore?: number;
  scoringStatus?: ScoringStatus;
}

interface DesktopGoalInstance {
  id: string;
  goalId: string;
}

interface DesktopGoalList {
  id:string;
  name: string;
  description?: string;
  parentId: string | null;
  createdAt: string; // ISO String
  updatedAt?: string; // ISO String
  tags?: string[];
  isExpanded?: boolean;
  order: number;
  itemInstanceIds: string[];
}

export interface DesktopBackupData {
  goals: Record<string, DesktopGoal>;
  goalLists: Record<string, DesktopGoalList>;
  goalInstances: Record<string, DesktopGoalInstance>;
}

export interface DesktopBackupFile {
    version: number;
    exportedAt: string;
    data: DesktopBackupData;
}

// --- Функції-трансформери (без змін) ---

export function formatStateForExport(state: ListsState): DesktopBackupData {
  const desktopGoals: Record<string, DesktopGoal> = {};
  for (const goal of Object.values(state.goals)) {
    desktopGoals[goal.id] = {
      ...goal,
      createdAt: new Date(goal.createdAt).toISOString(),
      updatedAt: goal.updatedAt ? new Date(goal.updatedAt).toISOString() : undefined,
    };
  }

  const desktopGoalLists: Record<string, DesktopGoalList> = {};
  for (const list of Object.values(state.goalLists)) {
    const itemInstanceIds = Object.values(state.goalInstances)
      .filter(inst => inst.listId === list.id)
      .sort((a, b) => a.order - b.order)
      .map(inst => inst.instanceId);
      
    desktopGoalLists[list.id] = {
      ...list,
      itemInstanceIds,
      createdAt: new Date(list.createdAt).toISOString(),
      updatedAt: list.updatedAt ? new Date(list.updatedAt).toISOString() : undefined,
    };
  }

  const desktopGoalInstances: Record<string, DesktopGoalInstance> = {};
  for (const instance of Object.values(state.goalInstances)) {
    desktopGoalInstances[instance.instanceId] = {
      id: instance.instanceId,
      goalId: instance.goalId,
    };
  }

  return {
    goals: desktopGoals,
    goalLists: desktopGoalLists,
    goalInstances: desktopGoalInstances,
  };
}

export function transformImportedData(data: DesktopBackupData): ListsState {
  const newGoals: Record<string, Goal> = {};
  for (const goal of Object.values(data.goals)) {
    newGoals[goal.id] = {
      ...goal,
      createdAt: new Date(goal.createdAt).getTime(),
      updatedAt: goal.updatedAt ? new Date(goal.updatedAt).getTime() : undefined,
    };
  }

  const newGoalLists: Record<string, GoalList> = {};
  for (const list of Object.values(data.goalLists)) {
    const { itemInstanceIds, ...restOfList } = list;
    newGoalLists[list.id] = {
      ...restOfList,
      createdAt: new Date(list.createdAt).getTime(),
      updatedAt: list.updatedAt ? new Date(list.updatedAt).getTime() : undefined,
    };
  }
  
  const newGoalInstances: Record<string, GoalInstance> = {};
  for (const list of Object.values(data.goalLists)) {
    list.itemInstanceIds.forEach((instanceId, index) => {
      const originalInstance = data.goalInstances[instanceId];
      if (originalInstance) {
        newGoalInstances[instanceId] = {
          instanceId: originalInstance.id,
          goalId: originalInstance.goalId,
          listId: list.id,
          order: index,
        };
      }
    });
  }

  return {
    goals: newGoals,
    goalLists: newGoalLists,
    goalInstances: newGoalInstances,
  };
}


// --- ОНОВЛЕНИЙ syncComparator ---
export function syncComparator(localState: ListsState, remoteBackup: DesktopBackupFile): SyncReport {
    const remoteState = transformImportedData(remoteBackup.data);
    const changes: SyncChange[] = [];
    const deletedListIds = new Set<string>();
    const deletedGoalIds = new Set<string>();

    // Крок 1: Порівняння списків
    const allListIds = new Set([...Object.keys(localState.goalLists), ...Object.keys(remoteState.goalLists)]);
    allListIds.forEach(id => {
        const localList = localState.goalLists[id];
        const remoteList = remoteState.goalLists[id];

        if (remoteList && !localList) {
            changes.push({ type: 'Add', entityType: 'Список', id, description: remoteList.name, entity: remoteList });
        } else if (!remoteList && localList) {
            changes.push({ type: 'Delete', entityType: 'Список', id, description: localList.name, entity: localList });
            deletedListIds.add(id); // Запам'ятовуємо ID видаленого списку
        } else if (remoteList && localList && (remoteList.updatedAt ?? 0) > (localList.updatedAt ?? 0)) {
            changes.push({ type: 'Update', entityType: 'Список', id, description: remoteList.name, entity: remoteList });
        }
    });

    // Крок 2: Порівняння цілей
    const allGoalIds = new Set([...Object.keys(localState.goals), ...Object.keys(remoteState.goals)]);
    allGoalIds.forEach(id => {
        const localGoal = localState.goals[id];
        const remoteGoal = remoteState.goals[id];

        if (remoteGoal && !localGoal) {
            changes.push({ type: 'Add', entityType: 'Ціль', id, description: remoteGoal.text, entity: remoteGoal });
        } else if (!remoteGoal && localGoal) {
            changes.push({ type: 'Delete', entityType: 'Ціль', id, description: localGoal.text, entity: localGoal });
            deletedGoalIds.add(id); // Запам'ятовуємо ID видаленої цілі
        } else if (remoteGoal && localGoal && (remoteGoal.updatedAt ?? 0) > (localGoal.updatedAt ?? 0)) {
            changes.push({ type: 'Update', entityType: 'Ціль', id, description: remoteGoal.text, entity: remoteGoal });
        }
    });

    // Крок 3: Порівняння прив'язок (GoalInstance)
    const allInstanceIds = new Set([...Object.keys(localState.goalInstances), ...Object.keys(remoteState.goalInstances)]);
    allInstanceIds.forEach(id => {
        const localInstance = localState.goalInstances[id];
        const remoteInstance = remoteState.goalInstances[id];

        if (remoteInstance && !localInstance) {
            changes.push({ type: 'Add', entityType: 'Привʼязка', id, description: `Ціль "${remoteState.goals[remoteInstance.goalId]?.text ?? '?'}" до списку "${remoteState.goalLists[remoteInstance.listId]?.name ?? '?'}"`, entity: remoteInstance });
        } else if (!remoteInstance && localInstance) {
            // --- КЛЮЧОВА ЗМІНА ---
            // Створюємо запис про видалення прив'язки, лише якщо її батьки НЕ видалені
            if (!deletedListIds.has(localInstance.listId) && !deletedGoalIds.has(localInstance.goalId)) {
                const goalText = localState.goals[localInstance.goalId]?.text ?? 'Невідома ціль';
                const listName = localState.goalLists[localInstance.listId]?.name ?? 'Невідомий список';
                changes.push({ type: 'Delete', entityType: 'Привʼязка', id, description: `Ціль "${goalText}" зі списку "${listName}"`, entity: localInstance });
            }
        } else if (remoteInstance && localInstance && (remoteInstance.order !== localInstance.order || remoteInstance.listId !== localInstance.listId)) {
            const goalText = (localState.goals[localInstance.goalId]?.text || remoteState.goals[remoteInstance?.goalId]?.text) ?? '?';
            const fromList = localState.goalLists[localInstance.listId]?.name ?? '?';
            const toList = remoteState.goalLists[remoteInstance.listId]?.name ?? '?';
            const longDesc = `Ціль "${goalText}" переміщено з "${fromList}" (поз. ${localInstance.order}) у "${toList}" (поз. ${remoteInstance.order}).`;
            changes.push({ type: 'Move', entityType: 'Привʼязка', id, description: `Переміщення цілі "${goalText}"`, longDescription: longDesc, entity: remoteInstance });
        }
    });

    return { changes };
}


// --- syncApplicator (без змін) ---
export function applyChanges(currentState: ListsState, approvedChanges: SyncChange[]): ListsState {
  return produce(currentState, draftState => {
    const changesByType = {
      Delete: approvedChanges.filter(c => c.type === 'Delete'),
      Update: approvedChanges.filter(c => c.type === 'Update'),
      Add: approvedChanges.filter(c => c.type === 'Add'),
      Move: approvedChanges.filter(c => c.type === 'Move'),
    };

    // 1. Видалення
    changesByType.Delete.forEach(change => {
      switch (change.entityType) {
        case 'Список':
          delete draftState.goalLists[change.id];
          Object.values(draftState.goalInstances).forEach(inst => {
            if (inst.listId === change.id) {
              delete draftState.goalInstances[inst.instanceId];
            }
          });
          break;
        case 'Ціль':
          delete draftState.goals[change.id];
          Object.values(draftState.goalInstances).forEach(inst => {
            if (inst.goalId === change.id) {
              delete draftState.goalInstances[inst.instanceId];
            }
          });
          break;
        case 'Привʼязка':
          delete draftState.goalInstances[change.id];
          break;
      }
    });

    // 2. Оновлення
    changesByType.Update.forEach(change => {
      switch (change.entityType) {
        case 'Список':
          draftState.goalLists[change.id] = change.entity;
          break;
        case 'Ціль':
          draftState.goals[change.id] = change.entity;
          break;
      }
    });

    // 3. Додавання та переміщення
    [...changesByType.Add, ...changesByType.Move].forEach(change => {
      switch (change.entityType) {
        case 'Список':
          draftState.goalLists[change.id] = change.entity;
          break;
        case 'Ціль':
          draftState.goals[change.id] = change.entity;
          break;
        case 'Привʼязка':
          draftState.goalInstances[change.id] = change.entity;
          break;
      }
    });
  });
}
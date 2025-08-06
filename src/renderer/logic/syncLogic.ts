// src/renderer/logic/syncLogic.ts
import { ListsState } from "../store/listsSlice";
import { SyncChange, SyncReport } from "../store/syncSlice";
import { Goal, GoalInstance, GoalList, ScoringStatus } from "../types";

// --- Інтерфейси для JSON-формату, сумісного з Android ---

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
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  createdAt: string; // ISO String
  updatedAt?: string; // ISO String
  tags?: string[];
  isExpanded?: boolean;
  order: number;
  itemInstanceIds: string[]; // Android очікує цей масив
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

// --- Функції-трансформери ---

/**
 * Конвертує внутрішній стан Redux у формат, сумісний з Android, для експорту.
 */
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

/**
 * Конвертує імпортовані дані з Android-сумісного формату у внутрішній стан Redux.
 */
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


/**
 * Створює звіт про зміни, порівнюючи поточний стан з отриманим ззовні.
 */
export function createSyncReportForDesktop(currentState: ListsState, remoteBackup: DesktopBackupFile): SyncReport {
    const remoteState = transformImportedData(remoteBackup.data);
    const changes: SyncChange[] = [];

    // Порівняння списків
    for (const remoteList of Object.values(remoteState.goalLists)) {
        const localList = currentState.goalLists[remoteList.id];
        if (!localList) {
            changes.push({ type: 'Add', entityType: 'Список', id: remoteList.id, description: remoteList.name, entity: remoteList });
        } else if ((remoteList.updatedAt ?? 0) > (localList.updatedAt ?? 0)) {
            // Тут можна додати більш детальне порівняння полів, якщо потрібно
            changes.push({ type: 'Update', entityType: 'Список', id: remoteList.id, description: remoteList.name, entity: remoteList });
        }
    }

    // Порівняння цілей
    for (const remoteGoal of Object.values(remoteState.goals)) {
        const localGoal = currentState.goals[remoteGoal.id];
        if (!localGoal) {
            changes.push({ type: 'Add', entityType: 'Ціль', id: remoteGoal.id, description: remoteGoal.text, entity: remoteGoal });
        } else if ((remoteGoal.updatedAt ?? 0) > (localGoal.updatedAt ?? 0)) {
            changes.push({ type: 'Update', entityType: 'Ціль', id: remoteGoal.id, description: remoteGoal.text, entity: remoteGoal });
        }
    }

    return { changes };
}
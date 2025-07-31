// src/renderer/logic/syncLogic.ts
import type { RootState } from '../store/store';
import type { SyncChange, SyncReport } from '../store/syncSlice';
import type { Goal, GoalList } from '../types';

/**
 * Створює звіт про зміни, порівнюючи локальні дані з даними з бекапу.
 */
export function createSyncReport(
  localState: RootState['lists'],
  remoteBackup: any,
): SyncReport {
  const changes: SyncChange[] = [];
  const remoteData = remoteBackup.data;

  if (!remoteData) {
    throw new Error("Формат бекапу некоректний: поле 'data' відсутнє.");
  }

  const remoteLists: Record<string, GoalList> = remoteData.goalLists || {};
  const remoteGoals: Record<string, Goal> = remoteData.goals || {};

  // 1. Порівняння списків (GoalList)
  for (const listId in remoteLists) {
    const remoteList = remoteLists[listId];
    const localList = localState.goalLists[listId];

    if (!localList) {
      changes.push({
        type: 'Add', entityType: 'Список', id: remoteList.id,
        description: remoteList.name, entity: remoteList,
      });
    } else {
      const remoteDate = remoteList.updatedAt ? Date.parse(remoteList.updatedAt) : 0;
      const localDate = localList.updatedAt ? Date.parse(localList.updatedAt) : 0;

      // ✨ ЗМІНА: Додано порівняння по order. Зміна буде, якщо новіша дата АБО змінився порядок.
      const isOrderDifferent = remoteList.order !== localList.order;

      if (remoteDate > localDate || (remoteDate === localDate && isOrderDifferent)) {
         // Проста перевірка, чи об'єкти не ідентичні, щоб не додавати зайвих оновлень
         if (JSON.stringify(remoteList) !== JSON.stringify(localList)) {
            changes.push({
                type: 'Update', entityType: 'Список', id: remoteList.id,
                description: remoteList.name, entity: remoteList,
            });
         }
      }
    }
  }

  // 2. Порівняння цілей (Goal)
  for (const goalId in remoteGoals) {
    const remoteGoal = remoteGoals[goalId];
    const localGoal = localState.goals[goalId];

    if (!localGoal) {
      changes.push({
        type: 'Add', entityType: 'Ціль', id: remoteGoal.id,
        description: remoteGoal.text, entity: remoteGoal,
      });
    } else {
      const remoteDate = remoteGoal.updatedAt ? Date.parse(remoteGoal.updatedAt) : 0;
      const localDate = localGoal.updatedAt ? Date.parse(localGoal.updatedAt) : 0;

      if (remoteDate > localDate) {
        if (JSON.stringify(remoteGoal) !== JSON.stringify(localGoal)) {
            changes.push({
                type: 'Update', entityType: 'Ціль', id: remoteGoal.id,
                description: remoteGoal.text, entity: remoteGoal,
            });
        }
      }
    }
  }

  return { changes };
}

// src/renderer/logic/syncLogic.ts
import type { RootState } from '../store/store';
import type { SyncChange, SyncReport } from '../store/syncSlice';
import type { Goal, GoalList } from '../types';

/**
 * Створює звіт про зміни, порівнюючи локальні дані з даними з бекапу.
 * @param localState Поточний стан `lists` з Redux.
 * @param remoteBackup Дані, отримані з Android-пристрою.
 * @returns Об'єкт SyncReport, що містить список змін.
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
      // Список є на телефоні, але немає локально -> Додавання
      changes.push({
        type: 'Add',
        entityType: 'Список',
        id: remoteList.id,
        description: remoteList.name,
        entity: remoteList,
      });
    } else {
      // Список є на обох пристроях, порівнюємо дати оновлення
      const remoteDate = remoteList.updatedAt ? Date.parse(remoteList.updatedAt) : 0;
      const localDate = localList.updatedAt ? Date.parse(localList.updatedAt) : 0;
      
      if (remoteDate > localDate) {
        // На телефоні новіша версія -> Оновлення
        changes.push({
          type: 'Update',
          entityType: 'Список',
          id: remoteList.id,
          description: remoteList.name,
          entity: remoteList,
        });
      }
    }
  }

  // 2. Порівняння цілей (Goal)
  for (const goalId in remoteGoals) {
    const remoteGoal = remoteGoals[goalId];
    const localGoal = localState.goals[goalId];

    if (!localGoal) {
      // Ціль є на телефоні, але немає локально -> Додавання
      changes.push({
        type: 'Add',
        entityType: 'Ціль',
        id: remoteGoal.id,
        description: remoteGoal.text,
        entity: remoteGoal,
      });
    } else {
      // Ціль є на обох пристроях, порівнюємо дати оновлення
      const remoteDate = remoteGoal.updatedAt ? Date.parse(remoteGoal.updatedAt) : 0;
      const localDate = localGoal.updatedAt ? Date.parse(localGoal.updatedAt) : 0;

      if (remoteDate > localDate) {
        // На телефоні новіша версія -> Оновлення
        changes.push({
          type: 'Update',
          entityType: 'Ціль',
          id: remoteGoal.id,
          description: remoteGoal.text,
          entity: remoteGoal,
        });
      }
    }
  }
  
  // Примітка: тут ми не обробляємо видалення, щоб уникнути випадкової втрати даних.
  // Це значно спрощує першу версію інтелектуальної синхронізації.

  return { changes };
}
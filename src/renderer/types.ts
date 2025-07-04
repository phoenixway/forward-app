// src/renderer/types.ts

/**
 * Основна сутність "Ціль".
 * Взято з вашого файлу, включаючи опціональний 'description'.
 */
export interface Goal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  associatedListIds?: string[];
}

/**
 * Екземпляр цілі. Дозволяє одній цілі існувати в кількох списках.
 */
export interface GoalInstance {
  id: string;
  goalId: string;
}

/**
 * Сутність "Список Цілей".
 * Адаптовано для підтримки деревоподібної структури.
 */
export interface GoalList {
  id: string;
  name: string;
  description?: string;
  itemInstanceIds: string[]; // ID екземплярів цілей у цьому списку
  createdAt: string;
  updatedAt: string;

  // --- НОВІ ПОЛЯ для ієрархії ---
  parentId: string | null; // ID батьківського списку, null для кореневих
  childListIds: string[];  // ID дочірніх списків
}

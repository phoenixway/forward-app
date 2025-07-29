// src/renderer/types.ts

/**
 * Основна сутність "Ціль".
 * Взято з вашого файлу, включаючи опціональний 'description'.
 */
// src/renderer/types.ts
// src/renderer/types.ts

export interface Goal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: string; // В Android це Long, тут string (ISO). Потребує уваги при порівнянні.
  updatedAt?: string;
  tags?: string[]; // На Android є, тут варто додати для повноти
  associatedListIds?: string[];

  // --- Поля для нової Системи Б ---
  valueImportance?: number; // В Android Float
  valueImpact?: number;     // В Android Float
  effort?: number;          // В Android Float
  cost?: number;            // В Android Float
  risk?: number;            // В Android Float

  // --- Вагові коефіцієнти ---
  weightEffort?: number;    // В Android Float
  weightCost?: number;      // В Android Float
  weightRisk?: number;      // В Android Float

  // --- Розраховані поля для зберігання ---
  rawScore?: number;        // В Android Float
  displayScore?: number;    // В Android Int

  // --- Старі поля, які можуть знадобитися для міграції ---
  parentValueImportance?: number | null;
  impactOnParentGoal?: number | null;
  timeCost?: number | null;
  financialCost?: number | null;
}

// ... решта інтерфейсів (GoalInstance, GoalList) ...

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
  itemInstanceIds: string[]; 
  createdAt: string;
  updatedAt: string;

  parentId: string | null; 
  childListIds: string[];  
  isExpanded?: boolean;
}

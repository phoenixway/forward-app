// src/renderer/types.ts

// ✨ ДОДАНО: Enum для статусу оцінки, як в Android.
export enum ScoringStatus {
  NOT_ASSESSED = "NOT_ASSESSED",
  IMPOSSIBLE_TO_ASSESS = "IMPOSSIBLE_TO_ASSESS",
  ASSESSED = "ASSESSED",
}

export interface Goal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  // ✨ ЗМІНА: Дати тепер є числами (Unix timestamp), як в Android.
  createdAt: number;
  updatedAt?: number;
  tags?: string[];
  associatedListIds?: string[];

  // Поля для системи оцінки (типи відповідають JS/TS)
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
  
  // ✨ ДОДАНО: Нове поле статусу, як в Android.
  scoringStatus?: ScoringStatus;

  // Старі поля для можливої майбутньої міграції (залишаємо для повноти)
  parentValueImportance?: number | null;
  impactOnParentGoal?: number | null;
  timeCost?: number | null;
  financialCost?: number | null;
}

// ✨ КАРДИНАЛЬНА ЗМІНА: Структура GoalInstance тепер відповідає Android.
export interface GoalInstance {
  instanceId: string; // Перейменовано з 'id' для ясності
  goalId: string;
  listId: string;   // ✨ ДОДАНО: Пряма прив'язка до списку.
  order: number;    // ✨ ДОДАНО: Порядок зберігається тут.
}

export interface GoalList {
  id: string;
  name: string;
  description?: string;
  // ✨ ВИДАЛЕНО: itemInstanceIds більше не потрібне. Порядок тепер у GoalInstance.
  createdAt: number; // ✨ ЗМІНА: Тип дати - number.
  updatedAt?: number; // ✨ ЗМІНА: Тип дати - number.
  parentId: string | null;
  isExpanded?: boolean;
  order: number; // Порядок самих списків один відносно одного
  tags?: string[]; // ✨ ДОДАНО: Теги для списків, як в Android.
}
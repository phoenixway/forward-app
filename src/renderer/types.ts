// src/renderer/types.ts

export interface Goal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: string; // В Android це Long, тут string (ISO).
  updatedAt?: string;
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
  parentValueImportance?: number | null;
  impactOnParentGoal?: number | null;
  timeCost?: number | null;
  financialCost?: number | null;
}

export interface GoalInstance {
  id: string;
  goalId: string;
}

export interface GoalList {
  id: string;
  name: string;
  description?: string;
  itemInstanceIds: string[];
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  isExpanded?: boolean;
  // ✨ ЗМІНА: Додано поле для сортування, як в Android.
  order: number;
  // ✨ ВИДАЛЕНО: childListIds більше не потрібне.
}

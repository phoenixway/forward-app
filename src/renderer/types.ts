// src/renderer/types.ts
export interface Goal {
  id: string;
  text: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  updatedAt?: string;
  associatedListIds?: string[];
}

// Оновлюємо тип GoalList
export interface GoalList {
  id: string;
  name: string;
  description?: string;
  itemInstanceIds: string[]; // <--- Перейменовано з itemGoalIds
  createdAt: string;
  updatedAt: string;
}

export interface GoalInstance {
  id: string; // Унікальний ID для цього екземпляра
  goalId: string; // ID оригінальної цілі, на яку він посилається
}

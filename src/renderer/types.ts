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

export interface GoalInstance {
  id: string;
  goalId: string;
}

// --- ВИПРАВЛЕНО: Використовуємо itemInstanceIds ---
export interface GoalList {
  id: string;
  name: string;
  description?: string;
  itemInstanceIds: string[];
  createdAt: string;
  updatedAt: string;
}

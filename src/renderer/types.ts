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

export interface GoalList {
  id: string;
  name: string;
  description?: string;
  itemGoalIds: string[];
  createdAt: string;
  updatedAt: string;
}

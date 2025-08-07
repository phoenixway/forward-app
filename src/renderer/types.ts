// src/renderer/types.ts

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
  createdAt: number;
  updatedAt?: number;
  tags?: string[];
  associatedListIds?: string[];

  // Поля для системи оцінки
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

  // Старі поля для можливої майбутньої міграції
  parentValueImportance?: number | null;
  impactOnParentGoal?: number | null;
  timeCost?: number | null;
  financialCost?: number | null;
}

export interface GoalInstance {
  instanceId: string;
  goalId: string;
  listId: string;
  order: number;
}

export interface GoalList {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;
  parentId: string | null;
  isExpanded?: boolean;
  order: number;
  tags?: string[];
}

// Тип для вкладки, перенесений з MainPanel.tsx
export interface Tab {
  id: string;
  type: "goal-list" | "settings";
  title: string;
  isClosable?: boolean;
  listId?: string;
}
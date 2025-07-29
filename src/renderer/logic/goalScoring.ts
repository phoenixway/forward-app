// src/renderer/logic/goalScoring.ts
import type { Goal } from '../types';

/**
 * Розраховує rawScore та displayScore для цілі на основі її параметрів.
 * Ця функція є аналогом логіки з GoalScoringManager в Android-додатку.
 * @param goal Об'єкт цілі для розрахунку.
 * @returns Оновлений об'єкт цілі з розрахованими `rawScore` та `displayScore`.
 */
export function calculateScores(goal: Partial<Goal>): Partial<Goal> {
  // Значення за замовчуванням, якщо поля не визначені
  const importance = goal.valueImportance ?? 0;
  const impact = goal.valueImpact ?? 0;
  const effort = goal.effort ?? 0;
  const cost = goal.cost ?? 0;
  const risk = goal.risk ?? 0;

  const weightEffort = goal.weightEffort ?? 1.0;
  const weightCost = goal.weightCost ?? 1.0;
  const weightRisk = goal.weightRisk ?? 1.0;

  // Формула, що імітує логіку Android-додатку
  const valueComponent = importance * impact;
  const costComponent = (effort * weightEffort) + (cost * weightCost) + (risk * weightRisk);

  let rawScore: number;
  if (costComponent > 0) {
    rawScore = valueComponent / costComponent;
  } else {
    rawScore = valueComponent > 0 ? Infinity : 0; // Якщо витрат немає, цінність максимальна
  }
  
  // Перетворення rawScore у простий цілочисельний рейтинг для відображення
  // (цю логіку можна налаштувати)
  const displayScore = Math.round(rawScore * 10);

  return {
    ...goal,
    rawScore,
    displayScore
  };
}
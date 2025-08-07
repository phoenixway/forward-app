// src/renderer/logic/goalScoring.ts
import type { Goal, ScoringStatus } from '../types';

// --- Визначення індивідуальних шкал для кожного параметра ---
const effortScale = [0, 1, 2, 3, 5, 8, 13, 21];
const importanceScale = Array.from({ length: 12 }, (_, i) => i + 1); // Лінійна 1-12
const impactScale = [1, 2, 3, 5, 8, 13];
const costScale = Array.from({ length: 6 }, (_, i) => i); // Лінійна 0-5
const riskScale = effortScale; // Ризик використовує ту ж шкалу, що й зусилля

/**
 * Нормалізує значення в діапазон від 0 до 1 на основі заданої шкали.
 */
function normalize(value: number, scale: number[]): number {
    const min = scale[0] ?? 0;
    const max = scale[scale.length - 1] ?? 1;
    if (max <= min) return 0;
    
    const result = (value - min) / (max - min);
    
    // Аналог .coerceIn(0f, 1f) в Kotlin
    return Math.max(0, Math.min(1, result));
}

/**
 * Розраховує rawScore (від -1 до 1) та displayScore (від 0 до 100) для цілі.
 * @param goal Об'єкт цілі (може бути частковим, для розрахунку "на льоту").
 * @returns Об'єкт з розрахованими rawScore та displayScore.
 */
export function calculateScores(goal: Partial<Goal>): { rawScore: number; displayScore: number } {
    if (goal.scoringStatus !== 'ASSESSED') {
        return { rawScore: 0, displayScore: 0 };
    }

    // Беремо значення з цілі або встановлюємо значення за замовчуванням
    const { 
        valueImportance = 1, valueImpact = 1,
        effort = 0, cost = 0, risk = 0,
        weightEffort = 1, weightCost = 1, weightRisk = 1
    } = goal;

    const normImportance = normalize(valueImportance, importanceScale);
    const normImpact = normalize(valueImpact, impactScale);
    const normEffort = normalize(effort, effortScale);
    const normCost = normalize(cost, costScale);
    const normRisk = normalize(risk, riskScale);

    const normBenefit = normImportance * normImpact;

    const totalWeight = weightEffort + weightCost + weightRisk;
    const normTotalCost = totalWeight > 0
        ? ((weightEffort * normEffort) + (weightCost * normCost) + (weightRisk * normRisk)) / totalWeight
        : 0;
    
    // rawScore: Нормалізований "баланс" від -1 до 1
    const calculatedRawScore = normBenefit - normTotalCost;
    
    // displayScore: Відображувана оцінка, переведена у шкалу від 0 до 100
    const calculatedDisplayScore = Math.round(((calculatedRawScore + 1) / 2) * 100);

    return {
        rawScore: calculatedRawScore,
        displayScore: Math.max(0, Math.min(100, calculatedDisplayScore)) // Гарантуємо, що значення в межах 0-100
    };
}
// src/renderer/components/GoalItem.tsx
import React from 'react';
import type { Goal } from '../types';
import GoalTextRenderer from './GoalTextRenderer';

// --- ВИПРАВЛЕННЯ: Додаємо onNavigate до інтерфейсу пропсів ---
interface GoalItemProps {
  goal: Goal;
  obsidianVaultName: string;
  onNavigate: (goal: Goal) => void;
}

/**
 * Простий компонент для відображення цілі без можливості перетягування.
 * Використовується на сторінках, де не потрібен dnd, наприклад, у результатах пошуку.
 */
const GoalItem: React.FC<GoalItemProps> = ({ goal, obsidianVaultName, onNavigate }) => {
  const handleClick = () => {
    onNavigate(goal);
  };

  return (
    // Додаємо обробник кліку та стилі для курсору, кольору тексту та ефекту при наведенні
    <div
      className="p-1 rounded-md cursor-pointer text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50"
      onClick={handleClick}
      title="Перейти до цілі в її списку"
    >
      <GoalTextRenderer
        text={goal.text}
        stripFields={false}
        obsidianVaultName={obsidianVaultName}
      />
    </div>
  );
};

export default GoalItem;

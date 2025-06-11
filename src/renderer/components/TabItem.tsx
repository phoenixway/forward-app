// src/renderer/components/TabItem.tsx
import React from 'react';
import type { Tab } from './MainPanel'; // Або з вашого файлу типів
import { X } from 'lucide-react'; 

interface TabItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: (tabId: string) => void;
  onClose?: (tabId: string) => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onClick, onClose }) => {
  
  // Обробник для кліку лівою кнопкою (активація вкладки)
  const handlePrimaryClick = () => {
    onClick(tab.id);
  };

  // Обробник для кліку середньою кнопкою (закриття вкладки)
  // або для кліку по кнопці "хрестик"
  const handleCloseClick = (event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Зупинити спливання, щоб не спрацював handlePrimaryClick
    }
    if (onClose && tab.isClosable) {
      onClose(tab.id);
    }
  };

  // Обробник для події onMouseDown
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // event.button:
    // 0: Ліва кнопка
    // 1: Середня кнопка (колесо)
    // 2: Права кнопка
    if (event.button === 1 && onClose && tab.isClosable) { // Перевірка на середню кнопку
      event.preventDefault(); // Запобігти стандартній дії (наприклад, прокручування)
      handleCloseClick(); // Викликаємо ту саму логіку закриття
    }
    // Лівий клік обробляється через onClick на div, його тут спеціально не викликаємо
  };

  return (
    <div
      onClick={handlePrimaryClick} // Для лівого кліку
      onMouseDown={handleMouseDown} // Для середнього (та інших, але ми фільтруємо)
className={`flex items-center justify-between cursor-pointer text-sm whitespace-nowrap
            border-r border-slate-300 dark:border-slate-700 last:border-r-0 group flex-shrink-0
            ${isActive 
              ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 relative px-3 py-1.5' // <--- ВЗЯЛИ ВЕРТИКАЛЬНІ ПАДІНГИ З НЕАКТИВНОЇ, БЕЗ BORDER-T
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5'
            }`}
      title={tab.title}
      role="tab" // Додамо роль для доступності
      aria-selected={isActive}
    >
      <span className={`truncate max-w-[150px] ${isActive ? 'font-medium' : ''}`}>
        {tab.title}
      </span>
      {tab.isClosable && onClose && (
        <button
          onClick={handleCloseClick} // Лівий клік по хрестику
          className={`ml-2 p-0.5 rounded-full 
                      ${isActive 
                        ? 'text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-700' 
                        : 'text-slate-400 dark:text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600 opacity-50 group-hover:opacity-100'
                      }`}
          aria-label={`Закрити вкладку ${tab.title}`}
          title={`Закрити вкладку ${tab.title}`}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default TabItem;
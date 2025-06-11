// src/renderer/components/NoListSelected.tsx
import React from 'react';

interface NoListSelectedProps {
  onSelectList: (listId: string) => void; // Якщо ви передаєте існуючі списки для вибору
  onCreateList: () => void;
}

const NoListSelected: React.FC<NoListSelectedProps> = ({ onSelectList, onCreateList }) => {
  // Тут можна додати логіку для відображення існуючих списків, якщо вони є,
  // але для простоти зараз тільки кнопка створення.
  // Наприклад, можна передати `goalLists` сюди.

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10m0 0h16M4 7L12 3l8 4M4 7h16m0 0L12 3m8 4v10m0 0h-3.5a1.5 1.5 0 00-1.5 1.5v2.5a1.5 1.5 0 001.5 1.5H16M4 17h3.5a1.5 1.5 0 011.5 1.5v2.5a1.5 1.5 0 01-1.5 1.5H4m0-17L12 3" />
      </svg>
      <h2 className="text-2xl font-semibold text-slate-700 mb-3">Список не вибрано</h2>
      <p className="text-slate-500 mb-6 max-w-md">
        Будь ласка, виберіть існуючий список з бічної панелі або створіть новий, щоб почати роботу з цілями.
      </p>
      <button
        onClick={onCreateList}
        className="px-6 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        Створити новий список
      </button>
      {/* Тут можна додати список існуючих списків для швидкого вибору, якщо потрібно */}
    </div>
  );
};

export default NoListSelected;
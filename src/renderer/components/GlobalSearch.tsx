// src/renderer/components/GlobalSearch.tsx
import React from 'react';
import { Search } from 'lucide-react';

// 1. Додаємо 'value' до пропсів
interface GlobalSearchProps {
  value: string;
  onFilterChange: (term: string) => void;
}

// 2. Отримуємо 'value' і передаємо його в input
const GlobalSearch: React.FC<GlobalSearchProps> = ({ value, onFilterChange }) => {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
      <input
        type="text"
        placeholder="Фільтр списків..."
        value={value} // 3. Встановлюємо значення поля з пропсів
        onChange={(e) => onFilterChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 py-1.5 pl-8 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
};

export default GlobalSearch;
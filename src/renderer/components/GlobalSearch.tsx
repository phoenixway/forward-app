// src/renderer/components/GlobalSearch.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Search, X } from 'lucide-react';
import { RootState, AppDispatch } from '../store/store';
import { setGlobalFilterTerm } from '../store/uiSlice';

const GlobalSearch: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const globalFilterTerm = useSelector((state: RootState) => state.ui.globalFilterTerm);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setGlobalFilterTerm(e.target.value));
  };

  const clearFilter = () => {
    dispatch(setGlobalFilterTerm(''));
  };

  return (
    <div className="p-2">
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search size={16} className="text-slate-400 dark:text-slate-500" />
        </div>
        <input
          type="text"
          placeholder="Пошук за #тегами, @проектами..."
          value={globalFilterTerm}
          onChange={handleFilterChange}
          className="w-full pl-9 pr-7 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md
                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                     focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400
                     focus:border-indigo-500 dark:focus:border-indigo-400
                     placeholder-slate-400 dark:placeholder-slate-500"
        />
        {globalFilterTerm && (
          <button
            onClick={clearFilter}
            className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            title="Очистити пошук"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
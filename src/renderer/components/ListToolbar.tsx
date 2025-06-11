// src/renderer/components/ListToolbar.tsx
import React, { useRef } from 'react'; // Додано useRef
import { SortAsc, Copy, Settings2, Trash2, FileInput, FileOutput, SortDesc, Search, X } from 'lucide-react';

interface ListToolbarProps {
  currentListId: string | null;
  filterText: string;
  onFilterTextChange: (text: string) => void;
  // onEscapeAndFocusInputPanel?: () => void; // Цей колбек більше не потрібен для цієї задачі
  onToggleAutoSort?: (listId: string) => void;
  onCopyListId?: (listId: string) => void;
  onOpenListSettings?: (listId: string) => void;
  onDeleteList?: (listId: string) => void;
  onImportGoals?: (listId: string) => void;
  onExportGoals?: (listId: string) => void;
  onSortByRating?: (listId: string) => void;
}

const ListToolbar: React.FC<ListToolbarProps> = ({
  currentListId,
  filterText,
  onFilterTextChange,
  // onEscapeAndFocusInputPanel, // Більше не приймаємо
  onToggleAutoSort,
  onCopyListId,
  onOpenListSettings,
  onDeleteList,
  onImportGoals,
  onExportGoals,
  onSortByRating,
}) => {
  const filterInputRef = useRef<HTMLInputElement>(null); // Реф для доступу до поля фільтра

  if (!currentListId) {
    return <div className="h-10 w-full flex-shrink-0 bg-slate-50 dark:bg-slate-800"></div>; 
  }

  // ... (інші обробники без змін) ...
  const handleToggleSort = () => { if (onToggleAutoSort) onToggleAutoSort(currentListId); };
  const handleCopyId = () => { if (onCopyListId) onCopyListId(currentListId); };
  const handleOpenSettings = () => { if (onOpenListSettings) onOpenListSettings(currentListId); };
  const handleDelete = () => { if (onDeleteList) onDeleteList(currentListId); };
  const handleImport = () => { if (onImportGoals) onImportGoals(currentListId); };
  const handleExport = () => { if (onExportGoals) onExportGoals(currentListId); };
  const handleSortRating = () => { if (onSortByRating) onSortByRating(currentListId); };

  const buttonClass = "p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400";
  const filterMaxWidthClass = "max-w-[600px]";

  const handleFilterKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault(); 
      if (filterText) { 
        onFilterTextChange('');
      }
      // Знімаємо фокус з поля фільтра
      filterInputRef.current?.blur(); 
      
      // Більше не викликаємо onEscapeAndFocusInputPanel
    }
  };

  return (
    <div className="h-10 bg-slate-50 dark:bg-slate-800 px-3 flex items-center justify-between w-full flex-shrink-0 space-x-3">
      <div className={`flex items-center ${filterMaxWidthClass} w-full`}> 
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400 dark:text-slate-500" />
          </div>
          <input
            ref={filterInputRef} // Прив'язуємо реф
            type="text"
            placeholder="Фільтрувати цілі..."
            value={filterText}
            onChange={(e) => onFilterTextChange(e.target.value)}
            onKeyDown={handleFilterKeyDown}
            className="w-full pl-9 pr-7 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md 
                       bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                       focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 
                       focus:border-indigo-500 dark:focus:border-indigo-400
                       placeholder-slate-400 dark:placeholder-slate-500"
          />
          {filterText && (
            <button
              onClick={() => {
                onFilterTextChange('');
                filterInputRef.current?.focus(); // Повертаємо фокус після кліку на Х
              }}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              title="Очистити фільтр"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ... (решта кнопок інструментів без змін) ... */}
      <div className="flex items-center space-x-1.5 flex-shrink-0">
        <button onClick={handleImport} title="Імпорт цілей" className={buttonClass}>
          <FileInput size={18} />
        </button>
        <button onClick={handleExport} title="Експорт цілей" className={buttonClass}>
          <FileOutput size={18} />
        </button>
        
        <span className="h-4/6 w-px bg-slate-300 dark:bg-slate-600 mx-1"></span>

        <button onClick={handleSortRating} title="Сортувати за рейтингом (від більшого до меншого)" className={buttonClass}>
          <SortDesc size={18} />
        </button>
        <button onClick={handleToggleSort} title="Авто-сортування (Приклад)" className={buttonClass}>
          <SortAsc size={18} />
        </button>
        
        <span className="h-4/6 w-px bg-slate-300 dark:bg-slate-600 mx-1"></span>

        <button onClick={handleCopyId} title="Копіювати ID списку" className={buttonClass}>
          <Copy size={18} />
        </button>
        <button onClick={handleOpenSettings} title="Налаштування списку (Приклад)" className={buttonClass}>
          <Settings2 size={18} />
        </button>
        <button onClick={handleDelete} title="Видалити список" className={`${buttonClass} hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-600/30`}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default ListToolbar;
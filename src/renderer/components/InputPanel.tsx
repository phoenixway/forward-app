// src/renderer/components/InputPanel.tsx
import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

export enum CommandMode {
  ADD = 'add',
  // SEARCH = 'search', // Закоментовано або видалено, якщо не використовується через префікс
  LIST_NAV = 'list_nav',
  COMMAND = 'command',
}

export interface InputPanelProps {
  currentListId?: string;
  defaultMode?: CommandMode;
  onAddGoal: (listId: string, text: string) => void;
  onSearch: (query: string) => void; 
  onNavigateToList: (listQuery: string) => void;
  onExecuteCommand: (command: string) => void;
}

export interface InputPanelRef {
  focus: () => void;
  switchToMode: (mode: CommandMode, value?: string) => void;
  localInputRef?: HTMLInputElement | null; 
}

const InputPanel = forwardRef<InputPanelRef, InputPanelProps>(({
  currentListId,
  defaultMode = CommandMode.ADD,
  onAddGoal,
  onSearch, 
  onNavigateToList,
  onExecuteCommand,
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [currentMode, setCurrentMode] = useState<CommandMode>(defaultMode);
  const [placeholder, setPlaceholder] = useState('');
  const internalLocalInputRef = useRef<HTMLInputElement>(null);

  const modeTriggers = useRef([
    { prefix: '@', mode: CommandMode.LIST_NAV, icon: '📜', name: 'Список' },
    { prefix: '>', mode: CommandMode.COMMAND, icon: '⚙️', name: 'Команда' },
    // Якщо потрібен режим пошуку через префікс, додай сюди, наприклад:
    // { prefix: '/', mode: CommandMode.SEARCH, icon: '🔍', name: 'Пошук' },
  ]).current;

  useEffect(() => {
    let newPlaceholder = '';
    let icon = '✏️'; 
    switch (currentMode) {
      case CommandMode.ADD:
        icon = '➕';
        newPlaceholder = `Нова ціль для ${currentListId ? `списку '${currentListId}'` : 'поточного списку'}...`;
        break;
      // case CommandMode.SEARCH: // Якщо режим пошуку прибрано
      //   icon = '🔍';
      //   newPlaceholder = 'Пошук цілей...';
      //   break;
      case CommandMode.LIST_NAV:
        icon = '📜';
        newPlaceholder = 'Перейти до списку...';
        break;
      case CommandMode.COMMAND:
        icon = '⚙️';
        newPlaceholder = 'Введіть команду...';
        break;
      default: newPlaceholder = 'Введіть текст...';
    }
    setPlaceholder(`${icon} ${newPlaceholder}`);
  }, [currentMode, currentListId]);

  useEffect(() => {
    setCurrentMode(defaultMode); 
  }, [defaultMode]);

  useEffect(() => {
    localStorage.setItem('inputPanelMode', currentMode);
  }, [currentMode]);

  const internalSwitchToMode = useCallback((newMode: CommandMode, newInputValue = '') => {
    if (currentMode !== newMode) {
      setCurrentMode(newMode);
    }
    setInputValue(newInputValue);
  }, [currentMode]); 

  useImperativeHandle(ref, () => ({
    focus: () => {
      internalLocalInputRef.current?.focus();
    },
    switchToMode: (mode: CommandMode, value = '') => {
        internalSwitchToMode(mode, value);
        if (internalLocalInputRef.current) {
            internalLocalInputRef.current.focus();
            setTimeout(() => { 
                if (internalLocalInputRef.current) {
                    internalLocalInputRef.current.selectionStart = internalLocalInputRef.current.value.length;
                    internalLocalInputRef.current.selectionEnd = internalLocalInputRef.current.value.length;
                }
            }, 0);
        }
    },
    get localInputRef() { return internalLocalInputRef.current; }
  }), [internalSwitchToMode]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;

    if (rawValue.length === 1) {
      for (const trigger of modeTriggers) {
        if (rawValue === trigger.prefix) {
          if (currentMode === trigger.mode) {
             setInputValue(''); 
             return;
          }
          internalSwitchToMode(trigger.mode, ''); 
          return;
        }
      }
    }
    
    setInputValue(rawValue);
  };

  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();

    // Перевірка на порожнє значення для режимів, які його не підтримують
    if (!trimmedValue) {
      // Для ADD, якщо не можна додавати порожні цілі, він не пройде умову `if (currentListId && trimmedValue)` нижче.
      // Для LIST_NAV та COMMAND, дія не буде виконана через `if (trimmedValue)` всередині case.
      // Якщо є режим SEARCH і він може приймати порожній рядок (для очищення фільтру), 
      // то ця умова має бути більш специфічною.
      // Наразі, якщо trimmedValue порожній, то для LIST_NAV і COMMAND нічого не відбудеться,
      // а для ADD також, якщо не змінити логіку.
      // Якщо після цього потрібно перемкнути режим, це робиться всередині case.
       if (currentMode === CommandMode.LIST_NAV || currentMode === CommandMode.COMMAND) {
           internalSwitchToMode(CommandMode.ADD, ''); // Повертаємось в ADD, якщо submit був порожнім
           return;
       }
       // Для ADD можна просто вийти, якщо порожньо, або показати alert
       // alert("Поле вводу не може бути порожнім для цієї дії.");
       return;
    }

    switch (currentMode) {
      case CommandMode.ADD:
        if (currentListId && trimmedValue) {
          onAddGoal(currentListId, trimmedValue);
          setInputValue(''); 
        } else if (!currentListId && trimmedValue) {
          alert("Спочатку виберіть список для додавання цілі.");
        }
        break;
      // case CommandMode.SEARCH: // Якщо цей режим активовано через префікс
      //   onSearch(trimmedValue); 
      //   // Зазвичай після пошуку ми не очищуємо поле і не змінюємо режим автоматично
      //   break;
      case CommandMode.LIST_NAV: 
        if (trimmedValue) { 
            onNavigateToList(trimmedValue);
        }
        internalSwitchToMode(CommandMode.ADD, '');
        break;
      case CommandMode.COMMAND:
        if (trimmedValue) { 
            onExecuteCommand(trimmedValue); 
        }
        internalSwitchToMode(CommandMode.ADD, '');
        break;
      default:
        console.warn("InputPanel handleSubmit: Unknown mode:", currentMode);
    }
  }, [inputValue, currentMode, currentListId, onAddGoal, onSearch, onNavigateToList, onExecuteCommand, internalSwitchToMode]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
    } else if (event.key === 'Escape') {
        internalLocalInputRef.current?.blur(); 
        if (currentMode !== CommandMode.ADD) {
            internalSwitchToMode(CommandMode.ADD, '');
        } else if (inputValue !== '') { 
            setInputValue('');
        }
    } else if (event.key === 'Backspace' && inputValue === '') {
        if (currentMode !== CommandMode.ADD) {
            internalSwitchToMode(CommandMode.ADD, '');
        }
    }
  };

  return (
    <div className="w-full"> 
      <input
        ref={internalLocalInputRef}
        type="text"
        value={inputValue} 
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                   bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 
                   focus:border-indigo-500 dark:focus:border-indigo-400
                   placeholder-slate-400 dark:placeholder-slate-500"
        aria-label="Командний рядок"
      />
    </div>
  );
});

export default InputPanel;
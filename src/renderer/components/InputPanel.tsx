// src/renderer/components/InputPanel.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";

import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import type { GoalList } from "../types";

export enum CommandMode {
  ADD = "add",
  LIST_NAV = "list_nav",
  COMMAND = "command",
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

const InputPanel = forwardRef<InputPanelRef, InputPanelProps>(
  (
    {
      currentListId,
      defaultMode = CommandMode.ADD,
      onAddGoal,
      onSearch,
      onNavigateToList,
      onExecuteCommand,
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = useState("");
    const [currentMode, setCurrentMode] = useState<CommandMode>(defaultMode);
    const [placeholder, setPlaceholder] = useState("");
    const internalLocalInputRef = useRef<HTMLInputElement>(null);

    const allLists = useSelector((state: RootState) => state.lists.goalLists);

    const modeTriggers = useRef([
      { prefix: "@", mode: CommandMode.LIST_NAV, icon: "📜", name: "Список" },
      { prefix: ">", mode: CommandMode.COMMAND, icon: "⚙️", name: "Команда" },
    ]).current;

    useEffect(() => {
      let newPlaceholderText = "";
      let icon = "✏️";
      let listDisplayName = "поточного списку";

      if (currentListId) {
        const list = allLists[currentListId];
        if (list) {
          listDisplayName = `списку '${list.name}'`;
        } else {
          listDisplayName = `списку з ID '${currentListId}' (не знайдено)`;
        }
      }

      switch (currentMode) {
        case CommandMode.ADD:
          icon = "➕";
          newPlaceholderText = `Нова ціль для ${listDisplayName}...`;
          break;
        case CommandMode.LIST_NAV:
          icon = "📜";
          newPlaceholderText = "Перейти до списку (ID або назва)...";
          break;
        case CommandMode.COMMAND:
          icon = "⚙️";
          newPlaceholderText = "Введіть команду (> new-list Назва)...";
          break;
        default:
          newPlaceholderText = "Введіть текст...";
      }
      setPlaceholder(`${icon} ${newPlaceholderText}`);
    }, [currentMode, currentListId]);

    useEffect(() => {
      setCurrentMode(defaultMode);
    }, [defaultMode]);

    // localStorage для режиму вводу - це локальна фіча, не пов'язана зі стором
    useEffect(() => {
      localStorage.setItem("inputPanelMode", currentMode);
    }, [currentMode]);

    const internalSwitchToMode = useCallback(
      (newMode: CommandMode, newInputValue = "") => {
        // Не змінюємо режим, якщо він вже такий самий, просто оновлюємо значення
        if (currentMode !== newMode) {
          setCurrentMode(newMode);
        }
        setInputValue(newInputValue);
        if (internalLocalInputRef.current) {
          internalLocalInputRef.current.focus();
        }
      },
      [currentMode],
    );

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          internalLocalInputRef.current?.focus();
        },
        switchToMode: (mode: CommandMode, value = "") => {
          internalSwitchToMode(mode, value); // Вона вже фокусує
          // Додаткове позиціонування курсора після фокусу
          setTimeout(() => {
            if (internalLocalInputRef.current) {
              const len = internalLocalInputRef.current.value.length;
              internalLocalInputRef.current.selectionStart = len;
              internalLocalInputRef.current.selectionEnd = len;
            }
          }, 0);
        },
        get localInputRef() {
          return internalLocalInputRef.current;
        },
      }),
      [internalSwitchToMode],
    );

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;

      if (currentMode === CommandMode.ADD && rawValue.length === 1) {
        // Тільки з режиму ADD можна перейти в інший префіксом
        for (const trigger of modeTriggers) {
          if (rawValue === trigger.prefix) {
            internalSwitchToMode(trigger.mode, "");
            return;
          }
        }
      }
      setInputValue(rawValue);
    };

    const handleSubmit = useCallback(() => {
      const trimmedValue = inputValue.trim();

      if (
        !trimmedValue &&
        (currentMode === CommandMode.LIST_NAV ||
          currentMode === CommandMode.COMMAND)
      ) {
        internalSwitchToMode(CommandMode.ADD, "");
        return;
      }
      // Для ADD, якщо порожньо, нічого не робимо, бо onAddGoal не буде викликаний
      if (!trimmedValue && currentMode === CommandMode.ADD) {
        return;
      }

      switch (currentMode) {
        case CommandMode.ADD:
          if (currentListId && trimmedValue) {
            onAddGoal(currentListId, trimmedValue); // MainPanel викличе goalListStore.createGoalAndAddToList
            setInputValue("");
          } else if (!currentListId && trimmedValue) {
            alert("Спочатку виберіть або відкрийте список для додавання цілі.");
          }
          // Якщо trimmedValue порожній, нічого не робимо (onAddGoal не викликається)
          break;
        case CommandMode.LIST_NAV:
          if (trimmedValue) {
            onNavigateToList(trimmedValue);
          }
          // Завжди повертаємось в ADD після навігації або спроби навігації
          internalSwitchToMode(CommandMode.ADD, "");
          break;
        case CommandMode.COMMAND:
          if (trimmedValue) {
            onExecuteCommand(trimmedValue);
          }
          // Завжди повертаємось в ADD після команди або спроби команди
          internalSwitchToMode(CommandMode.ADD, "");
          break;
        default:
          console.warn("InputPanel handleSubmit: Unknown mode:", currentMode);
      }
    }, [
      inputValue,
      currentMode,
      currentListId,
      onAddGoal,
      onNavigateToList,
      onExecuteCommand,
      internalSwitchToMode,
    ]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === "Escape") {
        if (currentMode !== CommandMode.ADD || inputValue !== "") {
          internalSwitchToMode(CommandMode.ADD, ""); // Якщо не в ADD або є текст, очистити/перемкнути
        } else {
          internalLocalInputRef.current?.blur(); // Якщо вже в ADD і порожньо, просто зняти фокус
        }
      } else if (event.key === "Backspace" && inputValue === "") {
        // Якщо поле порожнє і натиснуто Backspace в режимі LIST_NAV або COMMAND, повернутися в ADD
        if (currentMode !== CommandMode.ADD) {
          internalSwitchToMode(CommandMode.ADD, "");
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
  },
);

export default InputPanel;

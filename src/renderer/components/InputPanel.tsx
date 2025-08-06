// src/renderer/components/InputPanel.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from "react";
import ReactDOM from "react-dom";
// ВИПРАВЛЕНО: Імпортуємо наш типізований хук
import { useAppSelector } from "../store/hooks";
import type { GoalList } from "../types";
import {
  selectAllLists,
  selectAllUniqueTags,
  selectAllUniqueContexts,
} from "../store/selectors";

export enum CommandMode {
  ADD = "add",
  LIST_NAV = "list_nav",
  COMMAND = "command",
  SEARCH = "search", // Додано
}

export interface InputPanelProps {
  currentListId?: string;
  defaultMode?: CommandMode;
  onAddGoal: (listId: string, text: string) => void;
  onSearch: (query: string) => void; // Цей prop буде використовуватися
  onNavigateToList: (listQuery: string) => void;
  onExecuteCommand: (command: string) => void;
}

export interface InputPanelRef {
  focus: () => void;
  switchToMode: (mode: CommandMode, value?: string) => void;
  localInputRef?: HTMLInputElement | null;
}

const AVAILABLE_COMMANDS = [
  "new-list ",
  "delete-list ",
  "set-current-list ",
  "help",
];

const getPortalRoot = (): HTMLElement => {
  let root = document.getElementById("portal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "portal-root";
    root.style.position = "fixed";
    root.style.top = "0";
    root.style.left = "0";
    root.style.width = "0";
    root.style.height = "0";
    root.style.zIndex = "4999";
    document.body.appendChild(root);
  }
  return root;
};

const InputPanel = forwardRef<InputPanelRef, InputPanelProps>(
  (
    {
      currentListId,
      defaultMode = CommandMode.ADD,
      onAddGoal,
      onSearch, // Додано
      onNavigateToList,
      onExecuteCommand,
    },
    ref,
  ) => {
    const [inputValue, setInputValue] = useState("");
    const [currentMode, setCurrentMode] = useState<CommandMode>(defaultMode);
    const [placeholder, setPlaceholder] = useState("");
    const internalLocalInputRef = useRef<HTMLInputElement>(null);
    const portalContainerRef = useRef<HTMLElement | null>(null);

    // ВИПРАВЛЕНО: Використовуємо useAppSelector
    const allGoalListsArray = useAppSelector(selectAllLists);
    const allTags = useAppSelector(selectAllUniqueTags);
    const allContexts = useAppSelector(selectAllUniqueContexts);

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [currentSuggestionPrefix, setCurrentSuggestionPrefix] = useState<
      string | null
    >(null);
    const suggestionsUListRef = useRef<HTMLUListElement>(null);
    const [inputRect, setInputRect] = useState<DOMRect | null>(null);

    const modeTriggers = useRef([
      { prefix: "@", mode: CommandMode.LIST_NAV, icon: "📜", name: "Список" },
      { prefix: ">", mode: CommandMode.COMMAND, icon: "⚙️", name: "Команда" },
      { prefix: "s", mode: CommandMode.SEARCH, icon: "🔍", name: "Пошук" }, // Додано
    ]).current;

    useEffect(() => {
      portalContainerRef.current = getPortalRoot();
    }, []);

    useEffect(() => {
      let newPlaceholderText = "";
      let icon = "✏️";
      let listDisplayName = "поточного списку";
      const currentListEntity = currentListId
        ? allGoalListsArray.find((l) => l.id === currentListId)
        : undefined;
      if (currentListId) {
        if (currentListEntity) {
          listDisplayName = `списку '${currentListEntity.name}'`;
        } else {
          listDisplayName = `списку з ID '${currentListId}' (не знайдено)`;
        }
      }
      switch (currentMode) {
        case CommandMode.ADD:
          icon = "➕";
          newPlaceholderText = `Нова ціль для ${listDisplayName}... ( #tag @context )`;
          break;
        case CommandMode.LIST_NAV:
          icon = "📜";
          newPlaceholderText = "Перейти до списку (почніть вводити назву)...";
          break;
        case CommandMode.COMMAND:
          icon = "⚙️";
          newPlaceholderText = "Введіть команду (> new-list Назва)...";
          break;
        case CommandMode.SEARCH: // Додано
          icon = "🔍";
          newPlaceholderText = "Глобальний пошук по цілях...";
          break;
        default:
          newPlaceholderText = "Введіть текст...";
      }
      setPlaceholder(`${icon} ${newPlaceholderText}`);
    }, [currentMode, currentListId, allGoalListsArray]);

    useEffect(() => {
      setCurrentMode(defaultMode);
    }, [defaultMode]);
    useEffect(() => {
      localStorage.setItem("inputPanelMode", currentMode);
    }, [currentMode]);

    useEffect(() => {
      if (!showSuggestions) {
        const timer = setTimeout(() => {
          if (!showSuggestions) {
            setSuggestions([]);
            setActiveSuggestionIndex(0);
          }
        }, 250);
        return () => clearTimeout(timer);
      }
    }, [showSuggestions]);

    const internalSwitchToMode = useCallback(
      (newMode: CommandMode, newInputValue = "") => {
        if (currentMode !== newMode) {
          setCurrentMode(newMode);
          setShowSuggestions(false);
        }
        setInputValue(newInputValue);
        internalLocalInputRef.current?.focus();
      },
      [currentMode],
    );

    const updateInputRect = useCallback(() => {
      if (internalLocalInputRef.current) {
        setInputRect(internalLocalInputRef.current.getBoundingClientRect());
      }
    }, []);

    useEffect(() => {
      if (showSuggestions) {
        updateInputRect();
        window.addEventListener("resize", updateInputRect);
        document.addEventListener("scroll", updateInputRect, {
          capture: true,
          passive: true,
        });
      }
      return () => {
        window.removeEventListener("resize", updateInputRect);
        document.removeEventListener("scroll", updateInputRect, {
          capture: true,
        });
      };
    }, [showSuggestions, updateInputRect]);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      setInputValue(rawValue);

      if (currentMode === CommandMode.ADD && rawValue.length === 1) {
        for (const trigger of modeTriggers) {
          if (rawValue === trigger.prefix) {
            internalSwitchToMode(trigger.mode, "");
            return;
          }
        }
      }

      let query = "";
      let source: string[] = [];
      let prefixForFilter = "";

      if (
        currentMode === CommandMode.LIST_NAV ||
        currentMode === CommandMode.SEARCH
      ) { // Додано SEARCH
        query = rawValue;
        source =
          currentMode === CommandMode.LIST_NAV
            ? allGoalListsArray.map((list) => list.name)
            : []; // Для пошуку підказки не потрібні
      } else if (currentMode === CommandMode.COMMAND) {
        query = rawValue;
        source = AVAILABLE_COMMANDS;
      } else if (currentMode === CommandMode.ADD) {
        const cursorPos = event.target.selectionStart || 0;
        const textBeforeCursor = rawValue.substring(0, cursorPos);
        const lastHashIndex = textBeforeCursor.lastIndexOf("#");
        const lastAtIndex = textBeforeCursor.lastIndexOf("@");
        let activePrefixChar: string | null = null;
        let activePrefixIndex = -1;

        if (
          lastHashIndex !== -1 &&
          (lastHashIndex === 0 ||
            /\s/.test(textBeforeCursor[lastHashIndex - 1]))
        ) {
          const potentialTagQuery = textBeforeCursor.substring(
            lastHashIndex + 1,
          );
          if (
            !potentialTagQuery.includes("@") ||
            potentialTagQuery.lastIndexOf("@") <
              potentialTagQuery.lastIndexOf("#")
          ) {
            if (lastHashIndex > lastAtIndex || lastAtIndex === -1) {
              activePrefixChar = "#";
              activePrefixIndex = lastHashIndex;
            }
          }
        }
        if (
          !activePrefixChar &&
          lastAtIndex !== -1 &&
          (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))
        ) {
          const potentialContextQuery = textBeforeCursor.substring(
            lastAtIndex + 1,
          );
          if (
            !potentialContextQuery.includes("#") ||
            potentialContextQuery.lastIndexOf("#") <
              potentialContextQuery.lastIndexOf("@")
          ) {
            activePrefixChar = "@";
            activePrefixIndex = lastAtIndex;
          }
        }
        if (activePrefixChar && activePrefixIndex !== -1) {
          query = textBeforeCursor.substring(activePrefixIndex + 1);
          if (!/\s/.test(query)) {
            source = activePrefixChar === "#" ? allTags : allContexts;
            prefixForFilter = activePrefixChar;
            setCurrentSuggestionPrefix(activePrefixChar);
          } else {
            setShowSuggestions(false);
            return;
          }
        } else {
          setShowSuggestions(false);
          return;
        }
      }

      const shouldAttemptSuggestions =
        source.length > 0 &&
        ((currentMode === CommandMode.LIST_NAV && query.length > 0) ||
          (currentMode === CommandMode.COMMAND && query.length > 0) ||
          (currentMode === CommandMode.ADD &&
            prefixForFilter &&
            query.length >= 0));

      if (shouldAttemptSuggestions) {
        const filterQuery = (prefixForFilter + query).toLowerCase();
        const finalFilteredSuggestions = source
          .map((item) =>
            prefixForFilter &&
            (prefixForFilter === "#" || prefixForFilter === "@")
              ? item.startsWith(prefixForFilter)
                ? item
                : prefixForFilter + item
              : item,
          )
          .filter((item) => item.toLowerCase().startsWith(filterQuery))
          .filter((value, index, self) => self.indexOf(value) === index);

        if (finalFilteredSuggestions.length > 0) {
          setSuggestions(finalFilteredSuggestions);
          setShowSuggestions(true);
          setActiveSuggestionIndex(0);
        } else {
          setShowSuggestions(false);
        }
      } else {
        setShowSuggestions(false);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        focus: () => internalLocalInputRef.current?.focus(),
        switchToMode: (mode, value = "") => internalSwitchToMode(mode, value),
        get localInputRef() {
          return internalLocalInputRef.current;
        },
      }),
      [internalSwitchToMode],
    );

    const applySuggestion = (suggestionValue: string) => {
      if (
        currentMode === CommandMode.LIST_NAV ||
        currentMode === CommandMode.COMMAND
      ) {
        setInputValue(suggestionValue);
      } else if (currentMode === CommandMode.ADD && currentSuggestionPrefix) {
        const cursorPos = internalLocalInputRef.current?.selectionStart || 0;
        const textBeforeCursor = inputValue.substring(0, cursorPos);
        const lastPrefixIndex = textBeforeCursor.lastIndexOf(
          currentSuggestionPrefix,
        );
        if (lastPrefixIndex !== -1) {
          const newValue =
            inputValue.substring(0, lastPrefixIndex) +
            suggestionValue +
            " " +
            inputValue.substring(cursorPos);
          setInputValue(newValue);
          setTimeout(() => {
            if (internalLocalInputRef.current) {
              const newCursorPos = lastPrefixIndex + suggestionValue.length + 1;
              internalLocalInputRef.current.setSelectionRange(
                newCursorPos,
                newCursorPos,
              );
            }
          }, 0);
        }
      }
      setShowSuggestions(false);
      internalLocalInputRef.current?.focus();
    };

    const handleSubmit = useCallback(() => {
      const trimmedValue = inputValue.trim();
      setShowSuggestions(false);
      if (
        !trimmedValue &&
        (currentMode === CommandMode.LIST_NAV ||
          currentMode === CommandMode.COMMAND ||
          currentMode === CommandMode.SEARCH)
      ) {
        internalSwitchToMode(CommandMode.ADD, "");
        return;
      }
      if (!trimmedValue && currentMode === CommandMode.ADD) {
        return;
      }
      switch (currentMode) {
        case CommandMode.ADD:
          if (currentListId && trimmedValue) {
            onAddGoal(currentListId, trimmedValue);
            setInputValue("");
          } else if (!currentListId && trimmedValue) {
            alert("Спочатку виберіть або відкрийте список для додавання цілі.");
          }
          break;
        case CommandMode.LIST_NAV:
          if (trimmedValue) {
            onNavigateToList(trimmedValue);
          }
          internalSwitchToMode(CommandMode.ADD, "");
          break;
        case CommandMode.COMMAND:
          if (trimmedValue) {
            onExecuteCommand(trimmedValue);
          }
          internalSwitchToMode(CommandMode.ADD, "");
          break;
        case CommandMode.SEARCH: // Додано
          if (trimmedValue) {
            onSearch(trimmedValue);
          }
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
      onSearch, // Додано
      onNavigateToList,
      onExecuteCommand,
      internalSwitchToMode,
    ]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (showSuggestions && suggestions.length > 0) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveSuggestionIndex((prevIndex) =>
            prevIndex === suggestions.length - 1 ? 0 : prevIndex + 1,
          );
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveSuggestionIndex((prevIndex) =>
            prevIndex === 0 ? suggestions.length - 1 : prevIndex - 1,
          );
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (suggestions[activeSuggestionIndex]) {
            applySuggestion(suggestions[activeSuggestionIndex]);
          } else {
            handleSubmit();
          }
        } else if (event.key === "Escape") {
          event.preventDefault();
          setShowSuggestions(false);
        } else if (event.key === "Tab" && suggestions[activeSuggestionIndex]) {
          event.preventDefault();
          applySuggestion(suggestions[activeSuggestionIndex]);
        }
      } else {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          handleSubmit();
        } else if (event.key === "Escape") {
          if (currentMode !== CommandMode.ADD || inputValue !== "") {
            internalSwitchToMode(CommandMode.ADD, "");
          } else {
            internalLocalInputRef.current?.blur();
          }
        } else if (event.key === "Backspace" && inputValue === "") {
          if (currentMode !== CommandMode.ADD) {
            internalSwitchToMode(CommandMode.ADD, "");
          }
        }
      }
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          (!internalLocalInputRef.current ||
            !internalLocalInputRef.current.contains(target)) &&
          (!suggestionsUListRef.current ||
            !suggestionsUListRef.current.contains(target))
        ) {
          setShowSuggestions(false);
        }
      };
      if (showSuggestions) {
        document.addEventListener("mousedown", handleClickOutside);
      } else {
        document.removeEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [showSuggestions]);

    useEffect(() => {
      if (
        showSuggestions &&
        suggestions.length > 0 &&
        suggestionsUListRef.current
      ) {
        const activeItem = suggestionsUListRef.current.children[
          activeSuggestionIndex
        ] as HTMLLIElement;
        if (activeItem) {
          activeItem.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
      }
    }, [activeSuggestionIndex, showSuggestions, suggestions.length]);

    const suggestionsPortalStyles = useMemo((): React.CSSProperties => {
      if (!inputRect) {
        return { display: "none" };
      }
      return {
        position: "fixed",
        width: `${inputRect.width}px`,
        left: `${inputRect.left}px`,
        bottom: `${window.innerHeight - inputRect.top + 4}px`,
        maxHeight: "15rem",
        zIndex: 5000,
      };
    }, [inputRect]);

    const SuggestionsListComponent = () => (
      <ul
        ref={suggestionsUListRef}
        className={`
            w-full
            max-h-60
            overflow-y-auto
            bg-white dark:bg-slate-700
            border border-slate-300 dark:border-slate-600
            rounded-md shadow-xl
            list-none p-0
            transition-all duration-200 ease-out
            transform origin-bottom
            ${
              showSuggestions && suggestions.length > 0
                ? "opacity-100 scale-y-100 pointer-events-auto"
                : "opacity-0 scale-y-95 pointer-events-none"
            }
          `}
        style={suggestionsPortalStyles}
      >
        {suggestions.map(
          (
            suggestionItem,
            index,
          ) => (
            <li
              key={`${suggestionItem}-${index}`}
              className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-600
                          ${index === activeSuggestionIndex ? "bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-indigo-100" : "text-slate-700 dark:text-slate-200"}`}
              onClick={() => applySuggestion(suggestionItem)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestionItem}
            </li>
          ),
        )}
      </ul>
    );

    return (
      <div className="w-full relative px-2 py-1.5 md:px-4 md:py-2">
        <input
          ref={internalLocalInputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={updateInputRect}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
          aria-label="Командний рядок"
          autoComplete="off"
        />
        {portalContainerRef.current &&
          showSuggestions &&
          suggestions.length > 0 &&
          ReactDOM.createPortal(
            <SuggestionsListComponent />,
            portalContainerRef.current,
          )}
      </div>
    );
  },
);

export default InputPanel;
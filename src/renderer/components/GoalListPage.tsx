// src/renderer/components/GoalListPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import {
  makeSelectListInfo,
  makeSelectEnrichedGoalInstances,
  selectAllUniqueTags,
  selectAllUniqueContexts,
} from "../store/selectors";
import {
  goalToggled,
  instanceRemovedFromList,
  goalUpdated,
} from "../store/listsSlice";
import type { Goal, GoalInstance, GoalList } from "../types";
import { SearchX, ListChecks } from "lucide-react";
import SortableGoalItem from "./SortableGoalItem";

interface GoalListPageProps {
  listId: string;
  filterText: string;
  obsidianVaultName: string;
  onTagClickForFilter?: (filterTerm: string) => void;
}

function GoalListPage({
  listId,
  filterText,
  obsidianVaultName,
  onTagClickForFilter,
}: GoalListPageProps) {
  const dispatch = useDispatch<AppDispatch>();

  const selectListInfo = useMemo(makeSelectListInfo, []);
  const selectEnrichedInstances = useMemo(makeSelectEnrichedGoalInstances, []);

  const listInfo = useSelector((state: RootState) =>
    selectListInfo(state, listId),
  );
  const allEnrichedGoals = useSelector((state: RootState) =>
    selectEnrichedInstances(state, listId),
  );

  const allTags = useSelector(selectAllUniqueTags);
  const allContexts = useSelector(selectAllUniqueContexts);

  const [activeFilteredGoals, setActiveFilteredGoals] = useState<
    Array<{
      instance: GoalInstance;
      goal: Goal;
      associatedLists: GoalList[];
    }>
  >([]);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editingGoalText, setEditingGoalText] = useState("");
  const editGoalInputRef = useRef<HTMLTextAreaElement>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [suggestionType, setSuggestionType] = useState<"#" | "@" | null>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);
  const [isSuggestionsUiVisible, setIsSuggestionsUiVisible] = useState(false);

  useEffect(() => {
    if (!filterText.trim()) {
      setActiveFilteredGoals(allEnrichedGoals);
    } else {
      const lowercasedFilter = filterText.toLowerCase();
      setActiveFilteredGoals(
        allEnrichedGoals.filter(({ goal }) =>
          goal.text.toLowerCase().includes(lowercasedFilter),
        ),
      );
    }
  }, [allEnrichedGoals, filterText]);

  useEffect(() => {
    if (editingGoal && editGoalInputRef.current) {
      editGoalInputRef.current.focus();
      const textLength = editGoalInputRef.current.value.length;
      editGoalInputRef.current.setSelectionRange(textLength, textLength);
    }
  }, [editingGoal]);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (showSuggestions && suggestions.length > 0) {
      setIsSuggestionsUiVisible(true);
    } else {
      timerId = setTimeout(() => {
        if (!showSuggestions) {
          setSuggestions([]);
        }
      }, 200);
    }
    return () => clearTimeout(timerId);
  }, [showSuggestions, suggestions.length]);

  const handleToggleGoal = useCallback(
    (goalId: string) => {
      dispatch(goalToggled(goalId));
    },
    [dispatch],
  );

  const handleDeleteGoal = useCallback(
    (instanceId: string) => {
      const goalInstanceToDelete = allEnrichedGoals.find(
        ({ instance }: { instance: GoalInstance }) => instance.id === instanceId,
      );
      if (
        goalInstanceToDelete &&
        window.confirm(
          `Видалити ціль "${goalInstanceToDelete.goal.text}" зі списку?`,
        )
      ) {
        dispatch(instanceRemovedFromList({ listId, instanceId }));
        if (editingGoal?.id === goalInstanceToDelete.goal.id) {
          setEditingGoal(null);
          setEditingGoalText("");
          setShowSuggestions(false);
        }
      }
    },
    [listId, allEnrichedGoals, editingGoal, dispatch],
  );

  const handleStartEditGoal = useCallback((goal: Goal) => {
    if (goal.completed) return;
    setEditingGoal(goal);
    setEditingGoalText(goal.text);
    setShowSuggestions(false);
  }, []);

  const handleCancelEditGoal = useCallback(() => {
    setEditingGoal(null);
    setEditingGoalText("");
    setShowSuggestions(false);
  }, []);

  const handleSubmitEditGoal = useCallback(() => {
    if (!editingGoal) return;
    if (!editingGoalText.trim()) {
      alert("Текст цілі не може бути порожнім.");
      editGoalInputRef.current?.focus();
      return;
    }
    dispatch(goalUpdated({ id: editingGoal.id, text: editingGoalText.trim() }));
    setEditingGoal(null);
    setEditingGoalText("");
    setShowSuggestions(false);
  }, [dispatch, editingGoal, editingGoalText]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditingGoalText(newText);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newText.substring(0, cursorPos);
    const lastTagIndex = textBeforeCursor.lastIndexOf("#");
    const lastContextIndex = textBeforeCursor.lastIndexOf("@");
    let activePrefixIndex = -1;
    let currentPrefix: "#" | "@" | null = null;
    if (lastTagIndex > lastContextIndex) {
      activePrefixIndex = lastTagIndex;
      currentPrefix = "#";
    } else if (lastContextIndex > lastTagIndex) {
      activePrefixIndex = lastContextIndex;
      currentPrefix = "@";
    }
    if (
      currentPrefix &&
      activePrefixIndex !== -1 &&
      (activePrefixIndex === 0 || /\s/.test(newText[activePrefixIndex - 1]))
    ) {
      const query = textBeforeCursor.substring(activePrefixIndex + 1);
      if (!/\s/.test(query)) {
        setSuggestionType(currentPrefix);
        const source = currentPrefix === "#" ? allTags : allContexts;
        const filteredSuggestions = source.filter((item) =>
          item.toLowerCase().startsWith((currentPrefix + query).toLowerCase()),
        );
        if (filteredSuggestions.length > 0) {
          setSuggestions(filteredSuggestions);
          setShowSuggestions(true);
          setActiveSuggestionIndex(0);
        } else {
          setShowSuggestions(false);
        }
        return;
      }
    }
    setShowSuggestions(false);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) =>
          prevIndex === suggestions.length - 1 ? 0 : prevIndex + 1,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex((prevIndex) =>
          prevIndex === 0 ? suggestions.length - 1 : prevIndex - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedSuggestion = suggestions[activeSuggestionIndex];
        if (selectedSuggestion) {
          const cursorPos = editGoalInputRef.current?.selectionStart ?? 0;
          const textBeforeCursor = editingGoalText.substring(0, cursorPos);
          let startIndex = -1;
          if (suggestionType === "#") {
            startIndex = textBeforeCursor.lastIndexOf("#");
          } else if (suggestionType === "@") {
            startIndex = textBeforeCursor.lastIndexOf("@");
          }
          if (startIndex !== -1) {
            const newText =
              editingGoalText.substring(0, startIndex) +
              selectedSuggestion +
              " " +
              editingGoalText.substring(cursorPos);
            setEditingGoalText(newText);
            setTimeout(() => {
              const newCursorPos = startIndex + selectedSuggestion.length + 1;
              editGoalInputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
          }
        }
        setShowSuggestions(false);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
      }
    } else {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmitEditGoal();
      }
      if (e.key === "Escape") {
        if (!showSuggestions) {
          handleCancelEditGoal();
        } else {
          setShowSuggestions(false);
        }
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        editGoalInputRef.current &&
        !editGoalInputRef.current.contains(event.target as Node)
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
    if (showSuggestions && suggestions.length > 0 && suggestionsRef.current) {
      const activeItem = suggestionsRef.current.children[activeSuggestionIndex] as HTMLLIElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
  }, [activeSuggestionIndex, showSuggestions, suggestions.length]);

  const suggestionsListDynamicStyles = useMemo((): React.CSSProperties => {
    if (editGoalInputRef.current) {
      const { offsetTop, offsetHeight, offsetLeft, offsetWidth } = editGoalInputRef.current;
      return {
        top: `${offsetTop + offsetHeight + 2}px`,
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
      };
    }
    return { display: "none" };
  }, [isSuggestionsUiVisible]);

  if (!listInfo) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full text-center">
        <ListChecks size={48} className="text-slate-400 dark:text-slate-500 mb-4" strokeWidth={1.5} />
        <p className="text-slate-500 dark:text-slate-400 text-lg">Завантаження даних списку...</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">ID: {listId}</p>
      </div>
    );
  }

  return (
    <div className="pt-3 pl-1.5 pr-4 pb-4 min-h-full flex flex-col">
      {editingGoal && (
        <div className="mb-3 p-3 border border-blue-400 dark:border-blue-600 rounded-lg bg-white dark:bg-slate-700 shadow-md flex-shrink-0 relative">
          <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1.5">Редагувати ціль</h3>
          <textarea
            ref={editGoalInputRef}
            value={editingGoalText}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500 sm:text-sm mb-2 min-h-[50px]"
            rows={3}
          />
          {
            <ul
              ref={suggestionsRef}
              className={`absolute z-10 max-h-40 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg list-none p-0 transition-all duration-200 ease-out transform origin-top ${isSuggestionsUiVisible && suggestions.length > 0 ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"}`}
              style={suggestionsListDynamicStyles}
            >
              {isSuggestionsUiVisible &&
                suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion}
                    className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-700 ${index === activeSuggestionIndex ? "bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-200" : "text-slate-700 dark:text-slate-200"}`}
                    onClick={() => {
                      const cursorPos = editGoalInputRef.current?.selectionStart ?? 0;
                      const textBeforeCursor = editingGoalText.substring(0, cursorPos);
                      let startIndex = -1;
                      if (suggestionType === "#") {
                        startIndex = textBeforeCursor.lastIndexOf("#");
                      } else if (suggestionType === "@") {
                        startIndex = textBeforeCursor.lastIndexOf("@");
                      }
                      if (startIndex !== -1) {
                        const newText =
                          editingGoalText.substring(0, startIndex) +
                          suggestion +
                          " " +
                          editingGoalText.substring(cursorPos);
                        setEditingGoalText(newText);
                        setTimeout(() => {
                          const newCursorPos = startIndex + suggestion.length + 1;
                          editGoalInputRef.current?.focus();
                          editGoalInputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
                        }, 0);
                      }
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </li>
                ))}
            </ul>
          }
          <div className="flex justify-end space-x-1.5">
            <button
              onClick={handleCancelEditGoal}
              className="px-3 py-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-500 hover:bg-slate-300 dark:hover:bg-slate-400 rounded-md font-medium"
            >
              Скасувати
            </button>
            <button
              onClick={handleSubmitEditGoal}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md font-medium"
            >
              Зберегти
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow pr-1 overflow-y-auto">
        {activeFilteredGoals.length === 0 && !editingGoal && (
          <div className="text-center py-8 px-2 flex flex-col items-center justify-center h-full">
            <SearchX size={40} className="text-slate-400 dark:text-slate-500 mb-3" strokeWidth={1.5} />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {filterText.trim()
                ? `Цілей за фільтром "${filterText}" не знайдено у списку "${listInfo.name}".`
                : `У списку "${listInfo.name}" ще немає цілей.`}
            </p>
            {!filterText.trim() && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Додайте першу ціль, використовуючи командний рядок внизу екрана.
              </p>
            )}
          </div>
        )}
        {activeFilteredGoals.length > 0 && (
          <ul className="space-y-1.5">
            {activeFilteredGoals.map(({ instance, goal, associatedLists }, itemIndex) => (
              <SortableGoalItem
                key={instance.id}
                instanceId={instance.id}
                goal={goal}
                associatedLists={associatedLists}
                index={itemIndex}
                onToggle={handleToggleGoal}
                onDelete={handleDeleteGoal}
                onStartEdit={handleStartEditGoal}
                obsidianVaultName={obsidianVaultName}
                onTagClickForFilter={onTagClickForFilter}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default React.memo(GoalListPage);
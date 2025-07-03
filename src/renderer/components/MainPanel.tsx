// src/renderer/components/MainPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store";
import type { Goal, GoalList } from "../types";
import GoalListPage from "./GoalListPage";
import NoListSelected from "./NoListSelected";
import InputPanel, { CommandMode, InputPanelRef } from "./InputPanel";
import TabsContainer from "./TabsContainer";
import SettingsPage from "./SettingsPage";
import LogContent, { LogMessage } from "./LogContent";
import {
  OPEN_GOAL_LIST_EVENT,
  OpenGoalListDetail,
  dispatchOpenGoalListEvent,
} from "./Sidebar";
import { OPEN_SETTINGS_EVENT, SIDEBAR_REFRESH_LISTS_EVENT } from "../events";

import GlobalSearchResults from "./GlobalSearchResults";
import { setGlobalFilterTerm } from "../store/uiSlice";

import ListToolbar from "./ListToolbar";
import {
  formatGoalsForExport,
  parseImportedText,
  parseGoalData,
} from "../utils/textProcessing";
import { Droppable } from "@hello-pangea/dnd";
import {
  listRemoved,
  listUpdated,
  goalAdded,
  listAdded,
  goalOrderUpdated,
  goalsImported,
} from "../store/listsSlice";

export interface MainPanelProps {
  currentThemePreference: string;
  onChangeThemePreference: (newTheme: string) => void;
  obsidianVaultPath: string;
  onObsidianVaultChange: (newPath: string) => void;
}

export interface Tab {
  id: string;
  type: "goal-list" | "settings" | "log";
  title: string;
  isClosable?: boolean;
  listId?: string;
}

const initialLogs: LogMessage[] = [
  { id: "log-init-1", text: "Додаток запущено.", time: new Date().toLocaleTimeString() },
];

const MY_APP_PROTOCOL = "forwardapp";

function MainPanel({
  currentThemePreference,
  onChangeThemePreference,
  obsidianVaultPath,
  onObsidianVaultChange,
}: MainPanelProps) {
  const { goals, goalLists, goalInstances } = useSelector((state: RootState) => state.lists);
  const globalFilterTerm = useSelector((state: RootState) => state.ui.globalFilterTerm);
  const dispatch = useDispatch<AppDispatch>();
  const inputPanelGlobalRef = useRef<InputPanelRef>(null);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const savedTabs = localStorage.getItem("openTabs");
    if (savedTabs) {
      try { return JSON.parse(savedTabs); } catch { return []; }
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveTabId = localStorage.getItem("activeTabId");
    const savedTabsRaw = localStorage.getItem("openTabs");
    if (savedActiveTabId) return savedActiveTabId;
    if (savedTabsRaw) {
      try {
        const savedTabs = JSON.parse(savedTabsRaw) as Tab[];
        if (savedTabs.length > 0) return savedTabs[0].id;
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    const validListIds = new Set(Object.keys(goalLists));
    const validatedTabs = tabs.filter(
      (tab) => tab.type !== "goal-list" || (tab.listId && validListIds.has(tab.listId))
    );
    if (validatedTabs.length !== tabs.length) {
      setTabs(validatedTabs);
      if (activeTabId && !validatedTabs.find((t) => t.id === activeTabId)) {
        setActiveTabId(validatedTabs.length > 0 ? validatedTabs[0].id : null);
      }
    }
  }, [goalLists, tabs, activeTabId]);

  const [editingList, setEditingList] = useState<GoalList | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");
  const [logMessages, setLogMessages] = useState<LogMessage[]>(initialLogs);
  const editingListModalRef = useRef<HTMLDivElement>(null);
  const [showImportArea, setShowImportArea] = useState(false);
  const [importText, setImportText] = useState("");
  const [showExportArea, setShowExportArea] = useState(false);
  const [exportText, setExportText] = useState("");
  const [listForImportExport, setListForImportExport] = useState<string | null>(null);
  const importTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const exportTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const refreshListsAndTabs = useCallback(() => {
    setTabs((prevTabs) => {
      const updatedGoalListsFromStore = Object.values(goalLists);
      const newTabs = prevTabs.map((tab) => {
        if (tab.type === "goal-list" && tab.listId) {
          const correspondingList = updatedGoalListsFromStore.find((l: GoalList) => l.id === tab.listId);
          if (correspondingList) {
            if (tab.title !== correspondingList.name) return { ...tab, title: correspondingList.name };
            return tab;
          }
          return null;
        }
        return tab;
      }).filter(Boolean) as Tab[];
      setActiveTabId((currentActiveTabId) => {
        if (currentActiveTabId && !newTabs.find((t) => t.id === currentActiveTabId)) {
          return newTabs.length > 0 ? newTabs[0].id : null;
        } else if (newTabs.length === 0 && currentActiveTabId) {
          return null;
        } else if (!currentActiveTabId && newTabs.length > 0) {
          return newTabs[0].id;
        }
        return currentActiveTabId;
      });
      return newTabs;
    });
  }, [goalLists]);

  const handleDataImported = useCallback(() => {
    refreshListsAndTabs();
    window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
    setTabs((prevTabs) => {
      const filteredTabs = prevTabs.filter((tab) => tab.type === "settings" || tab.type === "log");
      setActiveTabId(() => {
        const settingsTab = filteredTabs.find((tab) => tab.type === "settings");
        if (settingsTab) return settingsTab.id;
        const logTab = filteredTabs.find((tab) => tab.type === "log");
        return logTab ? logTab.id : null;
      });
      return filteredTabs;
    });
    alert("Дані оновлено після імпорту. Відкрийте потрібні списки з бічної панелі.");
  }, [refreshListsAndTabs]);

  const getActiveListIdFromTab = useCallback((): string | null => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    return activeTab?.type === "goal-list" ? activeTab.listId || null : null;
  }, [tabs, activeTabId]);

  const currentActiveListId = getActiveListIdFromTab();

  useEffect(() => {
    localStorage.setItem("openTabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) localStorage.setItem("activeTabId", activeTabId);
    else localStorage.removeItem("activeTabId");
  }, [activeTabId]);

  const handleOpenGoalListEventCallback = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<OpenGoalListDetail>;
    const { listId, listName } = customEvent.detail;
    if (!listId || !listName) return;
    const tabIdForGoalList = `goal-list-${listId}`;
    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((tab) => tab.id === tabIdForGoalList);
      if (existingTab) {
        if (existingTab.title !== listName) {
          const updatedTabs = prevTabs.map((t) => (t.id === tabIdForGoalList ? { ...t, title: listName } : t));
          setActiveTabId(tabIdForGoalList);
          return updatedTabs;
        }
        setActiveTabId(tabIdForGoalList);
        return prevTabs;
      } else {
        const newTab: Tab = { id: tabIdForGoalList, title: listName, type: "goal-list", listId: listId, isClosable: true };
        const newTabsArray = [...prevTabs, newTab];
        setActiveTabId(tabIdForGoalList);
        return newTabsArray;
      }
    });
    dispatch(setGlobalFilterTerm(""));
  }, [dispatch]);

  const handleOpenSettingsEventCallback = useCallback(() => {
    const settingsTabId = "settings-tab";
    setTabs((prevTabs) => {
      const existingSettingsTab = prevTabs.find((tab) => tab.id === settingsTabId);
      if (existingSettingsTab) {
        setActiveTabId(settingsTabId);
        return prevTabs;
      } else {
        const newSettingsTab: Tab = { id: settingsTabId, title: "Налаштування", type: "settings", isClosable: true };
        setActiveTabId(settingsTabId);
        return [...prevTabs, newSettingsTab];
      }
    });
  }, []);

  useEffect(() => {
    const handleSidebarRefreshEvent = () => refreshListsAndTabs();
    const handleAppDataImportedEvent = () => handleDataImported();
    window.addEventListener(OPEN_GOAL_LIST_EVENT, handleOpenGoalListEventCallback as EventListener);
    window.addEventListener(OPEN_SETTINGS_EVENT, handleOpenSettingsEventCallback as EventListener);
    window.addEventListener(SIDEBAR_REFRESH_LISTS_EVENT, handleSidebarRefreshEvent);
    window.addEventListener("app-data-imported", handleAppDataImportedEvent as EventListener);
    return () => {
      window.removeEventListener(OPEN_GOAL_LIST_EVENT, handleOpenGoalListEventCallback as EventListener);
      window.removeEventListener(OPEN_SETTINGS_EVENT, handleOpenSettingsEventCallback as EventListener);
      window.removeEventListener(SIDEBAR_REFRESH_LISTS_EVENT, handleSidebarRefreshEvent);
      window.removeEventListener("app-data-imported", handleAppDataImportedEvent as EventListener);
    };
  }, [handleOpenGoalListEventCallback, handleOpenSettingsEventCallback, refreshListsAndTabs, handleDataImported]);

  const handleGlobalFilterChange = useCallback((query: string) => {
    dispatch(setGlobalFilterTerm(query));
  }, [dispatch]);

  const handleTagClickFromGoalRenderer = useCallback((tagFilterTerm: string) => {
    dispatch(setGlobalFilterTerm(tagFilterTerm));
    document.querySelector<HTMLInputElement>('.h-10 input[type="text"][placeholder="Фільтрувати цілі..."]')?.focus();
  }, [dispatch]);

  const handleTabClick = useCallback((tabId: string) => {
    if (activeTabId !== tabId) {
      setActiveTabId(tabId);
      const clickedTab = tabs.find((t) => t.id === tabId);
      if (clickedTab?.type === "goal-list") {
        dispatch(setGlobalFilterTerm(""));
      }
    }
  }, [tabs, activeTabId, dispatch]);

  const handleTabClose = useCallback((tabIdToClose: string) => {
    setTabs((prevTabs) => {
      const indexToClose = prevTabs.findIndex((tab) => tab.id === tabIdToClose);
      if (indexToClose === -1) return prevTabs;
      const newTabs = prevTabs.filter((tab) => tab.id !== tabIdToClose);
      if (activeTabId === tabIdToClose) {
        if (newTabs.length > 0) {
          const newActiveIndex = Math.max(0, indexToClose - 1);
          setActiveTabId(newTabs[newActiveIndex < newTabs.length ? newActiveIndex : 0].id);
        } else {
          setActiveTabId(null);
        }
      }
      return newTabs;
    });
  }, [activeTabId]);

  const handleDeleteList = useCallback((listId: string) => {
    const listToDelete = goalLists[listId];
    if (listToDelete && window.confirm(`Видалити список "${listToDelete.name}"?`)) {
      dispatch(listRemoved(listId));
    }
  }, [goalLists, dispatch]);

  const handleStartEditList = useCallback((list: GoalList) => {
    setEditingList(list);
    setEditingListName(list.name);
    setEditingListDescription(list.description || "");
  }, []);

  const handleCancelEditList = useCallback(() => {
    setEditingList(null);
    setEditingListName("");
    setEditingListDescription("");
  }, []);

  const handleSubmitEditList = useCallback(() => {
    if (editingList && editingListName.trim()) {
      dispatch(listUpdated({ id: editingList.id, name: editingListName.trim(), description: editingListDescription.trim() }));
      handleCancelEditList();
    } else if (editingList && !editingListName.trim()) {
      alert("Назва списку не може бути порожньою.");
    }
  }, [editingList, editingListName, editingListDescription, dispatch, handleCancelEditList]);

  const handleAddGoalToCurrentList = useCallback((listId: string, text: string) => {
    if (!listId) {
      alert("Будь ласка, спочатку виберіть або відкрийте список.");
      return;
    }
    dispatch(goalAdded({ listId, text }));
  }, [dispatch]);

  const handleSearchGoals = useCallback((query: string) => {
    handleGlobalFilterChange(query);
  }, [handleGlobalFilterChange]);

  const handleNavigateToListByIdOrName = useCallback((listQuery: string) => {
    const allLists = Object.values(goalLists);
    const lowerQuery = listQuery.toLowerCase().trim();
    const foundList = allLists.find((l: GoalList) => l.id === lowerQuery || l.name.toLowerCase() === lowerQuery);
    if (foundList) {
      dispatchOpenGoalListEvent(foundList.id, foundList.name);
    } else {
      alert(`Список "${listQuery}" не знайдено.`);
    }
  }, [goalLists]);

  const handleExecuteAppCommand = useCallback((commandWithArgs: string) => {
    const [command, ...args] = commandWithArgs.trim().split(/\s+/);
    const argString = args.join(" ").trim();
    switch (command.toLowerCase()) {
      case "create-list":
      case "new-list":
        if (argString) {
          dispatch(listAdded({ name: argString }));
          alert(`Список "${argString}" створено.`);
        } else {
          alert("Вкажіть назву списку: > create-list Назва");
        }
        break;
      // other cases
    }
  }, [dispatch, tabs, currentActiveListId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingList && editingListModalRef.current && !editingListModalRef.current.contains(event.target as Node)) {
        handleCancelEditList();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingList, handleCancelEditList]);

  const renderActiveTabContent = () => {
    if (!activeTabId && tabs.length > 0) setActiveTabId(tabs[0].id);
    const activeTabData = tabs.find((tab) => tab.id === activeTabId);
    if (!activeTabData) return <NoListSelected onCreateList={() => {}} onSelectList={() => {}} />;

    switch (activeTabData.type) {
      case "goal-list":
        // --- FIX: Create a new constant for listId and use the type guard on it ---
        const listId = activeTabData.listId;
        if (!listId || !goalLists[listId]) {
          return <div className="p-4 text-slate-600 dark:text-slate-400">Список видалено або не існує.</div>;
        }
        // After the guard, TypeScript knows `listId` is a string.
        return (
          <Droppable droppableId={listId} type="GOAL">
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className={`h-full ${snapshot.isDraggingOver ? "bg-green-50 dark:bg-green-900/30" : ""}`}>
                <GoalListPage
                  key={listId}
                  listId={listId}
                  filterText={globalFilterTerm || ''}
                  obsidianVaultName={obsidianVaultPath}
                  onTagClickForFilter={handleTagClickFromGoalRenderer}
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        );
      case "settings":
        return <SettingsPage currentTheme={currentThemePreference} onChangeTheme={onChangeThemePreference} initialObsidianVault={obsidianVaultPath} onObsidianVaultChange={onObsidianVaultChange} onDataImported={handleDataImported} />;
      case "log":
        return <LogContent messages={logMessages} />;
      default:
        return <div className="p-4">Невідомий тип вкладки.</div>;
    }
  };

  const activeTabInfo = tabs.find((tab) => tab.id === activeTabId);
  const isCurrentTabAGoalList = activeTabInfo?.type === "goal-list";
  const listIdForToolbar = isCurrentTabAGoalList ? activeTabInfo?.listId || null : null;

  const handleOpenListSettings = useCallback((listId: string) => {
    const listToEdit = goalLists[listId];
    if (listToEdit) handleStartEditList(listToEdit);
  }, [goalLists, handleStartEditList]);

  const handleOpenImportArea = useCallback((listId: string) => {
    setListForImportExport(listId);
    setShowExportArea(false);
    setShowImportArea(true);
    setTimeout(() => importTextAreaRef.current?.focus(), 0);
  }, []);

  const handleOpenExportArea = useCallback((listId: string) => {
    const list = goalLists[listId];
    const goalsToExport = list ? (list.itemInstanceIds.map((id) => goals[goalInstances[id]?.goalId]).filter(Boolean) as Goal[]) : [];
    if (goalsToExport.length > 0) {
      setListForImportExport(listId);
      setExportText(formatGoalsForExport(goalsToExport));
      setShowExportArea(true);
      setTimeout(() => exportTextAreaRef.current?.select(), 0);
    }
  }, [goals, goalLists, goalInstances]);

  const handleCancelImportExport = () => {
    setShowImportArea(false);
    setShowExportArea(false);
    setImportText("");
    setExportText("");
    setListForImportExport(null);
  };

  const handleSubmitImport = useCallback(() => {
    if (!listForImportExport || !importText.trim()) {
      handleCancelImportExport();
      return;
    }
    const lines = parseImportedText(importText);
    const goalsToImport = lines.map((line) => ({ text: line.trim(), completed: false })).filter((g) => g.text.length > 0);
    if (goalsToImport.length > 0) {
      dispatch(goalsImported({ listId: listForImportExport, goalsData: goalsToImport }));
      alert(`${goalsToImport.length} цілей імпортовано.`);
    }
    handleCancelImportExport();
  }, [dispatch, listForImportExport, importText]);

  const handleSortByRating = useCallback((listId: string) => {
    const list = goalLists[listId];
    if (!list) return;
    const itemsInList = list.itemInstanceIds.map((instanceId) => {
      const instance = goalInstances[instanceId];
      const goal = instance ? goals[instance.goalId] : null;
      return goal ? { instance, goal } : null;
    }).filter(Boolean) as { instance: { id: string; goalId: string }; goal: Goal; }[];
    const itemsWithRating = itemsInList.map(item => ({...item, rating: parseGoalData(item.goal.text).rating}))
                                       .filter(item => item.rating !== undefined && !item.goal.completed);
    const itemsWithoutRating = itemsInList.filter(item => parseGoalData(item.goal.text).rating === undefined || item.goal.completed);
    itemsWithRating.sort((a, b) => b.rating! - a.rating!);
    const sortedInstanceIds = [
      ...itemsWithRating.map((item) => item.instance.id),
      ...itemsWithoutRating.filter(item => !item.goal.completed).map((item) => item.instance.id),
      ...itemsWithoutRating.filter(item => item.goal.completed).map((item) => item.instance.id),
    ];
    dispatch(goalOrderUpdated({ listId, orderedInstanceIds: sortedInstanceIds }));
  }, [dispatch, goals, goalLists, goalInstances]);

  if (globalFilterTerm) {
    return <GlobalSearchResults obsidianVaultName={obsidianVaultPath} />;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-200 dark:bg-slate-950">
      {editingList && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 flex items-center justify-center p-4">
          <div ref={editingListModalRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md text-slate-800 dark:text-slate-200">
            <h2 className="text-xl font-semibold mb-4">Редагувати список</h2>
            <input value={editingListName} onChange={(e) => setEditingListName(e.target.value)} className="w-full ... mb-3" autoFocus />
            <textarea value={editingListDescription} onChange={(e) => setEditingListDescription(e.target.value)} rows={3} className="w-full ... mb-4" />
            <div className="flex justify-end space-x-2">
              <button onClick={handleCancelEditList} className="...">Скасувати</button>
              <button onClick={handleSubmitEditList} className="...">Зберегти</button>
            </div>
          </div>
        </div>
      )}
      <TabsContainer tabs={tabs} activeTabId={activeTabId} onTabClick={handleTabClick} onTabClose={handleTabClose} onNewTab={() => {}} />
      {isCurrentTabAGoalList && listIdForToolbar && (
        <ListToolbar
          currentListId={listIdForToolbar}
          filterText={globalFilterTerm || ''}
          onFilterTextChange={handleGlobalFilterChange}
          onCopyListId={(id) => navigator.clipboard.writeText(id)}
          onOpenListSettings={handleOpenListSettings}
          onDeleteList={handleDeleteList}
          onImportGoals={handleOpenImportArea}
          onExportGoals={handleOpenExportArea}
          onSortByRating={handleSortByRating}
        />
      )}
      {showImportArea && listForImportExport === currentActiveListId && (
        <div className="p-3 ...">
          {/* Import Area */}
        </div>
      )}
      {showExportArea && listForImportExport === currentActiveListId && (
        <div className="p-3 ...">
          {/* Export Area */}
        </div>
      )}
      <div className="flex-grow overflow-y-auto bg-slate-50 dark:bg-slate-800 min-h-0">
        {renderActiveTabContent()}
      </div>
      <div className="p-2 bg-slate-100 dark:bg-slate-900 border-t ...">
        <InputPanel
          ref={inputPanelGlobalRef}
          currentListId={currentActiveListId ?? undefined}
          onAddGoal={handleAddGoalToCurrentList}
          onSearch={handleSearchGoals}
          onNavigateToList={handleNavigateToListByIdOrName}
          onExecuteCommand={handleExecuteAppCommand}
          defaultMode={CommandMode.ADD}
        />
      </div>
    </div>
  );
}
export default MainPanel;

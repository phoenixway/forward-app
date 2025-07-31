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
import {
  OPEN_GOAL_LIST_EVENT,
  OpenGoalListDetail,
  dispatchOpenGoalListEvent,
} from "./Sidebar";
import { OPEN_SETTINGS_EVENT } from "../events";

import GlobalSearchResults from "./GlobalSearchResults";
import { setGlobalFilterTerm } from "../store/uiSlice";

import ListToolbar from "./ListToolbar";
import { Droppable } from "@hello-pangea/dnd";

import {
  listRemoved,
  listUpdated,
  goalAdded,
  listAdded,
  goalOrderUpdated,
  goalsImported,
  goalUpdated,
} from "../store/listsSlice";
import { calculateScores } from '../logic/goalScoring';

export interface MainPanelProps {
  currentThemePreference: string;
  onChangeThemePreference: (newTheme: string) => void;
  obsidianVaultPath: string;
  onObsidianVaultChange: (newPath: string) => void;
}

export interface Tab {
  id: string;
  type: "goal-list" | "settings";
  title: string;
  isClosable?: boolean;
  listId?: string;
}

function MainPanel({
  currentThemePreference,
  onChangeThemePreference,
  obsidianVaultPath,
  onObsidianVaultChange,
}: MainPanelProps) {
  const { goals, goalLists } = useSelector((state: RootState) => state.lists);
  const globalFilterTerm = useSelector((state: RootState) => state.ui.globalFilterTerm);
  const dispatch = useDispatch<AppDispatch>();

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [editingList, setEditingList] = useState<GoalList | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");
  const editingListModalRef = useRef<HTMLDivElement>(null);

  const getActiveListIdFromTab = useCallback((): string | null => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    return activeTab?.type === "goal-list" ? activeTab.listId || null : null;
  }, [tabs, activeTabId]);

  const currentActiveListId = getActiveListIdFromTab();

  useEffect(() => {
    const MIGRATION_KEY = 'migration_to_scoring_system_v9_applied';
    const isMigrationApplied = localStorage.getItem(MIGRATION_KEY);
    if (!isMigrationApplied) {
      console.log('Застосування міграції до нової системи оцінки цілей...');
      Object.values(goals).forEach(goal => {
        if (goal && goal.displayScore === undefined) {
          const updatedGoalWithScores = calculateScores(goal);
          dispatch(goalUpdated({
            ...goal,
            ...updatedGoalWithScores
          }));
        }
      });
      localStorage.setItem(MIGRATION_KEY, 'true');
    }
  }, [goals, dispatch]);

  const handleOpenGoalListEventCallback = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<OpenGoalListDetail>;
    const { listId, listName } = customEvent.detail;
    if (!listId || !listName) return;
    const tabIdForGoalList = `goal-list-${listId}`;
    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((tab) => tab.id === tabIdForGoalList);
      if (existingTab) {
        setActiveTabId(tabIdForGoalList);
        return prevTabs;
      } else {
        const newTab: Tab = { id: tabIdForGoalList, title: listName, type: "goal-list", listId: listId, isClosable: true };
        setActiveTabId(tabIdForGoalList);
        return [...prevTabs, newTab];
      }
    });
    dispatch(setGlobalFilterTerm(""));
  }, [dispatch]);

  const handleOpenSettingsEventCallback = useCallback(() => {
    const settingsTabId = "settings-tab";
    setTabs((prevTabs) => {
      if (prevTabs.find((tab) => tab.id === settingsTabId)) {
        setActiveTabId(settingsTabId);
        return prevTabs;
      }
      const newSettingsTab: Tab = { id: settingsTabId, title: "Налаштування", type: "settings", isClosable: true };
      setActiveTabId(settingsTabId);
      return [...prevTabs, newSettingsTab];
    });
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_GOAL_LIST_EVENT, handleOpenGoalListEventCallback as EventListener);
    window.addEventListener(OPEN_SETTINGS_EVENT, handleOpenSettingsEventCallback as EventListener);
    return () => {
      window.removeEventListener(OPEN_GOAL_LIST_EVENT, handleOpenGoalListEventCallback as EventListener);
      window.removeEventListener(OPEN_SETTINGS_EVENT, handleOpenSettingsEventCallback as EventListener);
    };
  }, [handleOpenGoalListEventCallback, handleOpenSettingsEventCallback]);

  const handleGlobalFilterChange = useCallback((query: string) => {
    dispatch(setGlobalFilterTerm(query));
  }, [dispatch]);

  const handleTabClick = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    if (tabs.find(t => t.id === tabId)?.type === 'goal-list') {
        dispatch(setGlobalFilterTerm(""));
    }
  }, [tabs, dispatch]);

  const handleTabClose = useCallback((tabIdToClose: string) => {
    setTabs((prevTabs) => {
      const indexToClose = prevTabs.findIndex((tab) => tab.id === tabIdToClose);
      if (indexToClose === -1) return prevTabs;
      const newTabs = prevTabs.filter((tab) => tab.id !== tabIdToClose);
      if (activeTabId === tabIdToClose) {
        const newActiveIndex = Math.max(0, indexToClose - 1);
        setActiveTabId(newTabs.length > 0 ? newTabs[newActiveIndex].id : null);
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

  const handleAddGoalToCurrentList = useCallback((listId: string, text: string) => {
    if (!listId) return;
    dispatch(goalAdded({ listId, text }));
  }, [dispatch]);

  const renderActiveTabContent = () => {
    const activeTabData = tabs.find((tab) => tab.id === activeTabId);
    if (!activeTabData) {
      return <NoListSelected 
        onCreateList={() => {
          const name = prompt("Введіть назву нового списку:");
          if (name) dispatch(listAdded({name, parentId: null}));
        }}
        onSelectList={() => {
          // Можна реалізувати фокус на сайдбарі, якщо потрібно
        }}
      />;
    }

    switch (activeTabData.type) {
      case "goal-list":
        const listId = activeTabData.listId;
        if (!listId || !goalLists[listId]) {
          return <div className="p-4 text-slate-600 dark:text-slate-400">Список видалено або не існує.</div>;
        }
        return (
          <Droppable droppableId={listId} type="GOAL">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="h-full">
                <GoalListPage
                  key={listId}
                  listId={listId}
                  filterText={globalFilterTerm || ''}
                  obsidianVaultName={obsidianVaultPath}
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        );
      case "settings":
        return <SettingsPage currentTheme={currentThemePreference} onChangeTheme={onChangeThemePreference} initialObsidianVault={obsidianVaultPath} onObsidianVaultChange={onObsidianVaultChange} />;
      default:
        return <div className="p-4">Невідомий тип вкладки.</div>;
    }
  };

  const activeTabInfo = tabs.find((tab) => tab.id === activeTabId);
  const isCurrentTabAGoalList = activeTabInfo?.type === "goal-list";
  const listIdForToolbar = isCurrentTabAGoalList ? activeTabInfo?.listId || null : null;

  if (globalFilterTerm) {
    return <GlobalSearchResults obsidianVaultName={obsidianVaultPath} />;
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-200 dark:bg-slate-950">
      {editingList && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
          <div ref={editingListModalRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Редагувати список</h2>
            <input value={editingListName} onChange={(e) => setEditingListName(e.target.value)} className="w-full mb-3" autoFocus />
            <textarea value={editingListDescription} onChange={(e) => setEditingListDescription(e.target.value)} rows={3} className="w-full mb-4" />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setEditingList(null)}>Скасувати</button>
              <button onClick={() => {
                  if (editingList && editingListName.trim()) {
                    dispatch(listUpdated({ id: editingList.id, name: editingListName.trim(), description: editingListDescription.trim() }));
                  }
                  setEditingList(null);
              }}>Зберегти</button>
            </div>
          </div>
        </div>
      )}
      <TabsContainer 
        tabs={tabs} 
        activeTabId={activeTabId} 
        onTabClick={handleTabClick} 
        onTabClose={handleTabClose} 
        onNewTab={() => {}} 
      />
      {isCurrentTabAGoalList && listIdForToolbar && (
        <ListToolbar
          currentListId={listIdForToolbar}
          filterText={globalFilterTerm || ''}
          onFilterTextChange={handleGlobalFilterChange}
          onDeleteList={handleDeleteList}
        />
      )}
      <div className="flex-grow overflow-y-auto bg-slate-50 dark:bg-slate-800 min-h-0">
        {renderActiveTabContent()}
      </div>
      <div className="p-2 bg-slate-100 dark:bg-slate-900 border-t">
        <InputPanel
          currentListId={currentActiveListId ?? undefined}
          onAddGoal={handleAddGoalToCurrentList}
          onSearch={handleGlobalFilterChange}
          onNavigateToList={(query) => {
              const list = Object.values(goalLists).find(l => l.name.toLowerCase() === query.toLowerCase());
              if(list) dispatchOpenGoalListEvent(list.id, list.name);
          }}
          onExecuteCommand={(command) => {
              if(command.startsWith('new-list ')) {
                  dispatch(listAdded({name: command.replace('new-list ', ''), parentId: null}));
              }
          }}
        />
      </div>
    </div>
  );
}
export default MainPanel;
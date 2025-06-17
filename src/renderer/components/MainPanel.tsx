// src/renderer/components/MainPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
// Типи GoalList та Goal тепер відповідають новій структурі зі стору
import type { GoalList as GoalListType, Goal } from "../data/goalListsStore";
import * as goalListStore from "../data/goalListsStore";
import GoalListPage from "./GoalListPage";
import NoListSelected from "./NoListSelected";
import InputPanel, { CommandMode, InputPanelRef } from "./InputPanel";
import TabsContainer from "./TabsContainer";
import SettingsPage from "./SettingsPage";
import LogContent, { LogMessage } from "./LogContent";
// Переконайтеся, що ці івенти та типи імпортовані
import {
  OPEN_GOAL_LIST_EVENT,
  OpenGoalListDetail,
  SIDEBAR_REFRESH_LISTS_EVENT,
} from "./Sidebar";
import { OPEN_SETTINGS_EVENT } from "../events";
import ListToolbar from "./ListToolbar";
import {
  formatGoalsForExport,
  parseImportedText,
  parseGoalData,
} from "../utils/textProcessing";

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
  {
    id: "log-init-1",
    text: "Додаток запущено.",
    time: new Date().toLocaleTimeString(),
  },
];

const MY_APP_PROTOCOL = "forwardapp"; // <<< ВАША КАСТОМНА URL-СХЕМА (має співпадати з main.ts)

function MainPanel({
  currentThemePreference,
  onChangeThemePreference,
  obsidianVaultPath,
  onObsidianVaultChange,
}: MainPanelProps) {
  const inputPanelGlobalRef = useRef<InputPanelRef>(null);

  const [goalListsForDisplay, setGoalListsForDisplay] = useState<
    GoalListType[]
  >(() => goalListStore.getAllGoalLists());

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const savedTabs = localStorage.getItem("openTabs");
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as Tab[];
        return parsed.filter(
          (t) =>
            t.type !== "goal-list" ||
            !!goalListStore.getGoalListById(t.listId || ""),
        );
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveTabId = localStorage.getItem("activeTabId");
    const currentValidTabs = (() => {
      const saved = localStorage.getItem("openTabs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Tab[];
          return parsed.filter(
            (t) =>
              t.type !== "goal-list" ||
              !!goalListStore.getGoalListById(t.listId || ""),
          );
        } catch {
          return [];
        }
      }
      return [];
    })();

    if (
      savedActiveTabId &&
      currentValidTabs.find((t) => t.id === savedActiveTabId)
    ) {
      return savedActiveTabId;
    }
    return currentValidTabs.length > 0 ? currentValidTabs[0].id : null;
  });

  const [editingList, setEditingList] = useState<GoalListType | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [editingListDescription, setEditingListDescription] = useState("");

  const [globalFilterText, setGlobalFilterText] = useState("");
  const [logMessages, setLogMessages] = useState<LogMessage[]>(initialLogs);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const editingListModalRef = useRef<HTMLDivElement>(null);

  const [showImportArea, setShowImportArea] = useState(false);
  const [importText, setImportText] = useState("");
  const [showExportArea, setShowExportArea] = useState(false);
  const [exportText, setExportText] = useState("");
  const [listForImportExport, setListForImportExport] = useState<string | null>(
    null,
  );

  const importTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const exportTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const getActiveListIdFromTab = useCallback((): string | null => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    return activeTab?.type === "goal-list" ? activeTab.listId || null : null;
  }, [tabs, activeTabId]);

  const currentActiveListId = getActiveListIdFromTab();

  const refreshAllListDataForDisplay = useCallback(() => {
    setGoalListsForDisplay([...goalListStore.getAllGoalLists()]);
  }, []);

  const refreshListsAndTabs = useCallback(() => {
    const updatedGoalListsFromStore = goalListStore.getAllGoalLists();
    setGoalListsForDisplay([...updatedGoalListsFromStore]);

    setTabs((prevTabs) => {
      const newTabs = prevTabs
        .map((tab) => {
          if (tab.type === "goal-list" && tab.listId) {
            const correspondingList = updatedGoalListsFromStore.find(
              (l) => l.id === tab.listId,
            );
            if (correspondingList) {
              if (tab.title !== correspondingList.name) {
                return { ...tab, title: correspondingList.name };
              }
            } else {
              return null;
            }
          }
          return tab;
        })
        .filter(Boolean) as Tab[];

      if (activeTabId && !newTabs.find((t) => t.id === activeTabId)) {
        setActiveTabId(newTabs.length > 0 ? newTabs[0].id : null);
      } else if (newTabs.length === 0 && activeTabId) {
        setActiveTabId(null);
      } else if (!activeTabId && newTabs.length > 0 && !currentActiveListId) {
        setActiveTabId(newTabs[0].id);
      }
      return newTabs;
    });
    setRefreshSignal((prev) => prev + 1);
  }, [activeTabId, currentActiveListId]);

  useEffect(() => {
    localStorage.setItem("openTabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) localStorage.setItem("activeTabId", activeTabId);
    else localStorage.removeItem("activeTabId");
  }, [activeTabId]);

  // --- Обробка кастомних URL ---
  const handleIncomingCustomUrl = useCallback((url: string) => {
    console.log(`[MainPanel] Received custom URL: ${url}`);
    if (!url || !url.startsWith(`${MY_APP_PROTOCOL}://`)) {
      console.warn(`[MainPanel] Invalid or non-matching protocol URL: ${url}`);
      return;
    }

    try {
      const parsedUrl = new URL(url);
      const command = parsedUrl.hostname; // наприклад, 'open-list'
      const listId = parsedUrl.searchParams.get("id"); // для формату forwardapp://open-list?id=LIST_ID
      // або для формату forwardapp://open-list/LIST_ID :
      // const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      // const listIdFromPath = pathParts[0];

      console.log(
        `[MainPanel] Parsed URL - Command: ${command}, List ID from query: ${listId}`,
      );

      if (command === "open-list") {
        if (listId) {
          console.log(`[MainPanel] Attempting to open list with ID: ${listId}`);
          const listToOpen = goalListStore.getGoalListById(listId);
          if (listToOpen) {
            // Використовуємо існуючу логіку відкриття вкладки через подію
            window.dispatchEvent(
              new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
                detail: { listId: listToOpen.id, listName: listToOpen.name },
              }),
            );
            // Main процес має подбати про фокусування вікна
          } else {
            alert(`Список з ID "${listId}" не знайдено.`);
            console.warn(
              `[MainPanel] List with ID "${listId}" not found via custom URL.`,
            );
          }
        } else {
          alert("Не вказано ID списку в URL (параметр 'id').");
          console.warn(
            "[MainPanel] List ID ('id' parameter) missing in custom URL for 'open-list'.",
          );
        }
      } else {
        alert(`Невідома команда в URL: ${command}`);
        console.warn(`[MainPanel] Unknown command in custom URL: ${command}`);
      }
    } catch (error) {
      console.error(`[MainPanel] Error parsing custom URL "${url}":`, error);
      alert("Помилка обробки URL-посилання.");
    }
  }, []); // Залежності: якщо dispatchOpenGoalListEvent або setActiveTabId використовуються тут напряму, додайте їх

  useEffect(() => {
    if (
      window.electronAPI &&
      typeof window.electronAPI.onCustomUrl === "function"
    ) {
      const unsubscribe = window.electronAPI.onCustomUrl(
        handleIncomingCustomUrl,
      );
      return () => {
        // Функція очищення для відписки
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      };
    } else {
      console.warn(
        "[MainPanel] window.electronAPI.onCustomUrl is not available. Ensure preload script is loaded and configured correctly.",
      );
    }
  }, [handleIncomingCustomUrl]); // Важливо передати handleIncomingCustomUrl як залежність

  // --- Кінець обробки кастомних URL ---

  const handleGlobalFilterChange = useCallback((query: string) => {
    setGlobalFilterText(query);
  }, []);

  const handleTagClickFromGoalRenderer = useCallback(
    (tagFilterTerm: string) => {
      setGlobalFilterText(tagFilterTerm);
      const listToolbarFilterInput = document.querySelector<HTMLInputElement>(
        '.h-10 input[type="text"][placeholder="Фільтрувати цілі..."]',
      );
      listToolbarFilterInput?.focus();
    },
    [],
  );

  useEffect(() => {
    const TARGET_KEYCODE = "Slash";
    const refinedGlobalKeyDownHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const inputPanelElement = inputPanelGlobalRef.current?.localInputRef;
      if (
        (inputPanelElement && document.activeElement === inputPanelElement) ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        const listToolbarFilterInput = document.querySelector(
          '.h-10 input[type="text"][placeholder="Фільтрувати цілі..."]',
        );
        if (target === listToolbarFilterInput) return;
        if (target !== inputPanelElement) return;
      }
      if (
        event.code === TARGET_KEYCODE &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        event.preventDefault();
        inputPanelGlobalRef.current?.switchToMode(CommandMode.ADD, "");
      }
    };
    window.addEventListener("keydown", refinedGlobalKeyDownHandler);
    return () =>
      window.removeEventListener("keydown", refinedGlobalKeyDownHandler);
  }, []);

  useEffect(() => {
    const handleOpenGoalListEvent = (
      event: CustomEvent<OpenGoalListDetail>,
    ) => {
      // Перейменував, щоб уникнути конфлікту з функцією з main.ts
      const { listId, listName } = event.detail;
      const tabId = `goal-list-${listId}`;
      if (!tabs.find((tab) => tab.id === tabId)) {
        setTabs((prevTabs) => [
          ...prevTabs,
          {
            id: tabId,
            type: "goal-list",
            title: listName,
            listId,
            isClosable: true,
          },
        ]);
      }
      setActiveTabId(tabId);
      setGlobalFilterText("");
      setRefreshSignal((prev) => prev + 1);
    };
    const handleOpenSettings = () => {
      const settingsTabId = "settings-tab";
      if (!tabs.find((tab) => tab.id === settingsTabId)) {
        setTabs((prevTabs) => [
          ...prevTabs,
          {
            id: settingsTabId,
            type: "settings",
            title: "Налаштування",
            isClosable: true,
          },
        ]);
      }
      setActiveTabId(settingsTabId);
    };
    const handleSidebarRefreshEvent = () => {
      refreshAllListDataForDisplay();
    };

    window.addEventListener(
      OPEN_GOAL_LIST_EVENT,
      handleOpenGoalListEvent as EventListener,
    );
    window.addEventListener(
      OPEN_SETTINGS_EVENT,
      handleOpenSettings as EventListener,
    );
    window.addEventListener(
      SIDEBAR_REFRESH_LISTS_EVENT,
      handleSidebarRefreshEvent,
    );

    return () => {
      window.removeEventListener(
        OPEN_GOAL_LIST_EVENT,
        handleOpenGoalListEvent as EventListener,
      );
      window.removeEventListener(
        OPEN_SETTINGS_EVENT,
        handleOpenSettings as EventListener,
      );
      window.removeEventListener(
        SIDEBAR_REFRESH_LISTS_EVENT,
        handleSidebarRefreshEvent,
      );
    };
  }, [tabs, refreshAllListDataForDisplay]); // Додав tabs сюди, бо setTabs використовується

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (activeTabId !== tabId) {
        setActiveTabId(tabId);
        const clickedTab = tabs.find((t) => t.id === tabId);
        if (clickedTab?.type === "goal-list") {
          setGlobalFilterText("");
          setRefreshSignal((prev) => prev + 1);
        }
      }
    },
    [tabs, activeTabId],
  );

  const handleTabClose = useCallback(
    (tabIdToClose: string) => {
      setTabs((prevTabs) => {
        const indexToClose = prevTabs.findIndex(
          (tab) => tab.id === tabIdToClose,
        );
        if (indexToClose === -1) return prevTabs;
        const newTabs = prevTabs.filter((tab) => tab.id !== tabIdToClose);
        if (activeTabId === tabIdToClose) {
          const newActiveId =
            newTabs.length > 0
              ? (
                  newTabs[indexToClose] ||
                  newTabs[indexToClose - 1] ||
                  newTabs[0]
                ).id
              : null;
          setActiveTabId(newActiveId);
          if (
            newActiveId &&
            newTabs.find((t) => t.id === newActiveId)?.type === "goal-list"
          ) {
            setRefreshSignal((prev) => prev + 1);
          }
        }
        return newTabs;
      });
    },
    [activeTabId],
  );

  const handleNewTab = useCallback(() => {
    const settingsTabId = "settings-tab";
    if (!tabs.find((tab) => tab.id === settingsTabId)) {
      setTabs((prev) => [
        ...prev,
        {
          id: settingsTabId,
          type: "settings",
          title: "Налаштування",
          isClosable: true,
        },
      ]);
      setActiveTabId(settingsTabId);
    } else {
      setActiveTabId(settingsTabId);
    }
  }, [tabs]);

  const promptCreateNewList = useCallback(async () => {
    const name = prompt("Введіть назву нового списку:");
    if (name && name.trim()) {
      try {
        const newList = goalListStore.createGoalList(name.trim());
        refreshListsAndTabs();
        window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));

        const newTabId = `goal-list-${newList.id}`;
        setTabs((prev) => {
          if (prev.find((t) => t.id === newTabId)) return prev;
          return [
            ...prev,
            {
              id: newTabId,
              type: "goal-list",
              title: newList.name,
              listId: newList.id,
              isClosable: true,
            },
          ];
        });
        setActiveTabId(newTabId);
        setGlobalFilterText("");
      } catch (error) {
        alert((error as Error).message);
      }
    }
  }, [refreshListsAndTabs]);

  const handleDeleteList = useCallback(
    (listId: string) => {
      const listToDelete = goalListStore.getGoalListById(listId);
      if (
        listToDelete &&
        window.confirm(
          `Видалити список "${listToDelete.name}"? (Цілі в ньому не будуть видалені глобально)`,
        )
      ) {
        goalListStore.deleteGoalList(listId);
        refreshListsAndTabs();
        window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
      }
    },
    [refreshListsAndTabs],
  );

  const handleStartEditList = useCallback((list: GoalListType) => {
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
      try {
        goalListStore.updateGoalListName(
          editingList.id,
          editingListName.trim(),
          editingListDescription.trim(),
        );
        refreshListsAndTabs();
        window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
        handleCancelEditList();
      } catch (error) {
        alert((error as Error).message);
      }
    } else if (editingList && !editingListName.trim()) {
      alert("Назва списку не може бути порожньою.");
    }
  }, [
    editingList,
    editingListName,
    editingListDescription,
    refreshListsAndTabs,
    handleCancelEditList,
  ]);

  const handleAddGoalToCurrentList = useCallback(
    (listId: string, text: string) => {
      if (!listId) {
        alert("Будь ласка, спочатку виберіть або відкрийте список.");
        return;
      }
      try {
        goalListStore.createGoalAndAddToList(listId, text);
        setRefreshSignal((prev) => prev + 1);
      } catch (error) {
        alert((error as Error).message);
      }
    },
    [],
  );

  const handleSearchGoals = useCallback(
    (query: string) => {
      handleGlobalFilterChange(query);
    },
    [handleGlobalFilterChange],
  );

  const handleNavigateToListByIdOrName = useCallback((listQuery: string) => {
    const allLists = goalListStore.getAllGoalLists();
    const lowerQuery = listQuery.toLowerCase().trim();
    const foundList = allLists.find(
      (l) => l.id === lowerQuery || l.name.toLowerCase() === lowerQuery,
    );
    if (foundList) {
      window.dispatchEvent(
        new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
          detail: { listId: foundList.id, listName: foundList.name },
        }),
      );
    } else {
      alert(`Список "${listQuery}" не знайдено.`);
    }
  }, []); // Залежність OPEN_GOAL_LIST_EVENT не потрібна, бо це константа

  const handleExecuteAppCommand = useCallback(
    (commandWithArgs: string) => {
      const [command, ...args] = commandWithArgs.trim().split(/\s+/);
      const argString = args.join(" ").trim();

      switch (command.toLowerCase()) {
        case "create-list":
        case "new-list":
          if (argString) {
            try {
              const newList = goalListStore.createGoalList(argString);
              refreshListsAndTabs();
              window.dispatchEvent(
                new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT),
              );
              window.dispatchEvent(
                new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
                  detail: { listId: newList.id, listName: newList.name },
                }),
              );
            } catch (error) {
              alert((error as Error).message);
            }
          } else {
            alert("Вкажіть назву списку: > create-list Назва");
          }
          break;
        case "open-log":
          const logTabId = "log-tab";
          if (!tabs.find((t) => t.id === logTabId)) {
            setTabs((prev) => [
              ...prev,
              { id: logTabId, type: "log", title: "Лог", isClosable: true },
            ]);
          }
          setActiveTabId(logTabId);
          break;
        case "rename-list":
          if (currentActiveListId && argString) {
            try {
              goalListStore.updateGoalListName(currentActiveListId, argString); // Опис не передається тут, можна додати
              refreshListsAndTabs();
              window.dispatchEvent(
                new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT),
              );
            } catch (error) {
              alert((error as Error).message);
            }
          } else if (!currentActiveListId) {
            alert("Спочатку відкрийте список, який хочете перейменувати.");
          } else {
            alert("Вкажіть нову назву: > rename-list Нова Назва");
          }
          break;
        default:
          alert(`Невідома команда: ${command}`);
      }
    },
    [refreshListsAndTabs, tabs, currentActiveListId],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editingList &&
        editingListModalRef.current &&
        !editingListModalRef.current.contains(event.target as Node)
      ) {
        handleCancelEditList();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingList, handleCancelEditList]);

  const handleSidebarNeedsRefreshFromPage = useCallback(() => {
    refreshAllListDataForDisplay();
    window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
  }, [refreshAllListDataForDisplay]);

  const renderActiveTabContent = () => {
    if (tabs.length === 0) {
      return (
        <NoListSelected
          onSelectList={(id: string) => {
            const list = goalListStore.getGoalListById(id);
            if (list) {
              window.dispatchEvent(
                new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
                  detail: { listId: list.id, listName: list.name },
                }),
              );
            }
          }}
          onCreateList={promptCreateNewList}
        />
      );
    }
    const activeTabData = tabs.find((tab) => tab.id === activeTabId);
    if (!activeTabId && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
      if (tabs[0].type === "goal-list") setRefreshSignal((prev) => prev + 1);
      return null;
    }
    if (!activeTabData) {
      return (
        <div className="p-4 text-slate-600 dark:text-slate-400">
          Завантаження або помилка відображення вкладки...
        </div>
      );
    }

    switch (activeTabData.type) {
      case "goal-list":
        if (activeTabData.listId) {
          const listExists = goalListStore.getGoalListById(
            activeTabData.listId,
          );
          if (!listExists) {
            return (
              <div className="p-4 text-slate-600 dark:text-slate-400">
                Список для цієї вкладки було видалено.
              </div>
            );
          }
          return (
            <GoalListPage
              key={`${activeTabData.listId}-${refreshSignal}`}
              listId={activeTabData.listId}
              filterText={globalFilterText}
              refreshSignal={refreshSignal}
              obsidianVaultName={obsidianVaultPath}
              onTagClickForFilter={handleTagClickFromGoalRenderer}
              onNeedsSidebarRefresh={handleSidebarNeedsRefreshFromPage}
            />
          );
        }
        return (
          <div className="p-4 text-slate-600 dark:text-slate-400">
            Помилка: ID списку для вкладки не знайдено.
          </div>
        );
      case "settings":
        return (
          <SettingsPage
            currentTheme={currentThemePreference}
            onChangeTheme={onChangeThemePreference}
            initialObsidianVault={obsidianVaultPath}
            onObsidianVaultChange={onObsidianVaultChange}
          />
        );
      case "log":
        return <LogContent messages={logMessages} />;
      default:
        // TypeScript має забезпечити, що цей випадок ніколи не досягається
        const _exhaustiveCheck: never = activeTabData.type;
        return (
          <div className="p-4 text-slate-600 dark:text-slate-400">
            Невідомий тип вкладки.
          </div>
        );
    }
  };

  const activeTabInfo = tabs.find((tab) => tab.id === activeTabId);
  const isCurrentTabAGoalList = activeTabInfo?.type === "goal-list";
  const listIdForToolbar = isCurrentTabAGoalList
    ? activeTabInfo?.listId || null
    : null;

  const handleToggleAutoSort = useCallback((listId: string) => {
    alert(`Дія: Перемкнути авто-сортування для списку ${listId}`);
  }, []);
  const handleCopyListId = useCallback((listId: string) => {
    navigator.clipboard
      .writeText(listId)
      .then(() => alert(`ID списку "${listId}" скопійовано.`))
      .catch((err) => console.error("Could not copy text: ", err));
  }, []);
  const handleOpenListSettings = useCallback(
    (listId: string) => {
      const listToEdit = goalListStore.getGoalListById(listId);
      if (listToEdit) {
        handleStartEditList(listToEdit);
      } else {
        alert("Список не знайдено.");
      }
    },
    [handleStartEditList],
  );

  const handleOpenImportArea = useCallback((listId: string) => {
    setListForImportExport(listId);
    setShowExportArea(false);
    setShowImportArea(true);
    setImportText("");
    setTimeout(() => importTextAreaRef.current?.focus(), 0);
  }, []);

  const handleOpenExportArea = useCallback((listId: string) => {
    const goalsToExport = goalListStore.getGoalsForList(listId);
    if (goalsToExport) {
      setListForImportExport(listId);
      setShowImportArea(false);
      setExportText(formatGoalsForExport(goalsToExport));
      setShowExportArea(true);
      setTimeout(() => exportTextAreaRef.current?.select(), 0);
    }
  }, []);

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

    const linesFromImport = parseImportedText(importText);
    if (linesFromImport.length > 0) {
      const goalsToImport: Array<{ text: string; completed?: boolean }> =
        linesFromImport
          .map((line) => line.trim())
          .filter((line) => line.length > 0)
          .map((text) => ({ text: text, completed: false }));

      if (goalsToImport.length > 0) {
        goalListStore.addMultipleGoalsToList(
          listForImportExport,
          goalsToImport,
        );
        setRefreshSignal((prev) => prev + 1);
        alert(`${goalsToImport.length} цілей імпортовано до списку.`);
      } else {
        alert(
          "Не знайдено тексту для імпорту цілей (після обробки порожніх рядків).",
        );
      }
    } else {
      alert("Не знайдено цілей для імпорту в наданому тексті.");
    }
    handleCancelImportExport();
  }, [listForImportExport, importText]);

  const handleCopyExportText = useCallback(() => {
    if (exportText && exportTextAreaRef.current) {
      navigator.clipboard
        .writeText(exportText)
        .then(() => alert("Експортовані цілі скопійовано!"))
        .catch((err) => alert("Помилка копіювання."));
    }
  }, [exportText]);

  const handleSortByRating = useCallback((listId: string) => {
    const goalsToSort = goalListStore.getGoalsForList(listId);
    if (!goalsToSort || goalsToSort.length === 0) return;

    const goalsWithRating: Array<{ goal: Goal; ratingValue: number }> = [];
    const goalsWithoutRating: Goal[] = [];

    goalsToSort.forEach((goal) => {
      if (goal.completed) {
        goalsWithoutRating.push(goal);
        return;
      }
      const { rating } = parseGoalData(goal.text);
      if (rating !== undefined) {
        goalsWithRating.push({ goal, ratingValue: rating });
      } else {
        goalsWithoutRating.push(goal);
      }
    });

    goalsWithRating.sort((a, b) => {
      if (a.ratingValue === Infinity && b.ratingValue !== Infinity) return -1;
      if (a.ratingValue !== Infinity && b.ratingValue === Infinity) return 1;
      if (a.ratingValue === -Infinity && b.ratingValue !== -Infinity) return 1;
      if (a.ratingValue !== -Infinity && b.ratingValue === -Infinity) return -1;
      return b.ratingValue - a.ratingValue;
    });

    const sortedGoalIds = [
      ...goalsWithRating.map((item) => item.goal.id),
      ...goalsWithoutRating.map((goal) => goal.id),
    ];

    try {
      goalListStore.updateGoalOrderInList(listId, sortedGoalIds);
      setRefreshSignal((prev) => prev + 1);
    } catch (error) {
      alert(`Помилка сортування: ${(error as Error).message}`);
    }
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-200 dark:bg-slate-950">
      {editingList && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 flex items-center justify-center p-4">
          <div
            ref={editingListModalRef}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md text-slate-800 dark:text-slate-200"
          >
            <h2 className="text-xl font-semibold mb-4">Редагувати список</h2>
            <label
              htmlFor="editing-list-name"
              className="block text-sm font-medium mb-1"
            >
              Назва
            </label>
            <input
              id="editing-list-name"
              type="text"
              value={editingListName}
              onChange={(e) => setEditingListName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md mb-3
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                         focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
              autoFocus
            />
            <label
              htmlFor="editing-list-description"
              className="block text-sm font-medium mb-1"
            >
              Опис (опціонально)
            </label>
            <textarea
              id="editing-list-description"
              value={editingListDescription}
              onChange={(e) => setEditingListDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md mb-4
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                         focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEditList}
                className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md"
              >
                Скасувати
              </button>
              <button
                onClick={handleSubmitEditList}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Зберегти
              </button>
            </div>
          </div>
        </div>
      )}
      <TabsContainer
        tabs={tabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={handleTabClose}
        onNewTab={handleNewTab}
      />
      {isCurrentTabAGoalList && listIdForToolbar && (
        <ListToolbar
          currentListId={listIdForToolbar}
          filterText={globalFilterText}
          onFilterTextChange={handleGlobalFilterChange}
          onToggleAutoSort={handleToggleAutoSort}
          onCopyListId={handleCopyListId}
          onOpenListSettings={handleOpenListSettings}
          onDeleteList={handleDeleteList}
          onImportGoals={handleOpenImportArea}
          onExportGoals={handleOpenExportArea}
          onSortByRating={handleSortByRating}
        />
      )}
      {showImportArea && listForImportExport === currentActiveListId && (
        <div className="p-3 border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700/50 flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Імпорт цілей до списку
          </h3>
          <textarea
            ref={importTextAreaRef}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Вставте сюди список цілей, кожна ціль з нового рядка..."
            className="w-full h-24 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400
                       focus:border-indigo-500 dark:focus:border-indigo-400
                       placeholder-slate-400 dark:placeholder-slate-500"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleCancelImportExport}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md font-medium"
            >
              {" "}
              Скасувати{" "}
            </button>
            <button
              onClick={handleSubmitImport}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md font-medium"
            >
              {" "}
              Імпортувати{" "}
            </button>
          </div>
        </div>
      )}
      {showExportArea && listForImportExport === currentActiveListId && (
        <div className="p-3 border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700/50 flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Експорт цілей зі списку
          </h3>
          <textarea
            ref={exportTextAreaRef}
            value={exportText}
            readOnly
            className="w-full h-32 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm
                       bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100
                       focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400
                       focus:border-indigo-500 dark:focus:border-indigo-400
                       select-all"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleCopyExportText}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md font-medium"
            >
              {" "}
              Копіювати{" "}
            </button>
            <button
              onClick={handleCancelImportExport}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md font-medium"
            >
              {" "}
              Готово{" "}
            </button>
          </div>
        </div>
      )}

      <div className="flex-grow overflow-y-auto bg-slate-50 dark:bg-slate-800 min-h-0">
        {renderActiveTabContent()}
      </div>
      <div className="p-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700 shadow- ઉપર-md z-10 flex-shrink-0">
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

// src/renderer/components/MainPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../store/store"; // Виправлено шлях
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
  MAIN_PANEL_REFRESH_CONTENT,
  dispatchOpenGoalListEvent, // Додано імпорт
} from "./Sidebar";
import { OPEN_SETTINGS_EVENT, SIDEBAR_REFRESH_LISTS_EVENT } from "../events"; // <--- Змінено тут

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
  {
    id: "log-init-1",
    text: "Додаток запущено.",
    time: new Date().toLocaleTimeString(),
  },
];

const MY_APP_PROTOCOL = "forwardapp";

function MainPanel({
  currentThemePreference,
  onChangeThemePreference,
  obsidianVaultPath,
  onObsidianVaultChange,
}: MainPanelProps) {
  const { goals, goalLists, goalInstances } = useSelector(
    (state: RootState) => state,
  );
  const dispatch = useDispatch<AppDispatch>();

  const inputPanelGlobalRef = useRef<InputPanelRef>(null);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const savedTabs = localStorage.getItem("openTabs");
    if (savedTabs) {
      try {
        return JSON.parse(savedTabs);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveTabId = localStorage.getItem("activeTabId");
    const savedTabsRaw = localStorage.getItem("openTabs");
    if (savedActiveTabId) {
      return savedActiveTabId;
    }
    if (savedTabsRaw) {
      try {
        const savedTabs = JSON.parse(savedTabsRaw) as Tab[];
        if (savedTabs.length > 0) {
          return savedTabs[0].id;
        }
      } catch {}
    }
    return null;
  });

  useEffect(() => {
    const validListIds = new Set(Object.keys(goalLists));
    const validatedTabs = tabs.filter(
      (tab) =>
        tab.type !== "goal-list" ||
        (tab.listId && validListIds.has(tab.listId)),
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

  const [globalFilterText, setGlobalFilterText] = useState("");
  const [logMessages, setLogMessages] = useState<LogMessage[]>(initialLogs);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [refreshSignalForAllTabs, setRefreshSignalForAllTabs] = useState(0);

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

  const refreshListsAndTabs = useCallback(() => {
    setTabs((prevTabs) => {
      const updatedGoalListsFromStore = Object.values(goalLists);
      const newTabs = prevTabs
        .map((tab) => {
          if (tab.type === "goal-list" && tab.listId) {
            const correspondingList = updatedGoalListsFromStore.find(
              (l: GoalList) => l.id === tab.listId, // Виправлено тип
            );
            if (correspondingList) {
              if (tab.title !== correspondingList.name) {
                return { ...tab, title: correspondingList.name };
              }
              return tab;
            } else {
              return null;
            }
          }
          return tab;
        })
        .filter(Boolean) as Tab[];

      setActiveTabId((currentActiveTabId) => {
        if (
          currentActiveTabId &&
          !newTabs.find((t) => t.id === currentActiveTabId)
        ) {
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
    setRefreshSignal((prev: number) => prev + 1);
  }, [goalLists]);

  const handleDataImported = useCallback(() => {
    console.log(
      "[MainPanel] handleDataImported called, refreshing lists and tabs.",
    );
    refreshListsAndTabs();
    window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));

    setTabs((prevTabs) => {
      const filteredTabs = prevTabs.filter(
        (tab) => tab.type === "settings" || tab.type === "log",
      );
      setActiveTabId(() => {
        const settingsTab = filteredTabs.find((tab) => tab.type === "settings");
        if (settingsTab) return settingsTab.id;
        const logTab = filteredTabs.find((tab) => tab.type === "log");
        return logTab ? logTab.id : null;
      });
      return filteredTabs;
    });

    alert(
      "Дані оновлено після імпорту. Відкрийте потрібні списки з бічної панелі.",
    );
  }, [refreshListsAndTabs]);

  const handleGoalMovedBetweenLists = useCallback(
    (sourceListId: string, destinationListId: string, movedGoalId: string) => {
      console.log(
        `[MainPanel] Goal ${movedGoalId} moved from ${sourceListId} to ${destinationListId}. Triggering refresh for all tabs and sidebar.`,
      );
      setRefreshSignalForAllTabs((prev: number) => prev + 1);
      window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
    },
    [],
  );

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

  const handleIncomingCustomUrl = useCallback(
    (url: string) => {
      console.log(`[MainPanel] Received custom URL: ${url}`);
      if (!url || !url.startsWith(`${MY_APP_PROTOCOL}://`)) {
        console.warn(
          `[MainPanel] Invalid or non-matching protocol URL: ${url}`,
        );
        return;
      }
      try {
        const protocolPrefix = `${MY_APP_PROTOCOL}://`;
        const urlWithoutProtocol = url.substring(protocolPrefix.length);
        const questionMarkIndex = urlWithoutProtocol.indexOf("?");
        let pathAndCommandPart = urlWithoutProtocol;
        let queryStringContent = "";
        let listIdFromQuery: string | null = null;

        if (questionMarkIndex !== -1) {
          pathAndCommandPart = urlWithoutProtocol.substring(
            0,
            questionMarkIndex,
          );
          queryStringContent = urlWithoutProtocol.substring(
            questionMarkIndex + 1,
          );
          if (queryStringContent.includes("=")) {
            const searchParams = new URLSearchParams(queryStringContent);
            listIdFromQuery = searchParams.get("id");
          } else if (queryStringContent) {
            listIdFromQuery = queryStringContent;
          }
        }
        const pathSegments = pathAndCommandPart.split("/");
        const command = pathSegments[0];
        if (command === "open-list" && listIdFromQuery) {
          const listToOpen = goalLists[listIdFromQuery];
          if (listToOpen) {
            const eventDetail: OpenGoalListDetail = {
              listId: listToOpen.id,
              listName: listToOpen.name,
            };
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
                  detail: eventDetail,
                }),
              );
            }, 50);
          } else {
            alert(`Список з ID "${listIdFromQuery}" не знайдено.`);
          }
        } else if (command === "open-list" && !listIdFromQuery) {
          alert("Не вказано ID списку в URL.");
        } else {
          alert(`Невідома команда в URL: "${command}".`);
        }
      } catch (error) {
        console.error(`[MainPanel] Error parsing URL "${url}":`, error);
        alert("Помилка обробки URL.");
      }
    },
    [goalLists],
  );

  const handleOpenGoalListEventCallback = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<OpenGoalListDetail>;
    const { listId, listName } = customEvent.detail;
    if (!listId || !listName) return;
    const tabIdForGoalList = `goal-list-${listId}`;
    setTabs((prevTabs) => {
      const existingTab = prevTabs.find((tab) => tab.id === tabIdForGoalList);
      if (existingTab) {
        if (existingTab.title !== listName) {
          const updatedTabs = prevTabs.map((t) =>
            t.id === tabIdForGoalList ? { ...t, title: listName } : t,
          );
          setActiveTabId(tabIdForGoalList);
          return updatedTabs;
        }
        setActiveTabId(tabIdForGoalList);
        return prevTabs;
      } else {
        const newTab: Tab = {
          id: tabIdForGoalList,
          title: listName,
          type: "goal-list",
          listId: listId,
          isClosable: true,
        };
        const newTabsArray = [...prevTabs, newTab];
        setActiveTabId(tabIdForGoalList);
        return newTabsArray;
      }
    });
    setGlobalFilterText("");
    setRefreshSignal((prev: number) => prev + 1);
  }, []);

  const handleOpenSettingsEventCallback = useCallback(() => {
    const settingsTabId = "settings-tab";
    setTabs((prevTabs) => {
      const existingSettingsTab = prevTabs.find(
        (tab) => tab.id === settingsTabId,
      );
      if (existingSettingsTab) {
        setActiveTabId(settingsTabId);
        return prevTabs;
      } else {
        const newSettingsTab: Tab = {
          id: settingsTabId,
          title: "Налаштування",
          type: "settings",
          isClosable: true,
        };
        setActiveTabId(settingsTabId);
        return [...prevTabs, newSettingsTab];
      }
    });
  }, []);

  useEffect(() => {
    if (window.electronAPI?.onCustomUrl) {
      const unsubscribe = window.electronAPI.onCustomUrl(
        handleIncomingCustomUrl,
      );
      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }
  }, [handleIncomingCustomUrl]);

  useEffect(() => {
    const handleSidebarRefreshEvent = () => refreshListsAndTabs();
    const handleAppDataImportedEvent = () => handleDataImported();

    window.addEventListener(
      OPEN_GOAL_LIST_EVENT,
      handleOpenGoalListEventCallback as EventListener,
    );
    window.addEventListener(
      OPEN_SETTINGS_EVENT,
      handleOpenSettingsEventCallback as EventListener,
    );
    window.addEventListener(
      SIDEBAR_REFRESH_LISTS_EVENT,
      handleSidebarRefreshEvent,
    );
    window.addEventListener(
      "app-data-imported",
      handleAppDataImportedEvent as EventListener,
    );

    return () => {
      window.removeEventListener(
        OPEN_GOAL_LIST_EVENT,
        handleOpenGoalListEventCallback as EventListener,
      );
      window.removeEventListener(
        OPEN_SETTINGS_EVENT,
        handleOpenSettingsEventCallback as EventListener,
      );
      window.removeEventListener(
        SIDEBAR_REFRESH_LISTS_EVENT,
        handleSidebarRefreshEvent,
      );
      window.removeEventListener(
        "app-data-imported",
        handleAppDataImportedEvent as EventListener,
      );
    };
  }, [
    handleOpenGoalListEventCallback,
    handleOpenSettingsEventCallback,
    refreshListsAndTabs,
    handleDataImported,
  ]);

  const handleGlobalFilterChange = useCallback((query: string) => {
    setGlobalFilterText(query);
  }, []);

  const handleTagClickFromGoalRenderer = useCallback(
    (tagFilterTerm: string) => {
      setGlobalFilterText(tagFilterTerm);
      document
        .querySelector<HTMLInputElement>(
          '.h-10 input[type="text"][placeholder="Фільтрувати цілі..."]',
        )
        ?.focus();
    },
    [],
  );

  useEffect(() => {
    const refinedGlobalKeyDownHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const inputPanelElement = inputPanelGlobalRef.current?.localInputRef;

      // 1. Якщо головна панель вводу вже активна, нічого не робимо.
      // Це дозволить вводити символ "/" як звичайно.
      if (document.activeElement === inputPanelElement) {
        return;
      }

      // 2. Якщо у фокусі будь-яке інше поле вводу/тексту, також нічого не робимо.
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // 3. Якщо ми тут, то жодне поле вводу не активне.
      // Тепер можна перевіряти наш хоткей.
      if (
        event.code === "Slash" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Запобігаємо стандартній дії (введенню "/")
        event.preventDefault();
        // І активуємо нашу панель вводу в режимі додавання
        inputPanelGlobalRef.current?.switchToMode(CommandMode.ADD, "");
      }
    };

    window.addEventListener("keydown", refinedGlobalKeyDownHandler);
    return () => {
      window.removeEventListener("keydown", refinedGlobalKeyDownHandler);
    };
  }, []); // Залежностей немає, бо inputPanelGlobalRef.current є стабільним

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (activeTabId !== tabId) {
        setActiveTabId(tabId);
        const clickedTab = tabs.find((t) => t.id === tabId);
        if (clickedTab?.type === "goal-list") {
          setGlobalFilterText("");
          setRefreshSignal((prev: number) => prev + 1);
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
          if (newTabs.length > 0) {
            const newActiveIndex = Math.max(0, indexToClose - 1);
            setActiveTabId(
              newTabs[newActiveIndex < newTabs.length ? newActiveIndex : 0].id,
            );
          } else {
            setActiveTabId(null);
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
    }
    setActiveTabId(settingsTabId);
  }, [tabs]);

  const promptCreateNewList = useCallback(async () => {
    const name = prompt("Введіть назву нового списку:");
    if (name?.trim()) {
      // dispatch(listAdded({ name: name.trim() }));
      // Примітка: dispatch не повертає створений об'єкт, тому відкрити нову вкладку одразу
      // стає складніше. Найпростіше - користувач сам клікне на новий список у сайдбарі,
      // який з'явиться автоматично.
      // Для автоматичного відкриття потрібна складніша логіка з thunk.
      // Поки що залишимо лише створення.
      alert(
        `Список "${name.trim()}" створено. Ви можете відкрити його з бічної панелі.`,
      );
    }
  }, [dispatch]);

  const handleDeleteList = useCallback(
    (listId: string) => {
      const listToDelete = goalLists[listId];
      if (
        listToDelete &&
        window.confirm(`Видалити список "${listToDelete.name}"?`)
      ) {
        dispatch(listRemoved(listId));
        // refreshListsAndTabs() та dispatchEvent() більше не потрібні!
        // Redux оновить UI автоматично.
      }
    },
    [goalLists, dispatch], // dispatch додається в залежності
  );

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
      try {
        dispatch(
          listUpdated({
            id: editingList.id,
            name: editingListName.trim(),
            description: editingListDescription.trim(),
          }),
        );
        handleCancelEditList();
      } catch (error) {
        // Обробка помилок (наприклад, валідації) може залишитись, якщо вона є в редюсері
        alert((error as Error).message);
      }
    } else if (editingList && !editingListName.trim()) {
      alert("Назва списку не може бути порожньою.");
    }
  }, [
    editingList,
    editingListName,
    editingListDescription,
    dispatch,
    handleCancelEditList,
  ]);

  const handleAddGoalToCurrentList = useCallback(
    (listId: string, text: string) => {
      if (!listId) {
        alert("Будь ласка, спочатку виберіть або відкрийте список.");
        return;
      }
      try {
        dispatch(goalAdded({ listId, text }));
        // setRefreshSignal більше не потрібен!
      } catch (error: any) {
        alert((error as Error).message);
      }
    },
    [dispatch],
  );

  const handleSearchGoals = useCallback(
    (query: string) => handleGlobalFilterChange(query),
    [handleGlobalFilterChange],
  );

  const handleNavigateToListByIdOrName = useCallback(
    (listQuery: string) => {
      const allLists = Object.values(goalLists);
      const lowerQuery = listQuery.toLowerCase().trim();
      const foundList = allLists.find(
        (l: GoalList) =>
          l.id === lowerQuery || l.name.toLowerCase() === lowerQuery, // Виправлено тип
      );
      if (foundList) {
        const eventDetail: OpenGoalListDetail = {
          listId: foundList.id,
          listName: foundList.name,
        };
        window.dispatchEvent(
          new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
            detail: eventDetail,
          }),
        );
      } else {
        alert(`Список "${listQuery}" не знайдено.`);
      }
    },
    [goalLists],
  );

  const handleExecuteAppCommand = useCallback(
    (commandWithArgs: string) => {
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
            dispatch(listUpdated({ id: currentActiveListId, name: argString }));
          } else if (!currentActiveListId) {
            alert("Спочатку відкрийте список.");
          } else {
            alert("Вкажіть нову назву: > rename-list Нова Назва");
          }
          break;
        default:
          alert(`Невідома команда: ${command}`);
      }
    },
    [dispatch, tabs, currentActiveListId],
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
    window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
  }, []);

  const renderActiveTabContent = () => {
    if (tabs.length === 0 && !activeTabId) {
      return (
        <NoListSelected
          onSelectList={(id: string) => {
            // Виправлено тип
            const listToOpen = goalLists[id];
            if (listToOpen)
              dispatchOpenGoalListEvent(listToOpen.id, listToOpen.name);
          }}
          onCreateList={promptCreateNewList}
        />
      );
    }
    const activeTabData = tabs.find((tab) => tab.id === activeTabId);
    if (activeTabId && !activeTabData && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
      return null;
    }
    if (!activeTabData) {
      return tabs.length === 0 ? (
        <NoListSelected
          onCreateList={promptCreateNewList}
          onSelectList={(id: string) => {}} // Виправлено тип
        />
      ) : (
        <div>Помилка: Активна вкладка не знайдена.</div>
      );
    }

    switch (activeTabData.type) {
      case "goal-list":
        if (!activeTabData.listId) {
          return (
            <div className="p-4">
              Помилка: ID списку для вкладки не знайдено.
            </div>
          );
        }
        const listExists = goalLists[activeTabData.listId];
        if (!listExists) {
          return (
            <div className="p-4 text-slate-600 dark:text-slate-400">
              Список видалено.
            </div>
          );
        }

        return (
          <Droppable droppableId={activeTabData.listId!} type="GOAL">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`h-full ${snapshot.isDraggingOver ? "bg-green-50 dark:bg-green-900/30" : ""}`}
              >
                <GoalListPage
                  key={`${activeTabData.listId!}-${refreshSignalForAllTabs}`}
                  listId={activeTabData.listId!}
                  filterText={globalFilterText}
                  obsidianVaultName={obsidianVaultPath}
                  onTagClickForFilter={handleTagClickFromGoalRenderer}
                />
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        );

      case "settings":
        return (
          <SettingsPage
            currentTheme={currentThemePreference}
            onChangeTheme={onChangeThemePreference}
            initialObsidianVault={obsidianVaultPath}
            onObsidianVaultChange={onObsidianVaultChange}
            onDataImported={handleDataImported}
          />
        );
      case "log":
        return <LogContent messages={logMessages} />;
      default:
        return <div className="p-4">Невідомий тип вкладки.</div>;
    }
  };

  const activeTabInfo = tabs.find((tab) => tab.id === activeTabId);
  const isCurrentTabAGoalList = activeTabInfo?.type === "goal-list";
  const listIdForToolbar = isCurrentTabAGoalList
    ? activeTabInfo?.listId || null
    : null;

  const handleToggleAutoSort = useCallback(
    (listId: string) => alert(`Дія: Авто-сортування для списку ${listId}`),
    [],
  );
  const handleCopyListId = useCallback(
    (listId: string) =>
      navigator.clipboard
        .writeText(listId)
        .then(() => alert(`ID списку "${listId}" скопійовано.`)),
    [],
  );
  const handleOpenListSettings = useCallback(
    (listId: string) => {
      const listToEdit = goalLists[listId];
      if (listToEdit) handleStartEditList(listToEdit);
      else alert("Список не знайдено.");
    },
    [goalLists, handleStartEditList],
  );

  const handleOpenImportArea = useCallback((listId: string) => {
    setListForImportExport(listId);
    setShowExportArea(false);
    setShowImportArea(true);
    setImportText("");
    setTimeout(() => importTextAreaRef.current?.focus(), 0);
  }, []);
  const handleOpenExportArea = useCallback(
    (listId: string) => {
      const list = goalLists[listId];
      const goalsToExport = list
        ? (list.itemInstanceIds
            .map((id) => goals[goalInstances[id]?.goalId])
            .filter(Boolean) as Goal[])
        : [];
      if (goalsToExport.length > 0) {
        setListForImportExport(listId);
        setShowImportArea(false);
        setExportText(formatGoalsForExport(goalsToExport));
        setShowExportArea(true);
        setTimeout(() => exportTextAreaRef.current?.select(), 0);
      }
    },
    [goals, goalLists],
  );
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
    if (lines.length > 0) {
      const goalsToImport = lines
        .map((line) => ({ text: line.trim(), completed: false }))
        .filter((g) => g.text.length > 0);
      if (goalsToImport.length > 0) {
        dispatch(
          goalsImported({
            listId: listForImportExport,
            goalsData: goalsToImport,
          }),
        );
        alert(`${goalsToImport.length} цілей імпортовано.`);
      } else {
        alert("Не знайдено тексту для імпорту.");
      }
    } else {
      alert("Не знайдено цілей для імпорту.");
    }
    handleCancelImportExport();
  }, [dispatch, listForImportExport, importText]);

  const handleCopyExportText = useCallback(() => {
    if (exportText && exportTextAreaRef.current) {
      navigator.clipboard
        .writeText(exportText)
        .then(() => alert("Експортовані цілі скопійовано!"))
        .catch(() => alert("Помилка копіювання."));
    }
  }, [exportText]);

  // src/renderer/components/MainPanel.tsx

  // src/renderer/components/MainPanel.tsx

  const handleSortByRating = useCallback(
    (listId: string) => {
      // 1. Отримуємо актуальні дані зі стану Redux
      const list = goalLists[listId];
      if (!list) {
        console.warn(`[handleSortByRating] Список з ID ${listId} не знайдено.`);
        return;
      }

      // 2. Збираємо повну інформацію про елементи в списку (екземпляр + оригінал цілі)
      const itemsInList = list.itemInstanceIds
        .map((instanceId) => {
          const instance = goalInstances[instanceId];
          if (!instance) return null;

          const goal = goals[instance.goalId];
          if (!goal) return null;

          return { instance, goal };
        })
        .filter(Boolean) as {
        instance: { id: string; goalId: string };
        goal: Goal;
      }[];

      if (itemsInList.length === 0) return;

      // 3. Розподіляємо елементи на групи для сортування
      const itemsWithRating: Array<{
        instance: { id: string; goalId: string };
        goal: Goal;
        ratingValue: number;
      }> = [];
      const itemsWithoutRating: Array<{
        instance: { id: string; goalId: string };
        goal: Goal;
      }> = [];

      itemsInList.forEach((item) => {
        // Виконані цілі завжди йдуть в кінець, їх не сортуємо за рейтингом
        if (item.goal.completed) {
          itemsWithoutRating.push(item);
          return;
        }

        const { rating } = parseGoalData(item.goal.text);
        if (rating !== undefined) {
          itemsWithRating.push({ ...item, ratingValue: rating });
        } else {
          itemsWithoutRating.push(item);
        }
      });

      // 4. Сортуємо групу з рейтингом (від більшого до меншого)
      itemsWithRating.sort((a, b) => {
        // Обробка нескінченних значень для надійного сортування
        if (a.ratingValue === Infinity && b.ratingValue !== Infinity) return -1;
        if (a.ratingValue !== Infinity && b.ratingValue === Infinity) return 1;
        if (a.ratingValue === -Infinity && b.ratingValue !== -Infinity)
          return 1;
        if (a.ratingValue !== -Infinity && b.ratingValue === -Infinity)
          return -1;
        return b.ratingValue - a.ratingValue;
      });

      // 5. Збираємо фінальний відсортований масив ID ЕКЗЕМПЛЯРІВ
      const sortedInstanceIds = [
        ...itemsWithRating.map((item) => item.instance.id),
        ...itemsWithoutRating
          .filter((item) => !item.goal.completed)
          .map((item) => item.instance.id),
        ...itemsWithoutRating
          .filter((item) => item.goal.completed)
          .map((item) => item.instance.id),
      ];

      // 6. Надсилаємо дію в Redux з новим порядком
      dispatch(
        goalOrderUpdated({ listId, orderedInstanceIds: sortedInstanceIds }),
      );
    },
    [dispatch, goals, goalLists, goalInstances],
  ); // Важливо вказати всі залежності

  useEffect(() => {
    const handleContentRefresh = () => {
      console.log(
        "[MainPanel] Отримано сигнал оновлення контенту. Оновлюємо refreshSignalForAllTabs.",
      );
      setRefreshSignalForAllTabs((prev) => prev + 1);
    };

    window.addEventListener(MAIN_PANEL_REFRESH_CONTENT, handleContentRefresh);

    return () => {
      window.removeEventListener(
        MAIN_PANEL_REFRESH_CONTENT,
        handleContentRefresh,
      );
    };
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
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md mb-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
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
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md mb-4 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
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
            Імпорт цілей
          </h3>
          <textarea
            ref={importTextAreaRef}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Вставте список цілей..."
            className="w-full h-24 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleCancelImportExport}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md font-medium"
            >
              Скасувати
            </button>
            <button
              onClick={handleSubmitImport}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md font-medium"
            >
              Імпортувати
            </button>
          </div>
        </div>
      )}
      {showExportArea && listForImportExport === currentActiveListId && (
        <div className="p-3 border-b border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-700/50 flex-shrink-0">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Експорт цілей
          </h3>
          <textarea
            ref={exportTextAreaRef}
            value={exportText}
            readOnly
            className="w-full h-32 p-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 select-all"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={handleCopyExportText}
              className="px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md font-medium"
            >
              Копіювати
            </button>
            <button
              onClick={handleCancelImportExport}
              className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-md font-medium"
            >
              Готово
            </button>
          </div>
        </div>
      )}
      <div className="flex-grow overflow-y-auto bg-slate-50 dark:bg-slate-800 min-h-0">
        {renderActiveTabContent()}
      </div>
      <div className="p-2 bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-700 shadow- ऊपर-md z-10 flex-shrink-0">
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

// src/renderer/components/MainPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import type { GoalList as GoalListType, Goal } from "../data/goalListsStore";
import * as goalListStore from "../data/goalListsStore";
import GoalListPage from "./GoalListPage";
import NoListSelected from "./NoListSelected";
import InputPanel, { CommandMode, InputPanelRef } from "./InputPanel";
import TabsContainer from "./TabsContainer";
import SettingsPage from "./SettingsPage";
import LogContent, { LogMessage } from "./LogContent";
import {
  OPEN_GOAL_LIST_EVENT,
  OpenGoalListDetail,
  SIDEBAR_REFRESH_LISTS_EVENT,
  MAIN_PANEL_REFRESH_CONTENT, // <-- Додайте імпорт нової константи
} from "./Sidebar"; // Переконайтеся, що Sidebar експортує це
import { OPEN_SETTINGS_EVENT } from "../events";
import ListToolbar from "./ListToolbar";
import {
  formatGoalsForExport,
  parseImportedText,
  parseGoalData,
} from "../utils/textProcessing";
import { Droppable } from "@hello-pangea/dnd"; // Залишіть тільки Droppable
import { error } from "console";
import { text } from "stream/consumers";
import SortableGoalItem from "./SortableGoalItem";

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
  const inputPanelGlobalRef = useRef<InputPanelRef>(null);

  const [tabs, setTabs] = useState<Tab[]>(() => {
    const savedTabs = localStorage.getItem("openTabs");
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as Tab[];
        return parsed.filter(
          (t) =>
            t.type !== "goal-list" ||
            (t.listId && !!goalListStore.getGoalListById(t.listId)),
        );
      } catch {
        /* ігноруємо помилку, повертаємо порожній масив */
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
              (t.listId && !!goalListStore.getGoalListById(t.listId)),
          );
        } catch {
          /* ігноруємо */
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
  const [refreshSignal, setRefreshSignal] = useState(0); // Цей сигнал для окремих GoalListPage, якщо потрібно
  const [refreshSignalForAllTabs, setRefreshSignalForAllTabs] = useState(0); // <--- ОГОЛОШЕНО ТУТ

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
      const updatedGoalListsFromStore = goalListStore.getAllGoalLists();
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
    setRefreshSignal((prev: number) => prev + 1); // <--- Додано тип для prev
  }, []); // Залежності setTabs, setActiveTabId, setRefreshSignal стабільні, якщо вони з useState

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
        // prevActiveTabId не потрібен
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
  }, [refreshListsAndTabs]); // Залежності setTabs, setActiveTabId стабільні

  const handleGoalMovedBetweenLists = useCallback(
    (sourceListId: string, destinationListId: string, movedGoalId: string) => {
      console.log(
        `[MainPanel] Goal ${movedGoalId} moved from ${sourceListId} to ${destinationListId}. Triggering refresh for all tabs and sidebar.`,
      );
      setRefreshSignalForAllTabs((prev: number) => prev + 1); // <--- Додано тип для prev
      window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
    },
    [], // setRefreshSignalForAllTabs стабільний
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

  const handleIncomingCustomUrl = useCallback((url: string) => {
    console.log(`[MainPanel] Received custom URL: ${url}`);
    if (!url || !url.startsWith(`${MY_APP_PROTOCOL}://`)) {
      console.warn(`[MainPanel] Invalid or non-matching protocol URL: ${url}`);
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
        pathAndCommandPart = urlWithoutProtocol.substring(0, questionMarkIndex);
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
        const listToOpen = goalListStore.getGoalListById(listIdFromQuery);
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
  }, []);

  const handleOpenGoalListEventCallback = useCallback(
    (event: Event) => {
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
      setRefreshSignal((prev: number) => prev + 1); // <--- Додано тип для prev
    },
    [], // Залежності setTabs, setActiveTabId, setGlobalFilterText, setRefreshSignal стабільні
  );

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
  }, []); // Залежності setTabs, setActiveTabId стабільні

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
        if (
          target !==
            document.querySelector(
              '.h-10 input[type="text"][placeholder="Фільтрувати цілі..."]',
            ) &&
          target !== inputPanelElement
        )
          return;
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

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (activeTabId !== tabId) {
        setActiveTabId(tabId);
        const clickedTab = tabs.find((t) => t.id === tabId);
        if (clickedTab?.type === "goal-list") {
          setGlobalFilterText("");
          setRefreshSignal((prev: number) => prev + 1); // <--- Додано тип для prev
        }
      }
    },
    [tabs, activeTabId],
  ); // setActiveTabId, setGlobalFilterText, setRefreshSignal стабільні

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
  ); // setActiveTabId стабільний

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
  }, [tabs]); // setActiveTabId, setTabs стабільні

  const promptCreateNewList = useCallback(async () => {
    const name = prompt("Введіть назву нового списку:");
    if (name?.trim()) {
      try {
        const newList = goalListStore.createGoalList(name.trim());
        window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
        const eventDetail: OpenGoalListDetail = {
          listId: newList.id,
          listName: newList.name,
        };
        window.dispatchEvent(
          new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
            detail: eventDetail,
          }),
        );
      } catch (error) {
        alert((error as Error).message);
      }
    }
  }, []);

  const handleDeleteList = useCallback(
    (listId: string) => {
      const listToDelete = goalListStore.getGoalListById(listId);
      if (
        listToDelete &&
        window.confirm(`Видалити список "${listToDelete.name}"?`)
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
  }, []); // setEditingList, setEditingListName, setEditingListDescription стабільні

  const handleCancelEditList = useCallback(() => {
    setEditingList(null);
    setEditingListName("");
    setEditingListDescription("");
  }, []); // setEditingList, setEditingListName, setEditingListDescription стабільні

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
        setRefreshSignal((prev: number) => prev + 1); // <--- Додано тип для prev
      } catch (error: any) {
        alert((error as Error).message);
      }
    },
    [],
  ); // setRefreshSignal стабільний

  const handleSearchGoals = useCallback(
    (query: string) => handleGlobalFilterChange(query),
    [handleGlobalFilterChange],
  );

  const handleNavigateToListByIdOrName = useCallback((listQuery: string) => {
    const allLists = goalListStore.getAllGoalLists();
    const lowerQuery = listQuery.toLowerCase().trim();
    const foundList = allLists.find(
      (l) => l.id === lowerQuery || l.name.toLowerCase() === lowerQuery,
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
  }, []);

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
              window.dispatchEvent(
                new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT),
              );
              const eventDetail: OpenGoalListDetail = {
                listId: newList.id,
                listName: newList.name,
              };
              window.dispatchEvent(
                new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
                  detail: eventDetail,
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
              goalListStore.updateGoalListName(currentActiveListId, argString);
              refreshListsAndTabs();
              window.dispatchEvent(
                new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT),
              );
            } catch (error) {
              alert((error as Error).message);
            }
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
    [refreshListsAndTabs, tabs, currentActiveListId],
  ); // setActiveTabId, setTabs стабільні

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
            /* ... */
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
          onSelectList={() => {}}
        />
      ) : (
        <div>Помилка: Активна вкладка не знайдена.</div>
      );
    }

    switch (activeTabData.type) {
      case "goal-list":
        if (!activeTabData.listId) {
          // <--- Перевірка, чи listId існує
          return (
            <div className="p-4">
              Помилка: ID списку для вкладки не знайдено.
            </div>
          );
        }
        const listExists = goalListStore.getGoalListById(activeTabData.listId);
        if (!listExists) {
          return (
            <div className="p-4 text-slate-600 dark:text-slate-400">
              Список видалено.
            </div>
          );
        }
        const goalsForCurrentList = goalListStore.getGoalsForList(
          activeTabData.listId!,
        );

        return (
          <Droppable droppableId={activeTabData.listId!} type="GOAL">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`h-full ${snapshot.isDraggingOver ? "bg-green-50 dark:bg-green-900/30" : ""}`}
              >
                <GoalListPage
                  key={`${activeTabData.listId}-${refreshSignalForAllTabs}`}
                  listId={activeTabData.listId!} // <--- non-null assertion, оскільки ми перевірили вище
                  filterText={globalFilterText}
                  refreshSignal={refreshSignalForAllTabs}
                  obsidianVaultName={obsidianVaultPath}
                  onTagClickForFilter={handleTagClickFromGoalRenderer}
                  onNeedsSidebarRefresh={handleSidebarNeedsRefreshFromPage}
                  onGoalMovedBetweenLists={handleGoalMovedBetweenLists}
                />
                {provided.placeholder} {/* <--- ДОДАЙТЕ ПЛЕЙСХОЛДЕР ТУТ */}
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
        const _exhaustiveCheck: never = activeTabData.type;
        console.error("[MainPanel] Невідомий тип вкладки:", _exhaustiveCheck);
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
      const listToEdit = goalListStore.getGoalListById(listId);
      if (listToEdit) handleStartEditList(listToEdit);
      else alert("Список не знайдено.");
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
    const lines = parseImportedText(importText);
    if (lines.length > 0) {
      const goalsToImport = lines
        .map((line) => ({ text: line.trim(), completed: false }))
        .filter((g) => g.text.length > 0);
      if (goalsToImport.length > 0) {
        goalListStore.addMultipleGoalsToList(
          listForImportExport,
          goalsToImport,
        );
        setRefreshSignal((prev: number) => prev + 1); // <--- Додано тип для prev
        alert(`${goalsToImport.length} цілей імпортовано.`);
      } else {
        alert("Не знайдено тексту для імпорту.");
      }
    } else {
      alert("Не знайдено цілей для імпорту.");
    }
    handleCancelImportExport();
  }, [listForImportExport, importText]); // setRefreshSignal стабільний
  const handleCopyExportText = useCallback(() => {
    if (exportText && exportTextAreaRef.current) {
      navigator.clipboard
        .writeText(exportText)
        .then(() => alert("Експортовані цілі скопійовано!"))
        .catch(() => alert("Помилка копіювання."));
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
      if (rating !== undefined)
        goalsWithRating.push({ goal, ratingValue: rating });
      else goalsWithoutRating.push(goal);
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
      ...goalsWithoutRating.filter((g) => !g.completed).map((goal) => goal.id),
      ...goalsWithoutRating.filter((g) => g.completed).map((goal) => goal.id),
    ];
    try {
      goalListStore.updateGoalOrderInList(listId, sortedGoalIds);
      setRefreshSignal((prev: number) => prev + 1); // <--- Додано тип для prev
    } catch (error) {
      alert(`Помилка сортування: ${(error as Error).message}`);
    }
  }, []); // setRefreshSignal стабільний

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
  }, []); // Порожній масив залежностей, щоб слухач додався один раз

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

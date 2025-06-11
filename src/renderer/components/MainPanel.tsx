// src/renderer/components/MainPanel.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import type { GoalList, Goal } from "../data/goalListsStore";
import * as goalListStore from "../data/goalListsStore";
import GoalListPage from "./GoalListPage";
import NoListSelected from "./NoListSelected";
import InputPanel, { CommandMode, InputPanelRef } from "./InputPanel";
import TabsContainer from "./TabsContainer";
import SettingsPage from "./SettingsPage";
import LogContent, { LogMessage } from "./LogContent";
import { OPEN_GOAL_LIST_EVENT, OpenGoalListDetail } from "./Sidebar";
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

function MainPanel({
  currentThemePreference,
  onChangeThemePreference,
  obsidianVaultPath,
  onObsidianVaultChange,
}: MainPanelProps) {
  const inputPanelGlobalRef = useRef<InputPanelRef>(null);

  const [goalLists, setGoalLists] = useState<GoalList[]>(() =>
    goalListStore.getAllGoalLists()
  );
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const savedTabs = localStorage.getItem("openTabs");
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as Tab[];
        const allLists = goalListStore.getAllGoalLists();
        return parsed.filter(
          (t) =>
            t.type !== "goal-list" ||
            allLists.some((l: GoalList) => l.id === t.listId)
        );
      } catch {
        return [];
      }
    }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(() => {
    const savedActiveTabId = localStorage.getItem("activeTabId");
    const currentTabs = (() => {
      const saved = localStorage.getItem("openTabs");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Tab[];
          const allLists = goalListStore.getAllGoalLists();
          return parsed.filter(
            (t) =>
              t.type !== "goal-list" ||
              allLists.some((l: GoalList) => l.id === t.listId)
          );
        } catch {
          return [];
        }
      }
      return [];
    })();
    if (savedActiveTabId && currentTabs.find((t) => t.id === savedActiveTabId))
      return savedActiveTabId;
    return currentTabs.length > 0 ? currentTabs[0].id : null;
  });
  const [editingList, setEditingList] = useState<GoalList | null>(null);
  const [editingListName, setEditingListName] = useState("");

  const [globalFilterText, setGlobalFilterText] = useState("");

  const [logMessages, setLogMessages] = useState<LogMessage[]>(initialLogs);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const editingListModalRef = useRef<HTMLDivElement>(null);

  const [showImportArea, setShowImportArea] = useState(false);
  const [importText, setImportText] = useState("");
  const [showExportArea, setShowExportArea] = useState(false);
  const [exportText, setExportText] = useState("");
  const [listForImportExport, setListForImportExport] = useState<string | null>(
    null
  );

  const importTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const exportTextAreaRef = useRef<HTMLTextAreaElement>(null);

  const getActiveListIdFromTab = useCallback((): string | null => {
    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    return activeTab?.type === "goal-list" ? activeTab.listId || null : null;
  }, [tabs, activeTabId]);

  const currentActiveListId = getActiveListIdFromTab();

  const refreshListsAndTabs = useCallback(() => {
    const updatedGoalLists = goalListStore.getAllGoalLists();
    setGoalLists([...updatedGoalLists]);

    setTabs((prevTabs) => {
      const newTabs = prevTabs
        .map((tab) => {
          if (tab.type === "goal-list" && tab.listId) {
            const correspondingList = updatedGoalLists.find(
              (l: GoalList) => l.id === tab.listId
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
        const newActiveId = newTabs.length > 0 ? newTabs[0].id : null;
        setActiveTabId(newActiveId);
      } else if (newTabs.length === 0 && activeTabId) {
        setActiveTabId(null);
      } else if (!activeTabId && newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      }
      return newTabs;
    });
  }, [activeTabId]);

  useEffect(() => {
    localStorage.setItem("openTabs", JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    if (activeTabId) localStorage.setItem("activeTabId", activeTabId);
    else localStorage.removeItem("activeTabId");
  }, [activeTabId]);

  // Обробник для зміни фільтра (з ListToolbar або через клік на тег)
  const handleGlobalFilterChange = useCallback((query: string) => {
    setGlobalFilterText(query);
    // Немає прямої взаємодії з InputPanel тут, якщо InputPanel має свою логіку.
    // InputPanel викличе onSearch (цей же handleGlobalFilterChange), якщо пошук ініційовано з нього.
  }, []);

  const handleTagClickFromGoalRenderer = useCallback(
    (tagFilterTerm: string) => {
      console.log(
        `[MainPanel] Tag clicked from renderer, setting global filter to: ${tagFilterTerm}`
      );
      // Оновлюємо globalFilterText, який використовується ListToolbar та GoalListPage
      setGlobalFilterText(tagFilterTerm);

      // Фокусуємося на полі фільтра в ListToolbar для кращого UX
      const listToolbarFilterInput = document.querySelector<HTMLInputElement>(
        '.h-10 input[type="text"][placeholder="Фільтрувати цілі..."]'
      );
      if (listToolbarFilterInput) {
        // Переконуємось, що значення в полі теж оновилося перед фокусом,
        // хоча React має це зробити синхронно в рамках одного рендеру.
        // Якщо б були проблеми, можна було б listToolbarFilterInput.value = tagFilterTerm;
        // але зазвичай це не потрібно, бо React оновить value через проп filterText в ListToolbar.
        listToolbarFilterInput.focus();
      }
    },
    []
  ); // Залежності setGlobalFilterText стабільні

  useEffect(() => {
    const TARGET_KEYCODE = "Slash"; // Код клавіші "/"
    const refinedGlobalKeyDownHandler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Припускаємо, що InputPanelRef має властивість `localInputRef` для доступу до DOM елемента
      // або ми можемо перевіряти сам inputPanelGlobalRef.current, якщо він містить сам input
      const inputPanelElement = inputPanelGlobalRef.current?.localInputRef;

      // Якщо фокус вже на InputPanel або на іншому полі вводу, нічого не робимо
      if (
        (inputPanelElement && document.activeElement === inputPanelElement) ||
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Додаткова перевірка, щоб не перехоплювати "/" у фільтрі ListToolbar
        const listToolbarFilterInput = document.querySelector(
          '.h-10 input[type="text"][placeholder="Фільтрувати цілі..."]'
        );
        if (target === listToolbarFilterInput) {
          return;
        }
        // Якщо це не фільтр ListToolbar, але інше поле вводу - також виходимо
        if (target !== inputPanelElement) return; // Якщо це інший інпут, не InputPanel
      }

      if (event.code === TARGET_KEYCODE) {
        // Запобігаємо стандартній дії браузера для "/" (наприклад, швидкий пошук у Firefox)
        event.preventDefault();

        if (inputPanelGlobalRef.current) {
          // Фокусуємося на InputPanel
          inputPanelGlobalRef.current.focus();
          // Перемикаємо в режим ADD і очищуємо значення
          inputPanelGlobalRef.current.switchToMode(CommandMode.ADD, "");
        }
      }
    };

    window.addEventListener("keydown", refinedGlobalKeyDownHandler);
    return () => {
      window.removeEventListener("keydown", refinedGlobalKeyDownHandler);
    };
  }, []);

  useEffect(() => {
    const handleOpenGoalList = (event: CustomEvent<OpenGoalListDetail>) => {
      const { listId, listName } = event.detail;
      const tabId = `goal-list-${listId}`;
      setTabs((prevTabs) => {
        if (prevTabs.find((tab) => tab.id === tabId)) {
          return prevTabs;
        }
        const newTab: Tab = {
          id: tabId,
          type: "goal-list",
          title: listName,
          listId,
          isClosable: true,
        };
        return [...prevTabs, newTab];
      });
      setActiveTabId(tabId);
      setGlobalFilterText("");
      setRefreshSignal((prev) => prev + 1);
    };
    const handleOpenSettings = () => {
      const settingsTabId = "settings-tab";
      setTabs((prevTabs) => {
        if (prevTabs.find((tab) => tab.id === settingsTabId)) {
          return prevTabs;
        }
        return [
          ...prevTabs,
          {
            id: settingsTabId,
            type: "settings",
            title: "Налаштування",
            isClosable: true,
          },
        ];
      });
      setActiveTabId(settingsTabId);
    };
    window.addEventListener(
      OPEN_GOAL_LIST_EVENT,
      handleOpenGoalList as EventListener
    );
    window.addEventListener(
      OPEN_SETTINGS_EVENT,
      handleOpenSettings as EventListener
    );
    return () => {
      window.removeEventListener(
        OPEN_GOAL_LIST_EVENT,
        handleOpenGoalList as EventListener
      );
      window.removeEventListener(
        OPEN_SETTINGS_EVENT,
        handleOpenSettings as EventListener
      );
    };
  }, []);

  const handleTabClick = useCallback(
    (tabId: string) => {
      const clickedTab = tabs.find((t) => t.id === tabId);
      if (activeTabId !== tabId) {
        setActiveTabId(tabId);
        if (clickedTab?.type === "goal-list") {
          setRefreshSignal((prev) => prev + 1);
        }
      }
    },
    [tabs, activeTabId]
  );

  // // НОВИЙ КОЛБЕК для обробки Escape з ListToolbar
  // const handleEscapeFromListToolbar = useCallback(() => {
  //   if (inputPanelGlobalRef.current) {
  //     // Спочатку перемикаємо режим і очищуємо поле, потім фокусуємо
  //     inputPanelGlobalRef.current.switchToMode(CommandMode.ADD, "");
  //     // focus() вже викликається всередині switchToMode в InputPanel, якщо він реалізований так
  //     // Якщо ні, то розкоментувати:
  //     // inputPanelGlobalRef.current.focus();
  //   }
  // }, []); // Немає залежностей, оскільки inputPanelGlobalRef стабільний

  const handleTabClose = useCallback(
    (tabIdToClose: string) => {
      setTabs((prevTabs) => {
        const indexToClose = prevTabs.findIndex(
          (tab) => tab.id === tabIdToClose
        );
        if (indexToClose === -1) return prevTabs;

        const newTabs = prevTabs.filter((tab) => tab.id !== tabIdToClose);
        if (activeTabId === tabIdToClose) {
          if (newTabs.length > 0) {
            const nextTab =
              newTabs[indexToClose] || newTabs[indexToClose - 1] || newTabs[0];
            setActiveTabId(nextTab.id);
            if (nextTab.type === "goal-list")
              setRefreshSignal((prev) => prev + 1);
          } else {
            setActiveTabId(null);
          }
        }
        return newTabs;
      });
    },
    [activeTabId]
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
        setRefreshSignal((prev) => prev + 1);
      } catch (error) {
        alert((error as Error).message);
      }
    }
  }, [refreshListsAndTabs]);

  const handleDeleteList = useCallback(
    (listId: string) => {
      const listToDelete = goalLists.find((l: GoalList) => l.id === listId);
      if (
        listToDelete &&
        window.confirm(
          `Видалити список "${listToDelete.name}" та всі його цілі?`
        )
      ) {
        goalListStore.deleteGoalList(listId);
        refreshListsAndTabs();
      }
    },
    [goalLists, refreshListsAndTabs]
  );

  const handleStartEditList = useCallback((list: GoalList) => {
    setEditingList(list);
    setEditingListName(list.name);
  }, []);

  const handleCancelEditList = useCallback(() => {
    setEditingList(null);
    setEditingListName("");
  }, []);

  const handleSubmitEditList = useCallback(() => {
    if (editingList && editingListName.trim()) {
      try {
        goalListStore.updateGoalListName(
          editingList.id,
          editingListName.trim()
        );
        refreshListsAndTabs();
        handleCancelEditList();
      } catch (error) {
        alert((error as Error).message);
      }
    }
  }, [editingList, editingListName, refreshListsAndTabs, handleCancelEditList]);

  const handleAddGoalToCurrentList = useCallback(
    (listId: string, text: string) => {
      // ... (без змін)
      if (!listId) {
        alert("Будь ласка, спочатку виберіть список.");
        return;
      }
      try {
        goalListStore.addGoalToList(listId, text);
        setRefreshSignal((prev) => prev + 1);
      } catch (error) {
        alert((error as Error).message);
      }
    },
    []
  );
  const handleSearchGoals = useCallback(
    (query: string) => {
      handleGlobalFilterChange(query); // Використовує той самий фільтр
    },
    [handleGlobalFilterChange]
  );
  const handleNavigateToListByIdOrName = useCallback(
    (listQuery: string) => {
      const allGoalLists = goalListStore.getAllGoalLists();
      const lowerQuery = listQuery.toLowerCase();
      let foundList = allGoalLists.find(
        (list: GoalList) =>
          list.id === listQuery || list.name.toLowerCase() === lowerQuery
      );

      if (foundList) {
        const tabId = `goal-list-${foundList.id}`;
        if (!tabs.find((t) => t.id === tabId)) {
          setTabs((prev) => [
            ...prev,
            {
              id: tabId,
              type: "goal-list",
              title: foundList!.name,
              listId: foundList!.id,
              isClosable: true,
            },
          ]);
        }
        setActiveTabId(tabId);
        setGlobalFilterText("");
        setRefreshSignal((prev) => prev + 1);
      } else {
        alert(`Список "${listQuery}" не знайдено.`);
      }
    },
    [tabs]
  );

  const handleExecuteAppCommand = useCallback(
    (commandWithArgs: string) => {
      const [command, ...args] = commandWithArgs.trim().split(/\s+/);
      const argString = args.join(" ");

      switch (command.toLowerCase()) {
        case "create-list":
        case "new-list":
          if (argString) {
            try {
              const newList = goalListStore.createGoalList(argString);
              refreshListsAndTabs();
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
              setRefreshSignal((prev) => prev + 1);
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
    [refreshListsAndTabs, tabs, currentActiveListId]
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editingList, handleCancelEditList]);

  const renderActiveTabContent = () => {
    // ... (без змін, GoalListPage отримує globalFilterText та handleTagClickFromGoalRenderer) ...
    if (tabs.length === 0) {
      return (
        <NoListSelected
          onSelectList={(id: string) => {
            const list = goalLists.find((l: GoalList) => l.id === id);
            if (list) {
              const tabId = `goal-list-${id}`;
              setTabs((prev) => [
                ...prev,
                {
                  id: tabId,
                  type: "goal-list",
                  title: list.name,
                  listId: id,
                  isClosable: true,
                },
              ]);
              setActiveTabId(tabId);
              setRefreshSignal((prev) => prev + 1);
            }
          }}
          onCreateList={promptCreateNewList}
        />
      );
    }
    if (!activeTabId && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
      if (tabs[0].type === "goal-list") setRefreshSignal((prev) => prev + 1);
      return null;
    }

    const activeTabData = tabs.find((tab) => tab.id === activeTabId);
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
          const listExists = goalLists.find(
            (gl: GoalList) => gl.id === activeTabData.listId
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
              filterText={globalFilterText} // Фільтр для поточного списку
              refreshSignal={refreshSignal}
              obsidianVaultName={obsidianVaultPath}
              onTagClickForFilter={handleTagClickFromGoalRenderer} // Обробник кліку на тег
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
        const _exhaustiveCheck: never = activeTabData.type; // Для перевірки повноти switch
        return (
          <div className="p-4 text-slate-600 dark:text-slate-400">
            Невідомий тип вкладки: {_exhaustiveCheck}
          </div>
        );
    }
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const isCurrentTabAGoalList = activeTab?.type === "goal-list";
  const listIdForToolbar = isCurrentTabAGoalList
    ? activeTab?.listId || null
    : null;

  const handleToggleAutoSort = useCallback((listId: string) => {
    alert(`Дія: Перемкнути авто-сортування для списку ${listId}`);
  }, []);

  const handleCopyListId = useCallback((listId: string) => {
    navigator.clipboard
      .writeText(listId)
      .then(() => alert(`ID списку "${listId}" скопійовано в буфер обміну.`))
      .catch((err) => {
        console.error("Could not copy text: ", err);
        alert("Не вдалося скопіювати ID.");
      });
  }, []);

  const handleOpenListSettings = useCallback((listId: string) => {
    alert(`Дія: Відкрити налаштування для списку ${listId}`);
  }, []);

  const handleOpenImportArea = useCallback((listId: string) => {
    setListForImportExport(listId);
    setShowExportArea(false);
    setShowImportArea(true);
    setImportText("");
    setTimeout(() => importTextAreaRef.current?.focus(), 0);
  }, []);

  const handleOpenExportArea = useCallback((listId: string) => {
    const list = goalListStore.getGoalListById(listId);
    if (list) {
      setListForImportExport(listId);
      setShowImportArea(false);
      setExportText(formatGoalsForExport(list.goals));
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
    const parsedGoals = parseImportedText(importText);
    if (parsedGoals.length > 0) {
      goalListStore.addMultipleGoalsToList(listForImportExport, parsedGoals);
      setRefreshSignal((prev) => prev + 1);
      alert(`${parsedGoals.length} цілей імпортовано до списку.`);
    } else {
      alert("Не знайдено цілей для імпорту в наданому тексті.");
    }
    handleCancelImportExport();
  }, [listForImportExport, importText]);

  const handleCopyExportText = useCallback(() => {
    if (exportText && exportTextAreaRef.current) {
      navigator.clipboard
        .writeText(exportText)
        .then(() => alert("Експортовані цілі скопійовано до буфера обміну!"))
        .catch((err) => {
          console.error("Не вдалося скопіювати текст: ", err);
          alert("Помилка копіювання.");
        });
    }
  }, [exportText]);

  const handleSortByRating = useCallback((listId: string) => {
    const list = goalListStore.getGoalListById(listId);
    if (!list) return;

    const goalsWithRating: Array<{ goal: Goal; ratingValue: number }> = [];
    const goalsWithoutRating: Goal[] = [];

    list.goals.forEach((goal) => {
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
      goalListStore.updateGoalOrder(listId, sortedGoalIds);
      setRefreshSignal((prev) => prev + 1);
    } catch (error) {
      alert(`Помилка сортування цілей: ${(error as Error).message}`);
    }
  }, []);

  // ... (весь код до return залишається таким, як у попередній відповіді)

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-200 dark:bg-slate-950">
      {editingList && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 flex items-center justify-center p-4">
          <div
            ref={editingListModalRef}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md text-slate-800 dark:text-slate-200"
          >
            <h2 className="text-xl font-semibold mb-4">
              Редагувати назву списку
            </h2>
            <input
              type="text"
              value={editingListName}
              onChange={(e) => setEditingListName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md mb-4 
                               bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                               focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 placeholder-slate-400 dark:placeholder-slate-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmitEditList();
                if (e.key === "Escape") handleCancelEditList();
              }}
              autoFocus
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
          // onEscapeAndFocusInputPanel={handleEscapeFromListToolbar} // <-- ПЕРЕДАЄМО НОВИЙ КОЛБЕК
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
  // ... (закриваюча дужка для MainPanel та export default)
}
export default MainPanel;

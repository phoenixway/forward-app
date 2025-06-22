// src/renderer/App.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import "./styles.css"; // Глобальні стилі або стилі для App
import Layout from "./components/Layout";
import MainPanel from "./components/MainPanel";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import Sidebar, { MAIN_PANEL_REFRESH_CONTENT } from "./components/Sidebar";
import { SIDEBAR_REFRESH_LISTS_EVENT } from "./events";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "./store/store";
import {
  goalOrderUpdated,
  goalMoved,
  goalReferenceAdded,
} from "./store/listsSlice";

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const OBSIDIAN_VAULT_SETTING_KEY = "obsidianVaultPath";

const App: React.FC = () => {
  console.log("[App.tsx] Рендеринг компонента App");
  const dispatch = useDispatch<AppDispatch>();

  const goals = useSelector((state: RootState) => state.goals);
  const isCtrlPressedRef = useRef(false);
  const { goalLists, goalInstances } = useSelector((state: RootState) => ({
    goalLists: state.goalLists,
    goalInstances: state.goalInstances,
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        isCtrlPressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        isCtrlPressedRef.current = false;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId, type } = result;

      if (!destination || type !== "GOAL") {
        isCtrlPressedRef.current = false; // Скидаємо на випадок скасування
        return;
      }

      const sourceListId = source.droppableId;
      let destinationListId = destination.droppableId;
      if (destination.droppableId.startsWith("sidebar-")) {
        destinationListId = destination.droppableId.substring(
          "sidebar-".length,
        );
      }

      const instanceId = draggableId; // В DND draggableId - це наш instanceId

      // Перевіряємо, чи натиснута клавіша Ctrl і чи це перетягування між різними списками
      if (isCtrlPressedRef.current && sourceListId !== destinationListId) {
        // --- Логіка створення посилання ---
        const instance = goalInstances[instanceId];
        if (instance && instance.goalId) {
          dispatch(
            goalReferenceAdded({
              listId: destinationListId,
              goalId: instance.goalId,
            }),
          );
        } else {
          console.warn(
            `Не вдалося знайти оригінал цілі для екземпляра ${instanceId}`,
          );
        }
      } else if (sourceListId === destinationListId) {
        // --- Логіка сортування в межах одного списку ---
        const list = goalLists[sourceListId];
        if (!list) return;

        const reorderedInstanceIds = Array.from(list.itemInstanceIds);
        const [movedItem] = reorderedInstanceIds.splice(source.index, 1);
        reorderedInstanceIds.splice(destination.index, 0, movedItem);

        dispatch(
          goalOrderUpdated({
            listId: sourceListId,
            orderedInstanceIds: reorderedInstanceIds,
          }),
        );
      } else {
        // --- Логіка переміщення (стандартна поведінка) ---
        dispatch(
          goalMoved({
            instanceId: instanceId,
            sourceListId: sourceListId,
            destinationListId: destinationListId,
            destinationIndex: destination.index,
          }),
        );
      }

      // Завжди скидаємо стан клавіші після завершення операції
      isCtrlPressedRef.current = false;
    },
    [dispatch, goalLists, goalInstances],
  );

  // --- Сигнал готовності рендерера ---
  useEffect(() => {
    console.log(
      "[App.tsx] Компонент App змонтовано (didMount). Надсилаємо сигнал RENDERER_READY_FOR_URL.",
    );
    if (
      window.electronAPI &&
      typeof window.electronAPI.rendererReadyForUrl === "function"
    ) {
      window.electronAPI.rendererReadyForUrl();
      console.log(
        "[App.tsx] Сигнал RENDERER_READY_FOR_URL надіслано до main процесу.",
      );
    } else {
      console.warn(
        "[App.tsx] window.electronAPI.rendererReadyForUrl не доступний.",
      );
    }

    return () => {
      console.log("[App.tsx] Компонент App буде розмонтовано (willUnmount)");
    };
  }, []); // Порожній масив, щоб спрацювало один раз при монтуванні

  // --- Логіка теми ---
  const [userPreference, setUserPreference] = useState<string>(() => {
    const saved = localStorage.getItem("themePreference");
    console.log(
      `[App.tsx] Ініціалізація userPreference з localStorage: ${saved || "system"}`,
    );
    return saved || "system";
  });

  const applyTheme = useCallback((themeToApply: string) => {
    console.log(`[App.tsx] applyTheme викликано з: ${themeToApply}`);
    document.documentElement.classList.remove("light", "dark");
    if (themeToApply === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.add("light");
    }
  }, []);

  useEffect(() => {
    console.log(
      `[App.tsx] useEffect[userPreference, applyTheme] для збереження теми: ${userPreference}`,
    );
    localStorage.setItem("themePreference", userPreference);
    if (userPreference === "system") {
      const systemPrefersDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      applyTheme(systemPrefersDark ? "dark" : "light");
    } else {
      applyTheme(userPreference);
    }
  }, [userPreference, applyTheme]);

  useEffect(() => {
    if (userPreference !== "system") {
      console.log(
        '[App.tsx] useEffect[userPreference, applyTheme] для системної теми: userPreference не "system", вихід.',
      );
      return;
    }
    console.log(
      "[App.tsx] useEffect[userPreference, applyTheme] для системної теми: додавання слухача mediaQuery.",
    );
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      console.log(
        `[App.tsx] Системна тема змінилася, нова перевага темної: ${e.matches}`,
      );
      applyTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      console.log(
        "[App.tsx] useEffect[userPreference, applyTheme] для системної теми: видалення слухача mediaQuery.",
      );
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [userPreference, applyTheme]);

  const handleThemePreferenceChange = useCallback((newPreference: string) => {
    console.log(
      `[App.tsx] handleThemePreferenceChange: нова перевага ${newPreference}`,
    );
    setUserPreference(newPreference);
  }, []);

  // --- Логіка Obsidian Vault Path ---
  const [obsidianVaultPath, setObsidianVaultPath] = useState<string>("");

  useEffect(() => {
    console.log("[App.tsx] useEffect[] для завантаження налаштувань Obsidian.");
    const loadSettings = async () => {
      if (
        window.electronAPI &&
        typeof window.electronAPI.getAppSettings === "function"
      ) {
        try {
          console.log(
            "[App.tsx] loadSettings: Виклик window.electronAPI.getAppSettings()",
          );
          const settings = await window.electronAPI.getAppSettings();
          console.log(
            "[App.tsx] loadSettings: Отримано налаштування:",
            settings,
          );
          if (
            settings &&
            typeof settings[OBSIDIAN_VAULT_SETTING_KEY] === "string"
          ) {
            setObsidianVaultPath(settings[OBSIDIAN_VAULT_SETTING_KEY]);
          }
        } catch (error) {
          console.warn("[App.tsx] Failed to load app settings:", error);
        }
      } else {
        console.warn("[App.tsx] electronAPI.getAppSettings is not available.");
      }
    };
    loadSettings();
  }, []);

  const handleObsidianVaultChange = useCallback(async (newPath: string) => {
    console.log(`[App.tsx] handleObsidianVaultChange: новий шлях ${newPath}`);
    if (
      window.electronAPI &&
      typeof window.electronAPI.setAppSetting === "function"
    ) {
      try {
        const result = await window.electronAPI.setAppSetting(
          OBSIDIAN_VAULT_SETTING_KEY,
          newPath,
        );
        if (
          typeof result === "object" &&
          result !== null &&
          "success" in result
        ) {
          if (result.success) {
            setObsidianVaultPath(newPath);
          } else {
            console.error(
              "[App.tsx] Failed to save Obsidian Vault path: Main process reported failure.",
              result.message,
            );
            alert(
              `Не вдалося зберегти шлях: ${result.message || "Помилка на боці головного процесу."}`,
            );
          }
        } else {
          setObsidianVaultPath(newPath);
        }
      } catch (error: any) {
        console.error("[App.tsx] Failed to save Obsidian Vault path:", error);
        const errorMessage = error?.message || "Невідома помилка збереження.";
        alert(`Не вдалося зберегти шлях до Obsidian Vault: ${errorMessage}`);
      }
    } else {
      alert("API для збереження налаштувань недоступне.");
      console.warn("[App.tsx] electronAPI.setAppSetting is not available.");
    }
  }, []);

  // --- Логіка масштабування ---
  const handleKeyDownForZoom = useCallback((event: KeyboardEvent) => {
    if (
      !window.electronAPI ||
      typeof window.electronAPI.getZoomFactor !== "function" ||
      typeof window.electronAPI.setZoomFactor !== "function"
    ) {
      return;
    }

    const target = event.target as HTMLElement;
    const isInputElementFocused =
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable;
    if (
      isInputElementFocused &&
      !((event.ctrlKey || event.metaKey) && event.key === "0")
    ) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      const currentFactor = window.electronAPI.getZoomFactor();
      let newFactor: number | undefined;

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        newFactor = Math.min(MAX_ZOOM, currentFactor + ZOOM_STEP);
      } else if (event.key === "-") {
        event.preventDefault();
        newFactor = Math.max(MIN_ZOOM, currentFactor - ZOOM_STEP);
      } else if (event.key === "0") {
        event.preventDefault();
        newFactor = 1.0;
      }

      if (
        newFactor !== undefined &&
        Math.abs(newFactor - currentFactor) > 0.001
      ) {
        window.electronAPI.setZoomFactor(newFactor);
      }
    }
  }, []);

  useEffect(() => {
    console.log(
      "[App.tsx] useEffect[handleKeyDownForZoom] для масштабування: додавання слухача keydown.",
    );
    window.addEventListener("keydown", handleKeyDownForZoom);
    return () => {
      console.log(
        "[App.tsx] useEffect[handleKeyDownForZoom] для масштабування: видалення слухача keydown.",
      );
      window.removeEventListener("keydown", handleKeyDownForZoom);
    };
  }, [handleKeyDownForZoom]);

  return (
    <>
      {" "}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Layout
          sidebar={<Sidebar />}
          mainPanel={
            <MainPanel
              currentThemePreference={userPreference}
              onChangeThemePreference={handleThemePreferenceChange}
              obsidianVaultPath={obsidianVaultPath}
              onObsidianVaultChange={handleObsidianVaultChange}
            />
          }
        />
      </DragDropContext>
    </>
  );
};

export default App;

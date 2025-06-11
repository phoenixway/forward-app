/**
 * Ключі, що використовуються для electron-store.
 */
export const STORE_KEYS = {
  APP_SETTINGS: 'appSettings',
  // Наприклад, якщо налаштування зберігаються під одним ключем:
  // OBSIDIAN_VAULT_PATH: 'appSettings.obsidianVaultPath', // Або окремо
  // THEME_PREFERENCE: 'appSettings.themePreference',      // Або окремо
  WINDOW_BOUNDS: 'windowBounds',
  SIDEBAR_WIDTH: 'sidebarWidth',
  ACTIVE_TAB_ID: 'activeTabId',
  OPEN_TABS: 'openTabs',
  GOAL_LISTS: 'goalLists', // Ключ для зберігання всіх списків цілей
                           // Кожен список може бути об'єктом з id, name, goals: Goal[]
  GOALS_BY_LIST_ID_PREFIX: 'goalsForList_', // Префікс для зберігання цілей окремого списку, якщо вони зберігаються окремо
                                            // Наприклад: goalsForList_xyz123
  LAST_SELECTED_LIST_ID: 'lastSelectedListId', // Для запам'ятовування останнього активного списку
};

/**
 * Назви IPC каналів для комунікації між процесами.
 */
export const IPC_CHANNELS = {
  // Для налаштувань
  GET_APP_SETTINGS: 'get-app-settings',
  SET_APP_SETTING: 'set-app-setting',
  // Для масштабування
  GET_ZOOM_FACTOR: 'get-zoom-factor',
  SET_ZOOM_FACTOR: 'set-zoom-factor',
  // Для логування з рендерера в головний процес
  LOG_MESSAGE: 'log-message',
  // Для надсилання логів з головного процесу в рендерер (якщо потрібно)
  LOG_MESSAGE_REPLY: 'log-message-reply',
  // Для операцій зі списками цілей
  GET_GOAL_LISTS: 'get-goal-lists', // Отримати всі списки
  CREATE_GOAL_LIST: 'create-goal-list', // Створити новий список (name) -> повертає GoalList
  GET_GOAL_LIST_BY_ID: 'get-goal-list-by-id', // Отримати конкретний список (listId) -> GoalList | null
  UPDATE_GOAL_LIST_NAME: 'update-goal-list-name', // (listId, newName) -> оновлений GoalList | null
  DELETE_GOAL_LIST: 'delete-goal-list', // (listId) -> { success: boolean }
  // Для операцій з цілями
  GET_GOALS_FOR_LIST: 'get-goals-for-list', // (listId) -> Goal[]
  ADD_GOAL_TO_LIST: 'add-goal-to-list', // (listId, goalText, optionalFields) -> нова Goal
  UPDATE_GOAL_IN_LIST: 'update-goal-in-list', // (listId, goalId, updates: Partial<Goal>) -> оновлена Goal
  DELETE_GOAL_FROM_LIST: 'delete-goal-from-list', // (listId, goalId) -> { success: boolean }
  TOGGLE_GOAL_COMPLETION: 'toggle-goal-completion', // (listId, goalId) -> оновлена Goal
  REORDER_GOALS_IN_LIST: 'reorder-goals-in-list', // (listId, orderedGoalIds: string[]) -> { success: boolean }
  IMPORT_GOALS_TO_LIST: 'import-goals-to-list', // (listId, goalsText: string) -> { success: boolean, importedCount: number, errors?: string[] }
  // Для відкриття Obsidian
  OPEN_OBSIDIAN_NOTE: 'open-obsidian-note', // (noteName: string) -> Promise<void> or Promise<{success: boolean, error?: string}>
  // ... інші канали ...
};

/**
 * Стандартні значення для налаштувань.
 */
export const DEFAULT_APP_SETTINGS = {
  obsidianVaultPath: null,
  themePreference: 'system' as 'light' | 'dark' | 'system',
  // інші стандартні налаштування
};

/**
 * Мінімальна та максимальна ширина бічної панелі.
 */
export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 500;
export const DEFAULT_SIDEBAR_WIDTH = 240;
export const OBSIDIAN_SCHEME_PREFIX = 'obsidian://';

// Інші константи, специфічні для логіки додатка
// export const MAX_TABS = 10;
// export const DEFAULT_NEW_LIST_NAME = "Новий список";

// Додай будь-які інші константи, які використовуються в твоєму додатку.
// Наприклад, якщо у тебе є різні типи вкладок:
export const TAB_TYPES = {
  GOAL_LIST: 'goalList',
  SETTINGS: 'settings',
  LOGS: 'logs',
  // інші типи
};
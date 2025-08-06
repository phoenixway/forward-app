// src/renderer/events.ts

/**
 * Подія для відкриття вкладки налаштувань.
 */
export const OPEN_SETTINGS_EVENT = 'app:open-settings';

/**
 * Подія для примусового оновлення списків у сайдбарі
 */
export const SIDEBAR_REFRESH_LISTS_EVENT = "app:sidebar-refresh-lists";

/**
 * Подія для відкриття вкладки зі списком цілей.
 * Очікує в detail: { listId: string; listName: string }
 */
export const OPEN_GOAL_LIST_EVENT = 'app:open-goal-list';

/**
 * Подія, яка сигналізує сайдбару, що потрібно ініціювати створення нового списку.
 */
export const SIDEBAR_CREATE_NEW_LIST_EVENT = 'app:sidebar-create-new-list';


// --- Типи для подій ---

export interface OpenGoalListDetail {
  listId: string;
  listName: string;
}


// --- Функції-хелпери для відправки подій ---

export function dispatchOpenSettingsEvent() {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

export function dispatchSidebarRefreshEvent() {
  window.dispatchEvent(new CustomEvent(SIDEBAR_REFRESH_LISTS_EVENT));
}

export function dispatchOpenGoalListEvent(listId: string, listName:string) {
    window.dispatchEvent(new CustomEvent<OpenGoalListDetail>(OPEN_GOAL_LIST_EVENT, {
        detail: { listId, listName }
    }));
}

export function dispatchSidebarCreateNewListEvent() {
    window.dispatchEvent(new CustomEvent(SIDEBAR_CREATE_NEW_LIST_EVENT));
}
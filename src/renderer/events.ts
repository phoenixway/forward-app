// src/renderer/events.ts
export const OPEN_SETTINGS_EVENT = "app:open-settings";
export const SIDEBAR_REFRESH_LISTS_EVENT = "app:sidebar-refresh-lists";
export function dispatchOpenSettingsEvent() {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}

// src/renderer/events.ts
export const OPEN_SETTINGS_EVENT = 'app:open-settings';

export function dispatchOpenSettingsEvent() {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT));
}
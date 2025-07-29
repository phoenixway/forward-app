// src/renderer/store/syncSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- НОВІ ТИПИ для звіту про зміни ---
// Описує одну конкретну зміну (додавання або оновлення)
export interface SyncChange {
  type: 'Add' | 'Update';
  entityType: 'Список' | 'Ціль';
  id: string; // ID сутності
  description: string; // Назва списку або текст цілі для відображення
  entity: any; // Повний об'єкт (нова або оновлена сутність)
}

// Описує повний звіт, який ми покажемо користувачеві
export interface SyncReport {
  changes: SyncChange[];
}

export interface SyncState {
  isModalOpen: boolean;
  modalMode: 'idle' | 'import' | 'server';
  // Додаємо новий статус 'reviewing'
  syncStatus: 'idle' | 'fetching' | 'reviewing' | 'applying' | 'error' | 'success';
  deviceAddress: string;
  serverAddress: string | null;
  errorMessage: string | null;
  // --- НОВІ ПОЛЯ для зберігання звіту та оригінальних даних ---
  syncReport: SyncReport | null;
  originalBackup: any | null; // Зберігаємо оригінальний бекап з телефону
}

const initialState: SyncState = {
  isModalOpen: false,
  modalMode: 'idle',
  syncStatus: 'idle',
  deviceAddress: '',
  serverAddress: null,
  errorMessage: null,
  syncReport: null,
  originalBackup: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    openSyncModal: (state, action: PayloadAction<'import' | 'server'>) => {
      state.isModalOpen = true;
      state.modalMode = action.payload;
      state.syncStatus = 'idle';
      state.errorMessage = null;
      state.syncReport = null; // Скидаємо звіт при відкритті
      state.originalBackup = null;
    },
    closeSyncModal: (state) => {
      // Повертаємо до початкового стану при закритті
      Object.assign(state, initialState);
    },
    setDeviceAddress: (state, action: PayloadAction<string>) => {
      state.deviceAddress = action.payload;
    },
    setSyncStatus: (state, action: PayloadAction<SyncState['syncStatus']>) => {
      state.syncStatus = action.payload;
      if(action.payload !== 'error') state.errorMessage = null;
    },
    setSyncError: (state, action: PayloadAction<string>) => {
        state.syncStatus = 'error';
        state.errorMessage = action.payload;
    },
    // --- НОВИЙ ACTION для збереження звіту ---
    setSyncReport: (state, action: PayloadAction<{ report: SyncReport, originalBackup: any }>) => {
        state.syncReport = action.payload.report;
        state.originalBackup = action.payload.originalBackup;
        state.syncStatus = 'reviewing'; // Переводимо в режим перегляду
    },
    setServerAddress: (state, action: PayloadAction<string | null>) => {
        state.serverAddress = action.payload;
    }
  },
});

export const {
  openSyncModal,
  closeSyncModal,
  setDeviceAddress,
  setSyncStatus,
  setSyncError,
  setSyncReport, // Експортуємо новий action
  setServerAddress,
} = syncSlice.actions;

export default syncSlice.reducer;
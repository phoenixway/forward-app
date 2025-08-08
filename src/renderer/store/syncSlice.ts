// src/renderer/store/syncSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- ВИКОРИСТОВУЄМО ОНОВЛЕНІ ТИПИ З ЄДИНОГО ДЖЕРЕЛА ---
import { SyncReport } from '../logic/syncLogic';

type SyncStatus = 'idle' | 'fetching' | 'reviewing' | 'applying' | 'error' | 'success';

// --- ОНОВЛЕНИЙ ІНТЕРФЕЙС СТАНУ ---
export interface SyncState {
  isModalOpen: boolean;
  modalMode: 'idle' | 'import' | 'server';
  syncStatus: SyncStatus;
  deviceAddress: string;
  serverAddress: string | null;
  errorMessage: string | null;
  syncReport: SyncReport | null; // Тип тепер правильний
  // Поле originalBackup видалено як застаріле
}

const initialState: SyncState = {
  isModalOpen: false,
  modalMode: 'idle',
  syncStatus: 'idle',
  deviceAddress: '',
  serverAddress: null,
  errorMessage: null,
  syncReport: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    openSyncModal: (state, action: PayloadAction<'import' | 'server'>) => {
      state.isModalOpen = true;
      state.modalMode = action.payload;
      // Скидаємо стан при кожному відкритті модального вікна
      state.syncStatus = 'idle';
      state.errorMessage = null;
      state.syncReport = null;
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
    // --- ОНОВЛЕНИЙ ACTION для збереження звіту ---
    setSyncReport: (state, action: PayloadAction<{ report: SyncReport }>) => {
        state.syncReport = action.payload.report;
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
  setSyncReport,
  setServerAddress,
} = syncSlice.actions;

export default syncSlice.reducer;
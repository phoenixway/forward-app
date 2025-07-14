import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Тип для звіту синхронізації, який ми покажемо користувачеві
// Поки що простий, можна буде розширити
interface SyncChange {
  type: 'Add' | 'Update' | 'Remove';
  entityType: 'Список' | 'Ціль';
  description: string;
}

interface SyncReport {
  changes: SyncChange[];
}

export interface SyncState {
  isModalOpen: boolean;
  modalMode: 'idle' | 'import' | 'server';
  syncStatus: 'idle' | 'fetching' | 'reviewing' | 'applying' | 'error' | 'success';
  deviceAddress: string;
  serverAddress: string | null;
  errorMessage: string | null;
  syncReport: SyncReport | null;
  originalBackup: any | null; 
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
    setSyncReport: (state, action: PayloadAction<{ report: SyncReport, originalBackup: any }>) => {
        state.syncReport = action.payload.report;
        state.originalBackup = action.payload.originalBackup;
        state.syncStatus = 'reviewing';
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
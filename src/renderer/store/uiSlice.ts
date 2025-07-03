// src/renderer/store/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DropResult } from '@hello-pangea/dnd';

export interface UIState {
  isOpen: boolean;
  result: DropResult | null;
  globalFilterTerm: string;
  goalToHighlight: string | null; // <-- НОВЕ ПОЛЕ
}

const initialState: UIState = {
  isOpen: false,
  result: null,
  globalFilterTerm: '',
  goalToHighlight: null, // <-- ПОЧАТКОВЕ ЗНАЧЕННЯ
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openDropActionMenu: (state, action: PayloadAction<DropResult>) => {
      state.isOpen = true;
      state.result = action.payload;
    },
    closeDropActionMenu: (state) => {
      state.isOpen = false;
      state.result = null;
    },
    setGlobalFilterTerm: (state, action: PayloadAction<string>) => {
      state.globalFilterTerm = action.payload;
    },
    // --- НОВИЙ ACTION ---
    setGoalToHighlight: (state, action: PayloadAction<string | null>) => {
      state.goalToHighlight = action.payload;
    },
  },
});

export const {
  openDropActionMenu,
  closeDropActionMenu,
  setGlobalFilterTerm,
  setGoalToHighlight, // <-- ЕКСПОРТУЄМО
} = uiSlice.actions;

export default uiSlice.reducer;

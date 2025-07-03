// src/renderer/store/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OnDragEndResponder } from '@hello-pangea/dnd';

export interface UIState {
  isOpen: boolean;
  result: ReturnType<OnDragEndResponder> | null;
  globalFilterTerm: string; // <-- НАШЕ НОВЕ ПОЛЕ
}

const initialState: UIState = {
  isOpen: false,
  result: null,
  globalFilterTerm: '', // <-- ПОЧАТКОВЕ ЗНАЧЕННЯ
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openDropActionMenu: (state, action: PayloadAction<ReturnType<OnDragEndResponder>>) => {
      state.isOpen = true;
      state.result = action.payload;
    },
    closeDropActionMenu: (state) => {
      state.isOpen = false;
      state.result = null;
    },
    // --- НОВИЙ ACTION ---
    setGlobalFilterTerm: (state, action: PayloadAction<string>) => {
      state.globalFilterTerm = action.payload;
    },
  },
});

export const {
  openDropActionMenu,
  closeDropActionMenu,
  setGlobalFilterTerm, // <-- ЕКСПОРТУЄМО НОВИЙ ACTION
} = uiSlice.actions;

export default uiSlice.reducer;
// src/renderer/store/uiSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DropResult } from "@hello-pangea/dnd";

interface DropActionMenuState {
  isOpen: boolean;
  result: DropResult | null;
}

const initialState: DropActionMenuState = {
  isOpen: false,
  result: null, // Тут ми будемо зберігати дані про перетягування
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openDropActionMenu(state, action: PayloadAction<DropResult>) {
      state.isOpen = true;
      state.result = action.payload;
    },
    closeDropActionMenu(state) {
      state.isOpen = false;
      state.result = null;
    },
  },
});

export const { openDropActionMenu, closeDropActionMenu } = uiSlice.actions;
export default uiSlice.reducer;

import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // за замовчуванням localStorage для вебу

import listsReducer from "./listsSlice"; // Імпортуємо наш новий редюсер

const persistConfig = {
  key: "root", // Ключ для збереження в localStorage
  storage,
  // Можна вказати, які частини стану зберігати,
  // але за замовчуванням зберігається все
};

const persistedReducer = persistReducer(persistConfig, listsReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ігнорувати ці типи дій для redux-persist
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Типи для зручної роботи з TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

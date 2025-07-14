import { combineReducers, configureStore } from "@reduxjs/toolkit";
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
import storage from "redux-persist/lib/storage";
import listsReducer from "./listsSlice";
import uiReducer from "./uiSlice";
import syncReducer from "./syncSlice"; // Імпорт тепер має працювати

const rootReducer = combineReducers({
  lists: listsReducer,
  ui: uiReducer,
  sync: syncReducer, // Додаємо новий редюсер
});

const persistConfig = {
  key: "root",
  storage,
  // Не зберігаємо стан синхронізації між сесіями
  blacklist: ['sync'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof rootReducer>; // ЗМІНЕНО: Використовуємо rootReducer для більш стабільного визначення типу
export type AppDispatch = typeof store.dispatch;
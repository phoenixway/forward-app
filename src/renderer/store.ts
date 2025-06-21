// src/renderer/store.ts
import {
  legacy_createStore as createStore,
  combineReducers,
  Store,
  Reducer,
  Action,
} from "redux";

const rootReducer = combineReducers({
  placeholder: (state: {} = {}, _action: Action) => state,
});

interface AppState {
  placeholder: {};
}
const store: Store<AppState> = createStore(rootReducer as Reducer<AppState>);

console.log("[Store.ts] Created store:", store); // Додай лог тут
if (
  store &&
  typeof store.getState === "function" &&
  typeof store.dispatch === "function"
) {
  console.log("[Store.ts] Store appears to be a valid Redux store.");
} else {
  console.error("[Store.ts] Store is NOT a valid Redux store!", store);
}

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;

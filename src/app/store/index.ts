import { configureStore } from "@reduxjs/toolkit";
import analyzerReducer from "./analyzerSlice";
import { bridgeApi } from "./bridgeApi";

export const store = configureStore({
  reducer: {
    analyzer: analyzerReducer,
    [bridgeApi.reducerPath]: bridgeApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      bridgeApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

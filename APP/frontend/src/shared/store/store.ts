import { configureStore } from '@reduxjs/toolkit';
import currencyReducer from './currencySlice';

// Redux solo gestiona el estado de moneda.
// El estado de autenticación está en Zustand (authStore.ts).
export const store = configureStore({
  reducer: {
    currency: currencyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

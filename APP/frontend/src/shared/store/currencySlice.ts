import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Currency, CreateCurrencyData, UpdateCurrencyData } from '../types/modelTypes/Currency';
import { getCurrencyRepository } from '../db/repositories/currency.repository';

interface CurrencyState {
  currency: Currency | null;
  loading: boolean;
  error: string | null;
}

const initialState: CurrencyState = {
  currency: null,
  loading: false,
  error: null,
};

// Thunks
export const fetchCurrency = createAsyncThunk(
  'currency/fetchCurrency',
  async (id: string, { rejectWithValue }) => {
    try {
      const repo = getCurrencyRepository();
      const item = await repo.findById(id);
      return item;
    } catch (error: any) {
      console.error('Error fetching currency', error);
      return rejectWithValue(error?.message || 'Error fetching currency');
    }
  }
);

export const createCurrency = createAsyncThunk(
  'currency/createCurrency',
  async (data: CreateCurrencyData, { rejectWithValue }) => {
    try {
      const repo = getCurrencyRepository();
      const created = await repo.create(data);
      return created;
    } catch (error: any) {
      console.error('Error creating currency', error);
      return rejectWithValue(error?.message || 'Error creating currency');
    }
  }
);

export const updateCurrency = createAsyncThunk(
  'currency/updateCurrency',
  async (payload: { id: string; data: UpdateCurrencyData }, { rejectWithValue }) => {
    try {
      const repo = getCurrencyRepository();
      const updated = await repo.update(payload.id, payload.data as any);
      return updated;
    } catch (error: any) {
      console.error('Error updating currency', error);
      return rejectWithValue(error?.message || 'Error updating currency');
    }
  }
);

export const deleteCurrency = createAsyncThunk(
  'currency/deleteCurrency',
  async (id: string, { rejectWithValue }) => {
    try {
      const repo = getCurrencyRepository();
      const result = await repo.softDelete(id);
      return { id, success: result };
    } catch (error: any) {
      console.error('Error deleting currency', error);
      return rejectWithValue(error?.message || 'Error deleting currency');
    }
  }
);

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {
    setCurrency: (state, action: PayloadAction<Currency | null>) => {
      state.currency = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrency.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCurrency.fulfilled, (state, action) => {
        state.loading = false;
        state.currency = action.payload ?? null;
      })
      .addCase(fetchCurrency.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Error cargando moneda';
      })

      .addCase(createCurrency.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCurrency.fulfilled, (state, action) => {
        state.loading = false;
        state.currency = action.payload ?? null;
      })
      .addCase(createCurrency.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Error creando moneda';
      })

      .addCase(updateCurrency.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCurrency.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) state.currency = action.payload as Currency;
      })
      .addCase(updateCurrency.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Error actualizando moneda';
      })

      .addCase(deleteCurrency.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCurrency.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.success) {
          // si se borró la moneda en la DB, limpiar el estado
          if (state.currency?.id === action.payload.id) state.currency = null;
        } else {
          state.error = 'No se pudo eliminar la moneda';
        }
      })
      .addCase(deleteCurrency.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Error eliminando moneda';
      });
  },
});

export const { setCurrency, clearError } = currencySlice.actions;
export default currencySlice.reducer;

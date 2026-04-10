import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../types/User';
import { UserService } from '../services/UserService';
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isValidating: boolean;
}

// Acción asíncrona para validar usuario desde la base de datos
export const validateUserFromDB = createAsyncThunk(
  'auth/validateUserFromDB',
  async (userId: string, { rejectWithValue }) => {
    try {
      const result = await UserService.getUserById(userId);
      
      if (!result.success || !result.user) {
        return rejectWithValue('Usuario no encontrado en la base de datos');
      }

      // Verificar si el usuario está activo
      if (!result.user.active) {
        return rejectWithValue('Usuario inactivo o deshabilitado');
      }

      return result.user;
    } catch (error) {
      console.error('Error validando usuario:', error);
      return rejectWithValue('Error al validar usuario');
    }
  }
);

// Acción asíncrona para cargar y validar usuario desde storage
export const loadAndValidateUser = createAsyncThunk(
  'auth/loadAndValidateUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      
      if (!token || !userStr) {
        return rejectWithValue('No hay datos de sesión');
      }

      const user: AuthUser = JSON.parse(userStr);
      
      // Validar que el usuario existe en la base de datos y está activo
      try {
        const result = await UserService.getUserById(user.id);
        
        if (!result.success || !result.user) {
          // El usuario no existe en la DB, limpiar el storage
          console.log("usuario no existe en DB, limpiando storage");
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return rejectWithValue('Usuario no encontrado en la base de datos');
        }

        // Verificar si el usuario está activo
        if (!result.user.active) {
          // El usuario está inactivo, limpiar el storage
          console.log("usuario inactivo, limpiando storage");
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          return rejectWithValue('Usuario inactivo o deshabilitado');
        }

        return { user: result.user, token };
      } catch (dbError) {
        console.log("Error accediendo a la base de datos, usando datos locales:", dbError);
        // Si hay error con la BD, usar los datos locales por ahora
        return { user, token };
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
      // Limpiar storage en caso de error de parsing
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return rejectWithValue('Error al cargar usuario');
    }
  }
);

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isValidating: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: AuthUser; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isValidating = false;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isValidating = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    loadUserFromStorage: (state) => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        state.token = token;
        state.user = JSON.parse(user);
        state.isAuthenticated = true;
        state.isValidating = false;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // loadAndValidateUser
      .addCase(loadAndValidateUser.pending, (state) => {
        state.isValidating = true;
      })
      .addCase(loadAndValidateUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.isValidating = false;
      })
      .addCase(loadAndValidateUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isValidating = false;
      })
      // validateUserFromDB
      .addCase(validateUserFromDB.pending, (state) => {
        state.isValidating = true;
      })
      .addCase(validateUserFromDB.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isValidating = false;
        // Actualizar el usuario en localStorage
        localStorage.setItem('user', JSON.stringify(action.payload));
      })
      .addCase(validateUserFromDB.rejected, (state) => {
        // El usuario no es válido, cerrar sesión
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isValidating = false;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      });
  },
});

export const { loginSuccess, logout, loadUserFromStorage } = authSlice.actions;
export default authSlice.reducer;

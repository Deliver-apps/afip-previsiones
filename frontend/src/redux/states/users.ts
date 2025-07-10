import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { User } from "@src/models";
import {
  addDataUser,
  deleteDataUser,
  editDataUser,
  getDataUsers,
} from "@src/service/supabase";

// Async thunk for fetching users
export const fetchUsers = createAsyncThunk("users/fetchUsers", async () => {
  return (await getDataUsers()).sort((a, b) => a.id - b.id);
});

export const editUser = createAsyncThunk(
  "users/editUser",
  async (user: User) => {
    return await editDataUser(user);
  },
);

export const addUser = createAsyncThunk("users/addUser", async (user: User) => {
  return await addDataUser(user);
});

export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async (user: User) => {
    return await deleteDataUser(user);
  },
);

const usersSlice = createSlice({
  name: "users",
  initialState: [] as User[],
  reducers: {
    setUsers: (state, action) => {
      return action.payload;
    },
    getUsers: (state) => {
      return state;
    },
    modifyState: (state, action) => {
      //* Modificación de State, no puede ser modificado directamente en el state y retornarlo. Si se necesita retornar, se puede usar map.
      const {
        id,
        username,
        password,
        is_company,
        company_name,
        real_name,
        cuit_company,
      } = action.payload;
      const userIndex = state.findIndex((user) => user.id === id);
      if (userIndex !== -1) {
        state[userIndex] = {
          id,
          username,
          password,
          is_company,
          company_name,
          real_name,
          cuit_company,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => {
        return action.payload;
      })
      .addCase(addUser.fulfilled, (state, action) => {
        console.log("Usuario agregado:", action.payload);
        // Verificar si el usuario ya existe
        const existingUserIndex = state.findIndex(
          (user) => user.id === action.payload.id,
        );
        if (existingUserIndex !== -1) {
          // Si el usuario ya existe, actualizarlo
          state[existingUserIndex] = action.payload;
          return state;
        }
        // Si el usuario no existe, agregarlo al estado
        console.log("Agregando nuevo usuario:", action.payload);
        // Verificar si el usuario ya existe por username
        // Agregar el nuevo usuario al final del estado
        state.push(action.payload);
      })
      .addCase(editUser.fulfilled, (state, action) => {
        // Actualizar el usuario editado en el estado
        const userIndex = state.findIndex((user) => user.id === action.payload.id);
        if (userIndex !== -1) {
          state[userIndex] = action.payload;
        }
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        console.log("Usuario borrado:", action.payload);
        // Remover el usuario del estado
        return state.filter((user) => user.id !== action.payload.id);
      });
  },
});

export const { setUsers, getUsers, modifyState } = usersSlice.actions;

export default usersSlice.reducer;

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
    builder.addCase(fetchUsers.fulfilled, (state, action) => {
      return action.payload;
    });
  },
});

export const { setUsers, getUsers, modifyState } = usersSlice.actions;

export default usersSlice.reducer;

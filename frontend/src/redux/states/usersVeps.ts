// store/usersVepsSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { UserVeps } from "@src/models";
import { getDataUsersVeps } from "@src/service/supabase";

export const fetchUsersVeps = createAsyncThunk(
  "users_veps/fetchUsers",
  async () => {
    // This should return an array of UserVeps
    return await getDataUsersVeps();
  },
);

const usersVepsSlice = createSlice({
  name: "users_veps",
  initialState: [] as UserVeps[],
  reducers: {
    setUsersVep: (state, action) => {
      return action.payload;
    },
    getUsersVep: (state) => {
      return state;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUsersVeps.fulfilled, (state, action) => {
      return action.payload; // the array from getDataUsersVeps()
    });
  },
});

export const { setUsersVep, getUsersVep } = usersVepsSlice.actions;
export default usersVepsSlice.reducer;

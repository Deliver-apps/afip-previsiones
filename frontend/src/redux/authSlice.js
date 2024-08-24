// authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../service/supabaseClient";

export const login = createAsyncThunk(
  "auth/login",
  async (formFields, thunkAPI) => {
    try {
      // Extract email and password from formFields array
      const email = formFields[0].model;
      const password = formFields[1].model;

      // Attempt to sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Log the result for debugging

      // Handle the case where an error occurred
      if (error) {
        return thunkAPI.rejectWithValue(error.message || "Login failed");
      }

      // If successful, return the access token
      return data.session.access_token;
    } catch (error) {
      // Handle unexpected errors
      return thunkAPI.rejectWithValue(
        error.message || "An unexpected error occurred"
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: null,
    isAuthenticated: false,
    status: "idle",
    error: null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.token = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
        state.isAuthenticated = false;
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "@src/service/supabaseClient";
import Cookies from "js-cookie";

const tokenFromCookie = Cookies.get("authToken");

// Async thunk for logging in
export const login = createAsyncThunk(
  "auth/login",
  async (
    formFields: {
      id: number;
      label: string;
      required: boolean;
      model: string;
      type?: string;
    }[],
    thunkAPI,
  ) => {
    try {
      // Extract email and password from formFields array
      const email = formFields[0].model;
      const password = formFields[1].model;

      // Attempt to sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Handle the case where an error occurred
      if (error) {
        return thunkAPI.rejectWithValue(error.message || "Login failed");
      }
      Cookies.set("authToken", data?.session.access_token, {
        expires: 7,
        secure: true,
      });

      // If successful, return the access token
      return data.session?.access_token;
    } catch (error: any) {
      // Handle unexpected errors
      return thunkAPI.rejectWithValue(
        error.message || "An unexpected error occurred",
      );
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: tokenFromCookie as string | null,
    isAuthenticated: false,
    status: "idle",
    error: null as string | null,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.isAuthenticated = false;
      Cookies.remove("authToken");
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
        Cookies.set("authToken", action.payload, { expires: 7, secure: true });
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });
  },
});

export const { logout } = authSlice.actions;

export default authSlice.reducer;

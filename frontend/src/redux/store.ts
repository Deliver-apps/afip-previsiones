import { configureStore } from "@reduxjs/toolkit";
import usersReducer from "@src/redux/states/users";
import authReducer from "@src/redux/states/auth";

const store = configureStore({
  reducer: {
    users: usersReducer,
    auth: authReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type AppStore = ReturnType<typeof store.getState>;

export default store;
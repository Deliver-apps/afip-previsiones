import React from "react";
import { PrimarySearchAppBar, UsersTable } from "./components";

const Home: React.FC = () => {
  return (
    <>
      <PrimarySearchAppBar />
      <UsersTable />
    </>
  );
};

export default Home;

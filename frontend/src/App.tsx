import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { ProtectedRoute } from "@src/components";
import { supabase } from "@src/service/supabaseClient";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Home, Login } from "./pages";
import { AppStore } from "./redux/store";

const App: React.FC = () => {
  const token = useSelector((state: AppStore) => state.auth.token);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      setIsLoading(true); // Start loading
      try {
        const { data, error } = await supabase.auth.getUser(token!);
        if (data && !error) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      checkAuthentication();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute element={Home} isAuthenticated={isAuthenticated} />
          }
        />
        <Route path="/login" element={<Login />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute element={Home} isAuthenticated={isAuthenticated} />
          }
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/home" : "/login"} />}
        />
      </Routes>
    </Router>
  );
};

export default App;

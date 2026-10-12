import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./pages/SettingsPage";
import SellItem from "./pages/SellItem";
import BrowseMarketplace from "./pages/BrowseMarketplace";
import MyListings from "./pages/MyListings";
import Orders from "./pages/Orders";
import NotFound from "./pages/NotFound";
import { supabase } from "./services/supabase";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#0a0a0a] text-sm text-zinc-400">
      Checking your session...
    </div>
  );
}

function ProtectedRoute({ session, children }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ session, children }) {
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (isMounted) {
        setSession(currentSession);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute session={session}>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute session={session}>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute session={session}>
              <Dashboard session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute session={session}>
              <SettingsPage session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/sell"
          element={
            <ProtectedRoute session={session}>
              <SellItem session={session} />
            </ProtectedRoute>
          }
        />
        <Route path="/browse" element={<ProtectedRoute session={session}><BrowseMarketplace session={session} /></ProtectedRoute>} />
        <Route path="/listings" element={<ProtectedRoute session={session}><MyListings session={session} /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute session={session}><Orders session={session} /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

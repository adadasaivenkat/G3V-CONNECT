import React, { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider, useAuth } from "./context/AuthProvider";
import Auth from "./Auth";
import { Profile } from "./Profile";
import { Chat } from "./Chat";
import { Toaster } from "react-hot-toast";

// Protected route that requires authentication
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return user ? children : <Navigate to="/" replace />;
};

// Route that redirects authenticated users based on profile completion
const AuthRoute = ({ children }) => {
  const { user, loading, isProfileComplete } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return children;
  }

  return isProfileComplete ? (
    <Navigate to="/chat" replace />
  ) : (
    <Navigate to="/profile" replace />
  );
};

// Profile route that checks authentication and prevents access after completion
const ProfileRoute = ({ children }) => {
  const { user, loading, isProfileComplete } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If profile is complete, redirect to chat
  if (isProfileComplete) {
    return <Navigate to="/chat" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user, loading, isProfileComplete } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (isProfileComplete) {
        navigate("/chat");
      } else {
        navigate("/profile");
      }
    }
  }, [user, loading, isProfileComplete, navigate]);

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <AuthRoute>
              <Auth />
            </AuthRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProfileRoute>
              <Profile />
            </ProfileRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <Chat />
            </PrivateRoute>
          }
        />
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="bottom-right" />
    </>
  );
};

const App = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;

import React from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import Dashboard from '../Dashboard/Dashboard';
import Login from '../pages/Login'; // 👈 Make sure to import your Login component
import useAuthStore from '../store/useAuthStore'; // 👈 Import your Zustand auth store
import Staff from '../pages/Staff/Staff';

// --- ROUTE SAFEGUARDS ---

/**
 * Protects private routes. Redirects to /login if the user is not authenticated.
 */
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

/**
 * Prevents authenticated users from accessing the login screen.
 * Redirects them straight back to the Dashboard if they try.
 */
const PublicRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

// --- ROUTER CONFIGURATION ---

const router = createHashRouter([
  {
    path: '/login',
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true, // Default view under MainLayout when at "/"
        element: <Dashboard />,
      },
      // Future clean expansion! Any child added here is automatically protected:
      {
        path: "staff",
        element: <Staff />,
      }
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
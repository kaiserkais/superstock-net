import React from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import App from '../App';
import Dashboard from '../Dashboard/Dashboard';

// Mock Page Components
const Home = () => <h2>Welcome to the Home Screen</h2>;
const Settings = () => <h2>Application Settings Configuration</h2>;

const router = createHashRouter([
  {
    path: "/",
    element: <MainLayout />, // The layout wraps around all child routes
    children: [
      {
        index: true, // This marks Home as the default view for "/"
        element: <Dashboard />,
      },
    ],
  },
]);

export default function AppRoutes() {
  return <RouterProvider router={router} />;
}
import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from 'react-router-dom';
import App from "./App";
import AppRoutes from "./router/AppRoutes";



ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
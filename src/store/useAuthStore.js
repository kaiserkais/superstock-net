import { create } from "zustand";
import useNetworkStore from "./useNetworkStore";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  error: null,
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    
    // Dynamically query your auto-discovered server endpoint address
    const hostUrl = useNetworkStore.getState().hostUrl || "http://localhost:8080";

    try {
      const response = await fetch(`${hostUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid administrative credentials.");
      }

      const data = await response.json();
      
      if (data.status === "success") {
        set({ user: data.user, isAuthenticated: true, isLoading: false });
        return true;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, error: null });
  },
}));

export default useAuthStore;
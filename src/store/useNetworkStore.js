import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

const useNetworkStore = create((set, get) => ({
  hostUrl: null,
  status: "idle",
  error: null,
  ws: null,          // Holds our open WebSocket instance
  liveStock: 12,     // Reactive tracking value to display updates instantly

  discoverHost: async () => {
    console.log("🔮 [Zustand] Initializing network system...");
    set({ status: "scanning", error: null });
    
    try {
      const url = await invoke("discover_host");
      set({ hostUrl: url, status: "connected" });
      get().connectWebSocket(url); // Establish data sync
    } catch (err) {
      console.warn("⚠️ mDNS scan failed, fallback executing...");
      try {
        const response = await fetch("http://localhost:8080/api/ping");
        const text = await response.text();
        if (text === "SuperStock Host Active") {
          const fallbackUrl = "http://localhost:8080";
          set({ hostUrl: fallbackUrl, status: "connected" });
          get().connectWebSocket(fallbackUrl); // Establish data sync
          return;
        }
      } catch (localErr) {
        console.error("❌ Both network adapters unreachable.");
      }
      set({ hostUrl: null, status: "error", error: err });
    }
  },

  // NEW METHOD: Configures the persistent pipeline
  connectWebSocket: (url) => {
    // If a connection already exists, discard it cleanly first
    if (get().ws) get().ws.close();

    // Convert http://111.222.x.x:8080 -> ws://111.222.x.x:8080/ws
    const wsUrl = url.replace(/^http/, "ws") + "/ws";
    console.log(`🔌 Connecting client data stream to: ${wsUrl}`);

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("⚡ [WebSocket] Live data sync pipeline channel established!");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🎯 [WebSocket] Received live patch from server:", data);
        
        // Handle incoming sync variations seamlessly
        if (data.event === "stock_update" && data.product_id === "p1") {
          set({ liveStock: data.new_stock }); // Directly patch Zustand state!
        }
      } catch (e) {
        console.error("Failed to read server data patch", e);
      }
    };

    socket.onclose = () => {
      console.warn("🔌 [WebSocket] Disconnected from sync master. Retrying soon...");
      // In a full production build, we can fire a reconnect timer interval loop here
    };

    set({ ws: socket });
  }
}));

export default useNetworkStore;
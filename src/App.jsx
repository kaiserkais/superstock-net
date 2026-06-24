import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import AppRoutes from "./router/AppRoutes";
import useNetworkStore from "./store/useNetworkStore";
import "./App.css";

function App() {
  const [appMode, setAppMode] = useState("checking");
  const discoverHost = useNetworkStore((state) => state.discoverHost);

  // Checks Rust configuration to see what role this app plays
  const checkIdentity = async () => {
    try {
      const mode = await invoke("get_app_mode");
      setAppMode(mode);

      if (mode === "client") {
        // Only secondary client checkouts need to search the local network
        discoverHost();
      } else if (mode === "host") {
        console.log("👑 Running as central master hub. Local discovery bypassed.");
      }
    } catch (error) {
      console.error("Failed to fetch application runtime identity:", error);
    }
  };

  useEffect(() => {
    checkIdentity();
  }, [discoverHost]);

  // Communicates the user's setup choice back to Rust storage
  const handleSelectMode = async (selectedMode) => {
    try {
      await invoke("set_app_mode", { mode: selectedMode });
      
      // Force hardware window reload to jump-start background network loops
      window.location.reload();
    } catch (error) {
      alert("Critical configuration write error: " + error);
    }
  };

  // State 1: Awaiting config file evaluation
  if (appMode === "checking") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-sm tracking-wide">Analyzing local system hardware profiling...</p>
      </div>
    );
  }

  // State 2: First-time boot setup intercept layout
  if (appMode === "unknown") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-slate-50 font-sans p-6">
        <div className="bg-slate-900 p-8 md:p-10 rounded-xl shadow-2xl max-w-xl w-full border border-slate-800 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Welcome to SuperStock 🚀</h2>
          <p className="text-slate-400 mb-8 text-sm">
            Initialize this application instance by selecting its network architecture node role:
          </p>
          
          <div className="flex flex-col gap-4">
            {/* Host Server Button */}
            <button 
              className="flex items-start md:items-center text-left p-5 bg-slate-800 border-2 border-transparent rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-500 hover:bg-slate-750 text-inherit group"
              onClick={() => handleSelectMode("host")}
            >
              <span className="text-3xl mr-4 group-hover:scale-110 transition-transform duration-200">👑</span>
              <div className="flex flex-col">
                <strong className="text-base font-semibold mb-1 text-slate-200 group-hover:text-blue-400 transition-colors">
                  Configure as Main Server (Host)
                </strong>
                <small className="text-xs text-slate-400 leading-relaxed">
                  Launches the master SQLite local database. Select this for your primary checkout cash register.
                </small>
              </div>
            </button>
            
            {/* Client Terminal Button */}
            <button 
              className="flex items-start md:items-center text-left p-5 bg-slate-800 border-2 border-transparent rounded-lg cursor-pointer transition-all duration-200 hover:border-emerald-500 hover:bg-slate-750 text-inherit group"
              onClick={() => handleSelectMode("client")}
            >
              <span className="text-3xl mr-4 group-hover:scale-110 transition-transform duration-200">💻</span>
              <div className="flex flex-col">
                <strong className="text-base font-semibold mb-1 text-slate-200 group-hover:text-emerald-400 transition-colors">
                  Configure as Shop Terminal (Client)
                </strong>
                <small className="text-xs text-slate-400 leading-relaxed">
                  Bypasses local database engines. Dynamically streams live data over the network from your host server PC.
                </small>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Configuration confirmed -> Load application core routes workspace
  return <AppRoutes />;
}

export default App;
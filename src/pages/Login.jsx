import { useState } from "react";
import useAuthStore from "../store/useAuthStore";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, error, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    await login(username, password);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 font-sans p-4">
      <div className="bg-slate-900 p-8 rounded-xl shadow-2xl max-w-md w-full border border-slate-800">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-50">SuperStock</h2>
          <p className="text-slate-400 text-sm mt-2">Sign in to access your register workspace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 font-semibold text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Sign In to Terminal"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
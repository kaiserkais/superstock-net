import axios from "axios";

// ─── API base (Tauri dev server) ──────────────────────────────────────────────
const API = axios.create({ baseURL: "http://127.0.0.1:8080" }); // or whatever port your Rust app uses

export const posRepository = {
  /** Fetch all products with their variants */
  getProducts: async () => {
    const { data } = await API.get("/api/products");
    return data;
  },

  /** Fetch all categories */
  getCategories: async () => {
    const { data } = await API.get("/api/categories");
    return data;
  },

  /** Fetch all customers */
  getClients: async () => {
    const { data } = await API.get("/api/customers");
    return data;
  },

  /** Submit a finalized sale to the backend */
  createSale: async (payload) => {
    const { data } = await API.post("/api/sales", payload);
    return data;
  },
};
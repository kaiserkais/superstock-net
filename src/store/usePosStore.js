/**
 * usePosStore.js — Combined POS Terminal Zustand State Core
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { createProductSlice } from "./productSlice";
import { createCartSlice } from "./cartSlice";

const usePosStore = create(
  immer((...args) => ({
    ...createProductSlice(...args),
    ...createCartSlice(...args),
  }))
);

export default usePosStore;
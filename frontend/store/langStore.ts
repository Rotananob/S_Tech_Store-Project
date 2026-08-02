"use client";

import { create } from "zustand";

export type Language = "EN" | "KM";

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

export const useLangStore = create<LangState>((set, get) => ({
  lang: (typeof window !== "undefined" && (localStorage.getItem("app_lang") as Language)) || "EN",
  setLang: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app_lang", lang);
    }
    set({ lang });
  },
  toggleLang: () => {
    const next = get().lang === "EN" ? "KM" : "EN";
    if (typeof window !== "undefined") {
      localStorage.setItem("app_lang", next);
    }
    set({ lang: next });
  },
}));

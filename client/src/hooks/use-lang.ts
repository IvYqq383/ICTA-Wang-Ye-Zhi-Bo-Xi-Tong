import { useState, useCallback } from "react";

export type LangFull = "zh-TW" | "zh-CN" | "en";
export type LangAdmin = "zh-TW" | "zh-CN";

const STORAGE_KEY = "icta-lang";

function getSavedLang(): LangFull {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "zh-TW" || saved === "zh-CN" || saved === "en") return saved;
  return "zh-TW";
}

function getSavedAdminLang(): LangAdmin {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "zh-TW" || saved === "zh-CN") return saved;
  if (saved === "en") return "zh-TW";
  return "zh-TW";
}

export function useLang() {
  const [lang, setLangState] = useState<LangFull>(getSavedLang);

  const setLang = useCallback((l: LangFull) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  return { lang, setLang } as const;
}

export function useAdminLang() {
  const [lang, setLangState] = useState<LangAdmin>(getSavedAdminLang);

  const setLang = useCallback((l: LangAdmin) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  return { lang, setLang } as const;
}

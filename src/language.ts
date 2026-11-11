import { createContext, useContext } from "react";

export const LANGUAGES = ["de", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

export const LanguageContext = createContext<Language>("de");

export const useLanguage = () => useContext(LanguageContext);

import { createContext, useContext } from "react";

export const LANGUAGES = ["de", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

export const LanguageContext = createContext<Language>("de");

export const useLanguage = () => useContext(LanguageContext);

export const byLanguage = <T>(make: (language: Language) => T): Readonly<Record<Language, T>> =>
  Object.fromEntries(LANGUAGES.map((language) => [language, make(language)])) as Record<Language, T>;

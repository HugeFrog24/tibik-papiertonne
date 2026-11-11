import type React from "react";
import { LanguageContext } from "./language";
import type { RenderProps } from "./renderRate";

export const inLanguage =
  (Scene: React.FC<{ readonly ambience?: boolean }>): React.FC<RenderProps> =>
  ({ language }) => (
    <LanguageContext.Provider value={language}>
      <Scene />
    </LanguageContext.Provider>
  );

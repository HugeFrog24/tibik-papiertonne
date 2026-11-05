import { createContext, useContext, useMemo } from "react";
import { Color } from "three";
import { SIGN_LIGHT, type Weather } from "./overcast";

const DayLightContext = createContext<Weather>("sunny");

export const DayLight: React.FC<{ readonly weather: Weather; readonly children: React.ReactNode }> = ({
  weather,
  children,
}) => <DayLightContext.Provider value={weather}>{children}</DayLightContext.Provider>;

export const useSignColor = () => {
  const weather = useContext(DayLightContext);
  return useMemo(() => new Color().setScalar(SIGN_LIGHT[weather]), [weather]);
};
